"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuCheck, LuX, LuPencil, LuTrash2, LuPlus } from "react-icons/lu";
import styles from "./finansije.module.css";
import { unwrap } from "src/api/auth";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import DateInput from "src/components/DateInput/DateInput";
import {
  getPayments,
  upsertPayment,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type PaymentsResponse,
  type FinancePaymentRow,
  type FinanceClient,
  type ClientPaymentCell,
  type ExpensesResponse,
  type CompanyExpense,
} from "src/api/finance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Avg",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];

function formatKM(n: number) {
  return `${n.toLocaleString("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} KM`;
}

function clientName(row: FinancePaymentRow) {
  const { firstName, lastName } = row.user;
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "—";
}

const PAKET_LABELS: Record<FinanceClient["role"], string> = {
  USER: "Korisnik",
  PRO: "Pro",
  BUSINESS: "Business",
  ADMIN: "Admin",
};

const PAKET_CLASS: Record<FinanceClient["role"], string> = {
  USER: "paketUser",
  PRO: "paketPro",
  BUSINESS: "paketBusiness",
  ADMIN: "paketAdmin",
};

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}.${m}.${y}`;
}

// Lista godina za izbor (od 2024 do tekuće +1)
function yearOptions() {
  const now = new Date().getFullYear();
  const start = 2024;
  const end = now + 1;
  const out: number[] = [];
  for (let y = end; y >= start; y--) out.push(y);
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminFinansije() {
  const LIMIT = 20;
  const [year, setYear] = useState(new Date().getFullYear());
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const paymentsQuery = useQuery<PaymentsResponse>({
    queryKey: ["finance-payments", year, search, page],
    queryFn: () =>
      unwrap(getPayments({ year, search: search || undefined, page, limit: LIMIT })),
    placeholderData: (prev) => prev,
  });

  const expensesQuery = useQuery<ExpensesResponse>({
    queryKey: ["finance-expenses", year],
    queryFn: () => unwrap(getExpenses(year)),
  });

  const data = paymentsQuery.data;
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / LIMIT)),
    [total],
  );

  const totalEarned = data?.summary.totalEarned ?? 0;
  const totalInvested = expensesQuery.data?.summary.totalInvested ?? 0;
  const profit = Math.round((totalEarned - totalInvested) * 100) / 100;

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  };

  const canPrev = page > 1 && !paymentsQuery.isFetching;
  const canNext = page < totalPages && !paymentsQuery.isFetching;

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Finansije</h1>
            <div className={styles.meta}>
              <span>
                Klijenata: <strong>{total}</strong>
              </span>
              {paymentsQuery.isFetching && <span>Učitavanje…</span>}
            </div>
          </div>

          <div className={styles.yearPicker}>
            <label className={styles.fieldLabel}>Godina</label>
            <select
              className={styles.select}
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setPage(1);
              }}
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zbirne kartice */}
        <div className={styles.summaryCards}>
          <SummaryCard
            label="Ukupno zarađeno"
            value={formatKM(totalEarned)}
            variant="earn"
          />
          <SummaryCard
            label="Ukupno uloženo"
            value={formatKM(totalInvested)}
            variant="spend"
          />
          <SummaryCard
            label="Profit"
            value={formatKM(profit)}
            variant={profit >= 0 ? "profit" : "loss"}
          />
        </div>

        {/* Pretraga klijenata */}
        <form className={styles.searchBar} onSubmit={applySearch}>
          <input
            className={styles.input}
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Pretraži klijenta (ime, prezime, email)…"
            autoComplete="off"
          />
          <button className={styles.btnPrimary} type="submit">
            Pretraži
          </button>
          {search && (
            <button
              className={styles.btnGhost}
              type="button"
              onClick={() => {
                setDraftSearch("");
                setSearch("");
                setPage(1);
              }}
            >
              Reset
            </button>
          )}
        </form>

        {/* Tabela uplata po mjesecima */}
        {paymentsQuery.isLoading ? (
          <div className={styles.empty}>Učitavanje…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>Nema klijenata.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.stickyCol}>Klijent</th>
                    {MONTHS.map((m, i) => (
                      <th key={m} className={styles.monthCol} title={`Mjesec ${i + 1}`}>
                        {m}
                      </th>
                    ))}
                    <th className={styles.totalCol}>Ukupno</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <ClientRow key={row.user.id} row={row} year={year} />
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.btnGhost}
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!canPrev}
                >
                  ← Prethodna
                </button>
                <span className={styles.pageInfo}>
                  Stranica {page} od {totalPages}
                </span>
                <button
                  className={styles.btnGhost}
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canNext}
                >
                  Sljedeća →
                </button>
              </div>
            )}
          </>
        )}

        {/* Troškovi / ulaganja */}
        <ExpensesSection year={year} />
      </div>
    </RoleGuard>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "earn" | "spend" | "profit" | "loss";
}) {
  return (
    <div className={`${styles.summaryCard} ${styles[variant]}`}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  );
}

// ─── Client row (12 month cells) ──────────────────────────────────────────────

function ClientRow({ row, year }: { row: FinancePaymentRow; year: number }) {
  // Pronađi godišnji unos (ako postoji) — taj klijent se vodi kao plaćen za godinu.
  const annualEntry = useMemo(() => {
    for (let m = 1; m <= 12; m++) {
      const cell = row.months[String(m)];
      if (cell?.isAnnual) return { month: m, cell };
    }
    return null;
  }, [row.months]);

  return (
    <tr>
      <td className={styles.stickyCol}>
        <div className={styles.clientName}>{clientName(row)}</div>
        <div className={styles.clientEmail}>{row.user.email || "—"}</div>
        <div className={styles.clientSub}>
          <span
            className={`${styles.paketBadge} ${
              styles[PAKET_CLASS[row.user.role] as keyof typeof styles] ?? ""
            }`}
          >
            {PAKET_LABELS[row.user.role] ?? row.user.role}
          </span>
          {!row.user.subscriptionActive && (
            <span className={styles.paketInactive}>neaktivna</span>
          )}
        </div>
        {(row.user.subscriptionStart || row.user.subscriptionEnd) && (
          <div className={styles.subPeriod}>
            {formatDate(row.user.subscriptionStart)} –{" "}
            {formatDate(row.user.subscriptionEnd)}
          </div>
        )}
        {annualEntry && (
          <span className={styles.annualBadge}>Godišnje plaćeno</span>
        )}
      </td>
      {MONTHS.map((_, i) => {
        const month = i + 1;
        const cell = row.months[String(month)];
        return (
          <MonthCell
            key={month}
            userId={row.user.id}
            year={year}
            month={month}
            cell={cell}
            annualActive={!!annualEntry && annualEntry.month !== month}
          />
        );
      })}
      <td className={styles.totalCol}>
        <strong>{formatKM(row.yearTotal)}</strong>
      </td>
    </tr>
  );
}

// ─── Month cell (inline edit) ─────────────────────────────────────────────────

function MonthCell({
  userId,
  year,
  month,
  cell,
  annualActive,
}: {
  userId: number;
  year: number;
  month: number;
  cell: ClientPaymentCell | undefined;
  /** Klijent ima godišnji unos na drugom mjesecu → ovaj mjesec se vodi kao plaćen. */
  annualActive: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(cell ? String(cell.amount) : "");
  const [isAnnual, setIsAnnual] = useState(cell?.isAnnual ?? false);

  const save = useMutation({
    mutationFn: () =>
      unwrap(
        upsertPayment({
          userId,
          year,
          month,
          amount: Number(amount.replace(",", ".")) || 0,
          isAnnual,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-payments"] });
      setEditing(false);
    },
  });

  const begin = () => {
    setAmount(cell ? String(cell.amount) : "");
    setIsAnnual(cell?.isAnnual ?? false);
    setEditing(true);
  };

  if (editing) {
    return (
      <td className={styles.monthCellEditing}>
        <input
          className={styles.cellInput}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          inputMode="decimal"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save.mutate();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <label className={styles.cellAnnual} title="Plaćeno za cijelu godinu">
          <input
            type="checkbox"
            checked={isAnnual}
            onChange={(e) => setIsAnnual(e.target.checked)}
          />
          god.
        </label>
        <div className={styles.cellActions}>
          <button
            className={styles.btnIcon}
            title="Sačuvaj"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            <LuCheck />
          </button>
          <button
            className={styles.btnIcon}
            title="Otkaži"
            onClick={() => setEditing(false)}
          >
            <LuX />
          </button>
        </div>
      </td>
    );
  }

  return (
    <td
      className={`${styles.monthCell} ${cell ? styles.hasValue : ""} ${
        annualActive ? styles.annualCell : ""
      }`}
      onClick={begin}
      title="Klikni za unos"
    >
      {cell ? (
        <span className={styles.cellValue}>
          {formatKM(cell.amount)}
          {cell.isAnnual && <span className={styles.cellTag}>god.</span>}
        </span>
      ) : annualActive ? (
        <span className={styles.cellPaid}>✓</span>
      ) : (
        <span className={styles.cellEmpty}>—</span>
      )}
    </td>
  );
}

// ─── Expenses section ─────────────────────────────────────────────────────────

function ExpensesSection({ year }: { year: number }) {
  const queryClient = useQueryClient();
  const query = useQuery<ExpensesResponse>({
    queryKey: ["finance-expenses", year],
    queryFn: () => unwrap(getExpenses(year)),
  });

  const [date, setDate] = useState(todayInputDate());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () =>
      unwrap(
        createExpense({
          date,
          description: description.trim(),
          amount: Number(amount.replace(",", ".")) || 0,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-expenses"] });
      setDescription("");
      setAmount("");
      setDate(todayInputDate());
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return setFormError("Unesite opis troška.");
    const amt = Number(amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0)
      return setFormError("Unesite ispravan iznos.");
    add.mutate();
  };

  const items = query.data?.items ?? [];
  const totalInvested = query.data?.summary.totalInvested ?? 0;

  return (
    <section className={styles.expensesSection}>
      <h2 className={styles.sectionTitle}>Troškovi / ulaganja ({year})</h2>

      <form className={styles.expenseForm} onSubmit={submit}>
        <div className={styles.expenseField}>
          <label className={styles.fieldLabel}>Datum</label>
          <DateInput value={date} onValueChange={setDate} className={styles.input} />
        </div>
        <div className={`${styles.expenseField} ${styles.expenseFieldGrow}`}>
          <label className={styles.fieldLabel}>Opis</label>
          <input
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="npr. Facebook oglasi"
            autoComplete="off"
          />
        </div>
        <div className={styles.expenseField}>
          <label className={styles.fieldLabel}>Iznos (KM)</label>
          <input
            className={styles.input}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
        </div>
        <button className={styles.btnPrimary} type="submit" disabled={add.isPending}>
          <LuPlus /> Dodaj
        </button>
      </form>
      {formError && <div className={styles.errorMsg}>{formError}</div>}

      {items.length === 0 ? (
        <div className={styles.empty}>Nema unesenih troškova za {year}.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Opis</th>
                <th className={styles.totalCol}>Iznos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((exp) => (
                <ExpenseRow key={exp.id} expense={exp} />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className={styles.tfootLabel}>
                  Ukupno uloženo
                </td>
                <td className={styles.totalCol}>
                  <strong>{formatKM(totalInvested)}</strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Expense row (inline edit / delete) ───────────────────────────────────────

function ExpenseRow({ expense }: { expense: CompanyExpense }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [date, setDate] = useState(expense.date.slice(0, 10));
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(String(expense.amount));

  const save = useMutation({
    mutationFn: () =>
      unwrap(
        updateExpense(expense.id, {
          date,
          description: description.trim(),
          amount: Number(amount.replace(",", ".")) || 0,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-expenses"] });
      setEditing(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => unwrap(deleteExpense(expense.id)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["finance-expenses"] }),
  });

  if (editing) {
    return (
      <tr>
        <td>
          <DateInput value={date} onValueChange={setDate} className={styles.input} />
        </td>
        <td>
          <input
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </td>
        <td className={styles.totalCol}>
          <input
            className={styles.cellInput}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </td>
        <td>
          <span className={styles.rowActions}>
            <button
              className={styles.btnIcon}
              title="Sačuvaj"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              <LuCheck />
            </button>
            <button
              className={styles.btnIcon}
              title="Otkaži"
              onClick={() => setEditing(false)}
            >
              <LuX />
            </button>
          </span>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{formatDate(expense.date)}</td>
      <td>{expense.description}</td>
      <td className={styles.totalCol}>{formatKM(expense.amount)}</td>
      <td>
        <span className={styles.rowActions}>
          {confirmDelete ? (
            <>
              <button
                className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                title="Potvrdi brisanje"
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
              >
                <LuCheck />
              </button>
              <button
                className={styles.btnIcon}
                title="Odustani"
                onClick={() => setConfirmDelete(false)}
              >
                <LuX />
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.btnIcon}
                title="Uredi"
                onClick={() => setEditing(true)}
              >
                <LuPencil />
              </button>
              <button
                className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                title="Obriši"
                onClick={() => setConfirmDelete(true)}
              >
                <LuTrash2 />
              </button>
            </>
          )}
        </span>
      </td>
    </tr>
  );
}
