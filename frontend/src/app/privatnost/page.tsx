import type { Metadata } from "next";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Politika privatnosti — Porezni Kalkulator BiH",
  description:
    "Politika privatnosti platforme Porezni Kalkulator BiH. Saznajte kako prikupljamo, koristimo i štitimo vaše podatke.",
  alternates: { canonical: "https://poreznikalkulator.ba/privatnost" },
};

export default function PrivatnostPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Pravni dokumenti</div>
        <h1 className={styles.h1}>Politika <em>privatnosti</em></h1>
        <p className={styles.lead}>
          Vaša privatnost nam je važna. Ova politika objašnjava koje podatke prikupljamo i kako ih koristimo.
        </p>
      </div>

      <div className={styles.body}>
        <p className={styles.updated}>Zadnje ažuriranje: april 2026.</p>

        <h2>1. Rukovalac podacima</h2>
        <p>
          Rukovalac osobnim podacima je Porezni Kalkulator BiH, dostupan na adresi poreznikalkulator.ba.
          Za sva pitanja vezana za privatnost možete nas kontaktirati na:{" "}
          <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>
        </p>

        <h2>2. Podaci koje prikupljamo</h2>
        <p>
          Porezni Kalkulator BiH prikuplja minimalan skup podataka potrebnih za funkcioniranje Platforme:
        </p>
        <ul>
          <li>
            <strong>Podatke koje sami unesete</strong> — npr. iznosi pri kalkulacijama ili podaci u kontakt formi.
            Kalkulacije se obrađuju isključivo u vašem browseru i ne šalju se na naše servere.
          </li>
          <li>
            <strong>Podatke o korištenju</strong> — anonimni podaci o posjeti stranici putem Google Analytics
            (broj posjetitelja, stranice koje se posjećuju, trajanje sesije). Ovi podaci ne identificiraju vas lično.
          </li>
          <li>
            <strong>Tehničke podatke</strong> — IP adresa, tip preglednika i operativni sistem, koje automatski
            bilježe naši serveri radi sigurnosti i dijagnostike.
          </li>
        </ul>

        <h2>3. Kolačići (Cookies)</h2>
        <p>
          Platforma koristi kolačiće za sljedeće svrhe:
        </p>
        <ul>
          <li>
            <strong>Funkcionalni kolačići</strong> — neophodnih za ispravno funkcioniranje stranice (npr. pamćenje
            postavki).
          </li>
          <li>
            <strong>Analitički kolačići</strong> — Google Analytics kolačići koji nam pomažu razumjeti kako
            korisnici koriste Platformu. Podaci su anonimni i agregirani.
          </li>
          <li>
            <strong>Reklamni kolačići</strong> — Google AdSense koristi kolačiće za prikazivanje relevantnih
            oglasa. Google može koristiti te podatke u skladu sa svojom{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              politikom privatnosti
            </a>.
          </li>
        </ul>
        <p>
          Možete upravljati kolačićima putem postavki vašeg preglednika. Onemogućavanje kolačića može
          utjecati na funkcioniranje određenih dijelova Platforme.
        </p>

        <h2>4. Google AdSense i oglašavanje</h2>
        <p>
          Koristimo Google AdSense za prikazivanje oglasa. Google kao treća strana koristi kolačiće (uključujući
          DoubleClick cookie) za prikazivanje oglasa baziranih na prethodnim posjetama korisnika ovoj ili
          drugim web stranicama. Korisnici mogu isključiti personalizirane oglase putem{" "}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
            Google postavki oglasa
          </a>.
        </p>

        <h2>5. Svrha i osnov obrade</h2>
        <p>Vaše podatke obrađujemo na temelju sljedećih osnova:</p>
        <ul>
          <li>Legitimnog interesa — za osiguranje sigurnosti i poboljšanje Platforme</li>
          <li>Privole — za analitičke i reklamne kolačiće</li>
          <li>Ispunjenja ugovora — kada koristite kontakt formu radi komunikacije s nama</li>
        </ul>

        <h2>6. Dijeljenje podataka s trećim stranama</h2>
        <p>
          Ne prodajemo, ne iznajmljujemo niti ne razmjenjujemo vaše osobne podatke s trećim stranama u
          komercijalne svrhe. Podatke možemo dijeliti isključivo:
        </p>
        <ul>
          <li>S Google-om, u okviru Google Analytics i AdSense servisa</li>
          <li>S pružaocima hosting usluga, isključivo za potrebe tehničkog funkcioniranja Platforme</li>
          <li>Kada to zahtijeva zakon ili nadležni organ</li>
        </ul>

        <h2>7. Čuvanje podataka</h2>
        <p>
          Podatke čuvamo samo onoliko dugo koliko je potrebno za ostvarivanje svrhe zbog koje su prikupljeni ili
          koliko zahtijeva zakon. Anonimni analitički podaci mogu se čuvati dulje u agregatnoj formi.
        </p>

        <h2>8. Vaša prava</h2>
        <p>U skladu s važećim propisima o zaštiti osobnih podataka, imate pravo na:</p>
        <ul>
          <li>Pristup vašim osobnim podacima koje obrađujemo</li>
          <li>Ispravak netačnih podataka</li>
          <li>Brisanje podataka ("pravo na zaborav")</li>
          <li>Ograničenje obrade</li>
          <li>Prigovor na obradu</li>
          <li>Prenosivost podataka</li>
        </ul>
        <p>
          Za ostvarivanje ovih prava kontaktirajte nas na:{" "}
          <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>
        </p>

        <h2>9. Sigurnost podataka</h2>
        <p>
          Primjenjujemo tehničke i organizacijske mjere zaštite podataka u skladu s industrijskim standardima,
          uključujući HTTPS enkripciju svih komunikacija između vašeg preglednika i naših servera.
        </p>

        <h2>10. Izmjene politike privatnosti</h2>
        <p>
          Zadržavamo pravo izmjene ove Politike privatnosti u bilo koje vrijeme. O značajnim izmjenama
          obavijestit ćemo korisnika objavom na ovoj stranici s novim datumom ažuriranja.
        </p>
      </div>
    </div>
  );
}
