"use client";

import Link from "next/link";
import { useState } from "react";
// PK stilovi rade i na marketing profilu (tab je omotan u .pk-scope)
import "src/styles/pk-embed.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconBuildingStore,
  IconCoins,
  IconFileInvoice,
  IconFiles,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";
import {
  useSubscription,
  useSubscriptionInvoices,
} from "src/hooks/useSubscription";
import { useProfile } from "src/hooks/useProfile";
import { usePkOfficePristup } from "src/hooks/usePkOfficeMe";
import { PK_OFFICE_DASHBOARD_URL } from "src/lib/pkOfficeUrl";
import { unwrap } from "src/api/auth";
import { getMyStats } from "src/api/profile";
import { formatBAM, formatDate } from "src/lib/format";
import {
  subscriptionInvoicePdfUrl,
  type BillingCycle,
  type Subscription,
  type SubscriptionInvoice,
} from "src/api/subscription";
import {
  createPredracun,
  type Plan as PredracunPlan,
} from "src/api/backend/predracun/predracun";

const STATUS_LABELS: Record<Subscription["status"], string> = {
  active: "Aktivna",
  cancelled: "Otkazana",
  expired: "Istekla",
  past_due: "Neplaćena",
  trialing: "Probni period",
};

const INVOICE_STATUS_LABELS: Record<SubscriptionInvoice["status"], string> = {
  paid: "Plaćen",
  pending: "Izdat",
  failed: "Neuspješan",
  refunded: "Otkazan",
};

const PLAN_LABELS: Record<Subscription["plan"], string> = {
  free: "Besplatan",
  pro: "Pro",
  business: "Business",
  office_2: "PK Office Start (do 2 obrta)",
  office_10: "PK Office Tim (do 10 obrta)",
  office_25: "PK Office Agencija (do 25 obrta)",
  office_50: "PK Office Agencija+ (do 50 obrta)",
};

// office paket → plan predračuna za obnovu
const OFFICE_TO_PREDRACUN: Partial<Record<Subscription["plan"], PredracunPlan>> =
  {
    office_2: "OFFICE_2",
    office_10: "OFFICE_10",
    office_25: "OFFICE_25",
    office_50: "OFFICE_50",
  };

// label plana sa predračuna (PRO/BUSINESS/OFFICE_*, historijski zapisi)
function invoicePlanLabel(plan: string): string {
  const key = String(plan || "").toLowerCase();
  if (key === "business") return "Business";
  if (key === "pro") return "Pro";
  return PLAN_LABELS[key as Subscription["plan"]] ?? plan;
}

// ── Datumski helperi (ISO stringovi, poređenje leksički) ────────────────────

function isoDay(input: string | Date): string {
  return (typeof input === "string" ? input : input.toISOString()).slice(0, 10);
}

function daysUntil(iso: string): number {
  const end = new Date(`${isoDay(iso)}T00:00:00`);
  const today = new Date(`${isoDay(new Date())}T00:00:00`);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

function dayAfterIso(iso: string): string {
  const [y, m, d] = isoDay(iso).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

// Kraj perioda nove pretplate (start + 1 mjesec/godina - 1 dan).
function periodEndFrom(startIso: string, cycle: BillingCycle): string {
  const [y, m, d] = isoDay(startIso).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (cycle === "monthly") dt.setUTCMonth(dt.getUTCMonth() + 1);
  else dt.setUTCFullYear(dt.getUTCFullYear() + 1);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

// Free plan ima "vječni" endDate (+100 godina), pa datume i obnovu ne prikazujemo.
function isForeverEnd(iso: string): boolean {
  return daysUntil(iso) > 365 * 50;
}

// Dijeljeni sadržaj pretplate: koristi ga /app/pretplata stranica i tab
// Pretplata na marketing profilu (unutar .pk-scope). Sve sekcije: KPI,
// obnova, plan, podaci za uplatu, iskorištenje, predračuni, uplate.
export function PretplataPanel() {
  const subQuery = useSubscription();
  const invoicesQuery = useSubscriptionInvoices(1, 50);
  const profileQuery = useProfile();
  // PK Office probni period se ne vodi kao pretplata (nema plaćenog plana),
  // pa se čita sa office pristupa i prikazuje kao posebna sekcija
  const officeQuery = usePkOfficePristup();
  const statsQuery = useQuery({
    queryKey: ["pk-office", "my-stats"],
    queryFn: () => unwrap(getMyStats()),
  });

  if (subQuery.isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-[900px] mx-auto">
        <div className="text-[13px] text-text-secondary">Učitavanje...</div>
      </div>
    );
  }

  if (subQuery.isError || !subQuery.data) {
    return (
      <div className="p-6 lg:p-8 max-w-[900px] mx-auto">
        <div className="text-[13px] text-danger">
          Greška pri učitavanju pretplate.
        </div>
      </div>
    );
  }

  const sub = subQuery.data;
  const profile = profileQuery.data ?? null;
  const invoices = invoicesQuery.data?.items ?? [];
  const paidInvoices = invoices.filter((i) => i.status === "paid");

  const isPaidPlan = sub.plan !== "free";
  const forever = isForeverEnd(sub.currentPeriodEnd);
  const showDates = isPaidPlan && !forever;

  const daysLeft = showDates ? daysUntil(sub.currentPeriodEnd) : null;
  const expired = daysLeft !== null && daysLeft < 0;

  const cycle: BillingCycle = sub.billingCycle === "monthly" ? "monthly" : "yearly";
  const cycleLabel = cycle === "monthly" ? "mjesečna" : "godišnja";

  // Obnova: 30 dana prije isteka (godišnja), 7 dana (mjesečna), ili već isteklo.
  const renewThreshold = cycle === "monthly" ? 7 : 30;
  const showRenewal =
    isPaidPlan && daysLeft !== null && daysLeft <= renewThreshold;

  // Predračun za obnovu koji već čeka uplatu: izdat, a pokriva period POSLIJE
  // isteka tekuće pretplate (strogo veći periodEnd od tekućeg isteka).
  const endIso = isoDay(sub.currentPeriodEnd);
  const pendingRenewal = invoices.find(
    (i) =>
      i.status === "pending" && i.periodEnd && isoDay(i.periodEnd) > endIso,
  );

  const statusLabel =
    STATUS_LABELS[sub.status] ?? (sub.isActive && !expired ? "Aktivna" : "Istekla");
  const statusOk = sub.isActive && !expired;

  const totalPaid = paidInvoices.reduce(
    (s, i) => s + (Number(i.amount) || 0),
    0,
  );

  // PK Office trial: aktivan probni period bez plaćenog office paketa
  const office = officeQuery.data;
  const officeTrialEnds =
    office?.trial && office.trialEndsAt
      ? String(office.trialEndsAt).slice(0, 10)
      : null;
  const officeTrialDana = officeTrialEnds ? daysUntil(officeTrialEnds) : null;
  const officeTrialAktivan = officeTrialDana !== null && officeTrialDana >= 0;

  return (
    <div className="space-y-6">
      {/* PK Office probni period */}
      {officeTrialAktivan && officeTrialEnds && (
        <section className="bg-info-bg/40 border border-info/30 rounded-xl p-5">
          <h2 className="text-[14px] leading-5 font-semibold text-text-primary mb-2">
            PK Office probni period je aktivan
          </h2>
          <p className="text-[13px] leading-6 text-text-secondary">
            Proba uključuje sve PK Office funkcije za do 10 obrta i vrijedi do{" "}
            <strong className="text-text-primary">
              {formatDate(officeTrialEnds)}
            </strong>{" "}
            {officeTrialDana === 0 ? "(ističe danas)" : `(još ${officeTrialDana} dana)`}
            . Sve što uneseš tokom probe (obrti, izvodi, fakture, plate) ostaje
            sačuvano i poslije, pa uplatom paketa nastavljaš tačno gdje si stao.
          </p>
          <p className="text-[13px] leading-6 text-text-secondary mt-2">
            Za nastavak bez prekida zatraži predračun za PK Office paket po
            broju obrta; nakon evidentirane uplate paket se aktivira na ovom
            računu.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href="/pretplate#pk-office"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-[13.5px] font-medium transition-colors shadow-[0_4px_14px_-4px_rgba(58,92,66,0.4)]"
            >
              Zatraži predračun za PK Office
            </Link>
            <a
              href={PK_OFFICE_DASHBOARD_URL}
              className="px-5 py-2.5 rounded-full border border-brand-600/40 bg-white/60 text-brand-700 text-[13.5px] font-medium hover:bg-brand-600/10 hover:border-brand-600 transition-colors"
            >
              Otvori PK Office →
            </a>
          </div>
        </section>
      )}
      {/* KPI red */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Član od"
          value={profile ? formatDate(profile.createdAt) : "–"}
          sub="datum registracije"
        />
        <KpiCard
          label="Dana do isteka"
          value={
            daysLeft === null
              ? "–"
              : daysLeft < 0
                ? "Isteklo"
                : String(daysLeft)
          }
          sub={
            showDates
              ? expired
                ? `isteklo ${formatDate(sub.currentPeriodEnd)}`
                : `do ${formatDate(sub.currentPeriodEnd)}`
              : "bez isteka"
          }
          warn={daysLeft !== null && daysLeft <= renewThreshold}
        />
        <KpiCard
          label="Ukupno uplaćeno"
          value={formatBAM(totalPaid)}
          sub={
            paidInvoices.length === 1
              ? "1 uplata"
              : `${paidInvoices.length} uplata`
          }
        />
      </div>

      {/* Obnova pretplate */}
      {showRenewal && (
        <RenewalSection
          sub={sub}
          cycle={cycle}
          expired={expired}
          pendingRenewal={pendingRenewal ?? null}
          buyer={
            profile
              ? {
                  name: `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim(),
                  email: profile.email,
                  address: profile.address,
                  city: profile.city,
                  phone: profile.phone,
                }
              : null
          }
        />
      )}

      {/* Trenutni plan */}
      <section className="bg-cream-100 border border-cream-300 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[11px] leading-4 font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Trenutni plan
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-semibold text-text-primary">
                {PLAN_LABELS[sub.plan]}
              </h2>
              <span
                className={[
                  "text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full",
                  statusOk
                    ? "bg-success-bg text-success"
                    : "bg-danger-bg text-danger",
                ].join(" ")}
              >
                {statusLabel}
              </span>
              {sub.isTrial && (
                <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-info-bg text-info">
                  Probni period
                </span>
              )}
            </div>
            {isPaidPlan && (
              <div className="text-[13px] leading-5 text-text-secondary mt-1">
                {cycleLabel === "mjesečna" ? "Mjesečna" : "Godišnja"} naplata
              </div>
            )}
          </div>
          <Link
            href="/pretplate"
            className="text-[12px] leading-4 font-medium text-brand-700 hover:text-brand-600 shrink-0"
          >
            Vidi sve planove →
          </Link>
        </div>

        {showDates && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-[13px] leading-5 text-text-secondary mb-2">
              <span>
                Vrijedi od:{" "}
                <strong className="text-text-primary">
                  {formatDate(sub.currentPeriodStart)}
                </strong>
              </span>
              <span>
                Vrijedi do:{" "}
                <strong className="text-text-primary">
                  {formatDate(sub.currentPeriodEnd)}
                </strong>
              </span>
            </div>
            <PeriodProgress
              start={sub.currentPeriodStart}
              end={sub.currentPeriodEnd}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href={
              sub.plan.startsWith("office")
                ? "/pretplate#pk-office"
                : "/pretplate?upgrade=true"
            }
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-[13.5px] font-medium transition-colors shadow-[0_4px_14px_-4px_rgba(58,92,66,0.4)]"
          >
            {sub.plan === "free" ? "Nadogradi plan" : "Promijeni plan"}
          </Link>
        </div>
        {isPaidPlan && (
          <p className="text-[12px] leading-5 text-text-tertiary mt-3">
            Nema automatske naplate: pretplata se produžava uplatom po
            predračunu. Ako ne želite produžiti, jednostavno ne uplatite novi
            predračun i pretplata ističe sama.
          </p>
        )}
      </section>

      {/* Podaci za uplatu */}
      {isPaidPlan && (
        <section className="bg-cream-100 border border-cream-300 rounded-xl p-5">
          <h2 className="text-[14px] leading-5 font-semibold text-text-primary mb-4">
            Podaci za uplatu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-[13px] leading-6">
            <div>
              <span className="text-text-tertiary">Primalac:</span>{" "}
              <span className="text-text-primary font-medium">
                OBRT &quot;BIRO JAPIĆ&quot; Cazin
              </span>
            </div>
            <div>
              <span className="text-text-tertiary">Adresa:</span>{" "}
              <span className="text-text-primary">
                Bošnjačkih šehida bb, Cazin
              </span>
            </div>
            <div>
              <span className="text-text-tertiary">Transakcijski račun:</span>{" "}
              <span className="text-text-primary font-medium tabular-nums">
                198-201-20200826-04
              </span>{" "}
              <span className="text-text-tertiary">(KIB banka)</span>
            </div>
            <div>
              <span className="text-text-tertiary">Svrha uplate:</span>{" "}
              <span className="text-text-primary">broj predračuna</span>
            </div>
          </div>
          <p className="text-[12px] leading-5 text-text-tertiary mt-3">
            Iznos i broj predračuna nalaze se na PDF-u predračuna. Nakon što
            evidentiramo uplatu, pretplata se aktivira odnosno produžava.
          </p>
        </section>
      )}

      {/* Iskorištenje */}
      <section className="bg-cream-100 border border-cream-300 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-[14px] leading-5 font-semibold text-text-primary">
            Iskorištenje
          </h2>
          <p className="text-[12px] leading-5 text-text-tertiary mt-0.5">
            Šta ste do sada napravili u PK Office-u.
          </p>
        </div>

        {statsQuery.isLoading ? (
          <p className="text-[13px] text-text-tertiary">Učitavanje...</p>
        ) : statsQuery.data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatTile
              icon={<IconBuildingStore size={20} />}
              tone="brand"
              label="Organizacije"
              value={statsQuery.data.djelatnosti}
              sub="vaše djelatnosti"
            />
            <StatTile
              icon={<IconUsers size={20} />}
              tone="info"
              label="Klijenti"
              value={statsQuery.data.klijenti}
              sub="firme i fizička lica"
            />
            <StatTile
              icon={<IconUserCheck size={20} />}
              tone="success"
              label="Radnici"
              value={statsQuery.data.radnici}
              sub="u svim organizacijama"
            />
            <StatTile
              icon={<IconFileInvoice size={20} />}
              tone="info"
              label="Fakture"
              value={statsQuery.data.fakture}
              sub="ukupno izdatih"
            />
            <StatTile
              icon={<IconCoins size={20} />}
              tone="success"
              label="Obračuni plata"
              value={statsQuery.data.obracuniMjesec}
              sub={
                statsQuery.data.obracuniDelta === 0
                  ? "ovaj mjesec"
                  : statsQuery.data.obracuniDelta > 0
                    ? `+${statsQuery.data.obracuniDelta} vs prošli mjesec`
                    : `${statsQuery.data.obracuniDelta} vs prošli mjesec`
              }
            />
            <StatTile
              icon={<IconFiles size={20} />}
              tone="neutral"
              label="Dokumenti"
              value={statsQuery.data.dokumenti}
              sub="obrasci i ugovori"
            />
          </div>
        ) : (
          <p className="text-[13px] text-text-tertiary">
            Statistika trenutno nije dostupna.
          </p>
        )}

        <PlanLimits sub={sub} />
      </section>

      {/* Moji predračuni */}
      <section className="bg-cream-100 border border-cream-300 rounded-xl p-5">
        <h2 className="text-[14px] leading-5 font-semibold text-text-primary mb-4">
          Moji predračuni
        </h2>
        {invoicesQuery.isLoading ? (
          <p className="text-[13px] text-text-tertiary">Učitavanje...</p>
        ) : invoices.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">
            Još nema generisanih predračuna.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-text-tertiary">
                  <th className="py-2 font-semibold">Broj</th>
                  <th className="py-2 font-semibold">Datum</th>
                  <th className="py-2 font-semibold">Plan</th>
                  <th className="py-2 font-semibold">Period</th>
                  <th className="py-2 font-semibold text-right">Iznos</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-cream-300 last:border-0"
                  >
                    <td className="py-3 font-mono text-[12px] text-text-secondary whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 text-text-primary whitespace-nowrap">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-3 text-text-primary whitespace-nowrap">
                      {invoicePlanLabel(inv.plan)}{" "}
                      <span className="text-text-tertiary">
                        · {inv.billingCycle === "monthly" ? "mjesečno" : "godišnje"}
                      </span>
                    </td>
                    <td className="py-3 text-text-secondary whitespace-nowrap">
                      {inv.periodStart && inv.periodEnd
                        ? `${formatDate(inv.periodStart)} - ${formatDate(inv.periodEnd)}`
                        : "–"}
                    </td>
                    <td className="py-3 font-semibold text-text-primary tabular-nums text-right whitespace-nowrap">
                      {formatBAM(inv.amount)}
                    </td>
                    <td className="py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <a
                        href={subscriptionInvoicePdfUrl(inv.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-700 hover:text-brand-600 font-medium"
                      >
                        Preuzmi PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Historija uplata */}
      <section className="bg-cream-100 border border-cream-300 rounded-xl p-5">
        <h2 className="text-[14px] leading-5 font-semibold text-text-primary mb-4">
          Historija uplata
        </h2>
        {invoicesQuery.isLoading ? (
          <p className="text-[13px] text-text-tertiary">Učitavanje...</p>
        ) : paidInvoices.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">
            Još nema evidentiranih uplata.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-text-tertiary">
                  <th className="py-2 font-semibold">Evidentirana</th>
                  <th className="py-2 font-semibold">Predračun</th>
                  <th className="py-2 font-semibold">Plan</th>
                  <th className="py-2 font-semibold">Pokriva period</th>
                  <th className="py-2 font-semibold text-right">Iznos</th>
                </tr>
              </thead>
              <tbody>
                {paidInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-cream-300 last:border-0"
                  >
                    <td className="py-3 text-text-primary whitespace-nowrap">
                      {formatDate(inv.paidAt ?? inv.invoiceDate)}
                    </td>
                    <td className="py-3 font-mono text-[12px] text-text-secondary whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 text-text-primary whitespace-nowrap">
                      {invoicePlanLabel(inv.plan)}{" "}
                      <span className="text-text-tertiary">
                        · {inv.billingCycle === "monthly" ? "mjesečno" : "godišnje"}
                      </span>
                    </td>
                    <td className="py-3 text-text-secondary whitespace-nowrap">
                      {inv.periodStart && inv.periodEnd
                        ? `${formatDate(inv.periodStart)} - ${formatDate(inv.periodEnd)}`
                        : "–"}
                    </td>
                    <td className="py-3 font-semibold text-text-primary tabular-nums text-right whitespace-nowrap">
                      {formatBAM(inv.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Obnova pretplate ─────────────────────────────────────────────────────────

type RenewalBuyer = {
  name: string;
  email: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
} | null;

function RenewalSection({
  sub,
  cycle,
  expired,
  pendingRenewal,
  buyer,
}: {
  sub: Subscription;
  cycle: BillingCycle;
  expired: boolean;
  pendingRenewal: SubscriptionInvoice | null;
  buyer: RenewalBuyer;
}) {
  const qc = useQueryClient();
  const [done, setDone] = useState<{ number: string; url: string } | null>(
    null,
  );

  const plan: PredracunPlan =
    OFFICE_TO_PREDRACUN[sub.plan] ??
    (sub.plan === "business" ? "BUSINESS" : "PRO");
  const planLabel = PLAN_LABELS[sub.plan] ?? "Pro";
  const cycleLabel = cycle === "monthly" ? "mjesečna" : "godišnja";

  // Kontinuitet: novi period počinje dan nakon isteka tekuće pretplate.
  // Ako je već isteklo, ne idemo unazad: počinje od danas.
  const todayIso = new Date().toISOString().slice(0, 10);
  const afterExpiry = dayAfterIso(sub.currentPeriodEnd);
  const periodStart = afterExpiry > todayIso ? afterExpiry : todayIso;
  const periodEnd = periodEndFrom(periodStart, cycle);

  const gen = useMutation({
    mutationFn: async () => {
      if (!buyer?.email) throw new Error("Vaš profil nema email adresu.");
      const res = await createPredracun(
        plan,
        cycle,
        {
          name: buyer.name,
          email: buyer.email,
          address: buyer.address ?? undefined,
          city: buyer.city ?? undefined,
          phone: buyer.phone ?? undefined,
        },
        periodStart,
      );
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      setDone({ number: res.fullNumber, url: res.pdfUrl });
      if (typeof window !== "undefined") window.open(res.pdfUrl, "_blank");
      qc.invalidateQueries({ queryKey: ["subscription", "invoices"] });
    },
  });

  return (
    <section className="bg-warning-bg/40 border border-warning/30 rounded-xl p-5">
      <h2 className="text-[14px] leading-5 font-semibold text-text-primary mb-2">
        {expired ? "Obnovite pretplatu" : "Pretplata uskoro ističe"}
      </h2>

      {pendingRenewal ? (
        <>
          <p className="text-[13px] leading-6 text-text-secondary">
            Predračun{" "}
            <strong className="text-text-primary">
              {pendingRenewal.invoiceNumber}
            </strong>{" "}
            za obnovu je već generisan i čeka uplatu (
            {formatBAM(pendingRenewal.amount)}, period{" "}
            {formatDate(pendingRenewal.periodStart)} do{" "}
            {formatDate(pendingRenewal.periodEnd)}). Nakon evidentiranja uplate
            pretplata se produžava bez prekida.
          </p>
          <div className="mt-3">
            <a
              href={subscriptionInvoicePdfUrl(pendingRenewal.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-[13.5px] font-medium transition-colors shadow-[0_4px_14px_-4px_rgba(58,92,66,0.4)]"
            >
              Otvori predračun (PDF)
            </a>
          </div>
        </>
      ) : done ? (
        <>
          <p className="text-[13px] leading-6 text-text-secondary">
            Predračun <strong className="text-text-primary">{done.number}</strong>{" "}
            je generisan i poslan na{" "}
            <strong className="text-text-primary">{buyer?.email}</strong>.
            Nakon evidentiranja uplate pretplata se produžava bez prekida.
          </p>
          <div className="mt-3">
            <a
              href={done.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium text-brand-700 hover:text-brand-600"
            >
              Ponovo otvori PDF
            </a>
          </div>
        </>
      ) : (
        <>
          <p className="text-[13px] leading-6 text-text-secondary">
            Klikom na dugme generiše se predračun za obnovu (
            <strong className="text-text-primary">
              {planLabel}, {cycleLabel}
            </strong>
            ). Nova pretplata važi u kontinuitetu od isteka tekuće: period{" "}
            <strong className="text-text-primary">
              {formatDate(periodStart)}
            </strong>{" "}
            do{" "}
            <strong className="text-text-primary">
              {formatDate(periodEnd)}
            </strong>
            {expired ? " (počinje danas)." : " (bez prekida pristupa)."}{" "}
            Plaćanje je po uplatnici, podaci su na predračunu.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => gen.mutate()}
              disabled={gen.isPending || !buyer?.email}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-[13.5px] font-medium disabled:opacity-50 transition-colors shadow-[0_4px_14px_-4px_rgba(58,92,66,0.4)]"
            >
              {gen.isPending ? "Generišem..." : "Generiši predračun za obnovu"}
            </button>
            <Link
              href={
                plan.startsWith("OFFICE")
                  ? "/pretplate#pk-office"
                  : `/pretplate?plan=${plan}&cycle=${cycle}`
              }
              className="text-[13px] font-medium text-brand-700 hover:text-brand-600"
            >
              Želim drugi plan ili ciklus
            </Link>
          </div>
          {!buyer?.email && (
            <p className="text-[12px] leading-5 text-text-tertiary mt-2">
              Dodajte email adresu u profilu da generišete predračun.
            </p>
          )}
          {gen.isError && (
            <p className="text-[12px] leading-5 text-danger mt-2">
              {(gen.error as Error).message}
            </p>
          )}
        </>
      )}
    </section>
  );
}

// ── Sitne komponente ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  warn = false,
}: {
  label: string;
  value: string;
  sub: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-4">
      <div className="text-[11px] leading-4 font-semibold uppercase tracking-wider text-text-tertiary mb-1.5">
        {label}
      </div>
      <div
        className={[
          "font-serif-display text-[26px] leading-8",
          warn ? "text-warning" : "text-text-primary",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="text-[12px] leading-5 text-text-tertiary mt-0.5">
        {sub}
      </div>
    </div>
  );
}

function PeriodProgress({ start, end }: { start: string; end: string }) {
  // Lazy init: "sad" se uzme jednom pri mount-u (dovoljno za progress bar).
  const [now] = useState(() => Date.now());
  const s = new Date(`${isoDay(start)}T00:00:00`).getTime();
  const e = new Date(`${isoDay(end)}T00:00:00`).getTime();
  if (!(e > s)) return null;
  const pct = Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
  const near = pct > 85;
  return (
    <div className="h-2 bg-cream-200 rounded-full overflow-hidden max-w-[420px]">
      <div
        className={`h-full transition-all ${near ? "bg-warning" : "bg-brand-600"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function InvoiceStatusBadge({
  status,
}: {
  status: SubscriptionInvoice["status"];
}) {
  return (
    <span
      className={[
        "text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap",
        status === "paid"
          ? "bg-success-bg text-success"
          : status === "failed"
            ? "bg-danger-bg text-danger"
            : status === "refunded"
              ? "bg-cream-200 text-text-secondary"
              : "bg-warning-bg text-warning",
      ].join(" ")}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}

const STAT_TONES = {
  brand: "bg-brand-100 text-brand-700",
  success: "bg-success-bg text-success",
  info: "bg-info-bg text-info",
  neutral: "bg-cream-200 text-text-secondary",
} as const;

function StatTile({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tone: keyof typeof STAT_TONES;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="border border-cream-300 rounded-xl p-3.5">
      <div
        className={`w-9 h-9 rounded-[10px] flex items-center justify-center mb-2.5 ${STAT_TONES[tone]}`}
      >
        {icon}
      </div>
      <div className="text-[10.5px] leading-4 font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </div>
      <div className="font-serif-display text-[24px] leading-8 text-text-primary tabular-nums">
        {value}
      </div>
      <div className="text-[11.5px] leading-4 text-text-tertiary mt-0.5">
        {sub}
      </div>
    </div>
  );
}

// Limiti plana: progress barovi samo za limite koji stvarno postoje.
// Kad je sve neograničeno (Pro/Business), umjesto tri prazna "neograničeno"
// reda ide jedna rečenica.
function PlanLimits({ sub }: { sub: Subscription }) {
  const bars = [
    {
      label: "Organizacije",
      used: sub.usage.organizations,
      limit: sub.limits.organizations,
    },
    {
      label: "Fakture ovaj mjesec",
      used: sub.usage.transactionsThisMonth,
      limit: sub.limits.transactionsPerMonth,
    },
    {
      label: "Korisnici",
      used: sub.usage.users,
      limit: sub.limits.usersPerOrganization,
    },
  ].filter((b) => b.limit !== -1);

  if (bars.length === 0) {
    return (
      <p className="text-[12px] leading-5 text-text-tertiary mt-4 pt-4 border-t border-cream-300">
        <span className="text-success font-medium">✓</span> Vaš plan nema
        ograničenja: neograničen broj organizacija, korisnika i faktura.
      </p>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-cream-300">
      <div className="text-[11px] leading-4 font-semibold uppercase tracking-wider text-text-tertiary mb-3">
        Limiti plana
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bars.map((b) => (
          <UsageBar key={b.label} label={b.label} used={b.used} limit={b.limit} />
        ))}
      </div>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited
    ? 0
    : limit === 0
      ? 0
      : Math.min(100, (used / limit) * 100);
  const isNear = percentage > 80 && !isUnlimited;

  return (
    <div>
      <div className="flex justify-between mb-1.5 text-[13px]">
        <span className="text-text-primary">{label}</span>
        <span
          className={
            isNear
              ? "text-warning font-semibold tabular-nums"
              : "text-text-secondary tabular-nums"
          }
        >
          {used} {isUnlimited ? "· neograničeno" : `/ ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${isNear ? "bg-warning" : "bg-brand-600"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
