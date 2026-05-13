import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Politika privatnosti — Porezni Kalkulator BiH",
  description:
    "Politika privatnosti platforme Porezni Kalkulator BiH — kako prikupljamo, koristimo i štitimo vaše podatke, podatke o klijentima i radnicima.",
  alternates: { canonical: "https://poreznikalkulator.ba/privatnost" },
};

export default function PrivatnostPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Pravni dokumenti</div>
        <h1 className={styles.h1}>
          Politika <em>privatnosti</em>
        </h1>
        <p className={styles.lead}>
          Vaša privatnost nam je važna. Ova politika objašnjava koje podatke prikupljamo, zašto, i
          koje pravo imate nad njima.
        </p>
      </div>

      <div className={styles.body}>
        <p className={styles.updated}>Zadnje ažuriranje: maj 2026.</p>

        <h2>1. Rukovalac podacima</h2>
        <p>
          Rukovalac ličnih podataka u smislu Zakona o zaštiti ličnih podataka BiH („ZZLP") je obrt{" "}
          <strong>Biro Japić</strong>, JIB <strong>4364314150003</strong>, koji upravlja platformom{" "}
          <a href="https://poreznikalkulator.ba">poreznikalkulator.ba</a> (u daljem tekstu
          „Platforma" ili „mi"). Za sva pitanja u vezi sa zaštitom podataka možete nas kontaktirati
          na <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>.
        </p>

        <h2>2. Podaci koje prikupljamo</h2>

        <h3>2.1 Podaci o vašem računu</h3>
        <p>Kada se registrujete na Platformu prikupljamo sljedeće podatke:</p>
        <ul>
          <li>Email adresu (obavezno) — za prijavu i komunikaciju u vezi s nalogom</li>
          <li>Ime i prezime (obavezno)</li>
          <li>Lozinku — koja se čuva u kriptovanom (hashed) obliku, ne u plaintext-u</li>
          <li>
            Datum registracije, datum aktiviranja trial-a i istorija pretplata (Free/Pro/Business)
          </li>
        </ul>

        <h3>2.2 Podaci o profilu i firmi/obrtu</h3>
        <p>
          Korisnici koji koriste Pro i Business funkcionalnosti unose podatke o svojoj djelatnosti
          radi automatskog popunjavanja obrazaca i dokumenata:
        </p>
        <ul>
          <li>Naziv firme/obrta, JIB, šifra djelatnosti, adresa, telefon</li>
          <li>Podaci o transakcijskom računu (za fakture i predračune)</li>
          <li>Podaci o vlasniku (za obrte) — JMB, adresa, kontakt</li>
        </ul>

        <h3>2.3 Podaci o klijentima i radnicima (samo Business pretplata)</h3>
        <p>
          Korisnici sa Business pretplatom mogu unositi podatke o svojim klijentima (fizička i
          pravna lica) i radnicima radi generisanja dokumenata. Ovi podaci uključuju ime, prezime,
          JMB, adresu, broj radne knjižice, pozicije, plate i slično. Više o ovom odnosu možete
          pročitati u sekciji <strong>5. Klijenti i radnici — vaši podaci pod vašom kontrolom</strong>{" "}
          ispod.
        </p>

        <h3>2.4 Posebna zaštita JMB-a i drugih osjetljivih ličnih identifikatora</h3>
        <p>
          <strong>
            JMB (jedinstveni matični broj) i ekvivalentni lični identifikatori tretiraju se kao
            najosjetljiviji podaci na Platformi
          </strong>{" "}
          i zaštićeni su istim mehanizmima kao lozinka:
        </p>
        <ul>
          <li>
            <strong>Šifriranje (enkripcija)</strong> — JMB se čuva u kriptovanom obliku u bazi
            podataka, ne u plaintextu. Ni administratori sistema ne mogu pročitati JMB iz baze.
          </li>
          <li>
            <strong>Strogo ograničen pristup</strong> — JMB vidi isključivo korisnik koji ga je
            unio, prilikom prijavljenog pristupa svom nalogu. Ne prikazujemo JMB u logovima, email
            obavještenjima ni internim alatima.
          </li>
          <li>
            <strong>Korištenje po potrebi</strong> — JMB se dešifruje samo u trenutku kada ga je
            potrebno upisati u generisani dokument (obrazac, ugovor), a zatim odbacuje iz memorije.
          </li>
        </ul>
        <p>
          Ista pravila važe i za JMB klijenata i radnika koje unosite u Business nalogu — vidi ih
          samo vaš nalog, šifrirano se čuvaju i pristupaju samo prilikom generisanja dokumenata.
        </p>

        <h3>2.5 Generisani dokumenti</h3>
        <p>
          Dokumente koje generišete (popunjeni obrasci, ugovori, fakture, šihterice) čuvaju se na
          našim serverima kako biste im mogli pristupiti i ponovo ih preuzeti. Možete ih u bilo
          koje vrijeme izbrisati iz svog naloga.
        </p>

        <h3>2.6 Podaci o korištenju i tehnički podaci</h3>
        <ul>
          <li>
            <strong>Google Analytics</strong> — anonimne metrike posjete (broj posjetitelja,
            stranice, trajanje sesije, izvor posjete). Podaci se agregiraju i ne identifikuju
            korisnika lično.
          </li>
          <li>
            <strong>Tehnički podaci</strong> — IP adresa, tip preglednika i operativni sistem, koje
            automatski bilježe naši serveri radi sigurnosti i dijagnostike. IP adresa se čuva
            ograničeni period.
          </li>
          <li>
            <strong>Pristupni logovi</strong> — vrijeme i tip akcija u nalogu (login, generisanje
            dokumenata) radi sigurnosti i otklanjanja problema.
          </li>
        </ul>

        <h2>3. Pravna osnova obrade</h2>
        <p>Vaše podatke obrađujemo na temelju sljedećih osnova:</p>
        <ul>
          <li>
            <strong>Izvršenje ugovora</strong> — obrada podataka o nalogu, profilu i generisanim
            dokumentima neophodna je za pružanje usluge koju ste zatražili registracijom i
            pretplatom
          </li>
          <li>
            <strong>Zakonska obaveza</strong> — čuvanje podataka o uplatama, predračunima i fakturama
            u skladu s poreznim i računovodstvenim propisima
          </li>
          <li>
            <strong>Legitimni interes</strong> — sigurnost Platforme, sprečavanje zloupotrebe,
            analitika korištenja, komunikacija o važnim izmjenama
          </li>
          <li>
            <strong>Privola</strong> — Google Analytics i marketinška komunikacija (ako je
            primjenjivo). Privolu možete u bilo koje vrijeme povući.
          </li>
        </ul>

        <h2>4. Kolačići (Cookies)</h2>
        <p>Platforma koristi sljedeće kolačiće:</p>
        <ul>
          <li>
            <strong>Esencijalni kolačići</strong> — neophodni za rad Platforme (autentikacija /
            login session, sigurnosni tokeni). Ne mogu se isključiti.
          </li>
          <li>
            <strong>Funkcionalni kolačići</strong> — pamćenje vaših postavki (npr. odabrana
            organizacija/klijent).
          </li>
          <li>
            <strong>Analitički kolačići</strong> — Google Analytics kolačići koji nam pomažu razumjeti
            kako korisnici koriste Platformu. Podaci su anonimni i agregirani.
          </li>
        </ul>
        <p>
          Možete upravljati kolačićima putem postavki vašeg preglednika. Onemogućavanje esencijalnih
          kolačića onemogućava korištenje Platforme (login).
        </p>

        <h2>5. Klijenti i radnici — vaši podaci pod vašom kontrolom</h2>
        <p>
          Kada Business pretplatnik unosi podatke o svojim klijentima i radnicima u Platformu,
          uloge se dijele kako slijedi:
        </p>
        <ul>
          <li>
            <strong>Korisnik (vi)</strong> ste <strong>rukovalac</strong> (controller) ličnih
            podataka vaših klijenata i radnika. Vi imate pravnu osnovu za njihovu obradu (ugovor,
            poslovni odnos, zakonska obaveza) i odgovorni ste za informisanje subjekata podataka.
          </li>
          <li>
            <strong>Mi (Davalac usluge)</strong> smo <strong>obrađivač</strong> (processor) — te
            podatke obrađujemo isključivo po vašem nalogu, u svrhu pružanja usluge (generisanje
            ugovora, faktura, evidencija). Ne koristimo ih za vlastite svrhe, ne prodajemo ih i ne
            dijelimo s trećim stranama (osim u slučajevima iz tačke 7).
          </li>
        </ul>
        <p>
          Brisanjem klijenta ili radnika iz vašeg naloga, mi te podatke trajno brišemo sa svojih
          servera u razumnom roku (osim ako zakon nalaže duže čuvanje, npr. radi računovodstvenih
          propisa za već generisane fakture).
        </p>

        <h2>6. Naplata i fakturisanje</h2>
        <p>
          Pretplate se naplaćuju žiralno na osnovu predračuna. Za potrebe izdavanja predračuna i
          računa obrađujemo podatke o vašoj firmi/obrtu (naziv, JIB, adresa) i uplatama. Te podatke
          čuvamo u skladu sa zakonom o porezima i računovodstvu BiH (uobičajeno najmanje 11 godina
          za računovodstvenu dokumentaciju).
        </p>

        <h2>7. Dijeljenje podataka s trećim stranama</h2>
        <p>
          <strong>Ne prodajemo i ne iznajmljujemo vaše lične podatke.</strong> Podatke možemo
          dijeliti isključivo:
        </p>
        <ul>
          <li>
            <strong>Pružaocima hosting i infrastrukturnih usluga</strong> — radi tehničkog
            funkcionisanja Platforme (cloud hosting, baza podataka, sigurnosne kopije)
          </li>
          <li>
            <strong>Pružaocima usluga slanja emaila</strong> — za transakcijske emailove
            (verifikacija registracije, reset lozinke, podsjetnik za uplatu pretplate)
          </li>
          <li>
            <strong>Google-om</strong> — kroz Google Analytics, samo anonimni i agregirani podaci o
            posjeti
          </li>
          <li>
            <strong>Nadležnim organima</strong> — kada to zahtijeva zakon, sudski nalog ili drugi
            obavezujući akt nadležnog organa
          </li>
        </ul>
        <p>
          Sa svim pružaocima usluga imamo (ili tražimo) odgovarajuće ugovore o obradi podataka
          ("DPA") koji ih obavezuju da podatke obrađuju samo u skladu s našim nalogom i propisima o
          zaštiti podataka.
        </p>

        <h2>8. Čuvanje podataka</h2>
        <ul>
          <li>
            <strong>Aktivni nalozi</strong> — podaci se čuvaju dokle god je nalog aktivan
          </li>
          <li>
            <strong>Neaktivni nalozi</strong> — ako se ne prijavite na nalog duže od 24 mjeseca,
            možemo vas kontaktirati radi potvrde i nakon toga obrisati nalog ako ne odgovorite
          </li>
          <li>
            <strong>Računovodstvena dokumentacija</strong> (predračuni, fakture) — čuva se u
            zakonskim rokovima (do 11 godina)
          </li>
          <li>
            <strong>Anonimni analitički podaci</strong> — mogu se čuvati neograničeno u agregatnom
            obliku
          </li>
          <li>
            <strong>Pristupni logovi</strong> — uobičajeno 90 dana
          </li>
        </ul>

        <h2>9. Vaša prava</h2>
        <p>U skladu s važećim propisima o zaštiti ličnih podataka, imate pravo na:</p>
        <ul>
          <li>
            <strong>Pristup</strong> — saznati koje vaše podatke obrađujemo
          </li>
          <li>
            <strong>Ispravak</strong> — tražiti ispravak netačnih ili nepotpunih podataka
          </li>
          <li>
            <strong>Brisanje („pravo na zaborav")</strong> — tražiti brisanje vaših podataka, osim
            kada zakon zahtijeva duže čuvanje
          </li>
          <li>
            <strong>Ograničenje obrade</strong> — privremeno zaustaviti obradu pod određenim uvjetima
          </li>
          <li>
            <strong>Prigovor</strong> na obradu zasnovanu na legitimnom interesu
          </li>
          <li>
            <strong>Prenosivost podataka</strong> — primiti svoje podatke u strukturisanom,
            mašinski čitljivom formatu
          </li>
          <li>
            <strong>Povlačenje privole</strong> u bilo kojem trenutku (gdje je obrada zasnovana na
            privoli)
          </li>
          <li>
            <strong>Žalbu</strong> Agenciji za zaštitu ličnih podataka BiH ako smatrate da su vaša
            prava povrijeđena
          </li>
        </ul>
        <p>
          Za ostvarivanje ovih prava kontaktirajte nas na{" "}
          <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>. Na zahtjeve
          odgovaramo u zakonskom roku (najduže 30 dana).
        </p>

        <h2>10. Sigurnost podataka</h2>
        <p>
          Primjenjujemo tehničke i organizacijske mjere zaštite u skladu s industrijskim
          standardima:
        </p>
        <ul>
          <li>HTTPS enkripcija svih komunikacija između preglednika i naših servera</li>
          <li>Hashing lozinki (lozinke se nikada ne čuvaju u plaintext-u)</li>
          <li>Redovne sigurnosne kopije baze podataka</li>
          <li>Ograničen i kontrolisan pristup serveru i bazi podataka</li>
          <li>Praćenje pristupnih logova radi otkrivanja neuobičajenih aktivnosti</li>
        </ul>
        <p>
          Uprkos svim mjerama, nijedan sistem nije apsolutno siguran. Ukoliko otkrijete sigurnosnu
          ranjivost, molimo da nas obavijestite na{" "}
          <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>.
        </p>

        <h2>11. Maloljetnici</h2>
        <p>
          Platforma nije namijenjena maloljetnim licima. Ne prikupljamo svjesno podatke o licima
          mlađim od 18 godina. Ako primijetite da je maloljetnik registrovao nalog, molimo da nas
          obavijestite kako bismo nalog uklonili.
        </p>

        <h2>12. Prenos podataka u inostranstvo</h2>
        <p>
          Neki naši pružaoci usluga (npr. Google Analytics, cloud hosting) mogu pohranjivati ili
          obrađivati podatke izvan BiH. U tim slučajevima koristimo provajdere koji primjenjuju
          adekvatne standarde zaštite (npr. EU mehanizme prenosa, SCC-ove) gdje je to primjenjivo.
        </p>

        <h2>13. Izmjene politike privatnosti</h2>
        <p>
          Zadržavamo pravo izmjene ove Politike privatnosti. O značajnim izmjenama obavijestit ćemo
          registrovane korisnike putem emaila i objavom na ovoj stranici, najmanje 14 dana prije
          stupanja izmjena na snagu. Datum zadnjeg ažuriranja uvijek je naveden na vrhu ove
          stranice.
        </p>

        <h2>14. Kontakt</h2>
        <p>
          Za sva pitanja u vezi sa zaštitom podataka, ostvarivanjem prava ili sumnjom na povredu
          privatnosti, kontaktirajte nas na{" "}
          <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a> ili putem
          stranice <Link href="/kontakt">Kontakt</Link>.
        </p>
      </div>
    </div>
  );
}
