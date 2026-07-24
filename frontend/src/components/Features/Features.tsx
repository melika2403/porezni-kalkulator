"use client";

import Link from "next/link";
import styles from "./Features.module.css";
import { useMe } from "src/hooks/useMe";

type Badge = "free" | "reg" | "pro" | "business";

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
  pro: "Pro pretplata",
  business: "Business pretplata",
};

// ── Besplatni alati (bez registracije, amortizacija uz besplatan račun) ──────
const FREE_TOOLS: Feature[] = [
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
    desc: "Prijavite člana porodice (supružnika, dijete ili roditelja) na zdravstveno osiguranje u FBiH. Popunite ZO3 obrazac online i preuzmite popunjeni PDF.",
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
  {
    title: "AMS-1035 generator",
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
];

// ── Pro pretplata (flagship "Plate i prijave radnika" je izdvojen iznad) ─────
const PRO_TOOLS: Feature[] = [
  {
    title: "Šihterica: evidencija radnog vremena",
    desc: "Unos i pregled radnog vremena po zaposlenima. Automatski obračun sati, prekovremenih i slobodnih dana.",
    badge: "pro",
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
  {
    title: "Fakture i predračuni",
    desc: "Izrada profesionalnih računa (faktura) i predračuna sa automatskim obračunom PDV-a, podacima vašeg obrta i klijenata. Numeracija, historija i izvoz u PDF, spremno za slanje klijentu.",
    badge: "pro",
    iconColor: "accent",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h6M9 9h2" />
      </svg>
    ),
    dest: "/fakture",
  },
  {
    title: "Generator članskih kartica",
    desc: "Kreirajte profesionalne članske kartice sa QR kodom za svoju organizaciju (Pro) ili klijente (Business). Format kreditne kartice, spremno za štampanje ili pokazivanje na mobitelu.",
    badge: "pro",
    iconColor: "accent",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <rect x="2" y="6" width="20" height="13" rx="2" />
        <path d="M2 10h20M6 15h4" />
      </svg>
    ),
    dest: "/clanske-kartice",
  },
];

// ── Business pretplata ────────────────────────────────────────────────────────
const BUSINESS_TOOLS: Feature[] = [
  {
    title: "Ugovor o djelu",
    desc: "Kalkulator poreza i doprinosa na honorar (NETO ↔ BRUTO), automatski obračun PIO/zdravstva/zaštite, predložak ugovora i 6 uplatnica spremnih za banku.",
    badge: "business",
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
    dest: "/ugovor-o-djelu",
  },
  {
    title: "Ugovor o radu i otkaz",
    desc: "Generator ugovora o radu i odluke o prestanku radnog odnosa prema Zakonu o radu FBiH. Probni rad, određeno/neodređeno trajanje, automatski broj ugovora, u Word i PDF formatu.",
    badge: "business",
    iconColor: "dark",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h4" />
        <circle cx="9" cy="10" r="1.2" />
      </svg>
    ),
    dest: "/ugovor-o-radu",
  },
];

// ── Brzi kalkulatori: odvojena sekcija, kao i prije ──────────────────────────
interface QuickTool {
  title: string;
  desc: string;
  icon: React.ReactNode;
  dest: string;
}

const QUICK_TOOLS: QuickTool[] = [
  {
    title: "Preračun neto / bruto plate",
    desc: "Unesite neto ili bruto iznos i odmah dobijate sve doprinose, poreze i ukupni trošak za poslodavca.",
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
    desc: "Brzi preračun PDV-a u oba smjera: iz cijene bez PDV-a ili iz maloprodajne cijene s PDV-om. Prikaz u KM ili u EUR.",
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

const FLAGSHIP_POINTS = [
  "Platni listići i uplatnice spremne za banku",
  "Obrasci 2001 i 2002 za PUFBiH",
  "JS3100 prijave i odjave radnika",
  "MIP-1023 i GIP-1022 izvještaji",
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

const CheckIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 8.5l3.5 3.5L13 4.5" />
  </svg>
);

function FeatureGroup({
  title,
  sub,
  tools,
  cta,
  showBadges,
}: {
  title: string;
  sub: string;
  tools: Feature[];
  cta: string;
  showBadges?: boolean;
}) {
  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupTitle}>{title}</span>
        <span className={styles.groupSub}>{sub}</span>
      </div>
      <div className={styles.grid}>
        {tools.map((f) => (
          <div key={f.title} className={styles.cell}>
            <div className={`${styles.icon} ${styles[`icon_${f.iconColor}`]}`}>
              {f.icon}
            </div>
            <div className={styles.cellTitle}>{f.title}</div>
            <div className={styles.cellDesc}>{f.desc}</div>
            <Link href={f.dest} className={`${styles.startLink} ${styles.cellStretch}`}>
              <button type="button" className={styles.startButton}>
                {cta} <ArrowIcon />
              </button>
            </Link>
            {showBadges && (
              <span className={`${styles.badge} ${styles[`badge_${f.badge}`]}`}>
                {BADGE_LABELS[f.badge]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Features() {
  // Trial i "isprobaj" poruke su samo za goste; ulogovan korisnik (i
  // pretplatnik) vidi neutralno "Otvori alat".
  const user = useMe();
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

      {/* Flagship: glavni alat, izdvojen iznad grupa */}
      <div className={styles.flagship}>
        <div className={styles.flagshipBody}>
          <span className={styles.featuredTag}>Najpopularnije</span>
          <h3 className={styles.flagshipTitle}>
            Obračun plata i prijave radnika
          </h3>
          <p className={styles.flagshipDesc}>
            Kompletan mjesečni obračun plata i doprinosa za vaše radnike, od
            unosa do dokumenata spremnih za banku i poreznu upravu.
          </p>
          <ul className={styles.flagshipList}>
            {FLAGSHIP_POINTS.map((p) => (
              <li key={p}>
                <CheckIcon />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.flagshipCta}>
          <Link href="/prijave-radnika?tab=obracun" className={`${styles.startLink} ${styles.cellStretch}`}>
            <button type="button" className={styles.startButton}>
              {user ? "Otvori alat" : "Isprobaj 30 dana besplatno"} <ArrowIcon />
            </button>
          </Link>
          <span className={styles.flagshipNote}>
            {user ? "Uz Pro pretplatu" : "Bez kartice · uz Pro pretplatu"}
          </span>
        </div>
      </div>

      <FeatureGroup
        title="Besplatni alati"
        sub="Bez registracije, stalna sredstva uz besplatan račun"
        tools={FREE_TOOLS}
        cta="Otvori alat"
        showBadges
      />

      <FeatureGroup
        title="Uz Pro pretplatu"
        sub={
          user
            ? "Dostupno uz Pro pretplatu"
            : "30 dana besplatno za nove korisnike"
        }
        tools={PRO_TOOLS}
        cta={user ? "Otvori alat" : "Isprobaj besplatno"}
      />
      <FeatureGroup
        title="Uz Business pretplatu"
        sub="Za knjigovodstvene agencije i firme sa više radnika"
        tools={BUSINESS_TOOLS}
        cta={user ? "Otvori alat" : "Isprobaj besplatno"}
      />

      {/* PK Office banner namjerno uklonjen odavde: isti banner postoji u
          Pricing sekciji i kao standalone PkOfficeTeaser niže na početnoj,
          tri ponavljanja u jednom scrollu su bila previše. */}

      {/* Brzi kalkulatori: odvojen red na dnu, kao i prije */}
      <div className={styles.group}>
        <div className={styles.groupHeader}>
          <span className={styles.groupTitle}>Brzi kalkulatori</span>
          <span className={styles.groupSub}>Besplatno, bez registracije</span>
        </div>
        <div className={styles.quickToolsRow}>
          {QUICK_TOOLS.map((t) => (
            <div key={t.title} className={styles.quickTool}>
              <div className={`${styles.icon} ${styles.icon_sage}`}>
                {t.icon}
              </div>
              <div className={styles.cellTitle}>{t.title}</div>
              <div className={styles.quickToolDesc}>{t.desc}</div>
              <Link href={t.dest} className={`${styles.startLink} ${styles.cellStretch}`}>
                <button type="button" className={styles.startButton}>
                  Otvori alat <ArrowIcon />
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
