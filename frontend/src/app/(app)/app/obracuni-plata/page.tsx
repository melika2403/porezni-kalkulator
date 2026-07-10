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
  IconInbox,
  IconLoader2,
  IconCash,
} from "@tabler/icons-react";
import { formatBAM } from "src/lib/format";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { usePayrollStatus } from "src/hooks/usePkOfficeMe";
import {
  getMonthlySummary,
  generateWorkerPayslip,
  generateMonthlyPayslips,
  markMonthPaid,
  markMipDownloaded,
  listPayrolls,
  calculatePayroll,
  type PayrollStatus,
} from "src/api/payroll";
import { unwrap } from "src/api/auth";
import { getOrganization } from "src/api/profile";

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

  // obračun vlasnika za mjesec (doprinosi samostalne djelatnosti, 36% na
  // fiksnu osnovicu); monthlySummary ga namjerno ne vraća u perWorker
  const { data: mjesecniPayrolls } = useQuery({
    queryKey: ["pk-payrolls", orgId, year, month],
    queryFn: () => unwrap(listPayrolls(orgId as number, year, month)),
    enabled: orgId != null && vlasnik != null,
  });
  const vlasnikPayroll =
    (mjesecniPayrolls ?? []).find((p) => p.workerId === vlasnik?.id) ?? null;

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
      qc.invalidateQueries({ queryKey: ["pk-office", "payroll-status"] });
    },
  });

  const rows = summary?.perWorker ?? [];
  const totals = summary?.totals ?? null;
  const hasPayrolls = rows.length > 0;
  const allPaid = hasPayrolls && rows.every((r) => r.status === "ISPLACENO");
  const anyObracunato = rows.some(
    (r) => r.status === "OBRACUNATO" || r.status === "ISPLACENO",
  );

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
      });
    } catch (e) {
      setObavijest(
        `Greška pri generisanju MIP XML-a: ${(e as Error).message ?? e}`,
      );
    } finally {
      setBusy(null);
    }
  }

  const years = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
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
            onClick={downloadMip}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {busy === "mip" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconFileTypeXml size={15} />
            )}
            MIP-1023 XML
          </button>
          {mipInfo?.mipDownloadedAt && (
            <span className="text-[12px] text-success inline-flex items-center gap-1">
              <IconCircleCheck size={13} /> MIP preuzet
            </span>
          )}
          <div className="flex-1" />
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
            {rows.map((r, i) => (
              <li
                key={r.payrollId}
                className={[
                  "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-[13px]",
                  i < rows.length - 1 ? "border-b border-cream-300/70" : "",
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
                </div>
                <span className="text-[13.5px] font-semibold tabular-nums text-text-primary whitespace-nowrap">
                  {formatBAM(r.net)}
                </span>
                {/* vlasnik nema platni listić (doprinosi na osnovicu, ne plata) */}
                {!vlasnikIds.has(r.workerId) && (
                  <button
                    type="button"
                    disabled={busy != null || r.status === "DRAFT"}
                    onClick={() => downloadPayslip(r.payrollId)}
                    title="Platna lista (PDF)"
                    className="p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-brand-600 hover:border-brand-600/50 transition-colors disabled:opacity-40"
                  >
                    {busy === `payslip-${r.payrollId}` ? (
                      <IconLoader2 size={15} className="animate-spin" />
                    ) : (
                      <IconDownload size={15} />
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

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
