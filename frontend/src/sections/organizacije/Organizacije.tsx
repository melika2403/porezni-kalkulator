"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  getOrganizationsWithPayrollStatus,
  type OrganizationWithPayrollStatus,
  type OrgPayrollStatus,
} from "src/api/profile";
import { markMonthPaid } from "src/api/payroll";
import PreviewRegisterGate from "src/components/PreviewRegisterGate/PreviewRegisterGate";
import { useNotice } from "src/components/Notice/Notice";
import RowActionsMenu, {
  type RowPrimaryAction,
  type RowMenuItem,
} from "src/components/RowActionsMenu/RowActionsMenu";
import styles from "./organizacije.module.css";

const MONTHS = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "August",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

const STATUS_LABEL: Record<OrgPayrollStatus, string> = {
  no_workers: "Nema radnika",
  none: "Nije obračunato",
  partial: "Djelimično",
  obracunato: "Obračunato",
  isplaceno: "Isplaćeno",
};

const STATUS_CLASS: Record<OrgPayrollStatus, string> = {
  no_workers: styles.statusNoWorkers,
  none: styles.statusNone,
  partial: styles.statusPartial,
  obracunato: styles.statusObracunato,
  isplaceno: styles.statusIsplaceno,
};

type TypeFilter = "svi" | "COMPANY" | "BUSINESS";
type SortKey =
  | "naziv"
  | "radnika"
  | "datum"
  | "status_paid_first"
  | "status_unpaid_first";
type StatusFilter = "all" | "todo" | "obracunato" | "isplaceno";

const STATUS_RANK_PAID_FIRST: Record<OrgPayrollStatus, number> = {
  isplaceno: 0,
  obracunato: 1,
  partial: 2,
  none: 3,
  no_workers: 4,
};

const STATUS_RANK_UNPAID_FIRST: Record<OrgPayrollStatus, number> = {
  none: 0,
  partial: 1,
  obracunato: 2,
  isplaceno: 3,
  no_workers: 4,
};

export default function Organizacije() {
  const userQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });
  const isLoggedIn = !!userQuery.data;
  const queryClient = useQueryClient();
  const { notify } = useNotice();

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("svi");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("naziv");
  const [search, setSearch] = useState("");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  // Bulk obračun stanje: confirm modal + progress + per-org rezultat.
  const [bulkCalcConfirmOpen, setBulkCalcConfirmOpen] = useState(false);
  const [bulkCalcRunning, setBulkCalcRunning] = useState(false);
  const [bulkCalcProgress, setBulkCalcProgress] = useState<{
    current: number;
    total: number;
    name: string;
  } | null>(null);
  const [bulkCalcResults, setBulkCalcResults] = useState<
    Array<{
      organizationId: number;
      organizationName: string;
      calculated: number;
      skipped: number;
      skippedNames: string[];
      warnings: string[];
      error?: string;
    }>
  >([]);

  const statusQuery = useQuery({
    queryKey: ["organizationsPayrollStatus", year, month],
    queryFn: () => unwrap(getOrganizationsWithPayrollStatus(year, month)),
    enabled: isLoggedIn,
  });

  const yearOptions = useMemo(
    () => [now.getFullYear() + 1, now.getFullYear()],
    [now],
  );

  const matchesStatusFilter = (o: OrganizationWithPayrollStatus): boolean => {
    if (statusFilter === "all") return true;
    if (statusFilter === "todo")
      return o.payrollStatus === "none" || o.payrollStatus === "partial";
    if (statusFilter === "obracunato") return o.payrollStatus === "obracunato";
    if (statusFilter === "isplaceno") return o.payrollStatus === "isplaceno";
    return true;
  };

  const filterAndSort = (
    list: OrganizationWithPayrollStatus[],
  ): OrganizationWithPayrollStatus[] => {
    let out = list;
    if (typeFilter !== "svi") out = out.filter((o) => o.type === typeFilter);
    out = out.filter(matchesStatusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.taxNumber || "").toLowerCase().includes(q) ||
          (o.city || "").toLowerCase().includes(q),
      );
    }
    out = [...out].sort((a, b) => {
      if (sortKey === "naziv") return a.name.localeCompare(b.name, "bs");
      if (sortKey === "radnika") return b.workerCount - a.workerCount;
      if (sortKey === "status_paid_first") {
        const ra = STATUS_RANK_PAID_FIRST[a.payrollStatus];
        const rb = STATUS_RANK_PAID_FIRST[b.payrollStatus];
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name, "bs");
      }
      if (sortKey === "status_unpaid_first") {
        const ra = STATUS_RANK_UNPAID_FIRST[a.payrollStatus];
        const rb = STATUS_RANK_UNPAID_FIRST[b.payrollStatus];
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name, "bs");
      }
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
    return out;
  };

  const ownAll = statusQuery.data?.own ?? [];
  const clientsAll = statusQuery.data?.clients ?? [];
  // allOrgs spojeno gore, prije early return-a, da useMemo hookovi ispod
  // uvijek pozovu (React rules-of-hooks zahtijeva isti redoslijed hookova).
  const allOrgs = [...ownAll, ...clientsAll];

  // ── Stats (uvijek pozivati useMemo prije bilo kakvog return-a) ────────────
  const stats = useMemo(() => {
    const totalOrgs = allOrgs.length;
    const orgsWithWorkers = allOrgs.filter((o) => o.workerCount > 0).length;
    const totalWorkers = allOrgs.reduce((a, o) => a + o.workerCount, 0);
    const obracunato = allOrgs.filter(
      (o) =>
        o.payrollStatus === "obracunato" || o.payrollStatus === "isplaceno",
    ).length;
    const isplaceno = allOrgs.filter(
      (o) => o.payrollStatus === "isplaceno",
    ).length;
    return { totalOrgs, orgsWithWorkers, totalWorkers, obracunato, isplaceno };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrgs.length, statusQuery.data]);

  // ── Status filter chip counts ─────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const visible = allOrgs.filter(
      (o) => typeFilter === "svi" || o.type === typeFilter,
    );
    return {
      all: visible.length,
      todo: visible.filter(
        (o) => o.payrollStatus === "none" || o.payrollStatus === "partial",
      ).length,
      obracunato: visible.filter((o) => o.payrollStatus === "obracunato")
        .length,
      isplaceno: visible.filter((o) => o.payrollStatus === "isplaceno").length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrgs.length, typeFilter, statusQuery.data]);

  // ── Bulk obračun plata za sve org-e ────────────────────────────────────────
  // VAŽNO: useMemo MORA biti prije early return-a inače React rules-of-hooks
  // baca "change in order of hooks" grešku.
  // Kandidati: sve org-e koje JOŠ nisu potpuno obračunate u trenutnom mjesecu.
  // "obracunato" i "isplaceno" preskačemo (već gotovi). "no_workers" obrt
  // org-e idu da bismo obračunali vlasnika (2002).
  const bulkCalcCandidates = useMemo(() => {
    return allOrgs.filter((o) => {
      if (o.payrollStatus === "obracunato" || o.payrollStatus === "isplaceno") {
        return false; // već je obračunato
      }
      if (o.payrollStatus === "no_workers" && o.type !== "BUSINESS") {
        return false; // d.o.o. bez radnika, ništa za obračunati
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrgs.length, statusQuery.data]);

  if (!isLoggedIn) {
    return (
      <PreviewRegisterGate
        pageLabel="Organizacije"
        pageTitle={
          <>
            <em>Organizacije</em> i klijenti
          </>
        }
        pageSubtitle="Centralni pregled svih organizacija sa statusom obračunatih plata po mjesecu i brzim akcijama."
        featureName="pregleda organizacija"
        previewDesc="vidjeti sve organizacije i status plata na jednom mjestu"
        proUnlocks="Pregled klijentskih organizacija"
      />
    );
  }

  const own = filterAndSort(ownAll);
  const clients = filterAndSort(clientsAll);
  const hasAnyOrg = allOrgs.length > 0;

  // ── Bulk: označi sve obračunate kao isplaćene za odabrani mjesec ──────────
  const bulkMarkPaidCandidates = allOrgs.filter(
    (o) => o.payrollStatus === "obracunato",
  );

  const runBulkMarkPaid = async () => {
    setBulkRunning(true);
    let okCount = 0;
    let failCount = 0;
    for (const o of bulkMarkPaidCandidates) {
      try {
        const r = await markMonthPaid({
          organizationId: o.id,
          year,
          month,
        });
        if (r.ok) okCount += 1;
        else failCount += 1;
      } catch {
        failCount += 1;
      }
    }
    setBulkRunning(false);
    setBulkConfirmOpen(false);
    queryClient.invalidateQueries({
      queryKey: ["organizationsPayrollStatus", year, month],
    });
    if (failCount === 0) {
      notify(`Označeno ${okCount} org. kao isplaćeno`, "success");
    } else {
      notify(
        `Označeno ${okCount} uspješno, ${failCount} neuspješno`,
        "warning",
      );
    }
  };

  const runBulkCalc = async () => {
    setBulkCalcRunning(true);
    setBulkCalcResults([]);
    // Lazy-load shared helper da ne uvećavamo bundle za korisnike bez ove akcije.
    const { obracunOrgPayrolls } = await import(
      "src/sections/prijave-radnika/obracunOrgPayrolls"
    );
    const total = bulkCalcCandidates.length;
    const results: typeof bulkCalcResults = [];
    for (let i = 0; i < total; i++) {
      const o = bulkCalcCandidates[i];
      setBulkCalcProgress({ current: i + 1, total, name: o.name });
      try {
        const r = await obracunOrgPayrolls({
          org: o,
          year,
          month,
        });
        results.push(r);
      } catch (e) {
        results.push({
          organizationId: o.id,
          organizationName: o.name,
          calculated: 0,
          skipped: 0,
          skippedNames: [],
          warnings: [],
          error: (e as Error)?.message ?? "Neočekivana greška",
        });
      }
    }
    setBulkCalcResults(results);
    setBulkCalcRunning(false);
    setBulkCalcProgress(null);
    // Refresh status, pregled mora reflektovati nove payroll-e.
    queryClient.invalidateQueries({
      queryKey: ["organizationsPayrollStatus", year, month],
    });
    const totalCalculated = results.reduce((a, r) => a + r.calculated, 0);
    const totalSkipped = results.reduce((a, r) => a + r.skipped, 0);
    const totalErrors = results.filter((r) => r.error).length;
    if (totalErrors === 0 && totalSkipped === 0) {
      notify(
        `Obračunato ${totalCalculated} radnik(a) u ${total} org.`,
        "success",
      );
    } else {
      notify(
        `Obračunato ${totalCalculated}, preskočeno ${totalSkipped}, grešaka ${totalErrors}`,
        "warning",
      );
    }
  };

  // ── CSV export ─────────────────────────────────────────────────────────────
  const exportCsv = () => {
    const headers = [
      "Naziv",
      "Vlasnik",
      "Tip",
      "Broj radnika",
      "JIB",
      "Šifra djelatnosti",
      "Grad",
      "Status plata",
      "Obračunato (broj radnika)",
      "Isplaćeno (broj radnika)",
      "Sekcija",
    ];
    const esc = (v: string | number | null | undefined) => {
      const s = String(v ?? "");
      if (/[";\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows: string[] = [headers.map(esc).join(";")];
    const writeRow = (
      o: OrganizationWithPayrollStatus,
      section: "Moja" | "Klijent",
    ) => {
      const vlasnik = o.owner
        ? `${o.owner.firstName ?? ""} ${o.owner.lastName ?? ""}`.trim()
        : "";
      rows.push(
        [
          o.name,
          vlasnik,
          o.type === "COMPANY" ? "D.o.o." : "Obrt",
          o.workerCount,
          o.taxNumber || "",
          o.activityCode || "",
          o.city || "",
          STATUS_LABEL[o.payrollStatus],
          o.payrollObracunato,
          o.payrollIsplaceno,
          section,
        ]
          .map(esc)
          .join(";"),
      );
    };
    for (const o of own) writeRow(o, "Moja");
    for (const o of clients) writeRow(o, "Klijent");
    const bom = "﻿"; // UTF-8 BOM da Excel pravilno prepozna karakter encoding
    const blob = new Blob([bom + rows.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `organizacije-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Pregled</p>
        <h1 className={styles.h1}>
          <em>Organizacije</em> i klijenti
        </h1>
        <p className={styles.subtitle}>
          Pregled svih vaših organizacija i klijentskih organizacija na jednom
          mjestu, sa statusom obračunatih plata za odabrani mjesec, brojem
          radnika i brzim akcijama.
        </p>
      </div>

      {/* Stats kartice */}
      {hasAnyOrg && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Organizacija</span>
            <span className={styles.statValue}>{stats.totalOrgs}</span>
            <span className={styles.statHint}>
              {ownAll.length} mojih + {clientsAll.length} klijenata
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Ukupno radnika</span>
            <span className={styles.statValue}>{stats.totalWorkers}</span>
            <span className={styles.statHint}>aktivnih u svim org.</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Plate obračunate</span>
            <span className={styles.statValue}>
              {stats.obracunato}
              <em> / {stats.orgsWithWorkers}</em>
            </span>
            <span className={styles.statHint}>
              org. sa kompletnim obračunom za {MONTHS[month - 1].toLowerCase()}
            </span>
            <span className={styles.statBar} aria-hidden="true">
              <span
                className={styles.statBarFill}
                style={{
                  width: `${
                    stats.orgsWithWorkers
                      ? Math.round(
                          (stats.obracunato / stats.orgsWithWorkers) * 100,
                        )
                      : 0
                  }%`,
                }}
              />
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Plate isplaćene</span>
            <span className={styles.statValue}>
              {stats.isplaceno}
              <em> / {stats.orgsWithWorkers}</em>
            </span>
            <span className={styles.statHint}>
              org. sa označenim isplatama
            </span>
            <span className={styles.statBar} aria-hidden="true">
              <span
                className={styles.statBarFill}
                style={{
                  width: `${
                    stats.orgsWithWorkers
                      ? Math.round(
                          (stats.isplaceno / stats.orgsWithWorkers) * 100,
                        )
                      : 0
                  }%`,
                }}
              />
            </span>
          </div>
        </div>
      )}

      {/* Filter / sort bar */}
      <div className={styles.controlsBar}>
        <div className={styles.fieldGroup}>
          <label htmlFor="mjesec">Mjesec</label>
          <select
            id="mjesec"
            className={styles.input}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="godina">Godina</label>
          <select
            id="godina"
            className={styles.input}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}.
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="tip">Tip</label>
          <select
            id="tip"
            className={styles.input}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          >
            <option value="svi">Sve</option>
            <option value="COMPANY">Privredno društvo</option>
            <option value="BUSINESS">Obrt / Samostalna djelatnost</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="sort">Sortiraj po</label>
          <select
            id="sort"
            className={styles.input}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="naziv">Naziv (A–Z)</option>
            <option value="radnika">Broju radnika</option>
            <option value="datum">Datumu kreiranja</option>
            <option value="status_paid_first">
              Status plata: isplaćeno prvo
            </option>
            <option value="status_unpaid_first">
              Status plata: neobračunate prvo
            </option>
          </select>
        </div>
        <div className={`${styles.fieldGroup} ${styles.search}`}>
          <label htmlFor="search">Pretraga</label>
          <input
            id="search"
            className={styles.input}
            type="text"
            placeholder="Naziv, JIB ili grad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Quick status filter chips */}
      {hasAnyOrg && (
        <div className={styles.statusChips}>
          {(
            [
              ["all", "Sve"],
              ["todo", "Treba obračunati"],
              ["obracunato", "Obračunato (čeka isplatu)"],
              ["isplaceno", "Isplaćeno"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`${styles.statusChip} ${
                statusFilter === key ? styles.statusChipActive : ""
              }`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
              <span className={styles.statusChipCount}>
                {statusCounts[key]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Bulk akcije: glavna akcija lijevo (Obračunaj sve plate, ispunjen
          sage style), utility akcije desno (Export, Označi isplaćene). */}
      {hasAnyOrg && (
        <div className={styles.bulkBar}>
          <button
            type="button"
            className={`${styles.btnBulk} ${styles.btnBulkPrimary}`}
            onClick={() => setBulkCalcConfirmOpen(true)}
            disabled={bulkCalcCandidates.length === 0 || bulkCalcRunning}
            title={
              bulkCalcCandidates.length === 0
                ? "Sve org. su već obračunate ili nemaju radnika"
                : `Obračunaj plate za ${bulkCalcCandidates.length} org.`
            }
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
              <path d="M14 4h6v6" />
              <path d="M10 14L20 4" />
              <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
            </svg>
            Obračunaj sve plate ({bulkCalcCandidates.length})
          </button>
          <div className={styles.bulkBarRight}>
            <button
              type="button"
              className={styles.btnBulk}
              onClick={exportCsv}
              disabled={!hasAnyOrg}
              title="Eksportuj listu u CSV (otvoriti u Excel/LibreOffice)"
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
            <button
              type="button"
              className={styles.btnBulk}
              onClick={() => setBulkConfirmOpen(true)}
              disabled={bulkMarkPaidCandidates.length === 0 || bulkRunning}
              title={
                bulkMarkPaidCandidates.length === 0
                  ? "Nema obračunatih org. spremnih za označavanje"
                  : `Označi ${bulkMarkPaidCandidates.length} org. kao isplaćeno`
              }
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
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Označi sve obračunate kao isplaćene ({bulkMarkPaidCandidates.length})
            </button>
          </div>
        </div>
      )}

      {/* Bulk confirm modal */}
      {bulkConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 26, 18, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => !bulkRunning && setBulkConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--white)",
              borderRadius: 12,
              padding: "1.5rem 1.75rem",
              maxWidth: 460,
              width: "100%",
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.18)",
            }}
          >
            <h3 style={{ margin: "0 0 0.6rem", fontSize: 18 }}>
              Označi sve kao isplaćeno?
            </h3>
            <p style={{ margin: "0 0 1rem", color: "var(--mid)", fontSize: 14 }}>
              Označit će se {bulkMarkPaidCandidates.length} org. (status{" "}
              <strong>Obračunato</strong>) za{" "}
              {MONTHS[month - 1]} {year}. Sve obračunate plate u tim org.
              prelaze u status <strong>Isplaćeno</strong>. Ova akcija nije
              automatski reverzibilna iz pregleda.
            </p>
            <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setBulkConfirmOpen(false)}
                disabled={bulkRunning}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid var(--border)",
                  background: "var(--white)",
                  color: "var(--ink)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Odustani
              </button>
              <button
                type="button"
                onClick={runBulkMarkPaid}
                disabled={bulkRunning}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid var(--sage)",
                  background: "var(--sage)",
                  color: "#fff",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                {bulkRunning ? "Označavam…" : "Da, označi sve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk obračun confirm modal, sa pregledom kandidata + warnings */}
      {bulkCalcConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 26, 18, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => !bulkCalcRunning && setBulkCalcConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--white)",
              borderRadius: 12,
              padding: "1.5rem 1.75rem",
              maxWidth: 580,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.18)",
            }}
          >
            {/* Pre-run: pregled kandidata sa warnings ─────────────────────── */}
            {!bulkCalcRunning && bulkCalcResults.length === 0 && (
              <>
                <h3 style={{ margin: "0 0 0.6rem", fontSize: 18 }}>
                  Obračunaj sve org. za {MONTHS[month - 1]} {year}?
                </h3>
                <p style={{ margin: "0 0 0.8rem", color: "var(--mid)", fontSize: 14 }}>
                  Obračunat će se{" "}
                  <strong>{bulkCalcCandidates.length} org.</strong> sekvencijalno.
                  Za svaku org-u koristi se isti default kao "Obračunaj sve" iz
                  modula plate (sihterica → standardni fond mjeseca, automatski
                  pro-rate za mid-month radnike).
                </p>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    maxHeight: 220,
                    overflowY: "auto",
                    marginBottom: "1rem",
                  }}
                >
                  {bulkCalcCandidates.map((o) => {
                    // Warnings pri pregledu, koristimo iste signale kao u
                    // postojećem status modelu.
                    const noWorkers = o.workerCount === 0;
                    const isObrt = o.type === "BUSINESS";
                    let warning = "";
                    if (noWorkers && isObrt) warning = "Samo vlasnik (2002)";
                    else if (noWorkers) warning = "Nema radnika, preskočiće se";
                    return (
                      <div
                        key={o.id}
                        style={{
                          padding: "0.45rem 0.7rem",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 13,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "0.6rem",
                        }}
                      >
                        <span>
                          <strong>{o.name}</strong>{" "}
                          <span style={{ color: "var(--mid)", fontSize: 12 }}>
                            · {o.workerCount} radnik(a)
                          </span>
                        </span>
                        {warning && (
                          <span
                            style={{
                              color: "#92400e",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ⚠ {warning}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setBulkCalcConfirmOpen(false)}
                    style={{
                      padding: "0.5rem 1rem",
                      border: "1px solid var(--border)",
                      background: "var(--white)",
                      color: "var(--ink)",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Odustani
                  </button>
                  <button
                    type="button"
                    onClick={runBulkCalc}
                    style={{
                      padding: "0.5rem 1rem",
                      border: "1px solid var(--sage)",
                      background: "var(--sage)",
                      color: "#fff",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 600,
                    }}
                  >
                    Pokreni obračun
                  </button>
                </div>
              </>
            )}

            {/* Running: progress feedback ─────────────────────────────────── */}
            {bulkCalcRunning && (
              <>
                <h3 style={{ margin: "0 0 0.8rem", fontSize: 18 }}>
                  Obračunavam… ({bulkCalcProgress?.current ?? 0} od{" "}
                  {bulkCalcProgress?.total ?? 0})
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: "var(--mid)" }}>
                  Trenutno: <strong>{bulkCalcProgress?.name ?? ""}</strong>
                </p>
                <div
                  style={{
                    marginTop: "1rem",
                    height: 8,
                    background: "var(--paper)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(
                        ((bulkCalcProgress?.current ?? 0) /
                          Math.max(1, bulkCalcProgress?.total ?? 1)) *
                          100,
                      )}%`,
                      height: "100%",
                      background: "var(--sage)",
                      transition: "width 0.25s",
                    }}
                  />
                </div>
              </>
            )}

            {/* Done: per-org rezultat ─────────────────────────────────────── */}
            {!bulkCalcRunning && bulkCalcResults.length > 0 && (
              <>
                <h3 style={{ margin: "0 0 0.8rem", fontSize: 18 }}>
                  Obračun završen
                </h3>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    maxHeight: 320,
                    overflowY: "auto",
                    marginBottom: "1rem",
                  }}
                >
                  {bulkCalcResults.map((r) => (
                    <div
                      key={r.organizationId}
                      style={{
                        padding: "0.6rem 0.8rem",
                        borderBottom: "1px solid var(--border)",
                        fontSize: 13,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {r.organizationName}
                      </div>
                      {r.error ? (
                        <div style={{ color: "#b91c1c", marginTop: 2 }}>
                          ❌ {r.error}
                        </div>
                      ) : (
                        <div style={{ marginTop: 2, color: "var(--mid)" }}>
                          ✓ Obračunato {r.calculated}
                          {r.skipped > 0 && (
                            <span style={{ color: "#92400e", marginLeft: 8 }}>
                              · Preskočeno {r.skipped}
                            </span>
                          )}
                          {r.warnings.length > 0 && (
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 12,
                                color: "#92400e",
                              }}
                            >
                              {r.warnings.map((w, i) => (
                                <div key={i}>⚠ {w}</div>
                              ))}
                            </div>
                          )}
                          {r.skippedNames.length > 0 && (
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 11,
                                color: "var(--mid)",
                              }}
                            >
                              Preskočeni: {r.skippedNames.join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkCalcConfirmOpen(false);
                      setBulkCalcResults([]);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      border: "1px solid var(--sage)",
                      background: "var(--sage)",
                      color: "#fff",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 600,
                    }}
                  >
                    Zatvori
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {statusQuery.isLoading && (
        <div className={styles.empty}>Učitavam organizacije…</div>
      )}

      {!statusQuery.isLoading && !hasAnyOrg && (
        <div className={styles.emptyOwn}>
          Još nemate dodanih organizacija. Možete ih dodati na{" "}
          <Link href="/profil">mom profilu</Link>.
        </div>
      )}

      {!statusQuery.isLoading && hasAnyOrg && (
        <>
          {/* Sekcija 1: Moje organizacije */}
          <div className={styles.sectionTitle}>
            Moje organizacije
            <span className={styles.sectionCount}>({ownAll.length})</span>
          </div>
          {ownAll.length === 0 ? (
            <div className={styles.emptyOwn}>
              Nemate dodanih vlastitih organizacija. Dodajte ih na{" "}
              <Link href="/profil">mom profilu</Link>.
            </div>
          ) : own.length === 0 ? (
            <div className={styles.empty}>
              Nijedna organizacija ne odgovara filteru.
            </div>
          ) : (
            <OrgsTable orgs={own} year={year} month={month} section="own" />
          )}

          {/* Sekcija 2: Klijentske organizacije */}
          {clientsAll.length > 0 && (
            <>
              <div className={styles.sectionTitle}>
                Klijentske organizacije
                <span className={styles.sectionCount}>
                  ({clientsAll.length})
                </span>
              </div>
              {clients.length === 0 ? (
                <div className={styles.empty}>
                  Nijedna klijentska organizacija ne odgovara filteru.
                </div>
              ) : (
                <OrgsTable
                  orgs={clients}
                  year={year}
                  month={month}
                  section="client"
                />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

function OrgsTable({
  orgs,
  year,
  month,
  section,
}: {
  orgs: OrganizationWithPayrollStatus[];
  year: number;
  month: number;
  section: "own" | "client";
}) {
  // Edit org → /profil sa parametrima: tab + editOrg id. Profile prepoznaje
  // ove parametre i auto-otvara edit formu za tu organizaciju.
  const editTab = section === "own" ? "djelatnosti" : "klijenti";
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>Vlasnik</th>
            <th>Tip</th>
            <th>Radnika</th>
            <th>JIB</th>
            <th>Šifra dj.</th>
            <th>Grad</th>
            <th>Status plata</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => {
            // Attention dot: org sa radnicima ali bez ijednog obračuna (crveno)
            // ili sa djelimičnim obračunom (žuto).
            const needsRed =
              o.workerCount > 0 && o.payrollStatus === "none";
            const needsYellow = o.payrollStatus === "partial";
            return (
              <tr key={o.id}>
                <td className={styles.nameCell} data-label="Naziv">
                  {(needsRed || needsYellow) && (
                    <span
                      className={`${styles.attentionDot} ${
                        needsRed ? styles.attentionDotRed : ""
                      }`}
                      title={
                        needsRed
                          ? "Plate još nisu obračunate"
                          : "Plate djelimično obračunate"
                      }
                    />
                  )}
                  <Link href={`/organizacija/${o.id}`}>{o.name}</Link>
                </td>
                <td className={styles.muted} data-label="Vlasnik">
                  {o.owner
                    ? `${o.owner.firstName ?? ""} ${o.owner.lastName ?? ""}`.trim() ||
                      "–"
                    : "–"}
                </td>
                <td data-label="Tip">
                  <span
                    className={`${styles.typeBadge} ${
                      o.type === "COMPANY"
                        ? styles.typeCompany
                        : styles.typeBusiness
                    }`}
                  >
                    {o.type === "COMPANY" ? "D.o.o." : "Obrt"}
                  </span>
                </td>
                <td className={styles.num} data-label="Radnika">
                  {o.workerCount}
                </td>
                <td className={styles.muted} data-label="JIB">
                  {o.taxNumber || "–"}
                </td>
                <td className={styles.muted} data-label="Šifra dj.">
                  {o.activityCode || "–"}
                </td>
                <td className={styles.muted} data-label="Grad">
                  {o.city || "–"}
                </td>
                <td data-label="Status plata">
                  <span
                    className={`${styles.statusBadge} ${STATUS_CLASS[o.payrollStatus]}`}
                  >
                    {STATUS_LABEL[o.payrollStatus]}
                  </span>
                  {(o.payrollStatus === "partial" ||
                    o.payrollStatus === "obracunato") && (
                    <span className={styles.statusDetail}>
                      {o.payrollObracunato}/{o.workerCount} obračunato
                      {o.payrollIsplaceno > 0
                        ? ` · ${o.payrollIsplaceno} isplaćeno`
                        : ""}
                    </span>
                  )}
                </td>
                <td data-label="Akcije">
                  <OrgRowActions
                    org={o}
                    year={year}
                    month={month}
                    editTab={editTab}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// OrgRowActions: red akcija za jednu organizaciju. Plate + Radnici su vidljivi,
// Obrasci (PLDI/MIP/GIP) i Uredi idu u overflow (kebab) meni. MIP/GIP rade
// direktan XML download (lazy-load buildera da ne uvećavamo bundle).
function OrgRowActions({
  org,
  year,
  month,
  editTab,
}: {
  org: OrganizationWithPayrollStatus;
  year: number;
  month: number;
  editTab: string;
}) {
  const [busy, setBusy] = useState<"mip" | "gip" | null>(null);
  const { notify } = useNotice();

  const triggerDownload = (xml: string, filename: string) => {
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const handleMipDownload = async () => {
    setBusy("mip");
    try {
      // Lazy-load builder + API klijente da ne uvećavamo bundle za korisnike
      // koji ne koriste obrasce. Tek pri prvom kliku.
      const [{ buildMip1023Xml }, { getWorkers }, { listPayrolls }] =
        await Promise.all([
          import("src/sections/prijave-radnika/mipXmlBuilder"),
          import("src/api/profile"),
          import("src/api/payroll"),
        ]);
      const [wRes, pRes] = await Promise.all([
        getWorkers(org.id),
        listPayrolls(org.id, year, month),
      ]);
      if (!wRes.ok) throw new Error(wRes.error || "Greška");
      if (!pRes.ok) throw new Error(pRes.error || "Greška");
      const result = buildMip1023Xml({
        workers: wRes.data,
        payrolls: pRes.data,
        organization: org,
        year,
        month,
      });
      if (!result.ok) {
        notify(`${org.name}: ${result.error}`, "error");
        return;
      }
      triggerDownload(result.xml, result.filename);
      // Fire-and-forget: zabilježi preuzimanje za status na PK Office početnoj.
      import("src/api/payroll").then(({ markMipDownloaded }) =>
        markMipDownloaded({ organizationId: org.id, year, month }),
      );
    } catch (e) {
      notify(
        `Greška pri generisanju MIP XML-a: ${(e as Error).message ?? e}`,
        "error",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleGipDownload = async () => {
    setBusy("gip");
    try {
      const { buildGip1022Xml } = await import(
        "src/sections/prijave-radnika/gipXmlBuilder"
      );
      const result = await buildGip1022Xml({
        orgId: org.id,
        year,
        organization: org,
      });
      if (!result.ok) {
        notify(`${org.name}: ${result.error}`, "error");
        return;
      }
      triggerDownload(result.xml, result.filename);
    } catch (e) {
      notify(
        `Greška pri generisanju GIP XML-a: ${(e as Error).message ?? e}`,
        "error",
      );
    } finally {
      setBusy(null);
    }
  };

  const primaryActions: RowPrimaryAction[] = [
    {
      key: "plate",
      label: "Plate",
      href: `/prijave-radnika?tab=obracun&org=${org.id}&year=${year}&month=${month}`,
      title: "Otvori obračun plata za ovu organizaciju",
      icon: (
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
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="8" y1="11" x2="8" y2="11" />
          <line x1="12" y1="11" x2="12" y2="11" />
          <line x1="16" y1="11" x2="16" y2="11" />
          <line x1="8" y1="15" x2="8" y2="15" />
          <line x1="12" y1="15" x2="12" y2="15" />
          <line x1="16" y1="15" x2="16" y2="15" />
          <line x1="8" y1="19" x2="16" y2="19" />
        </svg>
      ),
    },
    {
      key: "radnici",
      label: "Radnici",
      href: `/aktivni-radnici?org=${org.id}`,
      title: "Aktivni radnici za ovu organizaciju",
      icon: (
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
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];

  const menuItems: RowMenuItem[] = [
    { kind: "group", key: "g-radno", label: "Radno vrijeme" },
    {
      kind: "item",
      key: "sihterica",
      label: "Šihterica",
      sub: "Evidencija radnih sati",
      href: `/sihterica?org=${org.id}`,
    },
    { kind: "group", key: "g-obrasci", label: "Obrasci" },
    {
      kind: "item",
      key: "pldi",
      label: "PLDI-1043",
      sub: "Amortizacija (godišnje)",
      href: `/amortizacija?org=${org.id}`,
    },
    {
      kind: "item",
      key: "mip",
      label: "MIP-1023 XML",
      sub: `Mjesečni izvještaj, ${String(month).padStart(2, "0")}/${year}`,
      onClick: handleMipDownload,
      disabled: busy !== null,
    },
    {
      kind: "item",
      key: "gip",
      label: "GIP-1022 XML",
      sub: `Godišnji izvještaj, ${year}`,
      onClick: handleGipDownload,
      disabled: busy !== null,
    },
    { kind: "group", key: "g-org", label: "Organizacija" },
    {
      kind: "item",
      key: "uredi",
      label: "Uredi",
      sub: "Naziv, JIB, adresa",
      href: `/profil?tab=${editTab}&editOrg=${org.id}`,
    },
  ];

  return (
    <RowActionsMenu
      primaryActions={primaryActions}
      menuItems={menuItems}
      busy={busy !== null}
    />
  );
}
