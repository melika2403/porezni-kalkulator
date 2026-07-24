"use client";

// Showcase najboljih PK Office funkcija: tabovi (aktivni u accent boji)
// mijenjaju tekst i mini-mockup desno. Sadržaj je statičan, bez fetch-a.
// Tabovi se sami smjenjuju na ~9s; hover pauzira, ručni klik resetuje tajmer,
// a prefers-reduced-motion gasi auto-rotaciju.
import { useEffect, useState } from "react";
import styles from "./PkOfficeTeaser.module.css";

type Feature = {
  id: string;
  tab: string;
  title: string;
  lead: React.ReactNode;
  chips: string[];
  mockTitle: string;
  rows: { main: string; match: string }[];
  badge: string;
  foot: string;
};

const FEATURES: Feature[] = [
  {
    id: "izvodi",
    tab: "Izvodi i KPR",
    title: "Bankovni izvod se knjiži sam",
    lead: (
      <>
        Učitaš izvod, a PK Office sam <strong>upari uplate i troškove</strong>{" "}
        sa fakturama i partnerima i <strong>proknjiži ih u KPR</strong>. Bez
        ručnog prepisivanja i bez Excela.
      </>
    ),
    chips: ["uplate", "troškovi", "plate"],
    mockTitle: "Bankovni izvod",
    rows: [
      { main: "Uplata kupca · 1.170,00", match: "Faktura 2026-014" },
      { main: "Telekom · 89,00", match: "Trošak: komunikacije" },
      { main: "Isplata plate · 1.030,00", match: "Plata, mart 2026" },
    ],
    badge: "knjiženo",
    foot: "Automatski upareno i proknjiženo u KPR",
  },
  {
    id: "pdv",
    tab: "PDV",
    title: "PDV prijava se popuni iz knjiga",
    lead: (
      <>
        KUF i KIF nastaju sami iz ulaznih računa i faktura, a{" "}
        <strong>PDV prijava i D-PDV</strong> se generišu jednim klikom,
        spremni za <strong>e-podnošenje kod UINO</strong>.
      </>
    ),
    chips: ["KUF i KIF", "PDV prijava", "e-KUF/e-KIF"],
    mockTitle: "PDV prijava · juni 2026",
    rows: [
      { main: "Izlazni PDV · 1.615,00", match: "iz KIF-a (23 fakture)" },
      { main: "Ulazni PDV · 890,50", match: "iz KUF-a (17 računa)" },
      { main: "Za uplatu · 724,50", match: "obračunato automatski" },
    ],
    badge: "spremno",
    foot: "D-PDV fajl i e-KUF/e-KIF izvoz jednim klikom",
  },
  {
    id: "roba",
    tab: "Roba",
    title: "Kalkulacija, lager i popis za maloprodaju",
    lead: (
      <>
        Kalkulaciju kucaš <strong>brzo kao u starim programima</strong>{" "}
        (Enter, Enter, Enter), a ona sama proknjiži ulazni račun u KUF i{" "}
        <strong>zaduži lager</strong>. Popis na kraju sredi razliku.
      </>
    ),
    chips: ["kalkulacije", "lager lista", "popis"],
    mockTitle: "Kalkulacija KLC 7/26",
    rows: [
      { main: "Sok 0,5l · marža 35%", match: "MPC 2,50 KM" },
      { main: "Grickalice 90g · marža 40%", match: "MPC 1,90 KM" },
      { main: "Ukupno zaduženje · 1.284,00", match: "ulazni račun u KUF" },
    ],
    badge: "u lageru",
    foot: "Račun u KUF, artikli na lager, automatski",
  },
  {
    id: "plate",
    tab: "Plate",
    title: "Plate sa svim obrascima u dva klika",
    lead: (
      <>
        Obračunaš cijeli mjesec odjednom: <strong>MIP-1023, platne liste,
        uplatnice</strong> i Obrazac 2002 za vlasnika izlaze iz istog
        obračuna, a listići idu <strong>radnicima na email</strong>.
      </>
    ),
    chips: ["MIP-1023", "platne liste", "uplatnice", "2002"],
    mockTitle: "Obračun plata · mart 2026",
    rows: [
      { main: "Amar H. · neto 1.030,00", match: "MIP + platna lista" },
      { main: "Selma K. · neto 1.250,00", match: "MIP + platna lista" },
      { main: "Doprinosi vlasnika", match: "Obrazac 2002" },
    ],
    badge: "obračunato",
    foot: "Listići na email svim radnicima jednim klikom",
  },
];

export default function SpotlightTabs() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const f = FEATURES[active];

  // auto-rotacija: svaki prikaz traje ~9s; promjena (i ručna) resetuje tajmer
  useEffect(() => {
    if (paused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const t = setTimeout(
      () => setActive((a) => (a + 1) % FEATURES.length),
      9000,
    );
    return () => clearTimeout(t);
  }, [active, paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className={`${styles.tabs} ${paused ? styles.tabsPaused : ""}`}
        role="tablist"
        aria-label="Najbolje funkcije PK Office-a"
      >
        {FEATURES.map((feat, i) => (
          <button
            key={feat.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`${styles.tabBtn} ${i === active ? styles.tabBtnActive : ""}`}
          >
            {feat.tab}
          </button>
        ))}
      </div>

      {/* key remounta sadržaj pa se fade animacija ponovi na svaku promjenu */}
      <div key={f.id} className={`${styles.spotlight} ${styles.spotFade}`}>
        <div className={styles.spotlightText}>
          <span className={styles.tag}>Najbolje funkcije</span>
          <h3 className={styles.h3}>{f.title}</h3>
          <p className={styles.spotlightLead}>{f.lead}</p>
          <ul className={styles.spotChips}>
            {f.chips.map((c) => (
              <li key={c} className={styles.spotChip}>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.mockup}>
          <div className={styles.previewHead}>
            <span className={styles.previewTitle}>{f.mockTitle}</span>
          </div>
          <ul className={styles.txList}>
            {f.rows.map((t) => (
              <li key={t.main} className={styles.txRow}>
                <span className={styles.txDesc}>
                  <span className={styles.txMain}>{t.main}</span>
                  <span className={styles.txMatch}>→ {t.match}</span>
                </span>
                <span className={styles.txBadge}>{f.badge}</span>
              </li>
            ))}
          </ul>
          <div className={styles.previewFoot}>{f.foot}</div>
        </div>
      </div>
    </div>
  );
}
