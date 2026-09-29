"use client";

// Globalni prijedlog ispravke email adrese ("Da li ste mislili ...@gmail.com?").
// Montira se jednom u layoutu i sluša napuštanje (blur) svakog email polja u
// aplikaciji, pa pojedinačne forme ne treba dirati. Prijedlog se prikazuje
// odmah ispod polja i nikad ne blokira unos.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { suggestEmailFix } from "src/lib/emailTypo";
import styles from "./EmailTypoHint.module.css";

const SELECTOR = 'input[type="email"], input[inputmode="email"]';
// razmak između polja i prijedloga
const GAP = 6;

// container: div u koji se renderuje prijedlog (umeće ga efekt ispod)
type Hint = { input: HTMLInputElement; suggestion: string; container: HTMLDivElement };

// React kontrolisani input: vrijednost se mora postaviti native setterom i
// poslati "input" event, inače onChange ne vidi promjenu
function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function isFlexRow(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return cs.display.includes("flex") && !cs.flexDirection.startsWith("column");
}

/**
 * Element ispod kojeg se rezerviše prostor za prijedlog: polje, ili omotač
 * iste visine (ikonica u polju, npr. oko lozinke), ili flex red u kojem polje
 * stoji pored dugmeta. Grid se ne penje: margin ćelije samo povisi red.
 */
function findAnchor(input: HTMLInputElement): HTMLElement {
  let el: HTMLElement = input;
  while (el.parentElement && el.parentElement !== document.body) {
    const parent = el.parentElement;
    const sameHeight =
      Math.abs(parent.getBoundingClientRect().height - el.getBoundingClientRect().height) < 2;
    if (!sameHeight && !isFlexRow(parent)) break;
    el = parent;
  }
  return el;
}

/** Najbliži pozicionirani predak (containing block za position: absolute). */
function positionedParent(el: HTMLElement): HTMLElement {
  let p = el.parentElement;
  while (p && p !== document.body) {
    if (getComputedStyle(p).position !== "static") return p;
    p = p.parentElement;
  }
  return document.body;
}

export default function EmailTypoHint() {
  const [hint, setHint] = useState<Hint | null>(null);
  // odbijeni prijedlozi po polju: isti se ne nudi ponovo za istu vrijednost
  const dismissed = useRef(new WeakMap<HTMLInputElement, string>());

  useEffect(() => {
    const onFocusOut = (e: FocusEvent) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement) || !input.matches(SELECTOR)) return;
      const suggestion = suggestEmailFix(input.value);
      if (!suggestion || dismissed.current.get(input) === input.value) return;
      const container = document.createElement("div");
      container.setAttribute("data-email-typo-hint", "");
      container.style.position = "absolute";
      container.style.zIndex = "5";
      setHint({ input, suggestion, container });
    };
    const onInput = (e: Event) => {
      setHint((h) => (h && h.input === e.target ? null : h));
    };
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("input", onInput, true);
    };
  }, []);

  // Prostor ispod polja se rezerviše marginom (sadržaj ispod se pomjeri, ništa
  // se ne prekriva), a prijedlog je position: absolute u najbližem
  // pozicioniranom pretku polja, pa skrola nativno zajedno sa formom (i u
  // modalu) i ima tačno širinu polja.
  useEffect(() => {
    if (!hint) return;
    const { input, container } = hint;
    const anchor = findAnchor(input);
    const host = positionedParent(input);
    host.appendChild(container);

    const origInline = anchor.style.marginBottom;
    const origMargin = parseFloat(getComputedStyle(anchor).marginBottom) || 0;
    const next = anchor.nextElementSibling;
    // margine susjeda se u block layoutu spajaju (collapse), pa se računa od veće
    const baseGap = Math.max(
      origMargin,
      next ? parseFloat(getComputedStyle(next).marginTop) || 0 : 0,
    );

    // koordinate su relativne na host, pa se pri skrolu ne mijenjaju; mijenjaju
    // se samo kad se layout iznad polja pomjeri. Stil se piše samo na promjenu.
    const set = (el: HTMLElement, prop: "top" | "left" | "width" | "marginBottom", v: string) => {
      if (el.style[prop] !== v) el.style[prop] = v;
    };
    const fit = () => {
      if (!input.isConnected) return;
      const ir = input.getBoundingClientRect();
      const ar = anchor.getBoundingClientRect();
      const base =
        host === document.body
          ? { top: -window.scrollY, left: -window.scrollX }
          : host.getBoundingClientRect();
      const top = ar.bottom - base.top + host.scrollTop - host.clientTop + GAP;
      const left = ir.left - base.left + host.scrollLeft - host.clientLeft;
      set(container, "top", `${Math.round(top)}px`);
      set(container, "left", `${Math.round(left)}px`);
      set(container, "width", `${Math.round(ir.width)}px`);
      set(anchor, "marginBottom", `${baseGap + container.offsetHeight + GAP}px`);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(input);
    ro.observe(container);
    window.addEventListener("resize", fit);
    fit();

    // polje nestalo ili sakriveno (zatvoren modal, promjena taba)
    let frame = 0;
    const watch = () => {
      if (!input.isConnected || input.offsetParent === null) {
        setHint(null);
        return;
      }
      fit();
      frame = requestAnimationFrame(watch);
    };
    frame = requestAnimationFrame(watch);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", fit);
      container.remove();
      anchor.style.marginBottom = origInline;
    };
  }, [hint]);

  if (!hint) return null;

  const at = hint.suggestion.lastIndexOf("@");
  const apply = () => {
    setInputValue(hint.input, hint.suggestion);
    hint.input.focus();
    setHint(null);
  };
  const dismiss = () => {
    dismissed.current.set(hint.input, hint.input.value);
    setHint(null);
  };

  return createPortal(
    <div className={styles.hint} role="status">
      <span className={styles.text}>
        <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 4.5v4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11.2" r="0.9" fill="currentColor" />
        </svg>
        <span>Da li ste mislili</span>
        <span className={styles.suggestionWrap}>
          <button type="button" className={styles.suggestion} onClick={apply}>
            {hint.suggestion.slice(0, at + 1)}
            <b>{hint.suggestion.slice(at + 1)}</b>
          </button>
          ?
        </span>
      </span>
      <span className={styles.actions}>
        <button type="button" className={styles.apply} onClick={apply}>
          Ispravi
        </button>
        <button type="button" className={styles.close} onClick={dismiss} aria-label="Zatvori">
          ×
        </button>
      </span>
    </div>,
    hint.container,
  );
}
