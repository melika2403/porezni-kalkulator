import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <div className={styles.logo}>Porezni Kalkulator</div>
          <p className={styles.tagline}>Besplatni porezni alati za poduzetnike u BiH.</p>
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

        <div className={styles.links}>
          <Link href="/o-nama">O nama</Link>
          <Link href="/uvjeti">Uvjeti korištenja</Link>
          <Link href="/privatnost">Privatnost</Link>
          <Link href="/kontakt">Kontakt</Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.copy}>© 2026 Porezni Kalkulator. Sva prava zadržana.</div>
      </div>
    </footer>
  );
}
