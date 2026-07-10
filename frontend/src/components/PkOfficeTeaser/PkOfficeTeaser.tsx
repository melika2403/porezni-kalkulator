import styles from "./PkOfficeTeaser.module.css";
import { OfficeTrialLink } from "src/components/OfficeTrialLink/OfficeTrialLink";

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
};

const MODULES = [
  {
    icon: "coins",
    name: "Obračun plata i doprinosa",
    desc: "MIP-1023, 2001, GIP, platni listići i uplatnice",
  },
  {
    icon: "users",
    name: "Zaposlenici i prijave",
    desc: "JS3100, ugovori, evidencija radnika",
  },
  {
    icon: "addressBook",
    name: "Partneri i računi",
    desc: "ulazni i izlazni računi na jednom mjestu",
  },
  {
    icon: "bank",
    name: "Bankovni izvodi",
    desc: "uvoz izvoda i uparivanje sa računima",
  },
  { icon: "book", name: "KPR", desc: "knjiga prihoda i rashoda, automatski" },
  {
    icon: "dashboard",
    name: "Pregled poslovanja",
    desc: "dashboard sa stanjem obrta",
  },
];

// Demo stavke za vizuelni prikaz automatskog knjiženja izvoda.
const TX = [
  { main: "Uplata kupca · 1.170,00", match: "Faktura 2026-014" },
  { main: "Telekom · 89,00", match: "Trošak: komunikacije" },
  { main: "Isplata plate · 1.030,00", match: "Plata, mart 2026" },
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
                6 modula · jedan nalog · za obrte u FBiH
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

          {/* ── Spotlight: automatsko knjiženje izvoda ── */}
          <div className={styles.spotlight}>
            <div className={styles.spotlightText}>
              <span className={styles.tag}>Najbolja funkcija</span>
              <h3 className={styles.h3}>Bankovni izvod se knjiži sam</h3>
              <p className={styles.spotlightLead}>
                Učitaš izvod, a PK Office sam{" "}
                <strong>upari uplate i troškove</strong> sa fakturama i partnerima
                i <strong>proknjiži ih u KPR</strong>. Bez ručnog prepisivanja i
                bez Excela.
              </p>
              <ul className={styles.spotChips}>
                <li className={styles.spotChip}>uplate</li>
                <li className={styles.spotChip}>troškovi</li>
                <li className={styles.spotChip}>plate</li>
              </ul>
            </div>

            <div className={styles.mockup}>
              <div className={styles.previewHead}>
                <span className={styles.previewTitle}>Bankovni izvod</span>
              </div>
              <ul className={styles.txList}>
                {TX.map((t) => (
                  <li key={t.main} className={styles.txRow}>
                    <span className={styles.txDesc}>
                      <span className={styles.txMain}>{t.main}</span>
                      <span className={styles.txMatch}>→ {t.match}</span>
                    </span>
                    <span className={styles.txBadge}>knjiženo</span>
                  </li>
                ))}
              </ul>
              <div className={styles.previewFoot}>
                Automatski upareno i proknjiženo u KPR
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
