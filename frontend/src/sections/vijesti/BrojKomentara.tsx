"use client";

/* Broj komentara u lijevoj traci članka.
   Serverska vrijednost je početna, ali stranica se kešira, pa bi poslije
   objave komentara ostala zamrznuta. Sekcija komentara javlja tačan broj
   window eventom, bez dodatnog zahtjeva prema serveru. */

import { useEffect, useState } from "react";
import styles from "./vijesti.module.css";

export const KOMENTARI_BROJ_EVENT = "pk:komentari-broj";

export function objaviBrojKomentara(slug: string, broj: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(KOMENTARI_BROJ_EVENT, { detail: { slug, broj } }),
  );
}

export default function BrojKomentara({
  slug,
  pocetni,
}: {
  slug: string;
  pocetni: number;
}) {
  const [broj, setBroj] = useState(pocetni);

  useEffect(() => {
    function naPromjenu(e: Event) {
      const detalj = (e as CustomEvent<{ slug: string; broj: number }>).detail;
      if (detalj?.slug === slug) setBroj(detalj.broj);
    }
    window.addEventListener(KOMENTARI_BROJ_EVENT, naPromjenu);
    return () => window.removeEventListener(KOMENTARI_BROJ_EVENT, naPromjenu);
  }, [slug]);

  return (
    <a href="#komentari" className={styles.railBrojka} style={{ textDecoration: "none" }}>
      <span className={styles.railBroj}>{broj}</span>
      <span className={styles.railOznaka}>
        {broj === 1 ? "komentar" : "komentara"}
      </span>
    </a>
  );
}
