"use client";

import { useRef, useState } from "react";
import { IconLink, IconPlus } from "@tabler/icons-react";
import { formatBankAccount } from "src/lib/bankCodes";

// Autocomplete za protivstranu koja može (ali ne mora) biti partner.
// Kuca se slobodan tekst; prijedlozi se traže po nazivu, šifri ili žiro
// računu partnera. Potvrdom prijedloga stavka se veže na partnera
// (partnerId → kartica partnera), slobodan tekst ostaje bez veze.
export type PartnerOption = {
  id: number;
  name: string;
  code: number | null;
  accounts: string[];
  jib: string | null;
};

function findMatches(partners: PartnerOption[], query: string) {
  const t = query.trim().toLowerCase();
  if (!t) return [];
  // numerički upit (dozvoljeni separatori): šifra, žiro račun ili JIB
  const digits = /^[\d\s.,-]+$/.test(t) ? t.replace(/\D+/g, "") : "";
  return partners
    .filter((p) => {
      if (p.name.toLowerCase().includes(t)) return true;
      if (!digits) return false;
      if (
        p.code != null &&
        (String(p.code) === digits ||
          String(p.code).padStart(4, "0").startsWith(digits))
      ) {
        return true;
      }
      if (
        digits.length >= 4 &&
        (p.accounts ?? []).some((a) => a.replace(/\D+/g, "").includes(digits))
      ) {
        return true;
      }
      return p.jib != null && digits.length >= 5 && p.jib.includes(digits);
    })
    .slice(0, 8);
}

export function PartnerCombobox({
  value,
  partnerId,
  onChange,
  partners,
  onRequestNew,
  placeholder = "opciono",
  inputClassName,
  ariaLabel,
}: {
  /** Slobodan tekst protivstrane (nakon izbora: naziv partnera). */
  value: string;
  /** Povezani partner ili null (slobodan tekst). */
  partnerId: number | null;
  onChange: (text: string, partnerId: number | null) => void;
  partners: PartnerOption[];
  /** "+ Novi partner": otvara formu, prima već ukucani tekst. */
  onRequestNew?: (typed: string) => void;
  placeholder?: string;
  inputClassName?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = findMatches(partners, value);
  const showNew = !!onRequestNew && value.trim().length >= 2;
  const optionCount = matches.length + (showNew ? 1 : 0);
  const panelOpen = open && optionCount > 0 && partnerId == null;

  function pick(p: PartnerOption) {
    onChange(p.name, p.id);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!panelOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, optionCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < matches.length) pick(matches[active]);
      else if (showNew) {
        setOpen(false);
        onRequestNew?.(value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          // ručna izmjena teksta raskida vezu sa partnerom
          onChange(e.target.value, null);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        title={
          partnerId != null
            ? "Povezano: stavka ide na karticu ovog partnera"
            : undefined
        }
        className={[
          "w-full rounded-lg border bg-cream-100 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600",
          partnerId != null ? "border-brand-600/50 pr-8" : "border-cream-300",
          inputClassName ?? "",
        ].join(" ")}
      />
      {partnerId != null && (
        <span
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-600"
          title="Povezano: stavka ide na karticu ovog partnera"
        >
          <IconLink size={15} />
        </span>
      )}

      {panelOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg bg-cream-100 border border-cream-300 shadow-[0_12px_32px_rgba(15,26,18,0.18)] overflow-hidden">
          <div className="max-h-[240px] overflow-y-auto p-1">
            {matches.map((p, i) => (
              <button
                key={p.id}
                type="button"
                // onMouseDown prije blur-a, da klik ne propadne
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={[
                  "w-full text-left rounded-md px-2.5 py-2 text-[12.5px] text-text-primary truncate",
                  i === active ? "bg-brand-100" : "",
                ].join(" ")}
              >
                <span className="text-text-tertiary tabular-nums">
                  {p.code != null ? String(p.code).padStart(4, "0") : "–"}
                </span>{" "}
                <span className="font-medium">{p.name}</span>
                {(p.accounts ?? []).length > 0 && (
                  <span className="text-text-tertiary">
                    {" "}
                    · {formatBankAccount(p.accounts[0])}
                  </span>
                )}
              </button>
            ))}
            {showNew && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  onRequestNew?.(value);
                }}
                onMouseEnter={() => setActive(matches.length)}
                className={[
                  "w-full text-left rounded-md px-2.5 py-2 text-[12.5px] font-medium text-brand-700 inline-flex items-center gap-1.5",
                  active === matches.length ? "bg-brand-100" : "",
                  matches.length > 0 ? "border-t border-cream-300/70 rounded-t-none" : "",
                ].join(" ")}
              >
                <IconPlus size={14} />
                Novi partner &quot;{value.trim()}&quot;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
