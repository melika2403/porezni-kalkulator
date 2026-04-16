"use client";
import { useState, useRef } from "react";
import styles from "./plata.module.css";

// ── Contribution rates ─────────────────────────────────────────────────────
const EMP_PIO            = 0.17;
const EMP_ZDRAVSTVO      = 0.125;
const EMP_NEZAPOSLENOST  = 0.015;
const EMP_TOTAL          = EMP_PIO + EMP_ZDRAVSTVO + EMP_NEZAPOSLENOST; // 0.31

const ERP_PIO            = 0.025;
const ERP_ZDRAVSTVO      = 0.02;
const ERP_NEZAPOSLENOST  = 0.005;
const ERP_TOTAL          = ERP_PIO + ERP_ZDRAVSTVO + ERP_NEZAPOSLENOST; // 0.05

// Additional charges on net salary
const VODNA_NAKNADA      = 0.005;
const NAKNADA_NESRECE    = 0.005;

const TAX_RATE = 0.10;

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) => {
  const [i, d] = Math.max(0, n).toFixed(2).split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + d;
};

const parse = (v: string) => {
  const n = parseFloat(v.replace(/\.(?=\d{3})/g, "").replace(",", "."));
  return isNaN(n) || n < 0 ? 0 : n;
};

// ── Calculation ────────────────────────────────────────────────────────────
interface Result {
  gross: number;
  empPio: number; empZdravstvo: number; empNezaposlenost: number; empTotal: number;
  taxBase: number; incomeTax: number;
  net: number;
  erpPio: number; erpZdravstvo: number; erpNezaposlenost: number; erpTotal: number;
  vodnaNaknada: number; naknadaNesrece: number;
  totalCost: number;
}

function fromGross(gross: number, deduction: number): Result {
  const empPio            = gross * EMP_PIO;
  const empZdravstvo      = gross * EMP_ZDRAVSTVO;
  const empNezaposlenost  = gross * EMP_NEZAPOSLENOST;
  const empTotal          = gross * EMP_TOTAL;
  const taxBase           = Math.max(gross - empTotal - deduction, 0);
  const incomeTax         = taxBase * TAX_RATE;
  const net               = gross - empTotal - incomeTax;
  const erpPio            = gross * ERP_PIO;
  const erpZdravstvo      = gross * ERP_ZDRAVSTVO;
  const erpNezaposlenost  = gross * ERP_NEZAPOSLENOST;
  const erpTotal          = gross * ERP_TOTAL;
  const vodnaNaknada      = net * VODNA_NAKNADA;
  const naknadaNesrece    = net * NAKNADA_NESRECE;
  const totalCost         = gross + erpTotal + vodnaNaknada + naknadaNesrece;
  return { gross, empPio, empZdravstvo, empNezaposlenost, empTotal,
           taxBase, incomeTax, net,
           erpPio, erpZdravstvo, erpNezaposlenost, erpTotal,
           vodnaNaknada, naknadaNesrece, totalCost };
}

function fromNet(net: number, deduction: number): Result {
  const netCoeff     = (1 - EMP_TOTAL) * (1 - TAX_RATE);
  const grossWithTax = (net - deduction * TAX_RATE) / netCoeff;
  if (grossWithTax * (1 - EMP_TOTAL) - deduction > 0.001) {
    return fromGross(grossWithTax, deduction);
  }
  return fromGross(net / (1 - EMP_TOTAL), deduction);
}

// ── Component ──────────────────────────────────────────────────────────────
type Mode = "grossToNet" | "netToGross";

export default function PreracunPlate() {
  const [mode,  setMode]  = useState<Mode>("grossToNet");
  const [input, setInput] = useState("");
  const [coeff, setCoeff] = useState("1");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? 0;
    const charsBeforeCursor = raw.slice(0, cursorPos).replace(/\./g, "").length;
    const cleaned    = raw.replace(/[^\d,]/g, "");
    const firstComma = cleaned.indexOf(",");
    const intDigits  = firstComma >= 0 ? cleaned.slice(0, firstComma) : cleaned;
    const decPart    = firstComma >= 0 ? cleaned.slice(firstComma + 1, firstComma + 3) : null;
    if (!intDigits && decPart === null) { setInput(""); return; }
    const formattedInt = intDigits ? intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
    const formatted    = decPart !== null ? `${formattedInt},${decPart}` : formattedInt;
    setInput(formatted);
    let counted = 0, newCursor = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ".") counted++;
      if (counted === charsBeforeCursor) { newCursor = i + 1; break; }
    }
    setTimeout(() => inputRef.current?.setSelectionRange(newCursor, newCursor), 0);
  };

  const salary = parse(input);
  const ded    = Math.max(parse(coeff), 0) * 300;
  const result = salary > 0
    ? (mode === "grossToNet" ? fromGross(salary, ded) : fromNet(salary, ded))
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Kalkulator plate — FBiH</div>
        <h1 className={styles.h1}>
          Preračun <em>neto / bruto</em> plate
        </h1>
        <p className={styles.subtitle}>
          Doprinosi i porez po važećim stopama u Federaciji BiH.
          Unesite iznos i dobijte kompletan pregled obustava.
        </p>
      </div>

      <div className={styles.toggleWrap}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${mode === "grossToNet" ? styles.toggleActive : ""}`}
          onClick={() => setMode("grossToNet")}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M10 3v14M5 13l5 5 5-5" />
          </svg>
          Bruto → Neto
          <span className={styles.toggleHint}>Unesite bruto, izračunajte neto</span>
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${mode === "netToGross" ? styles.toggleActive : ""}`}
          onClick={() => setMode("netToGross")}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M10 17V3M5 7l5-5 5 5" />
          </svg>
          Neto → Bruto
          <span className={styles.toggleHint}>Unesite neto, izračunajte bruto</span>
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>
            {mode === "grossToNet" ? "Bruto plata" : "Neto plata"}
          </label>
          <div className={styles.inputWrap}>
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={input}
              onChange={handleChange}
              onBlur={() => { const n = parse(input); setInput(n > 0 ? fmt(n) : ""); }}
              onFocus={(e) => e.target.select()}
              autoFocus
            />
            <span className={styles.inputSuffix}>KM</span>
          </div>
        </div>

        <div className={styles.settings}>
          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>Porezni koeficijent (vaš odbitak iz porezne kartice)</label>
            <input
              className={styles.settingInput}
              type="text"
              inputMode="decimal"
              value={coeff}
              onChange={(e) => setCoeff(e.target.value)}
            />
          </div>
          <div className={styles.settingNote}>
            Koeficijent <strong>1</strong> = 300 KM odbitka.
            Trenutni odbitak: <strong>{fmt(Math.max(parse(coeff), 0) * 300)} KM</strong>
          </div>
        </div>

        {result ? (
          <div className={styles.results}>

            <div className={styles.summaryBand}>
              <span>Bruto plata</span>
              <span>{fmt(result.gross)} KM</span>
            </div>

            <div className={styles.group}>
              <div className={styles.groupTitle}>Doprinosi iz plate (na teret zaposlenog)</div>
              <div className={styles.row}>
                <span className={styles.rowName}>PIO / MIO</span>
                <span className={styles.rowPct}>17%</span>
                <span className={styles.rowVal}>{fmt(result.empPio)} KM</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>Zdravstveno osiguranje</span>
                <span className={styles.rowPct}>12,5%</span>
                <span className={styles.rowVal}>{fmt(result.empZdravstvo)} KM</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>Osiguranje od nezaposlenosti</span>
                <span className={styles.rowPct}>1,5%</span>
                <span className={styles.rowVal}>{fmt(result.empNezaposlenost)} KM</span>
              </div>
              <div className={`${styles.row} ${styles.rowSubtotal}`}>
                <span className={styles.rowName}>Ukupno</span>
                <span className={styles.rowPct}>31%</span>
                <span className={styles.rowVal}>{fmt(result.empTotal)} KM</span>
              </div>
            </div>

            <div className={styles.group}>
              <div className={styles.groupTitle}>Porez na dohodak</div>
              <div className={styles.row}>
                <span className={styles.rowName}>Porezna osnovica</span>
                <span className={styles.rowPct}></span>
                <span className={styles.rowVal}>{fmt(result.taxBase)} KM</span>
              </div>
              <div className={`${styles.row} ${styles.rowSubtotal}`}>
                <span className={styles.rowName}>Porez na dohodak</span>
                <span className={styles.rowPct}>10%</span>
                <span className={styles.rowVal}>{fmt(result.incomeTax)} KM</span>
              </div>
            </div>

            <div className={styles.netBand}>
              <span className={styles.netLabel}>Neto plata</span>
              <span className={styles.netValue}>{fmt(result.net)} KM</span>
            </div>

            <div className={styles.group}>
              <div className={styles.groupTitle}>Doprinosi na platu (na teret poslodavca)</div>
              <div className={styles.row}>
                <span className={styles.rowName}>PIO / MIO</span>
                <span className={styles.rowPct}>2,5%</span>
                <span className={styles.rowVal}>{fmt(result.erpPio)} KM</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>Zdravstveno osiguranje</span>
                <span className={styles.rowPct}>2%</span>
                <span className={styles.rowVal}>{fmt(result.erpZdravstvo)} KM</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>Osiguranje od nezaposlenosti</span>
                <span className={styles.rowPct}>0,5%</span>
                <span className={styles.rowVal}>{fmt(result.erpNezaposlenost)} KM</span>
              </div>
              <div className={`${styles.row} ${styles.rowSubtotal}`}>
                <span className={styles.rowName}>Ukupno</span>
                <span className={styles.rowPct}>5%</span>
                <span className={styles.rowVal}>{fmt(result.erpTotal)} KM</span>
              </div>
            </div>

            <div className={styles.group}>
              <div className={styles.groupTitle}>Dodatni doprinosi na platu</div>
              <div className={styles.row}>
                <span className={styles.rowName}>Opća vodna naknada</span>
                <span className={styles.rowPct}>0,5%</span>
                <span className={styles.rowVal}>{fmt(result.vodnaNaknada)} KM</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>Naknada za zaštitu od prirodnih nesreća</span>
                <span className={styles.rowPct}>0,5%</span>
                <span className={styles.rowVal}>{fmt(result.naknadaNesrece)} KM</span>
              </div>
              <div className={`${styles.row} ${styles.rowSubtotal}`}>
                <span className={styles.rowName}>Ukupno</span>
                <span className={styles.rowPct}>1%</span>
                <span className={styles.rowVal}>{fmt(result.vodnaNaknada + result.naknadaNesrece)} KM</span>
              </div>
            </div>

            <div className={styles.totalBand}>
              <span className={styles.totalLabel}>Ukupni trošak poslodavca</span>
              <span className={styles.totalValue}>{fmt(result.totalCost)} KM</span>
            </div>

          </div>
        ) : (
          <p className={styles.placeholder}>Unesite iznos da vidite preračun.</p>
        )}
      </div>
    </div>
  );
}
