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
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { usePayrollStatus } from "src/hooks/usePkOfficeMe";
import {
  getMonthlySummary,
  generateWorkerPayslip,
  generateMonthlyPayslips,
  markMonthPaid,
  markMipDownloaded,
  listPayrolls,
  type PayrollStatus,
} from "src/api/payroll";
import { unwrap } from "src/api/auth";

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000";

const MJESECI = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

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

  async function downloadPayslip(payrollId: number, workerName: string) {
    setBusy(`payslip-${payrollId}`);
    try {
      const r = await generateWorkerPayslip(payrollId);
      if (r.ok) triggerBlobDownload(r.blob, r.filename);
      else alert(`Greška: ${r.error}`);
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
      else alert(`Greška: ${r.error}`);
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
        alert(result.error);
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
      alert(`Greška pri generisanju MIP XML-a: ${(e as Error).message ?? e}`);
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
              Obračunajte plate kroz "Obračunaj plate" pa se ovdje pojavljuju
              pregled, platne liste i MIP.
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
                    onClick={() => downloadPayslip(r.payrollId, r.workerName)}
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
    </div>
  );
}
