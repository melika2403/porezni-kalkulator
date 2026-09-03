"use client";

import Link from "next/link";
import FaqSection from "src/components/FaqSection/FaqSection";
import { FREELANCER_CIJENA_KM } from "src/api/freelancer";
import { FREELANCER_REGISTER_URL } from "src/components/FreelancerTrialCta/FreelancerTrialCta";
import { FREELANCER_FAQ } from "./faq";
import FreelancerUputstvo from "./FreelancerUputstvo";
import SoloReklama from "./SoloReklama";
import styles from "./freelancer.module.css";

// Landing za goste (SEO): šta paket radi, kako radi, cijena, FAQ (./faq.ts,
// isti tekst ide u JSON-LD na app/freelancer/page.tsx).

const FUNKCIJE: { naslov: string; opis: string }[] = [
  { naslov: "Evidencija svih uplata", opis: "Po godinama, sa isplatiocem, valutom, kursom i statusom: obračunato, predano, predano i plaćeno." },
  { naslov: "AMS-1035 i uplatnice iz evidencije", opis: "Sačuvana uplata se ponovo preuzima kao isti obrazac i tri uplatnice, kad god zatreba." },
  { naslov: "Rok za predaju pod kontrolom", opis: "Rok od 5 dana se računa za svaku uplatu, podsjetnik stiže na email dan prije i na dan roka." },
  { naslov: "Kurs CBBiH po datumu", opis: "USD, GBP i ostale valute se preračunavaju po srednjem kursu Centralne banke na dan primitka, EUR je fiksan." },
  { naslov: "Pregled po mjesecima", opis: "Bruto, zdravstveno, porez i neto po mjesecu i za cijelu godinu, plus najveći isplatioci." },
  { naslov: "GPD-1051 jednim klikom", opis: "Godišnja prijava se otvara popunjena iz evidencije: osnovica sa AMS obrazaca, lični odbitak sa porezne kartice i već plaćeni porez po odbitku." },
  { naslov: "Pregled prihoda za banku", opis: "PDF sa svim uplatama i zbirovima za godinu, za kredit, vizu ili stanodavca." },
  { naslov: "Arhiva ovjerenih obrazaca", opis: "Uz svaku uplatu čuvate sliku ovjerenog AMS-a sa šaltera i dokaz uplate iz banke." },
  { naslov: "Isplatioci bez ograničenja", opis: "Adresar klijenata koji popunjava Dio 2 obrasca jednim klikom." },
  { naslov: "Unos ranijih uplata", opis: "Uplate od početka godine unosite ručno, obračun se računa sam, pa je GPD kompletan." },
];

function Kvacica() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function FreelancerLanding() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.label}>PK Freelancer</p>
        <h1 className={styles.h1}>
          Porezni asistent za <em>honorare iz inostranstva</em>
        </h1>
        <p className={styles.subtitle}>
          Evidencija svake uplate, AMS-1035 i uplatnice u par sekundi, podsjetnik na
          rok od 5 dana, a u martu GPD-1051 popunjen iz evidencije. Za freelancere u
          FBiH koji rade bez obrta.
        </p>
        <div className={styles.heroCtas}>
          <Link href={FREELANCER_REGISTER_URL} className={styles.btnPrimary}>
            Registruj se i probaj 30 dana besplatno
          </Link>
          <Link href="/prijava" className={styles.btnSecondary}>
            Prijavi se
          </Link>
          <Link href="/ams" className={styles.btnGhost}>
            Otvori besplatni AMS generator
          </Link>
        </div>
        <p className={styles.heroNote}>
          {FREELANCER_CIJENA_KM} KM godišnje sa PDV-om. Generator AMS-a ostaje besplatan, a
          uz registraciju do 3 uplate godišnje čuvate bez paketa.
        </p>
      </section>

      {/* kratak pregled; detaljno uputstvo je niže, u sekciji korak po korak */}
      <h2 className={styles.sectionTitle}>
        U tri <em>koraka</em>
      </h2>
      <div className={styles.steps}>
        <div className={styles.step}>
          <div className={styles.stepNo}>1</div>
          <h3>Primili ste uplatu</h3>
          <p>Na AMS generatoru unesete iznos i isplatioca kao i do sada i preuzmete obrazac i uplatnice. Uplata se sama upiše u evidenciju.</p>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNo}>2</div>
          <h3>Evidencija prati rok</h3>
          <p>Uplata dobija rok za predaju, status i mjesto u godišnjem pregledu. Kad platite i predate, označite to jednim klikom.</p>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNo}>3</div>
          <h3>U martu GPD jednim klikom</h3>
          <p>Godišnja prijava se otvara popunjena iz evidencije. Pregled prihoda za banku preuzmete kad zatreba.</p>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>
        Šta je <em>u paketu</em>
      </h2>
      <div className={styles.featuresGrid}>
        {FUNKCIJE.map((f) => (
          <div key={f.naslov} className={styles.feature}>
            <Kvacica />
            <div>
              <strong>{f.naslov}</strong>
              <span>{f.opis}</span>
            </div>
          </div>
        ))}
      </div>

      <FreelancerUputstvo />

      {/* isti raspored kao Solo blok ispod: oznaka i naslov lijevo, cijena
          desno, funkcije u dvije kolone, dugmad na dnu */}
      <section className={styles.priceCard} aria-labelledby="frl-cijena-naslov">
        <div className={styles.priceGlava}>
          <div>
            <div className={styles.priceTag}>PK Freelancer</div>
            <h2 id="frl-cijena-naslov" className={styles.priceNaslov}>
              Honorari iz inostranstva, <em>pod kontrolom cijele godine.</em>
            </h2>
            <p className={styles.priceNote}>
              Prvih 30 dana besplatno, proba se aktivira jednim klikom. Bez mjesečnih
              planova, bez kartice, plaćanje po predračunu. Generator AMS-a ostaje
              besplatan i bez paketa.
            </p>
          </div>
          <div className={styles.priceDesno}>
            <div className={styles.priceBig}>
              {FREELANCER_CIJENA_KM} KM<small>godišnje, sa PDV-om</small>
            </div>
          </div>
        </div>
        <ul className={styles.priceLista}>
          {FUNKCIJE.map((f) => (
            <li key={f.naslov}>
              <Kvacica />
              {f.naslov}
            </li>
          ))}
        </ul>
        <div className={styles.priceDugmad}>
          <Link href={FREELANCER_REGISTER_URL} className={styles.priceCta}>
            Započni besplatnu probu
          </Link>
          <Link href="/ams" className={styles.priceLink}>
            Otvori besplatni AMS generator
          </Link>
        </div>
      </section>

      <SoloReklama />

      <FaqSection items={FREELANCER_FAQ} />
    </main>
  );
}
