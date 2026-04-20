'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './Features.module.css';
import ComingSoonModal from '../ComingSoonModal/ComingSoonModal';

type Badge = "free" | "reg" | "pro";

interface Feature {
  title: string;
  desc: string;
  badge: Badge;
  iconColor: "sage" | "accent" | "dark";
  icon: React.ReactNode;
  dest: string;
  soon?: boolean;
}

const BADGE_LABELS: Record<Badge, string> = {
  free: "Besplatno",
  reg: "Registracija",
  pro: "Godišnja pretplata",
};

const FEATURES: Feature[] = [
  // ── Free ────────────────────────────────────────────
  {
    title: "SPR-1053 obrazac",
    desc: "Automatska izrada obrasca za porez na dohodak iz samostalne djelatnosti. Unesite podatke, preuzmite popunjeni obrazac.",
    badge: "free",
    iconColor: "sage",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    dest: "/spr",
  },
  {
    title: "GPD-1051 obrazac",
    desc: "Godišnja prijava poreza na dohodak. Mogućnost pohrane podataka iz prethodnih godina uz registraciju.",
    badge: "free",
    iconColor: "sage",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    dest: "/gpd",
  },
  {
    title: "ZO3 obrazac",
    desc: "Automatska izrada ZO3 obrasca za prijavu doprinosa. Unesite podatke o zaposlenima i preuzmite popunjeni obrazac.",
    badge: "free",
    iconColor: "sage",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    dest: "/zo3",
  },
  {
    title: "Ugovor o pozajmici",
    desc: "Izrada standardnog ugovora o pozajmici, s mogućnošću prilagođavanju uvjeta i prema vašim potrebama.",
    badge: "free",
    iconColor: "sage",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
      </svg>
    ),
    dest: "/ugovor-o-pozajmici",
  },
  // ── Free (continued) ─────────────────────────────────
  {
    title: "AMS-1035 obrazac",
    desc: "Automatska izrada AMS-1035 obrasca i uplatnica za prijavu poreza na uplate iz inostranstva. Unesite podatke o uplati i preuzmite popunjeni obrazac. Preuzmite gotove uplatnice za banku.",
    badge: "free",
    iconColor: "sage",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h5" />
        <circle cx="17" cy="17" r="3" />
        <path d="M17 15.5v1.5l1 1" />
      </svg>
    ),
    dest: "/ams",
  },
  // ── Registration ─────────────────────────────────────
  {
    title: "Stalna sredstva i amortizacija",
    desc: "Evidencija stalnih sredstava s automatskim obračunom amortizacije kroz godine. Historija i pregled po godinama.",
    badge: "reg",
    iconColor: "accent",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M3 20h18" />
        <rect x="4" y="8" width="3" height="12" rx="1" />
        <rect x="10" y="11" width="3" height="9" rx="1" />
        <rect x="16" y="14" width="3" height="6" rx="1" />
        <path d="M5.5 8 L11.5 11 L17.5 14" strokeDasharray="2 2" />
      </svg>
    ),
    dest: "/amortizacija",
  },
  {
    title: "Šihterica — Evidencija radnog vremena",
    desc: "Unos i pregled radnog vremena po zaposlenima. Automatski obračun sati, prekovremenih i slobodnih dana.",
    badge: "reg",
    iconColor: "accent",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
    dest: "/sihterica",
    soon: true,
  },
  // ── Pro ──────────────────────────────────────────────
  {
    title: "Prijave / odjave radnika",
    desc: "Unos i evidencija radnika s automatskim ispisom JS3100 obrasca i ostalih prijavnih obrazaca u PDF formatu.",
    badge: "pro",
    iconColor: "dark",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    dest: "/prijave-radnika",
    soon: true,
  },
  {
    title: "Ugovori o djelu i ostali ugovori",
    desc: "Izrada ugovora o djelu s obračunom poreza i doprinosa na honorar, te ugovora o zakupu, kupoprodajnih i ostalih poslovnih ugovora.",
    badge: "pro",
    iconColor: "dark",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
    dest: "/ugovori",
    soon: true,
  },
];

interface QuickTool {
  title: string;
  desc: string;
  icon: React.ReactNode;
  dest: string;
}

const QUICK_TOOLS: QuickTool[] = [
  {
    title: "Preračun neto / bruto plate",
    desc: "Unesite neto ili bruto iznos — odmah dobijate sve doprinose, poreze i ukupni trošak za poslodavca.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    dest: "/preracun-neto-bruto",
  },
  {
    title: "PDV kalkulator",
    desc: "Brzi preračun PDV-a u oba smjera — iz cijene bez PDV-a ili iz maloprodajne cijene s PDV-om. Prikaz u KM ili u EUR.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
      </svg>
    ),
    dest: "/pdv-kalkulator",
  },
];

const ArrowIcon = () => (
  <span className={styles.startArrow} aria-hidden="true">
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="2" y1="8" x2="12" y2="8" />
      <polyline points="8 4 12 8 8 12" />
    </svg>
  </span>
);

export default function Features() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section id="funkcije" className={styles.section}>
        <div className={styles.header}>
          <div className={styles.label}>Što dobijate</div>
          <h2 className={styles.h2}>
            Sve što vam treba
            <br />
            <em>na jednom ekranu</em>
          </h2>
          <p className={styles.intro}>
            Od jednostavnog preračuna plate do kompletnih obrazaca i ugovora za
            radnike.
          </p>
        </div>

        <div className={styles.grid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.cell}>
              <div className={`${styles.icon} ${styles[`icon_${f.iconColor}`]}`}>
                {f.icon}
              </div>
              <div className={styles.cellTitle}>{f.title}</div>
              <div className={styles.cellDesc}>{f.desc}</div>
              {f.soon ? (
                <button
                  type="button"
                  className={styles.startButton}
                  onClick={() => setShowModal(true)}
                >
                  Kreni <ArrowIcon />
                </button>
              ) : (
                <Link href={f.dest} className={styles.startLink}>
                  <button type="button" className={styles.startButton}>
                    Kreni <ArrowIcon />
                  </button>
                </Link>
              )}
              <span className={`${styles.badge} ${styles[`badge_${f.badge}`]}`}>
                {BADGE_LABELS[f.badge]}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.quickToolsSection}>
          <div className={styles.quickToolsHeader}>
            <span className={styles.quickToolsLabel}>Brzi kalkulatori</span>
            <span className={styles.quickToolsSubLabel}>
              Besplatno, bez registracije
            </span>
          </div>
          <div className={styles.quickToolsRow}>
            {QUICK_TOOLS.map((t) => (
              <div key={t.title} className={styles.quickTool}>
                <div className={`${styles.icon} ${styles.icon_sage}`}>
                  {t.icon}
                </div>
                <div className={styles.quickToolTitle}>{t.title}</div>
                <div className={styles.quickToolDesc}>{t.desc}</div>
                <Link href={t.dest} className={styles.startLink}>
                  <button type="button" className={styles.startButton}>
                    Kreni <ArrowIcon />
                  </button>
                </Link>
                <span className={`${styles.badge} ${styles.badge_free}`}>
                  {BADGE_LABELS.free}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showModal && <ComingSoonModal onClose={() => setShowModal(false)} />}
    </>
  );
}
