import Link from 'next/link';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.eyebrow}>Napravljeno za BiH poduzetnike</div>
        <h1 className={styles.h1}>
          Porezne obaveze,<br />
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
          Sve na jednom mjestu. Bez excela, bez gužve.
        </p>
        <div className={styles.actions}>
          <Link href="#funkcije" className={`${styles.btn} ${styles.btnPrimary}`}>
            Počni besplatno
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
          <Link href="#kako" className={`${styles.btn} ${styles.btnOutline}`}>
            Kako radi?
          </Link>
        </div>
        <p className={styles.note}>
          Kreirajte profil i svi Vaši obrasci su sačuvani. <strong>Pristupite podacima kad god Vam trebaju.</strong>
        </p>
      </section>

    </>
  );
}

const FEATURE_PILLS = [
  'SPR-1053', 'GPD-1051', 'AMS-1035', 'Neto/bruto plate', 'PDV kalkulator',
  'Stalna sredstva', 'ZO3 obrazac', 'Šihterica', 'Ugovori',
];

