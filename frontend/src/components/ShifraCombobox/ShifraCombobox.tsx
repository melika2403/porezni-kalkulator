"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { KD_BIH, type KdBihEntry } from "src/data/kd-bih";
import styles from "./ShifraCombobox.module.css";

interface Props {
  code: string;
  name: string;
  onChange: (code: string, name: string) => void;
  inputClassName?: string;
  codeLabel?: string;
  nameLabel?: string;
  required?: boolean;
}

export default function ShifraCombobox({
  code,
  name,
  onChange,
  inputClassName = "",
  codeLabel = "Šifra djelatnosti",
  nameLabel = "Naziv djelatnosti",
  required = false,
}: Props) {
  const [codeVal, setCodeVal] = useState(code);
  const [nameVal, setNameVal] = useState(name);
  const [active, setActive] = useState<"code" | "name" | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCodeVal(code); }, [code]);
  useEffect(() => { setNameVal(name); }, [name]);

  const query = active === "code" ? codeVal : active === "name" ? nameVal : "";

  const results = useMemo<KdBihEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return KD_BIH.filter(
      (e) => e.code.startsWith(q) || e.name.toLowerCase().includes(q),
    ).slice(0, 60);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setActive(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (entry: KdBihEntry) => {
    onChange(entry.code, entry.name);
    setCodeVal(entry.code);
    setNameVal(entry.name);
    setActive(null);
  };

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>{codeLabel}</label>
          <input
            className={inputClassName}
            value={codeVal}
            autoComplete="off"
            placeholder="47.11"
            maxLength={10}
            required={required}
            onFocus={() => setActive("code")}
            onChange={(e) => {
              const val = e.target.value;
              setCodeVal(val);
              setActive("code");
              onChange(val, nameVal);
              if (!val) setNameVal("");
            }}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{nameLabel}</label>
          <input
            className={inputClassName}
            value={nameVal}
            autoComplete="off"
            placeholder="Npr. Trgovina na malo..."
            onFocus={() => setActive("name")}
            onChange={(e) => {
              const val = e.target.value;
              setNameVal(val);
              setActive("name");
              onChange(codeVal, val);
            }}
          />
        </div>
      </div>
      {active && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((e) => (
            <button
              key={e.code}
              type="button"
              className={styles.option}
              onMouseDown={(ev) => {
                ev.preventDefault();
                select(e);
              }}
            >
              <span className={styles.optCode}>{e.code}</span>
              <span className={styles.optName}>{e.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
