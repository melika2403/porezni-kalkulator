"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import {
  listActivity,
  getActivityStats,
  setActivityHidden,
  type ActivityListResponse,
  type ActivityStats,
} from "src/api/activity";
import styles from "./aktivnost.module.css";

// Mašinski kod akcije → čitljiv naziv (za filter i prikaz).
const ACTION_LABELS: Record<string, string> = {
  AMS_GENERATE: "AMS-1035",
  SPR_GENERATE: "SPR-1053",
  GPD_GENERATE: "GPD-1051",
  ZO3_GENERATE: "ZO3 obrazac",
  PLDI_GENERATE: "PLDI-1043 (amortizacija)",
  SIH_GENERATE: "Šihterica",
  JS3100_GENERATE: "JS3100 prijava/odjava",
  PLATA_GENERATE: "Obračun plata",
  UGOVOR_RADU_GENERATE: "Ugovor o radu",
  OTKAZ_GENERATE: "Otkaz ugovora",
  UGOVOR_DJELU_GENERATE: "Ugovor o djelu",
  UGOVOR_POZAJMICA_GENERATE: "Ugovor o pozajmici",
  FAKTURA_GENERATE: "Faktura",
  PREDRACUN_GENERATE: "Predračun",
  KARTICA_GENERATE: "Članska kartica",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const SCOPES: { key: "all" | "registered" | "anon"; label: string }[] = [
  { key: "all", label: "Svi" },
  { key: "registered", label: "Registrovani" },
  { key: "anon", label: "Neregistrovani" },
];

const DAYS_STORAGE_KEY = "admin-aktivnost-days";

export default function AdminAktivnost() {
  const LIMIT = 50;
  // Zapamti izabrani period u localStorage (npr. "Zauvijek" ostaje izabran).
  const [days, setDays] = useState<number>(() => {
    if (typeof window === "undefined") return 30;
    const saved = window.localStorage.getItem(DAYS_STORAGE_KEY);
    const n = saved != null ? Number(saved) : NaN;
    return Number.isFinite(n) ? n : 30;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DAYS_STORAGE_KEY, String(days));
    }
  }, [days]);
  const [scope, setScope] = useState<"all" | "registered" | "anon">("all");
  const [action, setAction] = useState<string>("");
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showHidden, setShowHidden] = useState(false);
  const [drillUser, setDrillUser] = useState<{
    id: number;
    name: string;
    email: string | null;
  } | null>(null);
  const queryClient = useQueryClient();

  const statsQuery = useQuery<ActivityStats>({
    queryKey: ["activity-stats", days],
    queryFn: async () => {
      const r = await getActivityStats(days);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const listQuery = useQuery<ActivityListResponse>({
    queryKey: ["activity-list", scope, action, search, page, showHidden],
    queryFn: async () => {
      const r = await listActivity({
        scope,
        action: action || undefined,
        q: search || undefined,
        page,
        limit: LIMIT,
        includeHidden: showHidden,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    placeholderData: (prev) => prev,
  });

  // Sklanjanje/vraćanje stavke iz pregleda (soft-hide).
  const hideMutation = useMutation({
    mutationFn: ({ id, hidden }: { id: number; hidden: boolean }) =>
      setActivityHidden(id, hidden),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-list"] });
    },
  });

  const stats = statsQuery.data;
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Akcije za dropdown — iz statistike (one koje stvarno postoje) + fallback mapa.
  const actionOptions = stats?.byAction.map((a) => a.action) ?? [];

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
            <h1 className={styles.title}>Aktivnost</h1>
            <div className={styles.meta}>
              Generisani dokumenti — registrovani i neregistrovani korisnici.
            </div>
          </div>
          <div className={styles.daysPicker}>
            <label className={styles.fieldLabel}>Period (statistika)</label>
            <select
              className={styles.select}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Zadnjih 7 dana</option>
              <option value={30}>Zadnjih 30 dana</option>
              <option value={90}>Zadnjih 90 dana</option>
              <option value={365}>Zadnjih 365 dana</option>
              <option value={0}>Zauvijek</option>
            </select>
          </div>
        </div>

        {/* Zbirne kartice */}
        <div className={styles.cards}>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Ukupno generisano</span>
            <span className={styles.cardValue}>{stats?.total ?? 0}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Registrovani</span>
            <span className={styles.cardValue}>{stats?.registered ?? 0}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Neregistrovani</span>
            <span className={styles.cardValue}>{stats?.anonymous ?? 0}</span>
          </div>
        </div>

        {/* Po dokumentu */}
        {stats && stats.byAction.length > 0 && (
          <div className={styles.byAction}>
            {stats.byAction.map((a) => (
              <button
                key={a.action}
                type="button"
                className={`${styles.actionChip} ${action === a.action ? styles.actionChipActive : ""}`}
                onClick={() => {
                  setAction(action === a.action ? "" : a.action);
                  setPage(1);
                }}
                title="Filtriraj po ovom dokumentu"
              >
                <span>{actionLabel(a.action)}</span>
                <strong>{a.count}</strong>
              </button>
            ))}
          </div>
        )}

        {/* Filteri */}
        <div className={styles.filters}>
          <div className={styles.scopeToggle}>
            {SCOPES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`${styles.scopeBtn} ${scope === s.key ? styles.scopeBtnActive : ""}`}
                onClick={() => {
                  setScope(s.key);
                  setPage(1);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <select
            className={styles.select}
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Svi dokumenti</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </select>

          <form className={styles.searchBar} onSubmit={applySearch}>
            <input
              className={styles.input}
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Pretraži korisnika (ime, email)…"
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

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#6b7280",
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => {
                setShowHidden(e.target.checked);
                setPage(1);
              }}
            />
            Prikaži sklonjene
          </label>
        </div>

        {/* Tabela */}
        {listQuery.isLoading ? (
          <div className={styles.empty}>Učitavanje…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>Nema zabilježene aktivnosti.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vrijeme</th>
                  <th>Korisnik</th>
                  <th>Dokument</th>
                  <th>Organizacija</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    style={it.hidden ? { opacity: 0.5 } : undefined}
                  >
                    <td className={styles.timeCell}>{formatDateTime(it.createdAt)}</td>
                    <td>
                      {it.user ? (
                        <button
                          type="button"
                          className={styles.userBtn}
                          onClick={() =>
                            setDrillUser({
                              id: it.user!.id,
                              name: it.user!.name,
                              email: it.user!.email,
                            })
                          }
                          title="Prikaži svu aktivnost ovog korisnika"
                        >
                          <span className={styles.userName}>{it.user.name}</span>
                          <span className={styles.userEmail}>{it.user.email}</span>
                        </button>
                      ) : (
                        <span className={styles.anonBadge}>Neregistrovan</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.docBadge}>
                        {actionLabel(it.action)}
                      </span>
                      {it.label && it.label !== actionLabel(it.action) && (
                        <span className={styles.docSub}> · {it.label}</span>
                      )}
                    </td>
                    <td>
                      {it.organization ? (
                        it.organization.name
                      ) : (
                        <span className={styles.docSub}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        disabled={hideMutation.isPending}
                        onClick={() =>
                          hideMutation.mutate({
                            id: it.id,
                            hidden: !it.hidden,
                          })
                        }
                        title={
                          it.hidden
                            ? "Vrati stavku u pregled"
                            : "Skloni stavku iz pregleda (ne briše dokument)"
                        }
                      >
                        {it.hidden ? "Vrati" : "Skloni"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.btnGhost}
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || listQuery.isFetching}
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
              disabled={page >= totalPages || listQuery.isFetching}
            >
              Sljedeća →
            </button>
          </div>
        )}

        {drillUser && (
          <UserActivityModal
            user={drillUser}
            onClose={() => setDrillUser(null)}
          />
        )}
      </div>
    </RoleGuard>
  );
}

// ── Drill-down: sva aktivnost jednog korisnika ────────────────────────────────
function UserActivityModal({
  user,
  onClose,
}: {
  user: { id: number; name: string; email: string | null };
  onClose: () => void;
}) {
  const query = useQuery<ActivityListResponse>({
    queryKey: ["activity-user", user.id],
    queryFn: async () => {
      const r = await listActivity({ userId: user.id, limit: 200 });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  // Sažetak po dokumentu (broj po akciji).
  const byAction = items.reduce<Record<string, number>>((acc, it) => {
    acc[it.action] = (acc[it.action] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(byAction).sort((a, b) => b[1] - a[1]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.modalTitle}>{user.name}</div>
            <div className={styles.modalSub}>
              {user.email} · {total} generisanih dokumenata
            </div>
          </div>
          <button className={styles.modalClose} type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        {summary.length > 0 && (
          <div className={styles.modalChips}>
            {summary.map(([a, c]) => (
              <span key={a} className={styles.modalChip}>
                {actionLabel(a)} <strong>{c}</strong>
              </span>
            ))}
          </div>
        )}

        <div className={styles.modalBody}>
          {query.isLoading ? (
            <div className={styles.empty}>Učitavanje…</div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>Nema zabilježene aktivnosti.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vrijeme</th>
                  <th>Dokument</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className={styles.timeCell}>
                      {formatDateTime(it.createdAt)}
                    </td>
                    <td>
                      <span className={styles.docBadge}>
                        {actionLabel(it.action)}
                      </span>
                      {it.label && it.label !== actionLabel(it.action) && (
                        <span className={styles.docSub}> · {it.label}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
