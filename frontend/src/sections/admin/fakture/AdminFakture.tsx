"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import {
  getAdminInvoices,
  openInvoicePdf,
  deleteInvoiceAdmin,
  type AdminInvoicesResponse,
  type AdminInvoiceItem,
} from "src/api/adminInvoices";
import styles from "./fakture.module.css";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nacrt",
  ISSUED: "Izdana",
  PAID: "Plaćena",
  CANCELLED: "Otkazana",
};
const STATUS_CLASS: Record<string, string> = {
  DRAFT: "stDraft",
  ISSUED: "stIssued",
  PAID: "stPaid",
  CANCELLED: "stCancelled",
};

function fmtKM(n: number, currency: string) {
  return `${n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency === "EUR" ? "EUR" : "KM"}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}.${m}.${y}`;
}

function yearOptions() {
  const now = new Date().getFullYear();
  const out: number[] = [];
  for (let y = now + 1; y >= 2024; y--) out.push(y);
  return out;
}

export default function AdminFakture() {
  const LIMIT = 20;
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"" | "INVOICE" | "PROFORMA">("");
  const [status, setStatus] = useState<
    "" | "DRAFT" | "ISSUED" | "PAID" | "CANCELLED"
  >("");
  const [year, setYear] = useState<number | "">("");
  const [page, setPage] = useState(1);

  const query = useQuery<AdminInvoicesResponse>({
    queryKey: ["admin-invoices", search, type, status, year, page],
    queryFn: async () => {
      const r = await getAdminInvoices({
        q: search || undefined,
        type: type || undefined,
        status: status || undefined,
        year: year || undefined,
        page,
        limit: LIMIT,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  };

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Korisničke fakture</h1>
            <div className={styles.meta}>
              Sve fakture i predračuni koje su korisnici izdali svojim klijentima.
            </div>
          </div>
        </div>

        {/* Zbirni iznosi po valuti */}
        {(data?.totalsByCurrency?.length ?? 0) > 0 && (
          <div className={styles.cards}>
            {data!.totalsByCurrency.map((t) => (
              <div key={t.currency} className={styles.card}>
                <span className={styles.cardLabel}>
                  Ukupno ({t.currency}) · {t.count}
                </span>
                <span className={styles.cardValue}>
                  {fmtKM(t.gross, t.currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Filteri */}
        <div className={styles.filters}>
          <select
            className={styles.select}
            value={type}
            onChange={(e) => {
              setType(e.target.value as typeof type);
              setPage(1);
            }}
          >
            <option value="">Sve vrste</option>
            <option value="INVOICE">Fakture</option>
            <option value="PROFORMA">Predračuni</option>
          </select>
          <select
            className={styles.select}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
          >
            <option value="">Svi statusi</option>
            <option value="ISSUED">Izdana</option>
            <option value="PAID">Plaćena</option>
            <option value="CANCELLED">Otkazana</option>
            <option value="DRAFT">Nacrt</option>
          </select>
          <select
            className={styles.select}
            value={year}
            onChange={(e) => {
              setYear(e.target.value ? Number(e.target.value) : "");
              setPage(1);
            }}
          >
            <option value="">Sve godine</option>
            {yearOptions().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <form className={styles.searchBar} onSubmit={applySearch}>
            <input
              className={styles.input}
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Pretraži broj, kupca, izdavaoca…"
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
        </div>

        {/* Tabela */}
        {query.isLoading ? (
          <div className={styles.empty}>Učitavanje…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>Nema faktura.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Broj</th>
                  <th>Vrsta</th>
                  <th>Izdao (korisnik)</th>
                  <th>Kupac</th>
                  <th>Datum</th>
                  <th>Status</th>
                  <th className={styles.amtCol}>Iznos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => (
                  <InvoiceRow key={inv.id} inv={inv} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* paginacija */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.btnGhost}
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || query.isFetching}
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
              disabled={page >= totalPages || query.isFetching}
            >
              Sljedeća →
            </button>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

function InvoiceRow({ inv }: { inv: AdminInvoiceItem }) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const view = useMutation({
    mutationFn: () => openInvoicePdf(inv.id),
    onError: (e: Error) => setError(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const r = await deleteInvoiceAdmin(inv.id);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <tr>
      <td className={styles.numCell}>{inv.fullNumber}</td>
      <td>{inv.type === "PROFORMA" ? "Predračun" : "Faktura"}</td>
      <td>
        {inv.creator ? (
          <>
            <div className={styles.creatorName}>{inv.creator.name}</div>
            <div className={styles.creatorSub}>
              {inv.organization?.name || inv.creator.email || "—"}
            </div>
          </>
        ) : (
          <span className={styles.creatorSub}>{inv.sellerName}</span>
        )}
      </td>
      <td>{inv.buyerName}</td>
      <td className={styles.dateCell}>{fmtDate(inv.issueDate)}</td>
      <td>
        <span
          className={`${styles.statusBadge} ${
            styles[STATUS_CLASS[inv.status] as keyof typeof styles] ?? ""
          }`}
        >
          {STATUS_LABELS[inv.status] ?? inv.status}
        </span>
      </td>
      <td className={styles.amtCol}>{fmtKM(inv.grossTotal, inv.currency)}</td>
      <td className={styles.actionCol}>
        {confirmDelete ? (
          <span className={styles.confirmRow}>
            <button
              className={styles.btnDanger}
              type="button"
              onClick={() => del.mutate()}
              disabled={del.isPending}
            >
              {del.isPending ? "Brišem…" : "Potvrdi"}
            </button>
            <button
              className={styles.btnGhostSm}
              type="button"
              onClick={() => setConfirmDelete(false)}
            >
              Odustani
            </button>
          </span>
        ) : (
          <span className={styles.confirmRow}>
            <button
              className={styles.btnGhostSm}
              type="button"
              onClick={() => view.mutate()}
              disabled={view.isPending}
              title="Otvori PDF"
            >
              {view.isPending ? "…" : "Pregledaj"}
            </button>
            <button
              className={styles.btnDangerGhost}
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="Obriši fakturu (trajno)"
            >
              Obriši
            </button>
          </span>
        )}
        {error && <div className={styles.errorMsg}>{error}</div>}
      </td>
    </tr>
  );
}
