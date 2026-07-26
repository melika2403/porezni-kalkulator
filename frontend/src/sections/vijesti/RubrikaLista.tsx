"use client";

/* Lista tekstova jedne rubrike: server renderuje prvih 6 (SEO i prvi prikaz),
   a "Učitaj još" dovlači sljedećih 6 bez osvježavanja stranice. */

import { useState } from "react";
import { getClanciJavno, type Clanak } from "src/api/vijesti";
import { RUBRIKA_PO_STRANI } from "src/data/vijesti";
import { MalaKartica } from "./ClanakKartica";
import styles from "./vijesti.module.css";

export default function RubrikaLista({
  rubrika,
  pocetni,
  ukupno,
}: {
  rubrika: string;
  pocetni: Clanak[];
  ukupno: number;
}) {
  const [clanci, setClanci] = useState<Clanak[]>(pocetni);
  const [strana, setStrana] = useState(1);
  const [ukupnoSad, setUkupnoSad] = useState(ukupno);
  const [ucitava, setUcitava] = useState(false);
  const [greska, setGreska] = useState(false);

  const imaJos = clanci.length < ukupnoSad;

  async function ucitajJos() {
    setUcitava(true);
    setGreska(false);
    const res = await getClanciJavno({
      rubrika,
      page: strana + 1,
      limit: RUBRIKA_PO_STRANI,
    });
    setUcitava(false);
    if (!res.ok || !res.data) {
      setGreska(true);
      return;
    }
    const { items, total } = res.data;
    setStrana((s) => s + 1);
    setUkupnoSad(total);
    // dedup po id: tekst objavljen između dva klika pomjeri granice stranica
    setClanci((prev) => {
      const vec = new Set(prev.map((c) => c.id));
      return [...prev, ...items.filter((c) => !vec.has(c.id))];
    });
  }

  return (
    <>
      <div className={styles.rijeka}>
        {clanci.map((c) => (
          <MalaKartica key={c.id} c={c} uRijeci />
        ))}
      </div>

      {greska && (
        <p className={styles.komGreska} style={{ textAlign: "center" }}>
          Učitavanje nije uspjelo, pokušajte ponovo.
        </p>
      )}

      {imaJos && (
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <button
            type="button"
            className={styles.railDugme}
            onClick={() => void ucitajJos()}
            disabled={ucitava}
          >
            {ucitava ? "Učitavam..." : "Učitaj još ↓"}
          </button>
        </div>
      )}
    </>
  );
}
