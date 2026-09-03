"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./freelancer.module.css";

export const PO_STRANICI = 10;

/**
 * Klijentska paginacija za liste u PK Freelanceru (10 po stranici). Vraća
 * isječak za trenutnu stranicu i sam vraća korisnika na prvu stranicu kad se
 * lista promijeni (nova godina, pretraga, brisanje) da ne ostane na praznoj.
 */
export function useStranice<T>(stavke: T[], poStranici = PO_STRANICI) {
  const [stranica, setStranica] = useState(1);
  const ukupno = Math.max(1, Math.ceil(stavke.length / poStranici));
  useEffect(() => {
    if (stranica > ukupno) setStranica(ukupno);
  }, [stranica, ukupno]);
  // promjena sadržaja liste (npr. pretraga) vraća na početak
  const potpis = stavke.length;
  useEffect(() => {
    setStranica(1);
  }, [potpis]);
  const tekuca = Math.min(stranica, ukupno);
  const isjecak = useMemo(
    () => stavke.slice((tekuca - 1) * poStranici, tekuca * poStranici),
    [stavke, tekuca, poStranici],
  );
  return { isjecak, stranica: tekuca, ukupno, setStranica, od: stavke.length ? (tekuca - 1) * poStranici + 1 : 0, do: Math.min(tekuca * poStranici, stavke.length), ukupnoStavki: stavke.length };
}

export default function Paginacija({
  stranica,
  ukupno,
  od,
  do: doKraja,
  ukupnoStavki,
  onPromjena,
  sta = "stavki",
}: {
  stranica: number;
  ukupno: number;
  od: number;
  do: number;
  ukupnoStavki: number;
  onPromjena: (s: number) => void;
  sta?: string;
}) {
  if (ukupno <= 1) return null;
  // najviše 7 dugmadi: prva, zadnja, tekuća i po dva oko nje
  const brojevi: (number | "…")[] = [];
  for (let i = 1; i <= ukupno; i++) {
    if (i === 1 || i === ukupno || Math.abs(i - stranica) <= 2) brojevi.push(i);
    else if (brojevi[brojevi.length - 1] !== "…") brojevi.push("…");
  }
  return (
    <nav className={styles.paginacija} aria-label="Stranice">
      <span className={styles.paginacijaInfo}>
        {od} do {doKraja} od {ukupnoStavki} {sta}
      </span>
      <div className={styles.paginacijaDugmad}>
        <button
          type="button"
          className={`${styles.btnGhost} ${styles.btnSmall}`}
          disabled={stranica <= 1}
          onClick={() => onPromjena(stranica - 1)}
          aria-label="Prethodna stranica"
        >
          Prethodna
        </button>
        {brojevi.map((b, i) =>
          b === "…" ? (
            <span key={`e${i}`} className={styles.paginacijaTacke} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={b}
              type="button"
              className={`${styles.btnSmall} ${b === stranica ? styles.btnPrimary : styles.btnGhost}`}
              aria-current={b === stranica ? "page" : undefined}
              onClick={() => onPromjena(b)}
            >
              {b}
            </button>
          ),
        )}
        <button
          type="button"
          className={`${styles.btnGhost} ${styles.btnSmall}`}
          disabled={stranica >= ukupno}
          onClick={() => onPromjena(stranica + 1)}
          aria-label="Sljedeća stranica"
        >
          Sljedeća
        </button>
      </div>
    </nav>
  );
}
