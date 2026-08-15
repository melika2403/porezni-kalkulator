"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { useLastOrg } from "src/hooks/useLastOrg";
import OrgSelect from "src/components/OrgSelect/OrgSelect";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import {
  getClientOrganizations,
  getOrganizations,
  getWorkers,
  SALARY_TYPE_LABELS,
  type Organization,
  type SalaryType,
  type Worker,
} from "src/api/profile";
import {
  bankExport,
  calculatePayroll,
  deletePayroll,
  emailMonthlyPayslipsBulk,
  emailWorkerPayslip,
  generateMonthlyPayslips,
  generateMonthlyUplatnice,
  generatePostingOrder,
  generateWorkerPayslip,
  getMonthlySummary,
  listPayrolls,
  markMipDownloaded,
  markMonthPaid,
  patchPayroll,
  savePayrollInputs,
  setCombineKantonal,
  setPayrollPaymentDate,
  type BankExportPreskocen,
  type BankExportProfil,
  type BankExportRezultat,
  type MonthlyUplatnicaSummary,
  type Payroll,
  type PayrollDocumentType,
} from "src/api/payroll";
import { getSihterica } from "src/api/sihterica";
import { trackEvent } from "src/api/activity";
import { parseMoneyInput, formatMoneyBlur } from "src/lib/format";
import { defaultObracunPeriod } from "src/lib/obracunskiPeriod";
import {
  fromGross,
  fromNet,
  deductionFromCoefficient,
  computeMinContribBase,
  computeKorist,
  koristNetValueFromConfig,
} from "src/utils/payrollFbih";
import { parseDecimal, sanitizeDecimalInput } from "src/utils/parseDecimal";
import DateInput from "src/components/DateInput/DateInput";
import StampaNalogaModal from "src/components/StampaNaloga/StampaNalogaModal";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import { useNotice } from "src/components/Notice/Notice";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import { useRole } from "src/hooks/useRole";
import {
  getOsnovica,
  KATEGORIJA_PAUSALNI_LABELS,
  KATEGORIJA_STVARNI_LABELS,
  REZIM_LABELS,
} from "src/utils/obrtniciFbih";
import { fillObrazac2001Template } from "./fillObrazac2001";
import { fillObrazac2001ATemplate } from "./fillObrazac2001A";
import {
  build2001Data,
  build2001AData,
  build2002Data,
} from "./obrasciSpecifikacije";
import {
  fillMip1023Template,
  type Mip1023Data,
  type Mip1023Row,
} from "./fillMip1023";
import {
  fillGip1022Template,
  type Gip1022Data,
  type Gip1022Row,
} from "./fillGip1022";
import {
  generateGip1022Xml,
  type Gip1022XmlData,
  type Gip1022XmlObrazac,
  type Gip1022XmlRow,
} from "./gip1022Xml";
import {
  generateMip1023Xml,
  type Mip1023XmlData,
  type Mip1023XmlWorker,
} from "./mip1023Xml";
import { fillListaNaloga, type ListaNalogaData } from "./fillListaNaloga";
import {
  fillSpecifikacije,
  type SpecifikacijeData,
} from "./fillSpecifikacije";
import { kantonForOpcina, bankFromAccount } from "src/data/uplatni-racuni";
import { fillObrazac2002Template } from "./fillObrazac2002";
import { UvozPlataPkModal } from "./UvozPlataPkModal";
import PostingAccountsModal from "./PostingAccountsModal";
import styles from "./obracunPlata.module.css";
import js3Styles from "./js3100.module.css";

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

const STATUS_LABEL: Record<Payroll["status"], string> = {
  DRAFT: "Draft",
  OBRACUNATO: "Obračunato",
  ISPLACENO: "Isplaćeno",
};

// Izvoz naloga za e-bankarstvo: banke koje korisnik prepoznaje po imenu,
// interno mapirane na format datoteke (profil). BBI, ASA i Sparkasse dijele
// ELBA platformu; Halcom (Hal E-Bank / Personal) koriste klijenti više banaka.
const IZVOZ_BANKE: {
  value: string;
  label: string;
  profil: BankExportProfil;
}[] = [
  { value: "halcom", label: "Halcom (Hal E-Bank, više banaka)", profil: "halcom" },
  { value: "raiffeisen", label: "Raiffeisen banka (RBBHnet)", profil: "raiffeisen" },
  { value: "unicredit", label: "UniCredit banka (e-ba)", profil: "unicredit" },
  { value: "bbi", label: "BBI banka (eBBI)", profil: "elba" },
  { value: "asa", label: "ASA banka (ELBA)", profil: "elba" },
  { value: "sparkasse", label: "Sparkasse banka (ELBA)", profil: "elba" },
  { value: "intesa", label: "Intesa Sanpaolo banka (ELBA)", profil: "elba" },
  { value: "procredit", label: "ProCredit Bank (ELBA)", profil: "elba" },
  { value: "pbs", label: "Privredna banka Sarajevo (ELBA)", profil: "elba" },
];

const IZVOZ_GRESKE: Record<string, string> = {
  NEMA_OBRACUNA: "Za ovaj mjesec nema obračuna plata.",
  NEMA_NALOGA:
    "Nijedan nalog nije mogao ući u datoteku (pogledajte preskočene stavke).",
  FORBIDDEN: "Nemate pristup ovoj organizaciji.",
  FORBIDDEN_PLAN: "Potrebna je aktivna Pro ili Office pretplata.",
  INVALID_DATUM_VALUTE: "Datum valute nije ispravan kalendarski datum.",
  SERVER_ERROR: "Greška na serveru, pokušajte ponovo.",
  NETWORK_ERROR: "Greška u konekciji, pokušajte ponovo.",
};

const UPLATNICA_LABEL: Record<PayrollDocumentType, string> = {
  PLATNA_LISTA: "Platna lista",
  UPLATNICA_NETO: "Neto plata (radniku)",
  UPLATNICA_PIO: "PIO/MIO doprinos",
  UPLATNICA_ZDR: "Zdravstveno, kantonalni",
  UPLATNICA_ZDR_FED: "Zdravstveno, federalni",
  UPLATNICA_NEZAP: "Nezaposlenost, federalni",
  UPLATNICA_NEZAP_KANT: "Nezaposlenost, kantonalni",
  UPLATNICA_POREZ: "Porez na dohodak",
  UPLATNICA_VODNA: "Opća vodna naknada",
  UPLATNICA_NESRECE: "Zaštita od nesreća",
  UPLATNICA_INVALIDI: "Fond za rehabilitaciju OSI",
};

const STATUS_CLASS: Record<Payroll["status"], string> = {
  DRAFT: styles.badgeDraft,
  OBRACUNATO: styles.badgeOk,
  ISPLACENO: styles.badgePaid,
};

const fmtKM = (n: number | null | undefined): string => {
  if (n == null) return "–";
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Format za input polja KM iznosa: "1.234,56" ili "" za 0/null. Ne stavlja "—".
const fmtMoneyInput = (n: number | null | undefined): string => {
  const num = Number(n);
  if (!Number.isFinite(num) || num === 0) return "";
  return num.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Live formatter dok user kuca — dodaje tačke kao thousands separator nakon
// svakog unesenog karaktera. Zarez je decimalni separator (najviše 2 cifre).
// Primjeri: "1234" → "1.234"; "1234,5" → "1.234,5"; "1234567,89" → "1.234.567,89"
// Koristi se u onChange handlerima svih KM input polja (modal + Worker form).
const formatMoneyLive = (input: string): string => {
  if (!input || !input.trim()) return "";
  // Ukloni postojeće thousands tačke (rekonstruišemo ih iz čistih cifara).
  const cleaned = input.replace(/\./g, "");
  const parts = cleaned.split(",");
  // Cjelobrojni dio — samo cifre.
  let intPart = parts[0].replace(/\D/g, "");
  // Ako user upiše ",5" bez integera, normaliziraj na "0,5".
  if (!intPart && parts.length > 1) intPart = "0";
  // Insert tačke svake 3 cifre s desne strane.
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (parts.length > 1) {
    // Decimalni dio — max 2 cifre. Ako user upiše više, sječemo.
    const decPart = parts[1].replace(/\D/g, "").slice(0, 2);
    return `${intPart},${decPart}`;
  }
  return intPart;
};

// Cijele godine između dva ISO datuma. Vraća 0 ako bilo koji nije validan.
const yearsBetween = (startStr?: string | null, endStr?: string | null): number => {
  if (!startStr) return 0;
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  let y = end.getFullYear() - start.getFullYear();
  const md = end.getMonth() - start.getMonth();
  if (md < 0 || (md === 0 && end.getDate() < start.getDate())) y -= 1;
  return Math.max(0, y);
};

// Ukupan radni staž za minuli rad — koristi novu logiku:
//  1) priorWorkYears (ručni unos) + staž od prijave u našu firmu — tačno za prekide
//  2) firstEmploymentDate (datum prvog zaposljenja ikada) — pretpostavlja kontinuitet
//  3) fallback: prijavaDate (ili startDate radi backward compat)
export const totalYearsOfService = (
  worker: Pick<Worker, "priorWorkYears" | "firstEmploymentDate" | "prijavaDate" | "startDate">,
  asOfDate?: string | null,
): number => {
  const prior = worker.priorWorkYears;
  if (prior != null && Number.isFinite(Number(prior)) && Number(prior) >= 0) {
    const currentYears = yearsBetween(worker.prijavaDate, asOfDate);
    return Math.max(0, Math.floor(currentYears + Number(prior)));
  }
  if (worker.firstEmploymentDate) {
    return yearsBetween(worker.firstEmploymentDate, asOfDate);
  }
  return yearsBetween(worker.prijavaDate || worker.startDate, asOfDate);
};

// MINULI_RAD_CAP — maksimalno uvećanje (čl. 40 Kolektivnog ugovora FBiH).
// Bez obzira na stopu (0,4% / 0,6% / drugo) i godine staža, ukupan
// multiplikator ne može preći 20% osnovne plaće.
export const MINULI_RAD_CAP = 0.20;

// Prosječan broj radnih dana u mjesecu — koristi se kao divizor satnice
// (174h FT = 8h × 21.75). Za PT radnika: satnica = bruto / (contractedHours
// × 21.75), tako da PT 4h radnik ima istu satnicu kao FT 8h relativno
// svom ugovoru.
export const WORK_DAYS_IN_MONTH_AVG = 21.75;

// Računa multiplikator minulog rada za radnika (sa cap-om 20%).
// Vraća broj između 0 i 0.20 — koliko % od osnovice ide na minuli rad.
export const computeMinuliMultiplier = (
  worker: Pick<
    Worker,
    "minuliRadRate" | "priorWorkYears" | "firstEmploymentDate" | "prijavaDate" | "startDate"
  >,
  asOfDate?: string | null,
): number => {
  const rate = Number(worker.minuliRadRate ?? 0.4) / 100;
  const years = totalYearsOfService(worker, asOfDate);
  return Math.min(rate * years, MINULI_RAD_CAP);
};

// Računa bruto OSNOVICU iz worker profila prema njegovom salaryType:
//   • BRUTO        — salaryBruto je osnovica iz ugovora, vraćamo direktno
//   • NETO_UGOVOR  — salaryNeto je bazni neto, osnovica = fromNet(neto)
//   • NETO_ISPLATA — salaryNeto je ciljni take-home (sa minulim radom),
//                    osnovica = fromNet(neto) / (1 + minuli rad multiplikator)
//
// Backend onda na ovu osnovicu dodaje minuli rad i uvećanja. Za tipove BRUTO
// i NETO_UGOVOR stvarni mjesečni neto raste sa stažom (zakonski model). Za
// NETO_ISPLATA radnik uvijek prima fiksan iznos (osnovica se prilagođava).
//
// Helper se koristi na 3 mjesta (modal gross init, dirty-check, "Obračunaj
// sve") da svuda dobijemo istu osnovicu.
export const computeWorkerGrossBase = (
  worker: Pick<
    Worker,
    | "salaryType"
    | "salaryBruto"
    | "salaryNeto"
    | "taxCoefficient"
    | "minuliRadRate"
    | "priorWorkYears"
    | "firstEmploymentDate"
    | "prijavaDate"
    | "startDate"
  >,
  asOfDate?: string | null,
): number => {
  const type: SalaryType = worker.salaryType ?? "NETO_ISPLATA";
  if (type === "BRUTO") {
    if (worker.salaryBruto != null && Number(worker.salaryBruto) > 0) {
      return Number(worker.salaryBruto);
    }
    return 0;
  }
  if (worker.salaryNeto == null || Number(worker.salaryNeto) <= 0) {
    return 0;
  }
  const ded = deductionFromCoefficient(Number(worker.taxCoefficient ?? 1));
  const fullGross = fromNet(Number(worker.salaryNeto), ded).gross;
  if (type === "NETO_UGOVOR") {
    // Bazni neto iz ugovora — osnovica = fullGross direktno, minuli rad ide gore.
    return fullGross;
  }
  // NETO_ISPLATA: ciljni take-home — backout minuli rad da konačni neto izađe
  // tačno onaj iz profila. Osnovica = fullGross / (1 + M).
  const minuliM = 1 + computeMinuliMultiplier(worker, asOfDate);
  return minuliM > 0 ? fullGross / minuliM : fullGross;
};

// Pro-rate factor (0..1) za radnika koji je prijavljen ili odjavljen
// tokom mjeseca obračuna. Računa se po RADNIM danima (Pon–Pet), isti
// pristup kao za vlasnike obrta. Vraća 1 ako je radnik aktivan cijeli mjesec.
export const computeProRateFactor = (
  worker: Pick<Worker, "prijavaDate" | "odjavaDate">,
  year: number,
  month: number,
): number => {
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  const startISO = `${yyyy}-${mm}-01`;
  const endISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const prijava = worker.prijavaDate?.slice(0, 10) ?? null;
  const odjava = worker.odjavaDate?.slice(0, 10) ?? null;
  if ((!prijava || prijava <= startISO) && (!odjava || odjava >= endISO)) {
    return 1;
  }
  const effStart = prijava && prijava > startISO ? prijava : startISO;
  const effEnd = odjava && odjava < endISO ? odjava : endISO;
  const countWorkDays = (fromIso: string, toIso: string) => {
    const fromD = new Date(fromIso);
    const toD = new Date(toIso);
    let c = 0;
    for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6) c++;
    }
    return c;
  };
  const wdInMonth = countWorkDays(startISO, endISO);
  const wdInPeriod = countWorkDays(effStart, effEnd);
  if (wdInMonth <= 0) return 1;
  return Math.max(0, Math.min(wdInPeriod / wdInMonth, 1));
};

const minutesToHoursLabel = (mins: number | null): string => {
  if (mins == null) return "–";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
};

// ── Sati iz šihterice ────────────────────────────────────────────────────────
// Ista semantika kao šihterica (calcDailyMins u Sihterica.tsx/fillSihterica.ts):
//   • ručno upisana vremena uvijek pobjeđuju: (kraj − početak) − zastoj
//   • plaćena odsustva (šifre 9.1–9.5) bez vremena = 8h
//   • 9.1 na sedmični slobodan dan (meta.weeklyDaysOff) = 0h (sedmični odmor)
//   • korisnikovi checkbox-i (meta.countAbsenceCodes) mogu isključiti 9.1/9.2/9.3
// Šihterica snima meta uz svaki save, pa se ovdje čita 1:1; stari zapisi bez
// meta padaju na default (vikend = Sub/Ned, sve šifre se računaju).
const PAID_ABSENCE_CODES = ["9.1", "9.2", "9.3", "9.4", "9.5"];
const PAID_ABSENCE_MINS = 8 * 60;

type SihtericaDayEntry = {
  startTime?: string;
  endTime?: string;
  zastoj?: string;
  absence?: string;
};

// Minute iz ručno upisanih vremena; null ako vremena nisu upisana.
function timedMinutes(e: SihtericaDayEntry): number | null {
  if (!e.startTime || !e.endTime) return null;
  const [sH, sM] = e.startTime.split(":").map((x) => parseInt(x, 10));
  const [eH, eM] = e.endTime.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(sH) || Number.isNaN(eH)) return null;
  const start = sH * 60 + (sM || 0);
  const end = eH * 60 + (eM || 0);
  const zastoj = e.zastoj
    ? Math.round((parseFloat(e.zastoj.replace(",", ".")) || 0) * 60)
    : 0;
  return Math.max(0, end - start - zastoj);
}

function sihtericaParts(payload: unknown): {
  days: unknown[];
  weeklyOff: Set<number>;
  countCodes: Set<string>;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const { days, meta } = payload as {
    days?: unknown;
    meta?: { weeklyDaysOff?: unknown; countAbsenceCodes?: unknown };
  };
  if (!Array.isArray(days)) return null;
  const weeklyOff = new Set<number>(
    Array.isArray(meta?.weeklyDaysOff)
      ? (meta.weeklyDaysOff as unknown[])
          .map(Number)
          .filter((n) => !Number.isNaN(n))
      : [0, 6],
  );
  const countCodes = new Set<string>(
    Array.isArray(meta?.countAbsenceCodes)
      ? (meta.countAbsenceCodes as unknown[]).map(String)
      : PAID_ABSENCE_CODES,
  );
  return { days, weeklyOff, countCodes };
}

// Suma minuta iz šihterice — ISTI ukupni zbir koji šihterica prikazuje u redu
// "Ukupno radnih sati u mjesecu". Payload je cijeli GET /api/sihterica odgovor
// ({days, meta}); year/month trebaju za dan-u-sedmici kod šifre 9.1.
export function sumSihtericaMinutes(
  payload: unknown,
  year: number,
  month: number,
): number {
  const parts = sihtericaParts(payload);
  if (!parts) return 0;
  let total = 0;
  for (let i = 0; i < parts.days.length; i++) {
    const d = parts.days[i];
    if (!d || typeof d !== "object") continue;
    const e = d as SihtericaDayEntry;
    const timed = timedMinutes(e);
    if (timed !== null) {
      total += timed;
      continue;
    }
    const code = (e.absence || "").trim();
    if (!code || !PAID_ABSENCE_CODES.includes(code)) continue;
    if (
      code === "9.1" &&
      parts.weeklyOff.has(new Date(year, month - 1, i + 1).getDay())
    )
      continue;
    if (parts.countCodes.has(code)) total += PAID_ABSENCE_MINS;
  }
  return total;
}

// Broj dana bolovanja iz šihterice = dani sa šifrom 9.3 bez upisanih vremena.
// Auto-popuna šihterice vikende unutar bolovanja označava sa 9.1, pa je ovo
// broj RADNIH dana na bolovanju — ide u polje "Dani bolovanja" obračuna
// (a preko njega u MIP polje sati na bolovanju).
export function countSihtericaSickDays(payload: unknown): number {
  const parts = sihtericaParts(payload);
  if (!parts) return 0;
  let n = 0;
  for (const d of parts.days) {
    if (!d || typeof d !== "object") continue;
    const e = d as SihtericaDayEntry;
    if (timedMinutes(e) !== null) continue;
    if ((e.absence || "").trim() === "9.3") n++;
  }
  return n;
}

// Broj radnih dana iz sihterice = dani sa stvarnim prisustvom (neto > 0 min).
// Ovo je osnova za topli obrok: pripada za dane rada, ne za bolovanje,
// godišnji ili praznik (koji u sihterici nemaju upisano radno vrijeme).
export function countSihtericaWorkDays(days: unknown): number {
  if (!Array.isArray(days)) return 0;
  let n = 0;
  for (const d of days) {
    if (!d || typeof d !== "object") continue;
    const mins = timedMinutes(d as SihtericaDayEntry);
    if (mins !== null && mins > 0) n++;
  }
  return n;
}

// Standardni mjesečni radni fond = broj radnih dana (Pon–Pet) × 8h.
// Ako se sihterica ne vodi, koristi se ova vrijednost kao default.
function workDaysInMonth(year: number, month: number): number {
  const last = new Date(year, month, 0).getDate();
  let n = 0;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) n++; // Ned (0) i Sub (6) nisu radni
  }
  return n;
}

// Standardni mjesečni fond sati. Za nepuno radno vrijeme (contractedHours < 8)
// se skalira srazmjerno: radni dani × contractedHours (npr. 1h/dan → radni dani
// × 1h), da auto-popuna i platni listić prikažu tačan broj sati za PT radnika.
export function standardMinutesForMonth(
  year: number,
  month: number,
  contractedHours: number = 8,
): number {
  const h = Math.max(Math.min(Number(contractedHours) || 8, 8), 1);
  return workDaysInMonth(year, month) * h * 60;
}

// Broj radnih dana u mjesecu (Pon-Pet) - fallback za topli obrok kad nema
// sihterice.
export function standardWorkDaysForMonth(year: number, month: number): number {
  return workDaysInMonth(year, month);
}

// Neoporezivi dnevni maksimum toplog obroka u FBiH: 1% prosječne neto plate
// isplaćene u FBiH (zadnji podatak Zavoda za statistiku). Za 2026. prosjek
// ~1.700 KM → ~17 KM/dan. Iznad ovoga višak se oporezuje kao plata.
export const MEAL_ALLOWANCE_TAXFREE_PER_DAY = 17;


export default function ObracunPlata() {
  return (
    <main className={js3Styles.page}>
      <div className={js3Styles.header}>
        <div className={js3Styles.label}>Obračun plata</div>
        <h1 className={js3Styles.h1}>
          Obračun <em>plata</em> i doprinosa
        </h1>
        <p className={js3Styles.subtitle}>
          Mjesečni obračun bruto/neto plata, doprinosa i poreza za radnike (FBiH).
          Iznosi se mogu individualno podesiti po radniku.
        </p>
      </div>
      <ObracunPlataApp />
    </main>
  );
}

function ObracunPlataApp() {
  const queryClient = useQueryClient();
  // Do 15. u mjesecu default je PRETHODNI mjesec (tada se još obračunavaju
  // plate prethodnog mjeseca), od 16. tekući. Vidi lib/obracunskiPeriod.
  const init = defaultObracunPeriod();
  const searchParams = useSearchParams();
  const { lastOrgId, loaded: lastOrgLoaded, setLastOrgId } = useLastOrg();
  // URL eksplicitno specificiran mjesec ima prednost (deep-link iz
  // /organizacije pregleda gdje knjigovođa već bira mjesec): klik na "Plate"
  // u /organizacije otvara mjesec koji je tamo bio aktivan.
  const urlYearInit = (() => {
    const v = Number(searchParams.get("year"));
    return Number.isFinite(v) && v >= 2000 && v <= 2100 ? v : null;
  })();
  const urlMonthInit = (() => {
    const v = Number(searchParams.get("month"));
    return Number.isFinite(v) && v >= 1 && v <= 12 ? v : null;
  })();
  const [year, setYear] = useState(urlYearInit ?? init.year);
  const [month, setMonth] = useState(urlMonthInit ?? init.month);
  const urlOrgInit = (() => {
    const v = searchParams.get("org");
    return v ? Number(v) || null : null;
  })();
  // orgId hidracija u 2 faze (vidi AktivniRadnici za detalje):
  //   1) URL ?org=X → odmah.
  //   2) Inače pričekamo `lastOrgLoaded` → usvojimo lastOrgId ili auto-select.
  const [orgId, setOrgIdInternal] = useState<number | null>(urlOrgInit);
  const [hydrated, setHydrated] = useState<boolean>(urlOrgInit != null);
  const [openWorkerId, setOpenWorkerId] = useState<number | null>(null);

  // Perzistira odabranu organizaciju u localStorage — koristi se i u JS3100,
  // Aktivnim radnicima i Ugovorima.
  const setOrgId = useCallback(
    (id: number | null) => {
      setOrgIdInternal(id);
      if (id != null) setLastOrgId(id);
    },
    [setLastOrgId],
  );

  // PRO feature: dostupno ako vlastiti plan ili bilo koja moja org ima PRO+
  // vlasnika (members of BUSINESS owner's org dobijaju pun pristup).
  const { hasAccessToTier } = useMaxAccessibleTier();
  const { role } = useRole();
  const isLoggedIn = !!role;
  const canSeeClients = hasAccessToTier("PRO");
  const canGenerate = hasAccessToTier("PRO");
  const { confirm: confirmDialog, notify } = useNotice();

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

  // Spojene organizacije: vlastite + klijentske (knjigovođa koji upravlja
  // tuđim obrtima). Dedup po id-u za slučaj preklapanja.
  const allOrgs = useMemo<Organization[]>(() => {
    const map = new Map<number, Organization>();
    for (const o of orgsQuery.data ?? []) map.set(o.id, o);
    for (const o of clientOrgsQuery.data ?? []) if (!map.has(o.id)) map.set(o.id, o);
    return Array.from(map.values());
  }, [orgsQuery.data, clientOrgsQuery.data]);

  // Faza 2 hidracije: usvoji lastOrgId čim localStorage hidrira (samo ako
  // URL nije postavio orgId).
  useEffect(() => {
    if (hydrated) return;
    if (!lastOrgLoaded) return;
    if (lastOrgId != null) setOrgIdInternal(lastOrgId);
    setHydrated(true);
  }, [hydrated, lastOrgLoaded, lastOrgId]);

  // Auto-select prve dostupne org — tek nakon hidracije, da ne pregazimo
  // upamćenu (npr. klijentsku) org dok je localStorage još null.
  useEffect(() => {
    if (!hydrated) return;
    if (orgId != null) return;
    if (allOrgs.length > 0) setOrgId(allOrgs[0].id);
  }, [hydrated, orgId, allOrgs, setOrgId]);

  const workersQuery = useQuery({
    queryKey: ["workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId!)),
    enabled: isLoggedIn && !!orgId,
  });

  const payrollsQuery = useQuery({
    queryKey: ["payrolls", orgId, year, month],
    queryFn: () => unwrap(listPayrolls(orgId!, year, month)),
    enabled: isLoggedIn && !!orgId,
  });

  // Aktivnost za odabrani obračunski mjesec:
  //   • Odjavljen PRIJE ovog mjeseca → ne pripada obračunu (sakri).
  //   • Prijavljen POSLIJE ovog mjeseca → još nije aktivan (sakri).
  //   • Mid-month prijava ili odjava → ostaje u obračunu, banner upozorenja
  //     se prikazuje, bruto se ručno proporcionalno upiše.
  const monthBounds = useMemo(() => {
    const yyyy = String(year);
    const mm = String(month).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startISO: `${yyyy}-${mm}-01`,
      endISO: `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`,
    };
  }, [year, month]);

  const isActiveForMonth = useCallback(
    (w: Worker): boolean => {
      if (w.odjavaDate && w.odjavaDate.slice(0, 10) < monthBounds.startISO) {
        return false;
      }
      if (w.prijavaDate && w.prijavaDate.slice(0, 10) > monthBounds.endISO) {
        return false;
      }
      return true;
    },
    [monthBounds],
  );

  const radniciRaw = useMemo(
    () =>
      (workersQuery.data ?? []).filter(
        (w) => w.role === "RADNIK" && isActiveForMonth(w),
      ),
    [workersQuery.data, isActiveForMonth],
  );
  const vlasniciRaw = useMemo(
    () =>
      (workersQuery.data ?? []).filter(
        (w) => w.role === "VLASNIK" && isActiveForMonth(w),
      ),
    [workersQuery.data, isActiveForMonth],
  );

  const currentOrg = useMemo<Organization | null>(() => {
    const own = (orgsQuery.data ?? []).find((o) => o.id === orgId);
    if (own) return own;
    return (clientOrgsQuery.data ?? []).find((o) => o.id === orgId) ?? null;
  }, [orgsQuery.data, clientOrgsQuery.data, orgId]);

  // U obrtu (BUSINESS) vlasnik ide poseban tretman (Obrazac 2002, fiksna
  // osnovica), pa stoji u zasebnoj sekciji. U d.o.o. (COMPANY) vlasnik se
  // obračunava kao standardni radnik (Obrazac 2001, bruto/neto/doprinosi).
  const isObrt = currentOrg?.type === "BUSINESS";
  // d.o.o.: vlasnik ulazi u obračun samo ako ima unesen DATUM PRIJAVE u ovoj
  // org (isti princip kao forma vlasnika: "ako se unese datum prijave, vlasnik
  // se računa kao prijavljen"). Bez datuma prijave (npr. vlasnik koji je prijavu
  // prebacio u drugu svoju org) se ne obračunava. Obični radnici (RADNIK)
  // zadržavaju logiku po datumima prijave/odjave.
  const radnici = useMemo(
    () =>
      isObrt
        ? radniciRaw
        : [...radniciRaw, ...vlasniciRaw.filter((w) => !!w.prijavaDate)],
    [isObrt, radniciRaw, vlasniciRaw],
  );
  const vlasnici = useMemo(
    () => (isObrt ? vlasniciRaw : []),
    [isObrt, vlasniciRaw],
  );

  const payrollByWorker = useMemo(() => {
    const map = new Map<number, Payroll>();
    for (const p of payrollsQuery.data ?? []) map.set(p.workerId, p);
    return map;
  }, [payrollsQuery.data]);

  // Agregati za footer. "Ukupan trošak" uključuje i fond invalida (0,5% × bruto),
  // tako da bude konzistentan sa "Ukupan trošak poslodavca" u Pregledu mjeseca.
  // Fond invalida (0,5%) plaćaju samo COMPANY (privredna društva). Obrti
  // (BUSINESS) su izuzeti.
  const fondInvalidiApplies = currentOrg?.type !== "BUSINESS";

  const totals = useMemo(() => {
    let net = 0;
    let cost = 0;
    let empContrib = 0;
    let erpContrib = 0;
    let tax = 0;
    let invalidi = 0;
    let count = 0;
    // Filtriraj payrolle samo na one čiji workerId i dalje postoji u
    // radnici/vlasnici listi. Ako je radnik obrisan, njegov payroll ostaje
    // u DB (nema CASCADE), ali ne smijemo ga uračunati u footer totale.
    const validWorkerIds = new Set([
      ...radnici.map((w) => w.id),
      ...vlasnici.map((w) => w.id),
    ]);
    for (const p of payrollsQuery.data ?? []) {
      if (!validWorkerIds.has(p.workerId)) continue;
      const gross = Number(p.gross) || 0;
      const fondInv = fondInvalidiApplies ? gross * 0.005 : 0;
      net += Number(p.net) || 0;
      cost += (Number(p.totalCost) || 0) + fondInv;
      empContrib += Number(p.empTotal) || 0;
      erpContrib += Number(p.erpTotal) || 0;
      tax += Number(p.incomeTax) || 0;
      invalidi += fondInv;
      count++;
    }
    return { net, cost, empContrib, erpContrib, tax, invalidi, count };
  }, [payrollsQuery.data, fondInvalidiApplies, radnici, vlasnici]);

  // Helper: invalidira SVE keševe vezane za payroll obračun ovog mjeseca
  // (payrolls + monthlySummary). Koristi se nakon svake calc/delete operacije
  // da bi Pregled mjeseca, Zbirne uplatnice i footer totali odmah refreshali.
  const invalidatePayrollCaches = () => {
    queryClient.invalidateQueries({ queryKey: ["payrolls", orgId, year, month] });
    queryClient.invalidateQueries({ queryKey: ["monthlySummary", orgId, year, month] });
    // KPI "Obračuna (mj.)" na profilu broji obračune, osvježi ga.
    queryClient.invalidateQueries({ queryKey: ["myStats"] });
  };

  const calcMutation = useMutation({
    mutationFn: (payload: Parameters<typeof calculatePayroll>[0]) =>
      unwrap(calculatePayroll(payload)),
    onSuccess: () => {
      invalidatePayrollCaches();
    },
  });

  const handleCalcAll = async () => {
    if (!orgId || !currentOrg) return;
    // Koristi shared helper (vidi obracunOrgPayrolls.ts) — ista logika
    // koju /organizacije bulk akcija koristi, samo za jednu org-u.
    const { obracunOrgPayrolls } = await import("./obracunOrgPayrolls");
    const result = await obracunOrgPayrolls({
      org: currentOrg,
      year,
      month,
    });

    invalidatePayrollCaches();
    if (result.error) {
      notify(`Greška: ${result.error}`, "error");
      return;
    }
    if (result.calculated === 0 && result.skipped > 0) {
      notify(
        `Nijedan obračun nije izvršen. Preskočeno: ${result.skippedNames.join(", ")}.`,
        "error",
      );
    } else if (result.skipped > 0) {
      notify(
        `Obračunato ${result.calculated}, preskočeno ${result.skipped}: ${result.skippedNames.join(", ")}.`,
        "info",
      );
    } else if (result.calculated > 0) {
      notify(`Obračunato ${result.calculated} radnik(a).`, "success");
    }
    if (result.calculated > 0) {
      trackEvent(
        "PLATA_GENERATE",
        `Plate ${String(month).padStart(2, "0")}/${year} (${result.calculated})`,
        orgId,
      );
    }
    if (result.warnings.length > 0) {
      notify(result.warnings.join(" · "), "warning");
    }
  };

  const [isDeletingAll, setIsDeletingAll] = useState(false);
  // Modal za uvoz prethodnih plata (GIP). Hostan ovdje da je dostupan i prije
  // ijednog obračuna (MonthlyPanel sa svojim dugmadima se prikazuje tek kad
  // postoji obračun).
  const [uvozOpen, setUvozOpen] = useState(false);
  const handleDeleteAll = async () => {
    if (!orgId) return;
    const payrolls = payrollsQuery.data ?? [];
    if (payrolls.length === 0) return;
    const ok = await confirmDialog(
      `Obrisati SVE obračune (${payrolls.length}) za ${MONTHS[month - 1]} ${year}? ` +
        `Ova akcija se ne može poništiti, svi platni listići, uplatnice i obrasci 2001/2002 za ovaj mjesec će biti uklonjeni.`,
    );
    if (!ok) return;
    setIsDeletingAll(true);
    let deleted = 0;
    let failed = 0;
    for (const p of payrolls) {
      try {
        await unwrap(deletePayroll(p.id));
        deleted++;
      } catch (e) {
        failed++;
        console.error("delete fail", p.id, e);
      }
    }
    setIsDeletingAll(false);
    invalidatePayrollCaches();
    if (failed > 0) {
      notify(`Obrisano ${deleted}, neuspješno ${failed}.`, "error");
    } else {
      notify(`Obrisano ${deleted} obračun(a) za ${MONTHS[month - 1]} ${year}.`, "success");
    }
  };

  const yearOptions = useMemo(() => {
    const ny = init.year;
    return [ny, ny - 1, ny - 2];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init.year]);

  // Detektuj radnike/vlasnike čiji prijavaDate ili odjavaDate pada unutar
  // obračun mjeseca — generiše warning banner pa korisnik može prilagoditi
  // bruto platu (ručno) ili znati zašto je obračun manji.
  const midMonthWarnings = useMemo(() => {
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);
    const lastDay = new Date(year, month, 0).getDate();
    const startISO = `${yyyy}-${mm}-01`;
    const endISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
    const totalDays = lastDay;
    const fmtDate = (iso: string) => {
      const [, m, d] = iso.split("-");
      return `${d}.${m}.${yyyy}.`;
    };
    type Warn = {
      workerId: number;
      name: string;
      kind: "prijava" | "odjava";
      date: string;
      days: number;
    };
    const warnings: Warn[] = [];
    for (const w of [...radnici, ...vlasnici]) {
      const prijava = w.prijavaDate ? w.prijavaDate.slice(0, 10) : null;
      const odjava = w.odjavaDate ? w.odjavaDate.slice(0, 10) : null;
      const name = `${w.firstName} ${w.lastName}`.trim();
      if (prijava && prijava > startISO && prijava <= endISO) {
        const day = parseInt(prijava.slice(8, 10), 10);
        const daysActive = totalDays - day + 1;
        warnings.push({
          workerId: w.id,
          name,
          kind: "prijava",
          date: fmtDate(prijava),
          days: daysActive,
        });
      }
      if (odjava && odjava >= startISO && odjava < endISO) {
        const day = parseInt(odjava.slice(8, 10), 10);
        warnings.push({
          workerId: w.id,
          name,
          kind: "odjava",
          date: fmtDate(odjava),
          days: day,
        });
      }
    }
    return warnings;
  }, [radnici, vlasnici, year, month]);

  // Nedostajući podaci za obrasce/uplatnice: JMBG (svi koji ulaze u obračun) i
  // grad. Ne blokira generisanje, samo upozorava da obrazac (2002/GIP/MIP) i
  // uplatnice ne budu nepotpuni. Za obrt RADNIKA općina ide iz sjedišta
  // djelatnosti (organization.city), pa mu se grad ne pripisuje pojedinačno.
  const missingDataWarnings = useMemo(() => {
    const out: {
      id: number;
      name: string;
      isVlasnik: boolean;
      missing: string[];
    }[] = [];
    for (const w of [...vlasnici, ...radnici]) {
      const missing: string[] = [];
      if (!(w.jmbg || "").trim()) missing.push("JMBG");
      const usesOwnCity = !(isObrt && w.role === "RADNIK");
      if (usesOwnCity && !(w.city || "").trim()) missing.push("grad");
      if (missing.length) {
        out.push({
          id: w.id,
          name: `${w.firstName} ${w.lastName}`.trim() || "Radnik",
          isVlasnik: w.role === "VLASNIK",
          missing,
        });
      }
    }
    return out;
  }, [vlasnici, radnici, isObrt]);

  // Obrt sa radnicima: njihova općina (uplatnica) ide iz sjedišta djelatnosti.
  const orgCityMissing =
    isObrt && radnici.length > 0 && !((currentOrg?.city || "").trim());

  return (
    <div>
      {!canGenerate && (
        <GeneratePaywall
          tier="PRO"
          what="Preuzimanje platnih listića, uplatnica i obrazaca 2001/2002"
        />
      )}
      {midMonthWarnings.length > 0 && (
        <div
          style={{
            margin: "0 0 1.25rem",
            padding: "0.95rem 1.1rem",
            background: "var(--warn-bg)",
            border: "1px solid var(--warn-border)",
            borderRadius: 10,
            fontSize: 14,
            color: "var(--warn-text)",
            lineHeight: 1.55,
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>
            ⚠️ Djelimičan mjesec, provjerite bruto plate
          </strong>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {midMonthWarnings.map((w, i) => (
              <li key={`${w.workerId}-${w.kind}-${i}`}>
                <strong>{w.name}</strong>{" "}
                {w.kind === "prijava" ? (
                  <>
                    je prijavljen <strong>{w.date}</strong>, aktivan je samo{" "}
                    <strong>{w.days}</strong> dan
                    {w.days === 1 ? "" : w.days < 5 ? "a" : "a"} u mjesecu.
                  </>
                ) : (
                  <>
                    je odjavljen <strong>{w.date}</strong>, radio je samo{" "}
                    <strong>{w.days}</strong> dan
                    {w.days === 1 ? "" : w.days < 5 ? "a" : "a"} u mjesecu.
                  </>
                )}
              </li>
            ))}
          </ul>
          <p style={{ margin: "0.6rem 0 0", fontSize: 12.5, color: "var(--warn-text)" }}>
            Bruto plata radnika upišite proporcionalno (npr. {`mjesečna_bruto × dani_aktivnosti / ukupni_dani`}).
            Obrazac 2001 period će se automatski prilagoditi datumima.
            {isObrt && " Vlasniku obrta se osnovica i doprinosi (2002) automatski obračunavaju proporcionalno (pro-rate) za aktivni period."}
          </p>
        </div>
      )}
      {(missingDataWarnings.length > 0 || orgCityMissing) && (
        <div
          style={{
            margin: "0 0 1.25rem",
            padding: "0.95rem 1.1rem",
            background: "var(--warn-bg)",
            border: "1px solid var(--warn-border)",
            borderRadius: 10,
            fontSize: 14,
            color: "var(--warn-text)",
            lineHeight: 1.55,
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>
            ⚠️ Nepotpuni podaci za obrasce
          </strong>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {missingDataWarnings.map((w) => (
              <li key={w.id}>
                <strong>{w.name}</strong>
                {w.isVlasnik ? " (vlasnik)" : ""}: nedostaje{" "}
                <strong>{w.missing.join(" i ")}</strong>.
              </li>
            ))}
            {orgCityMissing && (
              <li>
                Djelatnost nema unesen <strong>grad / sjedište</strong> (potreban
                za općinu na uplatnicama radnika).
              </li>
            )}
          </ul>
          <p style={{ margin: "0.6rem 0 0", fontSize: 12.5, color: "var(--warn-text)" }}>
            JMBG i grad su potrebni za obrasce (2002, GIP, MIP) i uplatnice.
            Obrazac će se i bez njih generisati, ali ta polja ostaju prazna.{" "}
            <a
              href={`/organizacija/${orgId}`}
              style={{ color: "var(--warn-text)", fontWeight: 600 }}
            >
              Dopuni podatke →
            </a>
          </p>
        </div>
      )}
      <div className={js3Styles.section}>
        <h2 className={js3Styles.sectionTitle}>
          Mjesec <em>obračuna</em>
        </h2>
        <div className={js3Styles.fieldGrid}>
          <div className={js3Styles.fieldGroup}>
            <label className={js3Styles.fieldLabel} htmlFor="org">
              Organizacija
            </label>
            <OrgSelect id="org" value={orgId} onChange={(v) => setOrgId(v)} />
          </div>

          <div className={js3Styles.fieldGroup}>
            <label className={js3Styles.fieldLabel} htmlFor="period">
              Period (mjesec / godina)
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <StyledSelect
                id="period"
                ariaLabel="Mjesec"
                wrapStyle={{ flex: 2 }}
                value={month}
                onChange={(v) => setMonth(Number(v))}
                groups={[
                  {
                    options: MONTHS.map((m, i) => ({ value: i + 1, label: m })),
                  },
                ]}
              />
              <StyledSelect
                ariaLabel="Godina"
                wrapStyle={{ flex: 1 }}
                value={year}
                onChange={(v) => setYear(Number(v))}
                groups={[
                  {
                    options: yearOptions.map((y) => ({
                      value: y,
                      label: String(y),
                    })),
                  },
                ]}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.6rem",
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* Uvoz ranijih obračuna (GIP) — vidljiv i prije ijednog obračuna,
              dok god organizacija ima radnika. Bez radnika je onemogućen sa
              porukom da prvo treba dodati radnike. */}
          {isLoggedIn && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setUvozOpen(true)}
              disabled={radnici.length === 0}
              title={
                radnici.length === 0
                  ? "Dodajte radnike da biste uvezli prethodne plate"
                  : "Uvezite ranije obračune plata (za GIP) ako ste u toku godine prešli na naš program."
              }
              style={{ marginRight: "auto" }}
            >
              Uvezi prethodne plate
            </button>
          )}
          {(payrollsQuery.data?.length ?? 0) > 0 && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={handleDeleteAll}
              disabled={isDeletingAll || calcMutation.isPending}
              style={{
                color: "#b91c1c",
                borderColor: "#fecaca",
              }}
            >
              {isDeletingAll
                ? "Brisanje…"
                : `Obriši obračun za sve (${payrollsQuery.data?.length ?? 0})`}
            </button>
          )}
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleCalcAll}
            disabled={
              !orgId ||
              (radnici.length === 0 && vlasnici.length === 0) ||
              calcMutation.isPending
            }
          >
            {calcMutation.isPending
              ? "Obračunavanje…"
              : `Obračunaj sve (${radnici.length + vlasnici.length})`}
          </button>
        </div>
      </div>

      {/* Sekcija vlasnika obrta, fiksna osnovica iz Sl. novina */}
      {currentOrg?.type === "BUSINESS" && vlasnici.length > 0 && (
        <VlasniciSection
          orgId={orgId!}
          year={year}
          month={month}
          organization={currentOrg}
          vlasnici={vlasnici}
          payrollByWorker={payrollByWorker}
          allWorkersCount={radnici.length + vlasnici.length}
          canGenerate={canGenerate}
        />
      )}

      {orgId && workersQuery.isLoading ? (
        <div className={styles.empty}>Učitavam radnike…</div>
      ) : !isLoggedIn ? (
        <MockObracunPreview />
      ) : radnici.length === 0 && vlasnici.length === 0 ? (
        <div className={styles.empty}>
          Nema dodanih radnika za ovu organizaciju. Dodajte radnike da biste
          obračunali plate ili uvezli prethodne obračune (za GIP).{" "}
          <Link href={`/aktivni-radnici${orgId ? `?org=${orgId}` : ""}`} className={styles.btnGhost}>
            Dodaj radnike →
          </Link>
        </div>
      ) : radnici.length === 0 ? (
        <div className={styles.empty}>
          Nema dodanih radnika (pored vlasnika).{" "}
          <Link href={`/aktivni-radnici${orgId ? `?org=${orgId}` : ""}`} className={styles.btnGhost}>
            Dodaj radnike →
          </Link>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Radnik</th>
                <th className={styles.num}>Bruto</th>
                <th className={styles.num}>Koef.</th>
                <th className={styles.num}>Sati</th>
                <th className={styles.num}>Neto</th>
                <th className={styles.num}>Trošak</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {radnici.map((w) => {
                const p = payrollByWorker.get(w.id);
                const status: Payroll["status"] | null = p?.status ?? null;
                return (
                  <tr
                    key={w.id}
                    className={styles.rowClickable}
                    onClick={() => setOpenWorkerId(w.id)}
                  >
                    <td>
                      {status ? (
                        <span
                          className={`${styles.badge} ${STATUS_CLASS[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeNone}`}>
                          Nije obračunato
                        </span>
                      )}
                      {p?.imported && (
                        <span
                          className={styles.badge}
                          title="Uvezeno iz ranijeg programa (za GIP)"
                          style={{
                            marginLeft: 4,
                            background: "color-mix(in srgb, var(--mid, #7a8a7d) 16%, transparent)",
                            color: "var(--mid, #7a8a7d)",
                          }}
                        >
                          Uvezeno
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>
                        {w.firstName} {w.lastName}
                      </strong>
                      {w.position ? (
                        <div className={styles.muted} style={{ fontSize: "0.8rem" }}>
                          {w.position}
                        </div>
                      ) : null}
                    </td>
                    <td className={styles.num}>
                      {fmtKM(p?.gross ?? w.salaryBruto)}
                    </td>
                    <td className={styles.num}>
                      {(p?.taxCoefficient ?? w.taxCoefficient ?? 1).toFixed(2)}
                    </td>
                    <td className={styles.num}>
                      {minutesToHoursLabel(p?.workedMinutes ?? null)}
                    </td>
                    <td className={styles.num}>{fmtKM(p?.net ?? null)}</td>
                    <td className={styles.num}>{fmtKM(p?.totalCost ?? null)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenWorkerId(w.id);
                          }}
                          title="Uredi obračun radnika"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                          Detalji
                        </button>
                        {p && p.gross > 0 && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!canGenerate) return;
                              const r = await generateWorkerPayslip(p.id, undefined, orgId);
                              if (r.ok) triggerBlobDownload(r.blob, r.filename);
                            }}
                            disabled={!canGenerate}
                            title={canGenerate ? "Preuzmi platni listić za ovog radnika" : "Dostupno uz Pro pretplatu"}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Listić
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totals.count > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Radnika obračunato</span>
            <span className={styles.summaryValue}>{totals.count}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Ukupno neto</span>
            <span className={styles.summaryValue}>{fmtKM(totals.net)} KM</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Porez na dohodak</span>
            <span className={styles.summaryValue}>{fmtKM(totals.tax)} KM</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Doprinosi iz</span>
            <span className={styles.summaryValue}>
              {fmtKM(totals.empContrib)} KM
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Doprinosi na</span>
            <span className={styles.summaryValue}>
              {fmtKM(totals.erpContrib)} KM
            </span>
          </div>
          {fondInvalidiApplies && (
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Fond invalida</span>
              <span className={styles.summaryValue}>
                {fmtKM(totals.invalidi)} KM
              </span>
            </div>
          )}
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Ukupan trošak</span>
            <span className={styles.summaryValue}>{fmtKM(totals.cost)} KM</span>
          </div>
        </div>
      )}

      {orgId !== null && totals.count > 0 && (
        <MonthlyPanel
          orgId={orgId}
          year={year}
          month={month}
          organization={allOrgs.find((o) => o.id === orgId) ?? null}
          totalWorkersCount={radnici.length + vlasnici.length}
          radnici={radnici}
          payrollByWorker={payrollByWorker}
          canGenerate={canGenerate}
        />
      )}

      {openWorkerId !== null && orgId !== null && (
        <PayrollModal
          orgId={orgId}
          year={year}
          month={month}
          worker={radnici.find((w) => w.id === openWorkerId)!}
          payroll={payrollByWorker.get(openWorkerId) ?? null}
          orgMealRate={
            allOrgs.find((o) => o.id === orgId)?.mealAllowancePerDay ?? null
          }
          onClose={() => setOpenWorkerId(null)}
        />
      )}

      {/* isti PK Office modal kao na /app/obracuni-plata (odluka vlasnika:
          isti dizajn na obje strane; .pk-scope na Modal-u nosi PK stil) */}
      {uvozOpen && orgId !== null && (
        <UvozPlataPkModal
          orgId={orgId}
          year={year}
          radnici={radnici}
          isObrt={allOrgs.find((o) => o.id === orgId)?.type === "BUSINESS"}
          onClose={() => setUvozOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Monthly panel — zbirni prikaz svih uplatnica po vrsti za mjesec.
//  Doprinosi/porezi se uplaćuju zbirno po vrsti (svi radnici u jednoj uplatnici),
//  a neto plate, topli obrok i putni trošak idu odvojeno svakom radniku.
// ─────────────────────────────────────────────────────────────────────────────

function fmtAccount(s: string): string {
  if (!s) return "–";
  return s;
}

// Red u kartici "Dokumenti mjeseca": caps labela lijevo (kome dokument ide),
// dugmad desno; na uskom ekranu labela iznad dugmadi (vidi .docRow u CSS-u).
function DocRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.docRow}>
      <div className={styles.docRowLabel}>{label}</div>
      <div className={styles.docRowBtns}>{children}</div>
    </div>
  );
}

function BulkMarkPaidAction({
  isPending,
  onMark,
}: {
  isPending: boolean;
  onMark: () => Promise<number>;
}) {
  const { confirm: confirmDialog, notify } = useNotice();
  const handleClick = async () => {
    const ok = await confirmDialog(
      "Označiti SVE obračune u ovom mjesecu kao isplaćene?",
    );
    if (!ok) return;
    try {
      const updated = await onMark();
      notify(`Označeno ${updated} obračun(a) kao isplaćeni.`, "success");
    } catch (e) {
      notify(
        "Greška pri označavanju: " + ((e as Error)?.message || "nepoznata"),
        "error",
      );
    }
  };
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "0.85rem" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--mid)",
          padding: "0.5rem 1rem",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: "0.85rem",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="14"
          height="14"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {isPending ? "Označavam…" : "Označi sve obračune kao isplaćene"}
      </button>
    </div>
  );
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// "datoteke" uz 1-4, "datoteka" uz 5 i više (naših paketa ima najviše 5).
function datotekaPadez(n: number): string {
  return n % 10 >= 1 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
    ? "datoteke"
    : "datoteka";
}

// Lista kartica koja je po defaultu sažeta: prikaže prve par, ostatak zamuti
// (gradient) sa dugmetom "Prikaži sve". Otvoreno → "Sakrij sve" istim dugmetom.
function FadePreviewList({ cards }: { cards: React.ReactNode[] }) {
  const [open, setOpen] = useState(false);
  const collapsed = !open && cards.length > 3;
  const btn: CSSProperties = {
    background: "var(--sage, #3a5c42)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.45rem 1.1rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  };
  return (
    <>
      <div style={{ position: "relative" }}>
        <div
          className={styles.uplCardsList}
          style={collapsed ? { maxHeight: 250, overflow: "hidden" } : undefined}
        >
          {cards}
        </div>
        {collapsed && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 96,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: 8,
              // fade u boju pozadine stranice, prati temu (svijetlu i tamnu)
              background:
                "linear-gradient(transparent, var(--paper, #f5f2eb))",
              pointerEvents: "none",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              style={{ ...btn, pointerEvents: "auto" }}
            >
              Prikaži sve ({cards.length})
            </button>
          </div>
        )}
      </div>
      {open && cards.length > 3 && (
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <button type="button" onClick={() => setOpen(false)} style={btn}>
            Sakrij sve
          </button>
        </div>
      )}
    </>
  );
}

// ── Vlasnik obrta sekcija — fiksna osnovica + 36% doprinosa ────────────────
function VlasniciSection({
  orgId,
  year,
  month,
  organization,
  vlasnici,
  payrollByWorker,
  allWorkersCount,
  canGenerate,
}: {
  orgId: number;
  year: number;
  month: number;
  organization: Organization;
  vlasnici: Worker[];
  payrollByWorker: Map<number, Payroll>;
  allWorkersCount: number;
  canGenerate: boolean;
}) {
  const queryClient = useQueryClient();

  // Izračun osnovice na osnovu režima + kategorije organizacije.
  const osnovicaInfo = useMemo(() => {
    if (!organization.taxRegime) return null;
    try {
      const o = getOsnovica(
        year,
        organization.taxRegime,
        organization.taxCategory || undefined,
      );
      return { osnovica: o, error: null as string | null };
    } catch (e) {
      return {
        osnovica: 0,
        error: e instanceof Error ? e.message : "Greška u podešavanju režima",
      };
    }
  }, [year, organization.taxRegime, organization.taxCategory]);

  const calcMutation = useMutation({
    mutationFn: (workerId: number) => {
      const vlasnik = vlasnici.find((v) => v.id === workerId);
      const proRateFactor = vlasnik
        ? computeProRateFactor(vlasnik, year, month)
        : 1;
      return unwrap(
        calculatePayroll({
          organizationId: orgId,
          workerId,
          year,
          month,
          // Ako je mid-month, šaljemo proRateFactor. Backend skalira fiksnu
          // osnovicu iz Sl. novina i sve doprinose 36% proporcionalno tom
          // faktoru — Pregled mjeseca, uplatnice i 2002 obrazac su svi
          // automatski sinhronizovani.
          ...(proRateFactor < 1 ? { proRateFactor } : {}),
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payrolls", orgId, year, month],
      });
      queryClient.invalidateQueries({
        queryKey: ["monthlySummary", orgId, year, month],
      });
      queryClient.invalidateQueries({ queryKey: ["myStats"] });
    },
  });

  // Obrazac 2002 — generišemo klijentski iz worker (vlasnik) + org + payroll
  // snapshot. Vlasnik se predhodno mora obračunati (klik "Obračunaj").
  // Podaci se sklapaju u shared builderu (obrasciSpecifikacije), isti kod
  // koristi i bulk preuzimanje na /organizacije.
  const obrazac2002Mutation = useMutation({
    mutationFn: async (vlasnik: Worker) => {
      const p = payrollByWorker.get(vlasnik.id);
      if (!p) {
        throw new Error("Vlasnik nije obračunat za ovaj mjesec");
      }
      if (!organization.taxRegime) {
        throw new Error("Postavi režim oporezivanja na organizaciji");
      }
      const data = build2002Data({
        organization,
        vlasnik,
        payroll: p,
        allWorkersCount,
        year,
        month,
      });
      const bytes = await fillObrazac2002Template(data);
      const safeName = `${vlasnik.firstName}_${vlasnik.lastName}`.replace(
        /[^A-Za-z0-9_]/g,
        "_",
      );
      return {
        bytes,
        filename: `Obrazac-2002-${safeName}-${String(year)}-${String(month).padStart(2, "0")}.pdf`,
      };
    },
    onSuccess: ({ bytes, filename }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      triggerBlobDownload(blob, filename);
    },
  });

  const kategorijaLabel = (() => {
    if (!organization.taxCategory) return "";
    if (organization.taxRegime === "STVARNI_DOHODAK") {
      return KATEGORIJA_STVARNI_LABELS[
        organization.taxCategory as keyof typeof KATEGORIJA_STVARNI_LABELS
      ];
    }
    if (organization.taxRegime === "PAUSALNI") {
      return KATEGORIJA_PAUSALNI_LABELS[
        organization.taxCategory as keyof typeof KATEGORIJA_PAUSALNI_LABELS
      ];
    }
    return "";
  })();

  // Doprinosi: PIO 19.5%, ZDR 14.5%, NEZAP 2% = 36%
  const o = osnovicaInfo?.osnovica ?? 0;
  const pio = o * 0.195;
  const zdr = o * 0.145;
  const nezap = o * 0.02;
  const total = pio + zdr + nezap;

  // Kad je vlasnik obračunat, osnovica i doprinosi su već pro-rate-ovani (mid-month
  // prijava/odjava), pa prikazujemo STVARNE iznose iz obračuna (skalirane), a ne
  // pune nominalne. Nominalne (o/total) ostaju kao preview dok nije obračunato.
  const obracunatiVlasnici = vlasnici
    .map((v) => payrollByWorker.get(v.id))
    .filter((p): p is Payroll => !!p);
  const hasObracun = obracunatiVlasnici.length > 0;
  const sumP = (sel: (p: Payroll) => number | string | null | undefined) =>
    obracunatiVlasnici.reduce((a, p) => a + (Number(sel(p)) || 0), 0);
  const dispOsnovica = hasObracun ? sumP((p) => p.gross) : o;
  const dispPio = hasObracun ? sumP((p) => p.empPio) : pio;
  const dispZdr = hasObracun ? sumP((p) => p.empZdravstvo) : zdr;
  const dispNezap = hasObracun ? sumP((p) => p.empNezaposlenost) : nezap;
  const dispTotal = hasObracun ? sumP((p) => p.empTotal) : total;

  if (!organization.taxRegime) {
    return (
      <div className={styles.warning} style={{ marginBottom: "1rem" }}>
        Organizacija nema postavljen režim oporezivanja vlasnika. Postavi ga u{" "}
        <Link href="/profil" className={styles.btnGhost}>
          Profil → Moje organizacije
        </Link>{" "}
        kako bi se mogao obračunati vlasnik.
      </div>
    );
  }

  if (osnovicaInfo?.error) {
    return (
      <div className={styles.errorMsg} style={{ marginBottom: "1rem" }}>
        {osnovicaInfo.error}
      </div>
    );
  }

  return (
    <section
      style={{
        marginTop: "1rem",
        padding: "1rem 1.25rem",
        border: "1px solid var(--border, #d4cfc4)",
        borderRadius: "10px",
        background: "var(--paper, #faf8f3)",
      }}
    >
      <h3
        style={{
          fontFamily: "DM Serif Display, serif",
          fontSize: "1.15rem",
          margin: "0 0 0.5rem",
        }}
      >
        Vlasnik obrta
      </h3>
      <p className={styles.muted} style={{ margin: "0 0 0.8rem", fontSize: "0.85rem" }}>
        {REZIM_LABELS[organization.taxRegime]}
        {kategorijaLabel ? `, ${kategorijaLabel}` : ""}
      </p>

      <div className={styles.summary} style={{ marginBottom: "1rem" }}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Osnovica</span>
          <span className={styles.summaryValue}>{fmtKM(dispOsnovica)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>PIO/MIO (19,5%)</span>
          <span className={styles.summaryValue}>{fmtKM(dispPio)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Zdravstveno (14,5%)</span>
          <span className={styles.summaryValue}>{fmtKM(dispZdr)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Nezaposlenost (2%)</span>
          <span className={styles.summaryValue}>{fmtKM(dispNezap)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Ukupno doprinosa (36%)</span>
          <span className={styles.summaryValue} style={{ color: "#b91c1c" }}>
            {fmtKM(dispTotal)} KM
          </span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Vlasnik</th>
              <th className={styles.num}>Osnovica</th>
              <th className={styles.num}>Doprinosi (36%)</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {vlasnici.map((v) => {
              const p = payrollByWorker.get(v.id);
              const status: Payroll["status"] | null = p?.status ?? null;
              return (
                <tr key={v.id}>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        status ? STATUS_CLASS[status] : styles.badgeNone
                      }`}
                    >
                      {status ? STATUS_LABEL[status] : "Nije obračunato"}
                    </span>
                  </td>
                  <td>
                    <strong>
                      {v.firstName} {v.lastName}
                    </strong>
                    {v.position && (
                      <div className={styles.muted} style={{ fontSize: "0.8rem" }}>
                        {v.position}
                      </div>
                    )}
                  </td>
                  <td className={styles.num}>
                    {fmtKM(p ? Number(p.gross) || 0 : o)}
                  </td>
                  <td className={styles.num}>
                    {fmtKM(p ? Number(p.empTotal) || 0 : total)}
                  </td>
                  <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => calcMutation.mutate(v.id)}
                      disabled={calcMutation.isPending}
                      title="Obračunaj vlasnika"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      {calcMutation.isPending ? "Obračun…" : "Obračunaj"}
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => obrazac2002Mutation.mutate(v)}
                      disabled={obrazac2002Mutation.isPending || !p || p.status === "DRAFT" || !canGenerate}
                      title={canGenerate ? "Preuzmi Obrazac 2002" : "Dostupno uz Pro pretplatu"}
                      style={{
                        background: "var(--sage, #3a5c42)",
                        borderColor: "var(--sage, #3a5c42)",
                        color: "#fff",
                      }}
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
                      Obrazac 2002
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(calcMutation.isError || obrazac2002Mutation.isError) && (
        <div className={styles.errorMsg} style={{ marginTop: "0.6rem" }}>
          {(calcMutation.error as Error)?.message ||
            (obrazac2002Mutation.error as Error)?.message ||
            "Greška"}
        </div>
      )}
    </section>
  );
}

function MonthlyPanel({
  orgId,
  year,
  month,
  organization,
  totalWorkersCount,
  radnici,
  payrollByWorker,
  canGenerate,
}: {
  orgId: number;
  year: number;
  month: number;
  organization: Organization | null;
  totalWorkersCount: number;
  radnici: Worker[];
  payrollByWorker: Map<number, Payroll>;
  canGenerate: boolean;
}) {
  // Radnici po entitetu: FBiH idu na Obrazac 2001, RS na 2001-A.
  const radniciRs = useMemo(
    () => radnici.filter((w) => w.prebivalisteEntitet === "RS"),
    [radnici],
  );
  const radniciFbih = useMemo(
    () => radnici.filter((w) => w.prebivalisteEntitet !== "RS"),
    [radnici],
  );
  // Datum isplate plate (YYYY-MM-DD). Perzistira po (org, year, month) preko
  // payrolls.paymentDate snapshot-a — čita iz prvog payroll-a u mjesecu, snima
  // na promjenu (batch update svih payroll-a u mjesecu). Ako nema postojećeg
  // obračuna, default je zadnji dan mjeseca obračuna.
  const defaultPaymentDate = (() => {
    const last = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  })();
  // Postojeći paymentDate iz bilo kojeg payroll-a tog mjeseca (svi su sinhroni).
  const persistedPaymentDate = (() => {
    for (const p of payrollByWorker.values()) {
      if (p.paymentDate) return p.paymentDate;
    }
    return null;
  })();
  const [paymentDate, setPaymentDate] = useState<string>(
    persistedPaymentDate ?? defaultPaymentDate,
  );

  // Mjesec sadrži uvezene plate? Tada upozori prije generisanja prijava
  // (2001/MIP), jer su za te mjesece prijave vjerovatno već predate u ranijem
  // programu (uvezeni obračun nije naš za predaju).
  const monthHasImported = useMemo(() => {
    for (const p of payrollByWorker.values()) if (p.imported) return true;
    return false;
  }, [payrollByWorker]);

  // Radnici aktivni u mjesecu bez obračuna, dok mjesec ima bar jedan obračun:
  // klasičan propust koji se inače otkrije tek kad u MIP-u fali red.
  const bezObracuna = useMemo(() => {
    if (payrollByWorker.size === 0) return [];
    return radnici.filter((w) => {
      const p = payrollByWorker.get(w.id);
      return !p || !(Number(p.gross) > 0);
    });
  }, [radnici, payrollByWorker]);

  // MIP-1023 XML za ovaj mjesec već preuzet? (oznaka uz PUFBiH grupu)
  const mipPreuzetAt = useMemo(() => {
    for (const p of payrollByWorker.values()) {
      if (p.mipDownloadedAt) return p.mipDownloadedAt;
    }
    return null;
  }, [payrollByWorker]);
  // notify za payslipsEmailMutation feedback (uspjeh/skip/error rezime),
  // confirm za upozorenje kod uvezenih plata (naš dijalog, ne window.confirm)
  const { confirm: confirmDialog, notify } = useNotice();

  const confirmImported = async () =>
    !monthHasImported ||
    (await confirmDialog(
      "Ovaj mjesec sadrži uvezene plate iz ranijeg programa. Prijave su vjerovatno već predate drugdje. Sigurno želiš ponovo generisati ovaj dokument?",
    ));

  // Resync state kad se promijeni mjesec/godina ili kad se učitaju payroll-i
  // iz DB-a (npr. tek nakon prvog obračuna paymentDate može biti dostupan).
  useEffect(() => {
    setPaymentDate(persistedPaymentDate ?? defaultPaymentDate);
  }, [persistedPaymentDate, defaultPaymentDate]);

  const queryClient = useQueryClient();
  const paymentDateMutation = useMutation({
    mutationFn: async (nextDate: string) => {
      const r = await setPayrollPaymentDate({
        organizationId: orgId,
        year,
        month,
        paymentDate: nextDate,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      // Invalidate payroll list query — refresh paymentDate u payrollByWorker.
      queryClient.invalidateQueries({ queryKey: ["payrolls", orgId, year, month] });
    },
  });

  const handlePaymentDateChange = (next: string) => {
    setPaymentDate(next);
    // Snimi samo ako postoji bar jedan payroll u mjesecu (inače DB UPDATE
    // pogađa 0 redova — nema gdje upisati). Ako nema obračuna, paymentDate
    // je samo lokalni state dok user ne pokrene "Obračunaj sve".
    if (payrollByWorker.size > 0 && /^\d{4}-\d{2}-\d{2}$/.test(next)) {
      paymentDateMutation.mutate(next);
    }
  };

  const summaryQuery = useQuery({
    queryKey: ["monthlySummary", orgId, year, month],
    queryFn: () => unwrap(getMonthlySummary(orgId, year, month)),
  });

  const uplatniceMutation = useMutation({
    mutationFn: async () => {
      const r = await generateMonthlyUplatnice(orgId, year, month, paymentDate);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: (r) => triggerBlobDownload(r.blob, r.filename),
  });

  // Izvoz naloga mjeseca u datoteku za e-bankarstvo: isti nalozi kao zbirne
  // uplatnice (uključujući objedinjavanje kantonalnih ako je uključeno),
  // format po izabranoj banci. Korisnik datoteku uveze u svoje bankarstvo
  // (opcija "uvoz naloga") i samo potpiše naloge.
  const [izvozOpen, setIzvozOpen] = useState(false);
  const [izvozBanka, setIzvozBanka] = useState<string | null>(null);
  // Štampa naloga na matričnom pisaču (pred-štampani obrazac na traci).
  const [stampaOpen, setStampaOpen] = useState(false);
  const [izvozDatum, setIzvozDatum] = useState("");
  const [izvozRezultat, setIzvozRezultat] =
    useState<BankExportRezultat | null>(null);
  // Preskočeni nalozi se prikazuju i kad izvoz USPIJE (djelimična datoteka) i
  // kad padne sa NEMA_NALOGA (backend i tada šalje listu u error bodyju);
  // odvojen state da se "pogledajte preskočene stavke" ne pokazuje na prazno.
  const [izvozPreskoceni, setIzvozPreskoceni] = useState<BankExportPreskocen[]>(
    [],
  );
  // Zadnji izbor banke po organizaciji: server ga pamti na org-u
  // (bankExportBank), ref pokriva tekuću sesiju dok se org ne refetchuje.
  const izvozBankaByOrgRef = useRef<Record<number, string>>({});
  const izvozMutation = useMutation({
    mutationFn: async () => {
      const banka = IZVOZ_BANKE.find((b) => b.value === izvozBanka);
      if (!banka) throw new Error("Izaberite banku.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(izvozDatum)) {
        throw new Error("Upišite datum valute.");
      }
      const r = await bankExport({
        organizationId: orgId,
        year,
        month,
        datumValute: izvozDatum,
        profil: banka.profil,
        banka: banka.value,
      });
      if (!r.ok) {
        const pres = (r as { preskoceni?: BankExportPreskocen[] }).preskoceni;
        if (pres?.length) setIzvozPreskoceni(pres);
        throw new Error(IZVOZ_GRESKE[r.error] || r.error);
      }
      // Dekodiranje SVIH datoteka prije ijednog downloada: neispravan base64
      // (server bug) završi kao error state, a ne kao izuzetak POSLIJE
      // prikazanog "preuzeto". Raiffeisen se dijeli u više datoteka (vrsta i
      // svrha plaćanja se u bankarstvu biraju po paketu); odgovor bez liste
      // datoteka pada na staro jedno-datotečno ponašanje.
      const datoteke = r.data.datoteke?.length
        ? r.data.datoteke
        : [{ fileName: r.data.fileName, base64: r.data.base64 }];
      const blobovi = datoteke.map((d) => ({
        fileName: d.fileName,
        blob: new Blob(
          [Uint8Array.from(atob(d.base64), (c) => c.charCodeAt(0))],
          { type: "text/plain" },
        ),
      }));
      // Razmak između preuzimanja: preglednici odbace niz brzih uzastopnih
      // klikova (Safari zadrži samo zadnji), pa bi dio paketa tiho izostao.
      blobovi.forEach((b, i) => {
        if (i === 0) triggerBlobDownload(b.blob, b.fileName);
        else setTimeout(() => triggerBlobDownload(b.blob, b.fileName), i * 400);
      });
      return { data: r.data, banka: banka.value };
    },
    onMutate: () => {
      // novi pokušaj čisti prethodni rezultat da uspjeh i greška iz dva
      // pokušaja ne stoje na ekranu istovremeno
      setIzvozRezultat(null);
      setIzvozPreskoceni([]);
    },
    onSuccess: ({ data, banka }) => {
      setIzvozRezultat(data);
      setIzvozPreskoceni(data.preskoceni);
      if (orgId) izvozBankaByOrgRef.current[orgId] = banka;
    },
  });
  const openIzvoz = () => {
    const d = new Date();
    const danas = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    // Uvijek današnji datum (odluka vlasnika): datum valute u prošlosti banka
    // odbija, a i budući datum isplate zna biti stariji plan. Korisnik ga po
    // potrebi promijeni u modalu.
    setIzvozDatum(danas);
    const zapamcena =
      (orgId ? izvozBankaByOrgRef.current[orgId] : null) ??
      organization?.bankExportBank ??
      null;
    setIzvozBanka(
      zapamcena && IZVOZ_BANKE.some((b) => b.value === zapamcena)
        ? zapamcena
        : null,
    );
    setIzvozRezultat(null);
    setIzvozPreskoceni([]);
    izvozMutation.reset();
    setIzvozOpen(true);
  };

  // Agencijska opcija: objedini kantonalne uplatnice po kantonu (sve org-e).
  // Mijenja agregaciju na serveru, pa invalidiramo SVE monthlySummary upite
  // (pregled + Lista naloga koriste te podatke).
  const combineKantonalMutation = useMutation({
    mutationFn: (v: boolean) => unwrap(setCombineKantonal(v)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
    },
  });

  const payslipsMutation = useMutation({
    mutationFn: async () => {
      const r = await generateMonthlyPayslips(orgId, year, month, paymentDate);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: (r) => triggerBlobDownload(r.blob, r.filename),
  });

  // Nalog za knjiženje plate (za osobu zaduženu za knjiženje u agenciji).
  // Samo plate radnika; vlasnik obrta (Obrazac 2002) se ne knjiži ovdje.
  const postingOrderMutation = useMutation({
    mutationFn: async () => {
      const r = await generatePostingOrder(orgId, year, month, paymentDate);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: (r) => triggerBlobDownload(r.blob, r.filename),
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "";
      notify(
        msg === "NEMA_OBRACUNA_ZA_MJESEC"
          ? "Nema obračuna plata za ovaj mjesec."
          : msg === "NEMA_PLATA_RADNIKA"
            ? "Nema plata radnika za knjiženje (obrt sa samo vlasnikom)."
            : "Greška pri generisanju naloga za knjiženje.",
        "warning",
      );
    },
  });
  const [kontaOpen, setKontaOpen] = useState(false);

  // Bulk email — pošalje platni listić svakom radniku sa email-om u profilu.
  // Radnici bez email-a se preskaču (skipped lista) bez fail-a cijele akcije.
  const payslipsEmailMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Nedostaje organizacija");
      const r = await emailMonthlyPayslipsBulk(orgId, year, month, paymentDate);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: (r) => {
      // Sastavi notifikaciju sa rezimeom: koliko poslato + koliko preskočeno + lista skipped imena
      const parts: string[] = [];
      if (r.sent > 0) parts.push(`Poslano ${r.sent} listić(a)`);
      if (r.skipped.length > 0) {
        parts.push(
          `Preskočeno ${r.skipped.length} (bez email-a): ${r.skipped
            .map((s) => s.name)
            .join(", ")}`,
        );
      }
      if (r.failed.length > 0) {
        parts.push(`Greška za ${r.failed.length} radnika`);
      }
      notify(
        parts.join(" · "),
        r.failed.length > 0 ? "warning" : r.sent > 0 ? "success" : "info",
      );
    },
    onError: (e: Error) => {
      notify(`Greška pri slanju: ${e.message}`, "error");
    },
  });

  // "Sve na jedan email": svi listići mjeseca u jednom PDF-u na upisanu
  // adresu (npr. email firme, pa oni štampaju i uruče radnicima ručno).
  const [bundleEmailOpen, setBundleEmailOpen] = useState(false);
  const [bundleEmailAddr, setBundleEmailAddr] = useState("");
  const bundleEmailMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Nedostaje organizacija");
      const r = await emailMonthlyPayslipsBulk(
        orgId,
        year,
        month,
        paymentDate,
        bundleEmailAddr.trim(),
      );
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: (r) => {
      setBundleEmailOpen(false);
      notify(
        `Svi listići (${r.count ?? 0}) poslani u jednom PDF-u na ${r.sentTo}`,
        "success",
      );
    },
    onError: (e: Error) => {
      notify(
        e.message === "INVALID_EMAIL"
          ? "Upišite ispravnu email adresu."
          : `Greška pri slanju: ${e.message}`,
        "error",
      );
    },
  });

  const queryClientMP = useQueryClient();
  const markAllPaidMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Nedostaje organizacija");
      return unwrap(markMonthPaid({ organizationId: orgId, year, month }));
    },
    onSuccess: () => {
      queryClientMP.invalidateQueries({ queryKey: ["payrolls", orgId, year, month] });
      queryClientMP.invalidateQueries({ queryKey: ["monthlySummary", orgId, year, month] });
    },
  });

  // Obrazac 2001 — mjesečna specifikacija plata za Poreznu upravu FBiH.
  // Generiše se klijentski iz monthly summary podataka + organization info.
  // Podaci se sklapaju u shared builderu (obrasciSpecifikacije), isti kod
  // koristi i bulk preuzimanje na /organizacije.
  const obrazac2001Mutation = useMutation({
    mutationFn: async () => {
      if (!summaryQuery.data || !organization) {
        throw new Error("Nedostaju podaci o organizaciji ili obračunu");
      }
      const data = build2001Data({
        organization,
        radniciFbih,
        payrollByWorker,
        year,
        month,
        paymentDate,
      });
      const bytes = await fillObrazac2001Template(data);
      return {
        bytes,
        filename: `Obrazac-2001-${String(year)}-${String(month).padStart(2, "0")}.pdf`,
      };
    },
    onSuccess: ({ bytes, filename }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      triggerBlobDownload(blob, filename);
    },
  });

  // Obrazac 2001-A, specifikacija za radnike sa prebivalištem u RS. Isti
  // izračun kao 2001, ali samo RS radnici, uz redove "od čega u FBiH" (27a, 28a,
  // 30a). Zdravstvo 10,2% i nezaposlenost 30% ostaju u FBiH, ostatak ide u RS.
  const obrazac2001AMutation = useMutation({
    mutationFn: async () => {
      if (!summaryQuery.data || !organization) {
        throw new Error("Nedostaju podaci o organizaciji ili obračunu");
      }
      const data = build2001AData({
        organization,
        radniciRs,
        payrollByWorker,
        year,
        month,
        paymentDate,
      });
      const bytes = await fillObrazac2001ATemplate(data);
      return {
        bytes,
        filename: `Obrazac-2001-A-${String(year)}-${String(month).padStart(2, "0")}.pdf`,
      };
    },
    onSuccess: ({ bytes, filename }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      triggerBlobDownload(blob, filename);
    },
  });

  // Lista naloga za plaćanje — mjesečna rekapitulacija (doprinosi + plate) za banku.
  // Inspirisana klasičnim "Lista naloga" PDF-om iz starih programa za plate.
  const listaNalogaMutation = useMutation({
    mutationFn: async () => {
      if (!summaryQuery.data || !organization) {
        throw new Error("Nedostaju podaci o organizaciji ili obračunu");
      }
      const opcinaInfo = kantonForOpcina(organization.city || "");
      const data: ListaNalogaData = {
        organizationId: orgId,
        organization: {
          name: organization.name || "",
          taxNumber: organization.taxNumber,
          pdvNumber: organization.pdvNumber,
          address: organization.address,
          city: organization.city,
          bankAccount: organization.bankAccount,
          activityCode: organization.activityCode,
        },
        year,
        month,
        opcinaFirmeKod: opcinaInfo?.opcinaKod || "",
        uplatnice: summaryQuery.data.uplatnice.map((u) => ({
          type: u.type,
          label: u.label,
          amount: u.amount,
          account: u.account,
          vrstaPrihoda: u.vrstaPrihoda,
          budgetOrg: u.budgetOrg,
          primalac: u.primalac,
          opcinaIme: u.opcinaIme,
          opcinaKod: u.opcinaKod,
          group: u.group,
        })),
        perWorker: summaryQuery.data.perWorker.map((p) => ({
          workerName: p.workerName,
          bankAccount: p.bankAccount,
          net: p.net,
          mealAllowance: p.mealAllowance,
          vacationBonus: p.vacationBonus,
          travelExpense: p.travelExpense,
        })),
      };
      const bytes = await fillListaNaloga(data);
      const mm = String(month).padStart(2, "0");
      return {
        bytes,
        filename: `Lista-naloga-${year}-${mm}.pdf`,
      };
    },
    onSuccess: ({ bytes, filename }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      triggerBlobDownload(blob, filename);
    },
  });

  // Specifikacije po radniku — neto plate / topli obrok / putni / regres,
  // sve u jednom PDF-u sa sekcijama (samo one koje imaju iznose).
  // Lista jedinstvenih banaka iz perWorker (ekstrahovano po prefiksu računa).
  // Koristi se za "Specifikacije po banci" dropdown.
  const banksInPayroll = useMemo(() => {
    if (!summaryQuery.data) return [] as Array<{
      prefix: string;
      name: string;
      count: number;
    }>;
    const map = new Map<string, { name: string; count: number }>();
    for (const w of summaryQuery.data.perWorker) {
      if (!w.bankAccount) continue;
      // Preskoči radnike bez ijednog iznosa (npr. obrt vlasnik — ide preko
      // Obrazac 2002, sve neto/topli/regres/putni su 0).
      const hasAny =
        (w.net || 0) > 0 ||
        (w.mealAllowance || 0) > 0 ||
        (w.vacationBonus || 0) > 0 ||
        (w.travelExpense || 0) > 0;
      if (!hasAny) continue;
      const prefix = w.bankAccount.replace(/\D/g, "").slice(0, 3);
      if (!prefix) continue;
      if (!map.has(prefix)) {
        map.set(prefix, {
          name: bankFromAccount(w.bankAccount),
          count: 0,
        });
      }
      map.get(prefix)!.count += 1;
    }
    return Array.from(map.entries())
      .map(([prefix, info]) => ({ prefix, ...info }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [summaryQuery.data]);

  const specifikacijeMutation = useMutation({
    mutationFn: async (bankPrefix: string | null) => {
      if (!summaryQuery.data || !organization) {
        throw new Error("Nedostaju podaci o organizaciji ili obračunu");
      }
      const allPerWorker = summaryQuery.data.perWorker;
      const filtered = bankPrefix
        ? allPerWorker.filter((p) => {
            const pref = (p.bankAccount || "").replace(/\D/g, "").slice(0, 3);
            return pref === bankPrefix;
          })
        : allPerWorker;
      if (filtered.length === 0) {
        throw new Error("Nema radnika za odabranu banku");
      }
      const data: SpecifikacijeData = {
        organizationId: orgId,
        organization: {
          name: organization.name || "",
          taxNumber: organization.taxNumber,
          pdvNumber: organization.pdvNumber,
          address: organization.address,
          city: organization.city,
          bankAccount: organization.bankAccount,
          activityCode: organization.activityCode,
        },
        year,
        month,
        perWorker: filtered.map((p) => ({
          workerName: p.workerName,
          bankAccount: p.bankAccount,
          net: p.net,
          mealAllowance: p.mealAllowance,
          vacationBonus: p.vacationBonus,
          travelExpense: p.travelExpense,
        })),
      };
      const bytes = await fillSpecifikacije(data);
      const mm = String(month).padStart(2, "0");
      const bankSuffix = bankPrefix
        ? `-${(banksInPayroll.find((b) => b.prefix === bankPrefix)?.name || "banka")
            .replace(/[^a-zA-Z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")}`
        : "";
      return {
        bytes,
        filename: `Specifikacije-${year}-${mm}${bankSuffix}.pdf`,
      };
    },
    onSuccess: ({ bytes, filename }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      triggerBlobDownload(blob, filename);
    },
  });
  const [bankMenuOpen, setBankMenuOpen] = useState(false);
  const bankMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!bankMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        bankMenuRef.current &&
        !bankMenuRef.current.contains(e.target as Node)
      ) {
        setBankMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bankMenuOpen]);

  // Split-button dropdown za "Nalog za knjiženje" (caret → Podesi konta).
  const [nalogMenuOpen, setNalogMenuOpen] = useState(false);
  const nalogMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!nalogMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        nalogMenuRef.current &&
        !nalogMenuRef.current.contains(e.target as Node)
      ) {
        setNalogMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [nalogMenuOpen]);

  // Email split-button dropdown — koristi se za "Pošalji listiće emailom":
  // veliki button šalje svima, mali dropdown chevron otvori listu radnika
  // gdje user može poslati pojedinačno samo jednom radniku.
  const [emailMenuOpen, setEmailMenuOpen] = useState(false);
  const [singleEmailPendingId, setSingleEmailPendingId] = useState<number | null>(null);
  const emailMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!emailMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        emailMenuRef.current &&
        !emailMenuRef.current.contains(e.target as Node)
      ) {
        setEmailMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emailMenuOpen]);

  // Pošalji pojedinačnom radniku iz dropdown menija.
  const sendPayslipToWorker = async (workerId: number, payrollId: number) => {
    setSingleEmailPendingId(workerId);
    try {
      const r = await emailWorkerPayslip(payrollId, paymentDate);
      const w = radnici.find((x) => x.id === workerId);
      const name = w ? `${w.firstName} ${w.lastName}`.trim() : "radnik";
      if (r.ok) {
        notify(`Platni listić poslan na ${r.sentTo} (${name})`, "success");
      } else {
        notify(
          r.error === "WORKER_NO_EMAIL"
            ? `${name} nema upisan email`
            : `Greška za ${name}: ${r.error}`,
          "error",
        );
      }
    } finally {
      setSingleEmailPendingId(null);
    }
  };

  // MIP-1023 — mjesečni izvještaj o isplaćenim plaćama za PUFBiH (XML kroz nPIS,
  // PDF za štampu). Generiše se klijentski iz payroll-a radnika + organizacije.
  // Za sada: prvi list (max 5 radnika). Multi-page će biti dodano u sljedećoj iteraciji.
  const mip1023Mutation = useMutation({
    mutationFn: async () => {
      if (!summaryQuery.data || !organization) {
        throw new Error("Nedostaju podaci o organizaciji ili obračunu");
      }
      const mm = String(month).padStart(2, "0");
      const yyyy = String(year);
      const fmt2 = (n: number) =>
        n.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      // MIP obuhvata radnike (vlasnici idu posebno — za obrt nije u MIP-u).
      // Za d.o.o. vlasnik je već u radnici listi (mješa se sa radnicima).
      // Sortiranje: po datumu prijave uzlazno (stariji radnik prvi). Ako
      // nema prijavaDate, fallback je startDate.
      const radniciPayrolls = radnici
        .map((w) => ({ w, p: payrollByWorker.get(w.id) }))
        .filter(
          (x): x is { w: Worker; p: Payroll } => !!x.p && x.p.gross > 0,
        )
        .sort((a, b) => {
          const aDate = a.w.prijavaDate || a.w.startDate || "9999-12-31";
          const bDate = b.w.prijavaDate || b.w.startDate || "9999-12-31";
          return aDate.localeCompare(bDate);
        });

      const t = {
        gross: radniciPayrolls.reduce((a, x) => a + (x.p.gross || 0), 0),
        empContrib: radniciPayrolls.reduce(
          (a, x) => a + (x.p.empTotal || 0),
          0,
        ),
        licniOdbitak: radniciPayrolls.reduce(
          (a, x) => a + (x.p.deduction || 0),
          0,
        ),
        tax: radniciPayrolls.reduce((a, x) => a + (x.p.incomeTax || 0), 0),
        erpPio: radniciPayrolls.reduce((a, x) => a + (x.p.erpPio || 0), 0),
        erpZdr: radniciPayrolls.reduce(
          (a, x) => a + (x.p.erpZdravstvo || 0),
          0,
        ),
        erpNezap: radniciPayrolls.reduce(
          (a, x) => a + (x.p.erpNezaposlenost || 0),
          0,
        ),
      };

      const datumIsplate = (() => {
        const d = new Date(paymentDate);
        if (Number.isNaN(d.getTime())) return "";
        return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}.`;
      })();

      // Multi-page: fillMip1023Template sam dijeli na liste po 5 radnika
      // i generiše dodatne stranice ako je više od 5.
      const rows: Mip1023Row[] = radniciPayrolls.map(({ w, p }) => {
        // p.gross je UKUPNA osnovica (plata + korist u naravi). Za MIP: bruto =
        // plata u novcu (gross - korist), koristi = bruto korist, ukupanPrihod = gross.
        const koristi = Number(p.koristBruto) || 0;
        const bruto = +((Number(p.gross) || 0) - koristi).toFixed(2);
        const ukupanPrihod = +(bruto + koristi).toFixed(2);
        const empPio = Number(p.empPio) || 0;
        const empZdr = Number(p.empZdravstvo) || 0;
        const empNezap = Number(p.empNezaposlenost) || 0;
        const empUkupno = empPio + empZdr + empNezap;
        const prihodUmanjen = ukupanPrihod - empUkupno;
        const faktor = Number(p.taxCoefficient ?? 1);
        const iznosOdbitka = Number(p.deduction) || faktor * 300;
        const osnovicaPoreza = Math.max(0, prihodUmanjen - iznosOdbitka);
        const iznosPoreza = osnovicaPoreza * 0.1;
        const radniSati = p.workedMinutes
          ? Math.round((p.workedMinutes / 60) * 100) / 100
          : 168;
        const bolovanjeSati = (p.sickDays || 0) * 8;
        // Šifra općine: RS radnik nema FBiH prebivalište, pa ide općina
        // sjedišta poslodavca; ostali iz mjesta prebivališta radnika.
        const opcinaKod =
          w.prebivalisteEntitet === "RS"
            ? kantonForOpcina(organization?.city || "")?.opcinaKod || ""
            : kantonForOpcina(w.city || "")?.opcinaKod || "";

        return {
          vrstaIsplate: "1",
          jmb: w.jmbg || "",
          opcina: opcinaKod,
          datumIsplate,
          brojRadnihSati: String(radniSati),
          brojRadnihSatiBolovanje: String(bolovanjeSati),
          brutoPlaca: fmt2(bruto),
          koristi: fmt2(koristi),
          ukupanPrihod: fmt2(ukupanPrihod),
          pioDoprinos: fmt2(empPio),
          imePrezime: `${w.firstName} ${w.lastName}`.trim(),
          zdrDoprinos: fmt2(empZdr),
          nezapDoprinos: fmt2(empNezap),
          ukupanDoprinos: fmt2(empUkupno),
          prihodUmanjen: fmt2(prihodUmanjen),
          faktorOdbitka: faktor.toFixed(1),
          iznosOdbitka: fmt2(iznosOdbitka),
          osnovicaPoreza: fmt2(osnovicaPoreza),
          iznosPoreza: fmt2(iznosPoreza),
          satiUvecaniStaz: "0",
          stepenUvecanja: "00",
          sifraRadnogMjesta: "0",
          doprinosPioStaz: "0,00",
        };
      });

      const data: Mip1023Data = {
        organizationId: orgId,
        jib: (organization.taxNumber || "").replace(/\D/g, ""),
        naziv: organization.name || "",
        sifraDjelatnosti: organization.activityCode || "",
        brojZaposlenih: String(radniciPayrolls.length),
        mjesec: mm,
        godinaSuffix: yyyy.slice(-2),
        ukupanPrihod: fmt2(t.gross),
        ukupanDoprinos: fmt2(t.empContrib),
        ukupanLicniOdbitak: fmt2(t.licniOdbitak),
        ukupanPorez: fmt2(t.tax),
        poslodavacPio: fmt2(t.erpPio),
        poslodavacZdr: fmt2(t.erpZdr),
        poslodavacNezap: fmt2(t.erpNezap),
        poslodavacDodatniZdr: "0,00",
        datumPotpisa: datumIsplate,
        rows,
      };

      const bytes = await fillMip1023Template(data);
      return { bytes, filename: `MIP-1023-${yyyy}-${mm}.pdf` };
    },
    onSuccess: ({ bytes, filename }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      triggerBlobDownload(blob, filename);
    },
  });

  // MIP-1023 XML — paketni uvoz u nPIS. Jedan XML po mjesecu, svi radnici
  // unutar Dio2, zbirno u Dio3. Dijeli isti payment date i sort logic kao PDF.
  const mip1023XmlMutation = useMutation({
    mutationFn: async () => {
      if (!summaryQuery.data || !organization) {
        throw new Error("Nedostaju podaci o organizaciji ili obračunu");
      }
      const mm = String(month).padStart(2, "0");
      const yyyy = String(year);

      const radniciPayrolls = radnici
        .map((w) => ({ w, p: payrollByWorker.get(w.id) }))
        .filter(
          (x): x is { w: Worker; p: Payroll } => !!x.p && x.p.gross > 0,
        )
        .sort((a, b) => {
          const aDate = a.w.prijavaDate || a.w.startDate || "9999-12-31";
          const bDate = b.w.prijavaDate || b.w.startDate || "9999-12-31";
          return aDate.localeCompare(bDate);
        });

      if (radniciPayrolls.length === 0) {
        throw new Error("Nema obračunatih plata za mjesec");
      }

      const workers: Mip1023XmlWorker[] = radniciPayrolls.map(({ w, p }) => {
        // p.gross = plata + korist u naravi. Bruto = plata u novcu, koristi =
        // bruto korist, ukupanPrihod = gross.
        const koristi = Number(p.koristBruto) || 0;
        const bruto = +((Number(p.gross) || 0) - koristi).toFixed(2);
        const ukupanPrihod = +(bruto + koristi).toFixed(2);
        const empPio = Number(p.empPio) || 0;
        const empZdr = Number(p.empZdravstvo) || 0;
        const empNezap = Number(p.empNezaposlenost) || 0;
        const empUkupno = empPio + empZdr + empNezap;
        const prihodUmanjen = ukupanPrihod - empUkupno;
        const faktor = Number(p.taxCoefficient ?? 1);
        const iznosOdbitka = Number(p.deduction) || faktor * 300;
        const osnovicaPoreza = Math.max(0, prihodUmanjen - iznosOdbitka);
        const iznosPoreza = Number(p.incomeTax) || osnovicaPoreza * 0.1;
        const radniSati = p.workedMinutes
          ? Math.round((p.workedMinutes / 60) * 100) / 100
          : 168;
        const bolovanjeSati = (p.sickDays || 0) * 8;
        // RS radnik: šifra općine ide sjedište poslodavca (nema FBiH prebivalište).
        const opcinaKod =
          w.prebivalisteEntitet === "RS"
            ? kantonForOpcina(organization?.city || "")?.opcinaKod || ""
            : kantonForOpcina(w.city || "")?.opcinaKod || "";
        return {
          vrstaIsplate: "1",
          jmb: w.jmbg || "",
          imePrezime: `${w.lastName} ${w.firstName}`.trim().toUpperCase(),
          datumIsplate: paymentDate, // YYYY-MM-DD već iz DateInput-a
          radniSati,
          radniSatiBolovanje: bolovanjeSati,
          bruto,
          koristi,
          ukupanPrihod,
          pio: empPio,
          zo: empZdr,
          nezap: empNezap,
          doprinosi: empUkupno,
          prihodUmanjen,
          faktor,
          iznosOdbitka,
          osnovicaPoreza,
          iznosPoreza,
          radniSatiUT: 0,
          stepenUvecanja: 0,
          sifraRadnogMjestaUT: "000000",
          doprinosiPioMioZaUT: 0,
          beneficiraniStaz: false,
          opcinaPrebivalista: opcinaKod,
        };
      });

      const t = {
        gross: radniciPayrolls.reduce((a, x) => a + (x.p.gross || 0), 0),
        empContrib: radniciPayrolls.reduce(
          (a, x) => a + (x.p.empTotal || 0),
          0,
        ),
        licniOdbitak: radniciPayrolls.reduce(
          (a, x) => a + (x.p.deduction || 0),
          0,
        ),
        tax: radniciPayrolls.reduce((a, x) => a + (x.p.incomeTax || 0), 0),
        erpPio: radniciPayrolls.reduce((a, x) => a + (x.p.erpPio || 0), 0),
        erpZdr: radniciPayrolls.reduce(
          (a, x) => a + (x.p.erpZdravstvo || 0),
          0,
        ),
        erpNezap: radniciPayrolls.reduce(
          (a, x) => a + (x.p.erpNezaposlenost || 0),
          0,
        ),
      };

      // Period: prvi do zadnji dan obračunskog mjeseca.
      const lastDay = new Date(year, month, 0).getDate();
      const periodOd = `${yyyy}-${mm}-01`;
      const periodDo = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const xmlData: Mip1023XmlData = {
        jibPoslodavca: (organization.taxNumber || "").replace(/\D/g, ""),
        nazivPoslodavca: organization.name || "",
        brojZahtjeva: 1,
        datumPodnosenja: todayIso,
        sifraDjelatnosti: organization.activityCode || "",
        periodOd,
        periodDo,
        workers,
        zbirno: {
          pio: t.erpPio,
          zo: t.erpZdr,
          nezap: t.erpNezap,
          dodatniDoprinosiZo: 0,
          prihod: t.gross,
          doprinosi: t.empContrib,
          licniOdbici: t.licniOdbitak,
          porez: t.tax,
        },
      };

      const xml = generateMip1023Xml(xmlData);
      // statistika generisanja (admin Aktivnost); best-effort, ne blokira
      trackEvent("MIP_GENERATE", "MIP-1023 XML", orgId);
      const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
      const jib = xmlData.jibPoslodavca || "MIP";
      return { blob, filename: `${jib}_${mm}${yyyy}.xml` };
    },
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename);
      // XML se generiše client-side pa backend sam ne vidi download; oznaka
      // "MIP preuzet" se čita iz payrolls.mipDownloadedAt.
      markMipDownloaded({ organizationId: orgId, year, month }).then(() => {
        queryClient.invalidateQueries({
          queryKey: ["payrolls", orgId, year, month],
        });
      });
    },
  });

  // GIP-1022 — godišnji izvještaj o ukupno isplaćenim plaćama. Jedan PDF/XML
  // po radniku za cijelu godinu. Mjesec u UI-ju nije relevantan — koristi se
  // samo godina iz selektora.
  //
  // Struktura: raw builder dohvati podatke i izračuna brojeve, a PDF i XML
  // formateri dijele isti raw output (samo različita prezentacija).

  type GipRawRow = {
    mjesec: number;
    iznosNovac: number;
    iznosStvari: number;
    bruto: number;
    pio: number;
    zdr: number;
    nezap: number;
    ukupniDopr: number;
    placaBezDopr: number;
    faktor: number;
    iznosOdbitka: number;
    osnovicaPoreza: number;
    iznosPoreza: number;
    neto: number;
    datumUplateIso: string; // YYYY-MM-DD
  };

  type GipRawObrazac = {
    worker: Worker;
    rows: GipRawRow[];
    ukupno: Omit<GipRawRow, "mjesec" | "faktor" | "datumUplateIso">;
  };

  const buildGip1022Raw = useCallback(async (): Promise<GipRawObrazac[]> => {
    if (!organization) throw new Error("Nedostaje organizacija");

    // Fetch svih radnika org-a + sve 12 mjeseci payrolla paralelno.
    const [workersResp, ...monthsResp] = await Promise.all([
      getWorkers(orgId),
      ...Array.from({ length: 12 }, (_, i) => listPayrolls(orgId, year, i + 1)),
    ]);
    if (!workersResp.ok) throw new Error(workersResp.error);
    const allWorkers = workersResp.data;

    const byWorker = new Map<number, Payroll[]>();
    for (let m = 0; m < 12; m++) {
      const r = monthsResp[m];
      if (!r.ok) continue;
      for (const p of r.data) {
        if (!byWorker.has(p.workerId)) byWorker.set(p.workerId, []);
        byWorker.get(p.workerId)!.push(p);
      }
    }
    for (const arr of byWorker.values()) arr.sort((a, b) => a.month - b.month);

    // Datum uplate: stvarni paymentDate iz payroll-a (datum isplate koji user
    // unese), fallback posljednji dan mjeseca ako nije postavljen.
    const lastDayIso = (y: number, m: number) => {
      const last = new Date(y, m, 0).getDate();
      return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    };

    const out: GipRawObrazac[] = [];
    const isObrt = organization.type === "BUSINESS";

    for (const w of allWorkers) {
      if (isObrt && w.role === "VLASNIK") continue;
      const payrolls = byWorker.get(w.id);
      if (!payrolls || payrolls.length === 0) continue;
      if (!payrolls.some((p) => Number(p.gross) > 0)) continue;

      const rows: GipRawRow[] = payrolls
        .filter((p) => Number(p.gross) > 0)
        .map((p) => {
          // p.gross = plata + korist u naravi. Za GIP: iznos u novcu = plata,
          // iznos u stvarima = korist, ukupan/bruto = gross.
          const koristi = Number(p.koristBruto) || 0;
          const ukupanPrihod = Number(p.gross) || 0;
          const brutoNovac = +(ukupanPrihod - koristi).toFixed(2);
          const empPio = Number(p.empPio) || 0;
          const empZdr = Number(p.empZdravstvo) || 0;
          const empNezap = Number(p.empNezaposlenost) || 0;
          const empUkupno = empPio + empZdr + empNezap;
          const placaBezDopr = ukupanPrihod - empUkupno;
          const faktor = Number(p.taxCoefficient ?? 1);
          const iznosOdbitka = Number(p.deduction) || faktor * 300;
          const osnovicaPoreza = Math.max(0, placaBezDopr - iznosOdbitka);
          const iznosPoreza = Number(p.incomeTax) || osnovicaPoreza * 0.1;
          const neto = Number(p.net) || 0;
          return {
            mjesec: p.month,
            iznosNovac: brutoNovac,
            iznosStvari: koristi,
            bruto: ukupanPrihod,
            pio: empPio,
            zdr: empZdr,
            nezap: empNezap,
            ukupniDopr: empUkupno,
            placaBezDopr,
            faktor,
            iznosOdbitka,
            osnovicaPoreza,
            iznosPoreza,
            neto,
            datumUplateIso:
              (p.paymentDate ? String(p.paymentDate).slice(0, 10) : "") ||
              lastDayIso(year, p.month),
          };
        });

      if (rows.length === 0) continue;

      const sum = (key: keyof Omit<GipRawRow, "mjesec" | "datumUplateIso">) =>
        rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);

      out.push({
        worker: w,
        rows,
        ukupno: {
          iznosNovac: sum("iznosNovac"),
          iznosStvari: sum("iznosStvari"),
          bruto: sum("bruto"),
          pio: sum("pio"),
          zdr: sum("zdr"),
          nezap: sum("nezap"),
          ukupniDopr: sum("ukupniDopr"),
          placaBezDopr: sum("placaBezDopr"),
          iznosOdbitka: sum("iznosOdbitka"),
          osnovicaPoreza: sum("osnovicaPoreza"),
          iznosPoreza: sum("iznosPoreza"),
          neto: sum("neto"),
        },
      });
    }

    if (out.length === 0) {
      throw new Error("Nema obračunatih plata za odabranu godinu");
    }
    return out;
  }, [organization, orgId, year]);

  const buildGip1022Pdfs = useCallback(async (): Promise<
    Array<{ safeName: string; bytes: Uint8Array }>
  > => {
    if (!organization) throw new Error("Nedostaje organizacija");
    const yyyy = String(year);
    const fmt2 = (n: number) =>
      n.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const isoToDdmmyyyy = (iso: string) => {
      const [y, m, d] = iso.split("-");
      return `${d}.${m}.${y}.`;
    };
    const adresaSjedista = [organization.address, organization.city]
      .filter(Boolean)
      .join(", ");
    const raw = await buildGip1022Raw();

    const out: Array<{ safeName: string; bytes: Uint8Array }> = [];
    for (const { worker: w, rows: rawRows, ukupno: rawUk } of raw) {
      const rows: Gip1022Row[] = rawRows.map((r) => ({
        mjesec: r.mjesec,
        isplataZaMjesec: `${String(r.mjesec).padStart(2, "0")}/${yyyy}`,
        vrstaIsplate: "1",
        iznosNovac: fmt2(r.iznosNovac),
        iznosStvari: fmt2(r.iznosStvari),
        bruto: fmt2(r.bruto),
        pio: fmt2(r.pio),
        zdr: fmt2(r.zdr),
        nezap: fmt2(r.nezap),
        ukupniDopr: fmt2(r.ukupniDopr),
        placaBezDopr: fmt2(r.placaBezDopr),
        faktor: r.faktor.toFixed(1),
        iznosOdbitka: fmt2(r.iznosOdbitka),
        osnovicaPoreza: fmt2(r.osnovicaPoreza),
        iznosPoreza: fmt2(r.iznosPoreza),
        neto: fmt2(r.neto),
        datumUplate: isoToDdmmyyyy(r.datumUplateIso),
      }));

      const ukupno = {
        iznosNovac: fmt2(rawUk.iznosNovac),
        iznosStvari: fmt2(rawUk.iznosStvari),
        bruto: fmt2(rawUk.bruto),
        pio: fmt2(rawUk.pio),
        zdr: fmt2(rawUk.zdr),
        nezap: fmt2(rawUk.nezap),
        ukupniDopr: fmt2(rawUk.ukupniDopr),
        placaBezDopr: fmt2(rawUk.placaBezDopr),
        faktor: "",
        iznosOdbitka: fmt2(rawUk.iznosOdbitka),
        osnovicaPoreza: fmt2(rawUk.osnovicaPoreza),
        iznosPoreza: fmt2(rawUk.iznosPoreza),
        neto: fmt2(rawUk.neto),
      };

      const adresaPrebivalista = [w.address, w.city]
        .filter(Boolean)
        .join(", ");

      const data: Gip1022Data = {
        organizationId: orgId,
        jib: (organization.taxNumber || "").replace(/\D/g, ""),
        naziv: organization.name || "",
        adresaSjedista,
        jmbZaposlenika: w.jmbg || "",
        prezimeIme: `${w.lastName} ${w.firstName}`.trim(),
        adresaPrebivalista,
        godinaSuffix: yyyy.slice(-2),
        datumPotpisa: isoToDdmmyyyy(`${year}-12-31`),
        rows,
        ukupno,
      };

      const bytes = await fillGip1022Template(data);
      const safeName = `${w.lastName}_${w.firstName}`
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      out.push({ safeName, bytes });
    }
    return out;
  }, [organization, year, buildGip1022Raw]);

  // GIP-1022 — kombinovani PDF (sve radnike u jednom fajlu, za lakšu štampu).
  const gip1022PdfMutation = useMutation({
    mutationFn: async () => {
      const items = await buildGip1022Pdfs();
      // Merge svih PDF-ova u jedan dokument.
      const { PDFDocument } = await import("pdf-lib");
      const finalDoc = await PDFDocument.create();
      for (const { bytes } of items) {
        const src = await PDFDocument.load(bytes);
        const pages = await finalDoc.copyPages(src, src.getPageIndices());
        for (const p of pages) finalDoc.addPage(p);
      }
      const finalBytes = await finalDoc.save();
      const blob = new Blob([new Uint8Array(finalBytes)], {
        type: "application/pdf",
      });
      return { blob, filename: `GIP-1022-${year}.pdf` };
    },
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename);
    },
  });

  // GIP-1022 — ZIP (zaseban PDF po radniku).
  const gip1022Mutation = useMutation({
    mutationFn: async () => {
      const items = await buildGip1022Pdfs();
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const { safeName, bytes } of items) {
        zip.file(`GIP-1022_${safeName}_${year}.pdf`, bytes);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      return { blob, filename: `GIP-1022-${year}.zip` };
    },
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename);
    },
  });

  // GIP-1022 — XML za paketni uvoz u nPIS (svi radnici u jednom XML-u).
  const gip1022XmlMutation = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error("Nedostaje organizacija");
      const raw = await buildGip1022Raw();
      const adresaSjedista = [organization.address, organization.city]
        .filter(Boolean)
        .join(", ");
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const obrasci: Gip1022XmlObrazac[] = raw.map(({ worker: w, rows, ukupno }) => {
        const xmlRows: Gip1022XmlRow[] = rows.map((r) => ({
          mjesec: r.mjesec,
          isplataZaMjesec: `${r.mjesec}/${year}`,
          vrstaIsplate: "1",
          iznosNovac: r.iznosNovac,
          iznosStvari: r.iznosStvari,
          bruto: r.bruto,
          pio: r.pio,
          zdr: r.zdr,
          nezap: r.nezap,
          ukupniDopr: r.ukupniDopr,
          placaBezDopr: r.placaBezDopr,
          faktor: r.faktor,
          iznosOdbitka: r.iznosOdbitka,
          osnovicaPoreza: r.osnovicaPoreza,
          iznosPoreza: r.iznosPoreza,
          neto: r.neto,
          datumUplate: r.datumUplateIso,
        }));
        const adresaPrebivalista = [w.address, w.city]
          .filter(Boolean)
          .join(", ");
        return {
          naziv: organization.name || "",
          adresaSjedista,
          jmbZaposlenika: w.jmbg || "",
          imeIPrezime: `${w.lastName} ${w.firstName}`.trim().toUpperCase(),
          adresaPrebivalista,
          poreznaGodina: year,
          rows: xmlRows,
          ukupno,
        };
      });

      const xmlData: Gip1022XmlData = {
        jibPoslodavca: (organization.taxNumber || "").replace(/\D/g, ""),
        nazivPoslodavca: organization.name || "",
        brojZahtjeva: 1,
        datumPodnosenja: todayIso,
        obrasci,
      };

      const xml = generateGip1022Xml(xmlData);
      const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
      const jib = xmlData.jibPoslodavca || "GIP";
      return { blob, filename: `${jib}_1022_${year}.xml` };
    },
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename);
    },
  });

  if (summaryQuery.isLoading) {
    return (
      <div className={styles.empty} style={{ marginTop: "1.5rem" }}>
        Učitavam mjesečni pregled…
      </div>
    );
  }

  const s = summaryQuery.data;
  if (!s) return null;

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2
        style={{
          fontFamily: "DM Serif Display, serif",
          fontSize: "1.4rem",
          margin: "0 0 0.5rem",
        }}
      >
        Pregled mjeseca, {MONTHS[month - 1]} {year}
      </h2>
      <p className={styles.muted} style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>
        Doprinosi i porezi se uplaćuju zbirno za sve radnike u jednoj uplatnici po vrsti.
        Neto plata, topli obrok i putni trošak idu odvojeno svakom radniku.
      </p>

      <div className={styles.summary} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Bruto ukupno</span>
          <span className={styles.summaryValue}>{fmtKM(s.totals.gross)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Neto za isplatu</span>
          <span className={styles.summaryValue}>{fmtKM(s.totals.net)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Topli obrok</span>
          <span className={styles.summaryValue}>{fmtKM(s.totals.meal)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Regres</span>
          <span className={styles.summaryValue}>{fmtKM(s.totals.vacation)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Putni trošak</span>
          <span className={styles.summaryValue}>{fmtKM(s.totals.travel)} KM</span>
        </div>
        {organization?.type !== "BUSINESS" && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Fond invalida</span>
            <span className={styles.summaryValue}>{fmtKM(s.totals.invalidi)} KM</span>
          </div>
        )}
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Ukupan trošak poslodavca</span>
          <span className={styles.summaryValue} style={{ color: "#b91c1c" }}>
            {fmtKM(s.totals.totalCost)} KM
          </span>
        </div>
      </div>

      {/* Zbirne uplatnice (doprinosi i porezi), jedna po vrsti */}
      <div className={styles.subsectionTitle}>
        Zbirne uplatnice, doprinosi i porezi
      </div>
      <FadePreviewList
        cards={s.uplatnice.map((u: MonthlyUplatnicaSummary, i: number) => {
          // Group header: pokaži kad je ovaj entry prvi u svojoj grupi
          // (vlasnik / radnici). Samo za obrt sa razdvojenim grupama.
          const prevGroup = i > 0 ? s.uplatnice[i - 1].group : null;
          const showHeader = u.group && u.group !== prevGroup;
          return (
            <div key={`${u.type}-${u.opcinaKod || ""}-${i}`} style={{ display: "contents" }}>
              {showHeader && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--sage)",
                    padding: "0.5rem 0 0.25rem",
                    marginTop: i === 0 ? 0 : "0.5rem",
                  }}
                >
                  {u.group === "vlasnik"
                    ? "Uplatnice vlasnika"
                    : "Uplatnice radnika"}
                </div>
              )}
              <div className={styles.uplCard}>
                <span className={styles.uplCardNum}>{i + 1}</span>
                <div className={styles.uplCardBody}>
                  <div className={styles.uplCardTitle}>{u.label}</div>
                  <div className={styles.uplCardSub}>
                    {u.account || "–"}
                    {Array.isArray(u.primalac) && u.primalac.length
                      ? ` · ${u.primalac.join(" · ")}`
                      : ""}
                    {` · Vrsta prihoda: ${u.vrstaPrihoda || "–"}`}
                    {` · Budžetska org.: ${u.budgetOrg || "0000000"}`}
                  </div>
                </div>
                <span className={styles.uplCardIznos}>{fmtKM(u.amount)} KM</span>
              </div>
            </div>
          );
        })}
      />

      <div className={styles.totalCostRow}>
        <span className={styles.totalCostLabel}>Zbir doprinosa i poreza</span>
        <span className={styles.totalCostValue}>
          {fmtKM(s.uplatnice.reduce((acc, u) => acc + (u.amount || 0), 0))} KM
        </span>
      </div>

      {/* Per-worker uplatnice, neto plata + dodaci (idu pojedinačno radnicima) */}
      {s.perWorker && s.perWorker.length > 0 && (
        <>
          <div className={styles.subsectionTitle}>
            Uplate radnicima, neto plate i dodaci
          </div>
          {(() => {
            const cards = s.perWorker.flatMap((w, idx) => {
              const items: React.ReactNode[] = [];
              if (w.net > 0) {
                items.push(
                  <div key={`${w.workerId}-net`} className={styles.uplCard}>
                    <span className={styles.uplCardWorker}>{w.workerName}</span>
                    <div className={styles.uplCardBody}>
                      <div className={styles.uplCardTitle}>Neto plata</div>
                      <div className={styles.uplCardSub}>
                        {w.bankAccount || "Žiro račun nije unesen za radnika"}
                      </div>
                    </div>
                    <span className={styles.uplCardIznos}>{fmtKM(w.net)} KM</span>
                  </div>,
                );
              }
              if (w.mealAllowance > 0) {
                items.push(
                  <div key={`${w.workerId}-meal`} className={styles.uplCard}>
                    <span className={styles.uplCardWorker}>{w.workerName}</span>
                    <div className={styles.uplCardBody}>
                      <div className={styles.uplCardTitle}>Topli obrok</div>
                      <div className={styles.uplCardSub}>
                        {w.bankAccount || "–"}
                      </div>
                    </div>
                    <span className={styles.uplCardIznos}>{fmtKM(w.mealAllowance)} KM</span>
                  </div>,
                );
              }
              if (w.vacationBonus > 0) {
                items.push(
                  <div key={`${w.workerId}-vac`} className={styles.uplCard}>
                    <span className={styles.uplCardWorker}>{w.workerName}</span>
                    <div className={styles.uplCardBody}>
                      <div className={styles.uplCardTitle}>Regres</div>
                      <div className={styles.uplCardSub}>
                        {w.bankAccount || "–"}
                      </div>
                    </div>
                    <span className={styles.uplCardIznos}>{fmtKM(w.vacationBonus)} KM</span>
                  </div>,
                );
              }
              if (w.travelExpense > 0) {
                items.push(
                  <div key={`${w.workerId}-tr`} className={styles.uplCard}>
                    <span className={styles.uplCardWorker}>{w.workerName}</span>
                    <div className={styles.uplCardBody}>
                      <div className={styles.uplCardTitle}>Putni trošak</div>
                      <div className={styles.uplCardSub}>
                        {w.bankAccount || "–"}
                      </div>
                    </div>
                    <span className={styles.uplCardIznos}>{fmtKM(w.travelExpense)} KM</span>
                  </div>,
                );
              }
              return items;
            });
            return <FadePreviewList cards={cards} />;
          })()}

          <div className={styles.totalCostRow}>
            <span className={styles.totalCostLabel}>Zbir isplata radnicima</span>
            <span className={styles.totalCostValue}>
              {fmtKM(
                s.totals.net +
                  s.totals.meal +
                  s.totals.vacation +
                  s.totals.travel,
              )}{" "}
              KM
            </span>
          </div>
        </>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        <div className={js3Styles.fieldGroup} style={{ maxWidth: 280, width: "100%" }}>
          <label className={js3Styles.fieldLabel} htmlFor="paymentDate">
            Datum isplate plate
          </label>
          <DateInput
            id="paymentDate"
            value={paymentDate}
            onValueChange={handlePaymentDateChange}
            className={js3Styles.fieldInput}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem",
            width: "100%",
            maxWidth: 980,
          }}
        >
          {/* Radnici bez obračuna dok mjesec ima druge obračune: bez ovoga se
              propust otkrije tek kad u MIP-u fali red */}
          {bezObracuna.length > 0 && (
            <div
              style={{
                padding: "0.7rem 1rem",
                borderRadius: 8,
                border: "1px solid var(--warn-border)",
                background: "var(--warn-bg)",
                color: "var(--warn-text)",
                fontSize: "0.88rem",
                lineHeight: 1.5,
              }}
            >
              <strong>
                Bez obračuna za {MONTHS[month - 1].toLowerCase()}:
              </strong>{" "}
              {bezObracuna
                .map((w) => `${w.firstName} ${w.lastName}`.trim())
                .join(", ")}
              . Radnici bez obračuna ne ulaze u MIP-1023, platne listiće ni
              uplatnice.
            </div>
          )}
          {/* Dokumenti mjeseca: grupe po tome kome dokument ide, redoslijed
              prati tok posla (radnici, banka, knjiženje, porezna uprava).
              Pravilo: jedno tamno dugme po grupi (najčešća akcija), ostalo
              tint varijanta. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "0.85rem 1.1rem 0.3rem",
              borderRadius: 8,
              border: "1px solid var(--border, #d8d4ca)",
              background: "var(--card-bg, #f7f3eb)",
            }}
          >
            <h3
              style={{
                fontFamily: "DM Serif Display, serif",
                fontSize: "1.15rem",
                fontWeight: 400,
                textAlign: "center",
                margin: "0.15rem 0 0",
                paddingBottom: "0.65rem",
                borderBottom: "1px dashed var(--border, #d8d4ca)",
                color: "var(--ink, #0f1a12)",
              }}
            >
              Dokumenti za {MONTHS[month - 1].toLowerCase()} {year}.
            </h3>
            <DocRow label="Radnici">
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => payslipsMutation.mutate()}
            disabled={
              payslipsMutation.isPending || !canGenerate || radnici.length === 0
            }
            title={
              !canGenerate
                ? "Dostupno uz Pro pretplatu"
                : radnici.length === 0
                ? "Vlasnik obrta nema platni listić, listići se generišu samo za radnike."
                : undefined
            }
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "0.95rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {payslipsMutation.isPending
              ? "Generišem…"
              : "Preuzmi platne listiće"}
          </button>
          {/* Split-button za email: veliki, svima; chevron, lista radnika */}
          <div
            ref={emailMenuRef}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "stretch",
            }}
          >
            <button
              type="button"
              className={styles.btnTintBlue}
              onClick={() => payslipsEmailMutation.mutate()}
              disabled={
                payslipsEmailMutation.isPending ||
                singleEmailPendingId !== null ||
                !canGenerate ||
                radnici.length === 0
              }
              title={
                !canGenerate
                  ? "Dostupno uz Pro pretplatu"
                  : radnici.length === 0
                  ? "Nema radnika za slanje"
                  : "Pošalji platni listić svakom radniku sa upisanim email-om"
              }
              style={{
                padding: "0.75rem 1.25rem",
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                borderRight: "none",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {payslipsEmailMutation.isPending
                ? "Šaljem svima…"
                : "Pošalji listiće emailom"}
            </button>
            <button
              type="button"
              className={styles.btnTintBlue}
              onClick={() => setEmailMenuOpen((v) => !v)}
              disabled={
                payslipsEmailMutation.isPending ||
                singleEmailPendingId !== null ||
                !canGenerate ||
                radnici.length === 0
              }
              title="Pošalji pojedinačnom radniku"
              style={{
                padding: "0.75rem 0.7rem",
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft:
                  "1px solid color-mix(in srgb, var(--color-info, #1f5a8c) 35%, transparent)",
              }}
              aria-haspopup="menu"
              aria-expanded={emailMenuOpen}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {emailMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  minWidth: 280,
                  maxHeight: 360,
                  overflowY: "auto",
                  background: "var(--paper, #faf8f3)",
                  border: "1px solid var(--border, #d4cfc4)",
                  borderRadius: 8,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
                  padding: "0.35rem",
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setEmailMenuOpen(false);
                    payslipsEmailMutation.mutate();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.55rem 0.7rem",
                    background: "transparent",
                    border: 0,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    fontFamily: "inherit",
                    color: "inherit",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(0,0,0,0.04)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <strong>Pošalji svima</strong>
                  <span style={{ color: "var(--mid, #6c6862)", marginLeft: 6 }}>
                    ({
                      radnici.filter(
                        (w) =>
                          !!w.email?.trim() &&
                          (payrollByWorker.get(w.id)?.gross ?? 0) > 0,
                      ).length
                    })
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setEmailMenuOpen(false);
                    setBundleEmailAddr(organization?.email?.trim() || "");
                    setBundleEmailOpen(true);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.55rem 0.7rem",
                    background: "transparent",
                    border: 0,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    fontFamily: "inherit",
                    color: "inherit",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(0,0,0,0.04)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  title="Svi listići mjeseca u jednom PDF-u na jednu adresu (npr. email firme za štampu i uručenje radnicima)"
                >
                  <strong>Sve na jedan email…</strong>
                  <span style={{ color: "var(--mid, #6c6862)", marginLeft: 6 }}>
                    (jedan PDF)
                  </span>
                </button>
                <div
                  style={{
                    height: 1,
                    background: "var(--border, #d4cfc4)",
                    margin: "0.3rem 0",
                  }}
                />
                {radnici.map((w) => {
                  const p = payrollByWorker.get(w.id);
                  const hasGross = !!p && (p.gross || 0) > 0;
                  const hasEmail = !!w.email?.trim();
                  const disabled = !hasEmail || !hasGross;
                  const sending = singleEmailPendingId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      role="menuitem"
                      disabled={disabled || sending}
                      onClick={() => {
                        if (!p) return;
                        setEmailMenuOpen(false);
                        void sendPayslipToWorker(w.id, p.id);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "0.5rem 0.7rem",
                        background: "transparent",
                        border: 0,
                        borderRadius: 4,
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.5 : 1,
                        fontSize: "0.86rem",
                        fontFamily: "inherit",
                        color: "inherit",
                      }}
                      onMouseEnter={(e) => {
                        if (!disabled)
                          e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                      }}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                      title={
                        !hasEmail
                          ? "Nema upisan email u profilu"
                          : !hasGross
                          ? "Plata nije obračunata za ovaj mjesec"
                          : `Pošalji na ${w.email}`
                      }
                    >
                      <div style={{ fontWeight: 500 }}>
                        {w.firstName} {w.lastName}
                        {sending && (
                          <span
                            style={{
                              color: "var(--mid, #6c6862)",
                              marginLeft: 6,
                            }}
                          >
                            Šaljem…
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.74rem",
                          color: "var(--mid, #6c6862)",
                          marginTop: 1,
                        }}
                      >
                        {!hasEmail
                          ? "⚠ Nema upisan email"
                          : !hasGross
                          ? "⚠ Plata nije obračunata"
                          : w.email}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {/* Modal: svi listići mjeseca u jednom PDF-u na jednu adresu */}
          {bundleEmailOpen && (
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
              onClick={() =>
                !bundleEmailMutation.isPending && setBundleEmailOpen(false)
              }
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "var(--white)",
                  borderRadius: 12,
                  maxWidth: 460,
                  width: "100%",
                  padding: "1.5rem",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 0.6rem",
                    fontSize: 17,
                    color: "var(--ink)",
                  }}
                >
                  Svi listići na jedan email
                </h3>
                <p
                  style={{
                    margin: "0 0 1rem",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: "var(--mid)",
                  }}
                >
                  Svi platni listići za{" "}
                  <strong>
                    {String(month).padStart(2, "0")}/{year}
                  </strong>{" "}
                  šalju se u jednom PDF-u na upisanu adresu (npr. email firme),
                  pa se tamo odštampaju i uruče radnicima. Radnicima se ovim ne
                  šalje ništa.
                </p>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink)",
                    marginBottom: 5,
                  }}
                >
                  Email adresa
                </div>
                <input
                  type="email"
                  value={bundleEmailAddr}
                  onChange={(e) => setBundleEmailAddr(e.target.value)}
                  placeholder="npr. firma@email.ba"
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    fontSize: 14,
                    fontFamily: "inherit",
                    color: "var(--ink)",
                    background: "var(--white)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    outline: "none",
                    marginBottom: "1.1rem",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setBundleEmailOpen(false)}
                    disabled={bundleEmailMutation.isPending}
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--white)",
                      color: "var(--ink)",
                      fontSize: 13.5,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Odustani
                  </button>
                  <button
                    type="button"
                    onClick={() => bundleEmailMutation.mutate()}
                    disabled={
                      bundleEmailMutation.isPending || !bundleEmailAddr.trim()
                    }
                    style={{
                      padding: "0.55rem 1rem",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--sage)",
                      color: "#fff",
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      opacity:
                        bundleEmailMutation.isPending ||
                        !bundleEmailAddr.trim()
                          ? 0.6
                          : 1,
                    }}
                  >
                    {bundleEmailMutation.isPending ? "Šaljem…" : "Pošalji"}
                  </button>
                </div>
              </div>
            </div>
          )}
            </DocRow>
            <DocRow label="Banka">
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => uplatniceMutation.mutate()}
            disabled={uplatniceMutation.isPending || !canGenerate}
            title={canGenerate ? undefined : "Dostupno uz Pro pretplatu"}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "0.95rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {uplatniceMutation.isPending
              ? "Generišem…"
              : "Preuzmi uplatnice"}
          </button>
          <button
            type="button"
            className={styles.btnTintBlue}
            onClick={openIzvoz}
            disabled={!organization || !canGenerate}
            title={
              canGenerate
                ? "Datoteka sa nalozima mjeseca za uvoz u e-bankarstvo (Halcom, Raiffeisen, UniCredit i ELBA banke: BBI, ASA, Sparkasse, Intesa, ProCredit, PBS)"
                : "Dostupno uz Pro pretplatu"
            }
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "0.95rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Izvoz za e-bankarstvo
          </button>
          <button
            type="button"
            className={styles.btnTintBlue}
            onClick={() => listaNalogaMutation.mutate()}
            disabled={
              listaNalogaMutation.isPending || !organization || !canGenerate
            }
            title={
              canGenerate
                ? "Rekapitulacija svih naloga za banku (doprinosi + plate)"
                : "Dostupno uz Pro pretplatu"
            }
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "0.95rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {listaNalogaMutation.isPending
              ? "Generišem…"
              : "Lista naloga"}
          </button>
          <button
            type="button"
            className={styles.btnTintBlue}
            onClick={() => setStampaOpen(true)}
            disabled={!organization || !canGenerate}
            title={
              canGenerate
                ? "Štampa naloga na matričnom pisaču, na pred-štampani obrazac (traka)"
                : "Dostupno uz Pro pretplatu"
            }
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "0.95rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Štampa naloga
          </button>
          <div
            ref={bankMenuRef}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "stretch",
            }}
          >
            <button
              type="button"
              className={styles.btnTintBlue}
              onClick={() => specifikacijeMutation.mutate(null)}
              disabled={
                specifikacijeMutation.isPending || !organization || !canGenerate
              }
              title={
                canGenerate
                  ? "Specifikacije po radniku (neto, topli obrok, putni, regres), svi radnici"
                  : "Dostupno uz Pro pretplatu"
              }
              style={{
                padding: "0.75rem 1.25rem",
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                borderRight: "none",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {specifikacijeMutation.isPending
                ? "Generišem…"
                : "Specifikacije po radniku"}
            </button>
            <button
              type="button"
              className={styles.btnTintBlue}
              onClick={() => setBankMenuOpen((v) => !v)}
              disabled={
                specifikacijeMutation.isPending ||
                !organization ||
                !canGenerate ||
                banksInPayroll.length === 0
              }
              title="Filter po banci"
              style={{
                padding: "0.75rem 0.7rem",
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
              }}
              aria-haspopup="menu"
              aria-expanded={bankMenuOpen}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {bankMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  minWidth: 240,
                  background: "var(--paper, #faf8f3)",
                  border: "1px solid var(--border, #d4cfc4)",
                  borderRadius: 8,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
                  padding: "0.35rem",
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setBankMenuOpen(false);
                    specifikacijeMutation.mutate(null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.5rem 0.7rem",
                    background: "transparent",
                    border: 0,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    fontFamily: "inherit",
                    color: "inherit",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(0,0,0,0.04)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <strong>Svi radnici</strong>
                  <span style={{ color: "var(--mid, #6c6862)", marginLeft: 6 }}>
                    ({summaryQuery.data?.perWorker.length ?? 0})
                  </span>
                </button>
                {banksInPayroll.length > 0 && (
                  <div
                    style={{
                      height: 1,
                      background: "var(--border, #d4cfc4)",
                      margin: "0.3rem 0",
                    }}
                  />
                )}
                {banksInPayroll.map((b) => (
                  <button
                    key={b.prefix}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setBankMenuOpen(false);
                      specifikacijeMutation.mutate(b.prefix);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "0.5rem 0.7rem",
                      background: "transparent",
                      border: 0,
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: "0.88rem",
                      fontFamily: "inherit",
                      color: "inherit",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(0,0,0,0.04)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {b.name}
                    <span
                      style={{ color: "var(--mid, #6c6862)", marginLeft: 6 }}
                    >
                      ({b.count})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
              {/* opcija se tiče uplatnica i izvoza u banku, pa stoji uz njih */}
              <label
                style={{
                  flexBasis: "100%",
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "flex-start",
                  padding: "0.45rem 0.6rem",
                  borderRadius: 8,
                  border: summaryQuery.data?.combineKantonal
                    ? "1px solid var(--sage, #3a5c42)"
                    : "1px solid var(--border, #d4cfc4)",
                  cursor: combineKantonalMutation.isPending
                    ? "wait"
                    : "pointer",
                  background: summaryQuery.data?.combineKantonal
                    ? "color-mix(in srgb, var(--sage, #3a5c42) 10%, transparent)"
                    : "transparent",
                  transition: "border-color .15s, background .15s",
                  opacity: combineKantonalMutation.isPending ? 0.65 : 1,
                  maxWidth: 620,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!summaryQuery.data?.combineKantonal}
                  disabled={combineKantonalMutation.isPending}
                  onChange={(e) =>
                    combineKantonalMutation.mutate(e.target.checked)
                  }
                  style={{
                    marginTop: 2,
                    width: 15,
                    height: 15,
                    accentColor: "var(--sage, #3a5c42)",
                    cursor: "inherit",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: "var(--mid, #6c6862)",
                  }}
                >
                  <strong
                    style={{ color: "var(--ink, #0f1a12)", fontWeight: 600 }}
                  >
                    Objedini kantonalne doprinose po kantonu
                  </strong>{" "}
                  · zdravstvo i nezaposlenost na jedan nalog po kantonu (šifra
                  općine = sjedište firme), porez na dohodak ostaje po općini
                  radnika.
                </span>
              </label>
            </DocRow>
            <DocRow label="Knjiženje">
          <div
            ref={nalogMenuRef}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "stretch",
            }}
          >
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => postingOrderMutation.mutate()}
              disabled={
                postingOrderMutation.isPending || !organization || !canGenerate
              }
              title={
                canGenerate
                  ? "Nalog za knjiženje plate (konta duguje/potražuje) za osobu zaduženu za knjiženje"
                  : "Dostupno uz Pro pretplatu"
              }
              style={{
                padding: "0.75rem 1.25rem",
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                borderRight: "none",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="15" y2="17" />
              </svg>
              {postingOrderMutation.isPending
                ? "Generišem…"
                : "Nalog za knjiženje"}
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => setNalogMenuOpen((v) => !v)}
              disabled={!organization || !canGenerate}
              title="Podesi konta"
              style={{
                padding: "0.75rem 0.7rem",
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: "1px solid rgba(255,255,255,0.35)",
              }}
              aria-haspopup="menu"
              aria-expanded={nalogMenuOpen}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {nalogMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  minWidth: 200,
                  background: "var(--paper, #faf8f3)",
                  border: "1px solid var(--border, #d4cfc4)",
                  borderRadius: 8,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
                  padding: "0.35rem",
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setNalogMenuOpen(false);
                    setKontaOpen(true);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.5rem 0.7rem",
                    background: "transparent",
                    border: 0,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    fontFamily: "inherit",
                    color: "inherit",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(0,0,0,0.04)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Podesi konta
                </button>
              </div>
            )}
          </div>
            </DocRow>
            {/* Modal: izvoz naloga mjeseca u datoteku za e-bankarstvo */}
            {izvozOpen && (
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
                onClick={() => !izvozMutation.isPending && setIzvozOpen(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "var(--white)",
                    borderRadius: 12,
                    maxWidth: 520,
                    width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    padding: "1.5rem",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 0.6rem",
                      fontSize: 17,
                      color: "var(--ink)",
                    }}
                  >
                    Izvoz naloga za e-bankarstvo
                  </h3>
                  <p
                    style={{
                      margin: "0 0 1rem",
                      fontSize: "0.88rem",
                      color: "var(--mid, #6c6862)",
                      lineHeight: 1.5,
                    }}
                  >
                    Preuzmite datoteku sa svim nalozima za{" "}
                    {MONTHS[month - 1].toLowerCase()} {year}: doprinosi, porez
                    i isplate radnicima, isto kao na zbirnim uplatnicama.
                    Uvezite je u svoje e-bankarstvo i samo potpišite naloge.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.9rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--ink)",
                          marginBottom: 4,
                        }}
                      >
                        Banka (e-bankarstvo)
                      </label>
                      <StyledSelect
                        value={izvozBanka}
                        onChange={(v) =>
                          setIzvozBanka(v === null ? null : String(v))
                        }
                        groups={[
                          {
                            options: IZVOZ_BANKE.map((b) => ({
                              value: b.value,
                              label: b.label,
                            })),
                          },
                        ]}
                        placeholder="– Izaberite banku –"
                        ariaLabel="Banka za izvoz naloga"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="izvozDatumValute"
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--ink)",
                          marginBottom: 4,
                        }}
                      >
                        Datum valute (datum plaćanja)
                      </label>
                      <DateInput
                        id="izvozDatumValute"
                        value={izvozDatum}
                        onValueChange={setIzvozDatum}
                        className={js3Styles.fieldInput}
                      />
                    </div>
                    {summaryQuery.data?.combineKantonal && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.8rem",
                          color: "var(--mid, #6c6862)",
                        }}
                      >
                        Kantonalni doprinosi (zdravstvo i nezaposlenost) se
                        objedinjuju po kantonu, po vašoj uključenoj opciji.
                      </p>
                    )}
                  </div>
                  {izvozMutation.isError && (
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "0.7rem 0.9rem",
                        borderRadius: 8,
                        border: "1px solid #e2b4ab",
                        background: "#fbeeec",
                        color: "#8a2f21",
                        fontSize: "0.85rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {izvozMutation.error instanceof Error
                        ? izvozMutation.error.message
                        : "Greška pri generisanju datoteke."}
                    </div>
                  )}
                  {izvozRezultat && (
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "0.7rem 0.9rem",
                        borderRadius: 8,
                        border: "1px solid #b7d4bd",
                        background: "#eef6ef",
                        color: "#2d4633",
                        fontSize: "0.85rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {izvozRezultat.datoteke &&
                      izvozRezultat.datoteke.length > 1 ? (
                        <>
                          Pokrenuto je preuzimanje{" "}
                          {izvozRezultat.datoteke.length}{" "}
                          {datotekaPadez(izvozRezultat.datoteke.length)} (
                          {izvozRezultat.meta.brojNaloga} naloga, ukupno{" "}
                          {fmtKM(izvozRezultat.meta.ukupnoKm)} KM). Ako
                          preglednik pita za dozvolu preuzimanja više datoteka,
                          potvrdite je, inače neće sve stići. Svaku uvezite kao
                          poseban paket:
                          <ul
                            style={{
                              margin: "0.3rem 0 0",
                              paddingLeft: "1.1rem",
                            }}
                          >
                            {izvozRezultat.datoteke.map((d) => (
                              <li key={d.fileName}>
                                <strong>{d.fileName}</strong>
                                {d.naslov ? `: ${d.naslov}` : ""},{" "}
                                {d.brojNaloga}{" "}
                                {d.brojNaloga === 1 ? "nalog" : "naloga"},{" "}
                                {fmtKM(d.ukupnoKm)} KM
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <>
                          Datoteka <strong>{izvozRezultat.fileName}</strong> je
                          preuzeta: {izvozRezultat.meta.brojNaloga} naloga,
                          ukupno {fmtKM(izvozRezultat.meta.ukupnoKm)} KM.
                        </>
                      )}
                    </div>
                  )}
                  {izvozPreskoceni.length > 0 && (
                    <div
                      style={{
                        marginTop: "0.6rem",
                        padding: "0.7rem 0.9rem",
                        borderRadius: 8,
                        border: "1px solid var(--warn-border)",
                        background: "var(--warn-bg)",
                        color: "var(--warn-text)",
                        fontSize: "0.83rem",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>
                        Nisu u datoteci ({izvozPreskoceni.length}):
                      </strong>
                      <ul style={{ margin: "0.3rem 0 0.4rem", paddingLeft: "1.1rem" }}>
                        {izvozPreskoceni.map((p, i) => (
                          <li key={i}>
                            {p.stavka}, {fmtKM(p.iznosKm)} KM
                            {p.radnik ? `, ${p.radnik}` : ""} ({p.razlog})
                          </li>
                        ))}
                      </ul>
                      Te iznose platite posebno ili dopunite podatke pa
                      ponovite izvoz.
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "0.8rem 0.95rem",
                      borderRadius: 8,
                      background: "var(--paper, #faf8f3)",
                      border: "1px solid var(--border, #d4cfc4)",
                      fontSize: "0.83rem",
                      color: "var(--mid, #6c6862)",
                      lineHeight: 1.55,
                    }}
                  >
                    <strong style={{ color: "var(--ink)" }}>Kako radi</strong>
                    <ol style={{ margin: "0.35rem 0 0.6rem", paddingLeft: "1.2rem" }}>
                      <li>
                        Izaberite banku i datum valute, pa preuzmite datoteku.
                      </li>
                      <li>
                        U svom e-bankarstvu izaberite uvoz naloga iz datoteke i
                        učitajte preuzeti fajl.
                      </li>
                      <li>
                        Nalozi se pojave pripremljeni, ostaje samo da ih
                        potpišete.
                      </li>
                    </ol>
                    {izvozBanka === "raiffeisen" && (
                      <p style={{ margin: "0 0 0.6rem" }}>
                        <strong style={{ color: "var(--ink)" }}>
                          Raiffeisen:
                        </strong>{" "}
                        izvoz se dijeli u više datoteka jer se u bankarstvu
                        vrsta i svrha plaćanja biraju za cijeli paket (dozvolite
                        pregledniku preuzimanje više datoteka ako pita).
                        Datoteku <em>doprinosi</em> uvezite kao javne prihode, a
                        ostale kao plaćanja na tekući račun u banci sa svrhom:
                        plate 511, topli obrok 518, prevoz 519, regres 110.
                      </p>
                    )}
                    Ako uvoz u vaše bankarstvo ne radi, javite nam se na{" "}
                    <a href="mailto:info@poreznikalkulator.ba">
                      info@poreznikalkulator.ba
                    </a>{" "}
                    i popravićemo u roku od par dana. Ako vaše banke nema na
                    listi, pošaljite nam primjer izvoza iz svog bankarstva i
                    dodaćemo je.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "0.6rem",
                      marginTop: "1.2rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIzvozOpen(false)}
                      disabled={izvozMutation.isPending}
                      style={{
                        padding: "0.55rem 1rem",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--white)",
                        color: "var(--ink)",
                        fontSize: 13.5,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Zatvori
                    </button>
                    <button
                      type="button"
                      onClick={() => izvozMutation.mutate()}
                      disabled={izvozMutation.isPending || !izvozBanka}
                      style={{
                        padding: "0.55rem 1rem",
                        borderRadius: 8,
                        border: "none",
                        background: "var(--sage)",
                        color: "#fff",
                        fontSize: 13.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        opacity:
                          izvozMutation.isPending || !izvozBanka ? 0.6 : 1,
                      }}
                    >
                      {izvozMutation.isPending
                        ? "Generišem…"
                        : "Preuzmi datoteku"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {stampaOpen && organization && (
              <StampaNalogaModal
                organizationId={orgId}
                organizationName={organization.name || ""}
                year={year}
                month={month}
                onClose={() => setStampaOpen(false)}
              />
            )}
            <DocRow label="Porezna uprava">
          {radniciFbih.length > 0 && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={async () => {
                if (await confirmImported()) obrazac2001Mutation.mutate();
              }}
              disabled={obrazac2001Mutation.isPending || !organization || !canGenerate}
              title={canGenerate ? undefined : "Dostupno uz Pro pretplatu"}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "0.95rem",
                background: "var(--sage, #3a5c42)",
                borderColor: "var(--sage, #3a5c42)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {obrazac2001Mutation.isPending
                ? "Generišem…"
                : "Preuzmi Obrazac 2001"}
            </button>
          )}
          {/* 2001-A: samo kad firma ima radnika sa prebivalištem u RS. */}
          {radniciRs.length > 0 && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={async () => {
                if (await confirmImported()) obrazac2001AMutation.mutate();
              }}
              disabled={obrazac2001AMutation.isPending || !organization || !canGenerate}
              title={canGenerate ? undefined : "Dostupno uz Pro pretplatu"}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "0.95rem",
                background: "var(--sage, #3a5c42)",
                borderColor: "var(--sage, #3a5c42)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {obrazac2001AMutation.isPending
                ? "Generišem…"
                : "Preuzmi Obrazac 2001-A (RS)"}
            </button>
          )}
          {radnici.length > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "stretch",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                className={styles.btnTintSage}
                onClick={async () => {
                  if (await confirmImported()) mip1023Mutation.mutate();
                }}
                disabled={
                  mip1023Mutation.isPending ||
                  mip1023XmlMutation.isPending ||
                  !organization ||
                  !canGenerate
                }
                title={canGenerate ? undefined : "Dostupno uz Pro pretplatu"}
                style={{
                  padding: "0.75rem 1.25rem",
                  fontSize: "0.95rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  borderRight: "none",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="16"
                  height="16"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {mip1023Mutation.isPending ? "Generišem…" : "MIP-1023 PDF"}
              </button>
              <button
                type="button"
                className={styles.btnTintSage}
                onClick={async () => {
                  if (await confirmImported()) mip1023XmlMutation.mutate();
                }}
                disabled={
                  mip1023XmlMutation.isPending ||
                  mip1023Mutation.isPending ||
                  !organization ||
                  !canGenerate
                }
                title={
                  canGenerate
                    ? "XML za paketni uvoz u nPIS"
                    : "Dostupno uz Pro pretplatu"
                }
                style={{
                  padding: "0.75rem 0.9rem",
                  fontSize: "0.85rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="14"
                  height="14"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="m9 13 2 3-2 3M15 13l-2 3 2 3" />
                </svg>
                {mip1023XmlMutation.isPending ? "XML…" : "XML"}
              </button>
            </div>
          )}
          {mipPreuzetAt && (
            <span
              title={`MIP-1023 XML preuzet ${(() => {
                const [y, mo, d] = mipPreuzetAt.slice(0, 10).split("-");
                return `${d}.${mo}.${y}.`;
              })()}`}
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--sage, #2d6e54)",
                background:
                  "color-mix(in srgb, var(--sage, #3a5c42) 14%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--sage, #3a5c42) 40%, transparent)",
                borderRadius: 999,
                padding: "0.15rem 0.6rem",
              }}
            >
              MIP preuzet ✓
            </span>
          )}
          {radnici.length > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "stretch",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                className={styles.btnTintSage}
                onClick={() => gip1022PdfMutation.mutate()}
                disabled={
                  gip1022PdfMutation.isPending ||
                  gip1022Mutation.isPending ||
                  !organization ||
                  !canGenerate
                }
                title={
                  canGenerate
                    ? `Godišnji izvještaj za ${year}. svi radnici u jednom PDF-u`
                    : "Dostupno uz Pro pretplatu"
                }
                style={{
                  padding: "0.75rem 1.25rem",
                  fontSize: "0.95rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  borderRight: "none",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="16"
                  height="16"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {gip1022PdfMutation.isPending
                  ? "Generišem…"
                  : `GIP-1022 PDF (${year})`}
              </button>
              <button
                type="button"
                className={styles.btnTintSage}
                onClick={() => gip1022Mutation.mutate()}
                disabled={
                  gip1022Mutation.isPending ||
                  gip1022PdfMutation.isPending ||
                  gip1022XmlMutation.isPending ||
                  !organization ||
                  !canGenerate
                }
                title={
                  canGenerate
                    ? `Godišnji izvještaj za ${year}. zaseban PDF po radniku, zipovano`
                    : "Dostupno uz Pro pretplatu"
                }
                style={{
                  padding: "0.75rem 0.9rem",
                  fontSize: "0.85rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  borderRadius: 0,
                  borderRight: "none",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="14"
                  height="14"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
                </svg>
                {gip1022Mutation.isPending ? "ZIP…" : "ZIP"}
              </button>
              <button
                type="button"
                className={styles.btnTintSage}
                onClick={() => gip1022XmlMutation.mutate()}
                disabled={
                  gip1022XmlMutation.isPending ||
                  gip1022PdfMutation.isPending ||
                  gip1022Mutation.isPending ||
                  !organization ||
                  !canGenerate
                }
                title={
                  canGenerate
                    ? `XML za paketni uvoz u nPIS, svi radnici u jednom XML-u za ${year}.`
                    : "Dostupno uz Pro pretplatu"
                }
                style={{
                  padding: "0.75rem 0.9rem",
                  fontSize: "0.85rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="14"
                  height="14"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="m9 13 2 3-2 3M15 13l-2 3 2 3" />
                </svg>
                {gip1022XmlMutation.isPending ? "XML…" : "XML"}
              </button>
            </div>
          )}
            </DocRow>
          </div>
        </div>

        {/* Bulk označavanje obračuna kao isplaćeni */}
        <BulkMarkPaidAction
          isPending={markAllPaidMutation.isPending}
          onMark={async () => {
            const updated = (await markAllPaidMutation.mutateAsync()).updated;
            return updated;
          }}
        />
      </div>

      {(uplatniceMutation.isError ||
        payslipsMutation.isError ||
        obrazac2001Mutation.isError ||
        listaNalogaMutation.isError ||
        specifikacijeMutation.isError ||
        mip1023Mutation.isError ||
        mip1023XmlMutation.isError ||
        gip1022Mutation.isError ||
        gip1022PdfMutation.isError ||
        gip1022XmlMutation.isError) && (
        <div className={styles.errorMsg} style={{ marginTop: "0.6rem" }}>
          {uplatniceMutation.error?.message ||
            payslipsMutation.error?.message ||
            obrazac2001Mutation.error?.message ||
            listaNalogaMutation.error?.message ||
            specifikacijeMutation.error?.message ||
            mip1023Mutation.error?.message ||
            mip1023XmlMutation.error?.message ||
            gip1022Mutation.error?.message ||
            gip1022PdfMutation.error?.message ||
            gip1022XmlMutation.error?.message ||
            "Greška pri generisanju dokumenata"}
        </div>
      )}

      {kontaOpen && <PostingAccountsModal onClose={() => setKontaOpen(false)} />}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Modal: detalji obračuna za jednog radnika
// ─────────────────────────────────────────────────────────────────────────────

function PayrollModal({
  orgId,
  year,
  month,
  worker,
  payroll,
  orgMealRate,
  onClose,
}: {
  orgId: number;
  year: number;
  month: number;
  worker: Worker;
  payroll: Payroll | null;
  orgMealRate: number | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const existing = payroll;

  // Sihterica auto-fetch za pre-fill workedMinutes ako nema snapshot vrijednosti.
  const sihQuery = useQuery({
    queryKey: ["sihterica", worker.id, year, month],
    queryFn: () => unwrap(getSihterica(worker.id, year, month)),
  });

  // Suma po ISTOJ semantici kao šihterica (vremena + plaćene šifre odsustva
  // po meta postavkama) — vidi sumSihtericaMinutes gore.
  const sihMinutes = useMemo(
    () => sumSihtericaMinutes(sihQuery.data, year, month),
    [sihQuery.data, year, month],
  );

  // Dani bolovanja (šifra 9.3) iz šihterice — prefill za polje "Dani bolovanja".
  const sihSickDays = useMemo(
    () => countSihtericaSickDays(sihQuery.data),
    [sihQuery.data],
  );

  // Topli obrok: dnevna stopa (override radnika > stopa firme) i broj radnih
  // dana iz šihterice. Obračun = stopa × broj dana prisustva.
  const mealRatePerDay = useMemo(() => {
    if (worker.mealAllowancePerDay != null) {
      return Number(worker.mealAllowancePerDay);
    }
    if (orgMealRate != null) return Number(orgMealRate);
    return null;
  }, [worker.mealAllowancePerDay, orgMealRate]);

  const sihWorkDays = useMemo(() => {
    const data = sihQuery.data;
    if (!data || typeof data !== "object") return 0;
    return countSihtericaWorkDays((data as { days?: unknown }).days);
  }, [sihQuery.data]);

  // Da li šihterica UOPĆE postoji (bez obzira na broj dana prisustva). Bitno da
  // se razlikuje "nema šihterice" (→ pun mjesec) od "šihterica popunjena ali 0
  // dana prisustva" (radnik cijeli mjesec odsutan → 0 dana za obrok).
  const hasSihterica = useMemo(() => {
    const data = sihQuery.data as { days?: unknown } | null | undefined;
    return !!(
      data &&
      Array.isArray(data.days) &&
      data.days.some((d) => d != null)
    );
  }, [sihQuery.data]);

  // Dani za topli obrok: iz šihterice ako postoji (može biti i 0), inače
  // standardni radni dani (pun mjesec).
  // Pro-rate factor za mid-month prijavu/odjavu. Default = "automatic" (ON
  // kad postoji prijava/odjava u mjesecu). User može isključiti checkbox-om.
  // Ako je već obračunato za taj mjesec, pamtimo izbor iz snapshot-a
  // (existing.proRateFactor: 1 = korisnik isključio razmjer).
  const autoProRate = computeProRateFactor(worker, year, month);
  const [proRateEnabled, setProRateEnabled] = useState<boolean>(
    existing && existing.proRateFactor != null
      ? Number(existing.proRateFactor) < 1
      : autoProRate < 1,
  );
  const effectiveProRate = proRateEnabled ? autoProRate : 1;

  // Pun mjesec (standardni radni dani), imenilac za srazmjeru putnog.
  const fullWorkDays = standardWorkDaysForMonth(year, month);
  // Dani prisustva: iz šihterice ako postoji. BEZ šihterice, za mid-month
  // radnika koristi radne dane PERIODA prijave (puni × proRate), da se i topli
  // obrok i putni srazmjerno umanje i bez popunjene šihterice.
  const mealDays = hasSihterica
    ? sihWorkDays
    : Math.round(fullWorkDays * effectiveProRate);
  const mealAuto =
    mealRatePerDay != null
      ? Math.round(mealRatePerDay * mealDays * 100) / 100
      : null;
  // Putni trošak prati ISTE dane kao topli obrok (dani prisustva iz šihterice):
  // mjesečni iznos × (dani prisustva ÷ puni radni dani). Za nepun mjesec se
  // zaokružuje na cijeli KM; pun mjesec (svi dani) ostaje kako je uneseno.
  const travelMonthly = Number(worker.travelAllowancePerMonth ?? 0);
  const travelAuto =
    travelMonthly > 0
      ? mealDays < fullWorkDays
        ? Math.round((travelMonthly * mealDays) / fullWorkDays)
        : +travelMonthly.toFixed(2)
      : null;

  // Tip plate iz worker profila, određuje koje polje je "anker" (source of
  // truth) za bruto/neto. Sva 3 polja su uvijek vidljiva i sync-ovana, tag
  // pokazuje koje je ugovorno fiksirano.
  const workerSalaryType: SalaryType = worker.salaryType ?? "NETO_ISPLATA";

  // Datum za totalYearsOfService — kraj obračunskog mjeseca (isti default
  // koji backend koristi). Bez ovog usklađivanja godine staža mogu se
  // razlikovati za 1 između frontenda i backenda.
  const asOfPaymentDate = new Date(year, month, 0).toISOString().slice(0, 10);

  // Form state — inicijalizacija iz postojećeg snapshot-a ili sa worker default-a.
  // "gross" je BRUTO OSNOVICA iz ugovora (bez minulog rada).
  // Prioritet: existing.grossBase (eksplicitno upisana baza) > worker default.
  // VAŽNO: ne koristimo `existing.gross` kao fallback jer ono UKLJUČUJE minuli
  // rad — slanje toga nazad u calc dovodi do double-count-a.
  const [gross, setGross] = useState<string>(() => {
    if (existing && existing.grossBase != null) {
      const baseNum = Number(existing.grossBase);
      if (Number.isFinite(baseNum) && baseNum > 0) {
        return fmtMoneyInput(baseNum);
      }
    }
    const base = computeWorkerGrossBase(worker, asOfPaymentDate);
    return base > 0 ? fmtMoneyInput(base) : "";
  });
  const [coeff, setCoeff] = useState<string>(() =>
    existing
      ? String(existing.taxCoefficient)
      : String(worker.taxCoefficient ?? 1),
  );
  // Tri sinhronizovana polja:
  //   • gross         — bruto osnovica iz ugovora
  //   • netoUgovor    — bazni neto iz ugovora (= fromGross(gross).net)
  //   • netoIsplata   — ciljni take-home (= fromGross(gross × (1+M)).net)
  // Promjena bilo kojeg polja ažurira druga dva. lastEditRef pamti koje
  // polje je user upravo dirao da se ne pravi loop u useEffect-u.
  const [netoUgovorDisplay, setNetoUgovorDisplay] = useState<string>("");
  const [netoIsplataDisplay, setNetoIsplataDisplay] = useState<string>("");
  const lastEditRef = useRef<"gross" | "netoUgovor" | "netoIsplata">("gross");
  // Da li je korisnik RUČNO kucao u polje "Cilj neto za isplatu" u ovom
  // otvaranju modala. Ako nije, kao cilj se serveru šalje iznos iz PROFILA
  // radnika (salaryNeto), ne auto-popunjeni preview: preview zna biti fening
  // pored serverskog neta, pa bi fening-search zakucao pogrešan cilj
  // (1.030,00 → 1.029,99) i neto bi "šetao" pri svakom pojedinačnom obračunu.
  const ciljRucnoRef = useRef(false);
  const [minuliRad, setMinuliRad] = useState<string>(() => {
    if (existing?.minuliRadRate != null) return String(existing.minuliRadRate);
    return String(worker.minuliRadRate ?? 0.4);
  });
  // Sati se prikazuju decimalno (npr. "174" ili "174,5"). Konvertuje se u minute
  // pri slanju na server (workedMinutes = hours × 60).
  const minutesToHoursStr = (mins: number | null | undefined): string => {
    if (mins == null) return "";
    const h = mins / 60;
    return Number.isInteger(h) ? String(h) : h.toFixed(2).replace(".", ",");
  };
  const [workedHours, setWorkedHours] = useState<string>(() =>
    minutesToHoursStr(existing?.workedMinutes),
  );
  const [sickDays, setSickDays] = useState<string>(() =>
    existing ? String(existing.sickDays) : "0",
  );
  const [vacationDays, setVacationDays] = useState<string>(() =>
    existing ? String(existing.vacationDays ?? 0) : "0",
  );
  const [overtime, setOvertime] = useState<string>(() =>
    existing ? String(existing.overtimeHours) : "0",
  );
  const [night, setNight] = useState<string>(() =>
    existing ? String(existing.nightHours) : "0",
  );
  const [sunday, setSunday] = useState<string>(() =>
    existing ? String(existing.sundayHours) : "0",
  );
  const [holiday, setHoliday] = useState<string>(() =>
    existing ? String(existing.holidayHours) : "0",
  );
  // Stope uvećanja — placeholderi su zakonski minimumi (čl. 76 ZoR FBiH).
  // Default vrijednost dolazi iz Worker modela; mogu se override-ati po obračunu.
  const [overtimeRate, setOvertimeRate] = useState<string>(() => {
    if (existing?.overtimeRate != null) return String(existing.overtimeRate);
    return String(worker.overtimeRate ?? 25);
  });
  const [nightRate, setNightRate] = useState<string>(() => {
    if (existing?.nightRate != null) return String(existing.nightRate);
    return String(worker.nightRate ?? 25);
  });
  const [sundayRate, setSundayRate] = useState<string>(() => {
    if (existing?.sundayRate != null) return String(existing.sundayRate);
    return String(worker.sundayRate ?? 20);
  });
  const [holidayRate, setHolidayRate] = useState<string>(() => {
    if (existing?.holidayRate != null) return String(existing.holidayRate);
    return String(worker.holidayRate ?? 50);
  });
  // Topli obrok se auto-popuni iz dnevne stope × radni dani (vidi efekt niže).
  // Ručna izmjena gasi auto-popunu da se ne pregazi korisnikov unos.
  const mealTouchedRef = useRef(false);
  const [meal, setMeal] = useState<string>(() => {
    if (existing) return fmtMoneyInput(Number(existing.mealAllowance));
    if (mealRatePerDay != null) return ""; // popuniće efekt kad stigne šihterica
    return fmtMoneyInput(Number(worker.defaultMealAllowance ?? 0));
  });
  // Regres se NE pamti — resetuje se svaki mjesec (godišnje samo jednom).
  const [vacation, setVacation] = useState<string>(() =>
    existing ? fmtMoneyInput(Number(existing.vacationBonus)) : "",
  );
  // Putni se auto-popuni iz mjesečnog iznosa × dani prisustva (vidi efekt niže).
  // Ručna izmjena gasi auto-popunu.
  const travelTouchedRef = useRef(false);
  const [travel, setTravel] = useState<string>(() => {
    if (existing) return fmtMoneyInput(Number(existing.travelExpense));
    return ""; // novi obračun: popuniće efekt kad stigne šihterica
  });
  // ── Korist u naravi (službeno vozilo) ──
  // Konfiguracija je per-radnik (master na workeru). Aktivnost prefilluje iz
  // postojećeg obračuna (koristBruto > 0) ako postoji, inače iz workera.
  const [koristAktivna, setKoristAktivna] = useState<boolean>(() =>
    existing ? Number(existing.koristBruto) > 0 : !!worker.koristVoziloAktivna,
  );
  const [koristMetoda, setKoristMetoda] = useState<string>(
    () => worker.koristVoziloMetoda || "nabavna_1posto",
  );
  const [koristVrijednost, setKoristVrijednost] = useState<string>(() =>
    worker.koristVoziloVrijednost != null
      ? fmtMoneyInput(Number(worker.koristVoziloVrijednost))
      : "",
  );
  const [koristSaPdv, setKoristSaPdv] = useState<boolean>(() =>
    worker.koristVoziloSaPdv == null ? true : !!worker.koristVoziloSaPdv,
  );
  const [koristOpis, setKoristOpis] = useState<string>(
    () => worker.koristVoziloOpis || "",
  );
  const [error, setError] = useState<string | null>(null);

  // Auto-prefill:
  //   1) Ako postoji šihterica → koristi njen ukupni zbir (vremena + plaćene
  //      šifre odsustva). hasSihterica, ne sihMinutes>0: mjesec u kom su svi
  //      dani odsustvo sa isključenim checkbox-om legitimno daje 0h.
  //   2) Inače → standardni mjesečni fond (radni dani × 8h)
  // Korisnik može uvijek ručno mijenjati.
  useEffect(() => {
    if (existing?.workedMinutes != null) return;
    if (workedHours !== "") return;
    if (sihQuery.isLoading) return;
    if (hasSihterica) {
      setWorkedHours(minutesToHoursStr(sihMinutes));
    } else {
      setWorkedHours(
        minutesToHoursStr(
          standardMinutesForMonth(year, month, worker.contractedHours ?? 8),
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sihMinutes, hasSihterica, sihQuery.isLoading]);

  // Auto-prefill dana bolovanja iz šihterice (šifra 9.3) za NOVI obračun.
  // Ne dira ručni unos (touched ref) ni postojeći obračun. Polje je 1–42
  // (na teret poslodavca), pa se prefill kapira na 42.
  const sickTouchedRef = useRef(false);
  useEffect(() => {
    if (existing) return;
    if (sickTouchedRef.current) return;
    if (sihQuery.isLoading) return;
    if (sihSickDays > 0) setSickDays(String(Math.min(sihSickDays, 42)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sihSickDays, sihQuery.isLoading]);

  // Auto-popuna toplog obroka za NOVI obračun: dnevna stopa × broj dana
  // prisustva (godišnji/praznik/bolovanje iz šihterice ispadaju). Čeka da se
  // šihterica učita da broj dana bude tačan, ne dira polje kad ga je korisnik
  // ručno promijenio. Za POSTOJEĆE obračune se NE dira (da se ne pregazi ručna
  // korekcija) — re-derivacija ide kroz eksplicitni "Obračunaj sve".
  // mealAuto je null kad nema dnevne stope (tada se iznos uopće ne dira).
  useEffect(() => {
    if (existing) return;
    if (mealTouchedRef.current) return;
    if (sihQuery.isLoading) return;
    if (mealAuto == null) return;
    setMeal(fmtMoneyInput(mealAuto));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealAuto, sihQuery.isLoading]);

  // Auto-popuna putnog troška za NOVI obračun: prati dane prisustva iz šihterice
  // (isto kao topli obrok). Čeka da se šihterica učita, ne dira ručnu izmjenu.
  useEffect(() => {
    if (existing) return;
    if (travelTouchedRef.current) return;
    if (sihQuery.isLoading) return;
    if (travelAuto == null) return;
    setTravel(fmtMoneyInput(travelAuto));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelAuto, sihQuery.isLoading]);

  // parseNum: opšti decimalni parser (parseDecimal heuristika) za polja gdje je
  // tačka decimalni separator (koeficijent, stope, sati: "0.4", "1.5").
  const parseNum = parseDecimal;
  // parseMoney: za novčana polja koja se PRIKAZUJU thousands-formatom
  // (formatMoneyLive: "1030" -> "1.030"). Kod njih je tačka separator hiljada, a
  // zarez decimala, pa "1.030" = 1030 (ne 1,03). parseDecimal bi jednu tačku
  // pogrešno protumačio kao decimalu, zato ovdje koristimo parseMoneyInput.
  const parseMoney = (s: string) => parseMoneyInput(s) ?? 0;

  // ── Umanjenje toplog obroka za dane odsustva (bolovanje + godišnji) ──
  // Mjesečni iznos: iznos ÷ puni radni dani mjeseca × dani na radu, zaokruženo
  // na cijeli KM (npr. juli 23 dana, 120 KM, 12 dana godišnjeg → 120/23 × 11 =
  // 57 KM). Dnevna stopa: stopa × (dani za obrok - dani odsustva). Checkbox se
  // ne pamti u bazi: rezultat se upiše u polje toplog obroka kao ručni unos.
  // Sakriven kad postoji šihterica uz dnevnu stopu, tamo odsustva već ispadaju
  // iz dana prisustva pa bi se umanjilo duplo.
  const odsutnihDana =
    Math.max(0, parseInt(sickDays, 10) || 0) +
    Math.max(0, parseInt(vacationDays, 10) || 0);
  const [umanjiObrok, setUmanjiObrok] = useState(false);
  const obrokBazaRef = useRef<number | null>(null);
  const obrokUmanjenjeMoguce =
    odsutnihDana > 0 && !(hasSihterica && mealRatePerDay != null);
  const umanjeniObrok = (() => {
    if (mealRatePerDay != null) {
      const prisutno = Math.max(0, mealDays - odsutnihDana);
      return {
        prisutno,
        ukupno: mealDays,
        iznos: Math.round(mealRatePerDay * prisutno * 100) / 100,
        baza: null as number | null,
      };
    }
    const baza = obrokBazaRef.current ?? parseMoney(meal);
    const prisutno = Math.max(0, fullWorkDays - odsutnihDana);
    return {
      prisutno,
      ukupno: fullWorkDays,
      iznos: baza > 0 ? Math.round((baza / fullWorkDays) * prisutno) : 0,
      baza,
    };
  })();
  // fmtMoneyInput(0) vraća prazan string, a umanjenje na 0 KM (odsutan cijeli
  // mjesec) treba da se VIDI kao nula, ne kao nepopunjeno polje.
  const obrokUpis = (n: number) => (n === 0 ? "0,00" : fmtMoneyInput(n));
  const toggleUmanjiObrok = (checked: boolean) => {
    setUmanjiObrok(checked);
    if (checked) {
      if (obrokBazaRef.current == null) obrokBazaRef.current = parseMoney(meal);
      mealTouchedRef.current = true;
      setMeal(obrokUpis(umanjeniObrok.iznos));
    } else {
      // Isključenje vraća UHVAĆENU bazu (i ručno korigovan iznos), ne auto:
      // check/uncheck ne smije tiho promijeniti postojeći obračun.
      const baza = obrokBazaRef.current;
      obrokBazaRef.current = null;
      if (baza != null) {
        setMeal(obrokUpis(baza));
      } else if (mealRatePerDay != null && mealAuto != null) {
        mealTouchedRef.current = false;
        setMeal(fmtMoneyInput(mealAuto));
      }
    }
  };
  // Dok je uključeno, promjena dana odsustva ILI osnove (proRate toggle,
  // šihterica stigne pa mealDays padne) ažurira iznos; ako umanjenje više
  // nije moguće (odsustvo vraćeno na 0 ili šihterica preuzela dane), gasi se
  // checkbox i vraća baza, da skriveni flag ne bi duplo umanjivao.
  useEffect(() => {
    if (!umanjiObrok) return;
    if (!obrokUmanjenjeMoguce) {
      toggleUmanjiObrok(false);
      return;
    }
    setMeal(obrokUpis(umanjeniObrok.iznos));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sickDays, vacationDays, obrokUmanjenjeMoguce, mealDays, mealRatePerDay]);

  // Preview izračun u modalu (bez minimum-base logike — server primjenjuje to).
  // Efektivni bruto = osnovica + minuli rad + uvećanja (po istoj logici kao server).
  const previewBreakdown = useMemo(() => {
    const base = parseMoney(gross);
    if (base <= 0) return null;
    // Satnica = puna osnovica / (contractedHours × 21.75). Pro-rate i
    // contractedHours se poništavaju jer i baza i sati skaliraju proporcionalno.
    // Vidi WORK_DAYS_IN_MONTH_AVG u backend payrollController.
    const hourly =
      base / ((worker.contractedHours ?? 8) * WORK_DAYS_IN_MONTH_AVG);
    // Ogledalo backend snapshot zaokruživanja: svaki iznos na 2 decimale pa
    // zbir na 2 decimale, da preview pokazuje tačno ono što server snima.
    const ot = +(parseNum(overtime) * hourly * (parseNum(overtimeRate) / 100)).toFixed(2);
    const nt = +(parseNum(night) * hourly * (parseNum(nightRate) / 100)).toFixed(2);
    const su = +(parseNum(sunday) * hourly * (parseNum(sundayRate) / 100)).toFixed(2);
    const ho = +(parseNum(holiday) * hourly * (parseNum(holidayRate) / 100)).toFixed(2);
    const uvecanja = +(ot + nt + su + ho).toFixed(2);
    return {
      base,
      overtimeAmt: ot,
      nightAmt: nt,
      sundayAmt: su,
      holidayAmt: ho,
      uvecanja,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gross, overtime, night, sunday, holiday, overtimeRate, nightRate, sundayRate, holidayRate, worker.contractedHours]);

  const yearsOfService = useMemo(
    () => totalYearsOfService(worker, asOfPaymentDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      worker.prijavaDate,
      worker.startDate,
      worker.firstEmploymentDate,
      worker.priorWorkYears,
      asOfPaymentDate,
    ],
  );

  // Multiplikator minulog rada (npr. 10 god × 0,4% = 0,04) sa cap 20%.
  const minuliMultiplier = useMemo(() => {
    const raw = (parseNum(minuliRad) / 100) * yearsOfService;
    return Math.min(raw, MINULI_RAD_CAP);
  }, [minuliRad, yearsOfService]);

  // Efektivni bruto za TAJ mjesec = (osnovica × proRate) + minuli rad + uvećanja.
  // Koristi se za doprinose, porez, neto za isplatu i logiku min osnovice.
  // Ogledalo backend snapshot koraka: skalirana osnovica r2, minuli rad r2,
  // pa zbir r2 (bez ovoga preview zna biti fening pored snimljenog).
  const effectiveGross = useMemo(() => {
    const base = parseMoney(gross);
    if (base <= 0 || !previewBreakdown) return 0;
    const scaledBase = +(base * effectiveProRate).toFixed(2);
    const minuliAmt = +(scaledBase * minuliMultiplier).toFixed(2);
    return +(scaledBase + minuliAmt + previewBreakdown.uvecanja).toFixed(2);
  }, [gross, effectiveProRate, minuliMultiplier, previewBreakdown]);

  // Preview za STVARNI mjesečni obračun (sa minulim radom + uvećanjima
  // + pro-rate-om). Ide u platni listić, uplatnice i MIP-1023.
  const preview = useMemo(() => {
    if (effectiveGross <= 0) return null;
    const ded = deductionFromCoefficient(parseNum(coeff));
    const sal = fromGross(effectiveGross, ded);
    // Korist u naravi: aditivni sloj na preview, isto kao backend snapshot.
    // Diže bruto/doprinose/porez/trošak, neto ostaje (korist se ne isplaćuje).
    const v = koristAktivna
      ? koristNetValueFromConfig(
          koristMetoda,
          parseMoneyInput(koristVrijednost) ?? 0,
          koristSaPdv,
        )
      : 0;
    const k = computeKorist(v);
    if (!k) return sal;
    const empTotal = sal.empTotal + k.empTotal;
    const incomeTax = sal.incomeTax + k.porez;
    const erpTotal = sal.erpTotal + k.erpTotal;
    return {
      ...sal,
      gross: sal.gross + k.koristBruto,
      empPio: sal.empPio + k.empPio,
      empZdravstvo: sal.empZdravstvo + k.empZdravstvo,
      empNezaposlenost: sal.empNezaposlenost + k.empNezaposlenost,
      empTotal,
      taxBase: sal.taxBase + k.taxBase,
      incomeTax,
      erpPio: sal.erpPio + k.erpPio,
      erpZdravstvo: sal.erpZdravstvo + k.erpZdravstvo,
      erpNezaposlenost: sal.erpNezaposlenost + k.erpNezaposlenost,
      erpTotal,
      // net, vodnaNaknada, naknadaNesrece ostaju (vežu se na platu, ne korist).
      // totalCost = neto-bazirana formula (bez nenovčanog dijela koristi).
      totalCost:
        sal.net +
        empTotal +
        incomeTax +
        erpTotal +
        sal.vodnaNaknada +
        sal.naknadaNesrece,
    };
  }, [
    effectiveGross,
    coeff,
    koristAktivna,
    koristMetoda,
    koristVrijednost,
    koristSaPdv,
  ]);

  // Bazni preview (osnovica → neto-po-ugovoru, BEZ minulog rada i uvećanja).
  const basePreview = useMemo(() => {
    const base = parseMoney(gross);
    if (base <= 0) return null;
    const ded = deductionFromCoefficient(parseNum(coeff));
    return fromGross(base, ded);
  }, [gross, coeff]);

  // Cilj-neto preview (osnovica × (1+M) → take-home, BEZ uvećanja). Ovo je
  // ono što radnik prima u "normalan" mjesec bez prekovremenih. Predstavlja
  // anker za tip NETO_ISPLATA. Minuli rad se zaokruži posebno pa sabere,
  // identično backend snapshotu (r2(base) + r2(base×M)), da preview i server
  // uvijek vide isti bruto.
  const ciljNetoPreview = useMemo(() => {
    const base = parseMoney(gross);
    if (base <= 0) return null;
    const ded = deductionFromCoefficient(parseNum(coeff));
    const minuliIznos = +(base * minuliMultiplier).toFixed(2);
    return fromGross(+(base + minuliIznos).toFixed(2), ded);
  }, [gross, coeff, minuliMultiplier]);

  // Sync sva 3 polja kad se promijeni gross OSNOVICA. lastEditRef sprečava
  // loop — ako je user upravo dirao polje X, sync ažurira samo druga dva.
  useEffect(() => {
    const edited = lastEditRef.current;
    lastEditRef.current = "gross"; // reset za sljedeću iteraciju
    if (edited !== "netoUgovor") {
      setNetoUgovorDisplay(
        basePreview && basePreview.net > 0 ? fmtMoneyInput(basePreview.net) : "",
      );
    }
    if (edited !== "netoIsplata") {
      // auto-preview pregazi polje: ono više NE drži ručno ukucanu vrijednost,
      // pa se resetuje i flag (inače bi se auto-vrijednost poslala serveru
      // kao "ručni" cilj i neto opet šetao za fening)
      ciljRucnoRef.current = false;
      setNetoIsplataDisplay(
        ciljNetoPreview && ciljNetoPreview.net > 0
          ? fmtMoneyInput(ciljNetoPreview.net)
          : "",
      );
    }
  }, [basePreview, ciljNetoPreview]);

  const handleNetoUgovorChange = (v: string) => {
    lastEditRef.current = "netoUgovor";
    const formatted = formatMoneyLive(v);
    setNetoUgovorDisplay(formatted);
    const targetNet = parseMoney(formatted);
    if (!Number.isFinite(targetNet) || targetNet <= 0) {
      setGross("");
      return;
    }
    const ded = deductionFromCoefficient(parseNum(coeff));
    // Bazni neto → osnovica direktno (bez dijeljenja sa M).
    const base = fromNet(targetNet, ded).gross;
    if (Number.isFinite(base) && base > 0) {
      setGross(fmtMoneyInput(base));
    } else {
      setGross("");
    }
  };

  const handleNetoIsplataChange = (v: string) => {
    lastEditRef.current = "netoIsplata";
    ciljRucnoRef.current = true;
    const formatted = formatMoneyLive(v);
    setNetoIsplataDisplay(formatted);
    const targetNet = parseMoney(formatted);
    if (!Number.isFinite(targetNet) || targetNet <= 0) {
      setGross("");
      return;
    }
    const ded = deductionFromCoefficient(parseNum(coeff));
    // Cilj-neto → bruto za TAJ neto sa minulim radom → osnovica = / (1+M).
    const fullGross = fromNet(targetNet, ded).gross;
    const minuliM = 1 + minuliMultiplier;
    const base = minuliM > 0 ? fullGross / minuliM : fullGross;
    if (Number.isFinite(base) && base > 0) {
      setGross(fmtMoneyInput(base));
    } else {
      setGross("");
    }
  };

  const calcMutation = useMutation({
    mutationFn: () =>
      unwrap(
        calculatePayroll({
          organizationId: orgId,
          workerId: worker.id,
          year,
          month,
          grossBase: parseMoney(gross),
          minuliRadRate: parseNum(minuliRad),
          taxCoefficient: parseNum(coeff),
          // "Cilj neto za isplatu": backend fening-search prilagodi bruto da
          // finalni neto bude TAČNO ciljni (samo bez uvećanja i pun mjesec).
          // Cilj je iznos iz PROFILA radnika; ono što piše u polju na ekranu
          // šaljemo samo ako ga je korisnik u ovom otvaranju RUČNO ukucao
          // (auto-popunjeni preview zna biti fening pored serverskog neta).
          // NAMJERNO: ručna izmjena BRUTA čiji neto padne unutar ~10 feninga
          // od profila se privuče tačno na profilni cilj (to je semantika
          // NETO_ISPLATA tipa: cilj je sidro); ko želi baš određeni bruto/
          // neto, ukuca cilj ručno i on pobjeđuje.
          ...(worker.salaryType === "NETO_ISPLATA"
            ? (() => {
                const ukucani = parseMoney(netoIsplataDisplay);
                const izProfila = Number(worker.salaryNeto) || 0;
                const cilj =
                  ciljRucnoRef.current && ukucani > 0
                    ? ukucani
                    : izProfila > 0
                      ? izProfila
                      : ukucani;
                return cilj > 0 ? { targetNet: cilj } : {};
              })()
            : {}),
          // Pro-rate factor (0..1) — automatski za mid-month, user može
          // isključiti checkbox-om. Backend skalira osnovicu, minuli rad,
          // i min doprinosnu osnovu.
          ...(effectiveProRate < 1 ? { proRateFactor: effectiveProRate } : {}),
          workedMinutes: workedHours
            ? Math.round(parseNum(workedHours) * 60)
            : null,
          sickDays: parseInt(sickDays, 10) || 0,
          vacationDays: parseInt(vacationDays, 10) || 0,
          overtimeHours: parseNum(overtime),
          nightHours: parseNum(night),
          sundayHours: parseNum(sunday),
          holidayHours: parseNum(holiday),
          overtimeRate: parseNum(overtimeRate),
          nightRate: parseNum(nightRate),
          sundayRate: parseNum(sundayRate),
          holidayRate: parseNum(holidayRate),
          mealAllowance: parseMoney(meal),
          vacationBonus: parseMoney(vacation),
          travelExpense: parseMoney(travel),
          koristVoziloAktivna: koristAktivna,
          koristVoziloMetoda: koristMetoda,
          koristVoziloVrijednost: koristAktivna ? (parseMoneyInput(koristVrijednost) ?? 0) : 0,
          koristVoziloSaPdv: koristSaPdv,
          koristVoziloOpis: koristOpis,
        }),
      ),
    onSuccess: () => {
      // Modal ostaje otvoren — user može dalje pregledati bez gubitka konteksta.
      queryClient.invalidateQueries({
        queryKey: ["payrolls", orgId, year, month],
      });
      queryClient.invalidateQueries({
        queryKey: ["monthlySummary", orgId, year, month],
      });
      // Backend je sticky-upisao stope/naknade na workera — refetch da bi
      // sljedeći mjesec vidio nove default-e.
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      queryClient.invalidateQueries({ queryKey: ["myStats"] });
      setError(null);
    },
    onError: (e: Error) => setError(e.message || "Greška pri obračunu"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => unwrap(deletePayroll(existing!.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payrolls", orgId, year, month],
      });
      queryClient.invalidateQueries({
        queryKey: ["monthlySummary", orgId, year, month],
      });
      // KPI "Obračuna (mj.)" na profilu broji obračune, osvježi ga.
      queryClient.invalidateQueries({ queryKey: ["myStats"] });
      onClose();
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: () => unwrap(patchPayroll(existing!.id, { status: "ISPLACENO" })),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payrolls", orgId, year, month],
      });
      queryClient.invalidateQueries({
        queryKey: ["monthlySummary", orgId, year, month],
      });
      queryClient.invalidateQueries({ queryKey: ["myStats"] });
    },
  });

  // Inline potvrda brisanja (zamjena za native confirm dialog)
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Min. osnovica zavisi od ugovorenog radnog vremena radnika i koeficijenta
  // porezne kartice (Zakon o doprinosima FBiH, čl. 7, izmjene 33/25 od
  // 01.07.2025). Računa se preko helpera iz payrollFbih.
  const minBaseInfo = useMemo(
    () => computeMinContribBase(parseNum(coeff), worker.contractedHours ?? 8),
    [coeff, worker.contractedHours],
  );
  // Warning poredi EFEKTIVNI bruto sa PRORAČUNATIM pragom. Skaliramo min
  // osnovicu sa:
  //   • workedRatio (sati radnika / standardni fond) — npr. bolovanje
  //   • effectiveProRate — mid-month prijava/odjava
  // Tako se warning ne pojavljuje spuriozno za legitimne djelimične mjesece.
  const expectedMonthlyHours =
    (worker.contractedHours ?? 8) * WORK_DAYS_IN_MONTH_AVG;
  const workedH = workedHours ? parseNum(workedHours) : 0;
  const workedRatio =
    workedH > 0 ? Math.min(workedH / expectedMonthlyHours, 1) : 1;
  const minBaseThreshold =
    minBaseInfo.minBase * workedRatio * effectiveProRate;
  const minBaseApplied = effectiveGross > 0 && effectiveGross < minBaseThreshold;

  // Modal se zatvara samo kad je i mousedown i mouseup na backdrop-u.
  // Bez ovoga, drag selekcija iz modala van zatvori modal čim user otpusti miš.
  const mouseDownOnBackdropRef = useRef(false);

  // ── Dirty tracking + auto-save na zatvaranje ──────────────────────────────
  // Korisnik može unijeti dodatak (npr. topli obrok 300 KM) i zatvoriti modal —
  // vrijednost se automatski sprema da bi "Obračunaj sve" kasnije imala podatke.
  const numericFromExisting = (v: number | null | undefined, fallback = 0) =>
    v != null ? Number(v) : fallback;

  const isDirty = useMemo(() => {
    const cur = {
      gross: parseMoney(gross),
      coeff: parseNum(coeff),
      minuli: parseNum(minuliRad),
      workedMinutes: workedHours ? Math.round(parseNum(workedHours) * 60) : null,
      sickDays: parseInt(sickDays, 10) || 0,
      vacationDays: parseInt(vacationDays, 10) || 0,
      overtime: parseNum(overtime),
      night: parseNum(night),
      sunday: parseNum(sunday),
      holiday: parseNum(holiday),
      overtimeRate: parseNum(overtimeRate),
      nightRate: parseNum(nightRate),
      sundayRate: parseNum(sundayRate),
      holidayRate: parseNum(holidayRate),
      meal: parseMoney(meal),
      vacation: parseMoney(vacation),
      travel: parseMoney(travel),
      koristAktivna,
      koristVrijednost: koristAktivna ? (parseMoneyInput(koristVrijednost) ?? 0) : 0,
      koristMetoda,
      koristSaPdv,
      koristOpis: koristOpis.trim(),
    };
    // Originalna bruto OSNOVICA — koristi shared helper (vidi computeWorkerGrossBase).
    const origGrossFromWorker = (() => {
      const v = computeWorkerGrossBase(worker, asOfPaymentDate);
      return v > 0 ? Number(v.toFixed(2)) : 0;
    })();
    // VAŽNO: existing.gross UKLJUČUJE minuli rad, pa za usporedbu osnovice
    // gledamo samo existing.grossBase (ako je upisan).
    const existingGrossNum =
      existing && existing.grossBase != null ? Number(existing.grossBase) : 0;
    const orig = {
      gross: existingGrossNum > 0 ? existingGrossNum : origGrossFromWorker,
      coeff: existing
        ? Number(existing.taxCoefficient)
        : Number(worker.taxCoefficient ?? 1),
      minuli: existing?.minuliRadRate != null
        ? Number(existing.minuliRadRate)
        : Number(worker.minuliRadRate ?? 0.4),
      workedMinutes: existing?.workedMinutes ?? null,
      sickDays: numericFromExisting(existing?.sickDays),
      vacationDays: numericFromExisting(existing?.vacationDays),
      overtime: numericFromExisting(existing?.overtimeHours),
      night: numericFromExisting(existing?.nightHours),
      sunday: numericFromExisting(existing?.sundayHours),
      holiday: numericFromExisting(existing?.holidayHours),
      overtimeRate: existing?.overtimeRate != null
        ? Number(existing.overtimeRate)
        : Number(worker.overtimeRate ?? 25),
      nightRate: existing?.nightRate != null
        ? Number(existing.nightRate)
        : Number(worker.nightRate ?? 25),
      sundayRate: existing?.sundayRate != null
        ? Number(existing.sundayRate)
        : Number(worker.sundayRate ?? 20),
      holidayRate: existing?.holidayRate != null
        ? Number(existing.holidayRate)
        : Number(worker.holidayRate ?? 50),
      meal: existing?.mealAllowance != null
        ? Number(existing.mealAllowance)
        : Number(worker.defaultMealAllowance ?? 0),
      vacation: numericFromExisting(existing?.vacationBonus),
      travel: existing?.travelExpense != null
        ? Number(existing.travelExpense)
        : Number(worker.travelAllowancePerMonth ?? 0),
      koristAktivna: existing
        ? Number(existing.koristBruto) > 0
        : !!worker.koristVoziloAktivna,
      koristVrijednost: (existing
        ? Number(existing.koristBruto) > 0
        : !!worker.koristVoziloAktivna)
        ? Number(worker.koristVoziloVrijednost ?? 0)
        : 0,
      koristMetoda: worker.koristVoziloMetoda || "nabavna_1posto",
      koristSaPdv:
        worker.koristVoziloSaPdv == null ? true : !!worker.koristVoziloSaPdv,
      koristOpis: (worker.koristVoziloOpis || "").trim(),
    };
    return (
      cur.gross !== orig.gross ||
      cur.coeff !== orig.coeff ||
      cur.minuli !== orig.minuli ||
      cur.workedMinutes !== orig.workedMinutes ||
      cur.sickDays !== orig.sickDays ||
      cur.vacationDays !== orig.vacationDays ||
      cur.overtime !== orig.overtime ||
      cur.night !== orig.night ||
      cur.sunday !== orig.sunday ||
      cur.holiday !== orig.holiday ||
      cur.overtimeRate !== orig.overtimeRate ||
      cur.nightRate !== orig.nightRate ||
      cur.sundayRate !== orig.sundayRate ||
      cur.holidayRate !== orig.holidayRate ||
      cur.meal !== orig.meal ||
      cur.vacation !== orig.vacation ||
      cur.travel !== orig.travel ||
      cur.koristAktivna !== orig.koristAktivna ||
      cur.koristVrijednost !== orig.koristVrijednost ||
      cur.koristMetoda !== orig.koristMetoda ||
      cur.koristSaPdv !== orig.koristSaPdv ||
      cur.koristOpis !== orig.koristOpis
    );
  }, [
    gross, coeff, minuliRad, workedHours, sickDays, vacationDays, overtime, night, sunday, holiday,
    overtimeRate, nightRate, sundayRate, holidayRate,
    meal, vacation, travel, existing, worker,
    koristAktivna, koristVrijednost, koristMetoda, koristSaPdv, koristOpis,
  ]);

  const isSavingRef = useRef(false);
  const handleClose = async () => {
    if (isDirty && !isSavingRef.current) {
      isSavingRef.current = true;
      try {
        // SAMO sprema input polja, ne pokreće puni obračun. Korisnik mora
        // eksplicitno kliknuti "Obračunaj" ili "Obračunaj sve" za izračun.
        await unwrap(
          savePayrollInputs({
            organizationId: orgId,
            workerId: worker.id,
            year,
            month,
            workedMinutes: workedHours
              ? Math.round(parseNum(workedHours) * 60)
              : null,
            sickDays: parseInt(sickDays, 10) || 0,
            vacationDays: parseInt(vacationDays, 10) || 0,
            overtimeHours: parseNum(overtime),
            nightHours: parseNum(night),
            sundayHours: parseNum(sunday),
            holidayHours: parseNum(holiday),
            overtimeRate: parseNum(overtimeRate),
            nightRate: parseNum(nightRate),
            sundayRate: parseNum(sundayRate),
            holidayRate: parseNum(holidayRate),
            mealAllowance: parseMoney(meal),
            vacationBonus: parseMoney(vacation),
            travelExpense: parseMoney(travel),
            taxCoefficient: parseNum(coeff),
            minuliRadRate: parseNum(minuliRad),
            koristVoziloAktivna: koristAktivna,
            koristVoziloMetoda: koristMetoda,
            koristVoziloVrijednost: koristAktivna ? (parseMoneyInput(koristVrijednost) ?? 0) : 0,
            koristVoziloSaPdv: koristSaPdv,
            koristVoziloOpis: koristOpis,
          }),
        );
        queryClient.invalidateQueries({
          queryKey: ["payrolls", orgId, year, month],
        });
        queryClient.invalidateQueries({
          queryKey: ["monthlySummary", orgId, year, month],
        });
        queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      } catch {
        // ako spremanje pukne, ipak zatvori — error se vidi u toast / tabeli
      } finally {
        isSavingRef.current = false;
      }
    }
    onClose();
  };

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(e) => {
        mouseDownOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) {
          handleClose();
        }
        mouseDownOnBackdropRef.current = false;
      }}
    >
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Obračun, {worker.firstName} {worker.lastName} · {MONTHS[month - 1]} {year}
          </h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={handleClose}
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Osnovica, koeficijent i minuli rad</div>
            {/* Tri sinhronizovana polja, promjena bilo kojeg ažurira druga dva.
                Tag "Tip plate radnika" označava koje polje je ugovorno fiksirano
                (postavlja se u profilu radnika). */}
            {(() => {
              const tagStyle: CSSProperties = {
                display: "inline-block",
                fontSize: "0.7rem",
                fontWeight: 600,
                background: "#3a5c42",
                color: "white",
                padding: "0.1rem 0.45rem",
                borderRadius: 4,
                lineHeight: 1.4,
              };
              // Tag se prikazuje u "rezervisanom" redu IZNAD label-teksta.
              // Rezervisani red ima istu visinu i za polja bez taga (prazan
              // span), tako da sva 3 input-a u .grid3 ostaju u istom redu —
              // bez obzira koji tip je aktivan.
              const renderLabel = (text: string, ownType: SalaryType) => (
                <label className={styles.fieldLabel}>
                  <span
                    style={{
                      display: "block",
                      minHeight: "1.2rem",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {workerSalaryType === ownType && (
                      <span style={tagStyle}>Ugovor</span>
                    )}
                  </span>
                  {text}
                </label>
              );
              return (
                <>
                  <div className={styles.grid3}>
                    <div className={styles.field}>
                      {renderLabel("Bruto osnovica (KM)", "BRUTO")}
                      <input
                        className={styles.input}
                        type="text"
                        inputMode="decimal"
                        value={gross}
                        onChange={(e) => {
                          lastEditRef.current = "gross";
                          setGross(formatMoneyLive(e.target.value));
                        }}
                        onBlur={(e) => setGross(formatMoneyBlur(e.target.value))}
                        placeholder="Iz ugovora"
                      />
                    </div>
                    <div className={styles.field}>
                      {renderLabel("Neto po ugovoru (KM)", "NETO_UGOVOR")}
                      <input
                        className={styles.input}
                        type="text"
                        inputMode="decimal"
                        value={netoUgovorDisplay}
                        onChange={(e) => handleNetoUgovorChange(e.target.value)}
                        onBlur={(e) =>
                          setNetoUgovorDisplay(formatMoneyBlur(e.target.value))
                        }
                        placeholder="Iz ugovora"
                      />
                      <p className={styles.note} style={{ margin: "0.3rem 0 0" }}>
                        Neto iz ugovora, bez staža
                      </p>
                    </div>
                    <div className={styles.field}>
                      {renderLabel("Cilj neto za isplatu (KM)", "NETO_ISPLATA")}
                      <input
                        className={styles.input}
                        type="text"
                        inputMode="decimal"
                        value={netoIsplataDisplay}
                        onChange={(e) => handleNetoIsplataChange(e.target.value)}
                        onBlur={(e) =>
                          setNetoIsplataDisplay(formatMoneyBlur(e.target.value))
                        }
                        placeholder="Što prima"
                      />
                      <p className={styles.note} style={{ margin: "0.3rem 0 0" }}>
                        Iznos koji radnik dobija svaki mjesec
                      </p>
                    </div>
                  </div>
                  <p
                    className={styles.note}
                    style={{ margin: "0.5rem 0 0", fontSize: "0.78rem" }}
                  >
                    Tip plate iz profila: <strong>{SALARY_TYPE_LABELS[workerSalaryType]}</strong>
                    {", "}promjena bilo kojeg polja ažurira druga dva.
                  </p>
                </>
              );
            })()}
            {/* Pro-rate toggle, pojavljuje se samo ako je radnik prijavljen
                ili odjavljen unutar obračun mjeseca (autoProRate < 1). */}
            {autoProRate < 1 && (
              <div
                style={{
                  marginTop: "0.8rem",
                  padding: "0.7rem 0.9rem",
                  background: "var(--color-warning-bg, #f2dec0)",
                  border: "1px solid #f59e0b",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={proRateEnabled}
                    onChange={(e) => setProRateEnabled(e.target.checked)}
                  />
                  <span>
                    Razmjerno za djelimičan mjesec
                    {" "}
                    <strong>
                      ({(autoProRate * 100).toFixed(0)}% radnih dana)
                    </strong>
                  </span>
                </label>
                <p
                  className={styles.note}
                  style={{ margin: "0.3rem 0 0", color: "var(--color-warning, #8a4f10)" }}
                >
                  Osnovica, minuli rad i min. doprinosna osnova se skaliraju
                  faktorom. Isključi ako želiš puni iznos (npr. otpremnina).
                </p>
              </div>
            )}
            <div className={styles.grid2} style={{ marginTop: "0.8rem" }}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Porezni koeficijent (1.0 = 300 KM odbitka)
                </label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={coeff}
                  onChange={(e) => setCoeff(sanitizeDecimalInput(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Minuli rad (% godišnje)
                </label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={minuliRad}
                  onChange={(e) => setMinuliRad(e.target.value)}
                  placeholder="0,4"
                />
                {(() => {
                  // Posljednji dan obračunskog mjeseca kao "as-of" datum.
                  const asOf = new Date(year, month, 0)
                    .toISOString()
                    .slice(0, 10);
                  const years = totalYearsOfService(worker, asOf);
                  const baseN = parseMoney(gross);
                  const rateN = parseNum(minuliRad);
                  const rawMultiplier = (rateN / 100) * years;
                  const capped = rawMultiplier > MINULI_RAD_CAP;
                  const effMultiplier = Math.min(rawMultiplier, MINULI_RAD_CAP);
                  const amt = +(baseN * effMultiplier).toFixed(2);
                  const hasStazInfo =
                    !!worker.prijavaDate ||
                    !!worker.startDate ||
                    !!worker.firstEmploymentDate ||
                    worker.priorWorkYears != null;
                  if (!hasStazInfo) {
                    return (
                      <p className={styles.note} style={{ margin: "0.3rem 0 0" }}>
                        Nije postavljen datum prijave ni prethodni staž
                      </p>
                    );
                  }
                  const rateLabel = rateN.toLocaleString("de-DE", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  });
                  return (
                    <p className={styles.note} style={{ margin: "0.3rem 0 0" }}>
                      {capped
                        ? `${years} god. staža × ${rateLabel}% = ${(rawMultiplier * 100).toFixed(1)}% → ograničeno na max. 20% × ${fmtKM(baseN)} = ${fmtKM(amt)} KM`
                        : `${years} god. staža × ${rateLabel}% × ${fmtKM(baseN)} = ${fmtKM(amt)} KM`}
                    </p>
                  );
                })()}
              </div>
            </div>
            {minBaseApplied && (
              <div className={styles.warning}>
                {minBaseInfo.workTimeCategory === "FULL" && (
                  <>
                    Bruto je ispod zakonske minimalne osnovice za doprinose
                    ({fmtKM(minBaseInfo.minBase)} KM, Zakon o doprinosima FBiH čl. 7).
                    Obračun se izvršava na unesenu bruto platu, provjeri da li
                    je iznos ispravan.
                  </>
                )}
                {minBaseInfo.workTimeCategory === "PART_OVER_4" && (
                  <>
                    Radnik je na nepunom radnom vremenu ({minBaseInfo.contractedHours}h).
                    Zakon o doprinosima FBiH (čl. 7, izmjene 33/25 od 01.07.2025) NE
                    dozvoljava srazmjerno smanjenje minimalne osnovice, minimum
                    je puna osnovica ({fmtKM(minBaseInfo.minBase)} KM), a bruto je
                    ispod toga. Provjeri iznos.
                  </>
                )}
                {minBaseInfo.workTimeCategory === "PART_UNDER_4" && (
                  <>
                    Nepuno radno vrijeme ({minBaseInfo.contractedHours}h). Srazmjerna
                    minimalna osnovica je {fmtKM(minBaseInfo.minBase)} KM (min. 50% od
                    pune osnovice {fmtKM(minBaseInfo.fullMinBase)} KM), a bruto je
                    ispod toga. Provjeri iznos.
                  </>
                )}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Radni sati</div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "0.5rem",
                  }}
                >
                  <label className={styles.fieldLabel}>Odrađeni sati</label>
                  {hasSihterica ? (
                    <button
                      type="button"
                      onClick={() => setWorkedHours(minutesToHoursStr(sihMinutes))}
                      title={`Upiši ${minutesToHoursLabel(sihMinutes)} iz šihterice`}
                      style={{
                        background: "transparent",
                        border: 0,
                        padding: 0,
                        font: "inherit",
                        fontSize: "0.78rem",
                        color: "var(--sage, #3a5c42)",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Iz šihterice ({minutesToHoursLabel(sihMinutes)})
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--mid, #888)",
                      }}
                    >
                      Šihterica nije popunjena
                    </span>
                  )}
                </div>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={workedHours}
                  onChange={(e) => setWorkedHours(e.target.value)}
                  placeholder={`Standard: ${standardMinutesForMonth(year, month, worker.contractedHours ?? 8) / 60}h`}
                />
              </div>
              <div className={styles.field}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "0.5rem",
                  }}
                >
                  <label className={styles.fieldLabel}>Dani bolovanja (1–42)</label>
                  {sihSickDays > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSickDays(String(Math.min(sihSickDays, 42)))
                      }
                      title={`Upiši ${sihSickDays} dana (šifra 9.3) iz šihterice`}
                      style={{
                        background: "transparent",
                        border: 0,
                        padding: 0,
                        font: "inherit",
                        fontSize: "0.78rem",
                        color: "var(--sage, #3a5c42)",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Iz šihterice ({sihSickDays})
                    </button>
                  )}
                </div>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={42}
                  value={sickDays}
                  onChange={(e) => {
                    sickTouchedRef.current = true;
                    setSickDays(e.target.value);
                  }}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Dani godišnjeg odmora</label>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={31}
                  value={vacationDays}
                  onChange={(e) => setVacationDays(e.target.value)}
                />
              </div>
              {obrokUmanjenjeMoguce && (
                <div
                  style={{
                    alignSelf: "end",
                    padding: "0.55rem 0.7rem",
                    background: umanjiObrok
                      ? "color-mix(in srgb, var(--sage, #3a5c42) 10%, transparent)"
                      : "transparent",
                    border: umanjiObrok
                      ? "1px solid var(--sage, #3a5c42)"
                      : "1px solid var(--border, #d4cfc4)",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    transition: "border-color .15s, background .15s",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={umanjiObrok}
                      onChange={(e) => toggleUmanjiObrok(e.target.checked)}
                      style={{
                        marginTop: 2,
                        accentColor: "var(--sage, #3a5c42)",
                      }}
                    />
                    <span>
                      Umanji topli obrok za dane odsustva
                      <br />
                      <span
                        className={styles.note}
                        style={{ fontSize: "0.78rem" }}
                      >
                        {umanjeniObrok.baza != null
                          ? `${fmtKM(umanjeniObrok.baza)} ÷ ${umanjeniObrok.ukupno} × ${umanjeniObrok.prisutno} ${umanjeniObrok.prisutno === 1 ? "dan" : "dana"} na radu = ${fmtKM(umanjeniObrok.iznos)} KM`
                          : `${fmtKM(mealRatePerDay ?? 0)} KM × ${umanjeniObrok.prisutno} od ${umanjeniObrok.ukupno} dana = ${fmtKM(umanjeniObrok.iznos)} KM`}
                      </span>
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Uvećanja</div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Prekovremeni, sati</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={overtime}
                  onChange={(e) => setOvertime(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Prekovremeni, stopa (%)</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  placeholder="25"
                  value={overtimeRate}
                  onChange={(e) => setOvertimeRate(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Noćni rad, sati</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={night}
                  onChange={(e) => setNight(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Noćni rad, stopa (%)</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  placeholder="25"
                  value={nightRate}
                  onChange={(e) => setNightRate(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nedjelja, sati</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={sunday}
                  onChange={(e) => setSunday(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nedjelja, stopa (%)</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  placeholder="20"
                  value={sundayRate}
                  onChange={(e) => setSundayRate(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Praznici, sati</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={holiday}
                  onChange={(e) => setHoliday(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Praznici, stopa (%)</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  placeholder="50"
                  value={holidayRate}
                  onChange={(e) => setHolidayRate(e.target.value)}
                />
              </div>
            </div>
            {previewBreakdown && previewBreakdown.uvecanja > 0 && (
              <p className={styles.note}>
                Ukupno uvećanja: <strong>{fmtKM(previewBreakdown.uvecanja)} KM</strong>, dodaje se na bruto osnovicu.
              </p>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Neoporezivi dodaci (KM)</div>
            <div className={styles.grid3}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Topli obrok</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={meal}
                  onChange={(e) => {
                    mealTouchedRef.current = true;
                    // ručni unos preuzima kontrolu: gasi umanjenje za odsustva
                    setUmanjiObrok(false);
                    obrokBazaRef.current = null;
                    setMeal(formatMoneyLive(e.target.value));
                  }}
                  onBlur={(e) => setMeal(formatMoneyBlur(e.target.value))}
                />
                {mealRatePerDay != null && mealAuto != null && (
                  <div className={styles.note}>
                    {fmtKM(mealRatePerDay)} KM × {mealDays}{" "}
                    {mealDays === 1 ? "dan" : "dana"} = {fmtKM(mealAuto)} KM{" "}
                    {hasSihterica
                      ? "(dani iz šihterice)"
                      : "(standardni radni dani)"}
                    {Math.abs(parseMoney(meal) - mealAuto) > 0.005 && (
                      <button
                        type="button"
                        className={styles.linkInline}
                        onClick={() => {
                          mealTouchedRef.current = false;
                          // puni auto iznos: gasi i umanjenje za odsustva
                          setUmanjiObrok(false);
                          obrokBazaRef.current = null;
                          setMeal(fmtMoneyInput(mealAuto));
                        }}
                      >
                        vrati na auto
                      </button>
                    )}
                  </div>
                )}
                {mealRatePerDay != null &&
                  mealRatePerDay > MEAL_ALLOWANCE_TAXFREE_PER_DAY && (
                    <div className={styles.warning}>
                      Dnevna stopa je iznad neoporezivog maksimuma (oko{" "}
                      {MEAL_ALLOWANCE_TAXFREE_PER_DAY} KM/dan za 2026). Višak se
                      oporezuje kao dio plate.
                    </div>
                  )}
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Regres</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={vacation}
                  onChange={(e) => setVacation(formatMoneyLive(e.target.value))}
                  onBlur={(e) => setVacation(formatMoneyBlur(e.target.value))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Putni trošak</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={travel}
                  onChange={(e) => {
                    travelTouchedRef.current = true;
                    setTravel(formatMoneyLive(e.target.value));
                  }}
                  onBlur={(e) => setTravel(formatMoneyBlur(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Korist u naravi, službeno vozilo</div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                cursor: "pointer",
                marginBottom: koristAktivna ? "0.75rem" : 0,
              }}
            >
              <input
                type="checkbox"
                checked={koristAktivna}
                onChange={(e) => setKoristAktivna(e.target.checked)}
                style={{ width: 17, height: 17, accentColor: "var(--sage, #3a5c42)" }}
              />
              <span style={{ fontSize: 13.5 }}>
                Radnik koristi službeno vozilo u privatne svrhe (bez putnih naloga)
              </span>
            </label>
            {koristAktivna && (
              <>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Metoda utvrđivanja</label>
                    <StyledSelect
                      ariaLabel="Metoda koristi"
                      value={koristMetoda}
                      onChange={(v) => setKoristMetoda(String(v))}
                      groups={[
                        {
                          options: [
                            { value: "nabavna_1posto", label: "1% nabavne vrijednosti (mjesečno)" },
                            { value: "lizing_20posto", label: "20% rate lizinga / najma" },
                            { value: "stvarni_km", label: "Stvarni pređeni km (opcionalno)" },
                          ],
                        },
                      ]}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>
                      {koristMetoda === "lizing_20posto"
                        ? "Mjesečna rata (sa PDV)"
                        : koristMetoda === "stvarni_km"
                          ? "Pređeni privatni km"
                          : "Nabavna vrijednost (sa PDV)"}
                    </label>
                    <input
                      className={styles.input}
                      type="text"
                      inputMode="decimal"
                      value={koristVrijednost}
                      onChange={(e) => setKoristVrijednost(formatMoneyLive(e.target.value))}
                      onBlur={() =>
                        koristMetoda !== "stvarni_km" &&
                        setKoristVrijednost(formatMoneyBlur(koristVrijednost))
                      }
                    />
                  </div>
                </div>
                {koristMetoda !== "stvarni_km" && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={koristSaPdv}
                      onChange={(e) => setKoristSaPdv(e.target.checked)}
                    />
                    <span style={{ fontSize: 12.5, color: "var(--mid)" }}>
                      Unesena vrijednost je sa PDV-om (ako nije, dodaje se 17%)
                    </span>
                  </label>
                )}
                <div className={styles.field} style={{ marginTop: "0.5rem" }}>
                  <label className={styles.fieldLabel}>Opis vozila (model, tablice)</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={koristOpis}
                    onChange={(e) => setKoristOpis(e.target.value)}
                    placeholder="npr. VW Passat, A12-B-345"
                  />
                </div>
                {(() => {
                  const v = koristNetValueFromConfig(
                    koristMetoda,
                    parseMoneyInput(koristVrijednost) ?? 0,
                    koristSaPdv,
                  );
                  const k = computeKorist(v);
                  if (!k) return null;
                  const dodatniTrosak = +(k.empTotal + k.porez + k.erpTotal).toFixed(2);
                  return (
                    <div className={styles.note} style={{ marginTop: "0.6rem" }}>
                      Bruto korist: <strong>{fmtKM(k.koristBruto)} KM</strong>, dodaje se na
                      osnovicu za doprinose i porez. Dodatni trošak poslodavca:{" "}
                      <strong>{fmtKM(dodatniTrosak)} KM</strong> (doprinosi + porez). Neto
                      radnika se ne mijenja, korist se ne isplaćuje.
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {preview && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Preliminarni izračun</div>
              <div className={styles.resultGrid}>
                <span className={styles.label}>Bruto</span>
                <span className={styles.value}>{fmtKM(preview.gross)} KM</span>

                {koristAktivna &&
                  (parseMoneyInput(koristVrijednost) ?? 0) > 0 && (
                    <>
                      <span className={styles.label} style={{ color: "var(--mid)" }}>
                        od toga korist u naravi
                      </span>
                      <span className={styles.value} style={{ color: "var(--mid)" }}>
                        {fmtKM(
                          computeKorist(
                            koristNetValueFromConfig(
                              koristMetoda,
                              parseMoneyInput(koristVrijednost) ?? 0,
                              koristSaPdv,
                            ),
                          )?.koristBruto ?? 0,
                        )}{" "}
                        KM
                      </span>
                    </>
                  )}

                <span className={styles.label}>Doprinosi iz plate (31%)</span>
                <span className={styles.value}>{fmtKM(preview.empTotal)} KM</span>

                <span className={styles.label}>Porez na dohodak (10%)</span>
                <span className={styles.value}>{fmtKM(preview.incomeTax)} KM</span>

                <span className={`${styles.label} ${styles.strong}`}>
                  Neto za isplatu
                </span>
                <span className={`${styles.value} ${styles.strong}`}>
                  {fmtKM(preview.net)} KM
                </span>

                <span className={styles.label}>Doprinosi na platu (5%)</span>
                <span className={styles.value}>{fmtKM(preview.erpTotal)} KM</span>

                <span className={styles.label}>Vodna + nesreće (1% × neto)</span>
                <span className={styles.value}>
                  {fmtKM(preview.vodnaNaknada + preview.naknadaNesrece)} KM
                </span>

                <span className={`${styles.label} ${styles.strong}`}>
                  Ukupan trošak poslodavca
                </span>
                <span className={`${styles.value} ${styles.strong}`}>
                  {fmtKM(
                    preview.totalCost +
                      parseMoney(meal) +
                      parseMoney(vacation) +
                      parseMoney(travel),
                  )}{" "}
                  KM
                </span>
              </div>
              <p className={styles.note}>
                Doprinosi se obračunavaju na stvarnu bruto platu. Konačni
                izračun se snima u snapshot pri klikanju &quot;Obračunaj&quot;.
              </p>
            </div>
          )}

          {error && <div className={styles.errorMsg}>{error}</div>}

          {calcMutation.isSuccess && !error && (
            <div className={styles.warning} style={{ background: "var(--color-success-bg, #d8ebe1)", borderColor: "var(--color-success, #2d6e54)", color: "var(--color-success, #2d6e54)" }}>
              Obračun sačuvan. Možeš nastaviti uređivanje ili zatvoriti obračun.
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {existing && !confirmDelete && (
            <button
              type="button"
              className={`${styles.btnDanger} ${styles.left}`}
              onClick={() => setConfirmDelete(true)}
              disabled={deleteMutation.isPending}
            >
              Obriši
            </button>
          )}
          {existing && confirmDelete && (
            <div className={styles.left} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#b91c1c" }}>
                Sigurno obrisati obračun?
              </span>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Brišem…" : "Da, obriši"}
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
              >
                Otkaži
              </button>
            </div>
          )}
          {existing && existing.status !== "ISPLACENO" && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => markPaidMutation.mutate()}
              disabled={markPaidMutation.isPending}
            >
              {markPaidMutation.isPending ? "…" : "Označi kao isplaćeno"}
            </button>
          )}
          <button type="button" className={styles.btnGhost} onClick={handleClose}>
            Zatvori
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setError(null);
              calcMutation.mutate();
            }}
            disabled={calcMutation.isPending || parseMoney(gross) <= 0}
          >
            {calcMutation.isPending ? "Obračunavanje…" : "Obračunaj"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mock preview za neulogovane korisnike ───────────────────────────────────
// Statički primjer popunjenog mjesečnog obračuna sa 3 fiktivna radnika.
// Pokazuje šta korisnik dobija nakon registracije, plus daje AdSense
// crawler-u stvarni HTML sadržaj tabele.
const MOCK_ROWS: Array<{
  name: string;
  position: string;
  gross: number;
  coef: number;
  hours: string;
  net: number;
  cost: number;
}> = [
  {
    name: "Radnik 1",
    position: "Primjer radnog mjesta",
    gross: 2400,
    coef: 1.0,
    hours: "168h",
    net: 1520.4,
    cost: 2676.0,
  },
  {
    name: "Radnik 2",
    position: "Primjer radnog mjesta",
    gross: 1850,
    coef: 1.0,
    hours: "168h",
    net: 1178.85,
    cost: 2062.75,
  },
  {
    name: "Radnik 3",
    position: "Primjer radnog mjesta",
    gross: 1500,
    coef: 1.0,
    hours: "168h",
    net: 961.5,
    cost: 1672.5,
  },
];

// Pre-izračunate uplatnice za Kanton Sarajevo (mockup).
// Brojke su izračunate iz MOCK_ROWS (3 radnika, bruto 2400+1850+1500=5750 KM):
//   Doprinosi iz (31%): 1782,50 (PIO 977,50 + Zdr 718,75 + Nez 86,25)
//   Doprinosi na (10,5%): 603,75 (PIO 345 + Zdr 230 + Nez 28,75)
//   Vodna 0,5%: 28,75 ; Zaštita 0,5%: 28,75 ; Porez 10% na 3067,50 → 306,75
// Suma uplatnica: 1322,50 + 851,98 + 96,77 + 80,50 + 34,50 + 306,75 + 28,75 + 28,75 = 2750,50 KM
const MOCK_UPLATNICE: Array<{
  title: string;
  sifra: string;
  iznos: number;
  racun: string;
  primalac: string[];
  budzetOrg: string;
}> = [
  {
    title: "PIO/MIO doprinos",
    sifra: "712112",
    iznos: 1322.5,
    racun: "102-050-00001066-86",
    primalac: ["Budžet Federacije BiH", "Doprinos za PIO/MIO"],
    budzetOrg: "5102001",
  },
  {
    title: "Zdravstvo, kantonalni (89,8%), Kanton Sarajevo",
    sifra: "712111",
    iznos: 851.98,
    racun: "154-921-20146172-45",
    primalac: ["Zavod zdravstvenog osiguranja", "Kantona Sarajevo"],
    budzetOrg: "0000000",
  },
  {
    title: "Zdravstvo, federalni (10,2%)",
    sifra: "712111",
    iznos: 96.77,
    racun: "102-050-00000640-18",
    primalac: ["Zavod zdravstvenog osiguranja i reosiguranja FBiH"],
    budzetOrg: "0000000",
  },
  {
    title: "Nezaposlenost, kantonalni (70%), Kanton Sarajevo",
    sifra: "712113",
    iznos: 80.5,
    racun: "154-921-20101710-56",
    primalac: ["Kantonalna služba za zapošljavanje", "Kantona Sarajevo"],
    budzetOrg: "0000000",
  },
  {
    title: "Nezaposlenost, federalni (30%)",
    sifra: "712113",
    iznos: 34.5,
    racun: "161-000-00285700-03",
    primalac: ["Federalni zavod za zapošljavanje"],
    budzetOrg: "0000000",
  },
  {
    title: "Porez na dohodak, Kanton Sarajevo (Centar)",
    sifra: "716111",
    iznos: 306.75,
    racun: "141-196-53200084-75",
    primalac: ["Budžet Kantona Sarajevo", "Općina Centar"],
    budzetOrg: "0077001",
  },
  {
    title: "Opća vodna naknada, Kanton Sarajevo",
    sifra: "722529",
    iznos: 28.75,
    racun: "141-196-53200084-75",
    primalac: ["Budžet Kantona Sarajevo"],
    budzetOrg: "0077001",
  },
  {
    title: "Zaštita od prirodnih i drugih nesreća, Kanton Sarajevo",
    sifra: "722581",
    iznos: 28.75,
    racun: "141-196-53200084-75",
    primalac: ["Budžet Kantona Sarajevo"],
    budzetOrg: "0077001",
  },
];

function MockObracunPreview() {
  // Bruto totals
  const totalGross = MOCK_ROWS.reduce((s, r) => s + r.gross, 0); // 5750
  const totalNet = MOCK_ROWS.reduce((s, r) => s + r.net, 0); // 3660.75
  const totalCost = MOCK_ROWS.reduce((s, r) => s + r.cost, 0); // 6411.25
  // Breakdown za top stat row (PIO+Zdr+Nez)
  const totalEmpContrib = 1782.5; // 31% iz plate
  const totalErpContrib = 603.75; // 10.5% na plate
  const totalTax = 306.75; // porez na dohodak
  // Zbir svih uplatnica
  const totalUplatnice = MOCK_UPLATNICE.reduce((s, u) => s + u.iznos, 0); // 2750.50

  const mockBtnDisabled: React.CSSProperties = {
    pointerEvents: "none",
    opacity: 0.85,
  };

  return (
    <>
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
        <span style={{ flexShrink: 0, fontSize: 18, lineHeight: 1 }}>🧪</span>
        <div style={{ flex: 1 }}>
          <strong>Primjer mjesečnog obračuna</strong>, ovako izgleda popunjen
          obračun za 3 radnika u FBiH (Kanton Sarajevo). Brojke su izračunate
          po važećim stopama (PIO/MIO 17%, zdravstvo 12.5%, nezaposlenost
          1.5%, porez na dohodak 10% sa ličnim odbitkom 300 KM).{" "}
          <Link
            href="/registracija"
            style={{
              color: "var(--sage)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Registruj se besplatno →
          </Link>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Radnik</th>
              <th className={styles.num}>Bruto</th>
              <th className={styles.num}>Koef.</th>
              <th className={styles.num}>Sati</th>
              <th className={styles.num}>Neto</th>
              <th className={styles.num}>Trošak</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ROWS.map((r) => (
              <tr key={r.name}>
                <td>
                  <span className={`${styles.badge} ${styles.badgeOk}`}>
                    Obračunato
                  </span>
                </td>
                <td>
                  <strong>{r.name}</strong>
                  <div className={styles.muted} style={{ fontSize: "0.8rem" }}>
                    {r.position}
                  </div>
                </td>
                <td className={styles.num}>{fmtKM(r.gross)}</td>
                <td className={styles.num}>{r.coef.toFixed(2)}</td>
                <td className={styles.num}>{r.hours}</td>
                <td className={styles.num}>{fmtKM(r.net)}</td>
                <td className={styles.num}>{fmtKM(r.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top summary bar, identičan stvarnom obračunu */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Radnika obračunato</span>
          <span className={styles.summaryValue}>{MOCK_ROWS.length}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Ukupno neto</span>
          <span className={styles.summaryValue}>{fmtKM(totalNet)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Porez na dohodak</span>
          <span className={styles.summaryValue}>{fmtKM(totalTax)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Doprinosi iz</span>
          <span className={styles.summaryValue}>{fmtKM(totalEmpContrib)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Doprinosi na</span>
          <span className={styles.summaryValue}>{fmtKM(totalErpContrib)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Ukupan trošak</span>
          <span className={styles.summaryValue}>{fmtKM(totalCost)} KM</span>
        </div>
      </div>

      {/* Pregled mjeseca */}
      <section style={{ marginTop: "2rem" }}>
        <h2
          style={{
            fontFamily: "DM Serif Display, serif",
            fontSize: "1.4rem",
            margin: "0 0 0.5rem",
          }}
        >
          Pregled mjeseca, primjer
        </h2>
        <p
          className={styles.muted}
          style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}
        >
          Doprinosi i porezi se uplaćuju zbirno za sve radnike u jednoj
          uplatnici po vrsti. Neto plata, topli obrok i putni trošak idu
          odvojeno svakom radniku.
        </p>

        <div className={styles.summary} style={{ marginBottom: "1.5rem" }}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Bruto ukupno</span>
            <span className={styles.summaryValue}>{fmtKM(totalGross)} KM</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Neto za isplatu</span>
            <span className={styles.summaryValue}>{fmtKM(totalNet)} KM</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Topli obrok</span>
            <span className={styles.summaryValue}>0,00 KM</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Regres</span>
            <span className={styles.summaryValue}>0,00 KM</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Putni trošak</span>
            <span className={styles.summaryValue}>0,00 KM</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Ukupan trošak poslodavca</span>
            <span
              className={styles.summaryValue}
              style={{ color: "var(--accent, #c8622a)" }}
            >
              {fmtKM(totalCost)} KM
            </span>
          </div>
        </div>

        {/* Zbirne uplatnice, koristi prave .uplCard klase */}
        <div className={styles.subsectionTitle}>
          Zbirne uplatnice, doprinosi i porezi
        </div>
        <div className={styles.uplCardsList}>
          {MOCK_UPLATNICE.map((u, i) => (
            <div key={u.sifra + i} className={styles.uplCard}>
              <span className={styles.uplCardNum}>{i + 1}</span>
              <div className={styles.uplCardBody}>
                <div className={styles.uplCardTitle}>{u.title}</div>
                <div className={styles.uplCardSub}>
                  {u.racun}
                  {u.primalac.length ? ` · ${u.primalac.join(" · ")}` : ""}
                  {` · Vrsta prihoda: ${u.sifra}`}
                  {` · Budžetska org.: ${u.budzetOrg}`}
                </div>
              </div>
              <span className={styles.uplCardIznos}>{fmtKM(u.iznos)} KM</span>
            </div>
          ))}
        </div>

        <div className={styles.totalCostRow}>
          <span className={styles.totalCostLabel}>
            Zbir doprinosa i poreza
          </span>
          <span className={styles.totalCostValue}>
            {fmtKM(totalUplatnice)} KM
          </span>
        </div>

        {/* Per-worker uplatnice */}
        <div className={styles.subsectionTitle}>
          Uplate radnicima, neto plate
        </div>
        <div className={styles.uplCardsList}>
          {MOCK_ROWS.map((r, i) => (
            <div key={`net-${i}`} className={styles.uplCard}>
              <span className={styles.uplCardWorker}>{r.name}</span>
              <div className={styles.uplCardBody}>
                <div className={styles.uplCardTitle}>Neto plata</div>
                <div className={styles.uplCardSub}>
                  Žiro račun radnika (primjer)
                </div>
              </div>
              <span className={styles.uplCardIznos}>{fmtKM(r.net)} KM</span>
            </div>
          ))}
        </div>

        <div className={styles.totalCostRow}>
          <span className={styles.totalCostLabel}>Zbir isplata radnicima</span>
          <span className={styles.totalCostValue}>{fmtKM(totalNet)} KM</span>
        </div>

        {/* Mockup akcije */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.2rem",
            width: "100%",
            maxWidth: 980,
            margin: "1.5rem auto 0",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.55rem",
              padding: "0.85rem 1rem",
              borderRadius: 8,
              border: "1px solid var(--border, #d8d4ca)",
              background: "var(--card-bg, #f7f3eb)",
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--mid, #6c6862)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Za isplatu plata (banka)
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.55rem",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
              title="Registruj se da koristiš ove funkcije"
            >
              <button
                type="button"
                className={styles.btnPrimary}
                disabled
                style={{ ...mockBtnDisabled, padding: "0.75rem 1.5rem" }}
              >
                ↓ Preuzmi platne listiće
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled
                style={{ ...mockBtnDisabled, padding: "0.75rem 1.5rem" }}
              >
                ↓ Preuzmi uplatnice
              </button>
              <button
                type="button"
                className={styles.btnTintBlue}
                disabled
                style={{ ...mockBtnDisabled, padding: "0.75rem 1.5rem" }}
              >
                Lista naloga
              </button>
              <button
                type="button"
                className={styles.btnTintBlue}
                disabled
                style={{ ...mockBtnDisabled, padding: "0.75rem 1.5rem" }}
              >
                Specifikacije po radniku ▾
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.55rem",
              padding: "0.85rem 1rem",
              borderRadius: 8,
              border: "1px solid var(--border, #d8d4ca)",
              background: "var(--card-bg, #f7f3eb)",
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--mid, #6c6862)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Za poreznu upravu (PUFBIH)
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.55rem",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
              title="Registruj se da koristiš ove funkcije"
            >
              <button
                type="button"
                className={styles.btnPrimary}
                disabled
                style={{
                  ...mockBtnDisabled,
                  padding: "0.75rem 1.5rem",
                  background: "var(--sage)",
                }}
              >
                ↓ Preuzmi Obrazac 2001
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                disabled
                style={{ ...mockBtnDisabled, padding: "0.75rem 1rem" }}
              >
                MIP-1023 PDF
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                disabled
                style={{ ...mockBtnDisabled, padding: "0.75rem 1rem" }}
              >
                XML
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                disabled
                style={{ ...mockBtnDisabled, padding: "0.75rem 1rem" }}
              >
                GIP-1022 PDF (2026)
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                disabled
                style={{ ...mockBtnDisabled, padding: "0.75rem 1rem" }}
              >
                ZIP
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                disabled
                style={{ ...mockBtnDisabled, padding: "0.75rem 1rem" }}
              >
                XML
              </button>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              className={styles.btnGhost}
              disabled
              style={{ ...mockBtnDisabled, padding: "0.65rem 1.25rem" }}
            >
              ✓ Označi sve obračune kao isplaćene
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
