"use client";

// Grupni uvoz izvoda (agencijski): upload više PDF-ova odjednom, program po
// žiro računu prepozna kojem obrtu pripada koji izvod, provjeri duplikate i
// upozorenja, a knjiži se tek na potvrdu (po izvodu ili sve spremne odjednom).
// Analiza ništa ne snima; knjiženje ide postojećim per-org upload endpointom.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconCloudUpload,
  IconBuildingBank,
  IconChecklist,
  IconChecks,
  IconAlertTriangle,
  IconLoader2,
  IconChevronDown,
  IconChevronUp,
  IconX,
  IconFileTypePdf,
  IconArrowRight,
} from "@tabler/icons-react";
import {
  bulkAnalyzeStatements,
  uploadBankStatement,
  confirmAllStatement,
  getBankStatement,
  type BulkFileResult,
} from "src/api/bankStatements";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { Modal } from "src/components/app-shell/Modal";
import { IzvodDetalj } from "src/sections/bankovni-izvodi/IzvodDetalj";
import { formatKm } from "src/lib/amountInput";
import { mnozina } from "src/lib/format";
import { isoToDisplay } from "src/lib/dateInput";

// koliko PDF-ova stane u jednu turu (isti limit i na backend ruti bulk/analyze)
const MAX_FAJLOVA = 50;

const STEPS = [
  {
    icon: IconCloudUpload,
    title: "1. Upload izvoda",
    desc: "Ubacite sve PDF izvode odjednom, za sve svoje obrte. Podržane su iste banke kao na stranici Bankovni izvodi.",
  },
  {
    icon: IconBuildingBank,
    title: "2. Prepoznavanje izvoda",
    desc: "Program po žiro računu prepozna kojem obrtu pripada koji izvod i provjeri duplikate po broju izvoda. Ništa se još ne knjiži.",
  },
  {
    icon: IconChecklist,
    title: "3. Pregled i potvrda",
    desc: "Spremni izvodi se knjiže jednim klikom. Ako nešto nije prepoznato ili se ne slaže, izvod traži vaš pregled.",
  },
];

const ERROR_MESSAGES: Record<string, string> = {
  UNSUPPORTED_BANK:
    "Format ove banke još ne podržavamo. Pošaljite nam uzorak izvoda i dodaćemo je.",
  NO_TEXT_LAYER:
    "PDF izgleda kao sken ili slika. Učitajte originalni PDF iz e-bankinga.",
  VALIDATION_FAILED:
    "Izvod je pročitan ali se promet ne slaže sa saldom, pa se ne može knjižiti.",
  PARSE_ERROR: "Izvod se ne može pročitati. Pošaljite nam fajl na provjeru.",
  DUPLICATE_STATEMENT: "Ovaj izvod je već učitan.",
  INVALID_FILE_TYPE: "Podržan je samo PDF fajl izvoda.",
  NETWORK_ERROR: "Greška u konekciji. Pokušajte ponovo.",
  NO_FILES: "Niste odabrali nijedan fajl.",
};

type RowStatus = BulkFileResult["status"] | "booked" | "booking";

type Row = {
  /** stabilan id reda: knjiženje mijenja red po uid-u, ne po indeksu niza
   *  (novi batch se dodaje na vrh pa se indeksi pomjeraju) */
  uid: number;
  file: File;
  result: BulkFileResult;
  status: RowStatus;
  /** ručno dodijeljena org (unrecognized/conflict) */
  assignedOrgId: number | null;
  bookedStatementId?: number;
  bookedWarnings?: string[];
  bookError?: string;
  /** stavke izvoda potvrđene za KPR (dugme na redu ili idempotentni re-klik) */
  stavkePotvrdjene?: boolean;
  confirmingStavke?: boolean;
  expanded: boolean;
};

const STATUS_BADGE: Record<
  RowStatus,
  { label: string; cls: string }
> = {
  ready: { label: "SPREMNO", cls: "bg-success-bg text-success" },
  review: { label: "TRAŽI PREGLED", cls: "bg-warning-bg text-warning" },
  duplicate: { label: "VEĆ UČITAN", cls: "bg-cream-200 text-text-secondary" },
  unrecognized: { label: "NIJE PREPOZNAT", cls: "bg-danger-bg text-danger" },
  conflict: { label: "VIŠE OBRTA", cls: "bg-danger-bg text-danger" },
  error: { label: "GREŠKA", cls: "bg-danger-bg text-danger" },
  booking: { label: "KNJIŽIM...", cls: "bg-cream-200 text-text-secondary" },
  booked: { label: "PROKNJIŽEN", cls: "bg-success-bg text-success" },
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "–";
  return isoToDisplay(String(iso).slice(0, 10)) || "–";
}

// "5 fajlova nije dodano" sa pravilnom množinom
function viskaPoruka(n: number): string {
  const rijec = mnozina(
    n,
    "fajl nije dodan",
    "fajla nisu dodana",
    "fajlova nije dodano",
  );
  return `Maksimalno ${MAX_FAJLOVA} fajlova odjednom: ${n} ${rijec}. Ubacite ih u sljedećoj turi.`;
}

// State preživi odlazak sa stranice (module singleton, živi dok je kartica
// browsera otvorena): redovi, organizacije i pending fajlovi ostaju dok
// korisnik sam ne klikne "Ukloni završene". Bez ovoga bi svaka navigacija
// (npr. na drugi tab pa nazad) obrisala cijeli prikaz ture.
const trajniState: {
  rows: Row[] | null;
  organizations: { id: number; name: string }[];
  pending: File[];
  uid: number;
} = { rows: null, organizations: [], pending: [], uid: 0 };

export function UvozIzvodaTab() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<File[]>(() => trajniState.pending);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [limitInfo, setLimitInfo] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(() => trajniState.rows);
  const uidRef = useRef(trajniState.uid);
  const [organizations, setOrganizations] = useState<
    { id: number; name: string }[]
  >(() => trajniState.organizations);
  // sinhronizacija u module store (samo upis, ne setState: nema re-rendera)
  useEffect(() => {
    trajniState.rows = rows;
    trajniState.uid = uidRef.current;
  }, [rows]);
  useEffect(() => {
    trajniState.organizations = organizations;
  }, [organizations]);
  useEffect(() => {
    trajniState.pending = pending;
  }, [pending]);
  // pop-up detalj izvoda: radi za bilo koji obrt bez prebacivanja aktivnog
  // obrta i bez napuštanja Inboxa (lista ispod ostaje netaknuta). orgName ide
  // u naslov popup-a da je jasno čiji se izvod pregleda.
  const [detalj, setDetalj] = useState<{
    orgId: number;
    statementId: number;
    orgName: string | null;
    /** uid reda iz liste, da se pri zatvaranju osvježi njegov KPR status */
    rowUid?: number;
  } | null>(null);
  // progres sekvencijalnog "Proknjiži sve spremne" (Knjižim 3/7...)
  const [bulkProgress, setBulkProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const orgOptions = useMemo(
    () => [
      { value: "", label: "Izaberi obrt" },
      ...organizations.map((o) => ({ value: String(o.id), label: o.name })),
    ],
    [organizations],
  );

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setAnalyzeError(null);
    const next = [...pending];
    for (const f of Array.from(list)) {
      if (f.type !== "application/pdf") continue;
      // isti fajl (ime + veličina) ne dodajemo dvaput
      if (!next.some((p) => p.name === f.name && p.size === f.size)) {
        next.push(f);
      }
    }
    // višak preko limita se NE odbacuje tiho: korisnik dobije poruku
    const visak = next.length - MAX_FAJLOVA;
    setLimitInfo(visak > 0 ? viskaPoruka(visak) : null);
    setPending(next.slice(0, MAX_FAJLOVA));
    if (fileRef.current) fileRef.current.value = "";
  }

  const anyBooking = rows?.some((r) => r.status === "booking") ?? false;

  async function runAnalyze() {
    // ne diramo redove dok traje knjiženje: prepend bi pomjerio redove i
    // knjiženje bi ažuriralo pogrešan izvod
    if (pending.length === 0 || analyzing || anyBooking) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    const res = await bulkAnalyzeStatements(pending);
    setAnalyzing(false);
    if (!res.ok) {
      setAnalyzeError(
        ERROR_MESSAGES[res.error] ?? `Greška pri analizi (${res.error}).`,
      );
      return;
    }
    // backend vraća rezultate u istom redoslijedu kao poslani fajlovi
    const newRows: Row[] = res.data.files.map((result, i) => ({
      uid: ++uidRef.current,
      file: pending[i],
      result,
      status: result.status,
      assignedOrgId: null,
      expanded: false,
    }));
    setRows((prev) => [...newRows, ...(prev ?? [])]);
    setOrganizations(res.data.organizations);
    setPending([]);
  }

  function patchRow(uid: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev ? prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)) : prev,
    );
  }

  async function bookRow(row: Row) {
    const orgId = row.result.org?.id ?? row.assignedOrgId ?? null;
    if (!orgId || row.status === "booking" || row.status === "booked") return;
    patchRow(row.uid, { status: "booking", bookError: undefined });
    const res = await uploadBankStatement(orgId, row.file);
    if (res.ok) {
      patchRow(row.uid, {
        status: "booked",
        bookedStatementId: res.data.statementId,
        bookedWarnings: res.data.warnings,
        // org zapamti i za ručno dodijeljene, radi prikaza
        result: {
          ...row.result,
          org:
            row.result.org ??
            organizations.find((o) => o.id === orgId) ??
            null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["bank-statements", orgId] });
    } else if (res.error === "DUPLICATE_STATEMENT") {
      // upiši org (za "kod: ...") i id postojećeg izvoda (za "Pogledaj
      // postojeći izvod"): ovaj put dolazi kroz knjiženje, ne kroz analizu,
      // pa result još nema te podatke
      patchRow(row.uid, {
        status: "duplicate",
        result: {
          ...row.result,
          org:
            row.result.org ??
            organizations.find((o) => o.id === orgId) ??
            null,
          existingStatementId:
            row.result.existingStatementId ?? res.statementId ?? undefined,
        },
      });
    } else {
      patchRow(row.uid, {
        status: row.result.status,
        bookError:
          ERROR_MESSAGES[res.error] ?? `Greška pri knjiženju (${res.error}).`,
      });
    }
  }

  // spreman za grupno knjiženje: automatski prepoznat bez upozorenja ILI
  // ručno dodijeljen obrtu. Izvodi sa upozorenjima ("review") NISU uključeni:
  // upozorenja traže svjesnu potvrdu po izvodu ("Proknjiži uz upozorenja").
  function spremanZaGrupno(r: Row) {
    return (
      r.status === "ready" ||
      ((r.status === "unrecognized" || r.status === "conflict") &&
        r.assignedOrgId != null)
    );
  }

  async function bookAllReady() {
    if (!rows) return;
    // snapshot spremnih redova; knjiži se po uid-u pa reordering ne smeta
    const ready = rows.filter(spremanZaGrupno);
    setBulkProgress({ done: 0, total: ready.length });
    try {
      for (let i = 0; i < ready.length; i++) {
        setBulkProgress({ done: i, total: ready.length });
        // sekvencijalno, da kontinuitet salda vidi prethodno uknjižene izvode
        await bookRow(ready[i]);
      }
    } finally {
      setBulkProgress(null);
    }
  }

  // otvori proknjiženi izvod u pop-upu (potvrda stavki, kategorije, uredi)
  function otvoriIzvod(row: Row) {
    const orgId = row.result.org?.id ?? row.assignedOrgId;
    if (!orgId || row.bookedStatementId == null) return;
    setDetalj({
      orgId,
      statementId: row.bookedStatementId,
      orgName:
        row.result.org?.name ??
        organizations.find((o) => o.id === orgId)?.name ??
        null,
      rowUid: row.uid,
    });
  }

  // zatvaranje pregleda izvoda: ako je korisnik unutra potvrdio sve stavke
  // (pojedinačno ili "Potvrdi sve"), red to odmah pokaže i dugme "Potvrdi
  // sve stavke" nestane; ne treba ga klikati ponovo (stavke su već u KPR-u)
  function zatvoriDetalj() {
    const d = detalj;
    setDetalj(null);
    if (d?.rowUid == null) return;
    void getBankStatement(d.orgId, d.statementId).then((res) => {
      if (!res.ok) return; // npr. izvod obrisan u pop-upu: red ne diramo
      const svePotvrdjene = res.data.transactions.every(
        (tx) => tx.status !== "UNMATCHED",
      );
      if (svePotvrdjene) {
        patchRow(d.rowUid!, { stavkePotvrdjene: true });
      }
    });
  }

  // potvrdi sve stavke izvoda za KPR direktno sa reda: isto kao "Potvrdi sve"
  // u pregledu izvoda (stavke bez kategorije ostaju van KPR-a dok je ne dobiju)
  async function potvrdiSveStavke(row: Row) {
    const orgId = row.result.org?.id ?? row.assignedOrgId;
    if (!orgId || row.bookedStatementId == null || row.confirmingStavke) return;
    patchRow(row.uid, { confirmingStavke: true });
    const res = await confirmAllStatement(orgId, row.bookedStatementId);
    if (res.ok) {
      patchRow(row.uid, { confirmingStavke: false, stavkePotvrdjene: true });
      queryClient.invalidateQueries({ queryKey: ["bank-statements", orgId] });
    } else {
      patchRow(row.uid, {
        confirmingStavke: false,
        bookError: `Greška pri potvrdi stavki (${res.error}).`,
      });
    }
  }

  // "Potvrdi sve izvode": potvrdi stavke SVIH proknjiženih izvoda sa
  // nepotvrđenim stavkama, sekvencijalno sa progresom (kao grupno knjiženje)
  const [confirmProgress, setConfirmProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  async function potvrdiSveIzvode() {
    if (!rows) return;
    const target = rows.filter(
      (r) =>
        r.status === "booked" &&
        !r.stavkePotvrdjene &&
        r.bookedStatementId != null,
    );
    setConfirmProgress({ done: 0, total: target.length });
    try {
      for (let i = 0; i < target.length; i++) {
        setConfirmProgress({ done: i, total: target.length });
        await potvrdiSveStavke(target[i]);
      }
    } finally {
      setConfirmProgress(null);
    }
  }

  // ukloni proknjižene i duplikate (lista poslije par tura naraste)
  function ukloniZavrsene() {
    setRows((prev) => {
      const ostali = (prev ?? []).filter(
        (r) => r.status !== "booked" && r.status !== "duplicate",
      );
      return ostali.length ? ostali : null;
    });
  }

  const readyCount = rows?.filter(spremanZaGrupno).length ?? 0;
  const zavrsenihCount =
    rows?.filter((r) => r.status === "booked" || r.status === "duplicate")
      .length ?? 0;
  // proknjiženi izvodi čije stavke još čekaju potvrdu za KPR
  const zaPotvrduCount =
    rows?.filter(
      (r) =>
        r.status === "booked" &&
        !r.stavkePotvrdjene &&
        r.bookedStatementId != null,
    ).length ?? 0;

  // redovi koji traže akciju idu na vrh, proknjiženi tonu na dno; unutar
  // istog statusa: po obrtu (naziv), pa izvodi tog obrta po broju od manjeg
  // ka većem (bez broja na kraj, po datumu), da tura ne izgleda razbacano
  const STATUS_ORDER: Record<RowStatus, number> = {
    unrecognized: 0,
    conflict: 0,
    review: 1,
    ready: 2,
    booking: 2,
    error: 3,
    duplicate: 4,
    booked: 5,
  };
  function rowOrgName(r: Row): string {
    return (
      r.result.org?.name ??
      organizations.find((o) => o.id === r.assignedOrgId)?.name ??
      ""
    );
  }
  function rowBrojIzvoda(r: Row): number | null {
    const n = Number(String(r.result.statementNumber ?? "").trim());
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  const sortedRows = rows
    ? [...rows].sort((a, b) => {
        const st = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (st !== 0) return st;
        const org = rowOrgName(a).localeCompare(rowOrgName(b), "bs");
        if (org !== 0) return org;
        const na = rowBrojIzvoda(a);
        const nb = rowBrojIzvoda(b);
        if (na != null && nb != null && na !== nb) return na - nb;
        if (na != null && nb == null) return -1;
        if (na == null && nb != null) return 1;
        return String(a.result.statementDate ?? "").localeCompare(
          String(b.result.statementDate ?? ""),
        );
      })
    : null;
  const brojPoStatusu = new Map<RowStatus, number>();
  for (const r of rows ?? []) {
    brojPoStatusu.set(r.status, (brojPoStatusu.get(r.status) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      {/* Kako radi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border border-cream-300 bg-cream-100 p-4"
          >
            <span className="inline-flex w-9 h-9 rounded-lg bg-brand-100 text-brand-700 items-center justify-center mb-3">
              <s.icon size={18} />
            </span>
            <div className="text-[13.5px] font-medium text-text-primary">
              {s.title}
            </div>
            <p className="text-[12.5px] leading-5 text-text-tertiary mt-1">
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !analyzing && fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={[
          "rounded-xl border-2 border-dashed px-[18px] py-6 text-center cursor-pointer transition-colors",
          dragging
            ? "border-brand-600 bg-brand-100"
            : "border-brand-600/60 bg-brand-100/45 hover:bg-brand-100/75 hover:border-brand-600",
          analyzing ? "opacity-70 pointer-events-none" : "",
        ].join(" ")}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <span className="w-[54px] h-[54px] rounded-full bg-brand-600 text-white inline-flex items-center justify-center mb-3">
          {analyzing ? (
            <IconLoader2 size={26} className="animate-spin" />
          ) : (
            <IconCloudUpload size={26} />
          )}
        </span>
        <div className="font-serif-display text-[18px] leading-tight text-text-primary">
          {analyzing ? "Čitam izvode..." : "Učitaj izvode za sve obrte"}
        </div>
        <div className="text-[12.5px] text-text-tertiary mt-1.5">
          Prevuci PDF-ove ili klikni za odabir (do {MAX_FAJLOVA} fajlova
          odjednom)
        </div>
        <div className="text-[11px] text-text-tertiary mt-2.5">
          UniCredit · Raiffeisen · Sparkasse · KIB · BBI · MF · Ziraat
        </div>
      </div>

      {/* višak preko limita nije tiho odbačen: reci koliko nije stalo */}
      {limitInfo && (
        <div className="rounded-lg border border-warning/40 bg-warning-bg px-4 py-3 text-[13px] text-warning">
          {limitInfo}
        </div>
      )}

      {/* Odabrani fajlovi + prepoznavanje */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-cream-300 bg-cream-100 p-4">
          <div className="text-[11.5px] font-semibold uppercase tracking-wider text-text-tertiary mb-2.5">
            Odabrani fajlovi ({pending.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {pending.map((f) => (
              <span
                key={`${f.name}-${f.size}`}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-cream-200 text-[12.5px] text-text-primary"
              >
                <IconFileTypePdf size={14} className="text-danger" />
                {f.name}
                <button
                  type="button"
                  aria-label={`Ukloni ${f.name}`}
                  onClick={() =>
                    setPending((prev) => prev.filter((p) => p !== f))
                  }
                  className="p-0.5 rounded-full hover:bg-cream-300 transition-colors"
                >
                  <IconX size={13} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={runAnalyze}
              disabled={analyzing || anyBooking}
              className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-[13.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {analyzing ? "Prepoznajem..." : "Prepoznaj izvode"}
            </button>
            <span className="text-[12px] text-text-tertiary">
              Ništa se ne knjiži bez vaše potvrde.
            </span>
          </div>
        </div>
      )}

      {analyzeError && (
        <div className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-[13px] text-danger">
          {analyzeError}
        </div>
      )}

      {/* Rezultati */}
      {rows && rows.length > 0 && (
        <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-cream-300">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-text-tertiary">
              Izvodi ({rows.length})
            </span>
            {/* rezime po statusima: brzi pregled kad je fajlova puno */}
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_BADGE) as RowStatus[])
                .filter((s) => (brojPoStatusu.get(s) ?? 0) > 0)
                .map((s) => (
                  <span
                    key={s}
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-[0.04em] ${STATUS_BADGE[s].cls}`}
                  >
                    {brojPoStatusu.get(s)} {STATUS_BADGE[s].label}
                  </span>
                ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {zavrsenihCount > 0 && !anyBooking && (
                <button
                  type="button"
                  onClick={ukloniZavrsene}
                  className="px-3 py-1.5 rounded-lg border border-cream-300 text-[12.5px] font-medium text-text-secondary hover:bg-cream-200 transition-colors"
                >
                  Ukloni završene ({zavrsenihCount})
                </button>
              )}
              {readyCount > 0 && (
                <button
                  type="button"
                  onClick={bookAllReady}
                  disabled={anyBooking || bulkProgress != null}
                  className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {bulkProgress
                    ? `Knjižim ${bulkProgress.done + 1}/${bulkProgress.total}...`
                    : `Proknjiži sve spremne (${readyCount})`}
                </button>
              )}
              {zaPotvrduCount > 0 && (
                <button
                  type="button"
                  onClick={() => void potvrdiSveIzvode()}
                  disabled={
                    anyBooking ||
                    bulkProgress != null ||
                    confirmProgress != null
                  }
                  title="Potvrdi stavke svih proknjiženih izvoda za KPR odjednom (stavke bez kategorije ne ulaze dok je ne dobiju)"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {confirmProgress ? (
                    <>
                      <IconLoader2 size={15} className="animate-spin" />
                      Potvrđujem {confirmProgress.done + 1}/
                      {confirmProgress.total}...
                    </>
                  ) : (
                    <>
                      <IconChecks size={15} />
                      Potvrdi sve izvode ({zaPotvrduCount})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {sortedRows!.map((row) => {
            const badge = STATUS_BADGE[row.status];
            const r = row.result;
            const canPick =
              (row.status === "unrecognized" || row.status === "conflict") &&
              organizations.length > 0;
            const bookOrgId = r.org?.id ?? row.assignedOrgId;
            const canBook =
              (row.status === "ready" ||
                row.status === "review" ||
                ((row.status === "unrecognized" || row.status === "conflict") &&
                  row.assignedOrgId != null)) &&
              bookOrgId != null;

            return (
              <div
                key={row.uid}
                className="px-4 py-3 border-b border-cream-300/60 last:border-0"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold tracking-[0.04em] ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  {/* naziv obrta istaknut: knjigovođa u listi za više obrta
                      mora odmah vidjeti čiji izvod gleda */}
                  <span className="text-[15px] font-semibold text-text-primary">
                    {r.org?.name ??
                      (row.assignedOrgId != null
                        ? organizations.find((o) => o.id === row.assignedOrgId)
                            ?.name
                        : null) ??
                      "Nepoznat obrt"}
                  </span>
                  <span className="text-[12.5px] text-text-tertiary">
                    {r.bankName ?? "Banka"}
                    {r.statementNumber ? ` · izvod br. ${r.statementNumber}` : ""}
                    {r.statementDate ? ` · ${fmtDate(r.statementDate)}` : ""}
                  </span>
                  <span className="text-[12px] text-text-tertiary ml-auto">
                    {r.fileName}
                  </span>
                </div>

                {row.status !== "error" && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[12.5px] text-text-secondary">
                    {r.account && <span>Račun: {r.account}</span>}
                    {typeof r.transactionCount === "number" && (
                      <button
                        type="button"
                        onClick={() => patchRow(row.uid, { expanded: !row.expanded })}
                        title={
                          row.expanded ? "Sakrij stavke" : "Prikaži stavke"
                        }
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full border border-cream-300 text-brand-600 text-[12px] font-medium hover:bg-brand-100 hover:border-brand-600/40 transition-colors"
                      >
                        {r.transactionCount}{" "}
                        {mnozina(r.transactionCount, "stavka", "stavke", "stavki")}
                        {row.expanded ? (
                          <IconChevronUp size={14} />
                        ) : (
                          <IconChevronDown size={14} />
                        )}
                      </button>
                    )}
                    {typeof r.totalIn === "number" && (
                      <span className="text-success">
                        +{formatKm(r.totalIn)} KM
                      </span>
                    )}
                    {typeof r.totalOut === "number" && (
                      <span>-{formatKm(r.totalOut)} KM</span>
                    )}
                  </div>
                )}

                {/* Greška parsiranja */}
                {row.status === "error" && (
                  <p className="text-[12.5px] text-danger mt-1.5">
                    {ERROR_MESSAGES[r.error ?? ""] ??
                      `Greška (${r.error ?? "nepoznato"}).`}
                    {r.validationErrors?.length
                      ? ` ${r.validationErrors[0]}`
                      : ""}
                  </p>
                )}

                {/* Upozorenja (review) */}
                {row.status !== "booked" &&
                  (r.warnings?.length ?? 0) > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {r.warnings!.map((w) => (
                        <li key={w} className="text-[12.5px] text-warning">
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}

                {/* Poruke nakon knjiženja: uz broj upozorenja odmah stoji i
                    njihov tekst, da se ne mora otvarati izvod da se vidi
                    šta program javlja */}
                {row.status === "booked" &&
                  (row.bookedWarnings?.length ?? 0) > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {row.bookedWarnings!.map((w) => (
                        <li key={w} className="text-[12.5px] text-warning">
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                {row.status === "booked" && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <p className="text-[12.5px] text-success">
                      Proknjižen
                      {row.bookedWarnings?.length
                        ? ` uz ${row.bookedWarnings.length} ${mnozina(
                            row.bookedWarnings.length,
                            "upozorenje",
                            "upozorenja",
                            "upozorenja",
                          )} (iznad)`
                        : ""}
                      .
                    </p>
                    {/* stavke idu u KPR tek potvrdom: bez ovoga bi korisnik
                        pomislio da je "proknjižen" znači i KPR */}
                    {row.stavkePotvrdjene ? (
                      <span className="text-[12.5px] text-success inline-flex items-center gap-1">
                        <IconChecks size={14} /> Sve stavke potvrđene za KPR.
                      </span>
                    ) : (
                      typeof r.transactionCount === "number" &&
                      r.transactionCount > 0 && (
                        <span className="text-[12.5px] text-warning font-medium inline-flex items-center gap-1">
                          <IconAlertTriangle size={14} />
                          {r.transactionCount}{" "}
                          {mnozina(
                            r.transactionCount,
                            "stavka čeka",
                            "stavke čekaju",
                            "stavki čeka",
                          )}{" "}
                          potvrdu da uđe u KPR
                        </span>
                      )
                    )}
                    {!row.stavkePotvrdjene && row.bookedStatementId != null && (
                      <button
                        type="button"
                        disabled={row.confirmingStavke || anyBooking}
                        onClick={() => void potvrdiSveStavke(row)}
                        title="Potvrdi sve stavke izvoda odjednom (stavke bez kategorije ne ulaze u KPR dok je ne dobiju)"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-600 text-white text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {row.confirmingStavke ? (
                          <IconLoader2 size={14} className="animate-spin" />
                        ) : (
                          <IconChecks size={14} />
                        )}
                        Potvrdi sve stavke
                      </button>
                    )}
                    {row.bookedStatementId != null && (
                      <button
                        type="button"
                        onClick={() => otvoriIzvod(row)}
                        className="group inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-info-bg text-info border border-info/30 text-[12px] font-medium hover:bg-[#c9ddee] transition-colors"
                      >
                        Otvori izvod i pregledaj stavke
                        <IconArrowRight
                          size={14}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </button>
                    )}
                  </div>
                )}
                {row.status === "duplicate" && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <p className="text-[12.5px] text-text-tertiary">
                      Ovaj izvod je već učitan
                      {r.org ? ` kod: ${r.org.name}` : ""}, preskočen je da se
                      ne duplira.
                    </p>
                    {r.org != null && r.existingStatementId != null && (
                      <button
                        type="button"
                        onClick={() =>
                          setDetalj({
                            orgId: r.org!.id,
                            statementId: r.existingStatementId!,
                            orgName: r.org!.name,
                          })
                        }
                        className="group inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-info-bg text-info border border-info/30 text-[12px] font-medium hover:bg-[#c9ddee] transition-colors"
                      >
                        Pogledaj postojeći izvod
                        <IconArrowRight
                          size={14}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </button>
                    )}
                  </div>
                )}
                {row.bookError && (
                  <p className="text-[12.5px] text-danger mt-1.5">
                    {row.bookError}
                  </p>
                )}

                {/* Ručna dodjela + akcija */}
                {(canPick || canBook) && (
                  <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                    {canPick && (
                      <PkSelect
                        ariaLabel="Dodijeli obrt"
                        value={
                          row.assignedOrgId != null
                            ? String(row.assignedOrgId)
                            : ""
                        }
                        onChange={(v) =>
                          patchRow(row.uid, {
                            assignedOrgId: v ? Number(v) : null,
                          })
                        }
                        options={orgOptions}
                        placeholder="Izaberi obrt"
                        wrapStyle={{ width: 240 }}
                      />
                    )}
                    {canBook && (
                      <button
                        type="button"
                        onClick={() => bookRow(row)}
                        disabled={anyBooking}
                        className={[
                          "px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-opacity disabled:opacity-50",
                          row.status === "review"
                            ? "border border-warning text-warning hover:bg-warning-bg"
                            : "bg-brand-600 text-white hover:opacity-90",
                        ].join(" ")}
                      >
                        {row.status === "review"
                          ? "Proknjiži uz upozorenja"
                          : "Proknjiži"}
                      </button>
                    )}
                  </div>
                )}

                {/* Stavke (pregled prije knjiženja) */}
                {row.expanded && (r.transactions?.length ?? 0) > 0 && (
                  <div className="mt-2.5 rounded-lg border border-cream-300 overflow-hidden">
                    {r.transactions!.map((tx, j) => (
                      <div
                        key={j}
                        className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5 text-[12.5px] border-b border-cream-300/60 last:border-0"
                      >
                        <span className="text-text-tertiary min-w-[72px] tabular-nums">
                          {fmtDate(tx.date)}
                        </span>
                        <span className="flex-1 min-w-[180px] text-text-secondary truncate">
                          {tx.counterpartyName || tx.description || "–"}
                        </span>
                        <span
                          className={`tabular-nums ${
                            tx.direction === "IN"
                              ? "text-success"
                              : "text-text-primary"
                          }`}
                        >
                          {tx.direction === "IN" ? "+" : "-"}
                          {formatKm(tx.amount)} KM
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[12.5px] text-text-tertiary">
        Obrt se prepoznaje po žiro računu. Ako neki obrt nije prepoznat,
        dodijelite ga ručno: program pamti račun pa ga sljedeći put prepoznaje
        sam.
      </p>

      {/* pop-up detalj izvoda: ista komponenta kao stranica izvoda, radi za
          bilo koji obrt (hookovi primaju orgId izvoda, ne aktivni obrt) */}
      {detalj != null && (
        <Modal
          open
          onClose={zatvoriDetalj}
          title={
            detalj.orgName
              ? `Pregled izvoda · ${detalj.orgName}`
              : "Pregled izvoda"
          }
          maxWidthClass="max-w-[1100px]"
        >
          <IzvodDetalj
            orgId={detalj.orgId}
            statementId={detalj.statementId}
            onDeleted={() => setDetalj(null)}
          />
        </Modal>
      )}
    </div>
  );
}
