"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWorker, type Worker, type WorkerPayload } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { useRole } from "src/hooks/useRole";
import { isJmbgValid, parseJmbg, spolFromJmbg } from "src/utils/jmbg";
import { parseDecimal, sanitizeDecimalInput } from "src/utils/parseDecimal";
import { formatMoneyBlur } from "src/lib/format";
import DateInput from "src/components/DateInput/DateInput";
import CitySelect, { CityNote } from "src/components/CitySelect/CitySelect";
import { useCityLookup } from "src/hooks/useCities";
import { RS_OPCINE } from "src/data/rs-opcine";
import styles from "./QuickAddWorkerModal.module.css";

type Props = {
  orgId: number;
  onClose: () => void;
  onCreated: (w: Worker) => void;
};

const formatZiro = (raw: string): string => {
  const d = raw.replace(/\D/g, "").slice(0, 16);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 14), d.slice(14, 16)].filter(
    Boolean,
  );
  return parts.join("-");
};

const formatAmount = (s: string): string => {
  if (!s) return "";
  const parts = s.replace(/\./g, "").split(",");
  const intPart = parts[0].replace(/\D/g, "");
  const intFmt = intPart ? Number(intPart).toLocaleString("de-DE") : "";
  if (parts.length === 1) return intFmt;
  const decPart = parts[1].replace(/\D/g, "").slice(0, 2);
  return `${intFmt},${decPart}`;
};

const parseKm = (s: string): number | null => {
  const t = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
};

export default function QuickAddWorkerModal({ orgId, onClose, onCreated }: Props) {
  const queryClient = useQueryClient();
  const { hasRole } = useRole();
  const canCreateWorker = hasRole("PRO", "BUSINESS", "ADMIN");

  // Mount-na-body kroz portal da pobjegnemo stacking context-u parent layouta
  // (npr. JS3100 form: bez portala neka apsolutno pozicionirana djeca
  // pozadinskih DateInput-a probiju kroz backdrop).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!canCreateWorker) {
    const content = (
      <div className={styles.backdrop}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2 className={styles.title}>Novi radnik</h2>
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Zatvori"
            >
              ×
            </button>
          </div>
          <p className={styles.hint}>
            Dodavanje radnika dostupno je uz <strong>Pro</strong> ili{" "}
            <strong>Business</strong> pretplatu. Ostale funkcije (preview
            ugovora, JS3100, šihterice) možeš koristiti besplatno za sebe kao
            vlasnika.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>
              Zatvori
            </button>
            <Link href="/pretplate" className={styles.btnPrimary}>
              Pogledaj pretplate →
            </Link>
          </div>
        </div>
      </div>
    );
    if (!mounted) return null;
    return createPortal(content, document.body);
  }

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jmbg, setJmbg] = useState("");
  const [spol, setSpol] = useState<"M" | "Z" | "">("");
  const [position, setPosition] = useState("");
  const [salaryBruto, setSalaryBruto] = useState("");
  const [salaryNeto, setSalaryNeto] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [prijavaDate, setPrijavaDate] = useState("");
  const [notRegistered, setNotRegistered] = useState(false);
  const [taxCoefficient, setTaxCoefficient] = useState("1.0");
  const [prebivalisteEntitet, setPrebivalisteEntitet] = useState<"FBIH" | "RS">(
    "FBIH",
  );
  const [city, setCity] = useState("");
  const [opcinaKod, setOpcinaKod] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { findByName } = useCityLookup();
  // Grad/opština moraju biti sa liste (određuju kanton/općinu za obračun plate).
  const cityValid =
    prebivalisteEntitet === "RS" ? !!opcinaKod : !!findByName(city.trim());

  const mutation = useMutation({
    mutationFn: (payload: WorkerPayload) => unwrap(createWorker(orgId, payload)),
    onSuccess: (worker) => {
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      onCreated(worker);
      onClose();
    },
    onError: (e) => {
      setError((e as Error).message || "Greška pri kreiranju radnika");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Ime i prezime su obavezni");
      return;
    }
    if (jmbg && jmbg.length === 13 && !isJmbgValid(jmbg)) {
      setError(parseJmbg(jmbg).error ?? "Nevažeći JMBG");
      return;
    }
    if (!cityValid) {
      setError(
        prebivalisteEntitet === "RS"
          ? "Odaberite opštinu (RS) sa liste, potrebna je za obračun plate."
          : "Odaberite grad sa liste, potreban je za obračun plate.",
      );
      return;
    }
    // Ako je korisnik unio datum prijave i nije označio "nije prijavljen",
    // radnik se odmah računa kao PRIJAVLJEN. Inače DRAFT.
    const isPrijavljen = !notRegistered && !!prijavaDate;
    const trimmedCoef = taxCoefficient.trim();
    const coef = trimmedCoef ? parseDecimal(trimmedCoef) : 1.0;
    mutation.mutate({
      role: "RADNIK",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      jmbg: jmbg.trim() || undefined,
      spol: spol || null,
      position: position.trim() || null,
      salaryBruto: parseKm(salaryBruto),
      salaryNeto: parseKm(salaryNeto),
      bankAccount: bankAccount.trim() || undefined,
      startDate: startDate || null,
      prijavaDate: isPrijavljen ? prijavaDate : null,
      employmentStatus: isPrijavljen ? "PRIJAVLJEN" : "DRAFT",
      taxCoefficient: Number.isFinite(coef) && coef >= 0 ? coef : 1.0,
      city: city.trim() || undefined,
      prebivalisteEntitet,
      opcinaKod: prebivalisteEntitet === "RS" ? opcinaKod : undefined,
    });
  };

  const content = (
    <div className={styles.backdrop}>
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h2 className={styles.title}>Novi radnik</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Zatvori">
            ×
          </button>
        </div>
        <p className={styles.hint}>
          Brzi unos, dodatne detalje (otkazni rok, vrsta ugovora, stručna sprema)
          možeš popuniti kasnije na stranici organizacije ili pri generisanju ugovora.
        </p>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.label}>Ime *</span>
            <input
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Prezime *</span>
            <input
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>JMBG</span>
            <input
              className={styles.input}
              value={jmbg}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 13);
                setJmbg(v);
                // Auto-spol kad imamo dovoljno cifara
                if (v.length >= 12 && !spol) {
                  const s = spolFromJmbg(v);
                  if (s) setSpol(s);
                }
              }}
              inputMode="numeric"
              maxLength={13}
              style={
                jmbg.length === 13 && !isJmbgValid(jmbg)
                  ? { borderColor: "#dc2626" }
                  : undefined
              }
            />
            {jmbg.length === 13 && !isJmbgValid(jmbg) && (
              <span className={styles.fieldError}>{parseJmbg(jmbg).error}</span>
            )}
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Spol</span>
            <select
              className={styles.input}
              value={spol}
              onChange={(e) => setSpol(e.target.value as "M" | "Z" | "")}
            >
              <option value="">– Odaberi –</option>
              <option value="M">Muški</option>
              <option value="Z">Ženski</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Pozicija</span>
            <input
              className={styles.input}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Npr. Programer"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Prebivalište</span>
            <select
              className={styles.input}
              value={prebivalisteEntitet}
              onChange={(e) => {
                const v = e.target.value === "RS" ? "RS" : "FBIH";
                setPrebivalisteEntitet(v);
                if (v === "FBIH") setOpcinaKod("");
              }}
            >
              <option value="FBIH">Federacija BiH</option>
              <option value="RS">Republika Srpska</option>
            </select>
          </label>
          {prebivalisteEntitet === "RS" ? (
            <>
              <label className={styles.field}>
                <span className={styles.label}>Grad</span>
                <input
                  className={styles.input}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="npr. Banja Luka"
                />
              </label>
              <div className={styles.field}>
                <span className={styles.label}>Opština (RS) *</span>
                <select
                  className={styles.input}
                  value={opcinaKod}
                  onChange={(e) => setOpcinaKod(e.target.value)}
                  style={!opcinaKod ? { borderColor: "#b3261e" } : undefined}
                >
                  <option value="">Izaberite opštinu...</option>
                  {RS_OPCINE.map((o) => (
                    <option key={o.kod} value={o.kod}>
                      {o.naziv} ({o.kod})
                    </option>
                  ))}
                </select>
                <CityNote>
                  Opštinu obavezno odaberite sa liste, potrebna je za obračun
                  plate (Budžet RS).
                </CityNote>
              </div>
            </>
          ) : (
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>Grad *</span>
              <CitySelect
                value={city}
                onChange={setCity}
                className={styles.input}
                strict
              />
              <CityNote>
                Grad obavezno odaberite sa liste, iz njega se određuje kanton i
                općina za obračun plate.
              </CityNote>
            </div>
          )}
          <div className={styles.field}>
            <span className={styles.label}>Datum početka rada</span>
            <DateInput
              className={styles.input}
              value={startDate}
              onValueChange={setStartDate}
            />
          </div>
          <div
            className={styles.field}
            style={
              prijavaDate
                ? {
                    background: "#f1f8f3",
                    border: "1px solid #b7dcc4",
                    borderRadius: 8,
                    padding: "0.6rem 0.7rem",
                  }
                : undefined
            }
          >
            <span
              className={styles.label}
              style={
                prijavaDate
                  ? { color: "#1f5e44", fontWeight: 700 }
                  : { color: "#9a6a00", fontWeight: 700 }
              }
            >
              Datum prijave (status) , bitno
            </span>
            <DateInput
              className={styles.input}
              value={prijavaDate}
              onValueChange={(iso) => {
                setPrijavaDate(iso);
                if (iso) setNotRegistered(false);
              }}
            />
            {prijavaDate && (
              <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "#1f5e44" }}>
                Radnik je Prijavljen. Provjerite datum ako prijava nije na ovaj dan.
              </span>
            )}
          </div>
          <label
            className={`${styles.field} ${styles.fieldFull}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: "0.6rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={notRegistered}
              onChange={(e) => {
                setNotRegistered(e.target.checked);
                if (e.target.checked) setPrijavaDate("");
              }}
            />
            <span style={{ fontSize: 13, color: "var(--mid)" }}>
              Nije još prijavljen, prijavit ću kasnije (JS3100 ili ručno)
            </span>
          </label>
          <div
            className={styles.fieldFull}
            style={{
              fontSize: 12.5,
              lineHeight: 1.45,
              borderRadius: 8,
              padding: "0.5rem 0.65rem",
              color: prijavaDate ? "#1f5e44" : "#8a5a00",
              background: prijavaDate ? "#f1f8f3" : "#fdf6e3",
              border: prijavaDate ? "1px solid #b7dcc4" : "1px solid #f0d9a6",
            }}
          >
            {prijavaDate ? (
              <>
                Radnik je <strong>Prijavljen</strong> i ulazi u obračun plate.
              </>
            ) : (
              <>
                Bitno: ako se unese datum prijave, radnik je <strong>Prijavljen</strong>{" "}
                i ulazi u obračun plate. Ako ostane neprijavljen, ne uzima se u obračun.
              </>
            )}
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Bruto plata (KM)</span>
            <input
              className={styles.input}
              value={salaryBruto}
              onChange={(e) => setSalaryBruto(formatAmount(e.target.value))}
              onBlur={(e) => setSalaryBruto(formatMoneyBlur(e.target.value))}
              inputMode="decimal"
              placeholder="0,00"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Neto plata (KM)</span>
            <input
              className={styles.input}
              value={salaryNeto}
              onChange={(e) => setSalaryNeto(formatAmount(e.target.value))}
              onBlur={(e) => setSalaryNeto(formatMoneyBlur(e.target.value))}
              inputMode="decimal"
              placeholder="0,00"
            />
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.label}>Žiro račun</span>
            <input
              className={styles.input}
              value={bankAccount}
              onChange={(e) => setBankAccount(formatZiro(e.target.value))}
              placeholder="XXX-XXX-XXXXXXXX-XX"
              inputMode="numeric"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>
              Porezni koeficijent,{" "}
              <span style={{ color: "var(--mid)", fontSize: 11, fontWeight: 400 }}>
                1.0 = 300 KM odbitka
              </span>
            </span>
            <input
              className={styles.input}
              value={taxCoefficient}
              onChange={(e) => setTaxCoefficient(sanitizeDecimalInput(e.target.value))}
              inputMode="decimal"
              placeholder="1.0"
            />
          </label>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Otkaži
          </button>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Čuvam…" : "Sačuvaj"}
          </button>
        </div>
      </form>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
