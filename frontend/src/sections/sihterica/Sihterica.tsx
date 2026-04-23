"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./sihterica.module.css";
import { getOrganizations, getWorkers, type Worker } from "src/api/profile";
import { fillSihterica, type DayEntry } from "./fillSihterica";

const MONTHS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const DAY_NAMES_FULL = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
const DAY_NAMES_SHORT = ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"];

const EMPTY_ENTRY: DayEntry = {
  startTime: "",
  endTime: "",
  zastoj: "",
  fieldWork: "",
  standby: "",
  absence: "",
  other: "",
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

function parseTimeToMins(hhmm: string): number | null {
  if (!hhmm) return null;
  const parts = hhmm.split(":");
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function calcDailyMins(entry: DayEntry): number {
  const start = parseTimeToMins(entry.startTime);
  const end = parseTimeToMins(entry.endTime);
  if (start === null || end === null) return 0;
  const zastojMins = Math.round((parseFloat(entry.zastoj.replace(",", ".")) || 0) * 60);
  return Math.max(0, end - start - zastojMins);
}

function minsToLabel(mins: number): string {
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function calcTotalDaily(entry: DayEntry): string {
  return minsToLabel(calcDailyMins(entry));
}

function calcTotalHrs(entry: DayEntry): string {
  const extras = [entry.fieldWork, entry.standby, entry.absence, entry.other]
    .map((v) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? 0 : n; });
  const hasExtras = extras.some((v) => v > 0);
  if (hasExtras) {
    const total = extras.reduce((a, b) => a + b, 0);
    return total % 1 === 0 ? `${total}h` : `${total.toFixed(2)}h`;
  }
  const daily = calcTotalDaily(entry);
  return daily;
}

type ColKey = keyof DayEntry;

const COL_HEADERS = [
  { key: "rbr",        label: "Rbr.", auto: true, width: 32 },
  { key: "date",       label: "Datum", auto: true, width: 170 },
  { key: "startTime",  label: "Početak", auto: false, width: 64, placeholder: "08:00" },
  { key: "endTime",    label: "Kraj", auto: false, width: 64, placeholder: "16:00" },
  { key: "zastoj",     label: "Zastoj/Prekid/Pauza (h)", auto: false, width: 100, placeholder: "0" },
  { key: "totalDaily", label: "Uk. dnevnih sati", auto: true, width: 110 },
  { key: "fieldWork",  label: "Terenski (h)", auto: false, width: 62, placeholder: "0" },
  { key: "standby",    label: "Pripravnost (h)", auto: false, width: 64, placeholder: "0" },
  { key: "absence",    label: "Odsustvo (h)", auto: false, width: 62, placeholder: "0" },
  { key: "other",      label: "Ostalo (h)", auto: false, width: 60, placeholder: "0" },
  { key: "totalHrs",   label: "Uk. sati", auto: true, width: 110 },
] as const;

export default function Sihterica() {
  const now = new Date();
  const [orgId, setOrgId] = useState<number | null>(null);
  const [workerId, setWorkerId] = useState<number | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [entries, setEntries] = useState<DayEntry[]>(() => Array.from({ length: 31 }, () => ({ ...EMPTY_ENTRY })));

  const orgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await getOrganizations();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const workersQuery = useQuery({
    queryKey: ["workers", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await getWorkers(orgId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!orgId,
  });

  const selectedOrg = orgsQuery.data?.find((o) => o.id === orgId) ?? null;
  const selectedWorker: Worker | null = workersQuery.data?.find((w) => w.id === workerId) ?? null;

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const updateEntry = useCallback(
    (dayIdx: number, field: ColKey, value: string) => {
      setEntries((prev) => {
        const next = [...prev];
        next[dayIdx] = { ...next[dayIdx], [field]: value };
        return next;
      });
    },
    [],
  );

  const workerName = selectedWorker
    ? `${selectedWorker.firstName} ${selectedWorker.lastName}`
    : "";

  const handleExport = useCallback(async () => {
    const pdfBytes = await fillSihterica({
      workerName,
      month,
      year,
      days: entries.slice(0, daysInMonth).map((e) => {
        const isEmpty = !e.startTime && !e.endTime && !e.zastoj &&
          !e.fieldWork && !e.standby && !e.absence && !e.other;
        return isEmpty ? null : e;
      }),
    });

    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const wName = workerName ? `_${workerName.replace(/\s+/g, "_")}` : "";
    a.download = `Sihterica${wName}_${String(month).padStart(2, "0")}_${year}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [workerName, month, year, entries, daysInMonth]);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.label}>Evidencija radnog vremena</div>
        <h1 className={styles.h1}>
          Šihterica — <em>Evidencija radnog vremena</em>
        </h1>
        <p className={styles.subtitle}>
          Popunite evidenciju radnog vremena i preuzmite popunjeni obrazac u PDF formatu.
        </p>
      </div>

      {/* Organizacija i radnik */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Organizacija i <em>radnik</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Organizacija</label>
            <select
              className={styles.fieldSelect}
              value={orgId ?? ""}
              onChange={(e) => {
                setOrgId(e.target.value ? Number(e.target.value) : null);
                setWorkerId(null);
              }}
            >
              <option value="">— Odaberite organizaciju —</option>
              {orgsQuery.data?.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Radnik</label>
            <select
              className={styles.fieldSelect}
              value={workerId ?? ""}
              disabled={!orgId}
              onChange={(e) => setWorkerId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Odaberite radnika —</option>
              {workersQuery.data?.map((w) => (
                <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Period */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Period <em>evidencije</em>
        </h2>
        <div className={styles.fieldGrid3}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Mjesec</label>
            <select
              className={styles.fieldSelect}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Godina</label>
            <select
              className={styles.fieldSelect}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Tabela */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Unos <em>radnog vremena</em>
        </h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {COL_HEADERS.map((col) => (
                  <th key={col.key} style={{ minWidth: col.width }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dow = getDayOfWeek(year, month, dayNum);
                const isWeekend = dow === 0 || dow === 6;
                const entry = entries[i];
                const dd = String(dayNum).padStart(2, "0");
                const mm = String(month).padStart(2, "0");
                const dateLabel = `${dd}.${mm}.${year}. (${DAY_NAMES_FULL[dow]})`;

                return (
                  <tr key={dayNum}>
                    <td>
                      <div className={`${styles.dayCell}${isWeekend ? ` ${styles.weekend}` : ""}`}>
                        {dayNum}.
                      </div>
                    </td>
                    <td>
                      <div
                        className={`${styles.dayCell} ${styles.dayCellFull}${isWeekend ? ` ${styles.weekend}` : ""}`}
                      >
                        {dateLabel}
                      </div>
                    </td>
                    <td>
                      <input
                        className={styles.cellInput}
                        type="text"
                        placeholder="08:00"
                        value={entry.startTime}
                        onChange={(e) => updateEntry(i, "startTime", e.target.value)}
                        maxLength={5}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.cellInput}
                        type="text"
                        placeholder="16:00"
                        value={entry.endTime}
                        onChange={(e) => updateEntry(i, "endTime", e.target.value)}
                        maxLength={5}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.cellInput}
                        type="text"
                        placeholder="0"
                        value={entry.zastoj}
                        onChange={(e) => updateEntry(i, "zastoj", e.target.value)}
                        maxLength={5}
                      />
                    </td>
                    <td>
                      <span className={styles.cellAuto}>
                        {calcTotalDaily(entry)}
                      </span>
                    </td>
                    <td>
                      <input
                        className={styles.cellInput}
                        type="text"
                        placeholder="0"
                        value={entry.fieldWork}
                        onChange={(e) => updateEntry(i, "fieldWork", e.target.value)}
                        maxLength={5}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.cellInput}
                        type="text"
                        placeholder="0"
                        value={entry.standby}
                        onChange={(e) => updateEntry(i, "standby", e.target.value)}
                        maxLength={5}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.cellInput}
                        type="text"
                        placeholder="0"
                        value={entry.absence}
                        onChange={(e) => updateEntry(i, "absence", e.target.value)}
                        maxLength={5}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.cellInput}
                        type="text"
                        placeholder="0"
                        value={entry.other}
                        onChange={(e) => updateEntry(i, "other", e.target.value)}
                        maxLength={5}
                      />
                    </td>
                    <td>
                      <span className={styles.cellAuto}>
                        {calcTotalHrs(entry)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan={10} className={styles.totalLabel}>Ukupno radnih sati u mjesecu</td>
                <td colSpan={1} className={styles.totalValue}>
                  {minsToLabel(
                    Array.from({ length: daysInMonth }, (_, i) => calcDailyMins(entries[i])).reduce((a, b) => a + b, 0)
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.exportBtn}
          onClick={handleExport}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
          </svg>
          Preuzmi PDF
        </button>
      </div>

      <p className={styles.dataNapomena}>
        Porezni kalkulator ne zadržava popunjene podatke ni u kojem obliku. Nakon preuzimanja PDF-a provjerite tačnost podataka.
      </p>
    </div>
  );
}
