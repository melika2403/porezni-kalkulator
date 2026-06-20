"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconChecks,
  IconLoader2,
  IconTrash,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useBankStatement,
  useConfirmAllStatement,
  useDeleteBankStatement,
  useUpdateBankTransaction,
} from "src/hooks/useBankStatements";
import {
  TransactionModal,
  txTitle,
  StatusBadge,
} from "src/sections/bankovni-izvodi/TransactionModal";
import { parseWarnings, type BankTransaction } from "src/api/bankStatements";
import { categoryDisplayLabel } from "src/lib/bankCategories";

export default function IzvodDetaljPage() {
  const params = useParams<{ statementId: string }>();
  const router = useRouter();
  const statementId = Number(params.statementId) || null;

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const { data: statement, isLoading } = useBankStatement(orgId, statementId);
  const confirmAll = useConfirmAllStatement(orgId);
  const deleteStatement = useDeleteBankStatement(orgId);
  const updateTx = useUpdateBankTransaction(orgId);
  const [selected, setSelected] = useState<BankTransaction | null>(null);

  const transactions = statement?.transactions ?? [];
  const unmatched = transactions.filter((t) => t.status === "UNMATCHED").length;
  const totalIn = transactions
    .filter((t) => t.direction === "IN")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions
    .filter((t) => t.direction === "OUT")
    .reduce((s, t) => s + Number(t.amount), 0);

  // selected drži referencu na staru verziju nakon refetch-a; uzmi svježu
  const selectedFresh = selected
    ? transactions.find((t) => t.id === selected.id) ?? selected
    : null;

  function handleDelete() {
    if (!statement) return;
    const sure = window.confirm(
      `Obrisati izvod br. ${statement.statementNumber ?? "?"} i svih ${transactions.length} stavki? Ovo se ne može poništiti.`,
    );
    if (!sure) return;
    deleteStatement.mutate(statement.id, {
      onSuccess: () => router.push("/app/bankovni-izvodi"),
    });
  }

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      <Link
        href="/app/bankovni-izvodi"
        className="group inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-info-bg text-info text-[14px] font-medium hover:bg-[#c9ddee] transition-colors mb-4"
      >
        <IconArrowLeft
          size={18}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Svi izvodi
      </Link>

      {isLoading || !statement ? (
        <div className="rounded-xl bg-cream-100 border border-cream-300 px-4 py-12 text-center text-text-tertiary text-[13px]">
          {isLoading ? "Učitavanje izvoda..." : "Izvod nije pronađen."}
        </div>
      ) : (
        <>
          {/* Zaglavlje izvoda */}
          <div className="rounded-xl bg-cream-100 border border-cream-300 p-5 mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-serif-display text-[24px] leading-tight text-text-primary">
                  {statement.bankName ?? "Banka"} · Izvod br.{" "}
                  {statement.statementNumber ?? "?"}
                </h1>
                <p className="text-[13px] text-text-tertiary mt-1">
                  {statement.statementDate
                    ? formatDate(statement.statementDate)
                    : "bez datuma"}
                  {statement.account ? ` · račun ${statement.account}` : ""}
                  {statement.fileName ? ` · ${statement.fileName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unmatched > 0 && (
                  <button
                    type="button"
                    disabled={confirmAll.isPending}
                    onClick={() =>
                      confirmAll.mutate(statement.id, {
                        // sve potvrđeno → vrati se na listu izvoda
                        onSuccess: () => router.push("/app/bankovni-izvodi"),
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {confirmAll.isPending ? (
                      <IconLoader2 size={16} className="animate-spin" />
                    ) : (
                      <IconChecks size={16} />
                    )}
                    Potvrdi sve ({unmatched})
                  </button>
                )}
                <button
                  type="button"
                  disabled={deleteStatement.isPending}
                  onClick={handleDelete}
                  title="Obriši izvod"
                  className="p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-50"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {statement.openingBalance != null && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-0.5">
                    Početno stanje
                  </div>
                  <div className="text-[16px] font-medium tabular-nums text-text-primary">
                    {formatBAM(Number(statement.openingBalance))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-0.5">
                  Potražuje
                </div>
                <div className="text-[16px] font-medium tabular-nums text-brand-600">
                  +{formatBAM(totalIn)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-0.5">
                  Duguje
                </div>
                <div className="text-[16px] font-medium tabular-nums text-text-primary">
                  −{formatBAM(totalOut)}
                </div>
              </div>
              {statement.closingBalance != null && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-0.5">
                    Završno stanje
                  </div>
                  <div className="text-[16px] font-medium tabular-nums text-text-primary">
                    {formatBAM(Number(statement.closingBalance))}
                  </div>
                </div>
              )}
            </div>

            {parseWarnings(statement.warnings).length > 0 && (
              <div className="mt-4 rounded-lg bg-warning-bg text-warning text-[12.5px] leading-5 px-3 py-2">
                {parseWarnings(statement.warnings).map((w) => (
                  <div key={w}>Napomena: {w}</div>
                ))}
              </div>
            )}
          </div>

          {/* Stavke */}
          <div className="rounded-xl bg-cream-100 border border-cream-300">
            <div className="pt-4 px-4 pb-3">
              <h2 className="font-serif-display text-[19px] leading-tight text-text-primary">
                Stavke ({transactions.length})
              </h2>
              <p className="text-[13px] italic text-text-tertiary mt-0.5">
                Klik na stavku otvara detalje. Potvrđene stavke idu u knjiženje.
              </p>
            </div>
            <ul>
              {transactions.map((t, i) => {
                const isIn = t.direction === "IN";
                const isReview = t.status === "UNMATCHED";
                return (
                  <li
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={[
                      "grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[40px_minmax(0,1fr)_auto_120px] items-center gap-x-3 gap-y-2 px-4 py-[14px] min-h-[64px] cursor-pointer hover:bg-[rgba(15,26,18,0.025)] transition-colors",
                      i < transactions.length - 1
                        ? "border-b border-cream-300/70"
                        : "",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        isIn
                          ? "bg-brand-100 text-brand-600"
                          : "bg-cream-200 text-text-secondary",
                      ].join(" ")}
                    >
                      {isIn ? (
                        <IconArrowDownLeft size={17} />
                      ) : (
                        <IconArrowUpRight size={17} />
                      )}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-medium text-text-primary truncate">
                          {txTitle(t)}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="text-[11.5px] mt-0.5 truncate">
                        <span
                          className={
                            t.category
                              ? "text-brand-700 font-medium"
                              : "text-accent-500 italic"
                          }
                        >
                          {categoryDisplayLabel(t.category) ?? "bez kategorije"}
                        </span>
                        <span className="text-text-tertiary">
                          {[
                            "",
                            t.date ? formatDate(t.date) : null,
                            t.counterpartyName ? t.description : null,
                          ]
                            .filter((p) => p !== null)
                            .join(" · ")}
                        </span>
                      </div>
                    </div>

                    <div className="col-start-2 flex items-center justify-between gap-3 sm:contents">
                      <span
                        className={[
                          "text-[13.5px] font-semibold tabular-nums whitespace-nowrap sm:justify-self-end",
                          isIn ? "text-brand-600" : "text-text-primary",
                        ].join(" ")}
                      >
                        {isIn ? "+" : "−"}
                        {formatBAM(Number(t.amount))}
                      </span>
                      <div className="flex items-center justify-end sm:w-full">
                        {isReview && (
                          <button
                            type="button"
                            disabled={updateTx.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTx.mutate({
                                txId: t.id,
                                patch: { status: "CONFIRMED" },
                              });
                            }}
                            className="px-3 py-[5px] rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                          >
                            Potvrdi
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      <TransactionModal
        orgId={orgId}
        tx={selectedFresh}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
