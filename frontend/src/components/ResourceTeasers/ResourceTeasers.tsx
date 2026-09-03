import Link from "next/link";
import styles from "./ResourceTeasers.module.css";

// Kompaktna zamjena za dva full-bleed teasera (Šifre djelatnosti i Javni
// prihodi): jedna sekcija, dvije kartice jedna pored druge. Sadržaj i linkovi
// su isti, samo je prikaz sažet da početna ne bude niz naslaganih promo blokova.
export default function ResourceTeasers() {
  return (
    <section className={styles.section} aria-labelledby="resursi-title">
      <div className={styles.container}>
        <div className={styles.label}>Bonus: reference</div>
        <h2 id="resursi-title" className={styles.h2}>
          Šifre i računi, <em>uvijek pri ruci</em>
        </h2>

        <div className={styles.grid}>
          <Link href="/sifre-djelatnosti" className={styles.card}>
            <div className={styles.icon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h3 className={styles.cardTitle}>Šifre djelatnosti FBiH</h3>
            <p className={styles.cardLead}>
              Kompletna lista po KD BiH 2010 (NACE Rev. 2) sa detaljnim opisima:
              šta razred uključuje, a šta izuzima. 21 područje, 88 oblasti, 615
              razreda.
            </p>
            <span className={styles.cardLink}>Otvori listu šifri →</span>
          </Link>

          <Link href="/sifre-zanimanja" className={styles.card}>
            <div className={styles.icon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M19 8v6" />
                <path d="M22 11h-6" />
              </svg>
            </div>
            <h3 className={styles.cardTitle}>Šifre zanimanja FBiH</h3>
            <p className={styles.cardLead}>
              Klasifikacija zanimanja KZBiH-08: 4.193 zanimanja sa
              sedmocifrenim šiframa, spremno za JS3100 prijavu radnika.
              Pretraga po nazivu ili šifri.
            </p>
            <span className={styles.cardLink}>Otvori šifre zanimanja →</span>
          </Link>

          <Link href="/javni-prihodi" className={styles.card}>
            <div className={styles.icon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
                <path d="M6 15h4" />
              </svg>
            </div>
            <h3 className={styles.cardTitle}>Računi javnih prihoda</h3>
            <p className={styles.cardLead}>
              Uplatni računi za poreze, doprinose i takse po kantonima i
              opštinama, sa vrstama prihoda i šiframa opština, spremno za
              uplatnice.
            </p>
            <span className={styles.cardLink}>Otvori račune →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
