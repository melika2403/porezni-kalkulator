"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getClientOrganizations,
  getOrganizations,
  getWorkers,
  type Worker,
  type Organization,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import { useRole } from "src/hooks/useRole";
import OrgSelect from "src/components/OrgSelect/OrgSelect";
import LoadState from "src/components/LoadState/LoadState";
import styles from "./WorkersSidebar.module.css";
import { WorkerModal } from "src/sections/zaposlenici/WorkerModal";

export type WorkerStatusDot = "active" | "draft" | "inactive" | "warning";

export type WorkerStatusInfo = {
  /** Boja tačke pored imena */
  dot: WorkerStatusDot;
  /** Opcioni badge tekst (uppercase, mali tag) */
  badge?: string;
};

type Props = {
  selectedOrgId: number | null;
  onOrgChange: (orgId: number | null) => void;
  selectedWorkerId: number | null;
  onWorkerSelect: (workerId: number | null, worker: Worker | null) => void;
  /** Filtrira radnike. Default: svi. */
  filter?: (w: Worker) => boolean;
  /** Određuje stanje tačke + badge za radnika. Default: po employmentStatus. */
  statusFor?: (w: Worker) => WorkerStatusInfo;
  noOrgsHint?: string;
  bottomHint?: string;
  /** Prikaži "+ Novi radnik" dugme iznad liste (otvara quick-add modal). */
  enableQuickAdd?: boolean;
};

const DOT_CLASS: Record<WorkerStatusDot, string> = {
  active: styles.dotActive,
  draft: styles.dotDraft,
  inactive: styles.dotInactive,
  warning: styles.dotWarning,
};

function defaultStatus(w: Worker): WorkerStatusInfo {
  switch (w.employmentStatus) {
    case "PRIJAVLJEN":
      return { dot: "active", badge: "prijavljen" };
    case "ODJAVLJEN":
      return { dot: "inactive", badge: "odjavljen" };
    default:
      return { dot: "draft", badge: "draft" };
  }
}

function workerLabel(w: Worker): string {
  return `${w.firstName} ${w.lastName}`.trim() || `#${w.id}`;
}

function orgLabel(o: Organization): string {
  return o.name || `Organizacija #${o.id}`;
}

export default function WorkersSidebar({
  selectedOrgId,
  onOrgChange,
  selectedWorkerId,
  onWorkerSelect,
  filter,
  statusFor = defaultStatus,
  noOrgsHint = "Nemate dodanu nijednu djelatnost. Dodajte djelatnost na profilu da biste počeli.",
  bottomHint = "Radnike dodajte i uređujte na stranici svoje djelatnosti.",
  enableQuickAdd = false,
}: Props) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { role, hasRole } = useRole();
  const isLoggedIn = !!role;
  // Dodavanje radnika zahtijeva Pro/Business (kao na sihterici).
  const canCreateWorker = hasRole("PRO", "BUSINESS", "ADMIN");
  // Pristup klijentskim organizacijama imaju i PRO i BUSINESS planovi.
  const canSeeClients = hasRole("PRO", "BUSINESS", "ADMIN");
  const orgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
    enabled: isLoggedIn,
  });
  const clientOrgsQuery = useQuery({
    queryKey: ["clientOrganizations"],
    queryFn: () => unwrap(getClientOrganizations()),
    enabled: isLoggedIn && canSeeClients,
  });

  const workersQuery = useQuery({
    queryKey: ["workers", selectedOrgId],
    queryFn: () => unwrap(getWorkers(selectedOrgId!)),
    enabled: isLoggedIn && !!selectedOrgId,
  });

  const workers = (workersQuery.data ?? []).filter((w) =>
    filter ? filter(w) : true,
  );

  if (!isLoggedIn) {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>Organizacija</div>
        <div className={styles.hint}>
          <p className={styles.hintText}>
            Prijavite se da pristupite sačuvanim organizacijama i radnicima.
            Forma desno funkcioniše i bez prijave, možete unijeti podatke
            ručno i koristiti kalkulator.
          </p>
          <Link href="/registracija" className={styles.hintBtnPrimary}>
            Registruj se besplatno →
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>Organizacija</div>
      <div className={styles.orgWrap}>
        <OrgSelect
          value={selectedOrgId}
          onChange={(v) => {
            onOrgChange(v);
            onWorkerSelect(null, null);
          }}
          ownOrgs={orgsQuery.data ?? []}
          clientOrgs={canSeeClients ? (clientOrgsQuery.data ?? []) : []}
          getLabel={orgLabel}
        />
      </div>

      {!orgsQuery.isLoading &&
        (orgsQuery.data?.length ?? 0) === 0 &&
        (clientOrgsQuery.data?.length ?? 0) === 0 && (
        <div className={styles.hint}>
          <p className={styles.hintText}>{noOrgsHint}</p>
          <Link href="/profil?novaOrg=1" className={styles.hintBtnPrimary}>
            Dodaj djelatnost →
          </Link>
        </div>
      )}

      <div className={styles.sidebarHeader}>Radnici</div>

      {enableQuickAdd && selectedOrgId && canCreateWorker && (
        <button
          type="button"
          className={styles.quickAddBtn}
          onClick={() => setQuickAddOpen(true)}
        >
          + Novi radnik
        </button>
      )}
      {enableQuickAdd && selectedOrgId && !canCreateWorker && (
        <Link href="/pretplate" className={styles.upgradeHint}>
          🔒 Dodavanje radnika uz <strong>Pro</strong> pretplatu →
        </Link>
      )}

      {!selectedOrgId && (
        <div className={styles.empty}>
          {(orgsQuery.data?.length ?? 0) === 0
            ? "Prvo dodajte djelatnost."
            : "Odaberite organizaciju."}
        </div>
      )}
      {selectedOrgId && workersQuery.isLoading && (
        <div className={styles.empty}><LoadState compact text="Učitavam radnike..." /></div>
      )}
      {selectedOrgId &&
        !workersQuery.isLoading &&
        workers.length === 0 && (
          <div className={styles.empty}>Nema radnika za prikaz.</div>
        )}
      {selectedOrgId && workers.length > 0 && (
        <div className={styles.list}>
          {workers.map((w) => {
            const isActive = selectedWorkerId === w.id;
            const status = statusFor(w);
            return (
              <div key={w.id} className={styles.itemWrap}>
                <button
                  type="button"
                  className={`${styles.item}${isActive ? ` ${styles.itemActive}` : ""}`}
                  onClick={() => {
                    if (selectedWorkerId === w.id) {
                      onWorkerSelect(null, null);
                    } else {
                      onWorkerSelect(w.id, w);
                    }
                  }}
                >
                  <span className={`${styles.dot} ${DOT_CLASS[status.dot]}`} />
                  <span className={styles.name}>{workerLabel(w)}</span>
                  {status.badge && (
                    <span className={styles.badge}>{status.badge}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedOrgId && (
        <div className={styles.hint}>
          <p className={styles.hintText}>{bottomHint}</p>
          <div className={styles.hintLinks}>
            <Link
              href={`/aktivni-radnici${selectedOrgId ? `?org=${selectedOrgId}` : ""}`}
              className={styles.hintBtn}
            >
              Svi aktivni radnici
            </Link>
            <Link
              href={`/organizacija/${selectedOrgId}`}
              className={styles.hintBtn}
            >
              Otvori djelatnost
            </Link>
          </div>
        </div>
      )}

      {/* Puna PK forma radnika (ista kao na zaposlenicima/organizaciji);
          nakon snimanja novi radnik se odmah selektuje u listi. */}
      {quickAddOpen && selectedOrgId && (
        <WorkerModal
          key="sidebar-new"
          orgId={selectedOrgId}
          orgType={
            [...(orgsQuery.data ?? []), ...(clientOrgsQuery.data ?? [])].find(
              (o) => o.id === selectedOrgId,
            )?.type ?? null
          }
          worker={null}
          onClose={() => setQuickAddOpen(false)}
          onSaved={(w) => onWorkerSelect(w.id, w)}
        />
      )}
    </aside>
  );
}
