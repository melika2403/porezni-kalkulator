"use client";

import { useEffect, useState } from "react";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconSearch,
  IconInbox,
  IconLoader2,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useSearchBankTransactions,
  useUpdateBankTransaction,
} from "src/hooks/useBankStatements";
import {
  TransactionModal,
  txTitle,
  StatusBadge,
} from "src/sections/bankovni-izvodi/TransactionModal";
import { BANK_CATEGORIES, categoryDisplayLabel } from "src/lib/bankCategories";
import type {
  BankTransactionWithStatement,
  TxSearchQuery,
} from "src/api/bankStatements";

const PAGE_SIZE = 50;

/** "10.06.2026." ili "10.06.2026" â†’ "2026-06-10" ili null */
function parseDateInput(s: string): string | null {
  const m = String(s || "")
    .trim()
    .match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function TransakcijePage() {
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [direction, setDirection] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [fromStr, setFromStr] = useState("");
  const [toStr, setToStr] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] =
    useState<BankTransactionWithStatement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // novi filter resetuje paginaciju
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [debouncedSearch, direction, status, category, fromStr, toStr]);

  const query: TxSearchQuery = {
    q: debouncedSearch || undefined,
    direction: (direction || undefined) as TxSearchQuery["direction"],
    status: (status || undefined) as TxSearchQuery["status"],
    category: category || undefined,
    dateFrom: parseDateInput(fromStr) ?? undefined,
    dateTo: parseDateInput(toStr) ?? undefined,
    limit,
  };
  const { data, isLoading, isFetching } = useSearchBankTransactions(
    orgId,
    query,
  );
  const updateTx = useUpdateBankTransaction(orgId);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const selectedFresh = selected
    ? items.find((t) => t.id === selected.id) ?? selected
    : null;

  const inputCls =
    "rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600";

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="mb-5">
        <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
          <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
          Finansije
        </div>
        <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
          Transakcije.
        </h1>
        <p className="text-[13px] leading-6 text-text-tertiary max-w-[470px]">
          Sve stavke sa svih izvoda na jednom mjestu. Pretraga po opisu,
          protivstrani, referenci ili iznosu.
        </p>
      </div>

      {/* Filteri */}
      <div className="rounded-xl bg-cream-100 border border-cream-300 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <IconSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="TraÅ¾i: opis, protivstrana, referenca, iznos..."
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className={inputCls}
          >
            <option value="">Svi smjerovi</option>
            <option value="IN">PotraÅ¾uje (uplate)</option>
            <option value="OUT">Duguje (isplate)</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputCls}
          >
            <option value="">Svi statusi</option>
            <option value="UNMATCHED">Za pregled</option>
            <option value="CONFIRMED">PotvrÄ‘eno</option>
            <option value="IGNORED">Zanemareno</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${inputCls} max-w-[230px]`}
          >
            <option value="">Sve kategorije</option>
            <option value="__none">Bez kategorije</option>
            {BANK_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            value={fromStr}
            onChange={(e) => setFromStr(e.target.value)}
            placeholder="Od DD.MM.GGGG."
            inputMode="numeric"
            className={[
              inputCls,
              "w-[130px]",
              fromStr && !parseDateInput(fromStr) ? "border-warning" : "",
            ].join(" ")}
          />
          <input
            value={toStr}
            onChange={(e) => setToStr(e.target.value)}
            placeholder="Do DD.MM.GGGG."
            inputMode="numeric"
            className={[
              inputCls,
              "w-[130px]",
              toStr && !parseDateInput(toStr) ? "border-warning" : "",
            ].join(" ")}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl bg-cream-100 border border-cream-300">
        <div className="pt-4 px-4 pb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif-display text-[19px] leading-tight text-text-primary">
            Rezultati
          </h2>
          <span className="text-[12.5px] text-text-tertiary">
            {isFetching && !isLoading ? (
              <IconLoader2 size={14} className="inline animate-spin mr-1.5" />
            ) : null}
            prikazano {items.length} od {total}
          </span>
        </div>

        {isLoading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            UÄitavanje...
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <span className="w-12 h-12 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-3">
              <IconInbox size={22} />
            </span>
            <p className="text-[14px] font-medium text-text-primary">
              Nema transakcija za zadate filtere
            </p>
            <p className="text-[12.5px] text-text-tertiary mt-1">
              Promijenite pretragu ili uÄitajte izvode.
            </p>
          </div>
        ) : (
          <>
            <ul>
              {items.map((t, i) => {
                const isIn = t.direction === "IN";
                const isReview = t.status === "UNMATCHED";
                return (
                  <li
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={[
                      "grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[40px_minmax(0,1fr)_auto_120px] items-center gap-x-3 gap-y-2 px-4 py-[13px] min-h-[60px] cursor-pointer hover:bg-[rgba(15,26,18,0.025)] transition-colors",
                      i < items.length - 1 ? "border-b border-cream-300/70" : "",
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
                      <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">
                        {[
                          t.date ? formatDate(t.date) : null,
                          t.statement
                            ? `${t.statement.bankName ?? "Banka"} Â· Izvod ${t.statement.statementNumber ?? "?"}`
                            : null,
                          categoryDisplayLabel(t.category),
                        ]
                          .filter(Boolean)
                          .join(" Â· ")}
                      </div>
                    </div>

                    <div className="col-start-2 flex items-center justify-between gap-3 sm:contents">
                      <span
                        className={[
                          "text-[13.5px] font-semibold tabular-nums whitespace-nowrap sm:justify-self-end",
                          isIn ? "text-brand-600" : "text-text-primary",
                        ].join(" ")}
                      >
                        {isIn ? "+" : "âˆ’"}
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
            {items.length < total && (
              <div className="px-4 py-3 border-t border-cream-300/70 text-center">
                <button
                  type="button"
                  disabled={isFetching}
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  className="px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
                >
                  UÄitaj joÅ¡ ({total - items.length})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <TransactionModal
        orgId={orgId}
        tx={selectedFresh}
        onClose={() => setSelected(null)}
        showStatementLink
      />
    </div>
  );
}
