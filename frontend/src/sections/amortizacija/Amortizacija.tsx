"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "src/hooks/useRole";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import OrgSelect from "src/components/OrgSelect/OrgSelect";
import LoadState from "src/components/LoadState/LoadState";
import { useLastOrg } from "src/hooks/useLastOrg";
import FaqSection from "src/components/FaqSection/FaqSection";
import styles from "./amortizacija.module.css";
import { fillPldiTemplate, type PldiData } from "./fillPldi";
import DateInput from "src/components/DateInput/DateInput";
import CitySelect from "src/components/CitySelect/CitySelect";
import { useCityLookup } from "src/hooks/useCities";
import { formatAddress } from "src/utils/formatAddress";
import {
  getAmortizacijaYears,
  getAmortizacija,
  saveAmortizacija,
  deleteAmortizacija,
  markAmortizacijaGenerated,
  getOrgYears,
} from "src/api/amortizacija";
import SaveToProfileButton from "src/components/SaveToProfileButton/SaveToProfileButton";
import SaveToast from "src/components/SaveToast/SaveToast";
import { trackEvent } from "src/api/activity";
import {
  getOrganizations,
  getClientOrganizations,
  type Organization,
} from "src/api/profile";

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
  grad: string;
  jib: string;
  naziv: string;
  adresaDjelatnosti: string;
  gradDjelatnosti: string;
  vrstaSifra: string;
  vrstaNaziv: string;
  godina: string;
  manualPeriod: boolean;
  periodOd: string;
  periodDo: string;
}

type SortKey =
  | "naziv"
  | "datumNabavke"
  | "nabavnaVrijednost"
  | "kvPocetak"
  | "iznos"
  | "kvKraj";

/* ── Constants ── */
export const VIJEK_STOPA: Record<string, number> = Object.fromEntries(
  Array.from({ length: 40 }, (_, i) => {
    const god = i + 1;
    return [String(god), Math.round((100 / god) * 100) / 100];
  }),
);

/* ── Helpers ── */
export function r2(n: number) {
  return Math.round(n * 100) / 100;
}

// Dopuni PRAZNA polja obveznika iz podataka organizacije (firm-level: JIB,
// naziv, djelatnost) i vlasnika (person-level: JMB, ime, adresa). Snimljene
// vrijednosti imaju prednost. Registri kreirani iz PK Office-a (nativna
// stranica, knjiženje ulaznog računa) imaju prazan obveznik blok, pa se bez
// ovoga zaglavlje obrasca prikaže prazno.
function mergeObveznikSaOrg(p: ObveznikData, org: Organization): ObveznikData {
  const owner = org.owner;
  return {
    ...p,
    jmb: p.jmb || owner?.jmbg || "",
    imeIPrezime:
      p.imeIPrezime ||
      [owner?.firstName, owner?.lastName].filter(Boolean).join(" "),
    adresa: p.adresa || owner?.address || "",
    grad: p.grad || owner?.city || "",
    jib: p.jib || org.taxNumber || "",
    naziv: p.naziv || org.name || "",
    adresaDjelatnosti: p.adresaDjelatnosti || org.address || "",
    gradDjelatnosti: p.gradDjelatnosti || org.city || "",
    vrstaSifra: p.vrstaSifra || org.activityCode || "",
    vrstaNaziv: p.vrstaNaziv || org.activityName || "",
  };
}

// crypto.randomUUID() is only available in secure contexts (HTTPS or localhost).
// On LAN-IP dev (http://192.168.x.x) it's undefined — fall back to a sufficient
// local-id generator (used only as React key / row id, not security-sensitive).
function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function bsFmt(n: number): string {
  const [int, dec] = n.toFixed(2).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + dec;
}

function fmtKm(n: number | null): string {
  if (n === null) return "–";
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
  return Math.min(12, Math.max(1, doo.getMonth() - od.getMonth() + 1));
}

function calcMjeseci(isoDate: string, odISO: string, doISO: string): number {
  const total = periodMonths(odISO, doISO);
  if (!isoDate) return total;
  const acq = new Date(isoDate);
  const od = new Date(odISO);
  const doo = new Date(doISO);
  if (acq <= od) return total;
  if (acq > doo) return 0;
  return Math.min(12, Math.max(1, doo.getMonth() - acq.getMonth() + 1));
}

function calcMjeseciProdaje(
  datumProdaje: string,
  datumNabavke: string,
  odISO: string,
): number {
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
    const stopaVal = row.stopaOverride
      ? parseDec(row.stopaOverride)
      : stopaAuto;
    const stopa = stopaVal ?? 0;
    const mjeseci = row.datumProdaje
      ? calcMjeseciProdaje(row.datumProdaje, row.datumNabavke, odISO)
      : row.mjeseciOverride
        ? parseInt(row.mjeseciOverride) || 0
        : 0;
    if (!stopaVal || nabavna === 0)
      return {
        stopa,
        mjeseci,
        iznos: null as number | null,
        kvKraj: 0 as number | null,
      };
    if (kvStart === null || kvStart === 0)
      return { stopa, mjeseci, iznos: 0, kvKraj: 0 };
    const periodDepr = r2(((nabavna * stopaVal) / 100) * (mjeseci / 12));
    const iznos = r2(Math.min(periodDepr, kvStart));
    return { stopa, mjeseci, iznos, kvKraj: 0 as number | null };
  }

  const nabavna = parseDec(row.nabavnaVrijednost) ?? 0;
  const kvStart = parseDec(row.kvPocetak);
  const stopaAuto = VIJEK_STOPA[row.vijekTrajanja]; // undefined if vijek not in map
  const stopaVal = row.stopaOverride ? parseDec(row.stopaOverride) : stopaAuto;
  const stopa = stopaVal ?? 0; // for display placeholder only
  const mjeseciAuto = calcMjeseci(row.datumNabavke, odISO, doISO);
  const mjeseci = Math.min(
    12,
    row.mjeseciOverride
      ? parseInt(row.mjeseciOverride) || mjeseciAuto
      : mjeseciAuto,
  );

  // No stopa entered — don't calculate
  if (stopaVal === undefined || stopaVal === null) {
    return {
      stopa,
      mjeseci,
      iznos: null as number | null,
      kvKraj: null as number | null,
    };
  }

  if (nabavna === 0)
    return {
      stopa,
      mjeseci,
      iznos: null as number | null,
      kvKraj: null as number | null,
    };
  if (kvStart === null || kvStart === 0)
    return { stopa, mjeseci, iznos: 0, kvKraj: 0 };

  const periodDepr = r2(((nabavna * stopa) / 100) * (mjeseci / 12));
  const iznos = r2(Math.min(periodDepr, kvStart));
  return { stopa, mjeseci, iznos, kvKraj: r2(kvStart - iznos) };
}

function newRow(): AssetRow {
  return {
    id: genId(),
    naziv: "",
    datumNabavke: "",
    brojDokumenta: "",
    nabavnaVrijednost: "",
    kvPocetak: "",
    vijekTrajanja: "",
    stopaOverride: "",
    mjeseciOverride: "",
    napomena: "",
    prodano: false,
    datumProdaje: "",
  };
}

function makeObveznik(year: string): ObveznikData {
  return {
    jmb: "",
    imeIPrezime: "",
    adresa: "",
    grad: "",
    jib: "",
    naziv: "",
    adresaDjelatnosti: "",
    gradDjelatnosti: "",
    vrstaSifra: "",
    vrstaNaziv: "",
    godina: year,
    manualPeriod: false,
    periodOd: `${year}-01-01`,
    periodDo: `${year}-12-31`,
  };
}

/* ── Sort helper ── */
function sortIcon(
  key: SortKey,
  sortKey: SortKey | null,
  sortDir: "asc" | "desc",
) {
  if (sortKey !== key) return <span className={styles.sortIconNeutral}>⇅</span>;
  return (
    <span className={styles.sortIconActive}>
      {sortDir === "asc" ? "↑" : "↓"}
    </span>
  );
}

/* ── Component ── */
export default function Amortizacija() {
  return <AmortizacijaApp />;
}

function AmortizacijaApp() {
  const currentYear = new Date().getFullYear().toString();
  const { findByName: findCity } = useCityLookup();

  const [obveznik, setObveznik] = useState<ObveznikData>(
    makeObveznik(currentYear),
  );
  const [rows, setRows] = useState<AssetRow[]>([newRow()]);
  const [savedYears, setSavedYears] = useState<number[]>([]);
  const [visitedYears, setVisitedYears] = useState<number[]>([
    parseInt(currentYear),
  ]);
  const [deletedYears, setDeletedYears] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  // selectedOrgId — id organizacije (svoja ili klijent) za koju vodimo
  // amortizaciju. Sinhronizovano sa lastOrgId kroz `useLastOrg` da kad korisnik
  // prelazi između Plata / Radnika / Amortizacije, ista org ostaje aktivna.
  // `?org=X` URL param ima prednost (deep-link iz /organizacije pregleda).
  const { lastOrgId, loaded: lastOrgLoaded, setLastOrgId } = useLastOrg();
  const searchParams = useSearchParams();
  const urlOrgInit = (() => {
    const v = searchParams.get("org");
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(urlOrgInit);
  const [orgHydrated, setOrgHydrated] = useState<boolean>(urlOrgInit != null);
  const [showNewYear, setShowNewYear] = useState(false);
  const [newYearVal, setNewYearVal] = useState("");
  const [yearToDelete, setYearToDelete] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showCarryoverConfirm, setShowCarryoverConfirm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const isLoadingRef = useRef(false);
  const newYearRef = useRef<HTMLInputElement>(null);
  const selectedOrgIdRef = useRef(selectedOrgId);
  useEffect(() => { selectedOrgIdRef.current = selectedOrgId; }, [selectedOrgId]);

  // setOrgId wrapper koji takođe upiše u localStorage preko useLastOrg,
  // tako da prelazak na drugi tab (Plate, Radnici…) pamti istog klijenta.
  const setOrgId = useCallback(
    (id: number | null) => {
      setSelectedOrgId(id);
      if (id != null) setLastOrgId(id);
    },
    [setLastOrgId],
  );

  // Ako je org došao kroz URL ?org= param, propagiraj ga u lastOrgId
  // (jednom pri mount-u) da prelazak na drugi tab pamti tu org-u.
  const urlOrgSyncedRef = useRef(false);
  useEffect(() => {
    if (urlOrgSyncedRef.current) return;
    if (urlOrgInit != null) {
      setLastOrgId(urlOrgInit);
      urlOrgSyncedRef.current = true;
    }
  }, [urlOrgInit, setLastOrgId]);

  // Faza 3B: pristup amortizaciji za klijente imamo ako sami imamo PRO+
  // ILI smo član bilo koje organizacije čiji je vlasnik PRO+. `isPro` se
  // koristi za prikaz limita; ostavljen je vezan za vlastiti plan jer se
  // klijent limit od 20 računa per-org u backendu (a frontend tu samo
  // informativno prikazuje).
  const { hasAccessToTier, tier: maxTier } = useMaxAccessibleTier();
  const { role } = useRole();
  const isLoggedIn = !!role;
  const isClientUser = hasAccessToTier("PRO");
  const isPro = maxTier === "PRO";
  const PRO_CLIENT_LIMIT = 20;


  /* ── Organizacije: vlastite + klijentske. Korisnik bira kojoj vodi
     amortizaciju iz drop-down-a; lastOrgId pamti izbor između tabova. */
  const ownOrgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await getOrganizations();
      return res.ok ? (res.data ?? []) : [];
    },
    enabled: isLoggedIn,
  });
  const clientOrgsQuery = useQuery({
    queryKey: ["organizations-clients"],
    queryFn: async () => {
      const res = await getClientOrganizations();
      return res.ok ? (res.data ?? []) : [];
    },
    enabled: isLoggedIn,
  });

  // Spojena lista svih dostupnih org-a (svoja prvo, pa klijenti). Dedup po id-u.
  const allOrgs = useMemo<Organization[]>(() => {
    const map = new Map<number, Organization>();
    for (const o of ownOrgsQuery.data ?? []) map.set(o.id, o);
    for (const o of clientOrgsQuery.data ?? []) if (!map.has(o.id)) map.set(o.id, o);
    return Array.from(map.values());
  }, [ownOrgsQuery.data, clientOrgsQuery.data]);

  // Hidracija u 2 faze (isti pattern kao Aktivni radnici / ObracunPlata):
  //   1) Sačekaj da useLastOrg pročita localStorage (lastOrgLoaded).
  //   2) Usvoji lastOrgId ako postoji i validan je, inače auto-select prvu org-u.
  useEffect(() => {
    if (orgHydrated) return;
    if (!lastOrgLoaded) return;
    if (lastOrgId != null) {
      setSelectedOrgId(lastOrgId);
      setOrgHydrated(true);
      return;
    }
    if (allOrgs.length > 0) {
      setSelectedOrgId(allOrgs[0].id);
      setLastOrgId(allOrgs[0].id);
    }
    setOrgHydrated(true);
  }, [orgHydrated, lastOrgLoaded, lastOrgId, allOrgs, setLastOrgId]);

  // Mapa orgId → [godine] (za "ima li PLDI" indikator pored org-e u dropdown-u).
  const orgYearsQuery = useQuery({
    queryKey: ["amortizacijaOrgYears"],
    queryFn: async () => {
      const res = await getOrgYears();
      return res.ok ? res.data : {};
    },
    enabled: isLoggedIn,
  });

  // Aktivna org-a (objekat) — koristi se za auto-popunu obveznika.
  const activeOrg = useMemo(
    () => allOrgs.find((o) => o.id === selectedOrgId) ?? null,
    [allOrgs, selectedOrgId],
  );
  // Ref za applyLoadedData (deps []) da učitani podaci odmah prođu kroz
  // mergeObveznikSaOrg bez re-kreiranja callback-a.
  const activeOrgRef = useRef<Organization | null>(null);
  useEffect(() => {
    activeOrgRef.current = activeOrg;
  }, [activeOrg]);
  // Ako lista organizacija stigne POSLIJE učitanih podataka (prvi load),
  // naknadno dopuni prazna polja. Jednom po org-i, da ne vraća vrijednost
  // u polje koje korisnik namjerno obriše.
  const prefillOrgIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!activeOrg) return;
    if (prefillOrgIdRef.current === activeOrg.id) return;
    prefillOrgIdRef.current = activeOrg.id;
    setObveznik((p) => mergeObveznikSaOrg(p, activeOrg));
  }, [activeOrg]);
  // Skup već-prefill-ovanih (org, godina) kombinacija: prefill iz org podataka
  // radimo SAMO na prvom učitavanju svake org+godine. Povratak na već viđenu
  // godinu ne smije vratiti polje koje je korisnik u međuvremenu obrisao.
  const loadedKeysRef = useRef<Set<string>>(new Set());

  /* ── Dirty tracking ── */
  const markDirty = useCallback(() => {
    if (!isLoadingRef.current) setIsDirty(true);
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /* ── Auto-save (debounced) ── */
  const handleSaveRef = useRef<() => Promise<void>>(() => Promise.resolve());
  useEffect(() => {
    if (!isDirty) return;
    if (isLoadingRef.current) return;
    const handle = setTimeout(() => {
      void handleSaveRef.current();
    }, 1500);
    return () => clearTimeout(handle);
  }, [isDirty, obveznik, rows]);

  /* ── Load helpers ── */
  const applyLoadedData = useCallback(
    (data: { obveznik?: ObveznikData; rows?: AssetRow[] }) => {
      if (!data?.obveznik) return;
      isLoadingRef.current = true;
      const loaded: ObveznikData = {
        jmb: data.obveznik.jmb ?? "",
        imeIPrezime: data.obveznik.imeIPrezime ?? "",
        adresa: data.obveznik.adresa ?? "",
        grad: data.obveznik.grad ?? "",
        jib: data.obveznik.jib ?? "",
        naziv: data.obveznik.naziv ?? "",
        adresaDjelatnosti: data.obveznik.adresaDjelatnosti ?? "",
        gradDjelatnosti: data.obveznik.gradDjelatnosti ?? "",
        vrstaSifra: data.obveznik.vrstaSifra ?? "",
        vrstaNaziv: data.obveznik.vrstaNaziv ?? "",
        godina: data.obveznik.godina ?? "",
        manualPeriod: data.obveznik.manualPeriod ?? false,
        periodOd: data.obveznik.periodOd ?? "",
        periodDo: data.obveznik.periodDo ?? "",
      };
      const org = activeOrgRef.current;
      // prefill iz org podataka samo na prvom učitavanju ove org+godine;
      // naknadni load (npr. povratak na godinu) poštuje snimljene (i namjerno
      // obrisane) vrijednosti
      const key = org ? `${org.id}:${loaded.godina}` : "";
      const prviLoad = key !== "" && !loadedKeysRef.current.has(key);
      if (key !== "") loadedKeysRef.current.add(key);
      setObveznik(org && prviLoad ? mergeObveznikSaOrg(loaded, org) : loaded);
      setRows(
        (data.rows ?? []).map((r) => ({
          id: genId(),
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
        })),
      );
      setTimeout(() => {
        isLoadingRef.current = false;
        setIsDirty(false);
      }, 0);
    },
    [],
  );

  useEffect(() => {
    (async () => {
      // Sačekaj da se selectedOrgId hidrira iz localStorage (lastOrgId) prije
      // bilo kakvog learning request-a. Inače se kratko vidi prazan obrazac
      // pa "skok" na učitane podatke kad hidracija završi.
      if (!orgHydrated) return;
      // Bez aktivne organizacije nema šta učitati — sidebar pokazuje
      // "Dodaj organizaciju" prompt.
      if (selectedOrgId === null) return;

      const yearsRes = await getAmortizacijaYears(selectedOrgId);
      if (yearsRes.ok) setSavedYears(yearsRes.data);

      setDataLoading(true);
      const res = await getAmortizacija(currentYear, selectedOrgId);
      setDataLoading(false);
      if (res.ok && res.data) applyLoadedData(res.data);
    })();
  }, [selectedOrgId, orgHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showNewYear) newYearRef.current?.focus();
  }, [showNewYear]);

  useEffect(() => {
    if (obveznik.godina.length !== 4) return;
    const yr = parseInt(obveznik.godina);
    if (isNaN(yr)) return;
    setVisitedYears((prev) => (prev.includes(yr) ? prev : [...prev, yr]));
    setDeletedYears((prev) => {
      const next = new Set(prev);
      next.delete(yr);
      return next;
    });
  }, [obveznik.godina]);

  // (Auto-select prve org-e se sad radi unutar hidracijskog useEffect-a iznad.)

  /* ── Year switching ── */
  const doSwitchYear = useCallback(
    async (year: string) => {
      const yr = parseInt(year);
      setVisitedYears((prev) => (prev.includes(yr) ? prev : [...prev, yr]));
      setDeletedYears((prev) => {
        const next = new Set(prev);
        next.delete(yr);
        return next;
      });
      setDataLoading(true);
      const res = await getAmortizacija(year, selectedOrgIdRef.current);
      setDataLoading(false);
      if (res.ok && res.data) {
        applyLoadedData(res.data);
      } else {
        isLoadingRef.current = true;
        setObveznik((p) => ({
          ...p,
          godina: year,
          manualPeriod: false,
          periodOd: `${year}-01-01`,
          periodDo: `${year}-12-31`,
        }));
        setRows([newRow()]);
        setTimeout(() => {
          isLoadingRef.current = false;
          setIsDirty(false);
        }, 0);
      }
      setSaveStatus("idle");
    },
    [applyLoadedData],
  );

  const handleYearClick = useCallback(
    async (yr: number) => {
      if (parseInt(obveznik.godina) === yr) return;
      if (isDirty) {
        await handleSaveRef.current();
      }
      doSwitchYear(String(yr));
    },
    [isDirty, obveznik.godina, doSwitchYear],
  );

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    if (!isLoggedIn) return; // anonimni preview, ne snima na backend
    setSaveStatus("saving");
    const orgId = selectedOrgIdRef.current;
    const godina = obveznik.godina || currentYear;
    const res = await saveAmortizacija(godina, { obveznik, rows }, orgId);
    if (res.ok) {
      setSaveStatus("saved");
      setIsDirty(false);
      setSavedYears((prev) => {
        const yr = parseInt(godina);
        return prev.includes(yr) ? prev : [...prev, yr].sort((a, b) => a - b);
      });
      setTimeout(() => setSaveStatus("idle"), 2500);
      // Osvježi listu org→godine da indikator u dropdown-u zna da postoji PLDI.
      void orgYearsQuery.refetch();
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [obveznik, rows, currentYear, orgYearsQuery, isLoggedIn]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  /* ── Carryover ── */
  const handleCarryover = useCallback(async () => {
    const currentGodina = obveznik.godina || currentYear;
    const nextYear = String(parseInt(currentGodina) + 1);

    setSaveStatus("saving");
    const orgId = selectedOrgIdRef.current;

    // Save current year first so nothing is lost
    await saveAmortizacija(currentGodina, { obveznik, rows }, orgId);
    setSavedYears((prev) => {
      const yr = parseInt(currentGodina);
      return prev.includes(yr) ? prev : [...prev, yr].sort((a, b) => a - b);
    });

    const carryoverObveznik: ObveznikData = {
      ...obveznik,
      godina: nextYear,
      manualPeriod: false,
      periodOd: `${nextYear}-01-01`,
      periodDo: `${nextYear}-12-31`,
    };
    const carryoverRows = rows
      .filter((row) => !row.prodano)
      .map((row) => {
        const originalIdx = rows.indexOf(row);
        return {
          ...newRow(),
          naziv: row.naziv,
          datumNabavke: row.datumNabavke,
          brojDokumenta: row.brojDokumenta,
          nabavnaVrijednost: row.nabavnaVrijednost,
          kvPocetak:
            computed[originalIdx].kvKraj !== null
              ? bsFmt(computed[originalIdx].kvKraj!)
              : "",
          vijekTrajanja: row.vijekTrajanja,
          napomena: row.napomena,
        };
      });

    if (carryoverRows.length === 0) carryoverRows.push(newRow());

    isLoadingRef.current = true;
    setObveznik(carryoverObveznik);
    setRows(carryoverRows);
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 0);

    const res = await saveAmortizacija(nextYear, {
      obveznik: carryoverObveznik,
      rows: carryoverRows,
    }, orgId);
    if (res.ok) {
      setSavedYears((prev) => {
        const yr = parseInt(nextYear);
        return prev.includes(yr) ? prev : [...prev, yr].sort((a, b) => a - b);
      });
      setIsDirty(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
      void orgYearsQuery.refetch();
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [obveznik, rows, selectedOrgId, currentYear, orgYearsQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Delete year ── */
  const handleDeleteYear = useCallback(
    async (yr: number) => {
      await deleteAmortizacija(String(yr), selectedOrgIdRef.current);
      const newSaved = savedYears.filter((y) => y !== yr);
      const newVisited = visitedYears.filter((y) => y !== yr);
      setSavedYears(newSaved);
      setVisitedYears(newVisited);
      setDeletedYears((prev) => new Set([...prev, yr]));
      setYearToDelete(null);

      if (parseInt(obveznik.godina || currentYear) === yr) {
        const remaining = [...new Set([...newSaved, ...newVisited])].sort(
          (a, b) => a - b,
        );
        const fallback = [...remaining].reverse().find((y) => y < yr) ?? remaining[remaining.length - 1];
        if (fallback !== undefined) {
          await doSwitchYear(String(fallback));
        } else {
          isLoadingRef.current = true;
          setObveznik((p) => ({
            ...p,
            godina: "",
            manualPeriod: false,
            periodOd: "",
            periodDo: "",
          }));
          setRows([newRow()]);
          setTimeout(() => {
            isLoadingRef.current = false;
            setIsDirty(false);
          }, 0);
        }
      }
    },
    [obveznik.godina, currentYear, savedYears, visitedYears, doSwitchYear],
  );

  /* ── Row handlers ── */
  const setO = useCallback(
    (key: keyof ObveznikData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setObveznik((p) => ({ ...p, [key]: e.target.value }));
      markDirty();
    },
    [markDirty],
  );

  const setRow = useCallback(
    (id: string, key: keyof AssetRow) =>
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        setRows((p) =>
          p.map((r) => (r.id === id ? { ...r, [key]: e.target.value } : r)),
        );
        markDirty();
      },
    [markDirty],
  );

  const handleNumberBlur = useCallback(
    (id: string, key: "nabavnaVrijednost" | "kvPocetak") => () =>
      setRows((p) =>
        p.map((r) => {
          if (r.id !== id) return r;
          return { ...r, [key]: fmtKmInput(r[key]) };
        }),
      ),
    [],
  );

  const toggleProdano = useCallback(
    (id: string) => {
      setRows((p) =>
        p.map((r) =>
          r.id === id
            ? {
                ...r,
                prodano: !r.prodano,
                datumProdaje: r.prodano ? "" : r.datumProdaje,
              }
            : r,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  const addRow = () => {
    setRows((p) => (p.length >= 1000 ? p : [...p, newRow()]));
    markDirty();
  };
  const removeRow = (id: string) => {
    setRows((p) => {
      const next = p.filter((r) => r.id !== id);
      return next.length > 0 ? next : [newRow()];
    });
    markDirty();
  };

  // fillDjelatnost je uklonjen — auto-popuna iz Organization se sada radi u
  // handleSelectOrg kada user promijeni org-u. Ručna izmjena polja je i dalje
  // dostupna (input-i ispod su editabilni).

  /* ── Period ── */
  const activeOd = obveznik.manualPeriod
    ? obveznik.periodOd
    : `${obveznik.godina}-01-01`;
  const activeDo = obveznik.manualPeriod
    ? obveznik.periodDo
    : `${obveznik.godina}-12-31`;

  const setDatumProdaje = useCallback(
    (id: string) => (iso: string) => {
      setRows((p) =>
        p.map((r) => {
          if (r.id !== id) return r;
          const mj = iso
            ? String(calcMjeseciProdaje(iso, r.datumNabavke, activeOd))
            : "";
          return { ...r, datumProdaje: iso, mjeseciOverride: mj };
        }),
      );
      markDirty();
    },
    [activeOd, markDirty],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const setDatum = useCallback(
    (id: string) => (iso: string) => {
      setRows((p) =>
        p.map((r) => {
          if (r.id !== id) return r;
          const mj = iso ? String(calcMjeseci(iso, activeOd, activeDo)) : "";
          return { ...r, datumNabavke: iso, mjeseciOverride: mj };
        }),
      );
      markDirty();
    },
    [activeOd, activeDo, markDirty],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Computed ── */
  const computed = useMemo(
    () => rows.map((r) => ({ id: r.id, ...calcRow(r, activeOd, activeDo) })),
    [rows, activeOd, activeDo],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    let nabavna = 0,
      kv = 0,
      iznos = 0,
      kvKraj = 0;
    rows.forEach((r, i) => {
      nabavna += r.prodano ? 0 : (parseDec(r.nabavnaVrijednost) ?? 0);
      kv += r.prodano ? 0 : (parseDec(r.kvPocetak) ?? 0);
      iznos += computed[i].iznos ?? 0;
      kvKraj += r.prodano ? 0 : (computed[i].kvKraj ?? 0);
    });
    return {
      nabavna: r2(nabavna),
      kv: r2(kv),
      iznos: r2(iznos),
      kvKraj: r2(kvKraj),
    };
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
      const a = rows[ai],
        b = rows[bi];
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
        av = (a[sortKey as keyof AssetRow] as string) ?? "";
        bv = (b[sortKey as keyof AssetRow] as string) ?? "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, computed, sortKey, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Export ── */
  const handleExport = async () => {
    // Server-side osiguranje da neulogovani ne mogu preuzeti PDF tako što
    // skinu `disabled` atribut na dugmetu (preko devtoolsa). Backend save
    // već vraća 401 za anonimne, a ovaj guard sprečava i lokalnu PDF generaciju.
    if (!isLoggedIn) return;
    setExportLoading(true);
    try {
      await handleSave();
      const pldiRows = rows.map((row, idx) => {
        const prodajaNapomena =
          row.prodano && row.datumProdaje
            ? `Prodano: ${isoToDisplay(row.datumProdaje)}`
            : row.prodano
              ? "Prodano/otpisano"
              : "";
        const napomena = [prodajaNapomena, row.napomena]
          .filter(Boolean)
          .join(" | ");
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
        jmb: obveznik.jmb,
        imeIPrezime: obveznik.imeIPrezime,
        adresa: formatAddress(obveznik.adresa, obveznik.grad, findCity(obveznik.grad)?.postalCode),
        jib: obveznik.jib,
        naziv: obveznik.naziv,
        adresaDjelatnosti: formatAddress(obveznik.adresaDjelatnosti, obveznik.gradDjelatnosti, findCity(obveznik.gradDjelatnosti)?.postalCode),
        vrstaSifra: obveznik.vrstaSifra,
        vrstaNaziv: obveznik.vrstaNaziv,
        godina: obveznik.godina,
        periodOd: isoToDisplay(activeOd),
        periodDo: isoToDisplay(activeDo),
        rows: pldiRows,
        totalNabavna: totals.nabavna,
        totalKv: totals.kv,
        totalIznos: totals.iznos,
        totalKvKraj: totals.kvKraj,
      };

      const bytes = await fillPldiTemplate(data);
      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PLDI-1043-${obveznik.godina}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      trackEvent("PLDI_GENERATE", "PLDI-1043 (amortizacija)", selectedOrgId);
      // Preuzimanje → sačuvana PLDI forma prelazi iz Nacrt u Generisan (best-effort).
      void markAmortizacijaGenerated(obveznik.godina, selectedOrgId).catch(() => {});
    } finally {
      setExportLoading(false);
    }
  };

  /* ── Derived ── */
  const allYears = useMemo(() => {
    const set = new Set(
      [...savedYears, ...visitedYears].filter((y) => !deletedYears.has(y)),
    );
    return [...set].sort((a, b) => a - b);
  }, [savedYears, visitedYears, deletedYears]);

  const activeYear = parseInt(obveznik.godina || currentYear);

  const pldiYear = obveznik.godina.length === 4 ? parseInt(obveznik.godina) : null;

  const buildPldiData = useCallback(
    () => ({ obveznik, rows }),
    [obveznik, rows],
  );

  /* ── Org switch ── */
  const handleSelectOrg = useCallback(
    async (orgId: number | null) => {
      if (orgId === selectedOrgId) return;
      setOrgId(orgId);
      setSavedYears([]);
      setVisitedYears([parseInt(currentYear)]);
      setDeletedYears(new Set());
      setSaveStatus("idle");
      isLoadingRef.current = true;
      setRows([newRow()]);
      setObveznik(makeObveznik(currentYear));
      setTimeout(() => { isLoadingRef.current = false; setIsDirty(false); }, 0);

      if (orgId !== null) {
        const org = allOrgs.find((o) => o.id === orgId);
        if (org) {
          // Auto-popuna obveznika iz Organization + owner podataka (obveznik
          // je upravo resetovan pa su sva polja prazna).
          isLoadingRef.current = true;
          setObveznik((p) => mergeObveznikSaOrg(p, org));
          // označi da je ova org već prefill-ovana da per-org effect ne
          // odradi isti (idempotentan) merge još jednom
          prefillOrgIdRef.current = orgId;
          setTimeout(() => { isLoadingRef.current = false; }, 0);
        }
      }
    },
    [selectedOrgId, currentYear, allOrgs, setOrgId],
  );

  // No-op handleNazivBlur — naziv djelatnosti se sada čuva u obveznik snapshot-u,
  // ne više u PersonClient entitetu. Originalni handler je upisivao naziv
  // nazad u PersonClient.firstName što više nije potrebno.
  const handleNazivBlur = useCallback(() => {}, []);

  const thSort = (key: SortKey, label: React.ReactNode) => (
    <th
      className={`${styles.thKm} ${key === "iznos" || key === "kvKraj" ? styles.thAuto : ""}`}
      onClick={() => handleSort(key)}
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      <span className={styles.sortHeader}>
        {label}
        {sortIcon(key, sortKey, sortDir)}
      </span>
    </th>
  );

  // Org picker — kompaktan dropdown sa optgroup-ima za vlastite i klijentske
  // org-e (konzistentno sa ObracunPlata / AktivniRadnici). lastOrgId pamti
  // odabir između tabova.
  const ownOrgs = ownOrgsQuery.data ?? [];
  const clientOrgs = clientOrgsQuery.data ?? [];
  const hasAnyOrg = ownOrgs.length > 0 || clientOrgs.length > 0;
  const canSeeClients = isClientUser; // PRO+ vidi i klijentske org-e
  const orgPicker = (
    <div
      style={{
        padding: "0.9rem 1.1rem",
        background: "white",
        border: "1px solid #d4cfc4",
        borderRadius: 10,
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.9rem",
        flexWrap: "wrap",
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          fontSize: "0.85rem",
          fontWeight: 600,
          flex: "1 1 280px",
          minWidth: 240,
        }}
      >
        <span style={{ color: "#666", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.04em" }}>
          Organizacija
        </span>
        <OrgSelect
          value={selectedOrgId}
          onChange={(v) => handleSelectOrg(v)}
          ownOrgs={ownOrgs}
          clientOrgs={clientOrgs}
          getLabel={(o) =>
            `${o.name}${orgYearsQuery.data?.[String(o.id)]?.length ? " •" : ""}`
          }
          wrapStyle={{ flex: 1 }}
        />
      </label>

      {/* Slučaj: user nema nijednu org-u → link na profil za dodavanje. */}
      {!hasAnyOrg && (
        <a
          href="/profil?novaOrg=1"
          style={{
            padding: "0.5rem 0.9rem",
            background: "#3a5c42",
            color: "white",
            borderRadius: 6,
            fontSize: "0.85rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Dodaj organizaciju
        </a>
      )}

      {/* Free user sa svojom org-om → pozivnica za pretplatu (otključava klijente). */}
      {hasAnyOrg && !canSeeClients && (
        <a
          href="/pretplate?plan=pro"
          style={{
            fontSize: "0.78rem",
            color: "#3a5c42",
            textDecoration: "underline",
          }}
        >
          🔒 Otključaj klijente (Pro+)
        </a>
      )}

      {/* Limit upozorenje. */}
      {canSeeClients && clientOrgs.length >= PRO_CLIENT_LIMIT && isPro && (
        <a
          href="/pretplate?plan=business"
          style={{
            fontSize: "0.78rem",
            color: "#92400e",
            textDecoration: "underline",
          }}
        >
          Limit od {PRO_CLIENT_LIMIT} klijenata dostignut, nadogradi na Business
        </a>
      )}
    </div>
  );

  return (
    <div className={styles.pageOuter}>
      <SaveToast status={saveStatus} />
      {/* Header, full width, above sidebar layout */}
      <div className={styles.header}>
        <p className={styles.label}>Obrazac PLDI-1043</p>
        <h1 className={styles.h1}>
          PLDI-1043 obrazac, popisna lista <em>dugotrajne imovine i amortizacija</em>
        </h1>
        <p className={styles.subtitle}>
          Kako popuniti PLDI-1043 obrazac? Evidencija dugotrajne imovine i
          automatski obračun amortizacije po porezno priznatim stopama u FBiH.
          Generišite popunjeni PLDI-1043 PDF za godišnju poreznu prijavu,
          besplatno i bez registracije.
        </p>
      </div>

      {/* Year switcher, full width, above sidebar/content row */}
      <div className={styles.yearBar}>
        {allYears.map((yr) => (
          <button
            key={yr}
            className={`${styles.yearPill} ${yr === activeYear ? styles.yearPillActive : ""}`}
            onClick={() => handleYearClick(yr)}
            disabled={dataLoading}
          >
            {yr}
          </button>
        ))}
        {showNewYear ? (
          <input
            ref={newYearRef}
            className={styles.yearInput}
            value={newYearVal}
            placeholder="GGGG"
            maxLength={4}
            inputMode="numeric"
            onChange={(e) => setNewYearVal(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newYearVal.length === 4) {
                setShowNewYear(false);
                setNewYearVal("");
                doSwitchYear(newYearVal);
              }
              if (e.key === "Escape") {
                setShowNewYear(false);
                setNewYearVal("");
              }
            }}
            onBlur={() => {
              if (newYearVal.length === 4) doSwitchYear(newYearVal);
              setShowNewYear(false);
              setNewYearVal("");
            }}
          />
        ) : (
          <button
            className={`${styles.yearPill} ${styles.yearPillNew}`}
            onClick={() => setShowNewYear(true)}
          >
            + Nova godina
          </button>
        )}
        {dataLoading && <LoadState compact text="Učitavam..." />}
      </div>

    <div className={styles.page}>
      {orgPicker}

      {/* Dio 1, Podaci */}
      <section className={styles.section}>
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}>
            Podaci o poreznom obvezniku i djelatnosti
          </h2>
          {yearToDelete === activeYear ? (
            <span className={styles.yearConfirm}>
              <span className={styles.yearConfirmText}>
                Obrisati {activeYear}. godinu?
              </span>
              <button
                className={styles.yearConfirmYes}
                onClick={() => handleDeleteYear(activeYear)}
              >
                Da
              </button>
              <button
                className={styles.yearConfirmNo}
                onClick={() => setYearToDelete(null)}
              >
                Ne
              </button>
            </span>
          ) : (
            <button
              className={styles.deleteYearBtn}
              onClick={() => setYearToDelete(activeYear)}
            >
              Obriši {activeYear}. godinu
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.guideToggleBtn}
          onClick={() => setShowGuide((v) => !v)}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <circle cx="8" cy="8" r="7" />
            <line x1="8" y1="7" x2="8" y2="11" />
            <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
          </svg>
          {showGuide ? "Sakrij uputstvo" : "Kako ispravno popuniti?"}
        </button>

        {showGuide && (
          <div className={styles.guideBox}>
            <ol className={styles.guideList}>
              <li>
                <strong>Dodajte svoju djelatnost</strong>, Ako još nemate dodanu organizaciju, idite na{" "}
                <a href="/profil" className={styles.guideLink}>Profil → Moje organizacije</a>{" "}
                i dodajte je. Ako popunjavate za klijenta, idite na{" "}
                <a href="/profil" className={styles.guideLink}>Profil → Klijenti</a>{" "}
                i tamo dodajte klijenta sa njegovim podacima.
              </li>
              <li>
                <strong>Odaberite ili dodajte klijenta u sidebaru</strong>, Kliknite <em>+ Dodaj klijenta</em> u lijevoj bočnoj traci da otvorite novi prazan obrazac. Ako popunjavate za sebe, možete raditi i bez klijenta.
              </li>
              <li>
                <strong>Popunite djelatnost</strong>, Kliknite dugme <em>Popuni djelatnost</em> i odaberite organizaciju sa liste. Podaci o djelatnosti i vlasniku bit će automatski upisani u obrazac.
              </li>
              <li>
                <strong>Unesite osnovna sredstva</strong>, U tabeli ispod dodajte svako stalno sredstvo: naziv, datum nabavke, broj dokumenta, nabavnu vrijednost, početnu knjigovodstvenu vrijednost i vijek trajanja. Iznos amortizacije se računa automatski.
              </li>
              <li>
                <strong>Sačuvajte i preuzmite obrazac</strong>, Kliknite <em>Sačuvaj na profil</em> da pohranite podatke na vaš nalog gdje im možete pristupiti u svakom trenutku. Kliknite <em>Preuzmi obrazac</em> da preuzmete popunjeni PLDI-1043 PDF, obrazac se automatski sačuva na profilu i klijent se kreira ako već nije upisan. Kada prenesete podatke u narednu godinu klikom na <em>Prenesi u godinu</em>, obrazac tekuće i naredne godine se automatski sačuva.
              </li>
            </ol>
          </div>
        )}

        <div className={styles.twoCol}>
          <div className={styles.colGroup}>
            <div className={styles.colLabelRow}>
              <p className={styles.colLabel}>Porezni obveznik</p>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>1. JMB</label>
              <input
                className={styles.fieldInput}
                value={obveznik.jmb}
                onChange={setO("jmb")}
                placeholder="XXXXXXXXXXXXX"
                maxLength={13}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>2. Prezime i ime</label>
              <input
                className={styles.fieldInput}
                value={obveznik.imeIPrezime}
                onChange={setO("imeIPrezime")}
                placeholder="Prezime Ime"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>3. Adresa</label>
              <input
                className={styles.fieldInput}
                value={obveznik.adresa}
                onChange={setO("adresa")}
                placeholder="Ulica i broj"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Grad</label>
              <CitySelect
                value={obveznik.grad}
                onChange={(v) => setObveznik((p) => ({ ...p, grad: v }))}
                className={styles.fieldInput}
              />
            </div>
          </div>

          <div className={styles.colGroup}>
            <div className={styles.colLabelRow}>
              <p className={styles.colLabel}>Registrovana djelatnost</p>
              {/* OrgFillSelect uklonjen, djelatnost se sada auto-popunjava iz
                  odabrane Organization (handleSelectOrg). Ako user želi ručno
                  prepravljati, polja ispod su editabilna. */}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>4. JIB</label>
              <input
                className={styles.fieldInput}
                value={obveznik.jib}
                onChange={setO("jib")}
                placeholder="XXXXXXXXXXXX"
                maxLength={13}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>5. Naziv</label>
              <input
                className={styles.fieldInput}
                value={obveznik.naziv}
                onChange={setO("naziv")}
                onBlur={handleNazivBlur}
                placeholder='Obrt "Naziv"'
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>6. Adresa djelatnosti</label>
              <input
                className={styles.fieldInput}
                value={obveznik.adresaDjelatnosti}
                onChange={setO("adresaDjelatnosti")}
                placeholder="Ulica i broj"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Grad djelatnosti</label>
              <CitySelect
                value={obveznik.gradDjelatnosti}
                onChange={(v) => setObveznik((p) => ({ ...p, gradDjelatnosti: v }))}
                className={styles.fieldInput}
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  7. Šifra djelatnosti
                </label>
                <input
                  className={styles.fieldInput}
                  value={obveznik.vrstaSifra}
                  onChange={setO("vrstaSifra")}
                  placeholder="49.41"
                  style={{ maxWidth: 100 }}
                  maxLength={5}
                />
              </div>
              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <label className={styles.fieldLabel}>Naziv djelatnosti</label>
                <input
                  className={styles.fieldInput}
                  value={obveznik.vrstaNaziv}
                  onChange={setO("vrstaNaziv")}
                  placeholder="Drumski prijevoz tereta"
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.periodRow}>
          <div className={styles.periodFields}>
            {!obveznik.manualPeriod ? (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Porezna godina</label>
                <input
                  className={styles.fieldInput}
                  value={obveznik.godina}
                  onChange={setO("godina")}
                  placeholder="2025"
                  style={{ maxWidth: 110 }}
                />
              </div>
            ) : (
              <>
                <div className={styles.fieldGroup} style={{ width: 160 }}>
                  <label className={styles.fieldLabel}>Period od</label>
                  <DateInput
                    value={obveznik.periodOd}
                    onValueChange={(iso) => {
                      if (!iso) {
                        setObveznik((p) => ({ ...p, periodOd: iso }));
                        return;
                      }
                      const year = iso.slice(0, 4);
                      const doYear = obveznik.periodDo.slice(0, 4);
                      const newDo =
                        doYear !== year ? `${year}-12-31` : obveznik.periodDo;
                      setObveznik((p) => ({
                        ...p,
                        periodOd: iso,
                        periodDo: newDo,
                      }));
                      markDirty();
                    }}
                    className={styles.fieldInput}
                  />
                </div>
                <div className={styles.periodSep}>–</div>
                <div className={styles.fieldGroup} style={{ width: 160 }}>
                  <label className={styles.fieldLabel}>do</label>
                  <DateInput
                    value={obveznik.periodDo}
                    onValueChange={(iso) => {
                      if (!iso) {
                        setObveznik((p) => ({ ...p, periodDo: iso }));
                        return;
                      }
                      const odYear =
                        obveznik.periodOd.slice(0, 4) || iso.slice(0, 4);
                      const clampedIso = odYear
                        ? iso.replace(/^\d{4}/, odYear)
                        : iso;
                      setObveznik((p) => ({ ...p, periodDo: clampedIso }));
                      markDirty();
                    }}
                    className={styles.fieldInput}
                  />
                </div>
              </>
            )}
          </div>
          <label className={styles.manualToggle}>
            <input
              type="checkbox"
              checked={obveznik.manualPeriod}
              onChange={(e) => {
                setObveznik((p) => ({ ...p, manualPeriod: e.target.checked }));
                markDirty();
              }}
            />
            Ručno unesi period amortizacije
          </label>
        </div>
      </section>

      {/* Dio 2, Tabela */}
      <section className={styles.section}>
        <h2
          className={styles.sectionTitle}
          style={{
            marginBottom: "1.5rem",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          Podaci o dugotrajnoj imovini
        </h2>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thRb}>
                  8)
                  <br />
                  Rb.
                </th>
                <th
                  className={`${styles.thNaziv}`}
                  onClick={() => handleSort("naziv")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  <span className={styles.sortHeader}>
                    9) Naziv sredstva{sortIcon("naziv", sortKey, sortDir)}
                  </span>
                </th>
                <th
                  className={styles.thDatum}
                  onClick={() => handleSort("datumNabavke")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  <span className={styles.sortHeader}>
                    10) Datum nabavke
                    {sortIcon("datumNabavke", sortKey, sortDir)}
                  </span>
                </th>
                <th className={styles.thDok}>11) Br. dok.</th>
                {thSort(
                  "nabavnaVrijednost",
                  <>
                    12) Nabavna
                    <br />
                    vrijednost
                  </>,
                )}
                {thSort(
                  "kvPocetak",
                  <>
                    13) Knj. vrijednost
                    <br />
                    (početak godine)
                  </>,
                )}
                <th className={styles.thVijek} title="Vijek trajanja (godine)">
                  14) Vijek
                  <br />
                  (god.)
                </th>
                <th className={styles.thStopa} title="Stopa amortizacije">
                  15) Stopa
                  <br />
                  (%)
                </th>
                <th className={styles.thMj} title="Mjeseci">Mj.</th>
                {thSort(
                  "iznos",
                  <>
                    16) Iznos
                    <br />
                    amortizacije
                  </>,
                )}
                {thSort(
                  "kvKraj",
                  <>
                    17) KV na kraju
                    <br />
                    godine
                  </>,
                )}
                <th
                  className={styles.thDatumProdaje}
                  title="Datum prodaje ili otpisa"
                >
                  Datum prodaje
                </th>
                <th className={styles.thOtpis} title="Prodano / otpisano">
                  Otpis
                </th>
                <th className={styles.thDel}></th>
              </tr>
            </thead>
            <tbody>
              {sortedIndices.map((origIdx, displayIdx) => {
                const row = rows[origIdx];
                const calc = computed[origIdx];
                return (
                  <tr
                    key={row.id}
                    className={row.prodano ? styles.rowProdano : ""}
                  >
                    <td className={styles.tdRb}>
                      {String(displayIdx + 1).padStart(2, "0")}
                    </td>
                    <td>
                      <input
                        className={styles.tdInput}
                        value={row.naziv}
                        onChange={setRow(row.id, "naziv")}
                        placeholder="Naziv sredstva"
                      />
                    </td>
                    <td>
                      <DateInput
                        value={row.datumNabavke}
                        onValueChange={setDatum(row.id)}
                        className={styles.tdInput}
                      />
                    </td>
                    <td>
                      <input
                        className={`${styles.tdInput} ${styles.tdCenter}`}
                        value={row.brojDokumenta}
                        onChange={setRow(row.id, "brojDokumenta")}
                        placeholder="–"
                      />
                    </td>
                    <td>
                      <input
                        className={`${styles.tdInput} ${styles.tdRight}`}
                        value={row.nabavnaVrijednost}
                        onChange={setRow(row.id, "nabavnaVrijednost")}
                        onBlur={handleNumberBlur(row.id, "nabavnaVrijednost")}
                        placeholder="0,00"
                        inputMode="decimal"
                      />
                    </td>
                    <td>
                      <input
                        className={`${styles.tdInput} ${styles.tdRight}`}
                        value={row.kvPocetak}
                        onChange={setRow(row.id, "kvPocetak")}
                        onBlur={handleNumberBlur(row.id, "kvPocetak")}
                        placeholder="0,00"
                        inputMode="decimal"
                      />
                    </td>
                    <td>
                      <input
                        className={`${styles.tdInput} ${styles.tdCenter}`}
                        value={row.vijekTrajanja}
                        onChange={setRow(row.id, "vijekTrajanja")}
                        placeholder="7"
                        inputMode="numeric"
                        title="Vijek trajanja u godinama"
                        maxLength={3}
                      />
                    </td>
                    <td>
                      <input
                        className={`${styles.tdInput} ${styles.tdCenter}`}
                        value={row.stopaOverride}
                        onChange={setRow(row.id, "stopaOverride")}
                        placeholder={
                          VIJEK_STOPA[row.vijekTrajanja]
                            ? String(VIJEK_STOPA[row.vijekTrajanja])
                            : "–"
                        }
                        inputMode="decimal"
                        title="Stopa amortizacije (%)"
                        maxLength={6}
                      />
                    </td>
                    <td>
                      <input
                        className={`${styles.tdInput} ${styles.tdCenter}`}
                        value={row.mjeseciOverride}
                        onChange={setRow(row.id, "mjeseciOverride")}
                        placeholder="12"
                        maxLength={2}
                        inputMode="numeric"
                      />
                    </td>
                    <td className={styles.tdAuto}>{fmtKm(calc.iznos)}</td>
                    <td
                      className={`${styles.tdAuto} ${row.prodano ? styles.tdKvKrajProdano : ""}`}
                    >
                      {fmtKm(calc.kvKraj)}
                    </td>
                    <td>
                      {row.prodano ? (
                        <DateInput
                          value={row.datumProdaje}
                          onValueChange={setDatumProdaje(row.id)}
                          className={`${styles.tdInput} ${!row.datumProdaje ? styles.tdDatumProdajeHighlight : ""}`}
                        />
                      ) : (
                        <span className={styles.tdEmpty}>–</span>
                      )}
                    </td>
                    <td className={styles.tdCenter}>
                      <input
                        type="checkbox"
                        className={styles.otpisCheck}
                        checked={row.prodano}
                        onChange={() => toggleProdano(row.id)}
                        title="Označiti kao prodano/otpisano"
                      />
                    </td>
                    <td>
                      <button
                        className={styles.delBtn}
                        onClick={() => removeRow(row.id)}
                        title="Ukloni red"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan={4} className={styles.totalLabel}>
                  Ukupno za sve stranice, prijenos
                </td>
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
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
          Dodaj sredstvo
        </button>
      </section>

      {/* Actions */}
      <div className={styles.actionsRow}>
        <div className={styles.carryoverWrap}>
          <button
            className={styles.carryoverBtn}
            onClick={() => {
              const next = parseInt(obveznik.godina || currentYear) + 1;
              if (savedYears.includes(next)) {
                setShowCarryoverConfirm(true);
              } else {
                handleCarryover();
              }
            }}
            disabled={saveStatus === "saving"}
            title={`Prenesi sva aktivna sredstva u ${parseInt(obveznik.godina || currentYear) + 1}. godinu`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            Prenesi u {parseInt(obveznik.godina || currentYear) + 1}.
          </button>

          {showCarryoverConfirm && (
            <div className={styles.carryoverConfirm}>
              <p className={styles.carryoverConfirmText}>
                Godina {parseInt(obveznik.godina || currentYear) + 1}. već ima sačuvane podatke.
                Prenos će ih zamijeniti novim stanjem.
              </p>
              <div className={styles.carryoverConfirmActions}>
                <button
                  className={styles.carryoverConfirmYes}
                  onClick={() => { setShowCarryoverConfirm(false); handleCarryover(); }}
                >
                  Prenesi i zamijeni
                </button>
                <button
                  className={styles.carryoverConfirmNo}
                  onClick={() => setShowCarryoverConfirm(false)}
                >
                  Odustani
                </button>
              </div>
            </div>
          )}
        </div>

        {!isLoggedIn && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              padding: "0.85rem 1rem",
              margin: "0 0 1rem",
              background: "var(--sage-pale, #eef3ee)",
              border: "1px solid rgba(58, 92, 66, 0.25)",
              borderRadius: "var(--radius)",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--ink)",
            }}
          >
            <span style={{ flexShrink: 0, fontSize: 18, lineHeight: 1 }}>🎁</span>
            <div style={{ flex: 1 }}>
              <strong>Preuzimanje PLDI-1043 PDF-a je besplatno za
              registrovane korisnike.</strong>{" "}
              Registracija je besplatna i traje minut. Uz nju možete aktivirati
              30 dana besplatno: PK Office i sve Business funkcije (plate,
              JS3100, ugovori, fakture).{" "}
              <a
                href="/registracija"
                style={{
                  color: "var(--sage)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Registruj se besplatno →
              </a>
            </div>
          </div>
        )}

        {!isLoggedIn ? (
          <Link
            href="/registracija"
            className={styles.exportBtn}
            title="Registrujte se besplatno da preuzmete PDF"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Registruj se za preuzimanje
          </Link>
        ) : (
          <button
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: "spin 1s linear infinite" }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            {exportLoading ? "Generišem PDF…" : "Preuzmi PLDI-1043 obrazac"}
          </button>
        )}

        <SaveToProfileButton
          type="PLDI"
          year={pldiYear}
          title={`PLDI-1043 · ${obveznik.naziv || obveznik.imeIPrezime} · ${pldiYear ?? "?"}`}
          buildData={buildPldiData}
          disabled={pldiYear === null}
          defaultOrganizationId={selectedOrgId}
          onSuccess={handleSave}
        />
      </div>

      <p className={styles.napomena}>
        Obrazac PLDI-1043 · Popisna lista dugotrajne imovine · Federacija BiH
      </p>

      {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
      <section className={styles.section} style={{ marginTop: "2rem" }}>
        <h2 className={styles.sectionTitle}>
          Šta su <em>stalna sredstva</em> i zašto se amortizuju?
        </h2>
        <p>
          <strong>Stalna sredstva</strong> (dugotrajna imovina) su materijalna
          i nematerijalna dobra koja se koriste u poslovanju duže od jedne
          godine i čija nabavna vrijednost prelazi propisani prag. U FBiH se
          evidentiraju na obrascu <strong>PLDI-1043</strong>, Popisnoj listi
          dugotrajne imovine, koja se predaje kao prilog uz GPD-1051 i SPR-1053.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          <strong>Amortizacija</strong> je postupak postupnog prenošenja
          nabavne vrijednosti sredstva na rashode poslovanja kroz njegov vijek
          trajanja. Umjesto da cjelokupna nabavna vrijednost optereti rashode
          u godini nabavke, ona se ravnomjerno raspoređuje na godine korištenja,
          što daje stvarniju sliku poslovnog rezultata i smanjuje oporezivu
          osnovicu kroz više godina.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Stope <em>amortizacije</em> u FBiH
        </h2>
        <p>
          Porezno priznate stope amortizacije propisane su <em>Pravilnikom o
          primjeni Zakona o porezu na dohodak FBiH</em>. Stopa ovisi o vrsti
          sredstva i njegovom korisnom vijeku trajanja:
        </p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Računari i softver</strong>, vijek 3 godine, stopa <strong>33,33%</strong>
          </li>
          <li>
            <strong>Putnička vozila</strong>, vijek 5 godina, stopa <strong>20%</strong>
          </li>
          <li>
            <strong>Oprema i mašine</strong>, vijek 7 godina, stopa <strong>14,29%</strong>
          </li>
          <li>
            <strong>Namještaj</strong>, vijek 10 godina, stopa <strong>10%</strong>
          </li>
          <li>
            <strong>Poslovni objekti</strong>, vijek 25–40 godina, stopa <strong>2,5%–4%</strong>
          </li>
          <li>
            <strong>Nematerijalna imovina</strong> (patenti, licence), prema ugovornom roku
          </li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          U FBiH se primjenjuje <strong>linearna metoda amortizacije</strong>, 
          ravnomjerno tokom cijelog vijeka trajanja sredstva. Stopa za isto
          sredstvo ne mijenja se iz godine u godinu.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Kako koristiti <em>generator stalnih sredstava</em>
        </h2>
        <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Dodajte stalna sredstva</strong>, unesite naziv, datum
            nabavke, nabavnu vrijednost, vijek trajanja i stopu amortizacije.
            Za prijavljene korisnike sredstva se čuvaju u profilu.
          </li>
          <li>
            <strong>Automatski obračun</strong>, sistem računa godišnju
            amortizaciju, akumuliranu amortizaciju i preostalu knjigovodstvenu
            vrijednost za odabranu godinu.
          </li>
          <li>
            <strong>Prenos u sljedeću godinu</strong>, knjigovodstvena
            vrijednost se automatski prenosi u narednu godinu kao početno stanje
            (kolona 13 → kolona 4 sljedeće godine).
          </li>
          <li>
            <strong>Označavanje prodaje/otpisa</strong>, kad prodate ili
            otpišete sredstvo, označite to u obrascu. Sredstvo se neće prenijeti
            u narednu godinu.
          </li>
          <li>
            <strong>Preuzmite PLDI-1043 PDF</strong> kao prilog uz GPD-1051
            i SPR-1053 godišnju prijavu.
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Prodaja, otpis i <em>tehnička zastarjelost</em>
        </h2>
        <p>
          Kada se sredstvo proda ili otpiše prije isteka vijeka trajanja,
          amortizacija se obračunava samo za period korištenja u toj godini, 
          do datuma prodaje ili otpisa. Preostala knjigovodstvena vrijednost
          se <strong>ne prenosi u sljedeću godinu</strong>, a u koloni 17
          PLDI obrasca upisuje se napomena o prodaji.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Tehničko-tehnološka zastarjelost ili oštećenje koje znatno smanjuje
          korisni vijek može biti osnov za ubrzanu amortizaciju ili otpis, ali
          uz prateću dokumentaciju (mišljenje ovlaštenog procjenitelja,
          inventurni zapisnik).
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Povezani <em>alati</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          <li>
            <a href="/spr" style={{ color: "var(--sage)", fontWeight: 600 }}>
              SPR-1053, specifikacija dohotka samostalne djelatnosti
            </a>,{" "}
            amortizacija ulazi kao rashod u SPR.
          </li>
          <li>
            <a href="/gpd" style={{ color: "var(--sage)", fontWeight: 600 }}>
              GPD-1051, godišnja prijava poreza
            </a>,{" "}
            PLDI je prilog uz GPD-1051.
          </li>
          <li>
            <a href="/javni-prihodi" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Uplatni računi javnih prihoda
            </a>,{" "}
            računi za uplatu poreza i doprinosa nakon obračuna SPR-a.
          </li>
        </ul>
      </section>

      <FaqSection
        items={[
          {
            q: "Ko je obavezan podnijeti PLDI-1043 obrazac?",
            a: "PLDI-1043 podnose fizičke osobe koje obavljaju samostalnu djelatnost i posjeduju dugotrajnu imovinu (stalna sredstva) koja se koristi u poslovne svrhe. Obrazac se predaje kao prilog godišnjoj prijavi poreza (GPD-1051) i specifikaciji SPR-1053.",
          },
          {
            q: "Šta se smatra stalnim sredstvima (dugotrajnom imovinom)?",
            a: "Stalnim sredstvima smatraju se materijalna i nematerijalna dobra čiji je vijek trajanja duži od jedne godine i čija nabavna vrijednost prelazi propisani prag. To uključuje: vozila, opremu, računare, namještaj, poslovne prostore, patente, licence i slična sredstva koja se koriste u obavljanju djelatnosti.",
          },
          {
            q: "Koje stope amortizacije se primjenjuju u FBiH?",
            a: "Stope amortizacije ovise o vijeku trajanja sredstva. Primjeri: računari i softver (3 god. 33,33%), vozila (5 god. 20%), oprema (7 god. 14,29%), poslovni objekti (25–40 god. 2,5–4%). Porezno priznate stope propisane su Pravilnikom o primjeni Zakona o porezu na dohodak FBiH.",
          },
          {
            q: "Šta se dešava kad je sredstvo prodano ili otpisano?",
            a: "Kod prodaje sredstva, amortizacija se obračunava samo za period dok je sredstvo korišteno (do datuma prodaje). Preostala knjigovodstvena vrijednost ne prenosi se u narednu godinu. Na PLDI obrascu se u koloni 17 upisuje napomena o prodaji umjesto preostale vrijednosti.",
          },
          {
            q: "Kako funkcioniše prenos podataka iz prethodne godine?",
            a: "Naš generator automatski prenosi knjigovodstvenu vrijednost (kolona 13) iz prethodne godine u novu godinu, čime se osigurava kontinuitet evidencije. Sredstva koja su prodana ili otpisana ne prenose se dalje.",
          },
          {
            q: "Mogu li koristiti različite stope amortizacije za različita sredstva?",
            a: "Da, svako sredstvo može imati svoju stopu amortizacije zavisno od njegove prirode i vijeka trajanja. Stopa mora biti u skladu s propisanim porezno priznatim stopama. Nije dozvoljeno nasumično mijenjanje stopa iz godine u godinu za isto sredstvo.",
          },
        ]}
      />
    </div>
  </div>
  );
}
