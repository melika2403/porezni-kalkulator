"use client";

import { useRef } from "react";
import { IconCalendar } from "@tabler/icons-react";
import {
  isoToDisplay,
  maskDateInput,
  parseDateInput,
} from "src/lib/dateInput";

// PK Office unos datuma: kucanje sa auto-tačkama (1106 → "11.06.") + dugme
// koje otvara native kalendar (skriveni input[type=date] + showPicker(), isti
// trik kao marketing DateInput). Vrijednost je display string "DD.MM.GGGG."
// (kako PK Office stranice drže state), za ISO koristiti parseDateInput.
// Nevalidan (nepotpun) unos sam dobija warning border.
export function PkDateInput({
  value,
  onChange,
  placeholder = "DD.MM.GGGG.",
  className,
  inputClassName,
  disabled,
  title,
  ariaLabel,
}: {
  /** Display string, npr. "11.06.2026." (može prazan/djelimičan). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Layout wrappera (širina), npr. "w-[130px]". */
  className?: string;
  /** Dodatne klase inputa (npr. bg-cream-50 da prati susjedna polja). */
  inputClassName?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const iso = parseDateInput(value) ?? "";
  const invalid = value.trim() !== "" && !iso;

  function handleType(raw: string) {
    let next = maskDateInput(raw);
    // brisanje: ne vraćaj auto-tačku odmah, da backspace ne zaglavi
    if (raw.length < value.length) next = next.replace(/\.$/, "");
    onChange(next);
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        value={value}
        onChange={(e) => handleType(e.target.value)}
        placeholder={placeholder}
        inputMode="numeric"
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        className={[
          "w-full rounded-lg border bg-cream-100 pl-3 pr-9 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600 disabled:opacity-60",
          invalid ? "border-warning" : "border-cream-300",
          inputClassName ?? "",
        ].join(" ")}
      />
      {/* Skriveni native picker: u DOM-u ali nevidljiv, da showPicker() radi */}
      <input
        ref={pickerRef}
        type="date"
        value={iso}
        onChange={(e) => onChange(isoToDisplay(e.target.value))}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute right-8 bottom-1 w-px h-px opacity-0 pointer-events-none border-0 p-0"
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Odaberi datum iz kalendara"
        onClick={() => pickerRef.current?.showPicker()}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-md text-text-tertiary hover:text-brand-600 hover:bg-brand-100 transition-colors disabled:opacity-50"
      >
        <IconCalendar size={15} />
      </button>
    </div>
  );
}
