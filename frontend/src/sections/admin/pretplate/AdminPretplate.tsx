"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./adminPretplate.module.css";
import {
  listPredracuni,
  updatePredracunStatus,
  deletePredracun,
  predracunPdfUrl,
  type PredracunListItem,
  type PredracunListResponse,
  type PredracunStatus,
} from "src/api/backend/predracun/predracun";
import { unwrap } from "src/api/auth";
import { upsertSubscription } from "src/api/profile";
import StyledSelect from "src/components/StyledSelect/StyledSelect";

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
  if (!iso) return "–";
  const d = String(iso).slice(0, 10).split("-");
  if (d.length !== 3) return "–";
  return `${d[2]}.${d[1]}.${d[0]}.`;
}

function fmt(n: number) {
  return Number(n)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function DetailRow({
  label,
  value,
  total,
}: {
  label: string;
  value: string | null | undefined;
  total?: boolean;
}) {
  const v = value && String(value).trim() ? String(value) : "–";
  return (
    <div
      className={`${styles.detailRow} ${total ? styles.detailRowTotal : ""}`}
    >
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{v}</span>
    </div>
  );
}

export default function AdminPretplate() {
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState<"" | "PRO" | "BUSINESS">("");
  const [statusFilter, setStatusFilter] = useState<"" | PredracunStatus>("");
  const [page, setPage] = useState(1);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } =
    useQuery<PredracunListResponse>({
      queryKey: ["admin-predracuni", q, plan, statusFilter, page],
      queryFn: () =>
        unwrap(listPredracuni({ q, plan, status: statusFilter, page, limit: LIMIT })),
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

  // ── Aktivacija pretplate po predračunu ─────────────────────────────────
  // Povuče paket i ciklus sa predračuna, upsertuje pretplatu korisniku
  // (početak: periodStart predračuna ako postoji, inače danas; kraj računa
  // backend iz ciklusa) i označi predračun plaćenim. Office paketi ne diraju
  // rolu (effectiveRole), PRO/BUSINESS postavljaju rolu kao i do sada.
  const [aktivirajInfo, setAktivirajInfo] = useState<{
    id: number;
    ok: boolean;
    msg: string;
  } | null>(null);
  const aktivirajMutation = useMutation({
    mutationFn: async (it: PredracunListItem) => {
      if (!it.user) throw new Error("Predračun nema vezanog korisnika.");
      const start =
        it.periodStart?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      await unwrap(
        upsertSubscription(it.user.id, {
          plan: it.plan,
          billingCycle: it.billingCycle,
          startDate: start,
          isActive: true,
        }),
      );
      if (it.status !== "PAID") {
        await unwrap(updatePredracunStatus(it.id, "PAID"));
      }
      return it;
    },
    onSuccess: (it) => {
      setAktivirajInfo({
        id: it.id,
        ok: true,
        msg: `Pretplata ${it.plan} aktivirana za ${it.user?.firstName ?? ""} ${it.user?.lastName ?? ""}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-predracuni"] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error, it) => {
      setAktivirajInfo({
        id: it.id,
        ok: false,
        msg: e.message || "Greška pri aktivaciji pretplate.",
      });
    },
  });

  // ── Detalj predračuna (modal) ──────────────────────────────────────────
  const [detail, setDetail] = useState<PredracunListItem | null>(null);
  // Portal se renderuje tek nakon mounta (SSR-safe) i u document.body da
  // izbjegne clipping od transformisanih/overflow roditelja.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Brisanje predračuna (inline potvrda po redu) ───────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: number) => unwrap(deletePredracun(id)),
    onSuccess: () => {
      setConfirmDeleteId(null);
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
    setStatusFilter("");
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
          <StyledSelect
            value={plan}
            onChange={(v) => {
              setPlan(String(v ?? "") as "" | "PRO" | "BUSINESS");
              setPage(1);
            }}
            ariaLabel="Filter plana"
            wrapStyle={{ minWidth: 180 }}
            groups={[
              {
                options: [
                  { value: "", label: "Svi planovi" },
                  { value: "PRO", label: "Pro" },
                  { value: "BUSINESS", label: "Business" },
                ],
              },
            ]}
          />
          <StyledSelect
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(String(v ?? "") as "" | PredracunStatus);
              setPage(1);
            }}
            ariaLabel="Filter statusa"
            wrapStyle={{ minWidth: 180 }}
            groups={[
              {
                options: [
                  { value: "", label: "Svi statusi" },
                  { value: "ISSUED", label: "Izdat" },
                  { value: "PAID", label: "Plaćen" },
                  { value: "CANCELLED", label: "Otkazan" },
                ],
              },
            ]}
          />
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
                  <th>Akcije</th>
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
                        <span className={styles.metaCell}>–</span>
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
                      {/* Status je obojeni inline badge (ne filter meni), pa ostaje
                          native select stilizovan kao badge, ne StyledSelect. */}
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
                        <option value="CANCELLED">{STATUS_LABEL.CANCELLED}</option>
                      </select>
                    </td>
                    <td>
                      {confirmDeleteId === it.id ? (
                        <div className={styles.deleteConfirm}>
                          <button
                            type="button"
                            className={styles.deleteConfirmYes}
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(it.id)}
                          >
                            {deleteMutation.isPending ? "Brišem…" : "Potvrdi"}
                          </button>
                          <button
                            type="button"
                            className={styles.deleteConfirmNo}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Otkaži
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {it.user && it.status !== "CANCELLED" && (
                            <button
                              type="button"
                              className={styles.detailBtn}
                              style={{
                                background: "#2d6a4f",
                                borderColor: "#2d6a4f",
                                color: "#fff",
                              }}
                              disabled={
                                aktivirajMutation.isPending &&
                                aktivirajMutation.variables?.id === it.id
                              }
                              title="Dodijeli paket sa predračuna korisniku (od danas, trajanje po ciklusu) i označi predračun plaćenim"
                              onClick={() => aktivirajMutation.mutate(it)}
                            >
                              {aktivirajMutation.isPending &&
                              aktivirajMutation.variables?.id === it.id
                                ? "Aktiviram…"
                                : "Aktiviraj pretplatu"}
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.detailBtn}
                            title="Pregledaj sve podatke predračuna"
                            onClick={() => setDetail(it)}
                          >
                            Detalji
                          </button>
                          <button
                            type="button"
                            className={styles.deleteBtn}
                            title="Obriši predračun"
                            onClick={() => setConfirmDeleteId(it.id)}
                          >
                            Obriši
                          </button>
                        </div>
                      )}
                      {aktivirajInfo?.id === it.id && (
                        <div
                          className={styles.metaCell}
                          style={{
                            marginTop: 4,
                            color: aktivirajInfo.ok ? "#2d6a4f" : "#b3261e",
                          }}
                        >
                          {aktivirajInfo.msg}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Detalj modal (portal u body da ne clippa) ──────────────── */}
        {detail &&
          mounted &&
          createPortal(
            <div
              className={styles.modalOverlay}
              onClick={() => setDetail(null)}
              role="presentation"
            >
            <div
              className={styles.modal}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className={styles.modalHead}>
                <div>
                  <div className={styles.modalTitle}>
                    Predračun {detail.fullNumber}
                  </div>
                  <div className={styles.modalSub}>
                    {detail.plan} ·{" "}
                    {detail.billingCycle === "monthly"
                      ? "mjesečno"
                      : "godišnje"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    className={`${styles.statusSelect} ${
                      styles[STATUS_CLASS[detail.status]]
                    }`}
                    style={{ pointerEvents: "none", padding: "3px 10px" }}
                  >
                    {STATUS_LABEL[detail.status]}
                  </span>
                  <button
                    type="button"
                    className={styles.modalClose}
                    onClick={() => setDetail(null)}
                    aria-label="Zatvori"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.detailGroupTitle}>Kupac</div>
                <DetailRow label="Naziv" value={detail.buyer.name} />
                <DetailRow label="Adresa" value={detail.buyer.address} />
                <DetailRow
                  label="Grad"
                  value={[detail.buyer.postalCode, detail.buyer.city]
                    .filter(Boolean)
                    .join(" ")}
                />
                <DetailRow label="Telefon" value={detail.buyer.phone} />
                <DetailRow label="E-mail" value={detail.buyer.email} />
                <DetailRow
                  label="ID / JMBG"
                  value={detail.buyer.idNumber}
                />
                <DetailRow label="PDV broj" value={detail.buyer.vatNumber} />

                <div className={styles.detailGroupTitle}>Pretplata</div>
                <DetailRow label="Plan" value={detail.plan} />
                <DetailRow
                  label="Ciklus"
                  value={
                    detail.billingCycle === "monthly" ? "Mjesečno" : "Godišnje"
                  }
                />
                <DetailRow
                  label="Period"
                  value={
                    detail.periodStart || detail.periodEnd
                      ? `${formatDate(detail.periodStart)} - ${formatDate(detail.periodEnd)}`
                      : "–"
                  }
                />

                <div className={styles.detailGroupTitle}>Iznosi</div>
                <DetailRow
                  label="Osnovica (bez PDV-a)"
                  value={`${fmt(detail.netAmount)} KM`}
                />
                <DetailRow label="PDV" value={`${fmt(detail.vatAmount)} KM`} />
                <DetailRow
                  label="Ukupno za uplatu"
                  value={`${fmt(detail.grossAmount)} KM`}
                  total
                />

                <div className={styles.detailGroupTitle}>Dokument</div>
                <DetailRow
                  label="Izdat"
                  value={formatDate(detail.issueDate)}
                />
                <DetailRow
                  label="Rok plaćanja"
                  value={formatDate(detail.dueDate)}
                />
                <DetailRow
                  label="Kreiran"
                  value={formatDate(detail.createdAt)}
                />
                {detail.user && (
                  <DetailRow
                    label="Korisnik"
                    value={`${detail.user.firstName} ${detail.user.lastName} (${detail.user.email ?? "–"})`}
                  />
                )}
              </div>
              <div className={styles.modalFoot}>
                <a
                  href={predracunPdfUrl(detail.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnPrimary}
                  style={{ textDecoration: "none" }}
                >
                  Otvori PDF
                </a>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setDetail(null)}
                >
                  Zatvori
                </button>
              </div>
            </div>
          </div>,
            document.body,
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
