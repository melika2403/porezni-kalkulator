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
  getOtherIncome,
  createOtherIncome,
  updateOtherIncome,
  deleteOtherIncome,
  getSummary,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type PaymentsResponse,
  type FinancePaymentRow,
  type FinanceClient,
  type ClientPaymentCell,
  type ExpenseCategory,
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

function formatKM(n: number | string) {
  // de-DE format: tačka = hiljade, zarez = feninzi (npr. 1.234,56). "bs-BA"
  // ICU nije pouzdan u svim okruženjima i znao je dati tačku za decimale.
  // VAŽNO: API vraća DECIMAL kao string ("20.58") — Number() prije formatiranja,
  // inače String.toLocaleString vrati string nepromijenjen (tačka ostane).
  const num = typeof n === "number" ? n : Number(n);
  return `${(Number.isFinite(num) ? num : 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} KM`;
}

function clientName(row: FinancePaymentRow) {
  const { firstName, lastName } = row.user;
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "–";
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
  if (!iso) return "–";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "–";
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

  // Normalizovan oblik {items,total} — ISTI kao u LedgerColumn da nema kolizije
  // React Query keša (isti queryKey mora imati isti oblik podataka).
  const expensesQuery = useQuery({
    queryKey: ["finance-expenses", year],
    queryFn: async () => {
      const r = await unwrap(getExpenses(year));
      return { items: r.items ?? [], total: r.summary?.totalInvested ?? 0 };
    },
  });

  const otherIncomeQuery = useQuery({
    queryKey: ["finance-other-income", year],
    queryFn: async () => {
      const r = await unwrap(getOtherIncome(year));
      return { items: r.items ?? [], total: r.summary?.totalIncome ?? 0 };
    },
  });

  // Kumulativni profit (zbir profita svih godina do izabrane). Zarađeno i
  // uloženo ostaju po godini, samo se profit prenosi naprijed.
  const summaryQuery = useQuery({
    queryKey: ["finance-summary", year],
    queryFn: () => unwrap(getSummary(year)),
  });

  const data = paymentsQuery.data;
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / LIMIT)),
    [total],
  );

  // "Ukupno zarađeno" = pretplate korisnika + gotovinski (ostali) prihodi.
  const subscriptionsEarned = data?.summary?.totalEarned ?? 0;
  const totalOtherIncome = otherIncomeQuery.data?.total ?? 0;
  const totalEarned =
    Math.round((subscriptionsEarned + totalOtherIncome) * 100) / 100;
  const totalInvested = expensesQuery.data?.total ?? 0;
  const profit = Math.round((totalEarned - totalInvested) * 100) / 100;
  // Profit koji se prikazuje je kumulativan (prenosi se iz prethodnih godina).
  // Dok summary stigne, fallback je profit tekuće godine.
  const cumulativeProfit = summaryQuery.data?.cumulativeProfit ?? profit;

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
            label="Profit (kumulativno)"
            value={formatKM(cumulativeProfit)}
            variant={cumulativeProfit >= 0 ? "profit" : "loss"}
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

        {/* Troškovi (lijevo) i ostali prihodi (desno) + zbir/razlika */}
        <LedgerSection
          year={year}
          subscriptionsEarned={subscriptionsEarned}
          cumulativeProfit={cumulativeProfit}
        />
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
        <div className={styles.clientEmail}>{row.user.email || "–"}</div>
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
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
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
        <span className={styles.cellEmpty}>–</span>
      )}
    </td>
  );
}

// ─── Ledger (troškovi lijevo | ostali prihodi desno) ──────────────────────────

type LedgerItem = {
  id: number;
  date: string;
  amount: number;
  description: string;
  category?: ExpenseCategory;
};

type LedgerPayload = {
  date: string;
  amount: number;
  description: string;
  category?: ExpenseCategory;
};

type LedgerCfg = {
  key: string;
  title: (year: number) => string;
  placeholder: string;
  totalLabel: string;
  emptyText: (year: number) => string;
  accent: "expense" | "income";
  /** Da li ledger ima kategoriju (samo troškovi — koristi se za CAC). */
  hasCategory?: boolean;
  fetch: (year: number) => Promise<{ items: LedgerItem[]; total: number }>;
  create: (p: LedgerPayload) => Promise<unknown>;
  update: (id: number, p: Partial<LedgerPayload>) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
};

const EXPENSE_CFG: LedgerCfg = {
  key: "finance-expenses",
  title: (y) => `Troškovi / ulaganja (${y})`,
  placeholder: "npr. Facebook oglasi",
  totalLabel: "Ukupno uloženo",
  emptyText: (y) => `Nema unesenih troškova za ${y}.`,
  accent: "expense",
  hasCategory: true,
  fetch: async (y) => {
    const r = await unwrap(getExpenses(y));
    return { items: r.items ?? [], total: r.summary?.totalInvested ?? 0 };
  },
  create: (p) => createExpense(p),
  update: (id, p) => updateExpense(id, p),
  remove: (id) => deleteExpense(id),
};

const INCOME_CFG: LedgerCfg = {
  key: "finance-other-income",
  title: (y) => `Ostali prihodi, gotovina (${y})`,
  placeholder: "npr. Gotovinska naplata usluge",
  totalLabel: "Ukupno prihoda",
  emptyText: (y) => `Nema unesenih prihoda za ${y}.`,
  accent: "income",
  fetch: async (y) => {
    const r = await unwrap(getOtherIncome(y));
    return { items: r.items ?? [], total: r.summary?.totalIncome ?? 0 };
  },
  create: (p) => createOtherIncome(p),
  update: (id, p) => updateOtherIncome(id, p),
  remove: (id) => deleteOtherIncome(id),
};

function LedgerSection({
  year,
  subscriptionsEarned,
  cumulativeProfit,
}: {
  year: number;
  subscriptionsEarned: number;
  cumulativeProfit: number;
}) {
  const expQ = useQuery({
    queryKey: [EXPENSE_CFG.key, year],
    queryFn: () => EXPENSE_CFG.fetch(year),
  });
  const incQ = useQuery({
    queryKey: [INCOME_CFG.key, year],
    queryFn: () => INCOME_CFG.fetch(year),
  });
  const totalInvested = expQ.data?.total ?? 0;
  const totalCashIncome = incQ.data?.total ?? 0;
  // Ukupni prihodi = naplaćene pretplate (gore označene) + gotovinski prihodi.
  const totalIncome =
    Math.round((subscriptionsEarned + totalCashIncome) * 100) / 100;

  return (
    <section className={styles.ledgerSection}>
      <div className={styles.ledgerGrid}>
        <LedgerColumn year={year} cfg={EXPENSE_CFG} />
        <LedgerColumn year={year} cfg={INCOME_CFG} />
      </div>

      <div className={styles.ledgerBottom}>
        <div className={styles.ledgerBottomItem}>
          <span>Ukupno troškovi</span>
          <strong>{formatKM(totalInvested)}</strong>
        </div>
        <div className={styles.ledgerBottomItem}>
          <span>Ukupno prihodi (pretplate + gotovina)</span>
          <strong>{formatKM(totalIncome)}</strong>
        </div>
        <div className={styles.ledgerBottomItem}>
          <span>Profit (kumulativno)</span>
          <strong
            className={cumulativeProfit >= 0 ? styles.posValue : styles.negValue}
          >
            {formatKM(cumulativeProfit)}
          </strong>
        </div>
      </div>
    </section>
  );
}

function LedgerColumn({ year, cfg }: { year: number; cfg: LedgerCfg }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [cfg.key, year],
    queryFn: () => cfg.fetch(year),
  });

  const [date, setDate] = useState(todayInputDate());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("OSTALO");
  const [formError, setFormError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () =>
      unwrap(
        cfg.create({
          date,
          description: description.trim(),
          amount: Number(amount.replace(",", ".")) || 0,
          ...(cfg.hasCategory ? { category } : {}),
        }) as ReturnType<typeof createExpense>,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [cfg.key] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      setDescription("");
      setAmount("");
      setCategory("OSTALO");
      setDate(todayInputDate());
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return setFormError("Unesite opis.");
    const amt = Number(amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0)
      return setFormError("Unesite ispravan iznos.");
    add.mutate();
  };

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <div className={`${styles.ledgerCol} ${styles[`ledger_${cfg.accent}`]}`}>
      <h2 className={styles.sectionTitle}>{cfg.title(year)}</h2>

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
            placeholder={cfg.placeholder}
            autoComplete="off"
          />
        </div>
        {cfg.hasCategory && (
          <div className={styles.expenseField}>
            <label className={styles.fieldLabel}>Kategorija</label>
            <select
              className={styles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        )}
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
        <div className={styles.empty}>{cfg.emptyText(year)}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Opis</th>
                {cfg.hasCategory && <th className={styles.catCol}>Kategorija</th>}
                <th className={styles.totalCol}>Iznos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <LedgerRow key={it.id} item={it} cfg={cfg} />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={cfg.hasCategory ? 3 : 2} className={styles.tfootLabel}>
                  {cfg.totalLabel}
                </td>
                <td className={styles.totalCol}>
                  <strong>{formatKM(total)}</strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function LedgerRow({ item, cfg }: { item: LedgerItem; cfg: LedgerCfg }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [date, setDate] = useState(item.date.slice(0, 10));
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(String(item.amount));
  const [category, setCategory] = useState<ExpenseCategory>(
    item.category ?? "OSTALO",
  );

  const save = useMutation({
    mutationFn: () =>
      unwrap(
        cfg.update(item.id, {
          date,
          description: description.trim(),
          amount: Number(amount.replace(",", ".")) || 0,
          ...(cfg.hasCategory ? { category } : {}),
        }) as ReturnType<typeof updateExpense>,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [cfg.key] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      setEditing(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => unwrap(cfg.remove(item.id) as ReturnType<typeof deleteExpense>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [cfg.key] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
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
        {cfg.hasCategory && (
          <td>
            <select
              className={styles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </td>
        )}
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
      <td>{formatDate(item.date)}</td>
      <td>{item.description}</td>
      {cfg.hasCategory && (
        <td className={styles.catCol}>
          <span className={styles.catBadge}>
            {EXPENSE_CATEGORY_LABELS[item.category ?? "OSTALO"]}
          </span>
        </td>
      )}
      <td className={styles.totalCol}>{formatKM(item.amount)}</td>
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
