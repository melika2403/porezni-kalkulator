"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./adminPretplate.module.css";
import {
  listPredracuni,
  updatePredracunStatus,
  type PredracunListItem,
  type PredracunListResponse,
  type PredracunStatus,
} from "src/api/backend/predracun/predracun";
import { unwrap } from "src/api/auth";

const LIMIT = 20;

const STATUS_LABEL: Record<PredracunListItem["status"], string> = {
  ISSUED: "Izdat",
  PAID: "Plaćen",
  CANCELLED: "Otkazan",
};

const STATUS_CLASS: Record<PredracunListItem["status"], string> = {
  ISSUED: "statusIssued",
  PAID: "statusPaid",
  CANCELLED: "statusCancelled",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = String(iso).slice(0, 10).split("-");
  if (d.length !== 3) return "—";
  return `${d[2]}.${d[1]}.${d[0]}.`;
}

function fmt(n: number) {
  return Number(n)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function AdminPretplate() {
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState<"" | "PRO" | "BUSINESS">("");
  const [page, setPage] = useState(1);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } =
    useQuery<PredracunListResponse>({
      queryKey: ["admin-predracuni", q, plan, page],
      queryFn: () => unwrap(listPredracuni({ q, plan, page, limit: LIMIT })),
      placeholderData: (prev) => prev,
      retry: false,
    });

  // ── Promjena statusa predračuna ────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: PredracunStatus }) =>
      unwrap(updatePredracunStatus(id, status)),
    onSuccess: () => {
      // refresh tabele nakon uspješne promjene
      queryClient.invalidateQueries({ queryKey: ["admin-predracuni"] });
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const applyFilters = () => {
    setQ(draftQ.trim());
    setPage(1);
  };
  const clearFilters = () => {
    setDraftQ("");
    setQ("");
    setPlan("");
    setPage(1);
  };

  return (
    <>
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Predračuni</h1>
            <p className={styles.sub}>
              Pregled svih izdatih predračuna {total > 0 && `(${total})`}
            </p>
          </div>
        </div>

        {/* ── Filteri ───────────────────────────────────────────────── */}
        <div className={styles.filters}>
          <input
            type="text"
            className={styles.input}
            placeholder="Pretraži po broju, kupcu, e-mailu, ID-u..."
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
          />
          <select
            className={styles.select}
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value as "" | "PRO" | "BUSINESS");
              setPage(1);
            }}
          >
            <option value="">Svi planovi</option>
            <option value="PRO">Pro</option>
            <option value="BUSINESS">Business</option>
          </select>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={applyFilters}
          >
            Pretraži
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={clearFilters}
          >
            Resetuj
          </button>
        </div>

        {/* ── Tabela ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className={styles.loading}>Učitavanje…</div>
        ) : isError ? (
          <div className={styles.errorBox}>
            Greška pri učitavanju: {(error as Error)?.message}
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => refetch()}
            >
              Pokušaj ponovo
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>Nema predračuna za zadati filter.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Broj predračuna</th>
                  <th>Datum</th>
                  <th>Kupac</th>
                  <th>Korisnik</th>
                  <th>Plan</th>
                  <th className={styles.numCell}>Bruto</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className={styles.numberCell}>{it.fullNumber}</div>
                      <div className={styles.metaCell}>
                        {formatDate(it.issueDate)} → {formatDate(it.dueDate)}
                      </div>
                    </td>
                    <td>{formatDate(it.createdAt)}</td>
                    <td>
                      <div className={styles.buyerName}>{it.buyer.name}</div>
                      <div className={styles.metaCell}>
                        {it.buyer.email}
                        {it.buyer.city ? ` · ${it.buyer.city}` : ""}
                      </div>
                      {it.buyer.idNumber && (
                        <div className={styles.metaCell}>
                          ID: {it.buyer.idNumber}
                          {it.buyer.vatNumber
                            ? ` · PDV: ${it.buyer.vatNumber}`
                            : ""}
                        </div>
                      )}
                    </td>
                    <td>
                      {it.user ? (
                        <>
                          <div>
                            {it.user.firstName} {it.user.lastName}
                          </div>
                          <div className={styles.metaCell}>
                            {it.user.email}
                          </div>
                          <span
                            className={`${styles.roleBadge} ${
                              styles[`role${it.user.role}`] ?? ""
                            }`}
                          >
                            {it.user.role}
                          </span>
                        </>
                      ) : (
                        <span className={styles.metaCell}>—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`${styles.planBadge} ${
                          it.plan === "PRO"
                            ? styles.planPro
                            : styles.planBusiness
                        }`}
                      >
                        {it.plan}
                      </span>
                    </td>
                    <td className={styles.numCell}>
                      <strong>{fmt(it.grossAmount)} KM</strong>
                      <div className={styles.metaCell}>
                        bez PDV-a {fmt(it.netAmount)} KM
                      </div>
                    </td>
                    <td>
                      <select
                        className={`${styles.statusSelect} ${
                          styles[STATUS_CLASS[it.status]]
                        }`}
                        value={it.status}
                        disabled={
                          statusMutation.isPending &&
                          statusMutation.variables?.id === it.id
                        }
                        onChange={(e) => {
                          const next = e.target.value as PredracunStatus;
                          if (next === it.status) return;
                          statusMutation.mutate({ id: it.id, status: next });
                        }}
                      >
                        <option value="ISSUED">{STATUS_LABEL.ISSUED}</option>
                        <option value="PAID">{STATUS_LABEL.PAID}</option>
                        <option value="CANCELLED">
                          {STATUS_LABEL.CANCELLED}
                        </option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Paginacija ─────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.btnGhost}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prethodna
            </button>
            <span className={styles.pageInfo}>
              Stranica {page} od {totalPages}
            </span>
            <button
              type="button"
              className={styles.btnGhost}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sljedeća →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
