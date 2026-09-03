"use client";

import Link from "next/link";
import { trackEvent } from "src/api/activity";
import { useFreelancerPristup } from "src/components/FreelancerTrialCta/FreelancerTrialCta";
import kartica from "src/components/PkOfficePromo/PkOfficePromo.module.css";
import styles from "./PkFreelancerPromo.module.css";

// PK Freelancer reklama na /ams i /gpd: puna lista onoga što paket radi.
// Dvije forme istog sadržaja: kartica pored obrasca (sidebar) i kompaktna traka
// ispod dugmeta za preuzimanje. Izgled dijeli sa PkOfficePromo (isti module
// CSS), da ne nastane treći stil. Vodi na /freelancer.
// Ko paket VEĆ ima ne vidi ništa od ovoga (isto kao probna pozivnica).

const CILJ = "/freelancer";

const STAVKE = [
  "Evidencija svih uplata iz inostranstva, po godinama",
  "AMS-1035 i tri uplatnice iz evidencije u par sekundi",
  "Status svake uplate: obračunato, predano, predano i plaćeno",
  "Podsjetnici na email: rok od 5 dana i GPD do 31. marta",
  "Kurs CBBiH po datumu primitka za USD i GBP",
  "Pregled po mjesecima: bruto, zdravstveno, porez, neto",
  "GPD-1051 popunjen iz evidencije jednim klikom",
  "Potvrda o prihodima za banku, ambasadu ili stan",
  "Arhiva ovjerenih obrazaca i dokaza o uplati",
  "Isplatioci bez ograničenja i unos ranijih uplata",
];

type Props = {
  /** Odakle je klik, za statistiku u aktivnosti. */
  izvor: "ams-sidebar" | "ams-nakon-generisanja" | "gpd";
  /** Kompaktna traka umjesto kartice. */
  kompaktno?: boolean;
};

function Strelica() {
  return (
    <svg
      className={kartica.ctaStrelica}
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
  );
}

export default function PkFreelancerPromo({ izvor, kompaktno = false }: Props) {
  const { hasAccess } = useFreelancerPristup();
  const naKlik = () => trackEvent("FREELANCER_PROMO_KLIK", izvor);

  // korisnik sa paketom ili aktivnom probom ne treba reklamu za isti paket
  if (hasAccess) return null;

  if (kompaktno) {
    return (
      <div className={styles.traka}>
        <p className={styles.trakaTekst}>
          <strong>PK Freelancer</strong>: evidencija svih uplata iz inostranstva,
          AMS i uplatnice iz evidencije u par sekundi, podsjetnici na rok od 5
          dana, GPD-1051 i potvrda o prihodima jednim klikom. 50 KM godišnje,
          prvih 30 dana besplatno.
        </p>
        <Link
          href={CILJ}
          className={`${kartica.cta} ${styles.ctaUsko} ${styles.ctaSljiva}`}
          onClick={naKlik}
        >
          Pogledaj šta sve radi
          <Strelica />
        </Link>
      </div>
    );
  }

  return (
    <Link href={CILJ} className={`${kartica.card} ${styles.kartaSljiva}`} onClick={naKlik}>
      <span className={`${kartica.tag} ${styles.tagSljiva}`}>PK Freelancer</span>
      <p className={kartica.title}>Porezni asistent za honorare iz inostranstva</p>
      <ul className={kartica.list}>
        {STAVKE.map((t) => (
          <li key={t} className={kartica.item}>
            <svg
              className={`${kartica.check} ${styles.checkSljiva}`}
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
      <span className={`${kartica.cta} ${styles.ctaSljiva}`}>
        Pogledaj sve funkcije
        <Strelica />
      </span>
      <span className={kartica.note}>
        50 KM godišnje sa PDV-om, prvih 30 dana besplatno. AMS generator ostaje
        besplatan.
      </span>
    </Link>
  );
}
