"use client";

import { useState } from "react";
import {
  IconFileInvoice,
  IconDownload,
  IconCircleCheck,
  IconAlertCircle,
  IconPlus,
  IconInbox,
  IconLoader2,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatBAM, formatDate } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { useOrgInvoices } from "src/hooks/useBankStatements";
import {
  downloadInvoicePdf,
  patchInvoice,
  type Invoice,
  type InvoiceStatus,
} from "src/api/invoices";
import { unwrap } from "src/api/auth";

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000";

const STATUS_META: Record<
  InvoiceStatus,
  { label: string; cls: string }
> = {
  DRAFT: { label: "nacrt", cls: "bg-cream-200 text-text-secondary" },
  ISSUED: { label: "izdana", cls: "bg-info-bg text-info" },
  PAID: { label: "naplaćena", cls: "bg-success-bg text-success" },
  CANCELLED: { label: "stornirana", cls: "bg-danger-bg text-danger" },
};

export default function FakturePage() {
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const [statusFilter, setStatusFilter] = useState("");
  const [downloading, setDownloading] = useState<number | null>(null);

  const { data: invoices, isLoading } = useOrgInvoices(orgId, {
    status: (statusFilter || undefined) as InvoiceStatus | undefined,
  });
  const qc = useQueryClient();
  const markPaid = useMutation({
    mutationFn: (inv: Invoice) =>
      unwrap(patchInvoice(inv.id, { status: "PAID" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-invoices", orgId] });
    },
  });

  const rows = invoices ?? [];
  const openTotal = rows
    .filter((i) => i.status === "ISSUED")
    .reduce((s, i) => s + Number(i.grossTotal), 0);
  const openCount = rows.filter((i) => i.status === "ISSUED").length;

  async function handlePdf(inv: Invoice) {
    setDownloading(inv.id);
    try {
      await downloadInvoicePdf(inv.id, `Faktura-${inv.fullNumber}.pdf`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
            <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
            Finansije
          </div>
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
            Fakture.
          </h1>
          <p className="text-[13px] leading-6 text-text-tertiary max-w-[520px]">
            Fakture organizacije, povezane sa Poreznim Kalkulatorom. Naplata se
            bilježi automatski potvrdom priliva na bankovnom izvodu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
          >
            <option value="">Svi statusi</option>
            <option value="ISSUED">Izdane (nenaplaćene)</option>
            <option value="PAID">Naplaćene</option>
            <option value="DRAFT">Nacrti</option>
            <option value="CANCELLED">Stornirane</option>
          </select>
          <a
            href={`${MARKETING_URL}/fakture/nova`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={16} />
            Nova faktura
          </a>
        </div>
      </div>

      {/* Otvoreno potraživanje */}
      {openCount > 0 && (
        <div className="rounded-xl bg-cream-100 border border-cream-300 px-5 py-4 mb-4 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="text-[13px] text-text-tertiary">
            Otvorene fakture:{" "}
            <span className="font-semibold text-text-primary">{openCount}</span>
          </span>
          <span className="text-[13px] text-text-tertiary">
            Ukupno potraživanje:{" "}
            <span className="font-semibold text-text-primary tabular-nums">
              {formatBAM(openTotal)}
            </span>
          </span>
        </div>
      )}

      {/* Lista */}
      <div className="rounded-xl bg-cream-100 border border-cream-300">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            Učitavanje...
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <span className="w-12 h-12 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-3">
              <IconInbox size={22} />
            </span>
            <p className="text-[14px] font-medium text-text-primary">
              Nema faktura{statusFilter ? " za izabrani status" : ""}
            </p>
            <p className="text-[12.5px] text-text-tertiary mt-1 max-w-[380px] mx-auto">
              Izdajte prvu fakturu klikom na "Nova faktura". Naplata se kasnije
              veže automatski sa bankovnog izvoda.
            </p>
          </div>
        ) : (
          <ul>
            {rows.map((inv, i) => {
              const meta = STATUS_META[inv.status];
              return (
                <li
                  key={inv.id}
                  className={[
                    "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-[13px]",
                    i < rows.length - 1 ? "border-b border-cream-300/70" : "",
                  ].join(" ")}
                >
                  <span className="w-10 h-10 rounded-full bg-brand-100/60 text-brand-700 inline-flex items-center justify-center shrink-0">
                    <IconFileInvoice size={17} />
                  </span>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-text-primary">
                        {inv.fullNumber}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium shrink-0 ${meta.cls}`}
                      >
                        {inv.status === "PAID" ? (
                          <IconCircleCheck size={11} />
                        ) : inv.status === "ISSUED" ? (
                          <IconAlertCircle size={11} />
                        ) : null}
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">
                      {[
                        inv.buyerName,
                        `izdana ${formatDate(inv.issueDate)}`,
                        inv.dueDate ? `rok ${formatDate(inv.dueDate)}` : null,
                        inv.paidAt ? `naplaćena ${formatDate(inv.paidAt)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <span className="text-[13.5px] font-semibold tabular-nums whitespace-nowrap">
                    {formatBAM(Number(inv.grossTotal))}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {inv.status === "ISSUED" && (
                      <button
                        type="button"
                        disabled={markPaid.isPending}
                        onClick={() => markPaid.mutate(inv)}
                        title="Označi naplaćenom (bez izvoda)"
                        className="px-3 py-[5px] rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors whitespace-nowrap disabled:opacity-50"
                      >
                        Naplaćena
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={downloading === inv.id}
                      onClick={() => handlePdf(inv)}
                      title="Preuzmi PDF"
                      className="p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-brand-600 hover:border-brand-600/50 transition-colors disabled:opacity-50"
                    >
                      {downloading === inv.id ? (
                        <IconLoader2 size={15} className="animate-spin" />
                      ) : (
                        <IconDownload size={15} />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
