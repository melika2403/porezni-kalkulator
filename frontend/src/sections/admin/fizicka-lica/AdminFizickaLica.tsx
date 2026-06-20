"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  adminGetPersonClients,
  type AdminPersonClient,
  type AdminPersonClientsListResponse,
} from "src/api/profile";
import { deleteAdminPersonClient } from "src/api/adminEntities";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import styles from "../../admin/korisnici/korisnici.module.css";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "–";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "–";
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
}

export default function AdminFizickaLica() {
  const LIMIT = 20;
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery<AdminPersonClientsListResponse>({
    queryKey: ["admin-fizicka-lica", search, page],
    queryFn: () =>
      unwrap(adminGetPersonClients({ search: search || undefined, page, limit: LIMIT })),
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  const clients = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  };

  const resetSearch = () => {
    setDraftSearch("");
    setSearch("");
    setPage(1);
  };

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div className={styles.page}>
        <div className={styles.orgHeader}>
          <div>
            <h1 className={styles.orgTitle}>Fizička lica</h1>
            <div className={styles.orgMeta}>
              <span>
                Ukupno: <strong>{total}</strong>
              </span>
              {query.isFetching && <span>Učitavanje…</span>}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <form onSubmit={applySearch}>
            <div className={styles.inlineFields}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.fieldLabel}>Ime ili prezime</label>
                <input
                  className={styles.input}
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  placeholder="Pretraži po imenu ili prezimenu…"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button className={styles.btnPrimary} type="submit" disabled={query.isFetching}>
                Pretraži
              </button>
              <button className={styles.btnGhost} type="button" onClick={resetSearch} disabled={query.isFetching}>
                Reset
              </button>
            </div>
          </form>
        </div>

        {query.isLoading ? (
          <div className={styles.loading}>Učitavanje…</div>
        ) : clients.length === 0 ? (
          <div className={styles.empty}>Nema fizičkih lica.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ime i prezime</th>
                    <th>JMBG</th>
                    <th>E-mail</th>
                    <th>Telefon</th>
                    <th>Grad</th>
                    <th>Kreirao</th>
                    <th>Datum</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <ClientRow key={c.id} client={c} />
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.btnGhost}
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
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages || query.isFetching}
                >
                  Sljedeća →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </RoleGuard>
  );
}

function ClientRow({ client }: { client: AdminPersonClient }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullName =
    [client.firstName, client.lastName].filter(Boolean).join(" ") || "–";
  const creatorName = client.createdBy
    ? `${client.createdBy.firstName} ${client.createdBy.lastName}`
    : "–";
  const creatorEmail = client.createdBy?.email ?? null;

  const del = useMutation({
    mutationFn: async () => {
      const r = await deleteAdminPersonClient(client.id);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-fizicka-lica"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <tr>
      <td className={styles.workerName}>{fullName}</td>
      <td>
        {client.jmbg ? (
          <span className={styles.workerJmbg}>{client.jmbg}</span>
        ) : (
          ", "
        )}
      </td>
      <td>{client.email || "–"}</td>
      <td>{client.phone || "–"}</td>
      <td>{client.city || "–"}</td>
      <td>
        <span className={styles.workerName}>{creatorName}</span>
        {creatorEmail && (
          <div className={styles.workerJmbg}>{creatorEmail}</div>
        )}
      </td>
      <td className={styles.dateRange}>{formatDate(client.createdAt)}</td>
      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
        {confirm ? (
          <span style={{ display: "inline-flex", gap: "0.4rem" }}>
            <button
              className={styles.btnPrimary}
              style={{ background: "#b3261e", padding: "0.3rem 0.7rem", fontSize: "12px" }}
              onClick={() => del.mutate()}
              disabled={del.isPending}
            >
              {del.isPending ? "Brišem…" : "Potvrdi"}
            </button>
            <button
              className={styles.btnGhost}
              style={{ padding: "0.3rem 0.7rem", fontSize: "12px" }}
              onClick={() => setConfirm(false)}
            >
              Odustani
            </button>
          </span>
        ) : (
          <button
            className={styles.btnGhost}
            style={{ padding: "0.3rem 0.7rem", fontSize: "12px", color: "#b3261e", borderColor: "color-mix(in srgb, #b3261e 30%, transparent)" }}
            onClick={() => setConfirm(true)}
            title="Obriši fizičko lice (sa svim podacima)"
          >
            Obriši
          </button>
        )}
        {error && (
          <div className={styles.workerJmbg} style={{ color: "#b3261e", marginTop: 4 }}>
            {error}
          </div>
        )}
      </td>
    </tr>
  );
}
