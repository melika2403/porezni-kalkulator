"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  adminGetOrganizations,
  type AdminOrganization,
  type AdminOrgsListResponse,
} from "src/api/profile";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import styles from "../../admin/korisnici/korisnici.module.css";

const TYPE_LABELS: Record<string, string> = {
  COMPANY: "d.o.o.",
  BUSINESS: "Obrt",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "—";
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
}

export default function AdminOrganizacije() {
  const LIMIT = 20;
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery<AdminOrgsListResponse>({
    queryKey: ["admin-organizations", search, page],
    queryFn: () =>
      unwrap(adminGetOrganizations({ search: search || undefined, page, limit: LIMIT })),
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  const orgs = data?.items ?? [];
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
            <h1 className={styles.orgTitle}>Organizacije</h1>
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
                <label className={styles.fieldLabel}>Naziv</label>
                <input
                  className={styles.input}
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  placeholder="Pretraži po nazivu…"
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
        ) : orgs.length === 0 ? (
          <div className={styles.empty}>Nema organizacija.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Naziv</th>
                    <th>Tip</th>
                    <th>Porezni broj</th>
                    <th>Vlasnik</th>
                    <th>Radnici</th>
                    <th>Kreirao</th>
                    <th>Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <OrgRow key={org.id} org={org} />
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

function OrgRow({ org }: { org: AdminOrganization }) {
  const ownerName = org.owner
    ? `${org.owner.firstName} ${org.owner.lastName}`
    : "—";

  const creatorName = org.createdBy
    ? `${org.createdBy.firstName} ${org.createdBy.lastName}`
    : "—";

  const creatorEmail = org.createdBy?.email ?? null;

  return (
    <tr>
      <td className={styles.workerName}>
        {org.name}
        {org.isClientOrg && (
          <span
            className={styles.orgBadge}
            style={{ marginLeft: "0.5rem", fontSize: "10px" }}
          >
            klijent
          </span>
        )}
      </td>
      <td>
        <span className={styles.orgBadge}>
          {TYPE_LABELS[org.type] ?? org.type}
        </span>
      </td>
      <td>{org.taxNumber || "—"}</td>
      <td>{ownerName}</td>
      <td style={{ textAlign: "center" }}>{org.workerCount}</td>
      <td>
        <span className={styles.workerName}>{creatorName}</span>
        {creatorEmail && (
          <div className={styles.workerJmbg}>{creatorEmail}</div>
        )}
      </td>
      <td className={styles.dateRange}>{formatDate(org.createdAt)}</td>
    </tr>
  );
}
