"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import styles from "./StyledSelect.module.css";

export type SelectOption = { value: string | number; label: string };
export type SelectGroup = { label?: string; options: SelectOption[] };

// Generički stilizovani select: dugme-okidač (sam-stilizovan, jedna strelica) +
// panel kroz portal na body (position:fixed) da ga overflow:hidden ne odsiječe.
// Opcioni search. Koristi se za org (OrgSelect wrapper, grupe + search) i za
// jednostavne liste (mjesec/godina, bez searcha) , isti izgled svuda.
export interface StyledSelectProps {
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  groups: SelectGroup[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  /** Stil okidača (vizuelno: font, padding...). */
  style?: CSSProperties;
  /** Stil vanjskog wrappera (layout: flex, width, margin) , on je flex/grid dijete. */
  wrapStyle?: CSSProperties;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  emptyText?: string;
}

const TOP_SAFE = 72;
// Razmak od ivica (gap od okidača + margina od dna/navbara).
const GAP = 10;

type Pos = {
  left: number;
  width: number;
  up: boolean;
  top?: number;
  bottom?: number;
  maxListH: number;
};

export default function StyledSelect({
  value,
  onChange,
  groups,
  placeholder = "– Odaberi –",
  searchable = false,
  searchPlaceholder = "Pretraži...",
  className,
  style,
  wrapStyle,
  id,
  ariaLabel,
  disabled = false,
  emptyText = "Nema rezultata",
}: StyledSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Pos>({
    left: 0,
    width: 0,
    up: false,
    top: 0,
    maxListH: 280,
  });

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const selectedLabel = useMemo(() => {
    for (const g of groups) {
      const o = g.options.find((x) => x.value === value);
      if (o) return o.label;
    }
    return null;
  }, [groups, value]);

  const q = filter.trim().toLowerCase();
  const filteredGroups = useMemo(
    () =>
      groups
        .map((g) => ({
          label: g.label,
          options:
            searchable && q
              ? g.options.filter((o) => o.label.toLowerCase().includes(q))
              : g.options,
        }))
        .filter((g) => g.options.length > 0),
    [groups, q, searchable],
  );
  const flat = useMemo(
    () => filteredGroups.flatMap((g) => g.options),
    [filteredGroups],
  );

  const computePosition = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r || typeof window === "undefined") return;
    const searchH = searchable ? 46 : 0;
    const below = window.innerHeight - r.bottom - GAP;
    const above = r.top - TOP_SAFE - GAP;
    const up = below < 240 && above > below;
    // Bez tvrdog capa: lista ide do raspoloživog prostora viewporta, pa se na
    // velikom ekranu vide svi (npr. 12 mjeseci), a na malom/mobitelu scroll.
    const maxListH = Math.max(120, (up ? above : below) - searchH);
    setPos({
      left: r.left,
      width: r.width,
      up,
      top: up ? undefined : r.bottom + 4,
      bottom: up ? window.innerHeight - r.top + 4 : undefined,
      maxListH,
    });
  }, [searchable]);

  function openMenu() {
    computePosition();
    setActive(0);
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setFilter("");
  }
  function pick(v: string | number) {
    onChange(v);
    close();
  }

  useEffect(() => {
    if (!open) return;
    if (searchable) searchRef.current?.focus();
    else panelRef.current?.focus();
    const onScrollResize = () => computePosition();
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
      document.removeEventListener("mousedown", onDocMouseDown);
    };
  }, [open, computePosition, searchable]);

  useEffect(() => setActive(0), [filter]);

  function onKeyDown(e: ReactKeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = flat[active];
      if (o) pick(o.value);
    }
  }

  const panel = (
    <div
      ref={panelRef}
      tabIndex={-1}
      className={styles.panel}
      style={{
        position: "fixed",
        left: pos.left,
        width: pos.width,
        ...(pos.up ? { bottom: pos.bottom } : { top: pos.top }),
        zIndex: 4000,
      }}
      onKeyDown={onKeyDown}
    >
      {searchable && (
        <input
          ref={searchRef}
          className={styles.search}
          placeholder={searchPlaceholder}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      <div className={styles.list} style={{ maxHeight: pos.maxListH }}>
        {flat.length === 0 && <div className={styles.empty}>{emptyText}</div>}
        {filteredGroups.map((g, gi) => (
          <div key={gi}>
            {g.label && <div className={styles.group}>{g.label}</div>}
            {g.options.map((o) => {
              const idx = flat.findIndex((f) => f.value === o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.item} ${
                    o.value === value ? styles.itemSelected : ""
                  } ${idx === active ? styles.itemActive : ""}`}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => pick(o.value)}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.wrap} ref={wrapRef} style={wrapStyle}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        aria-label={ariaLabel}
        className={`${styles.trigger} ${className ?? ""}`}
        style={style}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
      >
        <span
          className={selectedLabel ? styles.triggerText : styles.triggerPlaceholder}
        >
          {selectedLabel ?? placeholder}
        </span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && mounted && createPortal(panel, document.body)}
    </div>
  );
}
