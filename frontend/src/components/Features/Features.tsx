import Link from "next/link";
import styles from "./Features.module.css";

type Badge = "free" | "reg" | "pro";

interface Feature {
  title: string;
  desc: string;
  badge: Badge;
  iconColor: "sage" | "accent" | "dark";
  icon: React.ReactNode;
  dest: string;
}

const BADGE_LABELS: Record<Badge, string> = {
  free: "Besplatno",
  reg: "Registracija",
  pro: "Godišnja pretplata",
};

// Sorted: free → reg → pro
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
        <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z" />
      </svg>
    ),
    dest: "/stalna-sredstva",
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
  },
  {
    title: "Ugovori o djelu",
    desc: "Izrada ugovora o djelu s automatskim obračunom troškova, poreza i doprinosa na honorar.",
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
    dest: "/ugovori-o-djelu",
  },
  {
    title: "Ostali ugovori",
    desc: "Izrada ugovora o zakupu, kupoprodajnih ugovora i ostalih poslovnih ugovora prilagođenih vašim potrebama.",
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
        <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
      </svg>
    ),
    dest: "/ostali-ugovori",
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

export default function Features() {
  return (
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
            <Link href={f.dest} className={styles.startLink}>
              <button type="button" className={styles.startButton}>
                Kreni
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
              </button>
            </Link>
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
                  Kreni
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
  );
}
