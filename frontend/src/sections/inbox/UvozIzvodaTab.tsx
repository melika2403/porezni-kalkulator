"use client";

// Grupni uvoz izvoda (agencijski): upload više PDF-ova odjednom, program po
// žiro računu prepozna kojem obrtu pripada koji izvod, provjeri duplikate i
// upozorenja, a knjiži se tek na potvrdu (po izvodu ili sve spremne odjednom).
// Analiza ništa ne snima; knjiženje ide postojećim per-org upload endpointom.
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconCloudUpload,
  IconBuildingBank,
  IconChecklist,
  IconLoader2,
  IconChevronDown,
  IconChevronUp,
  IconX,
  IconFileTypePdf,
} from "@tabler/icons-react";
import {
  bulkAnalyzeStatements,
  uploadBankStatement,
  type BulkFileResult,
} from "src/api/bankStatements";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { formatKm } from "src/lib/amountInput";
import { isoToDisplay } from "src/lib/dateInput";

const STEPS = [
  {
    icon: IconCloudUpload,
    title: "1. Upload izvoda",
    desc: "Ubacite sve PDF izvode odjednom, za sve svoje obrte. Podržane su iste banke kao na stranici Bankovni izvodi.",
  },
  {
    icon: IconBuildingBank,
    title: "2. Pokreni knjiženje",
    desc: "Program po žiro računu prepozna kojem obrtu pripada koji izvod i provjeri duplikate po broju izvoda.",
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

export function UvozIzvodaTab() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const uidRef = useRef(0);
  const [organizations, setOrganizations] = useState<
    { id: number; name: string }[]
  >([]);

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
    setPending((prev) => {
      const next = [...prev];
      for (const f of Array.from(list)) {
        if (f.type !== "application/pdf") continue;
        // isti fajl (ime + veličina) ne dodajemo dvaput
        if (!next.some((p) => p.name === f.name && p.size === f.size)) {
          next.push(f);
        }
      }
      return next.slice(0, 20);
    });
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
      patchRow(row.uid, { status: "duplicate" });
    } else {
      patchRow(row.uid, {
        status: row.result.status,
        bookError:
          ERROR_MESSAGES[res.error] ?? `Greška pri knjiženju (${res.error}).`,
      });
    }
  }

  async function bookAllReady() {
    if (!rows) return;
    // snapshot spremnih redova; knjiži se po uid-u pa reordering ne smeta
    const ready = rows.filter((r) => r.status === "ready");
    for (const row of ready) {
      // sekvencijalno, da kontinuitet salda vidi prethodno uknjižene izvode
      await bookRow(row);
    }
  }

  const readyCount = rows?.filter((r) => r.status === "ready").length ?? 0;

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
          Prevuci PDF-ove ili klikni za odabir (do 20 fajlova odjednom)
        </div>
        <div className="text-[11px] text-text-tertiary mt-2.5">
          UniCredit · Raiffeisen · Sparkasse · KIB · BBI · MF · Ziraat
        </div>
      </div>

      {/* Odabrani fajlovi + Pokreni knjiženje */}
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
              {analyzing ? "Analiziram..." : "Pokreni knjiženje"}
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-cream-300">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-text-tertiary">
              Izvodi ({rows.length})
            </span>
            {readyCount > 0 && (
              <button
                type="button"
                onClick={bookAllReady}
                disabled={anyBooking}
                className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Proknjiži sve spremne ({readyCount})
              </button>
            )}
          </div>

          {rows.map((row) => {
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
                  <span className="text-[13px] font-medium text-text-primary">
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
                        className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                      >
                        {r.transactionCount}{" "}
                        {r.transactionCount === 1 ? "stavka" : "stavki"}
                        {row.expanded ? (
                          <IconChevronUp size={13} />
                        ) : (
                          <IconChevronDown size={13} />
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

                {/* Poruke nakon knjiženja */}
                {row.status === "booked" && (
                  <p className="text-[12.5px] text-success mt-1.5">
                    Proknjižen{row.bookedWarnings?.length
                      ? ` uz ${row.bookedWarnings.length} upozorenja`
                      : ""}
                    . Stavke pregledajte u Bankovnim izvodima tog obrta.
                  </p>
                )}
                {row.status === "duplicate" && (
                  <p className="text-[12.5px] text-text-tertiary mt-1.5">
                    Ovaj izvod je već učitan{r.org ? ` kod: ${r.org.name}` : ""}
                    , preskočen je da se ne duplira.
                  </p>
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
    </div>
  );
}
