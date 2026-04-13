import Link from 'next/link';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.eyebrow}>Napravljeno za BiH poduzetnike</div>
        <h1 className={styles.h1}>
          Porezne obaveze,<br />
          <em>riješene za minute.</em>
        </h1>
        <p className={styles.sub}>
          SPR-1053, GPD-1051, obračun plata, PDV, stalna sredstva i ugovori —
          sve na jednom mjestu. Bez excela, bez gužve.
        </p>
        <div className={styles.actions}>
          <Link href="/registracija" className={`${styles.btn} ${styles.btnPrimary}`}>
            Počni besplatno
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
          <Link href="#funkcije" className={`${styles.btn} ${styles.btnOutline}`}>
            Pogledaj funkcije
          </Link>
        </div>
        <p className={styles.note}>
          <strong>SPR i GPD obrazci</strong> — besplatno, bez registracije
        </p>
      </section>

      <div className={styles.strip}>
        {STRIP_ITEMS.map((item) => (
          <div key={item.label} className={styles.stripItem}>
            <div className={`${styles.stripDot} ${styles[item.dotClass]}`} />
            <div className={styles.stripLabel}>
              <strong>{item.tier}</strong>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const STRIP_ITEMS = [
  { tier: 'Besplatno',    label: 'SPR-1053 i GPD-1051',    dotClass: 'dotFree' },
  { tier: 'Besplatno',    label: 'Preračun neto/bruto',     dotClass: 'dotFree' },
  { tier: 'Besplatno',    label: 'PDV kalkulator',          dotClass: 'dotFree' },
  { tier: 'Registracija', label: 'Stalna sredstva',         dotClass: 'dotReg'  },
  { tier: 'Registracija', label: 'Historija podataka',      dotClass: 'dotReg'  },
  { tier: 'Pretplata',    label: 'Ugovori i prijave',       dotClass: 'dotPro'  },
];
