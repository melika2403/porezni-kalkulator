"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { useCities } from "src/hooks/useCities";
import type { City } from "src/api/profile";
import styles from "./CitySelect.module.css";

interface Props {
  value: string;
  onChange: (city: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  /**
   * Strogi mod: grad MORA biti sa liste (zbog određivanja kantona/općine za
   * obračun plate i uplatnice). Prikazuje crveni rub + poruku kad upisani grad
   * nije na listi, i javlja roditelju kroz onValidityChange.
   */
  strict?: boolean;
  /** Javlja da li je trenutna vrijednost validan grad sa liste (samo u strict). */
  onValidityChange?: (valid: boolean) => void;
}

// Napomena ispod polja grada/općine, jednak izgled u svim formama.
export function CityNote({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "block",
        fontSize: 12,
        color: "#7a8a7d",
        marginTop: 4,
        lineHeight: 1.35,
      }}
    >
      {children}
    </span>
  );
}

export default function CitySelect({
  value,
  onChange,
  className = "",
  placeholder = "npr. Sarajevo",
  required = false,
  id,
  strict = false,
  onValidityChange,
}: Props) {
  const { data: cities = [] } = useCities();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setText(value); }, [value]);

  const results = useMemo<City[]>(() => {
    const q = text.trim().toLowerCase();
    if (!q) return cities.slice(0, 80);
    return cities.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 80);
  }, [text, cities]);

  // Da li je upisani grad tačno na listi (case-insensitive).
  const matched = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return false;
    return cities.some((c) => c.name.toLowerCase() === q);
  }, [text, cities]);

  // Javi roditelju validnost. Prazno polje je "nevalidno" samo ako je required.
  useEffect(() => {
    if (!onValidityChange) return;
    const empty = !text.trim();
    onValidityChange(empty ? !required : matched);
  }, [matched, text, required, onValidityChange]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (c: City) => {
    onChange(c.name);
    setText(c.name);
    setOpen(false);
  };

  // Prikaži grešku tek kad je polje dirano i nije prazno i nije sa liste.
  const showError = strict && touched && !!text.trim() && !matched;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <input
        id={id}
        className={className}
        value={text}
        autoComplete="off"
        placeholder={placeholder}
        required={required}
        aria-invalid={showError || undefined}
        style={showError ? { borderColor: "#b3261e" } : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setTouched(true)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          onChange(e.target.value);
        }}
      />
      {open && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.option}
              onMouseDown={(ev) => {
                ev.preventDefault();
                select(c);
              }}
            >
              <span className={styles.optName}>{c.name}</span>
              {c.postalCode && <span className={styles.optMeta}>{c.postalCode}</span>}
            </button>
          ))}
        </div>
      )}
      {showError && (
        <div
          style={{
            fontSize: 12,
            color: "#b3261e",
            marginTop: 4,
            lineHeight: 1.35,
          }}
        >
          Odaberite grad sa liste (potreban za obračun plate i uplatnice).
        </div>
      )}
    </div>
  );
}
