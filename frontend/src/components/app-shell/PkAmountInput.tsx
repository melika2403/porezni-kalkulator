"use client";

import { useLayoutEffect, useRef } from "react";
import { formatKm, maskAmountTyping, parseKm } from "src/lib/amountInput";

// PK Office unos iznosa u KM: dok se kuca, tačke hiljada se same upisuju
// (1234 → "1.234"), zarez je decimalni separator (max 2 decimale), a na blur
// se iznos dopuni na pune decimale ("1.234" → "1.234,00"). Vrijednost je
// display string, za broj koristiti parseKm iz src/lib/amountInput.
export function PkAmountInput({
  value,
  onChange,
  placeholder = "0,00",
  className,
  disabled,
  title,
  ariaLabel,
  onKeyDown,
  decimals = 2,
}: {
  /** Display string, npr. "1.234,56" (može prazan/djelimičan). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Dodatne klase inputa (širina, bg da prati susjedna polja...). */
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  /** Max broj decimala (default 2; npr. cijene u kalkulacijama 5). */
  decimals?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const invalid = value.trim() !== "" && parseKm(value, decimals) == null;

  // Kursor nakon reformatiranja: prebroji cifre/zarez lijevo od kursora u
  // sirovom unosu, pa ga vrati iza istog broja tih znakova u maskiranom.
  function handleType(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.currentTarget.value;
    const sel = e.currentTarget.selectionStart ?? raw.length;
    const significantBefore = raw
      .slice(0, sel)
      .replace(/[^\d,]/g, "").length;
    const next = maskAmountTyping(raw, decimals);
    let pos = 0;
    let seen = 0;
    while (pos < next.length && seen < significantBefore) {
      if (/[\d,]/.test(next[pos])) seen++;
      pos++;
    }
    caretRef.current = pos;
    onChange(next);
  }

  useLayoutEffect(() => {
    if (caretRef.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  });

  function handleBlur() {
    const n = parseKm(value, decimals);
    if (n != null && formatKm(n, decimals) !== value) {
      onChange(formatKm(n, decimals));
    }
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={handleType}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      inputMode="decimal"
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={[
        "w-full rounded-lg border bg-cream-100 px-3 py-2 text-[13px] text-text-primary tabular-nums placeholder:text-text-tertiary focus:outline-none focus:border-brand-600 disabled:opacity-60",
        invalid ? "border-warning" : "border-cream-300",
        className ?? "",
      ].join(" ")}
    />
  );
}
