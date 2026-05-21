"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLastOrg } from "src/hooks/useLastOrg";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import styles from "./organizacija.module.css";
import {
  getOrganization,
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  getMembers,
  addMember,
  removeMember,
  updateMemberRole,
  type Organization,
  type Worker,
  type WorkerPayload,
  type OrgMember,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import RoleGuard from "src/components/RoleGuard/RoleGuard";
import DateInput from "src/components/DateInput/DateInput";
import CitySelect from "src/components/CitySelect/CitySelect";
import { useRole } from "src/hooks/useRole";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkerForm = {
  role: "VLASNIK" | "RADNIK";
  firstName: string;
  lastName: string;
  jmbg: string;
  idCardNumber: string;
  bankAccount: string;
  address: string;
  city: string;
  startDate: string;
  endDate: string;
  // Ugovor o radu
  position: string;
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
  startDate: "",
  endDate: "",
  position: "",
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
    startDate: f.startDate || null,
    endDate: f.endDate.trim() || null,
    position: f.position.trim() || null,
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
      const c = Number(f.taxCoefficient.replace(",", "."));
      // 0 je validna vrijednost (radnik bez porezne kartice → bez ličnog
      // odbitka). Prihvati svaku non-negative vrijednost; default 1.0 samo
      // ako je input neispravan ili negativan.
      return Number.isFinite(c) && c >= 0 ? c : 1.0;
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
  };
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
    startDate: w.startDate ?? "",
    endDate: w.endDate ?? "",
    position: w.position ?? "",
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
  };
}

const ROLE_LABELS: Record<string, string> = {
  VLASNIK: "Vlasnik",
  RADNIK: "Radnik",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
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
  "DR — Doktor nauka",
  "MR — Magistar",
  "VSS — Visoka stručna sprema",
  "VŠS — Viša stručna sprema",
  "SSS — Srednja stručna sprema",
  "Niža",
  "VKV — Visokokvalifikovani",
  "KV — Kvalifikovani",
  "PK — Polukvalifikovani",
  "NK — Nekvalifikovani",
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

  const isVlasnik = value.role === "VLASNIK";
  // Obrt vlasnik ima poseban režim (Obrazac 2002, fiksna osnovica) — bruto/neto
  // i ostala ugovor-o-radu polja se ne primjenjuju. Za d.o.o. vlasnika treba
  // sve isto kao za radnika (on JE radnik sa stanovišta obračuna plate).
  const isObrtVlasnik = isVlasnik && orgType === "BUSINESS";

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
            <option value="">— Odaberi —</option>
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
            <option value="">— Odaberi —</option>
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
          <label className={styles.fieldLabel}>Grad</label>
          <CitySelect
            value={value.city}
            onChange={(v) => onChange({ ...value, city: v })}
            className={styles.input}
          />
        </div>
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
      </FormSection>

      {/* ── 3. JS3100 prijava / odjava ── */}
      <FormSection title="JS3100 prijava / odjava" icon={ICON_CLIPBOARD}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            Datum prijave (JS3100){" "}
            <span style={{ color: "var(--mid)", fontWeight: 400, fontSize: 11 }}>
              — koristi se za period u obrascima 2001/2002
            </span>
          </label>
          <DateInput
            className={styles.input}
            value={value.prijavaDate}
            onValueChange={(iso) => onChange({ ...value, prijavaDate: iso })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Datum odjave (JS3100)</label>
          <DateInput
            className={styles.input}
            value={value.odjavaDate}
            onValueChange={(iso) => onChange({ ...value, odjavaDate: iso })}
          />
        </div>
        {!isObrtVlasnik && (
          <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <label className={styles.fieldLabel}>Status</label>
            <select
              className={styles.input}
              value={value.employmentStatus}
              onChange={set("employmentStatus")}
            >
              <option value="DRAFT">Draft (još nije prijavljen)</option>
              <option value="PRIJAVLJEN">Prijavljen kod PIO/ZZO</option>
              <option value="ODJAVLJEN">Odjavljen</option>
            </select>
          </div>
        )}
      </FormSection>

      {/* ── 4. Ugovor o radu i plata — samo za radnike i d.o.o. vlasnika ── */}
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
              <option value="">— Odaberi —</option>
              <option value="NEODREDJENO">Neodređeno</option>
              <option value="ODREDJENO">Određeno</option>
            </select>
          </div>
          {value.contractType === "ODREDJENO" && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Datum isteka ugovora</label>
              <DateInput
                className={styles.input}
                value={value.contractEndDate}
                onValueChange={(iso) =>
                  onChange({ ...value, contractEndDate: iso })
                }
              />
            </div>
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
              <option value="8">8h — puno radno vrijeme</option>
              <option value="7">7h — nepuno (puna min. osnovica)</option>
              <option value="6">6h — nepuno (puna min. osnovica)</option>
              <option value="5">5h — nepuno (puna min. osnovica)</option>
              <option value="4">4h — nepuno (srazmjerno, 50%)</option>
              <option value="3">3h — nepuno (srazmjerno, 50%)</option>
              <option value="2">2h — nepuno (srazmjerno, 50%)</option>
              <option value="1">1h — nepuno (srazmjerno, 50%)</option>
            </select>
          </div>
          <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
            <p
              className={styles.fieldHint}
              style={{
                margin: "0 0 0.4rem",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--sage)",
              }}
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
                style={{ flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                Unesi <strong>samo jedan</strong> od ova dva iznosa — drugi će
                se automatski preračunati u obračunu plate.
              </span>
            </p>
          </div>
          <div className={`${styles.field} ${styles.fieldHighlight}`}>
            <label className={`${styles.fieldLabel} ${styles.fieldLabelHighlight}`}>
              Bruto plata (KM)
            </label>
            <input
              className={styles.input}
              value={value.salaryBruto}
              onChange={set("salaryBruto")}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div className={`${styles.field} ${styles.fieldHighlight}`}>
            <label className={`${styles.fieldLabel} ${styles.fieldLabelHighlight}`}>
              Neto plata (KM)
            </label>
            <input
              className={styles.input}
              value={value.salaryNeto}
              onChange={set("salaryNeto")}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Probni rad (mjeseci, 0–6)</label>
            <select
              className={styles.input}
              value={value.probationMonths}
              onChange={set("probationMonths")}
            >
              <option value="">— Nema —</option>
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
            Porezni koeficijent{" "}
            <span style={{ color: "var(--mid)", fontWeight: 400, fontSize: 11 }}>
              — 1.0 = 300 KM odbitka
            </span>
          </label>
          <input
            className={styles.input}
            value={value.taxCoefficient}
            onChange={set("taxCoefficient")}
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
                Datum prvog zaposljenja{" "}
                <span style={{ color: "var(--mid)", fontWeight: 400, fontSize: 11 }}>
                  — bez prekida u radu
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
                Staž prije naše firme{" "}
                <span style={{ color: "var(--mid)", fontWeight: 400, fontSize: 11 }}>
                  — koristi ako ima prekida
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
  const isProLimitReached = userRole === "PRO" && workers.length >= PRO_WORKERS_LIMIT;
  const isUserLimitReached = userRole === "USER" && workers.length >= USER_WORKERS_LIMIT;
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
                Vlasnik: {org.owner.firstName} {org.owner.lastName}
              </span>
            )}
          </div>
        </div>

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
                createMutation.mutate(formToPayload(addForm));
              }}
            >
              <WorkerFormFields value={addForm} onChange={setAddForm} orgType={org?.type} />
              {createMutation.error && (
                <div className={styles.errorMsg}>
                  {createMutation.error.message === "WORKERS_LIMIT_REACHED"
                    ? userRole === "USER"
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
            />
          )}
        </div>

        {/* ── Members card (owner only) ── */}
        {org.memberRole === "OWNER" && <MembersCard orgId={orgId} />}
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
                <option value="MEMBER">Član — može pregledati</option>
                <option value="ADMIN">Admin — može uređivati</option>
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
                <td className={styles.workerJmbg}>{m.user.email ?? "—"}</td>
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
}) {
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
                    onSaveEdit(w);
                  }}
                >
                  <WorkerFormFields value={editForm} onChange={setEditForm} orgType={orgType} />
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
              <td className={styles.workerJmbg}>{w.jmbg ?? "—"}</td>
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
