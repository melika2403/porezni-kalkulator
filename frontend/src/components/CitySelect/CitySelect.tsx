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
}

export default function CitySelect({
  value,
  onChange,
  className = "",
  placeholder = "npr. Sarajevo",
  required = false,
  id,
}: Props) {
  const { data: cities = [] } = useCities();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setText(value); }, [value]);

  const results = useMemo<City[]>(() => {
    const q = text.trim().toLowerCase();
    if (!q) return cities.slice(0, 80);
    return cities.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 80);
  }, [text, cities]);

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

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <input
        id={id}
        className={className}
        value={text}
        autoComplete="off"
        placeholder={placeholder}
        required={required}
        onFocus={() => setOpen(true)}
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
    </div>
  );
}
