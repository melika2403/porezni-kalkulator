"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLastOrg } from "src/hooks/useLastOrg";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import styles from "./organizacija.module.css";
// PK Office tokeni + utility klase za .pk-scope blokove (tabela radnika,
// modali) — bez preflight-a, ne dira ostatak marketing stranice.
import "src/styles/pk-embed.css";
import { formatBAM } from "src/lib/format";
import {
  getOrganization,
  updateOrganizationSettings,
  getWorkers,
  updateWorker,
  getMembers,
  addMember,
  removeMember,
  updateMemberRole,
  type Organization,
  type Worker,
  type OrgMember,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import RoleGuard from "src/components/RoleGuard/RoleGuard";
import { useRole } from "src/hooks/useRole";
import { getOsnovica, REZIM_LABELS } from "src/utils/obrtniciFbih";
import { sortirajRadnike } from "src/lib/radniciSort";
import { WorkerModal } from "src/sections/zaposlenici/WorkerModal";
import { WorkersTable } from "src/sections/zaposlenici/WorkersTable";
import { DeleteWorkerModal } from "src/sections/zaposlenici/DeleteWorkerModal";
import { PkSelect } from "src/components/app-shell/PkSelect";

const ORG_TYPE_LABELS: Record<string, string> = {
  COMPANY: "Privredno društvo",
  BUSINESS: "Obrt / Samostalna djelatnost",
};


// ─── Main page ────────────────────────────────────────────────────────────────

const PRO_WORKERS_LIMIT = 5;
const USER_WORKERS_LIMIT = 1;

export default function Organizacija({ orgId }: { orgId: number }) {
  // Otvaranje organizacije postavlja je kao "posljednje aktivnu" — kada
  // korisnik pređe u JS3100 / Obračun plata / Aktivni radnici, ista je
  // automatski odabrana.
  const { setLastOrgId } = useLastOrg();
  useEffect(() => {
    if (orgId) setLastOrgId(orgId);
  }, [orgId, setLastOrgId]);

  const queryClient = useQueryClient();
  const { role: userRole } = useRole();

  const { data: org, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: ["organization", orgId],
    queryFn: () => unwrap(getOrganization(orgId)),
  });

  const { data: workers = [], isLoading: workersLoading } = useQuery<Worker[]>({
    queryKey: ["workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId)),
  });

  // PK Office modal forme: null = zatvoreno; { worker: null } = novi radnik.
  const [workerModal, setWorkerModal] = useState<{
    worker: Worker | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null);

  const canEdit = org?.memberRole === "OWNER" || org?.memberRole === "ADMIN";
  // Worker count limits follow the OWNER's plan (effectiveTier), not the viewer's role —
  // a free MEMBER inside a BUSINESS owner's org sees no limit.
  const tier = org?.effectiveTier ?? null;
  const isProLimitReached = tier === "PRO" && workers.length >= PRO_WORKERS_LIMIT;
  const isUserLimitReached = tier === "USER" && workers.length >= USER_WORKERS_LIMIT;
  const isLimitReached = isProLimitReached || isUserLimitReached;

  // Postavljanje radnika kao direktora/potpisnika (opcije 2 i 4).
  // Direktor je zakonski zastupnik, pa mu radno mjesto postaje "Direktor".
  // Ako pozicija već spominje direktora (npr. "Izvršni direktor"), ne diramo je.
  const directorMutation = useMutation({
    mutationFn: async (workerId: number | null) => {
      await unwrap(
        updateOrganizationSettings(orgId, { directorWorkerId: workerId }),
      );
      if (workerId) {
        const w = workers.find((x) => x.id === workerId);
        const pos = (w?.position ?? "").trim();
        if (!/direktor/i.test(pos)) {
          await unwrap(updateWorker(orgId, workerId, { position: "Direktor" }));
        }
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
    },
  });

  if (orgLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>Učitavanje...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className={styles.page}>
        <Link href="/profil" className={styles.back}>
          ← Nazad na profil
        </Link>
        <div className={styles.empty}>
          Organizacija nije pronađena ili nemate pristup.
        </div>
      </div>
    );
  }

  // Kolona Plata: vlasnik obrta nema platu (osnovica za doprinose po režimu,
  // režim u tooltipu da red ostane kratak), ostali neto/bruto kao u PK Office.
  function plataLabel(w: Worker): React.ReactNode {
    if (w.role === "VLASNIK" && org?.type === "BUSINESS") {
      const rezim = org?.taxRegime ?? null;
      if (!rezim) return "osnovica: režim nije postavljen";
      try {
        const osnovica = getOsnovica(
          new Date().getFullYear(),
          rezim,
          org?.taxCategory ?? undefined,
        );
        return (
          <span title={REZIM_LABELS[rezim]}>
            osnovica {formatBAM(osnovica)}
          </span>
        );
      } catch {
        return <span title={REZIM_LABELS[rezim]}>osnovica po režimu</span>;
      }
    }
    if (w.salaryType === "BRUTO" && w.salaryBruto != null) {
      return `${formatBAM(Number(w.salaryBruto))} bruto`;
    }
    if (w.salaryNeto != null) {
      return `${formatBAM(Number(w.salaryNeto))} neto`;
    }
    return "plata nije unesena";
  }

  // Redanje: dijeljeni helper (isti na svim sidebarima i aktivnim radnicima),
  // prijavljeni po datumu prijave ASC, odjavljeni na dno po datumu odjave ASC.
  const sortedWorkers = sortirajRadnike(workers);
  const activeWorkers = sortedWorkers.filter(
    (w) => w.employmentStatus !== "ODJAVLJEN",
  );
  const inactiveWorkers = sortedWorkers.filter(
    (w) => w.employmentStatus === "ODJAVLJEN",
  );

  return (
    <div className={styles.page}>
      <RoleGuard roles={["USER", "PRO", "BUSINESS", "ADMIN"]} mode="hide">
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/profil" className={styles.back}>
            ← Nazad na profil
          </Link>
          <Link href={`/aktivni-radnici?org=${orgId}`} className={styles.back}>
            ← Aktivni radnici
          </Link>
        </div>

        {/* ── Org header ── */}
        <div className={styles.orgHeader}>
          <h1 className={styles.orgTitle}>{org.name}</h1>
          <div className={styles.orgMeta}>
            <span>{ORG_TYPE_LABELS[org.type] ?? org.type}</span>
            {org.taxNumber && <span>JIB: {org.taxNumber}</span>}
            {org.owner && (
              <span>
                Vlasnik:{" "}
                {org.owner.name ||
                  `${org.owner.firstName ?? ""} ${org.owner.lastName ?? ""}`.trim() ||
                  "–"}
              </span>
            )}
          </div>
        </div>

        {/* ── Direktor / potpisnik (opcije 2 i 4: vlasnik nije direktor) ── */}
        {org.type === "COMPANY" && org.ownerIsDirector === false && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Direktor i potpisnik</span>
            </div>
            <div className="pk-scope p-4">
              <p className="text-[13px] leading-6 text-text-secondary mb-3 max-w-[560px]">
                Vlasnik nije direktor. Označite radnika koji zastupa firmu i
                potpisuje dokumente (ugovor o radu i ostalo). Radno mjesto tog
                radnika se postavlja na &quot;Direktor&quot; (možete ga
                prepraviti na kartici radnika).
              </p>
              <PkSelect
                ariaLabel="Direktor / potpisnik"
                value={org.directorWorkerId != null ? String(org.directorWorkerId) : ""}
                disabled={!canEdit || directorMutation.isPending}
                onChange={(v) =>
                  directorMutation.mutate(v ? Number(v) : null)
                }
                placeholder="Izaberi radnika"
                options={[
                  { value: "", label: "Izaberi radnika" },
                  ...(() => {
                    const candidates = workers.filter(
                      (w) =>
                        w.role === "RADNIK" &&
                        w.employmentStatus !== "ODJAVLJEN",
                    );
                    // Ako je dodijeljeni direktor odjavljen, ipak ga prikaži da
                    // se ne bi činilo da direktor nije postavljen.
                    if (
                      org.directorWorkerId &&
                      !candidates.some((w) => w.id === org.directorWorkerId)
                    ) {
                      const assigned = workers.find(
                        (w) => w.id === org.directorWorkerId,
                      );
                      if (assigned) candidates.push(assigned);
                    }
                    return candidates.map((w) => ({
                      value: String(w.id),
                      label: `${w.firstName} ${w.lastName}${
                        w.employmentStatus === "ODJAVLJEN" ? " (odjavljen)" : ""
                      }`,
                    }));
                  })(),
                ]}
                wrapStyle={{ width: "100%", maxWidth: 360 }}
              />
              {org.directorWorkerId && org.signer?.name && (
                <p className="text-[12.5px] text-brand-700 mt-2">
                  Potpisnik: {org.signer.name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Workers card ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              Radnici{workers.length > 0 ? ` (${workers.length})` : ""}
            </span>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
              <Link
                href={`/aktivni-radnici?org=${orgId}`}
                className={styles.btnGhost}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  textDecoration: "none",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Aktivni radnici
              </Link>
              {canEdit && !isLimitReached && (
                <button
                  className={styles.btnPrimary}
                  onClick={() => setWorkerModal({ worker: null })}
                >
                  + Dodaj radnika
                </button>
              )}
            </div>
            {isProLimitReached && (
              <span className={styles.limitNotice}>
                PRO plan: maksimalno {PRO_WORKERS_LIMIT} radnika po organizaciji
              </span>
            )}
            {isUserLimitReached && (
              <span className={styles.limitNotice}>
                Besplatan preview: 1 radnik. Pretplatite se za neograničeno radnika.
              </span>
            )}
          </div>

          {workersLoading && (
            <div className={styles.empty}>Učitavanje radnika...</div>
          )}

          {!workersLoading && workers.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>👥</div>
              <div>Nema dodanih radnika.</div>
            </div>
          )}

          {workers.length > 0 && (
            <div className="pk-scope">
              <WorkersTable
                workers={[...activeWorkers, ...inactiveWorkers]}
                plataCell={(w) => plataLabel(w)}
                onRowClick={
                  canEdit ? (w) => setWorkerModal({ worker: w }) : undefined
                }
                actionsFor={
                  canEdit
                    ? (w) => ({
                        primary: [
                          {
                            key: "uredi",
                            label: "Uredi",
                            icon: <IconPencil size={14} />,
                            onClick: () => setWorkerModal({ worker: w }),
                          },
                        ],
                        // Vlasnik se ne briše, akcija se i ne nudi.
                        menu:
                          w.role === "VLASNIK"
                            ? []
                            : [
                                {
                                  kind: "item" as const,
                                  key: "obrisi",
                                  label: "Obriši radnika",
                                  sub: "trajno, uz potvrdu",
                                  icon: <IconTrash size={14} />,
                                  onClick: () => setDeleteTarget(w),
                                },
                              ],
                      })
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {/* PK Office modali (puna forma radnika + potvrda brisanja) */}
        {workerModal != null && (
          <div className="pk-scope">
            <WorkerModal
              key={workerModal.worker?.id ?? "new"}
              orgId={orgId}
              orgType={org?.type ?? null}
              worker={workerModal.worker}
              onClose={() => setWorkerModal(null)}
            />
          </div>
        )}
        <DeleteWorkerModal
          orgId={orgId}
          worker={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />

        {/* ── Members card (owner of a BUSINESS-tier org; ADMIN bypasses) ── */}
        {org.memberRole === "OWNER" &&
          (org.effectiveTier === "BUSINESS" || userRole === "ADMIN") && (
            <MembersCard orgId={orgId} />
          )}
      </RoleGuard>
    </div>
  );
}

// ─── Members card ─────────────────────────────────────────────────────────────

const MEMBER_ROLE_LABELS: Record<string, string> = {
  OWNER: "Vlasnik (app)",
  ADMIN: "Admin",
  MEMBER: "Član",
};

function MembersCard({ orgId }: { orgId: number }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [removeConfirmId, setRemoveConfirmId] = useState<number | null>(null);

  const { data: members = [], isLoading } = useQuery<OrgMember[]>({
    queryKey: ["members", orgId],
    queryFn: () => unwrap(getMembers(orgId)),
  });

  const addMutation = useMutation({
    mutationFn: (payload: { email: string; role: "ADMIN" | "MEMBER" }) =>
      unwrap(addMember(orgId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", orgId] });
      setShowAdd(false);
      setEmail("");
      setRole("MEMBER");
    },
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: number;
      role: "ADMIN" | "MEMBER";
    }) => unwrap(updateMemberRole(orgId, userId, role)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["members", orgId] }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => unwrap(removeMember(orgId, userId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", orgId] });
      setRemoveConfirmId(null);
    },
  });

  const addError =
    addMutation.error?.message === "USER_NOT_FOUND"
      ? "Korisnik s tim emailom nije pronađen."
      : addMutation.error?.message === "ALREADY_MEMBER"
        ? "Taj korisnik već ima pristup."
        : (addMutation.error?.message ?? null);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          Pristup korisnicima{members.length > 0 ? ` (${members.length})` : ""}
        </span>
        {!showAdd && (
          <button
            className={styles.btnPrimary}
            onClick={() => {
              setShowAdd(true);
              addMutation.reset();
            }}
          >
            + Dodaj korisnika
          </button>
        )}
      </div>

      <div className="pk-scope">
        {showAdd && (
          <form
            className="px-4 py-4 border-b border-cream-300 bg-cream-50/60"
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate({ email: email.trim(), role });
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[640px]">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Email korisnika
                </label>
                <input
                  className="w-full rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="korisnik@email.ba"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Uloga
                </label>
                <PkSelect
                  ariaLabel="Uloga novog korisnika"
                  value={role}
                  onChange={(v) => setRole(v === "ADMIN" ? "ADMIN" : "MEMBER")}
                  options={[
                    { value: "MEMBER", label: "Član, može pregledati" },
                    { value: "ADMIN", label: "Admin, može uređivati" },
                  ]}
                  wrapStyle={{ width: "100%" }}
                />
              </div>
            </div>
            {addError && (
              <p className="text-[12.5px] text-accent-500 mt-2">{addError}</p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
                onClick={() => {
                  setShowAdd(false);
                  setEmail("");
                  setRole("MEMBER");
                }}
              >
                Odustani
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? "Dodavanje..." : "Dodaj"}
              </button>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="px-4 py-8 text-center text-[13px] text-text-tertiary">
            Učitavanje...
          </div>
        )}

        {!isLoading && members.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-text-tertiary">
                  <th className="px-4 py-2.5 font-semibold">Korisnik</th>
                  <th className="px-3 py-2.5 font-semibold">Email</th>
                  <th className="px-3 py-2.5 font-semibold">Uloga</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.userId}
                    className="border-b border-cream-300/70 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary whitespace-nowrap">
                      {m.user.firstName} {m.user.lastName}
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px] text-text-secondary whitespace-nowrap">
                      {m.user.email ?? "–"}
                    </td>
                    <td className="px-3 py-3">
                      {m.role === "OWNER" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-brand-100 text-brand-700">
                          {MEMBER_ROLE_LABELS[m.role]}
                        </span>
                      ) : (
                        <PkSelect
                          ariaLabel={`Uloga korisnika ${m.user.firstName}`}
                          value={m.role}
                          disabled={roleChangeMutation.isPending}
                          onChange={(v) =>
                            roleChangeMutation.mutate({
                              userId: m.userId,
                              role: v === "ADMIN" ? "ADMIN" : "MEMBER",
                            })
                          }
                          options={[
                            { value: "MEMBER", label: "Član" },
                            { value: "ADMIN", label: "Admin" },
                          ]}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {m.role !== "OWNER" &&
                        (removeConfirmId === m.userId ? (
                          <span className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={removeMutation.isPending}
                              onClick={() => removeMutation.mutate(m.userId)}
                              className="px-3 py-1.5 rounded-lg bg-accent-500 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {removeMutation.isPending ? "..." : "Potvrdi"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoveConfirmId(null)}
                              className="px-3 py-1.5 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors"
                            >
                              Odustani
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            title="Ukloni pristup"
                            onClick={() => setRemoveConfirmId(m.userId)}
                            className="inline-flex p-1.5 rounded-lg text-text-tertiary hover:bg-cream-200 hover:text-accent-500 transition-colors"
                          >
                            <IconTrash size={16} />
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
