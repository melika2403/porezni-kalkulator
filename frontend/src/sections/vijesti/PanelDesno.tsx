"use client";

/* Panel uz vodeće vijesti: dvije liste pod tabovima, Najnovije i Najčitanije.
   Obje liste dolaze sa servera i već su u HTML-u, tab samo mijenja koja se
   vidi, pa pretraživači vide oba sadržaja. */

import { useState } from "react";
import Link from "next/link";
import type { Clanak } from "src/api/vijesti";
import { nazivRubrike, putanjaClanka } from "src/data/vijesti";
import styles from "./vijesti.module.css";

type Tab = "najnovije" | "najcitanije";

/* Panel je izlog, ne arhiva: po 5 naslova po tabu, bez unutrašnjeg skrola.
   Puna lista sa servera (do 24) i dalje puni blokove rubrika na naslovnoj. */
const PANEL_LIMIT = 5;

function Lista({ clanci, brojevi }: { clanci: Clanak[]; brojevi: boolean }) {
  return (
    <ul className={styles.panelLista}>
      {clanci.map((c, i) => (
        <li key={c.id} className={styles.panelItem}>
          <Link href={putanjaClanka(c.tip, c.slug)} className={styles.panelLink}>
            {brojevi && <span className={styles.panelBroj}>{i + 1}</span>}
            <span>
              <span className={styles.panelNaslov}>{c.naslov}</span>
              <span className={styles.panelMeta}>
                <span className={styles.panelRubrika}>
                  {nazivRubrike(c.rubrika)}
                </span>
                <span>·</span>
                <span>{c.vrijemeCitanja}</span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function PanelDesno({
  najnovije,
  najcitanije,
}: {
  najnovije: Clanak[];
  najcitanije: Clanak[];
}) {
  const [tab, setTab] = useState<Tab>("najnovije");

  return (
    <aside className={styles.panel}>
      <div className={styles.panelTabs}>
        <button
          type="button"
          className={`${styles.panelTab} ${tab === "najnovije" ? styles.panelTabAktivan : ""}`}
          onClick={() => setTab("najnovije")}
        >
          Najnovije
        </button>
        <button
          type="button"
          className={`${styles.panelTab} ${tab === "najcitanije" ? styles.panelTabAktivan : ""}`}
          onClick={() => setTab("najcitanije")}
        >
          Najčitanije
        </button>
      </div>

      {tab === "najnovije" ? (
        <Lista clanci={najnovije.slice(0, PANEL_LIMIT)} brojevi={false} />
      ) : (
        <Lista clanci={najcitanije.slice(0, PANEL_LIMIT)} brojevi />
      )}

      <Link href="/vijesti/pretraga" className={styles.panelSve}>
        Pretraga svih tekstova &rarr;
      </Link>
    </aside>
  );
}
