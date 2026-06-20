"use client";

import Link from "next/link";
import {
  useCancelSubscription,
  useReactivateSubscription,
  useSubscription,
  useSubscriptionInvoices,
} from "src/hooks/useSubscription";
import { formatBAM, formatDate } from "src/lib/format";
import type {
  Subscription,
  SubscriptionInvoice,
} from "src/api/subscription";

const STATUS_LABELS: Record<Subscription["status"], string> = {
  active: "Aktivna",
  cancelled: "Otkazana",
  expired: "Istekla",
  past_due: "Neplaćena",
  trialing: "Probni period",
};

const INVOICE_STATUS_LABELS: Record<SubscriptionInvoice["status"], string> = {
  paid: "Plaćeno",
  pending: "Na čekanju",
  failed: "Neuspješno",
  refunded: "Vraćeno",
};

const PLAN_LABELS: Record<Subscription["plan"], string> = {
  free: "Besplatan",
  pro: "Pro",
  business: "Business",
};

export default function PretplataPage() {
  const subQuery = useSubscription();
  const invoicesQuery = useSubscriptionInvoices(1, 20);
  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();

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
        <div className="text-[13px] text-danger">Greška pri učitavanju pretplate.</div>
      </div>
    );
  }

  const sub = subQuery.data;
  const invoices = invoicesQuery.data?.items ?? [];

  const cycleLabel =
    sub.billingCycle === "monthly"
      ? "Mjesečna naplata"
      : sub.billingCycle === "yearly"
        ? "Godišnja naplata"
        : null;

  return (
    <div className="px-8 py-10 lg:px-14 lg:py-14 max-w-[1100px] mx-auto space-y-6">
      <div className="mb-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-100 text-brand-700 text-[11.5px] font-medium tracking-[0.04em] border border-brand-600/15 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
          Račun
        </div>
        <h1 className="font-serif-display text-[clamp(2.4rem,4.5vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
          Pretplata<span className="text-brand-600" style={{ fontStyle: "italic" }}>.</span>
        </h1>
        <p className="text-[15px] leading-7 text-text-tertiary mt-4 max-w-xl">
          Upravljanje planom, naplatom i iskorištenjem.
        </p>
      </div>

      <section className="bg-cream-100 border border-cream-300 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[11px] leading-4 font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Trenutni plan
            </div>
            <h2 className="text-xl font-semibold text-text-primary">
              {PLAN_LABELS[sub.plan]}
            </h2>
            <div className="text-[13px] leading-5 text-text-secondary mt-1">
              Status: <span className="font-medium">{STATUS_LABELS[sub.status]}</span>
              {cycleLabel ? ` · ${cycleLabel}` : ""}
            </div>
          </div>
          <Link
            href="/pretplate"
            className="text-[12px] leading-4 font-medium text-brand-700 hover:text-brand-600 shrink-0"
          >
            Vidi sve planove →
          </Link>
        </div>

        {sub.currentPeriodEnd && (
          <div className="text-[13px] leading-5 text-text-secondary mb-4">
            {sub.cancelAtPeriodEnd ? (
              <>
                Pretplata se otkazuje{" "}
                <strong className="text-text-primary">
                  {formatDate(sub.currentPeriodEnd)}
                </strong>
              </>
            ) : sub.plan === "free" ? null : (
              <>
                Sljedeća naplata:{" "}
                <strong className="text-text-primary">
                  {formatDate(sub.currentPeriodEnd)}
                </strong>
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {sub.cancelAtPeriodEnd ? (
            <button
              type="button"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-[13.5px] font-medium disabled:opacity-50 transition-colors shadow-[0_4px_14px_-4px_rgba(58,92,66,0.4)]"
            >
              {reactivateMutation.isPending ? "Reaktiviranje..." : "Reaktiviraj pretplatu"}
            </button>
          ) : sub.plan !== "free" ? (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Otkazati pretplatu? Pristup ostaje do kraja perioda.",
                  )
                ) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
              className="px-5 py-2.5 border border-cream-300 hover:bg-cream-200 text-text-primary rounded-full text-[13.5px] font-medium disabled:opacity-50 transition-colors"
            >
              {cancelMutation.isPending ? "Otkazivanje..." : "Otkaži pretplatu"}
            </button>
          ) : null}

          <Link
            href="/pretplate?upgrade=true"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-[13.5px] font-medium transition-colors shadow-[0_4px_14px_-4px_rgba(58,92,66,0.4)]"
          >
            {sub.plan === "free" ? "Nadogradi plan" : "Promijeni plan"}
          </Link>
        </div>
      </section>

      <section className="bg-cream-100 border border-cream-300 rounded-xl p-5">
        <h2 className="text-[14px] leading-5 font-semibold text-text-primary mb-4">
          Iskorištenje
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UsageBar
            label="Organizacije"
            used={sub.usage.organizations}
            limit={sub.limits.organizations}
          />
          <UsageBar
            label="Transakcije ovaj mjesec"
            used={sub.usage.transactionsThisMonth}
            limit={sub.limits.transactionsPerMonth}
          />
          <UsageBar
            label="Korisnici"
            used={sub.usage.users}
            limit={sub.limits.usersPerOrganization}
          />
        </div>
      </section>

      <section className="bg-cream-100 border border-cream-300 rounded-xl p-5">
        <h2 className="text-[14px] leading-5 font-semibold text-text-primary mb-4">
          Historija naplate
        </h2>
        {invoicesQuery.isLoading ? (
          <p className="text-[13px] text-text-tertiary">Učitavanje...</p>
        ) : invoices.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">Još nema fakturisanja.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-text-tertiary">
                  <th className="py-2 font-semibold">Datum</th>
                  <th className="py-2 font-semibold">Broj fakture</th>
                  <th className="py-2 font-semibold">Iznos</th>
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
                    <td className="py-3 text-text-primary">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-3 font-mono text-[12px] text-text-secondary">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 font-semibold text-text-primary tabular-nums">
                      {formatBAM(inv.amount)}
                    </td>
                    <td className="py-3">
                      <span
                        className={[
                          "text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full",
                          inv.status === "paid"
                            ? "bg-success-bg text-success"
                            : inv.status === "failed"
                              ? "bg-danger-bg text-danger"
                              : inv.status === "refunded"
                                ? "bg-cream-200 text-text-secondary"
                                : "bg-warning-bg text-warning",
                        ].join(" ")}
                      >
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-700 hover:text-brand-600 font-medium"
                        >
                          Preuzmi PDF
                        </a>
                      ) : null}
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
