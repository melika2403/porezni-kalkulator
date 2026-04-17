"use client";
import { useState, useEffect, useRef } from "react";
import styles from "./DateInput.module.css";

interface Props {
  value: string; // ISO yyyy-mm-dd or ""
  onValueChange: (iso: string) => void;
  className?: string;
  id?: string;
  required?: boolean;
}

const isoToDisplay = (iso: string) => {
  if (!iso || !iso.includes("-")) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y}.`;
};

const digitsToDisplay = (digits: string) => {
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  if (digits.length <= 2) return d;
  if (digits.length <= 4) return `${d}.${m}`;
  if (digits.length < 8)  return `${d}.${m}.${y}`;
  return `${d}.${m}.${y}.`;
};

const displayToIso = (display: string) => {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  return `${y}-${m}-${d}`;
};

export default function DateInput({ value, onValueChange, className, id, required }: Props) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(isoToDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    const formatted = digitsToDisplay(digits);
    setDisplay(formatted);
    onValueChange(displayToIso(formatted));
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    onValueChange(iso);
    setDisplay(isoToDisplay(iso));
  };

  return (
    <div className={styles.wrap}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className={`${className ?? ""} ${styles.textInput}`}
        value={display}
        onChange={handleChange}
        placeholder="DD.MM.GGGG."
        required={required}
      />
      <input
        ref={pickerRef}
        type="date"
        className={styles.hiddenPicker}
        value={value}
        onChange={handlePickerChange}
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        className={styles.calBtn}
        onClick={() => pickerRef.current?.showPicker()}
        tabIndex={-1}
        aria-label="Odaberi datum"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <rect x="2" y="3" width="16" height="16" rx="2" />
          <path d="M6 1v4M14 1v4M2 9h16" />
        </svg>
      </button>
    </div>
  );
}
