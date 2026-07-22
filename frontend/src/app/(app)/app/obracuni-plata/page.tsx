"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCoins,
  IconDownload,
  IconExternalLink,
  IconFileTypeXml,
  IconCircleCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconFileText,
  IconInbox,
  IconLoader2,
  IconCash,
  IconMail,
  IconTableImport,
} from "@tabler/icons-react";
import { formatBAM } from "src/lib/format";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { usePayrollStatus } from "src/hooks/usePkOfficeMe";
import {
  getMonthlySummary,
  generateWorkerPayslip,
  generateMonthlyPayslips,
  generatePostingOrder,
  emailWorkerPayslip,
  emailMonthlyPayslipsBulk,
  setPayrollPaymentDate,
  markMonthPaid,
  markMipDownloaded,
  listPayrolls,
  listYearPayrolls,
  calculatePayroll,
  type PayrollStatus,
} from "src/api/payroll";
import { unwrap } from "src/api/auth";
import { getOrganization, type Worker } from "src/api/profile";
import { isoToDisplay, parseDateInput } from "src/lib/dateInput";
import { RadnikKartonModal } from "src/sections/zaposlenici/RadnikKartonModal";
import { UvozPlataPkModal } from "src/sections/prijave-radnika/UvozPlataPkModal";
import { datumHr, downloadTablePdf } from "src/sections/lager/robaPdf";

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000";

const MJESECI = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

// Pro-rate faktor (0..1) za vlasnika obrta prijavljenog/odjavljenog u toku
// mjeseca: radni dani u aktivnom periodu / radni dani u mjesecu. Ista logika
// kao computeProRateFactor na Poreznom (ObracunPlata), da doprinosi na 2002
// prate skraćeni period umjesto da se knjiže za pun mjesec.
function proRateFactorVlasnik(
  prijavaDate: string | null | undefined,
  odjavaDate: string | null | undefined,
  year: number,
  month: number,
): number {
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  const startISO = `${year}-${mm}-01`;
  const endISO = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const prijava = prijavaDate?.slice(0, 10) ?? null;
  const odjava = odjavaDate?.slice(0, 10) ?? null;
  if ((!prijava || prijava <= startISO) && (!odjava || odjava >= endISO)) {
    return 1;
  }
  const effStart = prijava && prijava > startISO ? prijava : startISO;
  const effEnd = odjava && odjava < endISO ? odjava : endISO;
  const workDays = (fromIso: string, toIso: string) => {
    let c = 0;
    for (let d = new Date(fromIso); d <= new Date(toIso); d.setDate(d.getDate() + 1)) {
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6) c++;
    }
    return c;
  };
  const wdMonth = workDays(startISO, endISO);
  const wdPeriod = workDays(effStart, effEnd);
  if (wdMonth <= 0) return 1;
  return Math.max(0, Math.min(wdPeriod / wdMonth, 1));
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function PayrollBadge({ status }: { status: PayrollStatus }) {
  if (status === "ISPLACENO") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-success-bg text-success shrink-0">
        <IconCircleCheck size={11} /> isplaćeno
      </span>
    );
  }
  if (status === "OBRACUNATO") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-info-bg text-info shrink-0">
        obračunato
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-warning-bg text-warning shrink-0">
      <IconAlertCircle size={11} /> nacrt
    </span>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
      <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
        {label}
      </div>
      <div className="font-serif-display text-[24px] leading-none tabular-nums text-text-primary">
        {value}
      </div>
      {sub && <div className="text-[12.5px] text-text-tertiary mt-1.5">{sub}</div>}
    </div>
  );
}

export default function ObracuniPlataPage() {
  const now = new Date();
  // isti default kao dashboard: do 25. u mjesecu prikazuj prethodni mjesec
  let defYear = now.getFullYear();
  let defMonth = now.getMonth() + 1;
  if (now.getDate() < 25) {
    defMonth -= 1;
    if (defMonth === 0) {
      defMonth = 12;
      defYear -= 1;
    }
  }
  const [year, setYear] = useState(defYear);
  const [month, setMonth] = useState(defMonth);
  const [busy, setBusy] = useState<string | null>(null);
  // poruka greške/upozorenja u PK modalu umjesto window.alert
  const [obavijest, setObavijest] = useState<string | null>(null);
  // potvrda prije grupnog slanja listića email-om (vanjska akcija)
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  // karton radnika (isti modal kao na Zaposlenicima)
  const [kartonWorker, setKartonWorker] = useState<Worker | null>(null);
  // uvoz prethodnih plata (klijent prešao u toku godine, za kompletan GIP)
  const [uvozOpen, setUvozOpen] = useState(false);
  // potvrda MIP-a kad mjesec sadrži uvezene plate (vjerovatno već predat)
  const [mipUvozConfirm, setMipUvozConfirm] = useState(false);

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;
  const qc = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["pk-payroll-summary", orgId, year, month],
    queryFn: () => unwrap(getMonthlySummary(orgId as number, year, month)),
    enabled: orgId != null,
  });
  // role po radniku: vlasnik nema platni listić
  const { data: workers } = useQuery({
    queryKey: ["pk-workers", orgId],
    queryFn: async () => {
      const { getWorkers } = await import("src/api/profile");
      return unwrap(getWorkers(orgId as number));
    },
    enabled: orgId != null,
  });
  const vlasnikIds = new Set(
    (workers ?? []).filter((w) => w.role === "VLASNIK").map((w) => w.id),
  );
  const vlasnik = (workers ?? []).find((w) => w.role === "VLASNIK") ?? null;

  // puna org (taxRegime/taxCategory/activityCode) za doprinose vlasnika i 2002
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  // svi obračuni mjeseca: vlasnikov (doprinosi samostalne djelatnosti),
  // detalji po radniku (bruto/doprinosi/porez), datum isplate, rekapitulacija
  const { data: mjesecniPayrolls } = useQuery({
    queryKey: ["pk-payrolls", orgId, year, month],
    queryFn: () => unwrap(listPayrolls(orgId as number, year, month)),
    enabled: orgId != null,
  });
  const vlasnikPayroll =
    (mjesecniPayrolls ?? []).find((p) => p.workerId === vlasnik?.id) ?? null;
  const payrollByWorker = new Map(
    (mjesecniPayrolls ?? []).map((p) => [p.workerId, p]),
  );

  // cijela godina za godišnji pregled (12 mjeseci sa statusima)
  const { data: godisnjiPayrolls } = useQuery({
    queryKey: ["pk-payrolls-year", orgId, year],
    queryFn: () => unwrap(listYearPayrolls(orgId as number, year)),
    enabled: orgId != null,
  });

  const workerById = new Map((workers ?? []).map((w) => [w.id, w]));

  // datum isplate: postojeći sa obračuna mjeseca, resync na promjenu
  // mjeseca/podataka (render-adjust umjesto effecta)
  const postojeciDatumIsplate =
    (mjesecniPayrolls ?? []).find((p) => p.paymentDate)?.paymentDate ?? null;
  const [datumIsplateS, setDatumIsplateS] = useState("");
  const [datumSyncKey, setDatumSyncKey] = useState("");
  const datumKey = `${orgId}-${year}-${month}-${postojeciDatumIsplate ?? ""}-${mjesecniPayrolls ? 1 : 0}`;
  if (datumSyncKey !== datumKey) {
    setDatumSyncKey(datumKey);
    setDatumIsplateS(
      postojeciDatumIsplate ? isoToDisplay(postojeciDatumIsplate) : "",
    );
  }

  const spremiDatum = useMutation({
    mutationFn: (paymentDate: string | null) =>
      unwrap(
        setPayrollPaymentDate({
          organizationId: orgId as number,
          year,
          month,
          paymentDate,
        }),
      ),
    onSuccess: (_, paymentDate) => {
      qc.invalidateQueries({ queryKey: ["pk-payrolls", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-payrolls-year", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-payroll-summary", orgId] });
      setObavijest(
        paymentDate
          ? "Datum isplate je upisan na sve obračune mjeseca: koristi se u MIP-u, platnim listama i uplatnicama."
          : "Datum isplate je uklonjen sa obračuna mjeseca.",
      );
    },
    onError: () => setObavijest("Greška pri spremanju datuma isplate."),
  });

  function sacuvajDatumIsplate() {
    const unos = datumIsplateS.trim();
    const iso = unos ? parseDateInput(unos) : null;
    if (unos && !iso) {
      setObavijest("Unesite ispravan datum isplate (DD.MM.GGGG.).");
      return;
    }
    spremiDatum.mutate(iso);
  }

  const obracunajVlasnika = useMutation({
    mutationFn: () =>
      unwrap(
        calculatePayroll({
          organizationId: orgId as number,
          workerId: vlasnik?.id as number,
          year,
          month,
          // skalira osnovicu i doprinose ako je vlasnik prijavljen/odjavljen
          // u toku mjeseca (inače 1 = pun mjesec)
          proRateFactor: proRateFactorVlasnik(
            vlasnik?.prijavaDate,
            vlasnik?.odjavaDate,
            year,
            month,
          ),
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-payrolls", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-payroll-summary", orgId] });
    },
  });

  // Obrazac 2002 (specifikacija uz uplatu doprinosa poduzetnika): isti tok
  // kao na Poreznom (ObracunPlata), samo iz PK Office podataka
  async function download2002() {
    if (!vlasnik || !fullOrg || !vlasnikPayroll) return;
    setBusy("2002");
    try {
      if (!fullOrg.taxRegime) {
        setObavijest("Postavi režim oporezivanja na postavkama obrta.");
        return;
      }
      const { fillObrazac2002Template } = await import(
        "src/sections/prijave-radnika/fillObrazac2002"
      );
      const p = vlasnikPayroll;
      const fmt2 = (n: number) =>
        n.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      const mm = String(month).padStart(2, "0");
      const yyyy = String(year);
      const lastDay = new Date(year, month, 0).getDate();
      const startISO = `${yyyy}-${mm}-01`;
      const endISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
      const vlPrijava = vlasnik.prijavaDate?.slice(0, 10) ?? null;
      const vlOdjava = vlasnik.odjavaDate?.slice(0, 10) ?? null;
      const periodOdISO = vlPrijava && vlPrijava > startISO ? vlPrijava : startISO;
      const periodDoISO = vlOdjava && vlOdjava < endISO ? vlOdjava : endISO;
      const [, odMm, odDan] = periodOdISO.split("-");
      const [, doMm, doDan] = periodDoISO.split("-");
      const countWorkDays = (fromIso: string, toIso: string) => {
        let count = 0;
        for (
          let d = new Date(fromIso);
          d <= new Date(toIso);
          d.setDate(d.getDate() + 1)
        ) {
          const wd = d.getDay();
          if (wd !== 0 && wd !== 6) count++;
        }
        return count;
      };
      const vrstaSamostalne = (() => {
        switch (fullOrg.taxCategory) {
          case "SLOBODNA_ZANIMANJA":
            return "SLOBODNO_ZANIMANJE" as const;
          case "OBRT_SRODNE":
            return "DJELATNOST_OBRTA" as const;
          case "ESNAFSKI_ZANATI":
            return "NISKO_AKUMULACIJSKA" as const;
          case "POLJOPRIVREDA_SUMARSTVO":
            return "POLJOPRIVREDA_SUMARSTVO" as const;
          case "TRGOVAC_POJEDINAC":
            return "TRGOVAC_POJEDINAC" as const;
          case "TAXI":
            return "NISKO_AKUMULACIJSKA" as const;
          default:
            return "DJELATNOST_OBRTA" as const;
        }
      })();
      const bytes = await fillObrazac2002Template({
        naziv: fullOrg.name || "",
        jib: (fullOrg.taxNumber || "").replace(/\D/g, ""),
        operacija: "PRIJAVA",
        periodOdDan: odDan,
        periodOdMjesec: odMm,
        periodOdGodina: yyyy,
        periodDoDan: doDan,
        periodDoMjesec: doMm,
        periodDoGodina: yyyy,
        adresa: fullOrg.address || "",
        opcina: fullOrg.city || "",
        // vlasnik se po PU FBiH broji u zaposlene (ukupno svi u org-u)
        brojZaposlenih: String((workers ?? []).length),
        vrstaDjelatnosti: [fullOrg.activityCode, fullOrg.activityName]
          .filter(Boolean)
          .join(" "),
        vrstaSamostalne,
        dohodakNa:
          fullOrg.taxRegime === "STVARNI_DOHODAK"
            ? "POSLOVNIH_KNJIGA"
            : "PAUSALNO",
        osnovica: fmt2(Number(p.gross ?? p.grossBase) || 0),
        brojRadnihSati: String(countWorkDays(periodOdISO, periodDoISO) * 8),
        brojRadnihSatiBolovanje: "0",
        datumUplateDan: String(lastDay).padStart(2, "0"),
        datumUplateMjesec: mm,
        datumUplateGodina: yyyy,
        prezimeIme: `${vlasnik.firstName} ${vlasnik.lastName}`.trim(),
        jmb: (vlasnik.jmbg || "").replace(/\D/g, ""),
        adresaPoduzetnika: vlasnik.address || "",
        opcinaPoduzetnika: vlasnik.city || "",
        pioStopa: "19,50",
        pioIznos: fmt2(Number(p.empPio) || 0),
        zdrStopa: "14,50",
        zdrIznos: fmt2(Number(p.empZdravstvo) || 0),
        nezapStopa: "2,00",
        nezapIznos: fmt2(Number(p.empNezaposlenost) || 0),
        ukupnoIznos: fmt2(Number(p.empTotal) || 0),
        potpis: "",
        datum: `${String(lastDay).padStart(2, "0")}.${mm}.${yyyy}.`,
      });
      triggerBlobDownload(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
        `Obrazac-2002-${`${vlasnik.firstName}_${vlasnik.lastName}`.replace(/[^A-Za-z0-9_]/g, "_")}-${yyyy}-${mm}.pdf`,
      );
    } catch (e) {
      setObavijest(
        `Greška pri generisanju obrasca 2002: ${(e as Error).message ?? e}`,
      );
    } finally {
      setBusy(null);
    }
  }
  const { data: mipStatus } = usePayrollStatus(year, month);
  const mipInfo = activeOrg
    ? [...(mipStatus?.own ?? []), ...(mipStatus?.clients ?? [])].find(
        (o) => o.id === activeOrg.id,
      )
    : undefined;

  const markPaid = useMutation({
    mutationFn: () =>
      unwrap(markMonthPaid({ organizationId: orgId as number, year, month })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-payroll-summary", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-payrolls", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-payrolls-year", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-office", "payroll-status"] });
    },
  });

  // mjesec sadrži uvezene plate iz ranijeg programa (MIP oprez)
  const imaUvezenih = (mjesecniPayrolls ?? []).some((p) => p.imported);

  const rows = summary?.perWorker ?? [];
  const totals = summary?.totals ?? null;
  const hasPayrolls = rows.length > 0;
  const allPaid = hasPayrolls && rows.every((r) => r.status === "ISPLACENO");
  const anyObracunato = rows.some(
    (r) => r.status === "OBRACUNATO" || r.status === "ISPLACENO",
  );

  // radnici koji su u izabranom mjesecu bili prijavljeni (po datumima
  // prijave/odjave, ne trenutnom statusu) a nemaju nijedan obračun:
  // klasičan propust koji se inače otkrije tek kad u MIP-u fali red
  const zadnjiDan = new Date(year, month, 0).getDate();
  const mjesecOd = `${year}-${String(month).padStart(2, "0")}-01`;
  const mjesecDo = `${year}-${String(month).padStart(2, "0")}-${String(zadnjiDan).padStart(2, "0")}`;
  const bezObracuna = (workers ?? []).filter((w) => {
    if (w.role !== "RADNIK") return false;
    const prijava = w.prijavaDate?.slice(0, 10) ?? null;
    const odjava = w.odjavaDate?.slice(0, 10) ?? null;
    if (!prijava || prijava > mjesecDo) return false;
    if (odjava && odjava < mjesecOd) return false;
    return !rows.some((r) => r.workerId === w.id);
  });

  async function downloadPayslip(payrollId: number) {
    setBusy(`payslip-${payrollId}`);
    try {
      const r = await generateWorkerPayslip(payrollId);
      if (r.ok) triggerBlobDownload(r.blob, r.filename);
      else setObavijest(`Greška: ${r.error}`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadAllPayslips() {
    if (orgId == null) return;
    setBusy("payslips");
    try {
      const r = await generateMonthlyPayslips(orgId, year, month);
      if (r.ok) triggerBlobDownload(r.blob, r.filename);
      else setObavijest(`Greška: ${r.error}`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadMip() {
    if (orgId == null || !activeOrg) return;
    setBusy("mip");
    try {
      // isti tok kao na Poreznom: builder + radnici + obračuni + puna org
      // (MIP traži activityCode kojeg nema u PK Office org sažetku)
      const [{ buildMip1023Xml }, { getWorkers, getOrganization }] =
        await Promise.all([
          import("src/sections/prijave-radnika/mipXmlBuilder"),
          import("src/api/profile"),
        ]);
      const [wRes, pRes, oRes] = await Promise.all([
        getWorkers(orgId),
        listPayrolls(orgId, year, month),
        getOrganization(orgId),
      ]);
      if (!wRes.ok) throw new Error(wRes.error || "Greška");
      if (!pRes.ok) throw new Error(pRes.error || "Greška");
      if (!oRes.ok) throw new Error(oRes.error || "Greška");
      const result = buildMip1023Xml({
        workers: wRes.data,
        payrolls: pRes.data,
        organization: oRes.data,
        year,
        month,
      });
      if (!result.ok) {
        setObavijest(result.error);
        return;
      }
      triggerBlobDownload(
        new Blob([result.xml], { type: "application/xml;charset=utf-8" }),
        result.filename,
      );
      markMipDownloaded({ organizationId: orgId, year, month }).then(() => {
        qc.invalidateQueries({ queryKey: ["pk-office", "payroll-status"] });
        // godišnji pregled čita mipDownloadedAt iz ovog querija, da "MIP ✓"
        // odmah osvježi u gridu (ne tek na sljedeću nepovezanu akciju)
        qc.invalidateQueries({ queryKey: ["pk-payrolls-year", orgId] });
      });
    } catch (e) {
      setObavijest(
        `Greška pri generisanju MIP XML-a: ${(e as Error).message ?? e}`,
      );
    } finally {
      setBusy(null);
    }
  }

  // nalog za knjiženje plate (konta agencijske konvencije, postojeći endpoint)
  async function downloadNalog() {
    if (orgId == null) return;
    setBusy("nalog");
    try {
      const r = await generatePostingOrder(orgId, year, month);
      if (r.ok) triggerBlobDownload(r.blob, r.filename);
      else setObavijest(`Greška pri generisanju naloga: ${r.error}`);
    } finally {
      setBusy(null);
    }
  }

  // rekapitulacija mjeseca: tabela po radnicima sa sumama (vlasnik nije
  // u njoj, on ima Obrazac 2002; brojevi prate KPI kartice)
  async function downloadRekapitulacija() {
    if (!fullOrg || !totals || rows.length === 0) return;
    setBusy("rekap");
    try {
      const fmt = (n: number) =>
        n.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      const mm2 = String(month).padStart(2, "0");
      await downloadTablePdf({
        fileName: `Rekapitulacija-plata-${year}-${mm2}.pdf`,
        org: fullOrg,
        title: "REKAPITULACIJA PLATA",
        subtitle: `za ${MJESECI[month - 1].toLowerCase()} ${year}. godine (na dan ${datumHr(new Date().toISOString().slice(0, 10))})`,
        sections: [
          {
            cols: [
              { label: "R.B.", w: 22 },
              { label: "RADNIK", w: 105 },
              { label: "BRUTO", w: 58, right: true },
              { label: "DOPRINOSI IZ PLATE", w: 60, right: true },
              { label: "DOPRINOSI NA PLATU", w: 60, right: true },
              { label: "POREZ", w: 48, right: true },
              { label: "NETO", w: 58, right: true },
              { label: "NAKNADE", w: 54, right: true },
              { label: "UKUPAN TROŠAK", w: 64, right: true },
            ],
            rows: rows.map((r, i) => {
              const p = payrollByWorker.get(r.workerId);
              const naknade =
                r.mealAllowance + r.vacationBonus + r.travelExpense;
              return [
                `${i + 1}.`,
                r.workerName,
                fmt(p?.gross ?? 0),
                fmt(p?.empTotal ?? 0),
                fmt(p?.erpTotal ?? 0),
                fmt(p?.incomeTax ?? 0),
                fmt(r.net),
                fmt(naknade),
                fmt(p?.totalCost ?? 0),
              ];
            }),
            totals: [
              "",
              `Ukupno (${rows.length})`,
              fmt(totals.gross),
              fmt(totals.empContrib),
              fmt(totals.erpContrib),
              fmt(totals.tax),
              fmt(totals.net),
              fmt(totals.meal + totals.vacation + totals.travel),
              fmt(totals.totalCost),
            ],
          },
        ],
      });
    } finally {
      setBusy(null);
    }
  }

  // platni listić email-om: pojedinačno i grupno (uz potvrdu)
  async function posaljiListicEmail(payrollId: number, workerName: string) {
    setBusy(`email-${payrollId}`);
    try {
      const r = await emailWorkerPayslip(payrollId);
      if (r.ok) {
        setObavijest(`Platni listić poslan: ${workerName} (${r.sentTo}).`);
      } else if (r.error === "WORKER_NO_EMAIL") {
        setObavijest(
          `${workerName} nema upisan email. Dodajte ga na Zaposlenicima pa pokušajte ponovo.`,
        );
      } else {
        setObavijest(`Greška pri slanju listića: ${r.error}`);
      }
    } finally {
      setBusy(null);
    }
  }

  async function posaljiSveEmail() {
    if (orgId == null) return;
    setBusy("email-bulk");
    try {
      const r = await emailMonthlyPayslipsBulk(orgId, year, month);
      if (!r.ok) {
        setObavijest(`Greška pri slanju listića: ${r.error}`);
        return;
      }
      const dijelovi = [`Poslano listića: ${r.sent}.`];
      if (r.skipped.length) {
        dijelovi.push(
          `Preskočeno (bez email-a): ${r.skipped.map((s) => s.name).join(", ")}.`,
        );
      }
      if (r.failed.length) {
        dijelovi.push(
          `Neuspjelo: ${r.failed.map((s) => s.name).join(", ")}.`,
        );
      }
      setObavijest(dijelovi.join(" "));
    } finally {
      setBusy(null);
      setBulkEmailOpen(false);
    }
  }

  const years = [0, 1, 2, 3].map((i) => now.getFullYear() - i);

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="relative flex flex-wrap items-end justify-between gap-3 mb-6">
        <HelpButton slug="obracuni-plata" className="absolute top-0 right-0" />
        <div>
          <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
            <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
            Zaposlenici
          </div>
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
            Obračuni plata.
          </h1>
          <p className="text-[13px] leading-6 text-text-tertiary max-w-[520px]">
            Pregled obračuna po mjesecu, platne liste, MIP-1023 XML i oznaka
            isplate. Sam obračun se radi na Poreznom Kalkulatoru.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PkSelect
            ariaLabel="Mjesec"
            value={month}
            onChange={(v) => setMonth(Number(v))}
            options={MJESECI.map((m, i) => ({ value: i + 1, label: m }))}
          />
          <PkSelect
            ariaLabel="Godina"
            value={year}
            onChange={(v) => setYear(Number(v))}
            options={years.map((y) => ({ value: y, label: `${y}.` }))}
          />
          <a
            href={`${MARKETING_URL}/prijave-radnika?tab=obracun${orgId ? `&org=${orgId}&year=${year}&month=${month}` : ""}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconExternalLink size={16} />
            Obračunaj plate
          </a>
        </div>
      </div>

      {/* KPI */}
      {totals && hasPayrolls && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Kpi label="Ukupno neto" value={formatBAM(totals.net)} sub={`${summary?.workerCount ?? 0} radnika`} />
          <Kpi
            label="Doprinosi"
            value={formatBAM(totals.empContrib + totals.erpContrib)}
            sub="iz plate + na platu"
          />
          <Kpi label="Porez na dohodak" value={formatBAM(totals.tax)} />
          <Kpi label="Ukupan trošak" value={formatBAM(totals.totalCost)} sub="sa naknadama" />
        </div>
      )}

      {/* Vlasnik obrta: doprinosi samostalne djelatnosti + Obrazac 2002 */}
      {vlasnik && fullOrg?.type === "BUSINESS" && (
        <div className="rounded-xl bg-cream-100 border border-cream-300 px-4 py-3 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 inline-flex items-center justify-center shrink-0">
            <IconCoins size={17} />
          </span>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-medium text-text-primary">
                {vlasnik.firstName} {vlasnik.lastName}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-cream-200 text-text-secondary shrink-0">
                vlasnik obrta
              </span>
              {vlasnikPayroll ? (
                <PayrollBadge status={vlasnikPayroll.status} />
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-warning-bg text-warning shrink-0">
                  <IconAlertCircle size={11} /> nije obračunat
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-text-tertiary mt-0.5">
              {vlasnikPayroll
                ? `osnovica ${formatBAM(Number(vlasnikPayroll.gross) || 0)} · doprinosi 36%: ${formatBAM(Number(vlasnikPayroll.empTotal) || 0)}`
                : "Doprinosi samostalne djelatnosti na fiksnu osnovicu (Sl. novine FBiH)."}
            </div>
          </div>
          <button
            type="button"
            disabled={obracunajVlasnika.isPending || busy != null}
            onClick={() => obracunajVlasnika.mutate()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {obracunajVlasnika.isPending && (
              <IconLoader2 size={15} className="animate-spin" />
            )}
            {vlasnikPayroll ? "Preračunaj doprinose" : "Obračunaj doprinose"}
          </button>
          <button
            type="button"
            disabled={!vlasnikPayroll || busy != null}
            onClick={download2002}
            title={
              vlasnikPayroll
                ? "Specifikacija uz uplatu doprinosa poduzetnika"
                : "Prvo obračunaj doprinose vlasnika"
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy === "2002" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Obrazac 2002
          </button>
          {obracunajVlasnika.isError && (
            <p className="w-full text-[12px] text-accent-500">
              {(obracunajVlasnika.error as Error)?.message?.includes("režim")
                ? "Postavi režim oporezivanja na postavkama obrta pa pokušaj ponovo."
                : "Greška pri obračunu doprinosa vlasnika."}
            </p>
          )}
        </div>
      )}

      {/* Akcije za mjesec */}
      {hasPayrolls && (
        <div className="rounded-xl bg-cream-100 border border-cream-300 px-4 py-3 mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy != null || !anyObracunato}
            onClick={downloadAllPayslips}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {busy === "payslips" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Sve platne liste (PDF)
          </button>
          <button
            type="button"
            disabled={busy != null || !anyObracunato}
            onClick={() =>
              imaUvezenih ? setMipUvozConfirm(true) : void downloadMip()
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {busy === "mip" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconFileTypeXml size={15} />
            )}
            MIP-1023 XML
          </button>
          <button
            type="button"
            disabled={busy != null || !anyObracunato}
            onClick={downloadNalog}
            title="Nalog za knjiženje plate (konta duguje/potražuje)"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {busy === "nalog" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconFileText size={15} />
            )}
            Nalog za knjiženje
          </button>
          <button
            type="button"
            disabled={busy != null || !anyObracunato}
            onClick={downloadRekapitulacija}
            title="Tabela po radnicima (bruto, doprinosi, porez, neto, trošak) sa sumama"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {busy === "rekap" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Rekapitulacija (PDF)
          </button>
          <button
            type="button"
            disabled={busy != null || !anyObracunato}
            onClick={() => setBulkEmailOpen(true)}
            title="Pošalji platni listić svakom radniku na njegov email (radnici bez email-a se preskaču)"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {busy === "email-bulk" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconMail size={15} />
            )}
            Pošalji listiće email-om
          </button>
          {mipInfo?.mipDownloadedAt && (
            <span className="text-[12px] text-success inline-flex items-center gap-1">
              <IconCircleCheck size={13} /> MIP preuzet
            </span>
          )}
          <div className="flex-1" />
          {/* datum isplate: ide u MIP, platne liste i uplatnice */}
          <div className="flex items-center gap-1.5">
            <span
              className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary"
              title="Upisuje se na sve obračune mjeseca; koriste ga MIP XML, platne liste i uplatnice"
            >
              Datum isplate
            </span>
            <PkDateInput
              value={datumIsplateS}
              onChange={setDatumIsplateS}
              ariaLabel="Datum isplate"
              className="w-[136px]"
            />
            <button
              type="button"
              disabled={spremiDatum.isPending}
              onClick={sacuvajDatumIsplate}
              className="px-3 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
            >
              {spremiDatum.isPending ? "..." : "Spremi"}
            </button>
          </div>
          {!allPaid && anyObracunato && (
            <button
              type="button"
              disabled={markPaid.isPending}
              onClick={() => markPaid.mutate()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {markPaid.isPending ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : (
                <IconCash size={15} />
              )}
              Označi mjesec isplaćenim
            </button>
          )}
          {allPaid && (
            <span className="text-[12.5px] text-success inline-flex items-center gap-1.5 font-medium">
              <IconCircleCheck size={15} /> sve plate isplaćene
            </span>
          )}
        </div>
      )}

      {/* radnici prijavljeni u mjesecu a bez ijednog obračuna */}
      {bezObracuna.length > 0 && (
        <div className="rounded-xl bg-warning-bg text-warning border border-warning/30 px-4 py-3 mb-4 flex items-start gap-2 text-[12.5px] leading-5">
          <IconAlertTriangle size={17} className="shrink-0 mt-0.5" />
          <span>
            <strong>Bez obračuna za {MJESECI[month - 1].toLowerCase()}:</strong>{" "}
            {bezObracuna
              .map((w) => `${w.firstName} ${w.lastName}`)
              .join(", ")}
            . Radnik prijavljen u ovom mjesecu bez obračuna neće ući u MIP ni
            platne liste.
          </span>
        </div>
      )}

      {/* Lista po radniku */}
      <div className="rounded-xl bg-cream-100 border border-cream-300">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            Učitavanje...
          </div>
        ) : !hasPayrolls ? (
          <div className="px-4 py-12 text-center">
            <span className="w-12 h-12 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-3">
              <IconInbox size={22} />
            </span>
            <p className="text-[14px] font-medium text-text-primary">
              Nema obračuna za {MJESECI[month - 1].toLowerCase()} {year}.
            </p>
            <p className="text-[12.5px] text-text-tertiary mt-1 max-w-[400px] mx-auto">
              Obračunajte plate kroz &quot;Obračunaj plate&quot; pa se ovdje
              pojavljuju pregled, platne liste i MIP.
            </p>
          </div>
        ) : (
          <ul>
            {rows.map((r, i) => {
              const p = payrollByWorker.get(r.workerId);
              const worker = workerById.get(r.workerId) ?? null;
              return (
                <li
                  key={r.payrollId}
                  onClick={worker ? () => setKartonWorker(worker) : undefined}
                  title={worker ? "Karton radnika (obračuni po mjesecima)" : undefined}
                  className={[
                    "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-[13px]",
                    i < rows.length - 1 ? "border-b border-cream-300/70" : "",
                    worker
                      ? "cursor-pointer hover:bg-cream-50 transition-colors"
                      : "",
                  ].join(" ")}
                >
                  <span className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 inline-flex items-center justify-center shrink-0">
                    <IconCoins size={17} />
                  </span>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-text-primary">
                        {r.workerName}
                      </span>
                      <PayrollBadge status={r.status} />
                      {p?.imported && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-cream-200 text-text-secondary shrink-0"
                          title="Uvezena plata iz ranijeg programa (za GIP); stvarni obračun je preuzima"
                        >
                          uvezeno
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-text-tertiary mt-0.5">
                      {[
                        r.bankAccount ? `račun ${r.bankAccount}` : "bez računa",
                        r.mealAllowance > 0
                          ? `topli obrok ${formatBAM(r.mealAllowance)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {p && (
                      <div
                        className="text-[11.5px] text-text-tertiary mt-0.5 tabular-nums"
                        title="Doprinosi iz plate (na teret radnika)"
                      >
                        {`bruto ${formatBAM(p.gross)} · doprinosi ${formatBAM(p.empTotal)} · porez ${formatBAM(p.incomeTax)}`}
                      </div>
                    )}
                  </div>
                  <span className="text-[13.5px] font-semibold tabular-nums text-text-primary whitespace-nowrap">
                    {formatBAM(r.net)}
                  </span>
                  {/* vlasnik nema platni listić (doprinosi na osnovicu, ne plata) */}
                  {!vlasnikIds.has(r.workerId) && (
                    <>
                      <button
                        type="button"
                        disabled={
                          busy != null ||
                          r.status === "DRAFT" ||
                          !worker?.email
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          void posaljiListicEmail(r.payrollId, r.workerName);
                        }}
                        title={
                          worker?.email
                            ? `Pošalji platni listić na ${worker.email}`
                            : "Radnik nema upisan email (dodajte ga na Zaposlenicima)"
                        }
                        className="p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-brand-600 hover:border-brand-600/50 transition-colors disabled:opacity-40"
                      >
                        {busy === `email-${r.payrollId}` ? (
                          <IconLoader2 size={15} className="animate-spin" />
                        ) : (
                          <IconMail size={15} />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={busy != null || r.status === "DRAFT"}
                        onClick={(e) => {
                          e.stopPropagation();
                          void downloadPayslip(r.payrollId);
                        }}
                        title="Platna lista (PDF)"
                        className="p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-brand-600 hover:border-brand-600/50 transition-colors disabled:opacity-40"
                      >
                        {busy === `payslip-${r.payrollId}` ? (
                          <IconLoader2 size={15} className="animate-spin" />
                        ) : (
                          <IconDownload size={15} />
                        )}
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* godišnji pregled: status svakog mjeseca izabrane godine */}
      <div className="mt-4 rounded-xl bg-cream-100 border border-cream-300 px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary">
            Pregled {year}. godine
          </div>
          <button
            type="button"
            onClick={() => setUvozOpen(true)}
            title="Za prelazak u toku godine: ubaci plate iz ranijeg programa (bruto + koeficijent) da godišnji GIP bude kompletan"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cream-300 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconTableImport size={14} />
            Uvezi prethodne plate
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {MJESECI.map((naziv, i) => {
            const m = i + 1;
            const ps = (godisnjiPayrolls ?? []).filter((p) => p.month === m);
            const mip = ps.some((p) => p.mipDownloadedAt);
            const uvezeno = ps.some((p) => p.imported);
            let label = "prazno";
            let cls = "text-text-tertiary";
            if (ps.length > 0) {
              if (ps.every((p) => p.status === "ISPLACENO")) {
                label = "isplaćeno";
                cls = "text-success";
              } else if (
                ps.some(
                  (p) =>
                    p.status === "OBRACUNATO" || p.status === "ISPLACENO",
                )
              ) {
                label = "obračunato";
                cls = "text-info";
              } else {
                label = "nacrt";
                cls = "text-warning";
              }
            }
            const aktivan = m === month;
            return (
              <button
                key={naziv}
                type="button"
                onClick={() => setMonth(m)}
                title={`Otvori ${naziv.toLowerCase()} ${year}.`}
                className={[
                  "rounded-lg border px-2.5 py-2 text-left transition-colors",
                  aktivan
                    ? "border-brand-600 bg-brand-100/60"
                    : "border-cream-300 bg-cream-50 hover:bg-cream-200",
                ].join(" ")}
              >
                <div className="text-[12px] font-medium text-text-primary">
                  {naziv}
                </div>
                <div className={`text-[11px] mt-0.5 font-medium ${cls}`}>
                  {label}
                  {uvezeno ? " · uvezeno" : ""}
                  {mip ? " · MIP ✓" : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* potvrda grupnog slanja listića (vanjska akcija, ide radnicima) */}
      <ConfirmModal
        open={bulkEmailOpen}
        onClose={() => setBulkEmailOpen(false)}
        onConfirm={() => void posaljiSveEmail()}
        title="Slanje platnih listića"
        danger={false}
        busy={busy === "email-bulk"}
        confirmLabel="Pošalji"
        message={`Poslati platni listić za ${MJESECI[month - 1].toLowerCase()} ${year}. svakom radniku na njegov email? Radnici bez upisanog email-a se preskaču i biće navedeni u rezultatu.`}
      />

      {/* potvrda MIP-a za mjesec sa uvezenim platama iz ranijeg programa */}
      <ConfirmModal
        open={mipUvozConfirm}
        onClose={() => setMipUvozConfirm(false)}
        onConfirm={() => {
          setMipUvozConfirm(false);
          void downloadMip();
        }}
        title="Mjesec sadrži uvezene plate"
        confirmLabel="Generiši MIP"
        message={`Za ${MJESECI[month - 1].toLowerCase()} ${year}. postoje plate uvezene iz ranijeg programa: MIP za taj period je vjerovatno već predat iz starog programa. Svakako generisati MIP-1023 XML?`}
      />

      {/* uvoz prethodnih plata (isti podaci i backend kao na Poreznom) */}
      {orgId != null && uvozOpen && (
        <UvozPlataPkModal
          orgId={orgId}
          year={year}
          radnici={workers ?? []}
          isObrt={fullOrg?.type === "BUSINESS"}
          onClose={() => setUvozOpen(false)}
        />
      )}

      {/* karton radnika: obračuni po mjesecima (isti modal kao Zaposlenici) */}
      {orgId != null && kartonWorker != null && (
        <RadnikKartonModal
          orgId={orgId}
          worker={kartonWorker}
          onClose={() => setKartonWorker(null)}
        />
      )}

      {/* obavijest/greška u PK modalu umjesto window.alert */}
      <ConfirmModal
        open={obavijest != null}
        onClose={() => setObavijest(null)}
        title="Obavijest"
        message={obavijest}
      />
    </div>
  );
}
