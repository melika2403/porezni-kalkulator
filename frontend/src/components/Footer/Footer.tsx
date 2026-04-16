import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.logo}>Porezni Kalkulator</div>
      <div className={styles.links}>
        <Link href="/uvjeti">Uvjeti korištenja</Link>
        <Link href="/privatnost">Privatnost</Link>
        <Link href="/kontakt">Kontakt</Link>
      </div>
      <div className={styles.copy}>© 2026 Porezni Kalkulator. Sva prava zadržana.</div>
    </footer>
  );
}
