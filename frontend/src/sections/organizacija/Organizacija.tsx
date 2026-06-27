"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLastOrg } from "src/hooks/useLastOrg";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import styles from "./organizacija.module.css";
import { formatMoneyBlur } from "src/lib/format";
import {
  getOrganization,
  updateOrganizationSettings,
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  getMembers,
  addMember,
  removeMember,
  updateMemberRole,
  SALARY_TYPE_DESCRIPTIONS,
  SALARY_TYPE_LABELS,
  type Organization,
  type SalaryType,
  type Worker,
  type WorkerPayload,
  type OrgMember,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import RoleGuard from "src/components/RoleGuard/RoleGuard";
import DateInput from "src/components/DateInput/DateInput";
import CitySelect, { CityNote } from "src/components/CitySelect/CitySelect";
import { RS_OPCINE } from "src/data/rs-opcine";
import { useCityLookup } from "src/hooks/useCities";
import { useRole } from "src/hooks/useRole";
import { parseDecimal, sanitizeDecimalInput } from "src/utils/parseDecimal";
import {
  computeContractEndIso,
  maxTrajanjeBroj,
  type TrajanjeJedinica,
} from "src/utils/contractDuration";

// ─── Types ────────────────────────────────────────────────────────────────────

function getTodayIsoOrg(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type WorkerForm = {
  role: "VLASNIK" | "RADNIK";
  firstName: string;
  lastName: string;
  jmbg: string;
  idCardNumber: string;
  bankAccount: string;
  address: string;
  city: string;
  email: string;
  startDate: string;
  endDate: string;
  // Ugovor o radu
  position: string;
  salaryType: SalaryType;
  salaryBruto: string;
  salaryNeto: string;
  contractType: "" | "NEODREDJENO" | "ODREDJENO";
  contractEndDate: string;
  probationMonths: string; // "" | "0".."6"
  noticePeriod: string;
  contractNumber: string;
  employmentStatus: "DRAFT" | "PRIJAVLJEN" | "ODJAVLJEN";
  prijavaDate: string;
  odjavaDate: string;
  spol: "" | "M" | "Z";
  strucnaSpremaIdx: string; // "" | "0".."9"
  contractedHours: string; // "1".."8"
  taxCoefficient: string;
  // Ukupan radni staž (za minuli rad) — user bira jedan:
  firstEmploymentDate: string;
  priorWorkYearsInt: string; // godine, npr. "5"
  priorWorkMonthsInt: string; // mjeseci 0-11, npr. "6"
  // Dnevna stopa toplog obroka za radnika (override stope firme). "" = naslijedi.
  mealAllowancePerDay: string;
  // Entitet prebivališta (FBIH/RS) + šifra RS opštine.
  prebivalisteEntitet: "FBIH" | "RS";
  opcinaKod: string;
};

const emptyForm = (): WorkerForm => ({
  role: "RADNIK",
  firstName: "",
  lastName: "",
  jmbg: "",
  idCardNumber: "",
  bankAccount: "",
  address: "",
  city: "",
  email: "",
  startDate: "",
  endDate: "",
  position: "",
  salaryType: "NETO_ISPLATA",
  salaryBruto: "",
  salaryNeto: "",
  contractType: "",
  contractEndDate: "",
  probationMonths: "",
  noticePeriod: "",
  contractNumber: "",
  employmentStatus: "DRAFT",
  prijavaDate: "",
  odjavaDate: "",
  spol: "",
  strucnaSpremaIdx: "",
  contractedHours: "8",
  taxCoefficient: "1.0",
  firstEmploymentDate: "",
  priorWorkYearsInt: "",
  priorWorkMonthsInt: "",
  mealAllowancePerDay: "",
  prebivalisteEntitet: "FBIH",
  opcinaKod: "",
});

function formToPayload(f: WorkerForm): WorkerPayload {
  const probation = f.probationMonths.trim();
  return {
    role: f.role,
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    jmbg: f.jmbg.trim() || undefined,
    idCardNumber: f.idCardNumber.trim() || undefined,
    bankAccount: f.bankAccount.trim() || undefined,
    address: f.address.trim() || undefined,
    city: f.city.trim() || undefined,
    email: f.email.trim() || undefined,
    startDate: f.startDate || null,
    endDate: f.endDate.trim() || null,
    position: f.position.trim() || null,
    salaryType: f.salaryType,
    salaryBruto: f.salaryBruto.trim() ? Number(f.salaryBruto.replace(/\./g, "").replace(",", ".")) : null,
    salaryNeto: f.salaryNeto.trim() ? Number(f.salaryNeto.replace(/\./g, "").replace(",", ".")) : null,
    contractType: f.contractType === "" ? null : f.contractType,
    contractEndDate: f.contractEndDate || null,
    probationMonths: probation === "" ? null : Number(probation),
    noticePeriod: f.noticePeriod.trim() || null,
    contractNumber: f.contractNumber.trim() || null,
    // Status se automatski izvodi iz datuma prijave/odjave — datumi su
    // master, status je derivat. To otklanja problem kad korisnik upiše
    // prijavaDate ali zaboravi prebaciti dropdown.
    employmentStatus: f.odjavaDate
      ? "ODJAVLJEN"
      : f.prijavaDate
        ? "PRIJAVLJEN"
        : "DRAFT",
    prijavaDate: f.prijavaDate || null,
    odjavaDate: f.odjavaDate || null,
    spol: f.spol === "" ? null : f.spol,
    strucnaSpremaIdx: f.strucnaSpremaIdx === "" ? null : Number(f.strucnaSpremaIdx),
    contractedHours: f.contractedHours === "" ? 8 : Number(f.contractedHours),
    taxCoefficient: (() => {
      const c = parseDecimal(f.taxCoefficient);
      // 0 je validna vrijednost (radnik bez porezne kartice → bez ličnog
      // odbitka). Prihvati svaku non-negative vrijednost; default 1.0 samo
      // ako je input neispravan (ostao prazan/nečitljiv) ili negativan.
      // parseDecimal vraća 0 za prazan/loš input — pa eksplicitno odvajamo
      // praznu vrijednost da bismo joj dali default 1.0 umjesto 0.
      const trimmed = f.taxCoefficient.trim();
      if (!trimmed) return 1.0;
      return c >= 0 ? c : 1.0;
    })(),
    firstEmploymentDate: f.firstEmploymentDate || null,
    priorWorkYears: (() => {
      // Kombinuj godine + mjeseci u jedan decimal (npr. 5 god 6 mj → 5.5).
      // Ako su oba polja prazna → null (nije postavljen prethodni staž).
      const yStr = f.priorWorkYearsInt.trim();
      const mStr = f.priorWorkMonthsInt.trim();
      if (!yStr && !mStr) return null;
      const y = yStr ? Number(yStr) : 0;
      const m = mStr ? Number(mStr) : 0;
      if (!Number.isFinite(y) || !Number.isFinite(m) || y < 0 || m < 0) {
        return null;
      }
      // Mjeseci preko 11 se prelijevaju u godine (npr. user upiše 18 mj).
      const total = y + m / 12;
      return total >= 0 ? Number(total.toFixed(4)) : null;
    })(),
    mealAllowancePerDay: f.mealAllowancePerDay.trim()
      ? parseDecimal(f.mealAllowancePerDay)
      : null,
    prebivalisteEntitet: f.prebivalisteEntitet === "RS" ? "RS" : "FBIH",
    opcinaKod:
      f.prebivalisteEntitet === "RS" ? f.opcinaKod.trim() || null : null,
  };
}

// Grad/opština radnika moraju biti sa liste (FBiH grad iz liste, RS opština
// izabrana), jer se iz njih izvodi kanton/općina za obračun plate.
function workerLocationValid(
  f: Pick<WorkerForm, "prebivalisteEntitet" | "city" | "opcinaKod">,
  cityInList: (name: string) => boolean,
): boolean {
  if (f.prebivalisteEntitet === "RS") return !!f.opcinaKod;
  return cityInList((f.city || "").trim());
}

function workerToForm(w: Worker): WorkerForm {
  const fmt = (n: number | null) =>
    n == null
      ? ""
      : n.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return {
    role: w.role,
    firstName: w.firstName,
    lastName: w.lastName,
    jmbg: w.jmbg ?? "",
    idCardNumber: w.idCardNumber ?? "",
    bankAccount: w.bankAccount ?? "",
    address: w.address ?? "",
    city: w.city ?? "",
    email: w.email ?? "",
    startDate: w.startDate ?? "",
    endDate: w.endDate ?? "",
    position: w.position ?? "",
    salaryType: w.salaryType ?? "NETO_ISPLATA",
    salaryBruto: fmt(w.salaryBruto),
    salaryNeto: fmt(w.salaryNeto),
    contractType: w.contractType ?? "",
    contractEndDate: w.contractEndDate ?? "",
    probationMonths: w.probationMonths == null ? "" : String(w.probationMonths),
    noticePeriod: w.noticePeriod ?? "",
    contractNumber: w.contractNumber ?? "",
    employmentStatus: w.employmentStatus ?? "DRAFT",
    prijavaDate: w.prijavaDate ?? "",
    odjavaDate: w.odjavaDate ?? "",
    spol: w.spol ?? "",
    strucnaSpremaIdx: w.strucnaSpremaIdx == null ? "" : String(w.strucnaSpremaIdx),
    contractedHours: w.contractedHours == null ? "8" : String(w.contractedHours),
    taxCoefficient: w.taxCoefficient != null ? String(w.taxCoefficient) : "1.0",
    firstEmploymentDate: w.firstEmploymentDate ?? "",
    // Rastavi decimal nazad na godine + mjeseci za UI (npr. 5.5 → "5" + "6")
    priorWorkYearsInt: (() => {
      if (w.priorWorkYears == null) return "";
      const n = Number(w.priorWorkYears);
      if (!Number.isFinite(n)) return "";
      return String(Math.floor(n));
    })(),
    priorWorkMonthsInt: (() => {
      if (w.priorWorkYears == null) return "";
      const n = Number(w.priorWorkYears);
      if (!Number.isFinite(n)) return "";
      const months = Math.round((n - Math.floor(n)) * 12);
      return months > 0 ? String(months) : "";
    })(),
    mealAllowancePerDay:
      w.mealAllowancePerDay != null ? String(w.mealAllowancePerDay) : "",
    prebivalisteEntitet: w.prebivalisteEntitet === "RS" ? "RS" : "FBIH",
    opcinaKod: w.opcinaKod ?? "",
  };
}

const ROLE_LABELS: Record<string, string> = {
  VLASNIK: "Vlasnik",
  RADNIK: "Radnik",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "–";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

const ORG_TYPE_LABELS: Record<string, string> = {
  COMPANY: "Privredno društvo",
  BUSINESS: "Obrt / Samostalna djelatnost",
};

import { isJmbgValid, parseJmbg, spolFromJmbg } from "src/utils/jmbg";

// Iste opcije kao u JS3100 (Drugi dio red 11), index = vrijednost koju treba slati
const STRUCNA_SPREMA_OPCIJE = [
  "DR, Doktor nauka",
  "MR, Magistar",
  "VSS, Visoka stručna sprema",
  "VŠS, Viša stručna sprema",
  "SSS, Srednja stručna sprema",
  "Niža",
  "VKV, Visokokvalifikovani",
  "KV, Kvalifikovani",
  "PK, Polukvalifikovani",
  "NK, Nekvalifikovani",
];

// ─── Worker row form (add or edit) ────────────────────────────────────────────

// ── Outline SVG ikone za sekcije forme (currentColor → sage prati boju tekst) ──
const ICON_USER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const ICON_MAP_PIN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const ICON_CLIPBOARD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);
const ICON_FILE_TEXT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="14" y2="17" />
  </svg>
);
const ICON_CALCULATOR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
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
);
const ICON_CHEVRON_DOWN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function FormSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.collapse}>
      <button
        type="button"
        className={styles.collapseHeader}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={styles.collapseIcon}>{icon}</span>
        <span>{title}</span>
        <span className={`${styles.collapseChevron} ${open ? styles.collapseChevronOpen : ""}`}>
          {ICON_CHEVRON_DOWN}
        </span>
      </button>
      {open && (
        <div className={styles.collapseBody}>
          <div className={styles.collapseGrid}>{children}</div>
        </div>
      )}
    </div>
  );
}

function WorkerFormFields({
  value,
  onChange,
  orgType,
}: {
  value: WorkerForm;
  onChange: (v: WorkerForm) => void;
  orgType?: "COMPANY" | "BUSINESS" | null;
}) {
  const set =
    (k: keyof WorkerForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [k]: e.target.value });

  // Live formatter dok user kuca KM iznos — dodaje tačke kao thousands sep.
  // Primjeri: "1234" → "1.234"; "1234,5" → "1.234,5"; "1234567,89" → "1.234.567,89"
  // Koristi se za salaryBruto i salaryNeto da bi se iznos formatirao odmah,
  // a ne tek pri ponovnom otvaranju forme.
  const formatMoneyLive = (input: string): string => {
    if (!input || !input.trim()) return "";
    const cleaned = input.replace(/\./g, "");
    const parts = cleaned.split(",");
    let intPart = parts[0].replace(/\D/g, "");
    if (!intPart && parts.length > 1) intPart = "0";
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    if (parts.length > 1) {
      const decPart = parts[1].replace(/\D/g, "").slice(0, 2);
      return `${intPart},${decPart}`;
    }
    return intPart;
  };
  const setMoney =
    (k: keyof WorkerForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [k]: formatMoneyLive(e.target.value) });
  // Na blur dopuni iznos na puni oblik sa 2 decimale (npr. "1.000" -> "1.000,00").
  const setMoneyBlur =
    (k: keyof WorkerForm) =>
    (e: React.FocusEvent<HTMLInputElement>) =>
      onChange({ ...value, [k]: formatMoneyBlur(e.target.value) });

  const isVlasnik = value.role === "VLASNIK";
  // Obrt vlasnik ima poseban režim (Obrazac 2002, fiksna osnovica) — bruto/neto
  // i ostala ugovor-o-radu polja se ne primjenjuju. Za d.o.o. vlasnika treba
  // sve isto kao za radnika (on JE radnik sa stanovišta obračuna plate).
  const isObrtVlasnik = isVlasnik && orgType === "BUSINESS";

  // Helper za trajanje ugovora na određeno (broj + jedinica → datum isteka).
  // Datum isteka (contractEndDate) je ono što se perzistira; broj/jedinica su
  // samo pomoćni unos koji ga auto-računa iz datuma početka.
  const [trajanjeBroj, setTrajanjeBroj] = useState(1);
  const [trajanjeJedinica, setTrajanjeJedinica] =
    useState<TrajanjeJedinica>("godine");
  const baseStartIso = value.startDate || getTodayIsoOrg();

  return (
    <div>
      {/* ── 1. Lični podaci ── */}
      <FormSection title="Lični podaci" icon={ICON_USER}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Uloga</label>
          <select className={styles.input} value={value.role} onChange={set("role")}>
            <option value="RADNIK">Radnik</option>
            <option value="VLASNIK">Vlasnik</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Ime</label>
          <input
            className={styles.input}
            value={value.firstName}
            onChange={set("firstName")}
            placeholder="Ime"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Prezime</label>
          <input
            className={styles.input}
            value={value.lastName}
            onChange={set("lastName")}
            placeholder="Prezime"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>JMBG</label>
          <input
            className={styles.input}
            value={value.jmbg}
            onChange={(e) => {
              const jmbg = e.target.value.replace(/\D/g, "").slice(0, 13);
              const next: WorkerForm = { ...value, jmbg };
              if (jmbg.length >= 12 && !value.spol) {
                const inferred = spolFromJmbg(jmbg);
                if (inferred) next.spol = inferred;
              }
              onChange(next);
            }}
            placeholder="1234567890123"
            inputMode="numeric"
            maxLength={13}
            style={
              value.jmbg.length > 0 && value.jmbg.length === 13 && !isJmbgValid(value.jmbg)
                ? { borderColor: "#dc2626" }
                : undefined
            }
          />
          {value.jmbg.length === 13 && !isJmbgValid(value.jmbg) && (
            <p style={{ fontSize: 12, color: "#dc2626", margin: "0.3rem 0 0" }}>
              {parseJmbg(value.jmbg).error}
            </p>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Broj lične karte</label>
          <input
            className={styles.input}
            value={value.idCardNumber}
            onChange={(e) =>
              onChange({ ...value, idCardNumber: e.target.value.slice(0, 9) })
            }
            placeholder="npr. 12ABC3456"
            maxLength={9}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Spol</label>
          <select
            className={styles.input}
            value={value.spol}
            onChange={(e) =>
              onChange({ ...value, spol: e.target.value as WorkerForm["spol"] })
            }
          >
            <option value="">– Odaberi –</option>
            <option value="M">Muški</option>
            <option value="Z">Ženski</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Stručna sprema</label>
          <select
            className={styles.input}
            value={value.strucnaSpremaIdx}
            onChange={set("strucnaSpremaIdx")}
          >
            <option value="">– Odaberi –</option>
            {STRUCNA_SPREMA_OPCIJE.map((t, i) => (
              <option key={i} value={i}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </FormSection>

      {/* ── 2. Adresa i kontakt ── */}
      <FormSection title="Adresa i bankarski podaci" icon={ICON_MAP_PIN}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Adresa</label>
          <input
            className={styles.input}
            value={value.address}
            onChange={set("address")}
            placeholder="Ulica i broj"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Prebivalište</label>
          <select
            className={styles.input}
            value={value.prebivalisteEntitet}
            onChange={(e) =>
              onChange({
                ...value,
                prebivalisteEntitet: e.target.value === "RS" ? "RS" : "FBIH",
                // promjenom entiteta očisti polja koja ne važe
                opcinaKod: e.target.value === "RS" ? value.opcinaKod : "",
              })
            }
            title="Radnik sa prebivalištem u RS ima drugačiju uplatu zdravstvenog i nezaposlenosti (Budžet RS, Obrazac 2001-A)."
          >
            <option value="FBIH">Federacija BiH</option>
            <option value="RS">Republika Srpska</option>
          </select>
        </div>
        {value.prebivalisteEntitet === "RS" ? (
          <>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Grad</label>
              <input
                className={styles.input}
                value={value.city}
                onChange={set("city")}
                placeholder="npr. Banja Luka"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Opština (RS)</label>
              <select
                className={styles.input}
                value={value.opcinaKod}
                onChange={(e) =>
                  onChange({ ...value, opcinaKod: e.target.value })
                }
                aria-invalid={!value.opcinaKod || undefined}
                style={!value.opcinaKod ? { borderColor: "#b3261e" } : undefined}
              >
                <option value="">Izaberite opštinu...</option>
                {RS_OPCINE.map((o) => (
                  <option key={o.kod} value={o.kod}>
                    {o.naziv} ({o.kod})
                  </option>
                ))}
              </select>
              <CityNote>
                Opštinu obavezno odaberite sa liste, potrebna je za obračun plate
                i uplatnice (Budžet RS).
              </CityNote>
            </div>
          </>
        ) : (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Grad</label>
            <CitySelect
              value={value.city}
              onChange={(v) => onChange({ ...value, city: v })}
              className={styles.input}
              strict
            />
            <CityNote>
              Grad odaberite sa liste, iz njega se određuje kanton i općina za
              obračun plate i uplatnice.
            </CityNote>
          </div>
        )}
        <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.fieldLabel}>Broj tekućeg računa</label>
          <input
            className={styles.input}
            value={value.bankAccount}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 16);
              const parts = [
                d.slice(0, 3),
                d.slice(3, 6),
                d.slice(6, 14),
                d.slice(14, 16),
              ].filter(Boolean);
              onChange({ ...value, bankAccount: parts.join("-") });
            }}
            placeholder="XXX-XXX-XXXXXXXX-XX"
            inputMode="numeric"
          />
        </div>
        <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.fieldLabel}>Email radnika</label>
          <input
            className={styles.input}
            type="email"
            value={value.email}
            onChange={set("email")}
            placeholder="ime.prezime@primjer.ba"
            inputMode="email"
          />
          <p
            className={styles.fieldHint}
            style={{ marginTop: "0.3rem", fontSize: 12, color: "#666" }}
          >
            Koristi se za slanje platnih listića radniku. Ako nije upisan,
            platni listić se neće slati.
          </p>
        </div>
      </FormSection>

      {/* ── 3. JS3100 prijava / odjava ── */}
      <FormSection title="JS3100 prijava / odjava" icon={ICON_CLIPBOARD}>
        <div
          className={styles.field}
          style={
            value.employmentStatus === "PRIJAVLJEN" && value.prijavaDate
              ? {
                  background: "#f1f8f3",
                  border: "1px solid #b7dcc4",
                  borderRadius: 8,
                  padding: "0.6rem 0.7rem",
                }
              : undefined
          }
        >
          <label
            className={styles.fieldLabel}
            style={
              value.employmentStatus === "PRIJAVLJEN" && value.prijavaDate
                ? { color: "#1f5e44", fontWeight: 700 }
                : undefined
            }
          >
            Datum prijave (JS3100),{" "}
            <span style={{ color: "var(--mid)", fontWeight: 400, fontSize: 11 }}>
              koristi se za obračun plata
            </span>
          </label>
          <DateInput
            className={styles.input}
            value={value.prijavaDate}
            onValueChange={(iso) => onChange({ ...value, prijavaDate: iso })}
          />
          {value.employmentStatus === "PRIJAVLJEN" && value.prijavaDate && (
            <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "#1f5e44" }}>
              Stavljen je današnji datum, izmijenite ako prijava nije danas.
            </span>
          )}
        </div>
        <div
          className={styles.field}
          style={
            value.employmentStatus === "ODJAVLJEN" && value.odjavaDate
              ? {
                  background: "#fdeceb",
                  border: "1px solid #f3c4c4",
                  borderRadius: 8,
                  padding: "0.6rem 0.7rem",
                }
              : undefined
          }
        >
          <label
            className={styles.fieldLabel}
            style={
              value.employmentStatus === "ODJAVLJEN" && value.odjavaDate
                ? { color: "#a3322f", fontWeight: 700 }
                : undefined
            }
          >
            Datum odjave (JS3100)
          </label>
          <DateInput
            className={styles.input}
            value={value.odjavaDate}
            onValueChange={(iso) => onChange({ ...value, odjavaDate: iso })}
          />
          {value.employmentStatus === "ODJAVLJEN" && value.odjavaDate && (
            <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "#a3322f" }}>
              Stavljen je današnji datum, izmijenite ako odjava nije danas.
            </span>
          )}
        </div>
        {!isObrtVlasnik && (
          <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <label
              className={styles.fieldLabel}
              style={{ color: "#9a6a00", fontWeight: 700 }}
            >
              Status , bitno označiti
            </label>
            <select
              className={styles.input}
              style={
                value.employmentStatus === "PRIJAVLJEN"
                  ? { borderColor: "#2e7d32", background: "#f1f8f3" }
                  : value.employmentStatus === "ODJAVLJEN"
                    ? { borderColor: "#b3261e", background: "#fdeceb" }
                    : { borderColor: "#e0a93b", background: "#fffaf0" }
              }
              value={value.employmentStatus}
              onChange={(e) => {
                // Status je master: mijenjanje dropdowna reconciluje datume tako
                // da backend (koji derivira status iz datuma) izvede isti status.
                // Bez ovoga, re-prijava odjavljenog radnika ne radi jer ostane
                // stari odjavaDate koji ima prioritet u derivaciji.
                const status = e.target.value as WorkerForm["employmentStatus"];
                const today = getTodayIsoOrg();
                if (status === "PRIJAVLJEN") {
                  onChange({
                    ...value,
                    employmentStatus: status,
                    prijavaDate: value.prijavaDate || today,
                    odjavaDate: "",
                  });
                } else if (status === "ODJAVLJEN") {
                  onChange({
                    ...value,
                    employmentStatus: status,
                    odjavaDate: value.odjavaDate || today,
                  });
                } else {
                  // DRAFT — još nije prijavljen: očisti oba datuma.
                  onChange({
                    ...value,
                    employmentStatus: status,
                    prijavaDate: "",
                    odjavaDate: "",
                  });
                }
              }}
            >
              <option value="DRAFT">Draft (još nije prijavljen)</option>
              <option value="PRIJAVLJEN">Prijavljen kod PIO/ZZO</option>
              <option value="ODJAVLJEN">Odjavljen</option>
            </select>
            <span
              style={{
                display: "block",
                marginTop: 6,
                fontSize: 12.5,
                color: "#8a5a00",
                background: "#fdf6e3",
                border: "1px solid #f0d9a6",
                borderRadius: 8,
                padding: "0.5rem 0.65rem",
                lineHeight: 1.45,
              }}
            >
              Bitno: plata se obračunava samo radnicima sa statusom{" "}
              <strong>Prijavljen</strong>. Ako ostane Draft, radnik se ne uzima u
              obračun plate.
            </span>
          </div>
        )}
      </FormSection>

      {/* ── 4. Ugovor o radu i plata, samo za radnike i d.o.o. vlasnika ── */}
      {!isObrtVlasnik && (
        <FormSection title="Ugovor o radu i plata" icon={ICON_FILE_TEXT}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Radno mjesto / pozicija</label>
            <input
              className={styles.input}
              value={value.position}
              onChange={set("position")}
              placeholder="Npr. Programer, konobar..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Vrsta ugovora</label>
            <select
              className={styles.input}
              value={value.contractType}
              onChange={(e) =>
                onChange({
                  ...value,
                  contractType: e.target.value as WorkerForm["contractType"],
                })
              }
            >
              <option value="">– Odaberi –</option>
              <option value="NEODREDJENO">Neodređeno</option>
              <option value="ODREDJENO">Određeno</option>
            </select>
          </div>
          {value.contractType === "ODREDJENO" && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Trajanje ugovora</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    className={styles.input}
                    style={{ flex: "0 0 80px" }}
                    value={trajanjeBroj}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setTrajanjeBroj(v);
                      const end = computeContractEndIso(
                        baseStartIso,
                        v,
                        trajanjeJedinica,
                      );
                      if (end) onChange({ ...value, contractEndDate: end });
                    }}
                  >
                    {Array.from(
                      { length: maxTrajanjeBroj(trajanjeJedinica) },
                      (_, i) => i + 1,
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <select
                    className={styles.input}
                    value={trajanjeJedinica}
                    onChange={(e) => {
                      const j = e.target.value as TrajanjeJedinica;
                      setTrajanjeJedinica(j);
                      const capped = Math.min(trajanjeBroj, maxTrajanjeBroj(j));
                      if (capped !== trajanjeBroj) setTrajanjeBroj(capped);
                      const end = computeContractEndIso(baseStartIso, capped, j);
                      if (end) onChange({ ...value, contractEndDate: end });
                    }}
                  >
                    <option value="mjeseci">mjeseci</option>
                    <option value="godine">godine</option>
                  </select>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Datum isteka ugovora
                </label>
                <DateInput
                  className={styles.input}
                  value={value.contractEndDate}
                  onValueChange={(iso) =>
                    onChange({ ...value, contractEndDate: iso })
                  }
                />
              </div>
            </>
          )}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Ugovoreno radno vrijeme (sati dnevno)
            </label>
            <select
              className={styles.input}
              value={value.contractedHours}
              onChange={set("contractedHours")}
              title="Zakon o doprinosima FBiH (čl. 7, izmjene 33/25): za nepuno radno vrijeme > 4h primjenjuje se PUNA minimalna osnovica; za ≤ 4h srazmjerno (min. 50%)."
            >
              <option value="8">8h, puno radno vrijeme</option>
              <option value="7">7h, nepuno (puna min. osnovica)</option>
              <option value="6">6h, nepuno (puna min. osnovica)</option>
              <option value="5">5h, nepuno (puna min. osnovica)</option>
              <option value="4">4h, nepuno (srazmjerno, 50%)</option>
              <option value="3">3h, nepuno (srazmjerno, 50%)</option>
              <option value="2">2h, nepuno (srazmjerno, 50%)</option>
              <option value="1">1h, nepuno (srazmjerno, 50%)</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Topli obrok po danu (KM)
            </label>
            <input
              className={styles.input}
              type="text"
              inputMode="decimal"
              placeholder="stopa firme"
              value={value.mealAllowancePerDay}
              onChange={(e) =>
                onChange({
                  ...value,
                  mealAllowancePerDay: e.target.value.replace(/[^\d.,]/g, ""),
                })
              }
              title="Override dnevne stope toplog obroka. Prazno = koristi se stopa postavljena na nivou firme."
            />
          </div>
          {/* Tip plate, određuje šta iznos iz "Bruto"/"Neto" polja stvarno
              znači u obračunu. Vidi SALARY_TYPE_DESCRIPTIONS za detalje. */}
          <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <label className={styles.fieldLabel}>Tip plate</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {(["NETO_ISPLATA", "NETO_UGOVOR", "BRUTO"] as SalaryType[]).map(
                (t) => {
                  const active = value.salaryType === t;
                  return (
                    <label
                      key={t}
                      style={{
                        display: "block",
                        padding: "0.6rem 0.7rem",
                        border: `1.5px solid ${active ? "#3a5c42" : "#d4cfc4"}`,
                        background: active ? "#f0f5f1" : "white",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <input
                          type="radio"
                          name="salaryType"
                          value={t}
                          checked={active}
                          onChange={() => onChange({ ...value, salaryType: t })}
                        />
                        <strong>{SALARY_TYPE_LABELS[t]}</strong>
                      </span>
                      <span style={{ display: "block", marginTop: "0.25rem", color: "#666", fontSize: "0.75rem" }}>
                        {SALARY_TYPE_DESCRIPTIONS[t]}
                      </span>
                    </label>
                  );
                },
              )}
            </div>
          </div>
          {/* Pokazujemo samo polje koje odgovara izabranom tipu. Ako user
              prebaci tip, polja se zamijene, ne postoji konflikt. */}
          {value.salaryType === "BRUTO" ? (
            <div className={`${styles.field} ${styles.fieldHighlight}`}>
              <label className={`${styles.fieldLabel} ${styles.fieldLabelHighlight}`}>
                Bruto osnovica (KM)
              </label>
              <input
                className={styles.input}
                value={value.salaryBruto}
                onChange={setMoney("salaryBruto")}
                onBlur={setMoneyBlur("salaryBruto")}
                placeholder="0,00"
                inputMode="decimal"
              />
              <p className={styles.fieldHint} style={{ marginTop: "0.3rem", fontSize: 12, color: "#666" }}>
                Bruto iz ugovora; neto raste sa godinama staža.
              </p>
            </div>
          ) : (
            <div className={`${styles.field} ${styles.fieldHighlight}`}>
              <label className={`${styles.fieldLabel} ${styles.fieldLabelHighlight}`}>
                {value.salaryType === "NETO_UGOVOR"
                  ? "Neto po ugovoru (KM)"
                  : "Cilj neto za isplatu (KM)"}
              </label>
              <input
                className={styles.input}
                value={value.salaryNeto}
                onChange={setMoney("salaryNeto")}
                onBlur={setMoneyBlur("salaryNeto")}
                placeholder="0,00"
                inputMode="decimal"
              />
              <p className={styles.fieldHint} style={{ marginTop: "0.3rem", fontSize: 12, color: "#666" }}>
                {value.salaryType === "NETO_UGOVOR"
                  ? "Neto iz ugovora; radnik dobija povišicu za svaku godinu staža."
                  : "Iznos koji radnik svaki mjesec dobija."}
              </p>
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Probni rad (mjeseci, 0–6)</label>
            <select
              className={styles.input}
              value={value.probationMonths}
              onChange={set("probationMonths")}
            >
              <option value="">– Nema –</option>
              {[1, 2, 3, 4, 5, 6].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Otkazni rok</label>
            <input
              className={styles.input}
              value={value.noticePeriod}
              onChange={set("noticePeriod")}
              placeholder="Npr. 30 dana"
            />
          </div>
          <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <label className={styles.fieldLabel}>Broj ugovora</label>
            <input
              className={styles.input}
              value={value.contractNumber}
              onChange={set("contractNumber")}
              placeholder="Npr. 15/2026"
            />
          </div>
        </FormSection>
      )}

      {/* ── 5. Porez i radni staž ── */}
      <FormSection title="Porez i radni staž" icon={ICON_CALCULATOR}>
        <div className={`${styles.field} ${styles.fieldHighlight}`} style={{ gridColumn: "1 / -1" }}>
          <label className={`${styles.fieldLabel} ${styles.fieldLabelHighlight}`}>
            Porezni koeficijent,{" "}
            <span style={{ color: "var(--mid)", fontWeight: 400, fontSize: 11 }}>
              1.0 = 300 KM odbitka
            </span>
          </label>
          <input
            className={styles.input}
            value={value.taxCoefficient}
            onChange={(e) =>
              onChange({ ...value, taxCoefficient: sanitizeDecimalInput(e.target.value) })
            }
            placeholder="1.0"
            inputMode="decimal"
          />
        </div>

        {!isObrtVlasnik && (
          <>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <p
                className={styles.fieldHint}
                style={{ marginTop: 0, fontSize: 12, lineHeight: 1.5 }}
              >
                Minuli rad se računa na <strong>ukupan radni staž</strong>, ne
                samo na staž u našoj firmi. Popuni <strong>jedno od dva</strong>{" "}
                polja ispod (ako ne popuniš ništa, minuli rad se računa od
                datuma prijave u našu firmu).
              </p>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Datum prvog zaposljenja,{" "}
                <span style={{ color: "var(--mid)", fontWeight: 400, fontSize: 11 }}>
                  bez prekida u radu
                </span>
              </label>
              <DateInput
                className={styles.input}
                value={value.firstEmploymentDate}
                onValueChange={(iso) =>
                  onChange({ ...value, firstEmploymentDate: iso })
                }
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Staž prije naše firme,{" "}
                <span style={{ color: "var(--mid)", fontWeight: 400, fontSize: 11 }}>
                  koristi ako ima prekida
                </span>
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <input
                    className={styles.input}
                    value={value.priorWorkYearsInt}
                    onChange={set("priorWorkYearsInt")}
                    placeholder="0"
                    inputMode="numeric"
                    style={{ width: "100%" }}
                  />
                  <p
                    style={{
                      margin: "0.2rem 0 0",
                      fontSize: 11,
                      color: "var(--mid)",
                      textAlign: "center",
                    }}
                  >
                    godine
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    className={styles.input}
                    value={value.priorWorkMonthsInt}
                    onChange={set("priorWorkMonthsInt")}
                    placeholder="0"
                    inputMode="numeric"
                    style={{ width: "100%" }}
                  />
                  <p
                    style={{
                      margin: "0.2rem 0 0",
                      fontSize: 11,
                      color: "var(--mid)",
                      textAlign: "center",
                    }}
                  >
                    mjeseci
                  </p>
                </div>
              </div>
              <p className={styles.fieldHint}>
                Ako je postavljeno oboje (datum prvog zaposljenja i ovaj staž),
                ovo polje ima prednost.
              </p>
            </div>
          </>
        )}
      </FormSection>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PRO_WORKERS_LIMIT = 5;
const USER_WORKERS_LIMIT = 1;

export default function Organizacija({ orgId }: { orgId: number }) {
  // Otvaranje organizacije postavlja je kao "posljednje aktivnu" — kada
  // korisnik pređe u JS3100 / Obračun plata / Aktivni radnici, ista je
  // automatski odabrana.
  const { setLastOrgId } = useLastOrg();
  useEffect(() => {
    if (orgId) setLastOrgId(orgId);
  }, [orgId, setLastOrgId]);

  const queryClient = useQueryClient();
  const { role: userRole } = useRole();
  const { findByName } = useCityLookup();
  const cityInList = (n: string) => !!findByName(n);
  const [addWorkerError, setAddWorkerError] = useState<string | null>(null);
  // Poruka o nedostajućoj lokaciji radnika (grad sa liste / RS opština).
  const workerLocMsg = (f: WorkerForm): string | null => {
    if (workerLocationValid(f, cityInList)) return null;
    return f.prebivalisteEntitet === "RS"
      ? "Odaberite opštinu (RS) sa liste, potrebna je za obračun plate."
      : "Odaberite grad sa liste, potreban je za obračun plate.";
  };

  const { data: org, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: ["organization", orgId],
    queryFn: () => unwrap(getOrganization(orgId)),
  });

  const { data: workers = [], isLoading: workersLoading } = useQuery<Worker[]>({
    queryKey: ["workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId)),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<WorkerForm>(emptyForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<WorkerForm>(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const canEdit = org?.memberRole === "OWNER" || org?.memberRole === "ADMIN";
  // Worker count limits follow the OWNER's plan (effectiveTier), not the viewer's role —
  // a free MEMBER inside a BUSINESS owner's org sees no limit.
  const tier = org?.effectiveTier ?? null;
  const isProLimitReached = tier === "PRO" && workers.length >= PRO_WORKERS_LIMIT;
  const isUserLimitReached = tier === "USER" && workers.length >= USER_WORKERS_LIMIT;
  const isLimitReached = isProLimitReached || isUserLimitReached;

  const createMutation = useMutation({
    mutationFn: (payload: WorkerPayload) =>
      unwrap(createWorker(orgId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      setShowAdd(false);
      setAddForm(emptyForm());
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<WorkerPayload>;
    }) => unwrap(updateWorker(orgId, id, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => unwrap(deleteWorker(orgId, id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      setDeleteConfirmId(null);
    },
  });

  // Postavljanje radnika kao direktora/potpisnika (opcije 2 i 4).
  // Direktor je zakonski zastupnik, pa mu radno mjesto postaje "Direktor".
  // Ako pozicija već spominje direktora (npr. "Izvršni direktor"), ne diramo je.
  const directorMutation = useMutation({
    mutationFn: async (workerId: number | null) => {
      await unwrap(
        updateOrganizationSettings(orgId, { directorWorkerId: workerId }),
      );
      if (workerId) {
        const w = workers.find((x) => x.id === workerId);
        const pos = (w?.position ?? "").trim();
        if (!/direktor/i.test(pos)) {
          await unwrap(updateWorker(orgId, workerId, { position: "Direktor" }));
        }
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
    },
  });

  const startEdit = (w: Worker) => {
    setEditId(w.id);
    setEditForm(workerToForm(w));
    updateMutation.reset();
    setShowAdd(false);
  };

  if (orgLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>Učitavanje...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className={styles.page}>
        <Link href="/profil" className={styles.back}>
          ← Nazad na profil
        </Link>
        <div className={styles.empty}>
          Organizacija nije pronađena ili nemate pristup.
        </div>
      </div>
    );
  }

  // Sortiranje: prijavljeni/draft prvi po prijavaDate ASC (najstariji gore),
  // odjavljeni uvijek na dno (isto sortirani po prijavaDate među sobom).
  const sortedWorkers = [...workers].sort((a, b) => {
    const aOff = a.employmentStatus === "ODJAVLJEN" ? 1 : 0;
    const bOff = b.employmentStatus === "ODJAVLJEN" ? 1 : 0;
    if (aOff !== bOff) return aOff - bOff;
    const aDate = a.prijavaDate || "9999-12-31";
    const bDate = b.prijavaDate || "9999-12-31";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });
  const activeWorkers = sortedWorkers.filter(
    (w) => w.employmentStatus !== "ODJAVLJEN",
  );
  const inactiveWorkers = sortedWorkers.filter(
    (w) => w.employmentStatus === "ODJAVLJEN",
  );

  return (
    <div className={styles.page}>
      <RoleGuard roles={["USER", "PRO", "BUSINESS", "ADMIN"]} mode="hide">
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/profil" className={styles.back}>
            ← Nazad na profil
          </Link>
          <Link href={`/aktivni-radnici?org=${orgId}`} className={styles.back}>
            ← Aktivni radnici
          </Link>
        </div>

        {/* ── Org header ── */}
        <div className={styles.orgHeader}>
          <h1 className={styles.orgTitle}>{org.name}</h1>
          <div className={styles.orgMeta}>
            <span>{ORG_TYPE_LABELS[org.type] ?? org.type}</span>
            {org.taxNumber && <span>JIB: {org.taxNumber}</span>}
            {org.owner && (
              <span>
                Vlasnik:{" "}
                {org.owner.name ||
                  `${org.owner.firstName ?? ""} ${org.owner.lastName ?? ""}`.trim() ||
                  "–"}
              </span>
            )}
          </div>
        </div>

        {/* ── Direktor / potpisnik (opcije 2 i 4: vlasnik nije direktor) ── */}
        {org.type === "COMPANY" && org.ownerIsDirector === false && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Direktor i potpisnik</span>
            </div>
            <div style={{ padding: "0.8rem 1rem" }}>
              <p style={{ fontSize: 13, color: "#666", margin: "0 0 0.5rem" }}>
                Vlasnik nije direktor. Označite radnika koji zastupa firmu i
                potpisuje dokumente (ugovor o radu i ostalo). Radno mjesto tog
                radnika se postavlja na "Direktor" (možete ga prepraviti na
                kartici radnika).
              </p>
              <select
                className={styles.input}
                style={{ maxWidth: 360 }}
                value={org.directorWorkerId ?? ""}
                disabled={!canEdit || directorMutation.isPending}
                onChange={(e) =>
                  directorMutation.mutate(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Izaberi radnika</option>
                {(() => {
                  const candidates = workers.filter(
                    (w) =>
                      w.role === "RADNIK" &&
                      w.employmentStatus !== "ODJAVLJEN",
                  );
                  // Ako je dodijeljeni direktor odjavljen, ipak ga prikaži da
                  // se ne bi činilo da direktor nije postavljen.
                  if (
                    org.directorWorkerId &&
                    !candidates.some((w) => w.id === org.directorWorkerId)
                  ) {
                    const assigned = workers.find(
                      (w) => w.id === org.directorWorkerId,
                    );
                    if (assigned) candidates.push(assigned);
                  }
                  return candidates.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.firstName} {w.lastName}
                      {w.employmentStatus === "ODJAVLJEN"
                        ? " (odjavljen)"
                        : ""}
                    </option>
                  ));
                })()}
              </select>
              {org.directorWorkerId && org.signer?.name && (
                <p
                  style={{ fontSize: 12, color: "#3a5c42", margin: "0.5rem 0 0" }}
                >
                  Potpisnik: {org.signer.name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Workers card ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              Radnici{workers.length > 0 ? ` (${workers.length})` : ""}
            </span>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
              <Link
                href={`/aktivni-radnici?org=${orgId}`}
                className={styles.btnGhost}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  textDecoration: "none",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Aktivni radnici
              </Link>
              {canEdit && !showAdd && !isLimitReached && (
                <button
                  className={styles.btnPrimary}
                  onClick={() => {
                    setShowAdd(true);
                    setEditId(null);
                    createMutation.reset();
                  }}
                >
                  + Dodaj radnika
                </button>
              )}
            </div>
            {isProLimitReached && (
              <span className={styles.limitNotice}>
                PRO plan: maksimalno {PRO_WORKERS_LIMIT} radnika po organizaciji
              </span>
            )}
            {isUserLimitReached && (
              <span className={styles.limitNotice}>
                Besplatan preview: 1 radnik. Pretplatite se za neograničeno radnika.
              </span>
            )}
          </div>

          {/* Add form */}
          {showAdd && canEdit && (
            <form
              className={styles.formCard}
              onSubmit={(e) => {
                e.preventDefault();
                const msg = workerLocMsg(addForm);
                if (msg) {
                  setAddWorkerError(msg);
                  return;
                }
                setAddWorkerError(null);
                createMutation.mutate(formToPayload(addForm));
              }}
            >
              <WorkerFormFields value={addForm} onChange={setAddForm} orgType={org?.type} />
              {addWorkerError && (
                <div className={styles.errorMsg}>{addWorkerError}</div>
              )}
              {createMutation.error && (
                <div className={styles.errorMsg}>
                  {createMutation.error.message === "WORKERS_LIMIT_REACHED"
                    ? tier === "USER"
                      ? "Besplatan preview dozvoljava 1 radnika. Pretplatite se za neograničeno radnika."
                      : `PRO plan dozvoljava najviše ${PRO_WORKERS_LIMIT} radnika po organizaciji.`
                    : createMutation.error.message}
                </div>
              )}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => {
                    setShowAdd(false);
                    setAddForm(emptyForm());
                  }}
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Dodavanje..." : "Dodaj radnika"}
                </button>
              </div>
            </form>
          )}

          {workersLoading && (
            <div className={styles.empty}>Učitavanje radnika...</div>
          )}

          {!workersLoading && workers.length === 0 && !showAdd && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>👥</div>
              <div>Nema dodanih radnika.</div>
            </div>
          )}

          {workers.length > 0 && (
            <WorkerTable
              workers={[...activeWorkers, ...inactiveWorkers]}
              orgType={org?.type}
              canEdit={canEdit}
              editId={editId}
              editForm={editForm}
              setEditForm={setEditForm}
              deleteConfirmId={deleteConfirmId}
              setDeleteConfirmId={setDeleteConfirmId}
              onStartEdit={startEdit}
              onCancelEdit={() => setEditId(null)}
              onSaveEdit={(w) =>
                updateMutation.mutate({
                  id: w.id,
                  payload: formToPayload(editForm),
                })
              }
              onDelete={(id) => deleteMutation.mutate(id)}
              updateError={updateMutation.error?.message ?? null}
              updatePending={updateMutation.isPending}
              deletePending={deleteMutation.isPending}
              editLocationValid={workerLocationValid(editForm, cityInList)}
            />
          )}
        </div>

        {/* ── Members card (owner of a BUSINESS-tier org; ADMIN bypasses) ── */}
        {org.memberRole === "OWNER" &&
          (org.effectiveTier === "BUSINESS" || userRole === "ADMIN") && (
            <MembersCard orgId={orgId} />
          )}
      </RoleGuard>
    </div>
  );
}

// ─── Members card ─────────────────────────────────────────────────────────────

const MEMBER_ROLE_LABELS: Record<string, string> = {
  OWNER: "Vlasnik (app)",
  ADMIN: "Admin",
  MEMBER: "Član",
};

function MembersCard({ orgId }: { orgId: number }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [removeConfirmId, setRemoveConfirmId] = useState<number | null>(null);

  const { data: members = [], isLoading } = useQuery<OrgMember[]>({
    queryKey: ["members", orgId],
    queryFn: () => unwrap(getMembers(orgId)),
  });

  const addMutation = useMutation({
    mutationFn: (payload: { email: string; role: "ADMIN" | "MEMBER" }) =>
      unwrap(addMember(orgId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", orgId] });
      setShowAdd(false);
      setEmail("");
      setRole("MEMBER");
    },
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: number;
      role: "ADMIN" | "MEMBER";
    }) => unwrap(updateMemberRole(orgId, userId, role)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["members", orgId] }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => unwrap(removeMember(orgId, userId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", orgId] });
      setRemoveConfirmId(null);
    },
  });

  const addError =
    addMutation.error?.message === "USER_NOT_FOUND"
      ? "Korisnik s tim emailom nije pronađen."
      : addMutation.error?.message === "ALREADY_MEMBER"
        ? "Taj korisnik već ima pristup."
        : (addMutation.error?.message ?? null);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          Pristup korisnicima{members.length > 0 ? ` (${members.length})` : ""}
        </span>
        {!showAdd && (
          <button
            className={styles.btnPrimary}
            onClick={() => {
              setShowAdd(true);
              addMutation.reset();
            }}
          >
            + Dodaj korisnika
          </button>
        )}
      </div>

      {showAdd && (
        <form
          className={styles.formCard}
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate({ email: email.trim(), role });
          }}
        >
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Email korisnika</label>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="korisnik@email.ba"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Uloga</label>
              <select
                className={styles.input}
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
              >
                <option value="MEMBER">Član, može pregledati</option>
                <option value="ADMIN">Admin, može uređivati</option>
              </select>
            </div>
          </div>
          {addError && <div className={styles.errorMsg}>{addError}</div>}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => {
                setShowAdd(false);
                setEmail("");
                setRole("MEMBER");
              }}
            >
              Odustani
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? "Dodavanje..." : "Dodaj"}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className={styles.empty}>Učitavanje...</div>}

      {!isLoading && members.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Korisnik</th>
              <th>Email</th>
              <th>Uloga</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td className={styles.workerName}>
                  {m.user.firstName} {m.user.lastName}
                </td>
                <td className={styles.workerJmbg}>{m.user.email ?? "–"}</td>
                <td>
                  {m.role === "OWNER" ? (
                    <span className={styles.vlasnikBadge}>
                      {MEMBER_ROLE_LABELS[m.role]}
                    </span>
                  ) : (
                    <select
                      className={styles.roleSelect}
                      value={m.role}
                      disabled={roleChangeMutation.isPending}
                      onChange={(e) =>
                        roleChangeMutation.mutate({
                          userId: m.userId,
                          role: e.target.value as "ADMIN" | "MEMBER",
                        })
                      }
                    >
                      <option value="MEMBER">Član</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  )}
                </td>
                <td>
                  {m.role !== "OWNER" &&
                    (removeConfirmId === m.userId ? (
                      <div className={styles.rowActions}>
                        <button
                          className={styles.btnDanger}
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate(m.userId)}
                        >
                          {removeMutation.isPending ? "..." : "Potvrdi"}
                        </button>
                        <button
                          className={styles.btnGhost}
                          onClick={() => setRemoveConfirmId(null)}
                        >
                          Odustani
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.btnIcon}
                        title="Ukloni pristup"
                        onClick={() => setRemoveConfirmId(m.userId)}
                      >
                        <LuTrash2 />
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Worker table ─────────────────────────────────────────────────────────────

function WorkerTable({
  workers,
  orgType,
  canEdit,
  editId,
  editForm,
  setEditForm,
  deleteConfirmId,
  setDeleteConfirmId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  updateError,
  updatePending,
  deletePending,
  editLocationValid,
}: {
  workers: Worker[];
  orgType?: "COMPANY" | "BUSINESS" | null;
  canEdit: boolean;
  editId: number | null;
  editForm: WorkerForm;
  setEditForm: (f: WorkerForm) => void;
  deleteConfirmId: number | null;
  setDeleteConfirmId: (id: number | null) => void;
  onStartEdit: (w: Worker) => void;
  onCancelEdit: () => void;
  onSaveEdit: (w: Worker) => void;
  onDelete: (id: number) => void;
  updateError: string | null;
  updatePending: boolean;
  deletePending: boolean;
  editLocationValid: boolean;
}) {
  const [editLocError, setEditLocError] = useState(false);
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Ime i prezime</th>
          <th>Uloga</th>
          <th>JMBG</th>
          <th>Datum prijave</th>
          <th>Datum odjave</th>
          <th>Status</th>
          {canEdit && <th></th>}
        </tr>
      </thead>
      <tbody>
        {workers.map((w) =>
          editId === w.id ? (
            <tr key={w.id}>
              <td colSpan={canEdit ? 7 : 6}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editLocationValid) {
                      setEditLocError(true);
                      return;
                    }
                    setEditLocError(false);
                    onSaveEdit(w);
                  }}
                >
                  <WorkerFormFields value={editForm} onChange={setEditForm} orgType={orgType} />
                  {editLocError && !editLocationValid && (
                    <div className={styles.errorMsg}>
                      {editForm.prebivalisteEntitet === "RS"
                        ? "Odaberite opštinu (RS) sa liste, potrebna je za obračun plate."
                        : "Odaberite grad sa liste, potreban je za obračun plate."}
                    </div>
                  )}
                  {updateError && (
                    <div className={styles.errorMsg}>{updateError}</div>
                  )}
                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={onCancelEdit}
                    >
                      Odustani
                    </button>
                    <button
                      type="submit"
                      className={styles.btnPrimary}
                      disabled={updatePending}
                    >
                      {updatePending ? "Snimanje..." : "Sačuvaj"}
                    </button>
                  </div>
                </form>
              </td>
            </tr>
          ) : (
            <tr key={w.id}>
              <td className={styles.workerName}>
                {w.firstName} {w.lastName}
              </td>
              <td>
                <span
                  className={
                    w.role === "VLASNIK"
                      ? styles.vlasnikBadge
                      : styles.radnikBadge
                  }
                >
                  {ROLE_LABELS[w.role] ?? w.role}
                </span>
              </td>
              <td className={styles.workerJmbg}>{w.jmbg ?? "–"}</td>
              <td className={styles.dateRange}>{fmtDate(w.prijavaDate)}</td>
              <td className={styles.dateRange}>{fmtDate(w.odjavaDate)}</td>
              <td>
                {w.employmentStatus === "ODJAVLJEN" ? (
                  <span className={styles.inactiveBadge}>Odjavljen</span>
                ) : w.employmentStatus === "PRIJAVLJEN" ? (
                  <span className={styles.activeBadge}>Prijavljen</span>
                ) : (
                  <span className={styles.draftBadge ?? styles.activeBadge}>
                    Draft
                  </span>
                )}
              </td>
              {canEdit && (
                <td>
                  {deleteConfirmId === w.id ? (
                    <div className={styles.rowActions}>
                      <button
                        className={styles.btnDanger}
                        disabled={deletePending}
                        onClick={() => onDelete(w.id)}
                      >
                        {deletePending ? "..." : "Potvrdi"}
                      </button>
                      <button
                        className={styles.btnGhost}
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Odustani
                      </button>
                    </div>
                  ) : (
                    <div className={styles.rowActions}>
                      <button
                        className={styles.btnIcon}
                        title="Uredi"
                        onClick={() => onStartEdit(w)}
                      >
                        <LuPencil />
                        Uredi
                      </button>
                      <button
                        className={styles.btnIcon}
                        title="Obriši"
                        onClick={() => setDeleteConfirmId(w.id)}
                      >
                        <LuTrash2 />
                        Obriši
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
