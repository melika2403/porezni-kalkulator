"use client";

// Puna forma radnika u PK Office stilu (dodavanje + uređivanje). Paritet sa
// marketing formom u sections/organizacija (ista polja, ista payload logika),
// ali PkSelect / PkDateInput / PkAmountInput umjesto native kontrola.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
// PK stilovi i za marketing stranice (modal se portaluje sa .pk-scope klasom)
import "src/styles/pk-embed.css";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import CitySelect from "src/components/CitySelect/CitySelect";
import { RS_OPCINE } from "src/data/rs-opcine";
import { useCityLookup } from "src/hooks/useCities";
import { unwrap } from "src/api/auth";
import {
  createWorker,
  updateWorker,
  SALARY_TYPE_DESCRIPTIONS,
  SALARY_TYPE_LABELS,
  type SalaryType,
  type Worker,
  type WorkerPayload,
} from "src/api/profile";
import ZanimanjeSelect from "src/components/ZanimanjeSelect/ZanimanjeSelect";
import { isoToDisplay, parseDateInput } from "src/lib/dateInput";
import { formatKm, parseKm } from "src/lib/amountInput";
import { isJmbgValid, parseJmbg, spolFromJmbg } from "src/utils/jmbg";
import { parseDecimal, sanitizeDecimalInput } from "src/utils/parseDecimal";
import {
  computeContractEndIso,
  maxTrajanjeBroj,
  type TrajanjeJedinica,
} from "src/utils/contractDuration";

// ── Form state (datumi su display stringovi "DD.MM.GGGG.", iznosi "1.234,56") ──

export type WorkerFormState = {
  role: "VLASNIK" | "RADNIK";
  firstName: string;
  lastName: string;
  jmbg: string;
  idCardNumber: string;
  bankAccount: string;
  address: string;
  city: string;
  email: string;
  // startDate/endDate se ne uređuju u formi, ali se nose da se ne izgube.
  startDate: string; // ISO
  endDate: string; // ISO
  position: string;
  salaryType: SalaryType;
  salaryBruto: string;
  salaryNeto: string;
  contractType: "" | "NEODREDJENO" | "ODREDJENO";
  contractEndDate: string; // display
  probationMonths: string;
  noticePeriod: string;
  contractNumber: string;
  employmentStatus: "DRAFT" | "PRIJAVLJEN" | "ODJAVLJEN";
  prijavaDate: string; // display
  odjavaDate: string; // display
  spol: "" | "M" | "Z";
  strucnaSpremaIdx: string;
  // Klasifikacija zanimanja FBiH (KZBiH-08): naziv + šifra 7 cifara bez
  // tačke, ide u JS3100 (Zanimanje, Opis / Šifra)
  zanimanjeOpis: string;
  zanimanjeSifra: string;
  contractedHours: string;
  taxCoefficient: string;
  firstEmploymentDate: string; // display
  priorWorkYearsInt: string;
  priorWorkMonthsInt: string;
  mealAllowancePerDay: string;
  travelAllowancePerMonth: string;
  prebivalisteEntitet: "FBIH" | "RS";
  opcinaKod: string;
  // Trajne obustave na platu (rata kredita i sl.); iznos je display string.
  obustave: { naziv: string; iznos: string; aktivna: boolean }[];
};

export const emptyWorkerForm = (): WorkerFormState => ({
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
  zanimanjeOpis: "",
  zanimanjeSifra: "",
  contractedHours: "8",
  taxCoefficient: "1.0",
  firstEmploymentDate: "",
  priorWorkYearsInt: "",
  priorWorkMonthsInt: "",
  mealAllowancePerDay: "",
  travelAllowancePerMonth: "",
  prebivalisteEntitet: "FBIH",
  opcinaKod: "",
  obustave: [],
});

export function workerToForm(w: Worker): WorkerFormState {
  const money = (n: number | null) => (n == null ? "" : formatKm(Number(n)));
  // API može vratiti datum sa vremenom; display maska traži čisti ISO dan.
  const disp = (iso: string | null | undefined) =>
    isoToDisplay(String(iso ?? "").slice(0, 10));
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
    salaryBruto: money(w.salaryBruto),
    salaryNeto: money(w.salaryNeto),
    contractType: w.contractType ?? "",
    contractEndDate: disp(w.contractEndDate),
    probationMonths: w.probationMonths == null ? "" : String(w.probationMonths),
    noticePeriod: w.noticePeriod ?? "",
    contractNumber: w.contractNumber ?? "",
    employmentStatus: w.employmentStatus ?? "DRAFT",
    prijavaDate: disp(w.prijavaDate),
    odjavaDate: disp(w.odjavaDate),
    spol: w.spol ?? "",
    strucnaSpremaIdx:
      w.strucnaSpremaIdx == null ? "" : String(w.strucnaSpremaIdx),
    zanimanjeOpis: w.zanimanjeOpis ?? "",
    zanimanjeSifra: w.zanimanjeSifra ?? "",
    contractedHours: w.contractedHours == null ? "8" : String(w.contractedHours),
    taxCoefficient: w.taxCoefficient != null ? String(w.taxCoefficient) : "1.0",
    firstEmploymentDate: disp(w.firstEmploymentDate),
    priorWorkYearsInt: (() => {
      if (w.priorWorkYears == null) return "";
      const n = Number(w.priorWorkYears);
      return Number.isFinite(n) ? String(Math.floor(n)) : "";
    })(),
    priorWorkMonthsInt: (() => {
      if (w.priorWorkYears == null) return "";
      const n = Number(w.priorWorkYears);
      if (!Number.isFinite(n)) return "";
      const months = Math.round((n - Math.floor(n)) * 12);
      return months > 0 ? String(months) : "";
    })(),
    mealAllowancePerDay:
      w.mealAllowancePerDay != null ? formatKm(Number(w.mealAllowancePerDay)) : "",
    travelAllowancePerMonth:
      w.travelAllowancePerMonth != null
        ? formatKm(Number(w.travelAllowancePerMonth))
        : "",
    prebivalisteEntitet: w.prebivalisteEntitet === "RS" ? "RS" : "FBIH",
    opcinaKod: w.opcinaKod ?? "",
    obustave: (w.obustave ?? []).map((o) => ({
      naziv: o.naziv ?? "",
      iznos: o.iznos > 0 ? formatKm(Number(o.iznos)) : "",
      aktivna: o.aktivna !== false,
    })),
  };
}

function formToPayload(f: WorkerFormState): WorkerPayload {
  const probation = f.probationMonths.trim();
  const prijavaIso = parseDateInput(f.prijavaDate);
  const odjavaIso = parseDateInput(f.odjavaDate);
  return {
    role: f.role,
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    // Prazno se šalje kao null (ne undefined): backend ažurira samo poslana
    // polja, pa bi izostavljeno polje ostalo staro i brisanje ne bi prošlo.
    jmbg: f.jmbg.trim() || null,
    idCardNumber: f.idCardNumber.trim() || null,
    bankAccount: f.bankAccount.trim() || null,
    address: f.address.trim() || null,
    city: f.city.trim() || null,
    email: f.email.trim() || null,
    startDate: f.startDate || null,
    endDate: f.endDate || null,
    position: f.position.trim() || null,
    salaryType: f.salaryType,
    salaryBruto: parseKm(f.salaryBruto),
    salaryNeto: parseKm(f.salaryNeto),
    contractType: f.contractType === "" ? null : f.contractType,
    contractEndDate: parseDateInput(f.contractEndDate),
    probationMonths: probation === "" ? null : Number(probation),
    noticePeriod: f.noticePeriod.trim() || null,
    contractNumber: f.contractNumber.trim() || null,
    // Datumi su master, status je derivat (isto kao marketing forma):
    // otklanja slučaj kad se upiše prijava a zaboravi promijeniti status.
    employmentStatus: odjavaIso ? "ODJAVLJEN" : prijavaIso ? "PRIJAVLJEN" : "DRAFT",
    prijavaDate: prijavaIso,
    odjavaDate: odjavaIso,
    spol: f.spol === "" ? null : f.spol,
    strucnaSpremaIdx:
      f.strucnaSpremaIdx === "" ? null : Number(f.strucnaSpremaIdx),
    zanimanjeOpis: f.zanimanjeOpis.trim() || null,
    zanimanjeSifra: f.zanimanjeSifra.trim() || null,
    contractedHours: f.contractedHours === "" ? 8 : Number(f.contractedHours),
    taxCoefficient: (() => {
      // 0 je validno (radnik bez porezne kartice); default 1.0 samo za
      // prazan/neispravan/negativan unos.
      const trimmed = f.taxCoefficient.trim();
      if (!trimmed) return 1.0;
      const c = parseDecimal(f.taxCoefficient);
      return c >= 0 ? c : 1.0;
    })(),
    firstEmploymentDate: parseDateInput(f.firstEmploymentDate),
    priorWorkYears: (() => {
      const yStr = f.priorWorkYearsInt.trim();
      const mStr = f.priorWorkMonthsInt.trim();
      if (!yStr && !mStr) return null;
      const y = yStr ? Number(yStr) : 0;
      const m = mStr ? Number(mStr) : 0;
      if (!Number.isFinite(y) || !Number.isFinite(m) || y < 0 || m < 0) {
        return null;
      }
      const total = y + m / 12;
      return total >= 0 ? Number(total.toFixed(4)) : null;
    })(),
    mealAllowancePerDay: parseKm(f.mealAllowancePerDay),
    travelAllowancePerMonth: parseKm(f.travelAllowancePerMonth),
    prebivalisteEntitet: f.prebivalisteEntitet === "RS" ? "RS" : "FBIH",
    opcinaKod:
      f.prebivalisteEntitet === "RS" ? f.opcinaKod.trim() || null : null,
    // Prazni redovi se ne šalju; prazna lista se šalje kao null (briše zapis).
    obustave: (() => {
      const lista = f.obustave
        .map((o) => ({
          naziv: o.naziv.trim(),
          iznos: parseKm(o.iznos) ?? 0,
          aktivna: o.aktivna,
        }))
        .filter((o) => o.naziv || o.iznos > 0);
      return lista.length ? lista : null;
    })(),
  };
}

// Iste opcije kao u JS3100 (Drugi dio red 11), index = vrijednost koja se šalje.
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

const RADNO_VRIJEME_OPCIJE = [
  { value: "8", label: "8h, puno radno vrijeme" },
  { value: "7", label: "7h, nepuno (puna min. osnovica)" },
  { value: "6", label: "6h, nepuno (puna min. osnovica)" },
  { value: "5", label: "5h, nepuno (puna min. osnovica)" },
  { value: "4", label: "4h, nepuno (srazmjerno, 50%)" },
  { value: "3", label: "3h, nepuno (srazmjerno, 50%)" },
  { value: "2", label: "2h, nepuno (srazmjerno, 50%)" },
  { value: "1", label: "1h, nepuno (srazmjerno, 50%)" },
];

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600 disabled:opacity-60";
const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
const hintCls = "text-[11.5px] leading-4 text-text-tertiary mt-1";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full pt-2 first:pt-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wider text-brand-700 border-b border-cream-300 pb-1.5">
        {children}
      </div>
    </div>
  );
}

// Napomena: roditelj montira modal tek kad je otvoren, sa key-em po radniku
// (keyed remount), pa se state inicijalizuje iz props-a bez effect-a.
export function WorkerModal({
  orgId,
  orgType,
  /** null = novi radnik, inače radnik koji se uređuje. */
  worker,
  onClose,
  onSaved,
}: {
  orgId: number;
  orgType: "COMPANY" | "BUSINESS" | null;
  worker: Worker | null;
  onClose: () => void;
  /** Pozove se nakon uspješnog snimanja sa svježim radnikom (npr. selekcija u sidebaru). */
  onSaved?: (w: Worker) => void;
}) {
  const qc = useQueryClient();
  const { findByName } = useCityLookup();

  const workerId = worker?.id ?? null;
  const [form, setForm] = useState<WorkerFormState>(() =>
    worker ? workerToForm(worker) : emptyWorkerForm(),
  );
  const [error, setError] = useState<string | null>(null);
  // Pomoćni unos trajanja ugovora na određeno (broj + jedinica → datum isteka).
  const [trajanjeBroj, setTrajanjeBroj] = useState(1);
  const [trajanjeJedinica, setTrajanjeJedinica] =
    useState<TrajanjeJedinica>("godine");

  const save = useMutation({
    mutationFn: (payload: WorkerPayload) =>
      workerId == null
        ? unwrap(createWorker(orgId, payload))
        : unwrap(updateWorker(orgId, workerId, payload)),
    onSuccess: (saved) => {
      // obje query grupe: PK Office lista + marketing stranice
      qc.invalidateQueries({ queryKey: ["pk-workers", orgId] });
      qc.invalidateQueries({ queryKey: ["workers", orgId] });
      onSaved?.(saved);
      onClose();
    },
    onError: (e: Error) => {
      setError(
        e.message === "WORKERS_LIMIT_REACHED"
          ? "Dostignut je limit broja radnika za vaš plan."
          : e.message || "Greška pri snimanju, pokušajte ponovo.",
      );
    },
  });

  const isVlasnik = form.role === "VLASNIK";
  // Obrt vlasnik nema ugovor o radu ni bruto/neto (Obrazac 2002, fiksna
  // osnovica); za d.o.o. vlasnika sve isto kao za radnika.
  const isObrtVlasnik = isVlasnik && orgType === "BUSINESS";
  const jmbgInvalid = form.jmbg.length === 13 && !isJmbgValid(form.jmbg);

  function set<K extends keyof WorkerFormState>(k: K, v: WorkerFormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
    setError(null);
  }

  function submit() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Ime i prezime su obavezni.");
      return;
    }
    // Grad/opština moraju biti sa liste: iz njih se izvodi kanton/općina za
    // obračun plate i uplatnice.
    if (form.prebivalisteEntitet === "RS") {
      if (!form.opcinaKod) {
        setError("Odaberite opštinu (RS) sa liste, potrebna je za obračun plate.");
        return;
      }
    } else if (!findByName((form.city || "").trim())) {
      setError("Odaberite grad sa liste, potreban je za obračun plate.");
      return;
    }
    save.mutate(formToPayload(form));
  }

  const baseStartIso = form.startDate || todayIso();

  return (
    <Modal
      open
      onClose={onClose}
      title={workerId == null ? "Novi radnik" : `${form.firstName} ${form.lastName}`.trim() || "Uredi radnika"}
      maxWidthClass="max-w-[760px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Odustani
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={submit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {save.isPending && <IconLoader2 size={15} className="animate-spin" />}
            {workerId == null ? "Dodaj radnika" : "Sačuvaj"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {/* ── Lični podaci ── */}
        <SectionTitle>Lični podaci</SectionTitle>
        <div>
          <label className={labelCls}>Uloga</label>
          <PkSelect
            ariaLabel="Uloga"
            value={form.role}
            onChange={(v) => set("role", v === "VLASNIK" ? "VLASNIK" : "RADNIK")}
            options={[
              { value: "RADNIK", label: "Radnik" },
              { value: "VLASNIK", label: "Vlasnik" },
            ]}
            wrapStyle={{ width: "100%" }}
          />
        </div>
        <div>
          <label className={labelCls}>Spol</label>
          <PkSelect
            ariaLabel="Spol"
            value={form.spol}
            onChange={(v) => set("spol", (v === "M" || v === "Z" ? v : "") as WorkerFormState["spol"])}
            options={[
              { value: "", label: "– Odaberi –" },
              { value: "M", label: "Muški" },
              { value: "Z", label: "Ženski" },
            ]}
            wrapStyle={{ width: "100%" }}
          />
        </div>
        <div>
          <label className={labelCls}>Ime *</label>
          <input
            className={inputCls}
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            placeholder="Ime"
          />
        </div>
        <div>
          <label className={labelCls}>Prezime *</label>
          <input
            className={inputCls}
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="Prezime"
          />
        </div>
        <div>
          <label className={labelCls}>JMBG</label>
          <input
            className={`${inputCls} ${jmbgInvalid ? "border-accent-500" : ""}`}
            value={form.jmbg}
            onChange={(e) => {
              const jmbg = e.target.value.replace(/\D/g, "").slice(0, 13);
              setForm((s) => {
                const next = { ...s, jmbg };
                if (jmbg.length >= 12 && !s.spol) {
                  const inferred = spolFromJmbg(jmbg);
                  if (inferred) next.spol = inferred;
                }
                return next;
              });
              setError(null);
            }}
            placeholder="1234567890123"
            inputMode="numeric"
            maxLength={13}
          />
          {jmbgInvalid && (
            <p className="text-[11.5px] text-accent-500 mt-1">
              {parseJmbg(form.jmbg).error}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Broj lične karte</label>
          <input
            className={inputCls}
            value={form.idCardNumber}
            onChange={(e) => set("idCardNumber", e.target.value.slice(0, 9))}
            placeholder="npr. 12ABC3456"
            maxLength={9}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Stručna sprema</label>
          <PkSelect
            ariaLabel="Stručna sprema"
            value={form.strucnaSpremaIdx}
            onChange={(v) => set("strucnaSpremaIdx", v == null ? "" : String(v))}
            options={[
              { value: "", label: "– Odaberi –" },
              ...STRUCNA_SPREMA_OPCIJE.map((t, i) => ({
                value: String(i),
                label: t,
              })),
            ]}
            wrapStyle={{ width: "100%" }}
          />
        </div>

        {/* ── Adresa i banka ── */}
        <SectionTitle>Adresa i bankarski podaci</SectionTitle>
        <div>
          <label className={labelCls}>Adresa</label>
          <input
            className={inputCls}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Ulica i broj"
          />
        </div>
        <div>
          <label className={labelCls}>Prebivalište</label>
          <PkSelect
            ariaLabel="Prebivalište (entitet)"
            value={form.prebivalisteEntitet}
            onChange={(v) =>
              setForm((s) => ({
                ...s,
                prebivalisteEntitet: v === "RS" ? "RS" : "FBIH",
                opcinaKod: v === "RS" ? s.opcinaKod : "",
              }))
            }
            options={[
              { value: "FBIH", label: "Federacija BiH" },
              { value: "RS", label: "Republika Srpska" },
            ]}
            wrapStyle={{ width: "100%" }}
          />
          <p className={hintCls}>
            Radnik iz RS ima uplatu zdravstvenog i nezaposlenosti na Budžet RS
            (Obrazac 2001-A).
          </p>
        </div>
        {form.prebivalisteEntitet === "RS" ? (
          <>
            <div>
              <label className={labelCls}>Grad</label>
              <input
                className={inputCls}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="npr. Banja Luka"
              />
            </div>
            <div>
              <label className={labelCls}>Opština (RS) *</label>
              <PkSelect
                ariaLabel="Opština (RS)"
                value={form.opcinaKod}
                onChange={(v) => set("opcinaKod", v == null ? "" : String(v))}
                searchable
                searchPlaceholder="Traži opštinu..."
                placeholder="Izaberite opštinu..."
                options={RS_OPCINE.map((o) => ({
                  value: o.kod,
                  label: `${o.naziv} (${o.kod})`,
                }))}
                wrapStyle={{ width: "100%" }}
              />
              <p className={hintCls}>
                Obavezno sa liste, potrebna za obračun plate i uplatnice.
              </p>
            </div>
          </>
        ) : (
          <div className="sm:col-span-2">
            <label className={labelCls}>Grad *</label>
            <CitySelect
              value={form.city}
              onChange={(v) => set("city", v)}
              className={inputCls}
              strict
            />
            <p className={hintCls}>
              Grad odaberite sa liste, iz njega se određuje kanton i općina za
              obračun plate i uplatnice.
            </p>
          </div>
        )}
        <div>
          <label className={labelCls}>Broj tekućeg računa</label>
          <input
            className={`${inputCls} font-mono text-[12.5px]`}
            value={form.bankAccount}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 16);
              const parts = [
                d.slice(0, 3),
                d.slice(3, 6),
                d.slice(6, 14),
                d.slice(14, 16),
              ].filter(Boolean);
              set("bankAccount", parts.join("-"));
            }}
            placeholder="XXX-XXX-XXXXXXXX-XX"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className={labelCls}>Email radnika</label>
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="ime.prezime@primjer.ba"
          />
          <p className={hintCls}>
            Koristi se za slanje platnih listića; prazno = ne šalje se.
          </p>
        </div>

        {/* ── JS3100 prijava / odjava ── */}
        <SectionTitle>JS3100 prijava / odjava</SectionTitle>
        <div>
          <label className={labelCls}>
            Datum prijave (JS3100){" "}
            <span className="normal-case tracking-normal">
              · koristi se za obračun plata
            </span>
          </label>
          <PkDateInput
            value={form.prijavaDate}
            onChange={(v) => set("prijavaDate", v)}
            ariaLabel="Datum prijave"
          />
        </div>
        <div>
          <label className={labelCls}>Datum odjave (JS3100)</label>
          <PkDateInput
            value={form.odjavaDate}
            onChange={(v) => set("odjavaDate", v)}
            ariaLabel="Datum odjave"
          />
        </div>
        <div>
          <label className={labelCls}>Zanimanje (klasifikacija FBiH)</label>
          <ZanimanjeSelect
            className={inputCls}
            value={form.zanimanjeOpis}
            onChange={(v) => set("zanimanjeOpis", v)}
            onPick={(z) =>
              setForm((s) => ({
                ...s,
                zanimanjeOpis: z.naziv,
                zanimanjeSifra: z.sifra,
              }))
            }
          />
          <p className={hintCls}>
            Izbor sa liste popuni i šifru; ide u JS3100 obrazac.
          </p>
        </div>
        <div>
          <label className={labelCls}>Zanimanje, šifra (7 cifara)</label>
          <input
            className={inputCls}
            inputMode="numeric"
            maxLength={7}
            value={form.zanimanjeSifra}
            onChange={(e) =>
              set("zanimanjeSifra", e.target.value.replace(/\D/g, "").slice(0, 7))
            }
            placeholder="npr. 5131002"
          />
        </div>
        {!isObrtVlasnik && (
          <div className="sm:col-span-2">
            <label className={labelCls}>Status</label>
            <PkSelect
              ariaLabel="Status radnika"
              value={form.employmentStatus}
              onChange={(v) => {
                // Status je master: promjena statusa uskladi datume tako da
                // backend (koji status derivira iz datuma) izvede isto.
                const status = (v ?? "DRAFT") as WorkerFormState["employmentStatus"];
                const today = isoToDisplay(todayIso());
                setForm((s) => {
                  if (status === "PRIJAVLJEN") {
                    return {
                      ...s,
                      employmentStatus: status,
                      prijavaDate: s.prijavaDate || today,
                      odjavaDate: "",
                    };
                  }
                  if (status === "ODJAVLJEN") {
                    return {
                      ...s,
                      employmentStatus: status,
                      odjavaDate: s.odjavaDate || today,
                    };
                  }
                  return {
                    ...s,
                    employmentStatus: status,
                    prijavaDate: "",
                    odjavaDate: "",
                  };
                });
              }}
              options={[
                { value: "DRAFT", label: "Draft (još nije prijavljen)" },
                { value: "PRIJAVLJEN", label: "Prijavljen kod PIO/ZZO" },
                { value: "ODJAVLJEN", label: "Odjavljen" },
              ]}
              wrapStyle={{ width: "100%" }}
            />
            <p className="text-[12px] leading-5 mt-1.5 px-3 py-2 rounded-lg bg-warning-bg/50 border border-warning/30 text-text-secondary">
              Plata se obračunava samo radnicima sa statusom{" "}
              <strong>Prijavljen</strong>. Ako ostane Draft, radnik se ne uzima
              u obračun plate.
            </p>
          </div>
        )}

        {/* ── Ugovor o radu i plata (nema za obrt vlasnika) ── */}
        {!isObrtVlasnik && (
          <>
            <SectionTitle>Ugovor o radu i plata</SectionTitle>
            <div>
              <label className={labelCls}>Radno mjesto / pozicija</label>
              <input
                className={inputCls}
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
                placeholder="Npr. Programer, konobar..."
              />
            </div>
            <div>
              <label className={labelCls}>Vrsta ugovora</label>
              <PkSelect
                ariaLabel="Vrsta ugovora"
                value={form.contractType}
                onChange={(v) =>
                  set(
                    "contractType",
                    (v === "NEODREDJENO" || v === "ODREDJENO"
                      ? v
                      : "") as WorkerFormState["contractType"],
                  )
                }
                options={[
                  { value: "", label: "– Odaberi –" },
                  { value: "NEODREDJENO", label: "Neodređeno" },
                  { value: "ODREDJENO", label: "Određeno" },
                ]}
                wrapStyle={{ width: "100%" }}
              />
            </div>
            {form.contractType === "ODREDJENO" && (
              <>
                <div>
                  <label className={labelCls}>Trajanje ugovora</label>
                  <div className="flex gap-2">
                    <PkSelect
                      ariaLabel="Trajanje (broj)"
                      value={String(trajanjeBroj)}
                      onChange={(v) => {
                        const n = Number(v) || 1;
                        setTrajanjeBroj(n);
                        const end = computeContractEndIso(
                          baseStartIso,
                          n,
                          trajanjeJedinica,
                        );
                        if (end) set("contractEndDate", isoToDisplay(end));
                      }}
                      options={Array.from(
                        { length: maxTrajanjeBroj(trajanjeJedinica) },
                        (_, i) => ({
                          value: String(i + 1),
                          label: String(i + 1),
                        }),
                      )}
                      wrapStyle={{ width: 80 }}
                    />
                    <PkSelect
                      ariaLabel="Trajanje (jedinica)"
                      value={trajanjeJedinica}
                      onChange={(v) => {
                        const j = (v === "mjeseci" ? "mjeseci" : "godine") as TrajanjeJedinica;
                        setTrajanjeJedinica(j);
                        const capped = Math.min(trajanjeBroj, maxTrajanjeBroj(j));
                        if (capped !== trajanjeBroj) setTrajanjeBroj(capped);
                        const end = computeContractEndIso(baseStartIso, capped, j);
                        if (end) set("contractEndDate", isoToDisplay(end));
                      }}
                      options={[
                        { value: "mjeseci", label: "mjeseci" },
                        { value: "godine", label: "godine" },
                      ]}
                      wrapStyle={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Datum isteka ugovora</label>
                  <PkDateInput
                    value={form.contractEndDate}
                    onChange={(v) => set("contractEndDate", v)}
                    ariaLabel="Datum isteka ugovora"
                  />
                </div>
              </>
            )}
            <div>
              <label className={labelCls}>Ugovoreno radno vrijeme</label>
              <PkSelect
                ariaLabel="Ugovoreno radno vrijeme"
                value={form.contractedHours}
                onChange={(v) => set("contractedHours", v == null ? "8" : String(v))}
                options={RADNO_VRIJEME_OPCIJE}
                wrapStyle={{ width: "100%" }}
              />
            </div>
            <div>
              <label className={labelCls}>Probni rad (mjeseci)</label>
              <PkSelect
                ariaLabel="Probni rad"
                value={form.probationMonths}
                onChange={(v) => set("probationMonths", v == null ? "" : String(v))}
                options={[
                  { value: "", label: "– Nema –" },
                  ...[1, 2, 3, 4, 5, 6].map((m) => ({
                    value: String(m),
                    label: String(m),
                  })),
                ]}
                wrapStyle={{ width: "100%" }}
              />
            </div>
            <div>
              <label className={labelCls}>Topli obrok po danu (KM)</label>
              <PkAmountInput
                value={form.mealAllowancePerDay}
                onChange={(v) => set("mealAllowancePerDay", v)}
                placeholder="stopa firme"
                title="Override dnevne stope toplog obroka. Prazno = stopa postavljena na nivou firme."
                ariaLabel="Topli obrok po danu"
              />
            </div>
            <div>
              <label className={labelCls}>Putni trošak mjesečno (KM)</label>
              <PkAmountInput
                value={form.travelAllowancePerMonth}
                onChange={(v) => set("travelAllowancePerMonth", v)}
                placeholder="npr. 30,00"
                title="Fiksni mjesečni putni trošak; automatski se popunjava u obračun plata. Prazno = bez putnog troška."
                ariaLabel="Putni trošak mjesečno"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Tip plate</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["NETO_ISPLATA", "NETO_UGOVOR", "BRUTO"] as SalaryType[]).map(
                  (t) => {
                    const active = form.salaryType === t;
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => set("salaryType", t)}
                        className={[
                          "text-left rounded-lg border px-3 py-2.5 transition-colors",
                          active
                            ? "border-brand-600 bg-brand-100/60"
                            : "border-cream-300 bg-cream-100 hover:bg-cream-200",
                        ].join(" ")}
                      >
                        <span className="block text-[12.5px] font-semibold text-text-primary">
                          {SALARY_TYPE_LABELS[t]}
                        </span>
                        <span className="block text-[11.5px] leading-4 text-text-tertiary mt-0.5">
                          {SALARY_TYPE_DESCRIPTIONS[t]}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
            {form.salaryType === "BRUTO" ? (
              <div>
                <label className={labelCls}>Bruto osnovica (KM)</label>
                <PkAmountInput
                  value={form.salaryBruto}
                  onChange={(v) => set("salaryBruto", v)}
                  ariaLabel="Bruto osnovica"
                />
                <p className={hintCls}>
                  Bruto iz ugovora; neto raste sa godinama staža.
                </p>
              </div>
            ) : (
              <div>
                <label className={labelCls}>
                  {form.salaryType === "NETO_UGOVOR"
                    ? "Neto po ugovoru (KM)"
                    : "Cilj neto za isplatu (KM)"}
                </label>
                <PkAmountInput
                  value={form.salaryNeto}
                  onChange={(v) => set("salaryNeto", v)}
                  ariaLabel="Neto plata"
                />
                <p className={hintCls}>
                  {form.salaryType === "NETO_UGOVOR"
                    ? "Neto iz ugovora; radnik dobija povišicu za svaku godinu staža."
                    : "Iznos koji radnik svaki mjesec dobija."}
                </p>
              </div>
            )}
            <div>
              <label className={labelCls}>Otkazni rok</label>
              <input
                className={inputCls}
                value={form.noticePeriod}
                onChange={(e) => set("noticePeriod", e.target.value)}
                placeholder="Npr. 30 dana"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Broj ugovora</label>
              <input
                className={inputCls}
                value={form.contractNumber}
                onChange={(e) => set("contractNumber", e.target.value)}
                placeholder="Npr. 15/2026"
              />
            </div>
          </>
        )}

        {/* ── Porez i radni staž ── */}
        <SectionTitle>Porez i radni staž</SectionTitle>
        <div className={isObrtVlasnik ? "sm:col-span-2" : ""}>
          <label className={labelCls}>
            Porezni koeficijent{" "}
            <span className="normal-case tracking-normal">
              · 1.0 = 300 KM odbitka
            </span>
          </label>
          <input
            className={inputCls}
            value={form.taxCoefficient}
            onChange={(e) =>
              set("taxCoefficient", sanitizeDecimalInput(e.target.value))
            }
            placeholder="1.0"
            inputMode="decimal"
          />
        </div>
        {!isObrtVlasnik && (
          <>
            <div className="sm:col-span-1">
              <label className={labelCls}>
                Datum prvog zaposljenja{" "}
                <span className="normal-case tracking-normal">
                  · bez prekida u radu
                </span>
              </label>
              <PkDateInput
                value={form.firstEmploymentDate}
                onChange={(v) => set("firstEmploymentDate", v)}
                ariaLabel="Datum prvog zaposljenja"
              />
            </div>
            <div>
              <label className={labelCls}>
                Staž prije naše firme{" "}
                <span className="normal-case tracking-normal">
                  · koristi ako ima prekida
                </span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    className={inputCls}
                    value={form.priorWorkYearsInt}
                    onChange={(e) =>
                      set("priorWorkYearsInt", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="0"
                    inputMode="numeric"
                  />
                  <p className="text-[11px] text-text-tertiary text-center mt-0.5">
                    godine
                  </p>
                </div>
                <div className="flex-1">
                  <input
                    className={inputCls}
                    value={form.priorWorkMonthsInt}
                    onChange={(e) =>
                      set("priorWorkMonthsInt", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="0"
                    inputMode="numeric"
                  />
                  <p className="text-[11px] text-text-tertiary text-center mt-0.5">
                    mjeseci
                  </p>
                </div>
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className={hintCls}>
                Minuli rad se računa na ukupan radni staž, ne samo na staž u
                našoj firmi. Popunite jedno od dva polja; ako je popunjeno
                oboje, staž prije firme ima prednost. Prazno = minuli rad od
                datuma prijave u našu firmu.
              </p>
            </div>
          </>
        )}

        {/* ── Obustave na platu ── */}
        {!isObrtVlasnik && (
          <>
            <SectionTitle>Obustave na platu</SectionTitle>
            <div className="sm:col-span-2 space-y-2">
              {form.obustave.map((o, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[150px]">
                    <label className={labelCls}>Naziv</label>
                    <input
                      className={inputCls}
                      value={o.naziv}
                      onChange={(e) => {
                        const naziv = e.target.value;
                        setForm((s) => ({
                          ...s,
                          obustave: s.obustave.map((r, j) =>
                            j === i ? { ...r, naziv } : r,
                          ),
                        }));
                        setError(null);
                      }}
                      placeholder="Npr. rata kredita UniCredit"
                    />
                  </div>
                  <div className="w-[130px]">
                    <label className={labelCls}>Iznos (KM)</label>
                    <PkAmountInput
                      value={o.iznos}
                      onChange={(v) =>
                        setForm((s) => ({
                          ...s,
                          obustave: s.obustave.map((r, j) =>
                            j === i ? { ...r, iznos: v } : r,
                          ),
                        }))
                      }
                      ariaLabel="Iznos obustave"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 pb-2.5 text-[12.5px] text-text-primary select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={o.aktivna}
                      onChange={(e) => {
                        const aktivna = e.target.checked;
                        setForm((s) => ({
                          ...s,
                          obustave: s.obustave.map((r, j) =>
                            j === i ? { ...r, aktivna } : r,
                          ),
                        }));
                      }}
                    />
                    Aktivna
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((s) => ({
                        ...s,
                        obustave: s.obustave.filter((_, j) => j !== i),
                      }))
                    }
                    className="mb-0.5 px-3 py-1.5 rounded-lg border border-accent-500/40 bg-accent-500/10 text-[12px] text-accent-500 hover:bg-accent-500/20 transition-colors"
                  >
                    Ukloni
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setForm((s) => ({
                    ...s,
                    obustave: [
                      ...s.obustave,
                      { naziv: "", iznos: "", aktivna: true },
                    ],
                  }))
                }
                className="px-3 py-1.5 rounded-lg border border-cream-300 bg-cream-100 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors"
              >
                + Dodaj obustavu
              </button>
              <p className={hintCls}>
                Rata kredita ili druga obustava koju firma uplaćuje umjesto
                radnika. Aktivne obustave se svaki mjesec automatski predlažu u
                obračunu plate i umanjuju iznos za isplatu radniku (neto plata,
                doprinosi i porez se ne mijenjaju).
              </p>
            </div>
          </>
        )}

        {error && (
          <p className="sm:col-span-2 text-[12.5px] text-accent-500">{error}</p>
        )}
      </div>
    </Modal>
  );
}
