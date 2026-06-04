"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import styles from "./RowActionsMenu.module.css";

// Vidljiva primarna akcija u redu (npr. Plate, Radnici).
export type RowPrimaryAction = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
  title?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

// Stavka unutar overflow (kebab) menija. "group" je sitni naslov grupe,
// "item" je klikabilna stavka (link ili akcija) sa opcionim podtekstom.
export type RowMenuItem =
  | { kind: "group"; key: string; label: string }
  | {
      kind: "item";
      key: string;
      label: string;
      sub?: string;
      href?: string;
      onClick?: () => void;
      disabled?: boolean;
      icon?: ReactNode;
    };

// Dijeljeni red-akcija: par primarnih dugmadi + kebab meni za ostalo.
// Meni se renderuje kroz portal (position:fixed) jer table redovi imaju
// vlastiti stacking context koji bi inače sjekao dropdown.
export default function RowActionsMenu({
  primaryActions,
  menuItems,
  busy = false,
  menuLabel = "Više akcija",
}: {
  primaryActions: RowPrimaryAction[];
  menuItems: RowMenuItem[];
  busy?: boolean;
  menuLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const recompute = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    };
    recompute();
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(target instanceof Element && target.closest("[data-row-menu]"))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const closeAnd = (fn?: () => void) => () => {
    setOpen(false);
    fn?.();
  };

  return (
    <div className={styles.wrap}>
      {primaryActions.map((a) =>
        a.href ? (
          <Link
            key={a.key}
            href={a.href}
            className={styles.primary}
            title={a.title}
          >
            {a.icon}
            {a.label}
          </Link>
        ) : (
          <button
            key={a.key}
            type="button"
            className={styles.primary}
            onClick={a.onClick}
            title={a.title}
            disabled={a.disabled}
          >
            {a.icon}
            {a.label}
          </button>
        ),
      )}

      <div ref={containerRef} className={styles.kebabWrap}>
        <button
          ref={buttonRef}
          type="button"
          className={styles.kebab}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={menuLabel}
          title={menuLabel}
          disabled={busy}
        >
          {busy ? (
            <span className={styles.kebabBusy} aria-hidden="true" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="12" cy="5" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="12" cy="19" r="1.7" />
            </svg>
          )}
        </button>
        {open &&
          menuPos &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              role="menu"
              data-row-menu
              className={styles.menu}
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {menuItems.map((it) =>
                it.kind === "group" ? (
                  <div key={it.key} className={styles.menuGroup}>
                    {it.label}
                  </div>
                ) : it.href ? (
                  <Link
                    key={it.key}
                    href={it.href}
                    className={styles.menuItem}
                    onClick={closeAnd()}
                    role="menuitem"
                  >
                    <span className={styles.menuItemLabel}>
                      {it.icon}
                      {it.label}
                    </span>
                    {it.sub && (
                      <span className={styles.menuItemSub}>{it.sub}</span>
                    )}
                  </Link>
                ) : (
                  <button
                    key={it.key}
                    type="button"
                    className={styles.menuItem}
                    onClick={closeAnd(it.onClick)}
                    disabled={it.disabled}
                    role="menuitem"
                  >
                    <span className={styles.menuItemLabel}>
                      {it.icon}
                      {it.label}
                    </span>
                    {it.sub && (
                      <span className={styles.menuItemSub}>{it.sub}</span>
                    )}
                  </button>
                ),
              )}
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
