"use client";
import { useState, useRef } from "react";
import styles from "./pdv.module.css";

const PDV_RATE  = 0.17;
const BAM_TO_EUR = 1.95583; // fixed peg

type Mode     = "toBrutto" | "toNetto";
type Currency = "KM" | "EUR";

const fmt = (n: number) => {
  const [intPart, decPart] = n.toFixed(2).split(".");
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + decPart;
};

const parse = (v: string) => {
  const normalized = v.replace(/\.(?=\d{3})/g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return isNaN(n) || n < 0 ? 0 : n;
};

export default function PdvKalkulator() {
  const [mode,     setMode]     = useState<Mode>("toBrutto");
  const [currency, setCurrency] = useState<Currency>("KM");
  const [input,    setInput]    = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? 0;
    const charsBeforeCursor = raw.slice(0, cursorPos).replace(/\./g, "").length;

    const cleaned  = raw.replace(/[^\d,]/g, "");
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

  const switchCurrency = (next: Currency) => {
    if (next === currency) return;
    const n = parse(input);
    if (n > 0) {
      const converted = next === "EUR" ? n / BAM_TO_EUR : n * BAM_TO_EUR;
      setInput(fmt(converted));
    }
    setCurrency(next);
  };

  const value  = parse(input);
  const netto  = mode === "toBrutto" ? value : value / (1 + PDV_RATE);
  const pdv    = netto * PDV_RATE;
  const brutto = netto + pdv;
  const hasValue = value > 0;

  const sym = currency;

  // Secondary currency values for reference
  const factor     = currency === "KM" ? 1 / BAM_TO_EUR : BAM_TO_EUR;
  const altSym     = currency === "KM" ? "EUR" : "KM";
  const nettoAlt   = netto  * factor;
  const pdvAlt     = pdv    * factor;
  const bruttoAlt  = brutto * factor;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.label}>PDV Kalkulator</div>
        <h1 className={styles.h1}>
          Preračun <em>PDV-a</em> u oba smjera
        </h1>
        <p className={styles.subtitle}>
          Stopa PDV-a u Bosni i Hercegovini iznosi <strong>17%</strong>.
          Unesite cijenu i dobijte rezultat odmah.
        </p>
      </div>

      {/* Mode toggle */}
      <div className={styles.toggleWrap}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${mode === "toBrutto" ? styles.toggleActive : ""}`}
          onClick={() => setMode("toBrutto")}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="10" cy="10" r="8" />
            <path d="M10 6v4l3 2" />
          </svg>
          Dodaj PDV
          <span className={styles.toggleHint}>Cijena bez PDV-a → s PDV-om</span>
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${mode === "toNetto" ? styles.toggleActive : ""}`}
          onClick={() => setMode("toNetto")}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 10h12M10 4l6 6-6 6" />
          </svg>
          Izvuci PDV
          <span className={styles.toggleHint}>Cijena s PDV-om → bez PDV-a</span>
        </button>
      </div>

      {/* Calculator card */}
      <div className={styles.card}>
        <div className={styles.inputSection}>
          <div className={styles.inputLabelRow}>
            <label className={styles.inputLabel}>
              {mode === "toBrutto" ? `Cijena bez PDV-a` : `Cijena s PDV-om`}
            </label>
            <div className={styles.currencyToggle}>
              <button
                type="button"
                className={`${styles.currBtn} ${currency === "KM" ? styles.currActive : ""}`}
                onClick={() => switchCurrency("KM")}
              >KM</button>
              <button
                type="button"
                className={`${styles.currBtn} ${currency === "EUR" ? styles.currActive : ""}`}
                onClick={() => switchCurrency("EUR")}
              >EUR</button>
            </div>
          </div>
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
            <span className={styles.inputSuffix}>{sym}</span>
          </div>
        </div>

        <div className={`${styles.results} ${hasValue ? styles.resultsVisible : ""}`}>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Cijena bez PDV-a</span>
            <div className={styles.resultValueGroup}>
              <span className={styles.resultValue}>{fmt(netto)} {sym}</span>
              {currency === "EUR" && <span className={styles.resultAlt}>≈ {fmt(nettoAlt)} {altSym}</span>}
            </div>
          </div>
          <div className={`${styles.resultRow} ${styles.resultRowPdv}`}>
            <span className={styles.resultLabel}>
              PDV
              <span className={styles.rateTag}>17%</span>
            </span>
            <div className={styles.resultValueGroup}>
              <span className={`${styles.resultValue} ${styles.pdvValue}`}>+ {fmt(pdv)} {sym}</span>
              {currency === "EUR" && <span className={styles.resultAlt}>≈ {fmt(pdvAlt)} {altSym}</span>}
            </div>
          </div>
          <div className={`${styles.resultRow} ${styles.resultRowTotal}`}>
            <span className={styles.resultLabel}>Cijena s PDV-om</span>
            <div className={styles.resultValueGroup}>
              <span className={`${styles.resultValue} ${styles.totalValue}`}>{fmt(brutto)} {sym}</span>
              {currency === "EUR" && <span className={styles.resultAlt}>≈ {fmt(bruttoAlt)} {altSym}</span>}
            </div>
          </div>
        </div>

        {!hasValue && (
          <p className={styles.placeholder}>
            Unesite iznos da vidite preračun.
          </p>
        )}
      </div>

      {/* Info section */}
      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoTitle}>Formula: bez PDV-a → s PDV-om</div>
          <div className={styles.infoFormula}>Cijena s PDV-om = Cijena × 1,17</div>
          <div className={styles.infoDesc}>
            Npr. 100,00 KM × 1,17 = <strong>117,00 KM</strong>
          </div>
        </div>
        <div className={styles.infoCard}>
          <div className={styles.infoTitle}>Formula: s PDV-om → bez PDV-a</div>
          <div className={styles.infoFormula}>Cijena bez PDV-a = Cijena ÷ 1,17</div>
          <div className={styles.infoDesc}>
            Npr. 117,00 KM ÷ 1,17 = <strong>100,00 KM</strong>
          </div>
        </div>
        <div className={styles.infoCard}>
          <div className={styles.infoTitle}>Kurs KM / EUR</div>
          <div className={styles.infoFormula}>1 EUR = 1,95583 KM</div>
          <div className={styles.infoDesc}>
            Fiksni kurs — Bosna i Hercegovina koristi currency board vezan za euro od 1997. godine.
          </div>
        </div>
      </div>
    </div>
  );
}
