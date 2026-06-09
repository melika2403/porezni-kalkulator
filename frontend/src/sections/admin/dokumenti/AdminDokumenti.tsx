"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import {
  getAdminForms,
  deleteAdminForm,
  type AdminFormsResponse,
  type AdminFormItem,
} from "src/api/adminForms";
import styles from "./dokumenti.module.css";

const TYPE_LABELS: Record<string, string> = {
  GPD: "GPD-1051",
  SPR: "SPR-1053",
  ZO3: "ZO3 obrazac",
  AMS: "AMS-1035",
  PLDI: "PLDI (amortizacija)",
  SIH: "Šihterica",
  JS3100: "JS3100",
  UOD: "Ugovor o djelu",
  UGOVOR: "Ugovor o pozajmici",
};
function typeLabel(t: string) {
  return TYPE_LABELS[t] ?? t;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nacrt",
  GENERATED: "Generisan",
  SUBMITTED: "Predan",
  ARCHIVED: "Arhiviran",
};
const STATUS_CLASS: Record<string, string> = {
  DRAFT: "stDraft",
  GENERATED: "stGenerated",
  SUBMITTED: "stSubmitted",
  ARCHIVED: "stArchived",
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function yearOptions() {
  const now = new Date().getFullYear();
  const out: number[] = [];
  for (let y = now + 1; y >= 2024; y--) out.push(y);
  return out;
}

export default function AdminDokumenti() {
  const LIMIT = 25;
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [page, setPage] = useState(1);

  const query = useQuery<AdminFormsResponse>({
    queryKey: ["admin-forms", type, status, year, page],
    queryFn: async () => {
      const r = await getAdminForms({
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

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Dokumenti</h1>
            <div className={styles.meta}>
              Svi sačuvani dokumenti registrovanih korisnika, sa statusom i
              organizacijom.
            </div>
          </div>
        </div>

        {/* Sažetak po tipu — klik filtrira */}
        {(data?.byType?.length ?? 0) > 0 && (
          <div className={styles.chips}>
            {data!.byType.map((t) => (
              <button
                key={t.type}
                type="button"
                className={`${styles.chip} ${type === t.type ? styles.chipActive : ""}`}
                onClick={() => {
                  setType(type === t.type ? "" : t.type);
                  setPage(1);
                }}
              >
                <span>{typeLabel(t.type)}</span>
                <strong>{t.count}</strong>
              </button>
            ))}
          </div>
        )}

        {/* Filteri */}
        <div className={styles.filters}>
          <select
            className={styles.select}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Svi statusi</option>
            <option value="DRAFT">Nacrt</option>
            <option value="GENERATED">Generisan</option>
            <option value="SUBMITTED">Predan</option>
            <option value="ARCHIVED">Arhiviran</option>
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
        </div>

        {/* Tabela */}
        {query.isLoading ? (
          <div className={styles.empty}>Učitavanje…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>Nema sačuvanih dokumenata.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dokument</th>
                  <th>Korisnik</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Zadnja izmjena</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <FormRow key={f.id} form={f} />
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

function FormRow({ form: f }: { form: AdminFormItem }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: async () => {
      const r = await deleteAdminForm(f.id);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-forms"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <tr>
      <td>
        <span className={styles.docBadge}>{typeLabel(f.type)}</span>
        {f.title && <span className={styles.docTitle}> · {f.title}</span>}
      </td>
      <td>
        {f.creator ? (
          <>
            <div className={styles.creatorName}>{f.creator.name}</div>
            <div className={styles.creatorSub}>
              {f.organization?.name || f.creator.email || "—"}
            </div>
          </>
        ) : (
          <span className={styles.creatorSub}>—</span>
        )}
      </td>
      <td className={styles.dateCell}>
        {f.month ? `${String(f.month).padStart(2, "0")}/` : ""}
        {f.year}
      </td>
      <td>
        <span
          className={`${styles.statusBadge} ${
            styles[STATUS_CLASS[f.status] as keyof typeof styles] ?? ""
          }`}
        >
          {STATUS_LABELS[f.status] ?? f.status}
        </span>
      </td>
      <td className={styles.dateCell}>{fmtDateTime(f.updatedAt)}</td>
      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
        {confirm ? (
          <span style={{ display: "inline-flex", gap: "0.4rem" }}>
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
              onClick={() => setConfirm(false)}
            >
              Odustani
            </button>
          </span>
        ) : (
          <button
            className={styles.btnDangerGhost}
            type="button"
            onClick={() => setConfirm(true)}
            title="Obriši dokument (trajno)"
          >
            Obriši
          </button>
        )}
        {error && <div className={styles.errorMsg}>{error}</div>}
      </td>
    </tr>
  );
}
