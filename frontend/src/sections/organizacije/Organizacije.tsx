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
import EvidencijaModal from "./EvidencijaModal";
import PkOfficeSlotPanel from "./PkOfficeSlotPanel";
import RowActionsMenu, {
  type RowPrimaryAction,
  type RowMenuItem,
} from "src/components/RowActionsMenu/RowActionsMenu";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import styles from "./organizacije.module.css";
// PK Office tokeni + utility klase za .pk-scope blokove (stats, tabela)
import "src/styles/pk-embed.css";

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

// PK semantika: obračunato i isplaćeno zeleno, djelimično žuto,
// neobračunato crveno, bez radnika neutralno.
const STATUS_PK_CLASS: Record<OrgPayrollStatus, string> = {
  no_workers: "bg-cream-200 text-text-secondary",
  none: "bg-danger-bg text-danger",
  partial: "bg-warning-bg text-warning",
  obracunato: "bg-success-bg text-success",
  isplaceno: "bg-success-bg text-success",
};

// Bulk preuzimanje specifikacija 2001/2002: koje obrasce i kojim redoslijedom
// u spojenom PDF-u. "2001" uvijek uključuje i 2001-A (RS radnici).
type ObrasciFilter = "2001" | "2002" | "oba";
type ObrasciOrder = "po_org" | "prvo_2002" | "prvo_2001";

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
  // Bulk preuzimanje obrazaca 2001/2002: modal + izbor + progress.
  const [obrasciModalOpen, setObrasciModalOpen] = useState(false);
  const [obrasciFilter, setObrasciFilter] = useState<ObrasciFilter>("oba");
  const [obrasciOrder, setObrasciOrder] = useState<ObrasciOrder>("po_org");
  const [obrasciRunning, setObrasciRunning] = useState(false);
  const [obrasciProgress, setObrasciProgress] = useState<{
    current: number;
    total: number;
    name: string;
  } | null>(null);

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

  // ── Bulk preuzimanje obrazaca 2001/2002 ───────────────────────────────────
  // Org-e sa obračunatim (ili isplaćenim) platama za odabrani mjesec, abecedno.
  const obrasciCandidates = allOrgs
    .filter(
      (o) =>
        o.payrollStatus === "obracunato" || o.payrollStatus === "isplaceno",
    )
    .sort((a, b) => a.name.localeCompare(b.name, "bs"));

  const runBulkObrasci = async () => {
    setObrasciRunning(true);
    setObrasciProgress(null);
    try {
      // Lazy-load builderi + fill template-i + API klijenti da ne uvećavamo
      // bundle za korisnike koji ne koriste ovu akciju.
      const [
        spec,
        { fillObrazac2001Template },
        { fillObrazac2001ATemplate },
        { fillObrazac2002Template },
        { getWorkers },
        { listPayrolls },
        { PDFDocument },
      ] = await Promise.all([
        import("src/sections/prijave-radnika/obrasciSpecifikacije"),
        import("src/sections/prijave-radnika/fillObrazac2001"),
        import("src/sections/prijave-radnika/fillObrazac2001A"),
        import("src/sections/prijave-radnika/fillObrazac2002"),
        import("src/api/profile"),
        import("src/api/payroll"),
        import("pdf-lib"),
      ]);
      const want2001 = obrasciFilter !== "2002";
      const want2002 = obrasciFilter !== "2001";
      type Item = {
        orgIdx: number;
        kind: "2002" | "2001" | "2001A";
        bytes: Uint8Array;
      };
      const items: Item[] = [];
      const problems: string[] = [];
      const mm = String(month).padStart(2, "0");
      const lastDay = new Date(year, month, 0).getDate();
      const defaultPaymentDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

      for (let i = 0; i < obrasciCandidates.length; i++) {
        const o = obrasciCandidates[i];
        setObrasciProgress({
          current: i + 1,
          total: obrasciCandidates.length,
          name: o.name,
        });
        try {
          const [wRes, pRes] = await Promise.all([
            getWorkers(o.id),
            listPayrolls(o.id, year, month),
          ]);
          if (!wRes.ok || !pRes.ok) {
            problems.push(`${o.name}: greška pri učitavanju podataka`);
            continue;
          }
          const workers = wRes.data;
          const payrolls = pRes.data;
          const payrollByWorker = new Map(payrolls.map((p) => [p.workerId, p]));
          const { radniciFbih, radniciRs, vlasnici2002 } =
            spec.splitWorkersForObrasce(o, workers, year, month);
          // Broj zaposlenih za 2002 = aktivni radnici + vlasnik u mjesecu
          // (isto kao pojedinačna stranica: radnici.length + vlasnici.length).
          // NE workers.length (cijeli roster sa odjavljenima), da bulk i
          // pojedinačni 2002 daju identično polje "broj zaposlenih".
          const brojZaposlenih2002 =
            radniciFbih.length + radniciRs.length + vlasnici2002.length;
          // Datum isplate: snapshot iz payroll-a mjeseca, inače zadnji dan
          // (isti default kao stranica obračuna).
          const paymentDate =
            payrolls.find((p) => p.paymentDate)?.paymentDate ??
            defaultPaymentDate;

          if (want2002) {
            for (const v of vlasnici2002) {
              const p = payrollByWorker.get(v.id);
              if (!p) continue;
              if (!o.taxRegime) {
                problems.push(
                  `${o.name}: 2002 preskočen, nije postavljen režim oporezivanja`,
                );
                continue;
              }
              const bytes = await fillObrazac2002Template(
                spec.build2002Data({
                  organization: o,
                  vlasnik: v,
                  payroll: p,
                  allWorkersCount: brojZaposlenih2002,
                  year,
                  month,
                }),
              );
              items.push({ orgIdx: i, kind: "2002", bytes });
            }
          }
          if (want2001) {
            if (radniciFbih.some((w) => payrollByWorker.has(w.id))) {
              const bytes = await fillObrazac2001Template(
                spec.build2001Data({
                  organization: o,
                  radniciFbih,
                  payrollByWorker,
                  year,
                  month,
                  paymentDate,
                }),
              );
              items.push({ orgIdx: i, kind: "2001", bytes });
            }
            if (radniciRs.some((w) => payrollByWorker.has(w.id))) {
              const bytes = await fillObrazac2001ATemplate(
                spec.build2001AData({
                  organization: o,
                  radniciRs,
                  payrollByWorker,
                  year,
                  month,
                  paymentDate,
                }),
              );
              items.push({ orgIdx: i, kind: "2001A", bytes });
            }
          }
        } catch (e) {
          problems.push(`${o.name}: ${(e as Error).message ?? "greška"}`);
        }
      }

      if (items.length === 0) {
        notify("Nijedan obrazac nije generisan za odabrani mjesec.", "warning");
        return;
      }

      // Redoslijed: unutar org-e uvijek 2002 → 2001 → 2001-A; grupisanje po
      // izboru korisnika (po organizaciji / prvo svi 2002 / prvo svi 2001).
      const kindRank: Record<Item["kind"], number> = {
        "2002": 0,
        "2001": 1,
        "2001A": 2,
      };
      const groupRank = (it: Item) =>
        obrasciOrder === "prvo_2002"
          ? it.kind === "2002"
            ? 0
            : 1
          : obrasciOrder === "prvo_2001"
            ? it.kind === "2002"
              ? 1
              : 0
            : 0;
      items.sort(
        (a, b) =>
          groupRank(a) - groupRank(b) ||
          a.orgIdx - b.orgIdx ||
          kindRank[a.kind] - kindRank[b.kind],
      );

      // Merge u jedan PDF za štampu.
      const finalDoc = await PDFDocument.create();
      for (const it of items) {
        const src = await PDFDocument.load(it.bytes);
        const pages = await finalDoc.copyPages(src, src.getPageIndices());
        for (const p of pages) finalDoc.addPage(p);
      }
      const finalBytes = await finalDoc.save();
      const blob = new Blob([new Uint8Array(finalBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const namePart =
        obrasciFilter === "2001"
          ? "2001"
          : obrasciFilter === "2002"
            ? "2002"
            : "2001-2002";
      a.download = `Obrasci-${namePart}-${year}-${mm}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setObrasciModalOpen(false);
      if (problems.length === 0) {
        notify(
          `Preuzeto ${items.length} obrazaca za ${obrasciCandidates.length} org.`,
          "success",
        );
      } else {
        notify(
          `Preuzeto ${items.length} obrazaca, upozorenja: ${problems.join("; ")}`,
          "warning",
        );
      }
    } finally {
      setObrasciRunning(false);
      setObrasciProgress(null);
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
        ? o.owner.name ||
          `${o.owner.firstName ?? ""} ${o.owner.lastName ?? ""}`.trim()
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

      {/* Stats kartice (PK stil) */}
      {hasAnyOrg && (
        <div className="pk-scope grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <OrgStatTile
            label="Organizacija"
            value={String(stats.totalOrgs)}
            hint={`${ownAll.length} mojih + ${clientsAll.length} klijenata`}
          />
          <OrgStatTile
            label="Ukupno radnika"
            value={String(stats.totalWorkers)}
            hint="aktivnih u svim org."
          />
          <OrgStatTile
            label="Plate obračunate"
            value={`${stats.obracunato} / ${stats.orgsWithWorkers}`}
            hint={`org. sa kompletnim obračunom za ${MONTHS[month - 1].toLowerCase()}`}
            pct={
              stats.orgsWithWorkers
                ? Math.round((stats.obracunato / stats.orgsWithWorkers) * 100)
                : 0
            }
          />
          <OrgStatTile
            label="Plate isplaćene"
            value={`${stats.isplaceno} / ${stats.orgsWithWorkers}`}
            hint="org. sa označenim isplatama"
            pct={
              stats.orgsWithWorkers
                ? Math.round((stats.isplaceno / stats.orgsWithWorkers) * 100)
                : 0
            }
          />
        </div>
      )}

      {/* PK Office slotovi: vidljivo samo Office pretplatnicima (uz naplatu) */}
      <PkOfficeSlotPanel />

      {/* Filter / sort bar */}
      <div className={styles.controlsBar}>
        <div className={styles.fieldGroup}>
          <label htmlFor="mjesec">Mjesec</label>
          <StyledSelect
            id="mjesec"
            ariaLabel="Mjesec"
            value={month}
            onChange={(v) => setMonth(Number(v))}
            groups={[
              { options: MONTHS.map((m, i) => ({ value: i + 1, label: m })) },
            ]}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="godina">Godina</label>
          <StyledSelect
            id="godina"
            ariaLabel="Godina"
            value={year}
            onChange={(v) => setYear(Number(v))}
            groups={[
              { options: yearOptions.map((y) => ({ value: y, label: `${y}.` })) },
            ]}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="tip">Tip</label>
          <StyledSelect
            id="tip"
            ariaLabel="Tip"
            value={typeFilter}
            onChange={(v) => setTypeFilter(String(v) as TypeFilter)}
            groups={[
              {
                options: [
                  { value: "svi", label: "Sve" },
                  { value: "COMPANY", label: "Privredno društvo" },
                  { value: "BUSINESS", label: "Obrt / Samostalna djelatnost" },
                ],
              },
            ]}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="sort">Sortiraj po</label>
          <StyledSelect
            id="sort"
            ariaLabel="Sortiraj po"
            value={sortKey}
            onChange={(v) => setSortKey(String(v) as SortKey)}
            groups={[
              {
                options: [
                  { value: "naziv", label: "Naziv (A–Z)" },
                  { value: "radnika", label: "Broju radnika" },
                  { value: "datum", label: "Datumu kreiranja" },
                  {
                    value: "status_paid_first",
                    label: "Status plata: isplaćeno prvo",
                  },
                  {
                    value: "status_unpaid_first",
                    label: "Status plata: neobračunate prvo",
                  },
                ],
              },
            ]}
          />
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

      {/* Quick status filter chips (PK stil) */}
      {hasAnyOrg && (
        <div className="pk-scope flex flex-wrap gap-2 mb-4">
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
              onClick={() => setStatusFilter(key)}
              className={[
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors",
                statusFilter === key
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-cream-100 border-cream-300 text-text-secondary hover:bg-cream-200",
              ].join(" ")}
            >
              {label}
              <span
                className={[
                  "px-1.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums",
                  statusFilter === key
                    ? "bg-white/20 text-white"
                    : "bg-cream-200 text-text-tertiary",
                ].join(" ")}
              >
                {statusCounts[key]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Bulk akcije: lijevo mjesečni tok rada (Obračunaj sve plate → Preuzmi
          2001/2002 → Označi isplaćene), desno sporedni utility (Export CSV). */}
      {hasAnyOrg && (
        <div className={styles.bulkBar}>
          {/* Lijevo: mjesečni tok rada u prirodnom redoslijedu
              (obračunaj → preuzmi obrasce → označi isplaćeno). */}
          <div className={styles.bulkBarLeft}>
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
            <button
              type="button"
              className={`${styles.btnBulk} ${styles.btnBulkInfo}`}
              onClick={() => setObrasciModalOpen(true)}
              disabled={obrasciCandidates.length === 0 || obrasciRunning}
              title={
                obrasciCandidates.length === 0
                  ? "Nema org. sa obračunatim platama za odabrani mjesec"
                  : `Preuzmi specifikacije 2001/2002 za ${obrasciCandidates.length} org. u jednom PDF-u`
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
              </svg>
              Preuzmi 2001/2002 ({obrasciCandidates.length})
            </button>
            <button
              type="button"
              className={styles.btnBulk}
              onClick={() => setBulkConfirmOpen(true)}
              disabled={bulkMarkPaidCandidates.length === 0 || bulkRunning}
              title={
                bulkMarkPaidCandidates.length === 0
                  ? "Nema obračunatih org. spremnih za označavanje"
                  : `Označi ${bulkMarkPaidCandidates.length} obračunatih org. kao isplaćeno`
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
              Označi isplaćene ({bulkMarkPaidCandidates.length})
            </button>
          </div>
          {/* Desno: sporedni utility (rijetko korišten). */}
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
          </div>
        </div>
      )}

      {/* Bulk obrasci 2001/2002 modal */}
      {obrasciModalOpen && (
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
          onClick={() => !obrasciRunning && setObrasciModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              maxWidth: 520,
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
              // Na niskim ekranima modal ne smije ispasti van viewporta:
              // ograniči visinu i skrolaj unutar kutije.
              maxHeight: "calc(100vh - 2rem)",
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                margin: "0 0 0.7rem",
                fontSize: "1.1rem",
                color: "#0f1a12",
              }}
            >
              Preuzmi obrasce 2001/2002
            </h3>
            <p
              style={{
                margin: "0 0 1.1rem",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#3a3a3a",
              }}
            >
              Specifikacije za <strong>{obrasciCandidates.length}</strong> org.
              sa obračunatim platama za{" "}
              <strong>
                {MONTHS[month - 1]} {year}
              </strong>
              , spojene u jedan PDF za štampu. Obrazac 2001-A (radnici sa
              prebivalištem u RS) generiše se automatski uz 2001.
            </p>

            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#0f1a12",
                  marginBottom: "0.4rem",
                }}
              >
                Obrasci
              </div>
              {(
                [
                  { v: "oba", label: "Oba (2002 i 2001/2001-A)" },
                  { v: "2001", label: "Samo 2001 (i 2001-A)" },
                  { v: "2002", label: "Samo 2002 (vlasnici obrta)" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.v}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    fontSize: 13.5,
                    color: "#3a3a3a",
                    padding: "0.2rem 0",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="obrasciFilter"
                    checked={obrasciFilter === opt.v}
                    onChange={() => setObrasciFilter(opt.v)}
                    disabled={obrasciRunning}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {obrasciFilter === "oba" && (
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#0f1a12",
                    marginBottom: "0.4rem",
                  }}
                >
                  Redoslijed u PDF-u
                </div>
                {(
                  [
                    {
                      v: "po_org",
                      label: "Po organizaciji (2002 pa 2001 iste org-e)",
                    },
                    { v: "prvo_2002", label: "Prvo svi 2002, pa svi 2001" },
                    { v: "prvo_2001", label: "Prvo svi 2001, pa svi 2002" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.v}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontSize: 13.5,
                      color: "#3a3a3a",
                      padding: "0.2rem 0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="obrasciOrder"
                      checked={obrasciOrder === opt.v}
                      onChange={() => setObrasciOrder(opt.v)}
                      disabled={obrasciRunning}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}

            {obrasciProgress && (
              <p
                style={{
                  margin: "0 0 1rem",
                  fontSize: 13,
                  color: "#3a5c42",
                  fontWeight: 500,
                }}
              >
                Generišem {obrasciProgress.current}/{obrasciProgress.total}:{" "}
                {obrasciProgress.name}…
              </p>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.6rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setObrasciModalOpen(false)}
                disabled={obrasciRunning}
                style={{
                  padding: "0.55rem 0.9rem",
                  borderRadius: 8,
                  border: "1px solid #d4cfc4",
                  background: "#fff",
                  color: "#0f1a12",
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: obrasciRunning ? "default" : "pointer",
                }}
              >
                Otkaži
              </button>
              <button
                type="button"
                onClick={() => void runBulkObrasci()}
                disabled={obrasciRunning || obrasciCandidates.length === 0}
                style={{
                  padding: "0.55rem 0.9rem",
                  borderRadius: 8,
                  border: "none",
                  background: "#3a5c42",
                  color: "#fff",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: obrasciRunning ? "default" : "pointer",
                  opacity: obrasciRunning ? 0.7 : 1,
                }}
              >
                {obrasciRunning ? "Generišem…" : "Preuzmi PDF"}
              </button>
            </div>
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
                  Za svaku org-u koristi se isti default kao &quot;Obračunaj sve&quot; iz
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
          <div className="pk-scope text-[12px] font-semibold uppercase tracking-wider text-text-primary mt-6 mb-2">
            Moje organizacije ({ownAll.length})
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
              <div className="pk-scope text-[12px] font-semibold uppercase tracking-wider text-text-primary mt-6 mb-2">
                Klijentske organizacije ({clientsAll.length})
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
    <div className="pk-scope rounded-xl bg-cream-100 border border-cream-300 overflow-hidden mb-4">
      <div className="overflow-x-auto">
        {/* Fiksne širine kolona: obje tabele (moje/klijentske) se poravnaju
            identično, umjesto da svaka računa širine po svom sadržaju. */}
        <table className="w-full text-[13px] table-fixed min-w-[1080px]">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-text-tertiary">
              <th className="px-4 py-2.5 font-semibold w-[17%]">Naziv</th>
              <th className="px-3 py-2.5 font-semibold w-[11%]">Vlasnik</th>
              <th className="px-3 py-2.5 font-semibold w-[7%]">Tip</th>
              <th className="px-3 py-2.5 font-semibold text-right w-[6%]">Radnika</th>
              <th className="px-3 py-2.5 font-semibold w-[12%]">JIB</th>
              <th className="px-3 py-2.5 font-semibold w-[9%]">Grad</th>
              <th className="px-3 py-2.5 font-semibold w-[15%]">Status plata</th>
              <th className="px-4 py-2.5 w-[23%]"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => {
              // Attention dot: org sa radnicima ali bez ijednog obračuna
              // (crveno) ili sa djelimičnim obračunom (žuto).
              const needsRed = o.workerCount > 0 && o.payrollStatus === "none";
              const needsYellow = o.payrollStatus === "partial";
              return (
                <tr
                  key={o.id}
                  className="border-b border-cream-300/70 last:border-0"
                >
                  <td className="px-4 py-3">
                    {(needsRed || needsYellow) && (
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                        style={{
                          background: needsRed ? "#dc2626" : "#e0a93b",
                        }}
                        title={
                          needsRed
                            ? "Plate još nisu obračunate"
                            : "Plate djelimično obračunate"
                        }
                      />
                    )}
                    <Link
                      href={`/organizacija/${o.id}`}
                      className="font-semibold text-brand-600 hover:text-brand-700"
                    >
                      {o.name}
                    </Link>
                    <div className="text-[11.5px] text-text-tertiary mt-0.5">
                      {o.activityCode || ""}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-text-secondary">
                    {o.owner
                      ? o.owner.name ||
                        `${o.owner.firstName ?? ""} ${o.owner.lastName ?? ""}`.trim() ||
                        "–"
                      : "–"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={[
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-medium whitespace-nowrap",
                        o.type === "COMPANY"
                          ? "bg-info-bg text-info"
                          : "bg-brand-100 text-brand-700",
                      ].join(" ")}
                    >
                      {o.type === "COMPANY" ? "D.o.o." : "Obrt"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-text-primary">
                    {o.workerCount}
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] text-text-secondary whitespace-nowrap">
                    {o.taxNumber || "–"}
                  </td>
                  <td className="px-3 py-3 text-text-secondary">
                    {o.city || "–"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={[
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap",
                        STATUS_PK_CLASS[o.payrollStatus],
                      ].join(" ")}
                    >
                      {STATUS_LABEL[o.payrollStatus]}
                    </span>
                    {(o.payrollStatus === "partial" ||
                      o.payrollStatus === "obracunato") && (
                      <div className="text-[11.5px] text-text-tertiary mt-0.5 whitespace-nowrap">
                        {o.payrollObracunato}/{o.workerCount} obračunato
                        {o.payrollIsplaceno > 0
                          ? ` · ${o.payrollIsplaceno} isplaćeno`
                          : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
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
    </div>
  );
}

// PK stat pločica: caps label, serif brojka, hint, opcioni progress bar.
function OrgStatTile({
  label,
  value,
  hint,
  pct,
}: {
  label: string;
  value: string;
  hint: string;
  pct?: number;
}) {
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-4">
      <div className="text-[10.5px] leading-4 font-semibold uppercase tracking-wider text-text-tertiary mb-1">
        {label}
      </div>
      <div className="font-serif-display text-[24px] leading-8 text-text-primary tabular-nums">
        {value}
      </div>
      <div className="text-[11.5px] leading-4 text-text-tertiary mt-0.5">
        {hint}
      </div>
      {pct != null && (
        <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full ${pct >= 100 ? "bg-success" : "bg-brand-600"}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      )}
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
  const [evidencijaOpen, setEvidencijaOpen] = useState(false);
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
      key: "evidencija",
      label: "Evidencija",
      onClick: () => setEvidencijaOpen(true),
      title: "Matična evidencija o radnicima",
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
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="9" y1="7" x2="15" y2="7" />
        </svg>
      ),
    },
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
    <>
      <RowActionsMenu
        primaryActions={primaryActions}
        menuItems={menuItems}
        busy={busy !== null}
      />
      {evidencijaOpen && (
        <EvidencijaModal
          orgId={org.id}
          orgName={org.name}
          orgType={org.type}
          ownerEmployed={
            (org.ownerIsDirector ?? true) &&
            (org.directorEngagement ?? "ugovor_o_radu") === "ugovor_o_radu"
          }
          onClose={() => setEvidencijaOpen(false)}
        />
      )}
    </>
  );
}
