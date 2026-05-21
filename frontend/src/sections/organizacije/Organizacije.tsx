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

  const ownAll = statusQuery.data?.own ?? [];
  const clientsAll = statusQuery.data?.clients ?? [];
  const own = filterAndSort(ownAll);
  const clients = filterAndSort(clientsAll);
  const allOrgs = [...ownAll, ...clientsAll];
  const hasAnyOrg = allOrgs.length > 0;

  // ── Stats ──────────────────────────────────────────────────────────────────
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
  }, [allOrgs]);

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
  }, [allOrgs, typeFilter]);

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
          mjestu — sa statusom obračunatih plata za odabrani mjesec, brojem
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
              Status plata — isplaćeno prvo
            </option>
            <option value="status_unpaid_first">
              Status plata — neobračunate prvo
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

      {/* Bulk akcije */}
      {hasAnyOrg && (
        <div className={styles.bulkBar}>
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
            Označi sve obračunate kao isplaćene ({bulkMarkPaidCandidates.length}
            )
          </button>
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
              {MONTHS[month - 1]} {year}. — sve obračunate plate u tim org.
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
          {/* Sekcija 1 — Moje organizacije */}
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

          {/* Sekcija 2 — Klijentske organizacije */}
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
  const editTab = section === "own" ? "profil" : "klijenti";
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
            // Attention dot — org sa radnicima ali bez ijednog obračuna (crveno)
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
                      "—"
                    : "—"}
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
                  {o.taxNumber || "—"}
                </td>
                <td className={styles.muted} data-label="Šifra dj.">
                  {o.activityCode || "—"}
                </td>
                <td className={styles.muted} data-label="Grad">
                  {o.city || "—"}
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
                  <div className={styles.actions}>
                    <Link
                      href={`/prijave-radnika?tab=obracun&org=${o.id}&year=${year}&month=${month}`}
                      className={styles.actionLink}
                      title="Otvori obračun plata za ovu organizaciju"
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
                      Plate
                    </Link>
                    <Link
                      href={`/aktivni-radnici?org=${o.id}`}
                      className={styles.actionLink}
                      title="Aktivni radnici za ovu organizaciju"
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
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Radnici
                    </Link>
                    <Link
                      href={`/profil?tab=${editTab}&editOrg=${o.id}`}
                      className={styles.actionLink}
                      title="Uredi podatke organizacije (naziv, JIB, adresa…)"
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
