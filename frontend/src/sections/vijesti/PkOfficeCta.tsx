// Poziv na PK Office u sekciji Vijesti, u dvije veličine:
//  - "uska": kartica u bočnoj traci članka, kratko ali jasno šta je proizvod,
//  - "siroka": traka na dnu naslovne, sa svih osam modula.
import Link from "next/link";
import styles from "./vijesti.module.css";

export const PK_MODULI: { naziv: string; opis: string }[] = [
  { naziv: "Bankovni izvodi i KPR", opis: "izvod se knjiži sam, knjige ažurne" },
  { naziv: "Fakture i partneri", opis: "KIF, kartice kupaca, IOS, opomene" },
  { naziv: "PDV evidencije", opis: "KUF/KIF, PDV prijava, D-PDV" },
  { naziv: "Roba i maloprodaja", opis: "kalkulacije, lager lista, popis" },
  { naziv: "Plate i radnici", opis: "MIP-1023, 2001/2002, šihterica, JS3100" },
  { naziv: "Blagajna i putni nalozi", opis: "blagajnički dnevnik, dnevnice" },
  { naziv: "Godišnje obaveze", opis: "SPR, GPD, amortizacija, zaključak godine" },
  { naziv: "Pregled poslovanja", opis: "dashboard, rokovi, notifikacije" },
];

/** Kvačica u krugu, isti znak kao na stranici Saznaj više. */
function Kvacica() {
  return (
    <svg
      className={styles.ctaKvacica}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

export default function PkOfficeCta({
  varijanta = "uska",
}: {
  varijanta?: "uska" | "siroka";
}) {
  if (varijanta === "uska") {
    return (
      <div className={styles.sideCta}>
        <span className={styles.ctaOznaka}>PK Office</span>
        <h2 className={styles.sideCtaNaslov}>
          Kompletno knjigovodstvo obrta
        </h2>
        <p className={styles.sideCtaTekst}>
          Nije samo kalkulator: cijeli obrt se vodi na jednom nalogu. Bankovni
          izvod se knjiži sam i puni KPR, fakture i partneri, PDV evidencije i
          prijava, plate i radnici, roba i lager, blagajna, pa do godišnjih
          obrazaca i zaključka godine.
        </p>
        <ul className={styles.ctaLista}>
          <li>Knjige uvijek ažurne, bez prepisivanja</li>
          <li>Sve evidencije spremne za poreznu upravu</li>
          <li>Za obrtnika koji vodi sebe i za agenciju sa više obrta</li>
        </ul>
        <Link href="/pk-office" className={styles.sideCtaBtn}>
          Saznaj više &rarr;
        </Link>
        <p className={styles.ctaSitno}>Proba 30 dana, bez kartice.</p>
      </div>
    );
  }

  return (
    <section className={`${styles.sideCta} ${styles.ctaSiroka}`}>
      <div className={styles.ctaZaglavlje}>
        <div>
          <span className={styles.ctaOznaka}>PK Office</span>
          <h2 className={styles.ctaNaslovVeliki}>
            Kompletno knjigovodstvo obrta na jednom mjestu
          </h2>
          <p className={styles.sideCtaTekst} style={{ maxWidth: "62ch" }}>
            Osam modula koji pokrivaju cijelu godinu obrta, od bankovnog izvoda
            do godišnje prijave. Knjige se pune iz stvarnih dokumenata, pa
            evidencije uvijek stoje onako kako ih porezna uprava traži.
          </p>
        </div>
        <div className={styles.ctaAkcije}>
          <Link href="/pk-office" className={styles.sideCtaBtn}>
            Saznaj više &rarr;
          </Link>
          <span className={styles.ctaSitno}>Proba 30 dana, bez kartice.</span>
        </div>
      </div>

      <div className={styles.ctaModuli}>
        {PK_MODULI.map((m) => (
          <div key={m.naziv} className={styles.ctaModul}>
            <Kvacica />
            <span>
              <span className={styles.ctaModulNaziv}>{m.naziv}</span>, {m.opis}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
