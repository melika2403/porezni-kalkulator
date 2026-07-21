"use client";

// Klizni panel zdesna sa upustvom za trenutnu stranicu. Montiran jednom u
// AppShell-u; sluša globalni store (openUpustvo/closeUpustvo) i prikaže sadržaj
// iz registra upustava. Stranica ispod ostaje netaknuta.
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  IconX,
  IconChevronDown,
  IconBulb,
  IconAlertTriangle,
} from "@tabler/icons-react";
import {
  subscribeUpustvo,
  getUpustvoSlug,
  closeUpustvo,
} from "src/lib/upustvo-store";
import { upustvoZaSlug } from "src/content/upustva";
import type { Blok } from "src/content/upustva/types";
import styles from "./UpustvoDrawer.module.css";

function BlokView({ blok }: { blok: Blok }) {
  if (blok.t === "p") {
    return (
      <p className="text-[13.5px] leading-6 text-text-secondary">{blok.text}</p>
    );
  }
  if (blok.t === "koraci") {
    return (
      <ol className="space-y-2">
        {blok.stavke.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[13.5px] leading-6">
            <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-[20px] h-[20px] rounded-full bg-brand-100 text-brand-700 text-[11px] leading-none font-semibold tabular-nums">
              {i + 1}
            </span>
            <span className="text-text-secondary">{s}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (blok.t === "savjet") {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-success-bg px-3 py-2.5 text-[12.5px] leading-5 text-success">
        <IconBulb size={15} className="shrink-0 mt-0.5" />
        <span>{blok.text}</span>
      </div>
    );
  }
  if (blok.t === "slika") {
    return (
      <figure className="space-y-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blok.src}
          alt={blok.opis ?? ""}
          className="w-full rounded-lg border border-cream-300"
        />
        {blok.opis && (
          <figcaption className="text-[11.5px] text-text-tertiary leading-5">
            {blok.opis}
          </figcaption>
        )}
      </figure>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-[12.5px] leading-5 text-warning">
      <IconAlertTriangle size={15} className="shrink-0 mt-0.5" />
      <span>{blok.text}</span>
    </div>
  );
}

export function UpustvoDrawer() {
  const slug = useSyncExternalStore(
    subscribeUpustvo,
    getUpustvoSlug,
    () => null,
  );
  const open = slug != null;
  const upustvo = upustvoZaSlug(slug);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeUpustvo();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !upustvo || typeof document === "undefined") return null;

  return createPortal(
    <div className="pk-scope fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div className={styles.overlay} onClick={closeUpustvo} aria-hidden />
      <div
        className={`${styles.panel} bg-cream-100 border-l border-cream-300 shadow-[-18px_0_50px_-12px_rgba(15,26,18,0.35)]`}
      >
        {/* Zaglavlje */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-cream-300">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.07em] text-text-tertiary font-semibold mb-1">
              Uputstvo
            </div>
            <h3 className="font-serif-display text-[21px] leading-tight text-text-primary">
              {upustvo.naslov}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeUpustvo}
            aria-label="Zatvori uputstvo"
            className="p-1.5 -mr-1.5 -mt-0.5 rounded-lg text-text-tertiary hover:bg-cream-200 hover:text-text-primary transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Sadržaj */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <p className="text-[13.5px] leading-6 text-text-primary">
            {upustvo.podnaslov}
          </p>

          {upustvo.sekcije.map((sek, si) => (
            <section key={si} className="space-y-2.5">
              <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary font-semibold">
                {sek.naslov}
              </div>
              {sek.blokovi.map((b, bi) => (
                <BlokView key={bi} blok={b} />
              ))}
            </section>
          ))}

          {upustvo.faq.length > 0 && (
            <section className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary font-semibold">
                Česta pitanja
              </div>
              <div className="rounded-lg border border-cream-300 divide-y divide-cream-300 overflow-hidden">
                {upustvo.faq.map((f, fi) => (
                  <details key={fi} className="group">
                    <summary className="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer list-none text-[13px] font-medium text-text-primary hover:bg-cream-200 transition-colors [&::-webkit-details-marker]:hidden">
                      <span>{f.p}</span>
                      <IconChevronDown
                        size={16}
                        className="shrink-0 text-text-tertiary transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <div className="px-3 pb-3 pt-0.5 text-[13px] leading-6 text-text-secondary">
                      {f.o}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
