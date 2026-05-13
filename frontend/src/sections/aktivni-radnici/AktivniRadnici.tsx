"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getOrganizations,
  getWorkers,
  type Worker,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import { useRole } from "src/hooks/useRole";
import QuickAddWorkerModal from "src/components/WorkersSidebar/QuickAddWorkerModal";
import styles from "./aktivniRadnici.module.css";

type Filter = "svi" | "prijavljeni" | "draft" | "odjavljeni";

const STATUS_LABEL: Record<string, string> = {
  PRIJAVLJEN: "Prijavljen",
  DRAFT: "Draft",
  ODJAVLJEN: "Odjavljen",
};

const STATUS_CLASS: Record<string, string> = {
  PRIJAVLJEN: styles.badgeActive,
  DRAFT: styles.badgeDraft,
  ODJAVLJEN: styles.badgeInactive,
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
}

function fmtPlata(n: number | null): string {
  if (n == null) return "—";
  return (
    n.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " KM"
  );
}

export default function AktivniRadnici() {
  const { role, hasRole } = useRole();
  const isLoggedIn = role !== null;
  const canCreateWorker = hasRole("PRO", "BUSINESS", "ADMIN");

  const [orgId, setOrgId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("svi");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const orgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
    enabled: isLoggedIn,
  });

  // Auto-select first org if not selected
  if (orgId === null && (orgsQuery.data?.length ?? 0) > 0 && orgsQuery.data?.[0]) {
    setOrgId(orgsQuery.data[0].id);
  }

  const workersQuery = useQuery({
    queryKey: ["workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId!)),
    enabled: !!orgId,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const allWorkers = workersQuery.data ?? [];
  // Filter samo RADNIK (ne VLASNIK)
  const radnici = allWorkers.filter((w) => w.role === "RADNIK");

  const filtered = radnici.filter((w) => {
    if (filter === "svi") return true;
    if (filter === "prijavljeni") return w.employmentStatus === "PRIJAVLJEN";
    if (filter === "draft") return w.employmentStatus === "DRAFT";
    if (filter === "odjavljeni") return w.employmentStatus === "ODJAVLJEN";
    return true;
  });

  const counts = {
    svi: radnici.length,
    prijavljeni: radnici.filter((w) => w.employmentStatus === "PRIJAVLJEN").length,
    draft: radnici.filter((w) => w.employmentStatus === "DRAFT").length,
    odjavljeni: radnici.filter((w) => w.employmentStatus === "ODJAVLJEN").length,
  };

  if (!isLoggedIn) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <p className={styles.label}>Radnici</p>
          <h1 className={styles.h1}>Aktivni <em>radnici</em></h1>
        </div>
        <div className={styles.gate}>
          <div className={styles.gateIcon}>🔒</div>
          <h2>Prijavi se da bi vidio listu radnika</h2>
          <p>Radnici se vežu za organizaciju u tvom profilu.</p>
          <Link href="/prijava" className={styles.btnPrimary}>Prijavi se →</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Radnici</p>
        <h1 className={styles.h1}>
          Aktivni <em>radnici</em>
        </h1>
        <p className={styles.subtitle}>
          Pregled svih radnika sa statusom prijave kod PIO/ZZO, ugovornim podacima
          i brzim akcijama za generisanje ugovora ili otkaza.
        </p>
      </div>

      {/* Org selector + Quick add */}
      <div className={styles.controlsBar}>
        <label className={styles.orgPicker}>
          <span>Organizacija</span>
          <select
            className={styles.input}
            value={orgId ?? ""}
            onChange={(e) => setOrgId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— Odaberi —</option>
            {orgsQuery.data?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        {orgId && canCreateWorker && (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setQuickAddOpen(true)}
          >
            + Novi radnik
          </button>
        )}
        {orgId && !canCreateWorker && (
          <Link href="/pretplate" className={styles.upgradeChip}>
            🔒 Dodavanje radnika uz Pro pretplatu →
          </Link>
        )}
      </div>

      {/* Filter chips */}
      {orgId && (
        <div className={styles.filterChips}>
          {(["svi", "prijavljeni", "draft", "odjavljeni"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.chip} ${filter === f ? styles.chipActive : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "svi" ? "Svi" : f.charAt(0).toUpperCase() + f.slice(1)}{" "}
              <span className={styles.chipCount}>{counts[f]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Workers table */}
      {orgId && (
        <div className={styles.tableWrap}>
          {workersQuery.isLoading ? (
            <div className={styles.empty}>Učitavam radnike…</div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              {radnici.length === 0
                ? canCreateWorker
                  ? "Nema dodanih radnika. Koristi '+ Novi radnik' da dodaš prvog."
                  : "Nema dodanih radnika. Dodavanje radnika dostupno uz Pro pretplatu."
                : "Nijedan radnik ne odgovara filteru."}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Ime i prezime</th>
                  <th>JMBG</th>
                  <th>Pozicija</th>
                  <th>Bruto plata</th>
                  <th>Datum prijave</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w: Worker) => (
                  <tr key={w.id}>
                    <td>
                      <span
                        className={`${styles.badge} ${STATUS_CLASS[w.employmentStatus] ?? styles.badgeDraft}`}
                      >
                        {STATUS_LABEL[w.employmentStatus] ?? w.employmentStatus}
                      </span>
                    </td>
                    <td className={styles.nameCell}>
                      <Link
                        href={`/aktivni-radnici/${w.id}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {w.firstName} {w.lastName}
                      </Link>
                    </td>
                    <td className={styles.muted}>{w.jmbg ?? "—"}</td>
                    <td>{w.position ?? "—"}</td>
                    <td className={styles.num}>{fmtPlata(w.salaryBruto)}</td>
                    <td className={styles.muted}>{fmtDate(w.prijavaDate)}</td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          href={`/ugovor-o-radu?org=${orgId}&worker=${w.id}&tab=ugovor`}
                          className={styles.actionLink}
                          title="Generiši ugovor o radu — auto-popuna podataka"
                        >
                          📄 Ugovor
                        </Link>
                        {w.employmentStatus === "PRIJAVLJEN" && (
                          <Link
                            href={`/ugovor-o-radu?org=${orgId}&worker=${w.id}&tab=otkaz`}
                            className={styles.actionLink}
                            title="Generiši otkaz — auto-popuna podataka"
                          >
                            ❌ Otkaz
                          </Link>
                        )}
                        <Link
                          href={`/prijave-radnika?org=${orgId}&worker=${w.id}&vrsta=${
                            w.employmentStatus === "PRIJAVLJEN" ? "ODJAVA" : "PRIJAVA"
                          }`}
                          className={styles.actionLink}
                          title="JS3100 prijava/odjava — auto-popuna"
                        >
                          📋 JS3100
                        </Link>
                        <Link
                          href={`/organizacija/${orgId}`}
                          className={styles.actionLink}
                          title="Uredi radnika"
                        >
                          ✏️ Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {quickAddOpen && orgId && (
        <QuickAddWorkerModal
          orgId={orgId}
          onClose={() => setQuickAddOpen(false)}
          onCreated={() => setQuickAddOpen(false)}
        />
      )}
    </main>
  );
}
