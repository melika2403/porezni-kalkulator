"use client";

// Dijeljeni modal za detalj stavke izvoda: kategorija, potvrda, svi
// podaci sa izvoda. Koristi se na detalju izvoda i na Transakcije tabu.
import Link from "next/link";
import {
  IconAlertCircle,
  IconLink,
  IconExternalLink,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { Modal } from "src/components/app-shell/Modal";
import {
  useOrgInvoices,
  useUpdateBankTransaction,
} from "src/hooks/useBankStatements";
import { categoriesForDirection } from "src/lib/bankCategories";
import type { BankTransactionWithStatement } from "src/api/bankStatements";

export function txTitle(t: BankTransactionWithStatement) {
  if (t.counterpartyName) return t.counterpartyName;
  if (t.description) {
    return t.description.length > 70
      ? `${t.description.slice(0, 70)}...`
      : t.description;
  }
  return t.direction === "IN" ? "Uplata" : "Plaćanje";
}

export function StatusBadge({
  status,
}: {
  status: BankTransactionWithStatement["status"];
}) {
  if (status === "UNMATCHED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-accent-bg text-accent-500 shrink-0">
        <IconAlertCircle size={11} /> za pregled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-brand-100 text-brand-700 shrink-0">
      <IconLink size={11} /> {status === "IGNORED" ? "zanemareno" : "potvrđeno"}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary shrink-0">
        {label}
      </span>
      <span className="text-[13px] text-text-primary text-right break-all">
        {value}
      </span>
    </div>
  );
}

export function TransactionModal({
  orgId,
  tx,
  onClose,
  showStatementLink = false,
}: {
  orgId: number | null;
  tx: BankTransactionWithStatement | null;
  onClose: () => void;
  /** prikaži link na matični izvod (na Transakcije tabu) */
  showStatementLink?: boolean;
}) {
  const updateTx = useUpdateBankTransaction(orgId);
  // otvorene fakture za ručno povezivanje priliva
  const { data: openInvoices } = useOrgInvoices(
    tx != null && tx.direction === "IN" ? orgId : null,
    { status: "ISSUED" },
  );

  return (
    <Modal
      open={tx != null}
      onClose={onClose}
      title={tx ? txTitle(tx) : ""}
      footer={
        tx && (
          <>
            {showStatementLink && (
              <Link
                href={`/app/bankovni-izvodi/${tx.statementId}`}
                className="inline-flex items-center gap-1.5 mr-auto text-[13px] font-medium text-brand-700 hover:text-brand-600"
              >
                <IconExternalLink size={15} />
                Otvori izvod
              </Link>
            )}
            {tx.status === "UNMATCHED" ? (
              <button
                type="button"
                disabled={updateTx.isPending}
                onClick={() =>
                  updateTx.mutate({
                    txId: tx.id,
                    patch: { status: "CONFIRMED" },
                  })
                }
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Potvrdi
              </button>
            ) : (
              <button
                type="button"
                disabled={updateTx.isPending}
                onClick={() =>
                  updateTx.mutate({
                    txId: tx.id,
                    patch: { status: "UNMATCHED" },
                  })
                }
                className="px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
              >
                Vrati u pregled
              </button>
            )}
          </>
        )
      }
    >
      {tx && (
        <div className="flex flex-col gap-3 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <span
              className={[
                "text-[22px] font-semibold tabular-nums",
                tx.direction === "IN" ? "text-brand-600" : "text-text-primary",
              ].join(" ")}
            >
              {tx.direction === "IN" ? "+" : "−"}
              {formatBAM(Number(tx.amount))}
            </span>
            <StatusBadge status={tx.status} />
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5">
              Kategorija
            </div>
            <select
              value={tx.category ?? ""}
              disabled={updateTx.isPending}
              onChange={(e) =>
                updateTx.mutate({
                  txId: tx.id,
                  patch: { category: e.target.value || null },
                })
              }
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
            >
              <option value="">Bez kategorije</option>
              {(() => {
                const groups = categoriesForDirection(tx.direction);
                return (
                  <>
                    <optgroup label="Ide u KPR">
                      {groups.uKpr.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} (Kolona {c.kprColumn})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Ne ide u KPR (nije prihod ni rashod)">
                      {groups.bezKpr.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </optgroup>
                  </>
                );
              })()}
            </select>
          </div>

          {tx.direction === "IN" && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5">
                Povezana faktura
              </div>
              <select
                value={tx.invoiceId ?? ""}
                disabled={updateTx.isPending}
                onChange={(e) =>
                  updateTx.mutate({
                    txId: tx.id,
                    patch: {
                      invoiceId: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
                className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
              >
                <option value="">Nije povezano sa fakturom</option>
                {/* trenutno povezana (može biti već naplaćena pa nije u otvorenim) */}
                {tx.invoice &&
                  !(openInvoices ?? []).some((i) => i.id === tx.invoice?.id) && (
                    <option value={tx.invoice.id}>
                      {tx.invoice.fullNumber} · {formatBAM(Number(tx.invoice.grossTotal))}
                      {tx.invoice.status === "PAID" ? " (naplaćena)" : ""}
                    </option>
                  )}
                {(openInvoices ?? []).map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.fullNumber} · {inv.buyerName} ·{" "}
                    {formatBAM(Number(inv.grossTotal))}
                  </option>
                ))}
              </select>
              {tx.invoice && tx.status === "UNMATCHED" && (
                <p className="text-[11.5px] text-text-tertiary mt-1.5">
                  Potvrdom stavke faktura {tx.invoice.fullNumber} se označava
                  naplaćenom na datum priliva.
                </p>
              )}
            </div>
          )}

          <Detail label="Datum" value={tx.date ? formatDate(tx.date) : "–"} />
          {tx.statement && (
            <Detail
              label="Izvod"
              value={`${tx.statement.bankName ?? "Banka"} · br. ${tx.statement.statementNumber ?? "?"}`}
            />
          )}
          {tx.counterpartyName && (
            <Detail label="Protivstrana" value={tx.counterpartyName} />
          )}
          {tx.counterpartyAccount && (
            <Detail label="Protivračun" value={tx.counterpartyAccount} />
          )}
          {tx.reference && <Detail label="Referenca" value={tx.reference} />}
          {tx.balanceAfter != null && (
            <Detail label="Saldo nakon" value={formatBAM(Number(tx.balanceAfter))} />
          )}
          {tx.description && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Opis sa izvoda
              </div>
              <div className="text-[12.5px] leading-5 text-text-secondary break-words">
                {tx.description}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
