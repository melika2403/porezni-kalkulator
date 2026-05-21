"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getClientOrganizations,
  getOrganizations,
  getWorkers,
  type Worker,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import { useRole } from "src/hooks/useRole";
import { useLastOrg } from "src/hooks/useLastOrg";
import QuickAddWorkerModal from "src/components/WorkersSidebar/QuickAddWorkerModal";
import PreviewRegisterGate from "src/components/PreviewRegisterGate/PreviewRegisterGate";
import RadniciTabBar from "src/components/RadniciTabBar/RadniciTabBar";
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
  const canSeeClients = hasRole("PRO", "BUSINESS", "ADMIN");

  const searchParams = useSearchParams();
  const { lastOrgId, setLastOrgId } = useLastOrg();

  const urlOrg = (() => {
    const v = searchParams.get("org");
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const [orgId, setOrgId] = useState<number | null>(urlOrg ?? lastOrgId ?? null);
  const [filter, setFilter] = useState<Filter>("svi");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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

  // Auto-select first available org (own first, then client) — samo ako nemamo
  // ni URL ni zapamcen orgId.
  if (orgId === null) {
    if ((orgsQuery.data?.length ?? 0) > 0 && orgsQuery.data?.[0]) {
      setOrgId(orgsQuery.data[0].id);
    } else if ((clientOrgsQuery.data?.length ?? 0) > 0 && clientOrgsQuery.data?.[0]) {
      setOrgId(clientOrgsQuery.data[0].id);
    }
  }

  // Perzistira odabranu organizaciju u localStorage tako da JS3100, Obračun
  // plata i Ugovor o radu otvore istu organizaciju.
  useEffect(() => {
    if (orgId != null) setLastOrgId(orgId);
  }, [orgId, setLastOrgId]);

  const workersQuery = useQuery({
    queryKey: ["workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId!)),
    enabled: !!orgId,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const allWorkers = workersQuery.data ?? [];
  // Uključi i RADNIK i VLASNIK (vlasnici se prepoznaju po roli i imaju badge).
  // Sort:
  //   1) Odjavljeni uvijek na dno (bez obzira kad su prijavljeni)
  //   2) Po datumu prijave ASC (najstariji prijavljen radnik gore)
  //   3) Po datumu kreiranja ASC (tiebreak)
  const radnici = [...allWorkers].sort((a, b) => {
    const aOff = a.employmentStatus === "ODJAVLJEN" ? 1 : 0;
    const bOff = b.employmentStatus === "ODJAVLJEN" ? 1 : 0;
    if (aOff !== bOff) return aOff - bOff;
    const aDate = a.prijavaDate || "9999-12-31";
    const bDate = b.prijavaDate || "9999-12-31";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });

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
      <PreviewRegisterGate
        pageLabel="Radnici"
        pageTitle={<>Aktivni <em>radnici</em></>}
        pageSubtitle="Centralni pregled radnika i vlasnika obrta sa statusom prijave kod PIO/ZZO, ugovornim podacima i brzim akcijama."
        featureName="aktivnih radnika"
        previewDesc="dodavati radnike i vlasnike, vidjeti njihov status, ugovore i historiju dokumenata"
        proUnlocks="Generisanje JS3100 prijave/odjave i ugovora o radu"
      />
    );
  }

  return (
    <>
    <RadniciTabBar />
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
            {(orgsQuery.data?.length ?? 0) > 0 && (
              <optgroup label="Moje organizacije">
                {orgsQuery.data!.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </optgroup>
            )}
            {canSeeClients && (clientOrgsQuery.data?.length ?? 0) > 0 && (
              <optgroup label="Klijentske organizacije">
                {clientOrgsQuery.data!.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </optgroup>
            )}
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
                    <td data-label="Status">
                      <span
                        className={`${styles.badge} ${STATUS_CLASS[w.employmentStatus] ?? styles.badgeDraft}`}
                      >
                        {STATUS_LABEL[w.employmentStatus] ?? w.employmentStatus}
                      </span>
                    </td>
                    <td className={styles.nameCell} data-label="Ime i prezime">
                      <Link
                        href={`/aktivni-radnici/${w.id}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {w.firstName} {w.lastName}
                      </Link>
                      {w.role === "VLASNIK" && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: "2px 7px",
                            background: "rgba(58, 92, 66, 0.12)",
                            color: "var(--sage)",
                            borderRadius: 999,
                            fontSize: 10.5,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            verticalAlign: "middle",
                          }}
                        >
                          Vlasnik
                        </span>
                      )}
                    </td>
                    <td className={styles.muted} data-label="JMBG">{w.jmbg ?? "—"}</td>
                    <td data-label="Pozicija">{w.position ?? "—"}</td>
                    <td className={styles.num} data-label="Bruto plata">{fmtPlata(w.salaryBruto)}</td>
                    <td className={styles.muted} data-label="Datum prijave">{fmtDate(w.prijavaDate)}</td>
                    <td data-label="Akcije">
                      <div className={styles.actions}>
                        <Link
                          href={`/ugovor-o-radu?org=${orgId}&worker=${w.id}&tab=ugovor`}
                          className={styles.actionLink}
                          title="Generiši ugovor o radu — auto-popuna podataka"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="14"
                            height="14"
                            aria-hidden="true"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                          Ugovor
                        </Link>
                        {w.employmentStatus === "PRIJAVLJEN" && (
                          <Link
                            href={`/ugovor-o-radu?org=${orgId}&worker=${w.id}&tab=otkaz`}
                            className={styles.actionLink}
                            title="Generiši otkaz — auto-popuna podataka"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              width="14"
                              height="14"
                              aria-hidden="true"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Otkaz
                          </Link>
                        )}
                        <Link
                          href={`/prijave-radnika?org=${orgId}&worker=${w.id}&vrsta=${
                            w.employmentStatus === "PRIJAVLJEN" ? "ODJAVA" : "PRIJAVA"
                          }`}
                          className={styles.actionLink}
                          title="JS3100 prijava/odjava — auto-popuna"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="14"
                            height="14"
                            aria-hidden="true"
                          >
                            <rect x="8" y="2" width="8" height="4" rx="1" />
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <line x1="8" y1="11" x2="16" y2="11" />
                            <line x1="8" y1="15" x2="14" y2="15" />
                          </svg>
                          JS3100
                        </Link>
                        <Link
                          href={`/organizacija/${orgId}`}
                          className={styles.actionLink}
                          title="Uredi radnika"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="14"
                            height="14"
                            aria-hidden="true"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
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
    </>
  );
}
