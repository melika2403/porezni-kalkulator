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
        {/* dvije marquee trake alata: suprotni smjerovi, hover pauzira,
            fade rubovi; svaki chip je link na alat */}
        {[ROW1, ROW2].map((row, ri) => (
          <div key={ri} className={styles.marqueeZone}>
            <div
              className={`${styles.track} ${ri === 0 ? styles.trackL : styles.trackR}`}
            >
              {[false, true].map((dup) =>
                row.map((f) => (
                  <Link
                    key={`${f.label}-${dup}`}
                    href={f.href}
                    className={`${styles.chip} ${dup ? styles.dup : ""}`}
                    aria-hidden={dup || undefined}
                    tabIndex={dup ? -1 : undefined}
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 7.5L5.5 11L12 3.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f.label}
                  </Link>
                )),
              )}
            </div>
          </div>
        ))}
        <p className={styles.tagline}>
          Štedi sate svake sedmice. Bez excela, bez gužve.
        </p>
        <div className={styles.actions}>
          <Link
            href={user ? '#funkcije' : '/registracija'}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            {user ? 'Otvori alate' : 'Počni besplatno: 30 dana svega'}
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

const ROW1 = [
  { label: 'Plate i doprinosi', href: '/prijave-radnika?tab=obracun' },
  { label: 'MIP-1023 / GIP-1022', href: '/prijave-radnika?tab=obracun' },
  { label: 'JS3100 prijave', href: '/prijave-radnika' },
  { label: 'Fakture i predračuni', href: '/fakture' },
  { label: 'Ugovor o radu / otkaz', href: '/ugovor-o-radu' },
  { label: 'Šihterica', href: '/sihterica' },
];

const ROW2 = [
  { label: 'PDV kalkulator', href: '/pdv-kalkulator' },
  { label: 'SPR-1053 / GPD-1051', href: '/spr' },
  { label: 'Stalna sredstva (PLDI)', href: '/amortizacija' },
  { label: 'AMS generator', href: '/ams' },
  { label: 'ZO3 obrazac', href: '/zo3' },
  { label: 'Ugovor o djelu', href: '/ugovor-o-djelu' },
];

