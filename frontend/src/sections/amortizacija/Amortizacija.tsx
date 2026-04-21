"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import FaqSection from "src/components/FaqSection/FaqSection";
import { useQuery } from "@tanstack/react-query";
import styles from "./amortizacija.module.css";
import { fillPldiTemplate, type PldiData } from "./fillPldi";
import DateInput from "src/components/DateInput/DateInput";
import { me, unwrap } from "src/api/auth";
import {
  getAmortizacijaYears,
  getAmortizacija,
  saveAmortizacija,
  deleteAmortizacija,
} from "src/api/amortizacija";

/* ── Types (exported for API layer) ── */
export interface AssetRow {
  id: string;
  naziv: string;
  datumNabavke: string;
  brojDokumenta: string;
  nabavnaVrijednost: string;
  kvPocetak: string;
  vijekTrajanja: string;
  stopaOverride: string;
  mjeseciOverride: string;
  napomena: string;
  prodano: boolean;
  datumProdaje: string;
}

export interface ObveznikData {
  jmb: string;
  imeIPrezime: string;
  adresa: string;
  jib: string;
  naziv: string;
  adresaDjelatnosti: string;
  vrstaSifra: string;
  vrstaNaziv: string;
  godina: string;
  manualPeriod: boolean;
  periodOd: string;
  periodDo: string;
}

type SortKey = "naziv" | "datumNabavke" | "nabavnaVrijednost" | "kvPocetak" | "iznos" | "kvKraj";

/* ── Constants ── */
export const VIJEK_STOPA: Record<string, number> = Object.fromEntries(
  Array.from({ length: 40 }, (_, i) => {
    const god = i + 1;
    return [String(god), Math.round(100 / god * 100) / 100];
  })
);

/* ── Helpers ── */
export function r2(n: number) { return Math.round(n * 100) / 100; }

function bsFmt(n: number): string {
  const [int, dec] = n.toFixed(2).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + dec;
}

function fmtKm(n: number | null): string {
  if (n === null) return "—";
  return bsFmt(n);
}

export function parseDec(s: string): number | null {
  if (!s) return null;
  const cleaned = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : s.replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function fmtKmInput(s: string): string {
  const n = parseDec(s);
  if (n === null) return s;
  return bsFmt(n);
}

export function isoToDisplay(iso: string): string {
  if (!iso || !iso.includes("-")) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

function periodMonths(odISO: string, doISO: string): number {
  if (!odISO || !doISO) return 12;
  const od = new Date(odISO);
  const doo = new Date(doISO);
  return Math.min(12, Math.max(1, (doo.getMonth() - od.getMonth()) + 1));
}

function calcMjeseci(isoDate: string, odISO: string, doISO: string): number {
  const total = periodMonths(odISO, doISO);
  if (!isoDate) return total;
  const acq = new Date(isoDate);
  const od  = new Date(odISO);
  const doo = new Date(doISO);
  if (acq <= od) return total;
  if (acq > doo) return 0;
  return Math.min(12, Math.max(1, (doo.getMonth() - acq.getMonth()) + 1));
}

function calcMjeseciProdaje(datumProdaje: string, datumNabavke: string, odISO: string): number {
  if (!datumProdaje || !odISO) return 0;
  const prodaja = new Date(datumProdaje);
  const od = new Date(odISO);
  const nabavka = datumNabavke ? new Date(datumNabavke) : od;
  const start = nabavka > od ? nabavka : od;
  return Math.max(1, Math.min(12, prodaja.getMonth() - start.getMonth() + 1));
}

export function calcRow(row: AssetRow, odISO: string, doISO: string) {
  if (row.prodano) {
    const nabavna = parseDec(row.nabavnaVrijednost) ?? 0;
    const kvStart = parseDec(row.kvPocetak);
    const stopaAuto = VIJEK_STOPA[row.vijekTrajanja];
    const stopaVal = row.stopaOverride ? parseDec(row.stopaOverride) : stopaAuto;
    const stopa = stopaVal ?? 0;
    const mjeseci = row.datumProdaje
      ? calcMjeseciProdaje(row.datumProdaje, row.datumNabavke, odISO)
      : (row.mjeseciOverride ? (parseInt(row.mjeseciOverride) || 0) : 0);
    if (!stopaVal || nabavna === 0) return { stopa, mjeseci, iznos: null as number | null, kvKraj: 0 as number | null };
    if (kvStart === null || kvStart === 0) return { stopa, mjeseci, iznos: 0, kvKraj: 0 };
    const periodDepr = r2((nabavna * stopaVal / 100) * (mjeseci / 12));
    const iznos = r2(Math.min(periodDepr, kvStart));
    return { stopa, mjeseci, iznos, kvKraj: 0 as number | null };
  }

  const nabavna = parseDec(row.nabavnaVrijednost) ?? 0;
  const kvStart = parseDec(row.kvPocetak);
  const stopaAuto = VIJEK_STOPA[row.vijekTrajanja]; // undefined if vijek not in map
  const stopaVal = row.stopaOverride ? parseDec(row.stopaOverride) : stopaAuto;
  const stopa = stopaVal ?? 0; // for display placeholder only
  const mjeseciAuto = calcMjeseci(row.datumNabavke, odISO, doISO);
  const mjeseci = Math.min(12, row.mjeseciOverride ? (parseInt(row.mjeseciOverride) || mjeseciAuto) : mjeseciAuto);

  // No stopa entered — don't calculate
  if (stopaVal === undefined || stopaVal === null) {
    return { stopa, mjeseci, iznos: null as number | null, kvKraj: null as number | null };
  }

  if (nabavna === 0) return { stopa, mjeseci, iznos: null as number | null, kvKraj: null as number | null };
  if (kvStart === null || kvStart === 0) return { stopa, mjeseci, iznos: 0, kvKraj: 0 };

  const periodDepr = r2((nabavna * stopa / 100) * (mjeseci / 12));
  const iznos = r2(Math.min(periodDepr, kvStart));
  return { stopa, mjeseci, iznos, kvKraj: r2(kvStart - iznos) };
}

function newRow(): AssetRow {
  return {
    id: crypto.randomUUID(),
    naziv: "", datumNabavke: "", brojDokumenta: "",
    nabavnaVrijednost: "", kvPocetak: "",
    vijekTrajanja: "", stopaOverride: "", mjeseciOverride: "", napomena: "",
    prodano: false, datumProdaje: "",
  };
}

function makeObveznik(year: string): ObveznikData {
  return {
    jmb: "", imeIPrezime: "", adresa: "",
    jib: "", naziv: "", adresaDjelatnosti: "",
    vrstaSifra: "", vrstaNaziv: "",
    godina: year, manualPeriod: false,
    periodOd: `${year}-01-01`, periodDo: `${year}-12-31`,
  };
}

/* ── Sort helper ── */
function sortIcon(key: SortKey, sortKey: SortKey | null, sortDir: "asc" | "desc") {
  if (sortKey !== key) return <span className={styles.sortIconNeutral}>⇅</span>;
  return <span className={styles.sortIconActive}>{sortDir === "asc" ? "↑" : "↓"}</span>;
}

/* ── Component ── */
export default function Amortizacija() {
  const currentYear = new Date().getFullYear().toString();

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => unwrap(me()), retry: false });

  const [obveznik, setObveznik] = useState<ObveznikData>(makeObveznik(currentYear));
  const [rows, setRows] = useState<AssetRow[]>([newRow()]);
  const [savedYears, setSavedYears] = useState<number[]>([]);
  const [visitedYears, setVisitedYears] = useState<number[]>([parseInt(currentYear)]);
  const [deletedYears, setDeletedYears] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [pendingYear, setPendingYear] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showNewYear, setShowNewYear] = useState(false);
  const [newYearVal, setNewYearVal] = useState("");
  const [yearToDelete, setYearToDelete] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const isLoadingRef = useRef(false);
  const newYearRef = useRef<HTMLInputElement>(null);

  /* ── Dirty tracking ── */
  const markDirty = useCallback(() => {
    if (!isLoadingRef.current) setIsDirty(true);
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /* ── Load helpers ── */
  const applyLoadedData = useCallback((data: { obveznik?: ObveznikData; rows?: AssetRow[] }) => {
    if (!data?.obveznik) return;
    isLoadingRef.current = true;
    setObveznik({
      jmb: data.obveznik.jmb ?? "",
      imeIPrezime: data.obveznik.imeIPrezime ?? "",
      adresa: data.obveznik.adresa ?? "",
      jib: data.obveznik.jib ?? "",
      naziv: data.obveznik.naziv ?? "",
      adresaDjelatnosti: data.obveznik.adresaDjelatnosti ?? "",
      vrstaSifra: data.obveznik.vrstaSifra ?? "",
      vrstaNaziv: data.obveznik.vrstaNaziv ?? "",
      godina: data.obveznik.godina ?? "",
      manualPeriod: data.obveznik.manualPeriod ?? false,
      periodOd: data.obveznik.periodOd ?? "",
      periodDo: data.obveznik.periodDo ?? "",
    });
    setRows((data.rows ?? []).map(r => ({
      id: crypto.randomUUID(),
      naziv: r.naziv ?? "",
      datumNabavke: r.datumNabavke ?? "",
      brojDokumenta: r.brojDokumenta ?? "",
      nabavnaVrijednost: r.nabavnaVrijednost ?? "",
      kvPocetak: r.kvPocetak ?? "",
      vijekTrajanja: r.vijekTrajanja ?? "",
      stopaOverride: r.stopaOverride ?? "",
      mjeseciOverride: r.mjeseciOverride ?? "",
      napomena: r.napomena ?? "",
      prodano: r.prodano ?? false,
      datumProdaje: r.datumProdaje ?? "",
    })));
    setTimeout(() => {
      isLoadingRef.current = false;
      setIsDirty(false);
    }, 0);
  }, []);

  useEffect(() => {
    (async () => {
      const yearsRes = await getAmortizacijaYears();
      if (yearsRes.ok) setSavedYears(yearsRes.data);

      setDataLoading(true);
      const res = await getAmortizacija(currentYear);
      setDataLoading(false);
      if (res.ok && res.data) applyLoadedData(res.data);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showNewYear) newYearRef.current?.focus();
  }, [showNewYear]);

  useEffect(() => {
    if (obveznik.godina.length !== 4) return;
    const yr = parseInt(obveznik.godina);
    if (isNaN(yr)) return;
    setVisitedYears(prev => prev.includes(yr) ? prev : [...prev, yr]);
    setDeletedYears(prev => { const next = new Set(prev); next.delete(yr); return next; });
  }, [obveznik.godina]);

  /* ── Year switching ── */
  const doSwitchYear = useCallback(async (year: string) => {
    const yr = parseInt(year);
    setVisitedYears(prev => prev.includes(yr) ? prev : [...prev, yr]);
    setDeletedYears(prev => { const next = new Set(prev); next.delete(yr); return next; });
    setDataLoading(true);
    const res = await getAmortizacija(year);
    setDataLoading(false);
    if (res.ok && res.data) {
      applyLoadedData(res.data);
    } else {
      isLoadingRef.current = true;
      setObveznik(p => ({ ...p, godina: year, manualPeriod: false, periodOd: `${year}-01-01`, periodDo: `${year}-12-31` }));
      setRows([newRow()]);
      setTimeout(() => { isLoadingRef.current = false; setIsDirty(false); }, 0);
    }
    setSaveStatus("idle");
  }, [applyLoadedData]);

  const handleYearClick = useCallback((yr: number) => {
    if (parseInt(obveznik.godina) === yr) return;
    if (isDirty) {
      setPendingYear(String(yr));
    } else {
      doSwitchYear(String(yr));
    }
  }, [isDirty, obveznik.godina, doSwitchYear]);

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    const godina = obveznik.godina || currentYear;
    const res = await saveAmortizacija(godina, { obveznik, rows });
    if (res.ok) {
      setSaveStatus("saved");
      setIsDirty(false);
      setSavedYears(prev => {
        const yr = parseInt(godina);
        return prev.includes(yr) ? prev : [...prev, yr].sort((a, b) => a - b);
      });
      setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [obveznik, rows, currentYear]);

  /* ── Carryover ── */
  const handleCarryover = useCallback(async () => {
    const nextYear = String(parseInt(obveznik.godina || currentYear) + 1);
    const carryoverObveznik: ObveznikData = {
      ...obveznik,
      godina: nextYear,
      manualPeriod: false,
      periodOd: `${nextYear}-01-01`,
      periodDo: `${nextYear}-12-31`,
    };
    const carryoverRows = rows
      .filter(row => !row.prodano)
      .map((row) => {
        const originalIdx = rows.indexOf(row);
        return {
          ...newRow(),
          naziv: row.naziv,
          datumNabavke: row.datumNabavke,
          brojDokumenta: row.brojDokumenta,
          nabavnaVrijednost: row.nabavnaVrijednost,
          kvPocetak: computed[originalIdx].kvKraj !== null ? bsFmt(computed[originalIdx].kvKraj!) : "",
          vijekTrajanja: row.vijekTrajanja,
          napomena: row.napomena,
        };
      });

    if (carryoverRows.length === 0) carryoverRows.push(newRow());

    isLoadingRef.current = true;
    setObveznik(carryoverObveznik);
    setRows(carryoverRows);
    setTimeout(() => { isLoadingRef.current = false; }, 0);

    setSaveStatus("saving");
    const res = await saveAmortizacija(nextYear, { obveznik: carryoverObveznik, rows: carryoverRows });
    if (res.ok) {
      setSavedYears(prev => {
        const yr = parseInt(nextYear);
        return prev.includes(yr) ? prev : [...prev, yr].sort((a, b) => a - b);
      });
      setIsDirty(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [obveznik, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Delete year ── */
  const handleDeleteYear = useCallback(async (yr: number) => {
    await deleteAmortizacija(String(yr));
    const newSaved = savedYears.filter(y => y !== yr);
    const newVisited = visitedYears.filter(y => y !== yr);
    setSavedYears(newSaved);
    setVisitedYears(newVisited);
    setDeletedYears(prev => new Set([...prev, yr]));
    setYearToDelete(null);

    if (parseInt(obveznik.godina || currentYear) === yr) {
      const remaining = [...new Set([...newSaved, ...newVisited])].sort((a, b) => a - b);
      const fallback = remaining[0];
      if (fallback !== undefined) {
        await doSwitchYear(String(fallback));
      } else {
        isLoadingRef.current = true;
        setObveznik(p => ({ ...p, godina: "", manualPeriod: false, periodOd: "", periodDo: "" }));
        setRows([newRow()]);
        setTimeout(() => { isLoadingRef.current = false; setIsDirty(false); }, 0);
      }
    }
  }, [obveznik.godina, currentYear, savedYears, visitedYears, doSwitchYear]);

  /* ── Row handlers ── */
  const setO = useCallback((key: keyof ObveznikData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setObveznik(p => ({ ...p, [key]: e.target.value }));
      markDirty();
    }, [markDirty]);

  const setRow = useCallback((id: string, key: keyof AssetRow) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setRows(p => p.map(r => r.id === id ? { ...r, [key]: e.target.value } : r));
      markDirty();
    }, [markDirty]);

  const handleNumberBlur = useCallback((id: string, key: "nabavnaVrijednost" | "kvPocetak") => () =>
    setRows(p => p.map(r => {
      if (r.id !== id) return r;
      return { ...r, [key]: fmtKmInput(r[key]) };
    })), []);

  const toggleProdano = useCallback((id: string) => {
    setRows(p => p.map(r => r.id === id ? { ...r, prodano: !r.prodano, datumProdaje: r.prodano ? "" : r.datumProdaje } : r));
    markDirty();
  }, [markDirty]);


  const addRow = () => { setRows(p => p.length >= 1000 ? p : [...p, newRow()]); markDirty(); };
  const removeRow = (id: string) => {
    setRows(p => { const next = p.filter(r => r.id !== id); return next.length > 0 ? next : [newRow()]; });
    markDirty();
  };

  /* ── Profile fill ── */
  const fillFromProfile = useCallback(() => {
    if (!user) return;
    setObveznik(p => ({
      ...p,
      jmb: (user as { jmbg?: string }).jmbg ?? p.jmb,
      imeIPrezime: [user.firstName, user.lastName].filter(Boolean).join(" ") || p.imeIPrezime,
      adresa: (user as { address?: string }).address ?? p.adresa,
    }));
    markDirty();
  }, [user, markDirty]);

  /* ── Period ── */
  const activeOd = obveznik.manualPeriod ? obveznik.periodOd : `${obveznik.godina}-01-01`;
  const activeDo = obveznik.manualPeriod ? obveznik.periodDo : `${obveznik.godina}-12-31`;

  const setDatumProdaje = useCallback((id: string) => (iso: string) => {
    setRows(p => p.map(r => {
      if (r.id !== id) return r;
      const mj = iso ? String(calcMjeseciProdaje(iso, r.datumNabavke, activeOd)) : "";
      return { ...r, datumProdaje: iso, mjeseciOverride: mj };
    }));
    markDirty();
  }, [activeOd, markDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const setDatum = useCallback((id: string) => (iso: string) => {
    setRows(p => p.map(r => {
      if (r.id !== id) return r;
      const mj = iso ? String(calcMjeseci(iso, activeOd, activeDo)) : "";
      return { ...r, datumNabavke: iso, mjeseciOverride: mj };
    }));
    markDirty();
  }, [activeOd, activeDo, markDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Computed ── */
  const computed = useMemo(() =>
    rows.map(r => ({ id: r.id, ...calcRow(r, activeOd, activeDo) })),
    [rows, activeOd, activeDo]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    let nabavna = 0, kv = 0, iznos = 0, kvKraj = 0;
    rows.forEach((r, i) => {
      nabavna += r.prodano ? 0 : (parseDec(r.nabavnaVrijednost) ?? 0);
      kv += r.prodano ? 0 : (parseDec(r.kvPocetak) ?? 0);
      iznos += computed[i].iznos ?? 0;
      kvKraj += r.prodano ? 0 : (computed[i].kvKraj ?? 0);
    });
    return { nabavna: r2(nabavna), kv: r2(kv), iznos: r2(iznos), kvKraj: r2(kvKraj) };
  }, [rows, computed]);

  /* ── Sort ── */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedIndices = useMemo(() => {
    const indices = rows.map((_, i) => i);
    if (!sortKey) return indices;
    return [...indices].sort((ai, bi) => {
      const a = rows[ai], b = rows[bi];
      let av: number | string, bv: number | string;
      if (sortKey === "iznos") {
        av = computed[ai].iznos ?? -Infinity;
        bv = computed[bi].iznos ?? -Infinity;
      } else if (sortKey === "kvKraj") {
        av = computed[ai].kvKraj ?? -Infinity;
        bv = computed[bi].kvKraj ?? -Infinity;
      } else if (sortKey === "nabavnaVrijednost" || sortKey === "kvPocetak") {
        av = parseDec(a[sortKey]) ?? -Infinity;
        bv = parseDec(b[sortKey]) ?? -Infinity;
      } else {
        av = a[sortKey as keyof AssetRow] as string ?? "";
        bv = b[sortKey as keyof AssetRow] as string ?? "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, computed, sortKey, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Export ── */
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const pldiRows = rows.map((row, idx) => {
        const prodajaNapomena = row.prodano && row.datumProdaje
          ? `Prodano: ${isoToDisplay(row.datumProdaje)}`
          : row.prodano ? "Prodano/otpisano" : "";
        const napomena = [prodajaNapomena, row.napomena].filter(Boolean).join(" | ");
        return {
          naziv: row.naziv,
          datumNabavke: isoToDisplay(row.datumNabavke),
          brojDokumenta: row.brojDokumenta,
          nabavnaVrijednost: parseDec(row.nabavnaVrijednost),
          kvPocetak: parseDec(row.kvPocetak),
          vijekTrajanja: row.vijekTrajanja,
          stopa: computed[idx].stopa,
          iznos: computed[idx].iznos,
          kvKraj: computed[idx].kvKraj,
          napomena,
          prodanoText: row.prodano
            ? `PR.${row.datumProdaje ? ` ${isoToDisplay(row.datumProdaje)}` : ""}`
            : undefined,
        };
      });

      const data: PldiData = {
        jmb: obveznik.jmb, imeIPrezime: obveznik.imeIPrezime, adresa: obveznik.adresa,
        jib: obveznik.jib, naziv: obveznik.naziv, adresaDjelatnosti: obveznik.adresaDjelatnosti,
        vrstaSifra: obveznik.vrstaSifra, vrstaNaziv: obveznik.vrstaNaziv,
        godina: obveznik.godina, periodOd: isoToDisplay(activeOd), periodDo: isoToDisplay(activeDo),
        rows: pldiRows,
        totalNabavna: totals.nabavna, totalKv: totals.kv,
        totalIznos: totals.iznos, totalKvKraj: totals.kvKraj,
      };

      const bytes = await fillPldiTemplate(data);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PLDI-1043-${obveznik.godina}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  /* ── Derived ── */
  const allYears = useMemo(() => {
    const set = new Set([...savedYears, ...visitedYears].filter(y => !deletedYears.has(y)));
    return [...set].sort((a, b) => a - b);
  }, [savedYears, visitedYears, deletedYears]);

  const activeYear = parseInt(obveznik.godina || currentYear);

  const saveBtnClass = [
    styles.saveBtn,
    saveStatus === "saved" ? styles.saveBtnSaved : "",
    saveStatus === "error" ? styles.saveBtnError : "",
  ].filter(Boolean).join(" ");

  const thSort = (key: SortKey, label: React.ReactNode) => (
    <th className={`${styles.thKm} ${key === "iznos" || key === "kvKraj" ? styles.thAuto : ""}`}
      onClick={() => handleSort(key)} style={{ cursor: "pointer", userSelect: "none" }}>
      <span className={styles.sortHeader}>{label}{sortIcon(key, sortKey, sortDir)}</span>
    </th>
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <p className={styles.label}>Obrazac PLDI-1043</p>
        <h1 className={styles.h1}>Popisna lista <em>dugotrajne imovine</em></h1>
        <p className={styles.subtitle}>Evidencija dugotrajne imovine i automatski obračun amortizacije po porezno priznatim stopama. Generišite PLDI-1043 obrazac za godišnju poreznu prijavu — besplatno.</p>
      </div>

      {/* Year switcher */}
      <div className={styles.yearBar}>
        {allYears.map(yr => (
          <button key={yr}
            className={`${styles.yearPill} ${yr === activeYear ? styles.yearPillActive : ""}`}
            onClick={() => handleYearClick(yr)}
            disabled={dataLoading}
          >{yr}</button>
        ))}
        {showNewYear ? (
          <input ref={newYearRef} className={styles.yearInput} value={newYearVal}
            placeholder="GGGG" maxLength={4} inputMode="numeric"
            onChange={e => setNewYearVal(e.target.value.replace(/\D/g, ""))}
            onKeyDown={e => {
              if (e.key === "Enter" && newYearVal.length === 4) { setShowNewYear(false); setNewYearVal(""); doSwitchYear(newYearVal); }
              if (e.key === "Escape") { setShowNewYear(false); setNewYearVal(""); }
            }}
            onBlur={() => { if (newYearVal.length === 4) doSwitchYear(newYearVal); setShowNewYear(false); setNewYearVal(""); }}
          />
        ) : (
          <button className={`${styles.yearPill} ${styles.yearPillNew}`} onClick={() => setShowNewYear(true)}>
            + Nova godina
          </button>
        )}
        {dataLoading && <span className={styles.yearLoading}>Učitavam…</span>}
      </div>

      {/* Pending year switch warning */}
      {pendingYear && (
        <div className={styles.dirtyWarning}>
          <span>Imate nespremljene promjene. Šta želite uraditi?</span>
          <button className={styles.dirtyWarnSave} onClick={async () => { await handleSave(); setPendingYear(null); doSwitchYear(pendingYear); }}>
            Sačuvaj i prijeđi
          </button>
          <button className={styles.dirtyWarnDiscard} onClick={() => { setPendingYear(null); setIsDirty(false); doSwitchYear(pendingYear!); }}>
            Zanemari promjene
          </button>
          <button className={styles.dirtyWarnCancel} onClick={() => setPendingYear(null)}>Ostani</button>
        </div>
      )}

      {/* Dio 1 — Podaci */}
      <section className={styles.section}>
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}>Podaci o poreznom obvezniku i djelatnosti</h2>
          {yearToDelete === activeYear ? (
            <span className={styles.yearConfirm}>
              <span className={styles.yearConfirmText}>Obrisati {activeYear}. godinu?</span>
              <button className={styles.yearConfirmYes} onClick={() => handleDeleteYear(activeYear)}>Da</button>
              <button className={styles.yearConfirmNo} onClick={() => setYearToDelete(null)}>Ne</button>
            </span>
          ) : (
            <button className={styles.deleteYearBtn} onClick={() => setYearToDelete(activeYear)}>
              Obriši {activeYear}. godinu
            </button>
          )}
        </div>

        <div className={styles.twoCol}>
          <div className={styles.colGroup}>
            <div className={styles.colLabelRow}>
              <p className={styles.colLabel}>Porezni obveznik</p>
              {user && (
                <button className={styles.profileFillBtn} onClick={fillFromProfile} title="Popuni iz korisničkog profila">
                  Popuni iz profila
                </button>
              )}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>1. JMB</label>
              <input className={styles.fieldInput} value={obveznik.jmb} onChange={setO("jmb")} placeholder="XXXXXXXXXXXXX" maxLength={13} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>2. Prezime i ime</label>
              <input className={styles.fieldInput} value={obveznik.imeIPrezime} onChange={setO("imeIPrezime")} placeholder="Prezime Ime" />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>3. Adresa</label>
              <input className={styles.fieldInput} value={obveznik.adresa} onChange={setO("adresa")} placeholder="Ulica bb, Grad" />
            </div>
          </div>

          <div className={styles.colGroup}>
            <p className={styles.colLabel}>Registrovana djelatnost</p>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>4. JIB</label>
              <input className={styles.fieldInput} value={obveznik.jib} onChange={setO("jib")} placeholder="XXXXXXXXXXXX" maxLength={13} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>5. Naziv</label>
              <input className={styles.fieldInput} value={obveznik.naziv} onChange={setO("naziv")} placeholder='Obrt "Naziv"' />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>6. Adresa djelatnosti</label>
              <input className={styles.fieldInput} value={obveznik.adresaDjelatnosti} onChange={setO("adresaDjelatnosti")} placeholder="Ulica bb, Grad" />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>7. Šifra djelatnosti</label>
                <input className={styles.fieldInput} value={obveznik.vrstaSifra} onChange={setO("vrstaSifra")} placeholder="49.41" style={{ maxWidth: 100 }} maxLength={5} />
              </div>
              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <label className={styles.fieldLabel}>Naziv djelatnosti</label>
                <input className={styles.fieldInput} value={obveznik.vrstaNaziv} onChange={setO("vrstaNaziv")} placeholder="Drumski prijevoz tereta" />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.periodRow}>
          <div className={styles.periodFields}>
            {!obveznik.manualPeriod ? (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Porezna godina</label>
                <input className={styles.fieldInput} value={obveznik.godina} onChange={setO("godina")} placeholder="2025" style={{ maxWidth: 110 }} />
              </div>
            ) : (
              <>
                <div className={styles.fieldGroup} style={{ width: 160 }}>
                  <label className={styles.fieldLabel}>Period od</label>
                  <DateInput value={obveznik.periodOd}
                    onValueChange={iso => {
                      if (!iso) { setObveznik(p => ({ ...p, periodOd: iso })); return; }
                      const year = iso.slice(0, 4);
                      const doYear = obveznik.periodDo.slice(0, 4);
                      const newDo = doYear !== year ? `${year}-12-31` : obveznik.periodDo;
                      setObveznik(p => ({ ...p, periodOd: iso, periodDo: newDo }));
                      markDirty();
                    }}
                    className={styles.fieldInput} />
                </div>
                <div className={styles.periodSep}>—</div>
                <div className={styles.fieldGroup} style={{ width: 160 }}>
                  <label className={styles.fieldLabel}>do</label>
                  <DateInput value={obveznik.periodDo}
                    onValueChange={iso => {
                      if (!iso) { setObveznik(p => ({ ...p, periodDo: iso })); return; }
                      const odYear = obveznik.periodOd.slice(0, 4) || iso.slice(0, 4);
                      const clampedIso = odYear ? iso.replace(/^\d{4}/, odYear) : iso;
                      setObveznik(p => ({ ...p, periodDo: clampedIso }));
                      markDirty();
                    }}
                    className={styles.fieldInput} />
                </div>
              </>
            )}
          </div>
          <label className={styles.manualToggle}>
            <input type="checkbox" checked={obveznik.manualPeriod}
              onChange={e => { setObveznik(p => ({ ...p, manualPeriod: e.target.checked })); markDirty(); }} />
            Ručno unesi period amortizacije
          </label>
        </div>
      </section>

      {/* Dio 2 — Tabela */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: "1.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
          Podaci o dugotrajnoj imovini
        </h2>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thRb}>8)<br />Rb.</th>
                <th className={`${styles.thNaziv}`} onClick={() => handleSort("naziv")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <span className={styles.sortHeader}>9) Naziv sredstva{sortIcon("naziv", sortKey, sortDir)}</span>
                </th>
                <th className={styles.thDatum} onClick={() => handleSort("datumNabavke")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <span className={styles.sortHeader}>10) Datum nabavke{sortIcon("datumNabavke", sortKey, sortDir)}</span>
                </th>
                <th className={styles.thDok}>11) Br. dok.</th>
                {thSort("nabavnaVrijednost", <>12) Nabavna<br />vrijednost</>)}
                {thSort("kvPocetak", <>13) Knj. vrijednost<br />(početak godine)</>)}
                <th className={styles.thVijek}>14) Vijek<br />trajanja</th>
                <th className={styles.thStopa}>15) Stopa<br />(%)</th>
                <th className={styles.thMj}>Mj.</th>
                {thSort("iznos", <>16) Iznos<br />amortizacije</>)}
                {thSort("kvKraj", <>17) KV na kraju<br />godine</>)}
                <th className={styles.thDatumProdaje} title="Datum prodaje ili otpisa">Datum prodaje</th>
                <th className={styles.thOtpis} title="Prodano / otpisano">Otpis</th>
                <th className={styles.thDel}></th>
              </tr>
            </thead>
            <tbody>
              {sortedIndices.map((origIdx, displayIdx) => {
                const row = rows[origIdx];
                const calc = computed[origIdx];
                return (
                  <tr key={row.id} className={row.prodano ? styles.rowProdano : ""}>
                    <td className={styles.tdRb}>{String(displayIdx + 1).padStart(2, "0")}</td>
                    <td>
                      <input className={styles.tdInput} value={row.naziv}
                        onChange={setRow(row.id, "naziv")} placeholder="Naziv sredstva" />
                    </td>
                    <td>
                      <DateInput value={row.datumNabavke} onValueChange={setDatum(row.id)} className={styles.tdInput} />
                    </td>
                    <td>
                      <input className={`${styles.tdInput} ${styles.tdCenter}`} value={row.brojDokumenta}
                        onChange={setRow(row.id, "brojDokumenta")} placeholder="—" />
                    </td>
                    <td>
                      <input className={`${styles.tdInput} ${styles.tdRight}`} value={row.nabavnaVrijednost}
                        onChange={setRow(row.id, "nabavnaVrijednost")}
                        onBlur={handleNumberBlur(row.id, "nabavnaVrijednost")}
                        placeholder="0,00" inputMode="decimal" />
                    </td>
                    <td>
                      <input className={`${styles.tdInput} ${styles.tdRight}`} value={row.kvPocetak}
                        onChange={setRow(row.id, "kvPocetak")}
                        onBlur={handleNumberBlur(row.id, "kvPocetak")}
                        placeholder="0,00" inputMode="decimal" />
                    </td>
                    <td>
                      <div className={styles.sufikWrap}>
                        <input className={`${styles.tdInput} ${styles.tdCenter}`} value={row.vijekTrajanja}
                          onChange={setRow(row.id, "vijekTrajanja")}
                          placeholder="7" inputMode="numeric" style={{ maxWidth: 52 }} maxLength={3} />
                        <span className={styles.sufikLabel}>god.</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.sufikWrap}>
                        <input className={`${styles.tdInput} ${styles.tdCenter}`} value={row.stopaOverride}
                          onChange={setRow(row.id, "stopaOverride")}
                          placeholder={VIJEK_STOPA[row.vijekTrajanja] ? String(VIJEK_STOPA[row.vijekTrajanja]) : "—"}
                          inputMode="decimal" style={{ maxWidth: 82 }} maxLength={6} />
                        <span className={styles.sufikLabel}>%</span>
                      </div>
                    </td>
                    <td>
                      <input className={`${styles.tdInput} ${styles.tdCenter}`} value={row.mjeseciOverride}
                        onChange={setRow(row.id, "mjeseciOverride")}
                        placeholder="12" maxLength={2} inputMode="numeric" />
                    </td>
                    <td className={styles.tdAuto}>{fmtKm(calc.iznos)}</td>
                    <td className={`${styles.tdAuto} ${row.prodano ? styles.tdKvKrajProdano : ""}`}>{fmtKm(calc.kvKraj)}</td>
                    <td>
                      {row.prodano ? (
                        <DateInput
                          value={row.datumProdaje}
                          onValueChange={setDatumProdaje(row.id)}
                          className={`${styles.tdInput} ${!row.datumProdaje ? styles.tdDatumProdajeHighlight : ""}`}
                        />
                      ) : <span className={styles.tdEmpty}>—</span>}
                    </td>
                    <td className={styles.tdCenter}>
                      <input type="checkbox" className={styles.otpisCheck}
                        checked={row.prodano} onChange={() => toggleProdano(row.id)}
                        title="Označiti kao prodano/otpisano" />
                    </td>
                    <td>
                      <button className={styles.delBtn} onClick={() => removeRow(row.id)} title="Ukloni red">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan={4} className={styles.totalLabel}>Ukupno za sve stranice — prijenos</td>
                <td className={styles.totalKm}>{fmtKm(totals.nabavna)}</td>
                <td className={styles.totalKm}>{fmtKm(totals.kv)}</td>
                <td colSpan={3}></td>
                <td className={styles.totalKm}>{fmtKm(totals.iznos)}</td>
                <td className={styles.totalKm}>{fmtKm(totals.kvKraj)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button className={styles.addBtn} onClick={addRow}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" />
          </svg>
          Dodaj sredstvo
        </button>
      </section>

      {/* Actions */}
      {isDirty && <p className={styles.dirtyBadge}>Promjene nisu spremljene</p>}
      <div className={styles.actionsRow}>
        <button className={saveBtnClass} onClick={handleSave} disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : saveStatus === "saved" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
          )}
          {saveStatus === "saving" ? "Čuvam…" : saveStatus === "saved" ? "Sačuvano!" : saveStatus === "error" ? "Greška, pokušaj ponovo" : "Sačuvaj"}
        </button>

        <button className={styles.carryoverBtn} onClick={handleCarryover} disabled={saveStatus === "saving"}
          title={`Prenesi sva aktivna sredstva u ${parseInt(obveznik.godina || currentYear) + 1}. godinu`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          Prenesi u {parseInt(obveznik.godina || currentYear) + 1}.
        </button>

        <button className={styles.exportBtn} onClick={handleExport} disabled={exportLoading}>
          {exportLoading ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          {exportLoading ? "Generišem PDF…" : "Preuzmi PLDI-1043 obrazac"}
        </button>
      </div>

      <p className={styles.napomena}>
        Obrazac PLDI-1043 · Popisna lista dugotrajne imovine · Federacija BiH
      </p>

      <FaqSection items={[
        { q: "Ko je obavezan podnijeti PLDI-1043 obrazac?", a: "PLDI-1043 podnose fizičke osobe koje obavljaju samostalnu djelatnost i posjeduju dugotrajnu imovinu (stalna sredstva) koja se koristi u poslovne svrhe. Obrazac se predaje kao prilog godišnjoj prijavi poreza (GPD-1051) i specifikaciji SPR-1053." },
        { q: "Šta se smatra stalnim sredstvima (dugotrajnom imovinom)?", a: "Stalnim sredstvima smatraju se materijalna i nematerijalna dobra čiji je vijek trajanja duži od jedne godine i čija nabavna vrijednost prelazi propisani prag. To uključuje: vozila, opremu, računare, namještaj, poslovne prostore, patente, licence i slična sredstva koja se koriste u obavljanju djelatnosti." },
        { q: "Koje stope amortizacije se primjenjuju u FBiH?", a: "Stope amortizacije ovise o vijeku trajanja sredstva. Primjeri: računari i softver (3 god. — 33,33%), vozila (5 god. — 20%), oprema (7 god. — 14,29%), poslovni objekti (25–40 god. — 2,5–4%). Porezno priznate stope propisane su Pravilnikom o primjeni Zakona o porezu na dohodak FBiH." },
        { q: "Šta se dešava kad je sredstvo prodano ili otpisano?", a: "Kod prodaje sredstva, amortizacija se obračunava samo za period dok je sredstvo korišteno (do datuma prodaje). Preostala knjigovodstvena vrijednost ne prenosi se u narednu godinu. Na PLDI obrascu se u koloni 17 upisuje napomena o prodaji umjesto preostale vrijednosti." },
        { q: "Kako funkcioniše prenos podataka iz prethodne godine?", a: "Naš generator automatski prenosi knjigovodstvenu vrijednost (kolona 13) iz prethodne godine u novu godinu, čime se osigurava kontinuitet evidencije. Sredstva koja su prodana ili otpisana ne prenose se dalje." },
        { q: "Mogu li koristiti različite stope amortizacije za različita sredstva?", a: "Da, svako sredstvo može imati svoju stopu amortizacije zavisno od njegove prirode i vijeka trajanja. Stopa mora biti u skladu s propisanim porezno priznatim stopama. Nije dozvoljeno nasumično mijenjanje stopa iz godine u godinu za isto sredstvo." },
      ]} />
    </div>
  );
}
