import Link from "next/link";
import styles from "./PkOfficePromo.module.css";

// PK Office promo kartica za sidebar referentnih stranica (šifre djelatnosti,
// šifre zanimanja, javni prihodi): publika su knjigovođe i vlasnici obrta,
// tačno ciljna grupa. Statična (bez animacija, ne smeta Core Web Vitals),
// prati skrol jer je sidebar sticky. Cijela kartica je jedan link.
export default function PkOfficePromo() {
  return (
    <Link href="/pk-office" className={styles.card}>
      <span className={styles.tag}>PK Office</span>
      <p className={styles.title}>Kompletno knjigovodstvo obrta, online</p>
      <ul className={styles.list}>
        {[
          "KUF/KIF, PDV prijava i e-evidencije",
          "Bankovni izvodi, fakture i blagajna",
          "Plate, obrasci i lager, sve na jednom mjestu",
        ].map((t) => (
          <li key={t} className={styles.item}>
            <svg
              className={styles.check}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {t}
          </li>
        ))}
      </ul>
      <span className={styles.cta}>
        Isprobaj 30 dana besplatno
        <svg
          className={styles.ctaStrelica}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </span>
      <span className={styles.note}>Bez kartice, otkažeš kad hoćeš.</span>
    </Link>
  );
}
