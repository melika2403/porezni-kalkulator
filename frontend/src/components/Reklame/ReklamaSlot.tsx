"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { JavnaReklama } from "src/api/reklame";
import type { ReklamaStranica } from "src/data/reklame";
import {
  BrendZnak,
  ReklamaInlineKartica,
  ReklamaStubKartica,
  bojeBrenda,
  linkProps,
  type ReklamaCtx,
} from "./ReklamaKartica";
import { usePrikaz, useReklama } from "./useReklame";
import styles from "./reklame.module.css";

// Slotovi za reklame promotera na javnim stranicama. Svaki slot sam povuče
// svoju reklamu (jedan zajednički zahtjev po stranici) i ne crta ništa kad
// za tu poziciju nema aktivne reklame.

type Strana = "lijevo" | "desno";

/**
 * Bočni stub.
 *  - raspored "fiksno": sam se pozicionira izvan okvira stranice od 860px
 *    (SPR, GPD), od 1440px širine
 *  - raspored "mreza": roditelj ga smješta (AMS grid), samo kartica
 */
export function ReklamaStub({
  stranica,
  strana,
  raspored = "mreza",
}: {
  stranica: ReklamaStranica;
  strana: Strana;
  raspored?: "fiksno" | "mreza";
}) {
  const pozicija = strana === "lijevo" ? "SIDEBAR_LIJEVO" : "SIDEBAR_DESNO";
  const r = useReklama(stranica, pozicija);
  if (!r) return null;
  const kartica = <ReklamaStubKartica r={r} ctx={{ stranica, pozicija }} />;
  if (raspored === "mreza") return kartica;
  return (
    <aside
      className={`${styles.fiksno} ${strana === "lijevo" ? styles.fiksnoLijevo : styles.fiksnoDesno}`}
      aria-label={`Oglas: ${r.brend}`}
    >
      {kartica}
    </aside>
  );
}

export function ReklamaInline({
  stranica,
  className,
}: {
  stranica: ReklamaStranica;
  className?: string;
}) {
  const r = useReklama(stranica, "INLINE");
  if (!r) return null;
  return (
    <div className={className}>
      <ReklamaInlineKartica r={r} ctx={{ stranica, pozicija: "INLINE" }} />
    </div>
  );
}

/** Klasa sponzorisanog dugmeta, za pregled u dashboardu. */
export const DUGME_KLASA = styles.dugme;

/** Sadržaj dugmeta "Preuzimanje omogućila <brend>" (i za pregled u dashboardu). */
export function DugmeSaBrendom({
  r,
  label,
  ikona,
}: {
  r: Pick<JavnaReklama, "brend" | "logoUrl">;
  label: ReactNode;
  ikona?: ReactNode;
}) {
  return (
    <>
      <BrendZnak r={r} velicina="mali" />
      <span className={styles.dugmeCrta} aria-hidden="true" />
      {ikona}
      <span className={styles.dugmeTekst}>
        <span className={styles.dugmeLabel}>{label}</span>
        <span className={styles.dugmeSub}>Preuzimanje omogućila {r.brend}</span>
      </span>
    </>
  );
}

/**
 * Dugme za preuzimanje PDF-a. Bez sponzora crta se kao i prije (className i
 * children stranice); sa sponzorom dobija pločicu brenda i potpis. Klik je
 * i dalje preuzimanje, ne odlazak na banku.
 */
export function DugmePreuzimanja({
  stranica,
  className,
  children,
  label,
  ikona,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  stranica: ReklamaStranica;
  /** tekst dugmeta u sponzorisanoj varijanti */
  label: ReactNode;
  ikona?: ReactNode;
}) {
  const r = useReklama(stranica, "DUGME");
  const ref = useRef<HTMLButtonElement>(null);
  usePrikaz(ref, r, stranica, "DUGME");

  if (!r) {
    return (
      <button className={className} {...rest}>
        {children}
      </button>
    );
  }
  return (
    <button
      ref={ref}
      className={styles.dugme}
      style={bojeBrenda(r.boja)}
      {...rest}
    >
      <DugmeSaBrendom r={r} label={label} ikona={ikona} />
    </button>
  );
}

/** Sponzorisani blok u prozoru poslije preuzimanja (i za pregled). */
export function ModalPoruka({ r, ctx }: { r: JavnaReklama; ctx: ReklamaCtx }) {
  return (
    <div className={styles.modalPoruka} style={bojeBrenda(r.boja)}>
      <span className={styles.modalOznaka}>Sponzorisana poruka</span>
      <div className={styles.modalGlava}>
        <BrendZnak r={r} />
        <div>
          {r.naslov && <p className={styles.modalNaslovPoruke}>{r.naslov}</p>}
          {r.tekst && <p className={styles.modalTekstPoruke}>{r.tekst}</p>}
        </div>
      </div>
      <div className={styles.modalAkcije}>
        <a {...linkProps(r, ctx)} className={styles.cta}>
          {r.ctaTekst || "Saznaj više"}
        </a>
        {r.sekundarniTekst && (
          <a {...linkProps(r, ctx, true)} className={styles.sekundarni}>
            {r.sekundarniTekst}
          </a>
        )}
      </div>
    </div>
  );
}

function PreuzetoModal({
  r,
  stranica,
  naslov,
  podnaslov,
  onClose,
}: {
  r: JavnaReklama;
  stranica: ReklamaStranica;
  naslov: string;
  podnaslov: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePrikaz(ref, r, stranica, "MODAL");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    // portal je van DOM-a obrasca, ali React događaji i dalje idu kroz
    // stablo komponenti: bez stopPropagation Enter bi okinuo onKeyDown forme
    <div
      className={styles.overlay}
      onMouseDown={onClose}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        ref={ref}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rk-modal-naslov"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className={styles.modalKvacica} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h2 id="rk-modal-naslov" className={styles.modalNaslov}>
          {naslov}
        </h2>
        <p className={styles.modalPodnaslov}>{podnaslov}</p>
        <ModalPoruka r={r} ctx={{ stranica, pozicija: "MODAL" }} />
        <button type="button" className={styles.modalZatvori} onClick={onClose} autoFocus>
          Zatvori
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Prozor "Vaš obrazac je spreman" sa sponzorisanom porukom. Otvara se poslije
 * preuzimanja, najviše jednom po sesiji i stranici (ko preuzima pet obrazaca
 * zaredom ne gleda istu poruku pet puta). Bez aktivne reklame ne radi ništa.
 */
export function usePorukaPoslijePreuzimanja(stranica: ReklamaStranica) {
  const r = useReklama(stranica, "MODAL");
  const [tekst, setTekst] = useState<{ naslov: string; podnaslov: string } | null>(null);

  const otvori = useCallback(
    (podnaslov: string, naslov = "Vaš obrazac je spreman") => {
      if (!r) return;
      const kljuc = `rk-modal-${stranica}`;
      try {
        if (sessionStorage.getItem(kljuc)) return;
        sessionStorage.setItem(kljuc, "1");
      } catch {
        // bez storage-a (privatni prozor): prikaži, ne ruši preuzimanje
      }
      setTekst({ naslov, podnaslov });
    },
    [r, stranica],
  );

  const zatvori = useCallback(() => setTekst(null), []);

  const modal =
    r && tekst ? (
      <PreuzetoModal
        r={r}
        stranica={stranica}
        naslov={tekst.naslov}
        podnaslov={tekst.podnaslov}
        onClose={zatvori}
      />
    ) : null;

  return { otvori, modal };
}
