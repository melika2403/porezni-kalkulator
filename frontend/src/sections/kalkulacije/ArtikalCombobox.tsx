"use client";

// Combobox za izbor artikla: odmah se kuca (šifra ili naziv), lista se
// filtrira uživo, strelice + Enter biraju. Nakon izbora fokus ide na
// sljedeće polje (onPicked), pa se stavka unosi bez miša.
import { useRef, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import type { Artikal } from "src/api/kalkulacije";

export function ArtikalCombobox({
  artikli,
  value,
  onSelect,
  onPicked,
  inputRef,
  autoFocus,
}: {
  artikli: Artikal[];
  value: Artikal | null;
  onSelect: (a: Artikal | null) => void;
  /** poziva se kad je izbor potvrđen (Enter/klik): fokus na sljedeće polje */
  onPicked?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
}) {
  // query === null → prikaži labelu izabranog artikla
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const blurTimer = useRef<number | null>(null);

  const label = value ? `${value.sifra} · ${value.naziv}` : "";
  const shown = query ?? label;

  const q = (query ?? "").trim().toLowerCase();
  const filtered = (
    q
      ? artikli.filter(
          (a) =>
            a.sifra.toLowerCase().startsWith(q) ||
            a.naziv.toLowerCase().includes(q) ||
            (a.barkod ?? "").toLowerCase() === q,
        )
      : artikli
  ).slice(0, 50);

  function pick(a: Artikal) {
    onSelect(a);
    setQuery(null);
    setOpen(false);
    onPicked?.();
  }

  return (
    <div className="relative" style={{ flex: 1, minWidth: 0 }}>
      <input
        ref={inputRef}
        value={shown}
        autoFocus={autoFocus}
        placeholder="Upiši šifru ili naziv artikla"
        aria-label="Artikal"
        onFocus={(e) => {
          if (blurTimer.current) window.clearTimeout(blurTimer.current);
          // lista se NE otvara na fokus, tek kad se nešto ukuca
          e.currentTarget.select();
        }}
        onBlur={() => {
          // odgoda da klik na stavku liste stigne prije zatvaranja
          blurTimer.current = window.setTimeout(() => {
            setOpen(false);
            setQuery(null);
          }, 150);
        }}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(Boolean(v.trim()));
          setHi(0);
          if (!v.trim()) onSelect(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (open && filtered[hi]) pick(filtered[hi]);
            else if (value) onPicked?.();
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery(null);
          }
        }}
        className="w-full rounded-lg border border-cream-300 bg-cream-50 pl-3 pr-8 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
      />
      {/* dugme koje otvara/zatvara CIJELU listu artikala */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Prikaži sve artikle"
        onMouseDown={(e) => {
          e.preventDefault();
          if (blurTimer.current) window.clearTimeout(blurTimer.current);
          if (open) {
            setOpen(false);
          } else {
            setQuery(null);
            setHi(0);
            setOpen(true);
            inputRef?.current?.focus();
          }
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
      >
        <IconChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-cream-300 bg-cream-100 shadow-lg py-1">
          {filtered.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(a);
              }}
              onMouseEnter={() => setHi(i)}
              className={[
                "w-full text-left px-3 py-1.5 text-[13px] transition-colors",
                i === hi
                  ? "bg-cream-200 text-text-primary"
                  : "text-text-primary hover:bg-cream-200",
              ].join(" ")}
            >
              <span className="tabular-nums text-text-tertiary">
                {a.sifra}
              </span>{" "}
              {a.naziv}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && q && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-cream-300 bg-cream-100 shadow-lg px-3 py-2 text-[12.5px] text-text-tertiary">
          Nema artikla za &quot;{query}&quot;. Dodajte ga dugmetom + Novi.
        </div>
      )}
    </div>
  );
}
