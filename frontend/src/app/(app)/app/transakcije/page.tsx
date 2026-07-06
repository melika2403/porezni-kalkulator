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
import { parseDateInput } from "src/lib/dateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
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

const PAGE_SIZE = 20;

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
  const [page, setPage] = useState(1);
  const [selected, setSelected] =
    useState<BankTransactionWithStatement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // novi filter resetuje paginaciju (reset tokom rendera, bez effecta)
  const filtersKey = JSON.stringify([
    debouncedSearch, direction, status, category, fromStr, toStr,
  ]);
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    setPage(1);
  }

  const query: TxSearchQuery = {
    q: debouncedSearch || undefined,
    direction: (direction || undefined) as TxSearchQuery["direction"],
    status: (status || undefined) as TxSearchQuery["status"],
    category: category || undefined,
    dateFrom: parseDateInput(fromStr) ?? undefined,
    dateTo: parseDateInput(toStr) ?? undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
  const { data, isLoading, isFetching } = useSearchBankTransactions(
    orgId,
    query,
  );
  const updateTx = useUpdateBankTransaction(orgId);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Rezultat se smanjio ispod trenutne stranice (npr. potvrda stavki pod
  // filterom) → vrati na zadnju postojeću, da ne ostanemo na praznoj.
  if (!isFetching && page > totalPages) {
    setPage(totalPages);
  }
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = total === 0 ? 0 : from + items.length - 1;
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
              placeholder="Traži: opis, protivstrana, referenca, iznos..."
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <PkSelect
            ariaLabel="Smjer"
            value={direction}
            onChange={(v) => setDirection(String(v ?? ""))}
            options={[
              { value: "", label: "Svi smjerovi" },
              { value: "IN", label: "Potražuje (uplate)" },
              { value: "OUT", label: "Duguje (isplate)" },
            ]}
          />
          <PkSelect
            ariaLabel="Status"
            value={status}
            onChange={(v) => setStatus(String(v ?? ""))}
            options={[
              { value: "", label: "Svi statusi" },
              { value: "UNMATCHED", label: "Za pregled" },
              { value: "CONFIRMED", label: "Potvrđeno" },
              { value: "IGNORED", label: "Zanemareno" },
            ]}
          />
          <PkSelect
            ariaLabel="Kategorija"
            value={category}
            onChange={(v) => setCategory(String(v ?? ""))}
            options={[
              { value: "", label: "Sve kategorije" },
              { value: "__none", label: "Bez kategorije" },
              ...BANK_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
            ]}
            wrapStyle={{ maxWidth: 230 }}
          />
          <PkDateInput
            value={fromStr}
            onChange={setFromStr}
            placeholder="DD.MM.GGGG."
            ariaLabel="Datum od"
            className="w-[150px]"
          />
          <PkDateInput
            value={toStr}
            onChange={setToStr}
            placeholder="DD.MM.GGGG."
            ariaLabel="Datum do"
            className="w-[150px]"
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
            {total === 0 ? "0 rezultata" : `${from}–${to} od ${total}`}
          </span>
        </div>

        {isLoading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            Učitavanje...
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
              Promijenite pretragu ili učitajte izvode.
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
                            ? `${t.statement.bankName ?? "Banka"} · Izvod ${t.statement.statementNumber ?? "?"}`
                            : null,
                          categoryDisplayLabel(t.category),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
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
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-cream-300/70 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-[5px] rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Prethodna
                </button>
                <span className="text-[12.5px] text-text-tertiary">
                  Stranica {page} od {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-[5px] rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Sljedeća
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
