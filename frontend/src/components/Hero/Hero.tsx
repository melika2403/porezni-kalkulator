'use client';

import Link from 'next/link';
import styles from './Hero.module.css';
import { useMe } from 'src/hooks/useMe';

export default function Hero() {
  // Gost vidi registraciju i trial poruku; ulogovan korisnik svoje alate.
  const user = useMe();
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.eyebrow}>Za knjigovođe, obrtnike i d.o.o. u FBiH</div>
        <h1 className={styles.h1}>
          Plate, porezi, fakture,<br />
          <em>riješene za minut.</em>
        </h1>
        <div className={styles.features}>
          {FEATURE_PILLS.map((f) => (
            <span key={f} className={styles.pill}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {f}
            </span>
          ))}
        </div>
        <p className={styles.tagline}>
          Štedi sate svake sedmice. Bez excela, bez gužve.
        </p>
        <div className={styles.actions}>
          <Link
            href={user ? '#funkcije' : '/registracija'}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            {user ? 'Otvori alate' : 'Počni besplatno: 30 dana PRO'}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
          {user ? (
            <Link href="/organizacije" className={`${styles.btn} ${styles.btnOutline}`}>
              Moje organizacije
            </Link>
          ) : (
            <Link href="#funkcije" className={`${styles.btn} ${styles.btnOutline}`}>
              Pogledaj funkcije
            </Link>
          )}
        </div>
        {!user && (
          <p className={styles.note}>
            Bez kartice. Besplatni alati ostaju <strong>besplatni zauvijek</strong>.
          </p>
        )}
      </section>

    </>
  );
}

const FEATURE_PILLS = [
  'Plate i doprinosi',
  'MIP-1023 / GIP-1022',
  'JS3100 prijave',
  'Fakture i predračuni',
  'Ugovor o radu / otkaz',
  'Šihterica',
  'PDV kalkulator',
  'SPR-1053 / GPD-1051',
  'Stalna sredstva (PLDI)',
  'AMS generator',
  'ZO3 obrazac',
  'Ugovor o djelu',
];

