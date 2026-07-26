"use client";

/* Broj dijeljenja u lijevoj traci. Serverska vrijednost je početna, a dugme
   Podijeli javlja novu brojku eventom, isto kao kod komentara. */

import { useEffect, useState } from "react";
import styles from "./vijesti.module.css";

export const DIJELJENJA_EVENT = "pk:dijeljenja-broj";

export function objaviBrojDijeljenja(slug: string, broj: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DIJELJENJA_EVENT, { detail: { slug, broj } }),
  );
}

export default function BrojDijeljenja({
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
    window.addEventListener(DIJELJENJA_EVENT, naPromjenu);
    return () => window.removeEventListener(DIJELJENJA_EVENT, naPromjenu);
  }, [slug]);

  return (
    <span className={styles.railBrojka}>
      <span className={styles.railBroj}>{broj}</span>
      <span className={styles.railOznaka}>
        {broj === 1 ? "dijeljenje" : "dijeljenja"}
      </span>
    </span>
  );
}
