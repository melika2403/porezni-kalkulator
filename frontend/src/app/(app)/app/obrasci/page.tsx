"use client";

// Obrasci: priprema godišnjih poreznih obrazaca iz knjiga organizacije.
// SPR-1053 se puni iz KPR-a i amortizacije, GPD-1051 iz spremljenog SPR-a
// (red 28), porezne kartice vlasnika i uplaćenih akontacija sa izvoda.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconFileDescription,
  IconFileInvoice,
  IconArrowRight,
  IconAlertTriangle,
  IconBuildingStore,
  IconDownload,
  IconTrash,
  IconTrees,
  IconArrowForwardUp,
} from "@tabler/icons-react";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { getForms, getOrganization, type FormRecord } from "src/api/profile";
import { searchBankTransactions } from "src/api/bankStatements";
import { getDocument, deleteDocument } from "src/api/documents";
import { fillSprTemplate, type SprData } from "src/sections/spr/fillSpr";
import { fillGpdTemplate, type GpdData } from "src/sections/gpd/fillGpd";
import { formatKm } from "src/lib/amountInput";
import { SprModal } from "src/sections/obrasci/SprModal";
import { GpdModal } from "src/sections/obrasci/GpdModal";
import { CokModal, type CokSaved } from "src/sections/obrasci/CokModal";
import { OnsModal, type OnsSaved } from "src/sections/obrasci/OnsModal";
import { ZakljucakGodine } from "src/sections/obrasci/ZakljucakGodine";
import { buildCokPdf } from "src/sections/obrasci/cokPdf";
import { buildOnsPdf } from "src/sections/obrasci/onsPdf";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";

const FORM_LABELS: Record<string, string> = {
  SPR: "SPR-1053",
  GPD: "GPD-1051",
  COK: "Obrazac ČOK",
  ONS: "Obrazac ONŠ",
};

const MONTHS = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "August",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

function fmtDate(iso: string | null) {
  if (!iso) return "–";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}.` : "–";
}

function triggerDownload(bytes: Uint8Array, filename: string) {
  const buf: ArrayBuffer =
    bytes.buffer instanceof ArrayBuffer
      ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      : Uint8Array.from(bytes).buffer;
  const url = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Podaci koji se prenose iz obrazaca prethodne godine u novu (gubitak,
// prenesene akontacije, nova mjesečna akontacija iz SPR-a).
type CarryItem = { label: string; value: string; hint: string };

export default function ObrasciPage() {
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  // Godine: od prve godine PK Office knjiga (2026) do naredne, default tekuća.
  const FIRST_YEAR = 2026;
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(Math.max(currentYear, FIRST_YEAR));
  const [sprOpen, setSprOpen] = useState(false);
  const [gpdOpen, setGpdOpen] = useState(false);
  const [cokOpen, setCokOpen] = useState(false);
  const [onsOpen, setOnsOpen] = useState(false);
  const yearOptions = Array.from(
    { length: Math.max(currentYear + 1 - FIRST_YEAR + 1, 2) },
    (_, i) => currentYear + 1 - i,
  )
    .filter((y) => y >= FIRST_YEAR)
    .map((y) => ({ value: String(y), label: `${y}.` }));

  const orgQ = useQuery({
    queryKey: ["org-detail", orgId],
    queryFn: async () => {
      const res = await getOrganization(orgId as number);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: orgId != null,
  });

  // Spremljeni SPR/GPD dokumenti (za status po godini)
  const formsQ = useQuery({
    queryKey: ["obrasci-forms"],
    queryFn: async () => {
      const res = await getForms();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  // Uplaćene akontacije poreza: uplate prema budžetu kantona sa izvoda
  // (kategorija "porez na dohodak vlasnika"); ne ulaze u KPR.
  const advQ = useQuery({
    queryKey: ["akontacije", orgId, year],
    queryFn: async () => {
      const res = await searchBankTransactions(orgId as number, {
        category: "POREZ_DOHODAK_VLASNIKA",
        direction: "OUT",
        status: "CONFIRMED",
        dateFrom: `${year}-01-01`,
        dateTo: `${year}-12-31`,
        limit: 500,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data.items;
    },
    enabled: orgId != null,
  });

  // Prenos iz prethodne godine (u odnosu na izabranu): gubitak i prenesene
  // akontacije iz GPD-a, nova mjesečna akontacija iz SPR-a.
  const carryQ = useQuery({
    queryKey: ["obrasci-carryover", orgId, year],
    enabled: orgId != null,
    queryFn: async (): Promise<CarryItem[]> => {
      const res = await getForms();
      if (!res.ok) throw new Error(res.error);
      const prev = year - 1;
      const latest = (type: "SPR" | "GPD") =>
        res.data
          .filter(
            (f) =>
              f.type === type &&
              f.year === prev &&
              (f.organization?.id === orgId ||
                (type === "GPD" && !f.organization)),
          )
          .sort((a, b) => b.id - a.id)[0];
      const items: CarryItem[] = [];

      const gpdForm = latest("GPD");
      if (gpdForm) {
        const doc = await getDocument<GpdData>(gpdForm.id);
        const d = doc.ok ? doc.data.data : null;
        if (d) {
          if ((d.row16NetLoss ?? 0) > 0) {
            items.push({
              label: `Poslovni gubitak iz ${prev}.`,
              value: `${formatKm(d.row16NetLoss)} KM`,
              hint: `Upisuje se u GPD za ${year}. u red 14 (poslovni gubitak iz ranijih godina).`,
            });
          }
          if ((d.row31Difference ?? 0) < 0 && d.refundChoice === "advance") {
            items.push({
              label: `Preplaćeni porez iz ${prev}. prenesen u akontacije`,
              value: `${formatKm(Math.abs(d.row31Difference))} KM`,
              hint: `Uračunajte u uplaćene akontacije (GPD za ${year}. red 29).`,
            });
          }
        }
      }

      const sprForm = latest("SPR");
      if (sprForm) {
        const doc = await getDocument<SprData>(sprForm.id);
        const d = doc.ok ? doc.data.data : null;
        if (d && (d.row29PersonalDeduction ?? 0) > 0) {
          items.push({
            label: `Mjesečna akontacija poreza u ${year}.`,
            value: `${formatKm(d.row29PersonalDeduction)} KM mjesečno`,
            hint: `Iz SPR-a za ${prev}. (red 29): toliko se uplaćuje svakog mjeseca prema budžetu kantona.`,
          });
        }
      }

      return items;
    },
  });

  const sprSaved = (formsQ.data ?? []).some(
    (f) => f.type === "SPR" && f.year === year && f.organization?.id === orgId,
  );
  const gpdSaved = (formsQ.data ?? []).some(
    (f) =>
      f.type === "GPD" &&
      f.year === year &&
      (f.organization?.id === orgId || !f.organization),
  );
  const pausalni = orgQ.data?.taxRegime === "PAUSALNI";

  const latestForYear = (type: "COK" | "ONS") =>
    (formsQ.data ?? [])
      .filter(
        (f) =>
          f.type === type && f.year === year && f.organization?.id === orgId,
      )
      .sort((a, b) => b.id - a.id)[0];
  const cokForm = latestForYear("COK");
  const onsForm = latestForYear("ONS");

  // Rezime "za uplatu" na karticama: iz spremljenih ČOK/ONŠ obrazaca za
  // izabranu godinu (da se iznos vidi bez otvaranja modala)
  const naknadeQ = useQuery({
    queryKey: ["obrasci-naknade", orgId, year, cokForm?.id, onsForm?.id],
    enabled: cokForm != null || onsForm != null,
    queryFn: async () => {
      const [cokDoc, onsDoc] = await Promise.all([
        cokForm ? getDocument<CokSaved>(cokForm.id) : null,
        onsForm ? getDocument<OnsSaved>(onsForm.id) : null,
      ]);
      return {
        cok: cokDoc?.ok ? cokDoc.data.data : null,
        ons: onsDoc?.ok ? onsDoc.data.data : null,
      };
    },
  });

  // Spremljeni obrasci: SVE godine (podaci iz ranijih godina trebaju kod
  // izrade novih, npr. gubitak i akontacije)
  const savedDocs = formsQ.data ?? [];
  const sprDocs = savedDocs
    .filter((f) => f.type === "SPR" && f.organization?.id === orgId)
    .sort((a, b) => b.year - a.year || b.id - a.id);
  const gpdDocs = savedDocs
    .filter(
      (f) => f.type === "GPD" && (f.organization?.id === orgId || !f.organization),
    )
    .sort((a, b) => b.year - a.year || b.id - a.id);
  const cokDocs = savedDocs
    .filter((f) => f.type === "COK" && f.organization?.id === orgId)
    .sort((a, b) => b.year - a.year || b.id - a.id);
  const onsDocs = savedDocs
    .filter((f) => f.type === "ONS" && f.organization?.id === orgId)
    .sort((a, b) => b.year - a.year || b.id - a.id);

  const [busyDocId, setBusyDocId] = useState<number | null>(null);

  async function downloadDoc(f: FormRecord) {
    if (busyDocId != null) return;
    setBusyDocId(f.id);
    try {
      const doc = await getDocument<SprData | GpdData | CokSaved | OnsSaved>(
        f.id,
      );
      if (!doc.ok || !doc.data.data) return;
      const d = doc.data.data;
      const bytes =
        f.type === "SPR"
          ? await fillSprTemplate(d as SprData)
          : f.type === "GPD"
            ? await fillGpdTemplate(d as GpdData)
            : f.type === "COK"
              ? await buildCokPdf(d as CokSaved)
              : await buildOnsPdf(d as OnsSaved);
      const fileBase =
        f.type === "SPR"
          ? "SPR-1053"
          : f.type === "GPD"
            ? "GPD-1051"
            : f.type;
      triggerDownload(bytes, `${fileBase}_${f.year}.pdf`);
    } finally {
      setBusyDocId(null);
    }
  }

  // dokument koji čeka potvrdu brisanja (PK modal umjesto window.confirm)
  const [docZaBrisanje, setDocZaBrisanje] = useState<FormRecord | null>(null);
  const [brisanjeBusy, setBrisanjeBusy] = useState(false);

  function removeDoc(f: FormRecord) {
    setDocZaBrisanje(f);
  }

  async function confirmRemoveDoc() {
    if (!docZaBrisanje) return;
    setBrisanjeBusy(true);
    try {
      await deleteDocument(docZaBrisanje.id);
      formsQ.refetch();
      setDocZaBrisanje(null);
    } finally {
      setBrisanjeBusy(false);
    }
  }

  const akontacije = advQ.data ?? [];
  const akontacijeTotal = akontacije.reduce(
    (a, tx) => a + (parseFloat(tx.amount) || 0),
    0,
  );

  const savedBadge = (saved: boolean) => (
    <span
      className={[
        "inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold tracking-[0.04em]",
        saved
          ? "bg-success-bg text-success"
          : "bg-cream-200 text-text-secondary",
      ].join(" ")}
    >
      {saved ? `SPREMLJEN ZA ${year}.` : "NIJE PRIPREMLJEN"}
    </span>
  );

  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
          <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
          Godišnji obrasci
        </div>
        <div className="flex items-center gap-4 mb-[5px]">
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary">
            Obrasci.
          </h1>
          <HelpButton slug="obrasci" />
        </div>
        <p className="text-[13px] leading-6 text-text-tertiary max-w-[520px]">
          Priprema SPR-1053 i GPD-1051 iz knjiga: prihodi i rashodi iz KPR-a,
          amortizacija iz PLDI, akontacije sa izvoda. Redoslijed: prvo SPR,
          njegov dohodak (red 28) puni GPD.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <span className="text-[11.5px] font-semibold uppercase tracking-wider text-text-tertiary">
          Godina
        </span>
        <PkSelect
          ariaLabel="Godina"
          value={String(year)}
          onChange={(v) => setYear(Number(v) || currentYear)}
          options={yearOptions}
          wrapStyle={{ width: 120 }}
        />
        {orgQ.data && (
          <span className="text-[13px] text-text-tertiary">
            {orgQ.data.name}
          </span>
        )}
      </div>

      {pausalni && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning-bg px-4 py-3 text-[13px] text-warning mb-5">
          <IconAlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
          <span>
            Ova organizacija je u paušalnom režimu oporezivanja: cifre iz
            knjiga se ne povlače u SPR, obrazac se popunjava ručno.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* SPR kartica */}
        <div className="rounded-xl border border-cream-300 bg-cream-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex w-10 h-10 rounded-lg bg-brand-100 text-brand-700 items-center justify-center">
              <IconFileDescription size={20} />
            </span>
            {savedBadge(sprSaved)}
          </div>
          <div className="text-[15px] font-medium text-text-primary">
            SPR-1053
          </div>
          <p className="text-[12.5px] leading-5 text-text-tertiary mt-1 mb-4">
            Specifikacija dohotka od samostalne djelatnosti. Povlači obveznika,
            prihode i rashode iz KPR-a te amortizaciju iz PLDI obrasca za{" "}
            {year}. godinu.
          </p>
          <button
            type="button"
            onClick={() => setSprOpen(true)}
            disabled={orgId == null}
            className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Pripremi iz knjiga <IconArrowRight size={15} />
          </button>
        </div>

        {/* GPD kartica */}
        <div className="rounded-xl border border-cream-300 bg-cream-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex w-10 h-10 rounded-lg bg-accent-pale text-accent-500 items-center justify-center">
              <IconFileInvoice size={20} />
            </span>
            {savedBadge(gpdSaved)}
          </div>
          <div className="text-[15px] font-medium text-text-primary">
            GPD-1051
          </div>
          <p className="text-[12.5px] leading-5 text-text-tertiary mt-1 mb-2">
            Godišnja prijava poreza na dohodak vlasnika. Red 9 se puni iz
            spremljenog SPR-a, lični odbitak iz porezne kartice, akontacije sa
            izvoda. Druge prihode (plata, najam) unosite ručno.
          </p>
          {!sprSaved && (
            <p className="text-[12px] text-warning mb-3">
              SPR-1053 za {year}. još nije spremljen: pripremite prvo njega, pa
              onda GPD.
            </p>
          )}
          <button
            type="button"
            onClick={() => setGpdOpen(true)}
            disabled={orgId == null}
            className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-700 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            Otvori GPD <IconArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* ČOK i ONŠ: kantonalne naknade koje se predaju ručno u PU */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-cream-300 bg-cream-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex w-10 h-10 rounded-lg bg-brand-100 text-brand-700 items-center justify-center">
              <IconBuildingStore size={20} />
            </span>
            {savedBadge(cokForm != null)}
          </div>
          <div className="text-[15px] font-medium text-text-primary">
            Obrazac ČOK
          </div>
          <p className="text-[12.5px] leading-5 text-text-tertiary mt-1 mb-2">
            Godišnja članarina obrtničkoj komori kantona (0,50%). Osnovica se
            vuče iz obračuna doprinosa vlasnika (r.br. 10 obrasca 2002) za{" "}
            {year}. godinu; predaje se isprintan i ovjeren u PU.
          </p>
          {naknadeQ.data?.cok && (
            <p className="text-[12.5px] font-medium text-text-primary mb-3">
              Članarina {formatKm(naknadeQ.data.cok.clanarina)} KM ·{" "}
              {naknadeQ.data.cok.razlika > 0 ? (
                <>
                  za uplatu{" "}
                  <span className="text-accent-500">
                    {formatKm(naknadeQ.data.cok.razlika)} KM
                  </span>
                </>
              ) : (
                <span className="text-success">uplaćeno u cijelosti</span>
              )}
            </p>
          )}
          <button
            type="button"
            onClick={() => setCokOpen(true)}
            disabled={orgId == null}
            className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-700 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            Pripremi obračun <IconArrowRight size={15} />
          </button>
        </div>

        <div className="rounded-xl border border-cream-300 bg-cream-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex w-10 h-10 rounded-lg bg-success-bg text-success items-center justify-center">
              <IconTrees size={20} />
            </span>
            {savedBadge(onsForm != null)}
          </div>
          <div className="text-[15px] font-medium text-text-primary">
            Obrazac ONŠ (šume)
          </div>
          <p className="text-[12.5px] leading-5 text-text-tertiary mt-1 mb-2">
            Naknada za općekorisne funkcije šuma: 0,07% od ukupnog prihoda
            (iz KPR-a), 100% budžetu kantona. Predaje se isprintan i ovjeren
            u PU.
          </p>
          {naknadeQ.data?.ons && (
            <p className="text-[12.5px] font-medium text-text-primary mb-3">
              Naknada {formatKm(naknadeQ.data.ons.naknada)} KM ·{" "}
              {naknadeQ.data.ons.razlika > 0 ? (
                <>
                  za uplatu{" "}
                  <span className="text-accent-500">
                    {formatKm(naknadeQ.data.ons.razlika)} KM
                  </span>
                </>
              ) : (
                <span className="text-success">uplaćeno u cijelosti</span>
              )}
            </p>
          )}
          <button
            type="button"
            onClick={() => setOnsOpen(true)}
            disabled={orgId == null}
            className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-700 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            Pripremi obračun <IconArrowRight size={15} />
          </button>
        </div>
      </div>

      {sprOpen && orgId != null && (
        <SprModal
          key={`spr-${orgId}-${year}`}
          orgId={orgId}
          year={year}
          onClose={() => setSprOpen(false)}
        />
      )}
      {cokOpen && orgId != null && (
        <CokModal
          key={`cok-${orgId}-${year}-${cokForm?.id ?? 0}`}
          orgId={orgId}
          year={year}
          savedFormId={cokForm?.id ?? null}
          onClose={() => setCokOpen(false)}
        />
      )}
      {onsOpen && orgId != null && (
        <OnsModal
          key={`ons-${orgId}-${year}-${onsForm?.id ?? 0}`}
          orgId={orgId}
          year={year}
          savedFormId={onsForm?.id ?? null}
          onClose={() => setOnsOpen(false)}
        />
      )}
      {gpdOpen && orgId != null && (
        <GpdModal
          key={`gpd-${orgId}-${year}`}
          orgId={orgId}
          year={year}
          onClose={() => setGpdOpen(false)}
        />
      )}

      {/* Zaključak godine: checklist zakonskih koraka + knjiženje amortizacije */}
      {orgId != null && (
        <ZakljucakGodine
          orgId={orgId}
          orgName={orgQ.data?.name ?? ""}
          year={year}
          sprSaved={sprSaved}
          gpdSaved={gpdSaved}
          cokSaved={cokForm != null}
          onsSaved={onsForm != null}
        />
      )}

      {/* Prenos iz prethodne godine */}
      {(carryQ.data?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-brand-600/25 bg-brand-100/40 p-5 mb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <IconArrowForwardUp size={17} className="text-brand-700" />
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-brand-700">
              Prenos iz {year - 1}. u {year}.
            </span>
          </div>
          <div className="space-y-2">
            {carryQ.data!.map((c) => (
              <div key={c.label} className="text-[13px]">
                <span className="text-text-secondary">{c.label}: </span>
                <strong className="text-text-primary tabular-nums">
                  {c.value}
                </strong>
                <div className="text-[12px] text-text-tertiary">{c.hint}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Akontacije poreza (odvojeno od KPR-a) */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-cream-300">
          <div className="text-[11.5px] font-semibold uppercase tracking-wider text-text-tertiary">
            Akontacije poreza na dohodak u {year}.
          </div>
          <p className="text-[12px] text-text-tertiary mt-1">
            Uplate prema budžetu kantona sa izvoda (ne ulaze u KPR). Mjesec je
            prema datumu uplate. Zbir se predlaže u GPD red 29.
          </p>
        </div>
        {advQ.isLoading ? (
          <p className="px-5 py-4 text-[13px] text-text-tertiary">Učitavam…</p>
        ) : akontacije.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-text-tertiary">
            Nema pronađenih uplata akontacija u {year}. godini.
          </p>
        ) : (
          <>
            {akontacije.map((tx) => (
              <div
                key={tx.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-0.5 px-5 py-2 text-[12.5px] border-b border-cream-300/60 last:border-0"
              >
                <span className="min-w-[80px] font-medium text-text-primary">
                  {tx.date
                    ? (MONTHS[Number(String(tx.date).slice(5, 7)) - 1] ?? "–")
                    : "–"}
                </span>
                <span className="text-text-tertiary min-w-[80px] tabular-nums">
                  {fmtDate(tx.date)}
                </span>
                <span className="flex-1 min-w-[160px] text-text-secondary truncate">
                  {tx.counterpartyName || tx.description || "Budžet kantona"}
                </span>
                <span className="tabular-nums text-text-primary">
                  {formatKm(parseFloat(tx.amount) || 0)} KM
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-2.5 bg-cream-200/50">
              <span className="text-[12.5px] font-semibold text-text-primary">
                Ukupno uplaćeno
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-text-primary">
                {formatKm(akontacijeTotal)} KM
              </span>
            </div>
          </>
        )}
      </div>

      {/* Spremljeni obrasci: sve godine, jer se podaci prenose u nove obrasce */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <SavedDocsCard
          title="Spremljeni SPR-1053"
          docs={sprDocs}
          busyDocId={busyDocId}
          onDownload={downloadDoc}
          onDelete={removeDoc}
        />
        <SavedDocsCard
          title="Spremljeni GPD-1051"
          docs={gpdDocs}
          busyDocId={busyDocId}
          onDownload={downloadDoc}
          onDelete={removeDoc}
        />
        <SavedDocsCard
          title="Spremljeni ČOK"
          docs={cokDocs}
          busyDocId={busyDocId}
          onDownload={downloadDoc}
          onDelete={removeDoc}
        />
        <SavedDocsCard
          title="Spremljeni ONŠ (šume)"
          docs={onsDocs}
          busyDocId={busyDocId}
          onDownload={downloadDoc}
          onDelete={removeDoc}
        />
      </div>

      <ConfirmModal
        open={docZaBrisanje != null}
        onClose={() => setDocZaBrisanje(null)}
        title="Obriši obrazac"
        message={
          docZaBrisanje && (
            <>
              Obrisati spremljeni{" "}
              <strong className="text-text-primary">
                {FORM_LABELS[docZaBrisanje.type] ?? docZaBrisanje.type} za{" "}
                {docZaBrisanje.year}. godinu
              </strong>
              ? Ovo se ne može poništiti.
            </>
          )
        }
        confirmLabel="Da, obriši"
        busy={brisanjeBusy}
        onConfirm={confirmRemoveDoc}
      />
    </div>
  );
}

// Grupa spremljenih obrazaca (jedan tip), sve godine, najnovije prvo.
function SavedDocsCard({
  title,
  docs,
  busyDocId,
  onDownload,
  onDelete,
}: {
  title: string;
  docs: FormRecord[];
  busyDocId: number | null;
  onDownload: (f: FormRecord) => void;
  onDelete: (f: FormRecord) => void;
}) {
  return (
    <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-hidden self-start">
      <div className="px-5 py-3 border-b border-cream-300 text-[11.5px] font-semibold uppercase tracking-wider text-text-tertiary">
        {title} ({docs.length})
      </div>
      {docs.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-text-tertiary">
          Još nema spremljenih obrazaca.
        </p>
      ) : (
        docs.map((f) => (
          <div
            key={f.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 border-b border-cream-300/60 last:border-0"
          >
            <div className="flex-1 min-w-[140px]">
              <div className="text-[13px] font-medium text-text-primary">
                Za {f.year}. godinu
              </div>
              <div className="text-[11.5px] text-text-tertiary">
                spremljen {fmtDate(f.createdAt)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDownload(f)}
              disabled={busyDocId != null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
            >
              <IconDownload size={14} />
              {busyDocId === f.id ? "Pripremam…" : "Preuzmi PDF"}
            </button>
            <button
              type="button"
              onClick={() => onDelete(f)}
              aria-label="Obriši obrazac"
              title="Obriši obrazac"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-cream-300 text-danger hover:bg-danger-bg transition-colors"
            >
              <IconTrash size={15} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
