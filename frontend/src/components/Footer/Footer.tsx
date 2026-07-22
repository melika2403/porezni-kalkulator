import Link from 'next/link';
import styles from './Footer.module.css';

// Kolone linkova: alati i obrasci koje korisnici najviše traže + firma.
// Pomaže i internom SEO linkovanju sa svake stranice.
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Alati',
    links: [
      { label: 'PDV kalkulator', href: '/pdv-kalkulator' },
      { label: 'Neto - Bruto plata', href: '/preracun-neto-bruto' },
      { label: 'Obračun plata', href: '/prijave-radnika?tab=obracun' },
      { label: 'Šihterica', href: '/sihterica' },
      { label: 'Fakture i predračuni', href: '/fakture' },
      { label: 'Amortizacija', href: '/amortizacija' },
    ],
  },
  {
    title: 'Obrasci i dokumenti',
    links: [
      { label: 'SPR-1053', href: '/spr' },
      { label: 'GPD-1051', href: '/gpd' },
      { label: 'Prijave radnika (JS3100)', href: '/prijave-radnika' },
      { label: 'Ugovor o radu i otkaz', href: '/ugovor-o-radu' },
      { label: 'Rješenja i odluke', href: '/rjesenja-i-odluke' },
      { label: 'Cesije i kompenzacije', href: '/cesije-i-kompenzacije' },
    ],
  },
  {
    title: 'Porezni Kalkulator',
    links: [
      { label: 'PK Office', href: '/pk-office' },
      { label: 'Pretplatnički paketi', href: '/pretplate' },
      { label: 'Blog', href: '/blog' },
      { label: 'O nama', href: '/o-nama' },
      { label: 'Kontakt', href: '/kontakt' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer} data-marketing-chrome="footer">
      <div className={styles.top}>
        <div className={styles.brand}>
          <div className={styles.logo}>Porezni Kalkulator</div>
          <p className={styles.tagline}>
            Porezni alati, obrasci i knjigovodstvo za poduzetnike u BiH.
          </p>
          <div className={styles.social}>
            <a
              href="https://www.facebook.com/profile.php?id=61569234208200"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="Facebook"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/poreznikalkulator.ba/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/porezni-kalkulator-513429404/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title} className={styles.col}>
            <div className={styles.colTitle}>{col.title}</div>
            <ul className={styles.colList}>
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={styles.bottom}>
        <div className={styles.copy}>© 2026 Porezni Kalkulator. Sva prava zadržana.</div>
        <div className={styles.legal}>
          <Link href="/uvjeti">Uvjeti korištenja</Link>
          <Link href="/privatnost">Privatnost</Link>
        </div>
      </div>
    </footer>
  );
}
