"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  adminGetOrganizations,
  type AdminOrganization,
  type AdminOrgsListResponse,
} from "src/api/profile";
import {
  getAdminOrgWorkers,
  deleteAdminOrganization,
  deleteAdminWorker,
  type AdminOrgWorker,
} from "src/api/adminEntities";
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
                    <th></th>
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

const WORKER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nacrt",
  PRIJAVLJEN: "Prijavljen",
  ODJAVLJEN: "Odjavljen",
};

function OrgRow({ org }: { org: AdminOrganization }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerName = org.owner
    ? `${org.owner.firstName} ${org.owner.lastName}`
    : "—";
  const creatorName = org.createdBy
    ? `${org.createdBy.firstName} ${org.createdBy.lastName}`
    : "—";
  const creatorEmail = org.createdBy?.email ?? null;

  const workersQuery = useQuery({
    queryKey: ["admin-org-workers", org.id],
    queryFn: async () => {
      const r = await getAdminOrgWorkers(org.id);
      if (!r.ok) throw new Error(r.error);
      return r.data.items;
    },
    enabled: expanded,
  });

  const delOrg = useMutation({
    mutationFn: async () => {
      const r = await deleteAdminOrganization(org.id);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <>
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
        <td style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              font: "inherit",
              color: "var(--sage)",
              textDecoration: "underline",
            }}
            title="Prikaži radnike"
          >
            {org.workerCount} {expanded ? "▴" : "▾"}
          </button>
        </td>
        <td>
          <span className={styles.workerName}>{creatorName}</span>
          {creatorEmail && <div className={styles.workerJmbg}>{creatorEmail}</div>}
        </td>
        <td className={styles.dateRange}>{formatDate(org.createdAt)}</td>
        <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
          {confirmDelete ? (
            <span style={{ display: "inline-flex", gap: "0.4rem" }}>
              <button
                className={styles.btnPrimary}
                style={{ background: "#b3261e", padding: "0.3rem 0.7rem", fontSize: "12px" }}
                onClick={() => delOrg.mutate()}
                disabled={delOrg.isPending}
              >
                {delOrg.isPending ? "Brišem…" : "Potvrdi"}
              </button>
              <button
                className={styles.btnGhost}
                style={{ padding: "0.3rem 0.7rem", fontSize: "12px" }}
                onClick={() => setConfirmDelete(false)}
              >
                Odustani
              </button>
            </span>
          ) : (
            <button
              className={styles.btnGhost}
              style={{ padding: "0.3rem 0.7rem", fontSize: "12px", color: "#b3261e", borderColor: "color-mix(in srgb, #b3261e 30%, transparent)" }}
              onClick={() => setConfirmDelete(true)}
              title="Obriši organizaciju (sa svim podacima)"
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
      {expanded && (
        <tr>
          <td colSpan={8} style={{ background: "var(--paper)", padding: "0.75rem 1rem" }}>
            {workersQuery.isLoading ? (
              <span className={styles.workerJmbg}>Učitavanje radnika…</span>
            ) : (workersQuery.data?.length ?? 0) === 0 ? (
              <span className={styles.workerJmbg}>Nema radnika.</span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {workersQuery.data!.map((w) => (
                  <WorkerLine key={w.id} worker={w} orgId={org.id} />
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function WorkerLine({ worker, orgId }: { worker: AdminOrgWorker; orgId: number }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: async () => {
      const r = await deleteAdminWorker(worker.id);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-org-workers", orgId] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "0.4rem",
      }}
    >
      <div>
        <span className={styles.workerName}>{worker.name}</span>
        <span className={styles.workerJmbg}>
          {" "}
          · {worker.position || "—"}
          {worker.employmentStatus
            ? ` · ${WORKER_STATUS_LABELS[worker.employmentStatus] ?? worker.employmentStatus}`
            : ""}
        </span>
        {error && (
          <div className={styles.workerJmbg} style={{ color: "#b3261e" }}>
            {error}
          </div>
        )}
      </div>
      {confirm ? (
        <span style={{ display: "inline-flex", gap: "0.4rem", whiteSpace: "nowrap" }}>
          <button
            className={styles.btnPrimary}
            style={{ background: "#b3261e", padding: "0.25rem 0.6rem", fontSize: "12px" }}
            onClick={() => del.mutate()}
            disabled={del.isPending}
          >
            {del.isPending ? "…" : "Potvrdi"}
          </button>
          <button
            className={styles.btnGhost}
            style={{ padding: "0.25rem 0.6rem", fontSize: "12px" }}
            onClick={() => setConfirm(false)}
          >
            Odustani
          </button>
        </span>
      ) : (
        <button
          className={styles.btnGhost}
          style={{ padding: "0.25rem 0.6rem", fontSize: "12px", color: "#b3261e", borderColor: "color-mix(in srgb, #b3261e 30%, transparent)", whiteSpace: "nowrap" }}
          onClick={() => setConfirm(true)}
          title="Obriši radnika (sa svim podacima)"
        >
          Obriši
        </button>
      )}
    </div>
  );
}
