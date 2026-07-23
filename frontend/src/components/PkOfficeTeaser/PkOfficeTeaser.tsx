import Link from "next/link";
import styles from "./PkOfficeTeaser.module.css";
import { OfficeTrialLink } from "src/components/OfficeTrialLink/OfficeTrialLink";
import SpotlightTabs from "./SpotlightTabs";

// Inline ikone (marketing server komponenta, bez icon-lib zavisnosti), u duhu
// tabler ikona iz PK Office sidebara.
const ICONS: Record<string, React.ReactNode> = {
  coins: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7 -1.3 7 -3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7 -1.3 7 -3v-6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.5a4 4 0 0 1 0 7" />
      <path d="M21 21v-2a4 4 0 0 0 -3 -3.9" />
    </>
  ),
  addressBook: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M5 8H3M5 12H3M5 16H3" />
      <circle cx="12" cy="10" r="2" />
      <path d="M9 16a3 3 0 0 1 6 0" />
    </>
  ),
  bank: (
    <>
      <path d="M3 21h18" />
      <path d="M4 10h16" />
      <path d="M5 6l7 -3l7 3" />
      <path d="M5 10v11M19 10v11M9 14v3M12 14v3M15 14v3" />
    </>
  ),
  book: (
    <>
      <path d="M19 4v16H7a2 2 0 0 1 -2 -2V6a2 2 0 0 1 2 -2h12z" />
      <path d="M19 16H7a2 2 0 0 0 -2 2" />
      <path d="M9 8h6" />
    </>
  ),
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="9" rx="1" />
      <rect x="4" y="15" width="7" height="5" rx="1" />
      <rect x="13" y="4" width="7" height="5" rx="1" />
      <rect x="13" y="11" width="7" height="9" rx="1" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2" />
      <path d="M9 7h6M9 11h6" />
    </>
  ),
  percent: (
    <>
      <circle cx="17" cy="17" r="2" />
      <circle cx="7" cy="7" r="2" />
      <path d="M6 18L18 6" />
    </>
  ),
  box: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </>
  ),
  cash: (
    <>
      <rect x="7" y="9" width="14" height="10" rx="2" />
      <circle cx="14" cy="14" r="2" />
      <path d="M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M4 11h16" />
      <path d="M9 16l2 2 4-4" />
    </>
  ),
};

const MODULES = [
  {
    icon: "bank",
    name: "Bankovni izvodi i KPR",
    desc: "izvod se knjiži sam, knjige uvijek ažurne",
  },
  {
    icon: "receipt",
    name: "Fakture i partneri",
    desc: "KIF, kartice kupaca, IOS, opomene, kompenzacije",
  },
  {
    icon: "percent",
    name: "PDV evidencije",
    desc: "KUF/KIF, PDV prijava, D-PDV, e-podnošenje",
  },
  {
    icon: "box",
    name: "Roba i maloprodaja",
    desc: "kalkulacije, lager lista, popis",
  },
  {
    icon: "coins",
    name: "Plate i radnici",
    desc: "MIP-1023, 2001/2002, šihterica, JS3100",
  },
  {
    icon: "cash",
    name: "Blagajna i putni nalozi",
    desc: "blagajnički dnevnik, dnevnice",
  },
  {
    icon: "calendar",
    name: "Godišnje obaveze",
    desc: "SPR, GPD, amortizacija, zaključak godine",
  },
  {
    icon: "dashboard",
    name: "Pregled poslovanja",
    desc: "dashboard, rokovi, notifikacije",
  },
];

// "Za koga je": tri tipična korisnika PK Office-a.
const PERSONAS = [
  {
    icon: "users",
    name: "Obrtnik koji vodi sam sebe",
    desc: "Učitaš izvod, potvrdiš stavke i knjige su gotove: sat vremena mjesečno umjesto cijelog vikenda.",
  },
  {
    icon: "addressBook",
    name: "Knjigovodstvena agencija",
    desc: "Svi obrti na jednom nalogu: grupni uvoz izvoda odjednom, bulk 2001/2002, paketi po broju obrta.",
  },
  {
    icon: "box",
    name: "Obrt sa maloprodajom",
    desc: "Kalkulacije, lager i popis su uključeni u svaki paket, bez doplata i dodatnih programa.",
  },
];

export default function PkOfficeTeaser() {
  return (
    <section className={styles.section} aria-labelledby="pk-office-teaser-title">
      <div className={styles.container}>
        <div className={styles.inner}>
          {/* ── Glavni dio ── */}
          <div className={styles.main}>
            <div className={styles.text}>
              <div className={styles.eyebrow}>
                <span className={styles.brandMark} aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="18"
                    height="18"
                  >
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M3 13h18" />
                  </svg>
                </span>
                <span className={styles.brandWordmark}>PK Office</span>
                <span className={styles.soon}>Novo</span>
              </div>
              <h2 id="pk-office-teaser-title" className={styles.h2}>
                Kompletno vođenje obrta na jednom mjestu
              </h2>
              <p className={styles.lead}>
                PK Office je aplikacija posvećena <strong>obrtima u FBiH</strong>.
                Umjesto da skačeš između alata, na jednom nalogu vodiš{" "}
                <strong>plate, radnike, partnere, račune i knjige</strong>, sve
                povezano sa obrascima koje već koristiš na Poreznom Kalkulatoru.
              </p>
              <p className={styles.lead}>
                Manje ručnog posla, manje grešaka, sve na jednom mjestu i spremno
                za poreznu upravu.
              </p>
              <OfficeTrialLink className={styles.cta}>
                Isprobaj 30 dana besplatno →
              </OfficeTrialLink>
              <p className={styles.note}>
                Bez kartice i bez obaveze. Besplatna migracija podataka iz
                starog programa.
              </p>
            </div>

            <div className={styles.preview}>
              <div className={styles.previewLabel}>
                8 modula · jedan nalog · za obrte u FBiH
              </div>
              <ul className={styles.moduleList}>
                {MODULES.map((m) => (
                  <li key={m.name} className={styles.moduleItem}>
                    <span className={styles.moduleIcon} aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        width="16"
                        height="16"
                      >
                        {ICONS[m.icon]}
                      </svg>
                    </span>
                    <span className={styles.moduleText}>
                      <span className={styles.moduleName}>{m.name}</span>
                      <span className={styles.moduleDesc}>{m.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.divider} />

          {/* ── Spotlight: najbolje funkcije kroz tabove ── */}
          <SpotlightTabs />

          {/* ── Za koga je PK Office ── */}
          <div className={styles.personaRow}>
            {PERSONAS.map((p) => (
              <div key={p.name} className={styles.personaCard}>
                <span className={styles.personaIcon} aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="17"
                    height="17"
                  >
                    {ICONS[p.icon]}
                  </svg>
                </span>
                <span className={styles.personaName}>{p.name}</span>
                <span className={styles.personaDesc}>{p.desc}</span>
              </div>
            ))}
          </div>

          {/* ── Linkovi na dnu sekcije ── */}
          <div className={styles.linksRow}>
            <Link href="/pk-office" className={styles.moreLink}>
              Pogledaj sve funkcije →
            </Link>
            <Link href="/pretplate#pk-office" className={styles.moreLink}>
              Cjenovnik po broju obrta →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
