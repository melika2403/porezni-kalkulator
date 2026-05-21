import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Uvjeti korištenja — Porezni Kalkulator BiH",
  description:
    "Uvjeti korištenja platforme Porezni Kalkulator BiH — pravila o registraciji, pretplatama, naplati, trial periodu i otkazu računa.",
  alternates: { canonical: "https://poreznikalkulator.ba/uvjeti" },
};

export default function UvjetiPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Pravni dokumenti</div>
        <h1 className={styles.h1}>
          Uvjeti <em>korištenja</em>
        </h1>
        <p className={styles.lead}>
          Molimo vas da pažljivo pročitate ove uvjete prije korištenja platforme.
        </p>
      </div>

      <div className={styles.body}>
        <p className={styles.updated}>Zadnje ažuriranje: maj 2026.</p>

        <h2>1. Strane ugovora</h2>
        <p>
          Davalac usluge je obrt <strong>Biro Japić</strong>, JIB{" "}
          <strong>4364314150003</strong> (u daljem tekstu „Davalac usluge" ili „Porezni Kalkulator
          BiH"), koji upravlja platformom dostupnom na{" "}
          <a href="https://poreznikalkulator.ba">poreznikalkulator.ba</a> (u daljem tekstu
          „Platforma").
        </p>
        <p>
          Korisnik je svako fizičko ili pravno lice koje pristupa ili koristi Platformu, sa ili bez
          registracije računa (u daljem tekstu „Korisnik").
        </p>

        <h2>2. Prihvatanje uvjeta</h2>
        <p>
          Korištenjem Platforme (uključujući kreiranje računa, pokretanje besplatnih kalkulatora ili
          pretplatu na bilo koji plaćeni paket) Korisnik prihvata ove Uvjete korištenja u cijelosti.
          Ukoliko se Korisnik ne slaže s bilo kojim dijelom ovih Uvjeta, obavezan je prestati
          koristiti Platformu.
        </p>

        <h2>3. Opis usluge</h2>
        <p>
          Porezni Kalkulator BiH pruža online alate za porezne kalkulacije, generisanje obrazaca,
          ugovora i evidencija namijenjene korisnicima u Federaciji Bosne i Hercegovine. Usluga se
          pruža po „SaaS" modelu (Software as a Service) putem web pretraživača, bez instalacije.
        </p>
        <p>Platforma uključuje:</p>
        <ul>
          <li>
            <strong>Besplatne alate</strong> — PDV kalkulator, neto/bruto preračun, šifre djelatnosti,
            preview svih dokumenata bez generisanja
          </li>
          <li>
            <strong>Pro pretplatu</strong> — generisanje poreznih obrazaca (SPR, GPD, ZO3, AMS,
            JS3100), ugovora o djelu, faktura, članskih kartica, šihterica i stalnih sredstava
          </li>
          <li>
            <strong>Business pretplatu</strong> — sve iz Pro paketa + vođenje klijenata, ugovor o
            radu i otkaz, evidenciju aktivnih radnika
          </li>
        </ul>

        <h2>4. Registracija računa</h2>
        <p>
          Za pristup pretplatničkim funkcijama Korisnik je obavezan registrovati račun unosom email
          adrese, imena, prezimena i lozinke. Korisnik je dužan:
        </p>
        <ul>
          <li>unijeti tačne i ažurne podatke prilikom registracije i korištenja Platforme</li>
          <li>čuvati lozinku u tajnosti i ne dijeliti pristupne podatke s trećim licima</li>
          <li>
            odmah obavijestiti Davaoca usluge o sumnji na neovlašteno korištenje računa na{" "}
            <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>
          </li>
          <li>
            koristiti račun isključivo za svoje poslovanje ili poslovanje klijenata koje zakonski
            zastupa
          </li>
        </ul>
        <p>
          Davalac usluge ne odgovara za štetu nastalu zbog neovlaštenog korištenja računa do koje je
          došlo zbog propusta Korisnika u čuvanju pristupnih podataka.
        </p>

        <h2>5. Pretplatnički paketi i naplata</h2>
        <p>
          Cijene i obim funkcionalnosti pretplatničkih paketa (Free, Pro, Business) objavljeni su na
          stranici <Link href="/pretplate">Pretplate</Link>. Davalac usluge zadržava pravo izmjene
          cijena uz prethodnu najavu od najmanje 30 dana putem email obavještenja i objave na
          Platformi.
        </p>
        <p>
          Pretplate se naplaćuju <strong>žiralno, na osnovu predračuna</strong> koji Platforma
          automatski generiše prilikom aktivacije pretplate. Korisnik uplaćuje iznos na transakcijski
          račun Davaoca usluge naveden na predračunu. Pretplata se aktivira nakon evidentiranja
          uplate.
        </p>
        <p>
          Period pretplate (mjesečno, godišnje ili po drugom modelu naveden na stranici Pretplate)
          počinje teći od dana aktivacije pretplate nakon evidentiranja uplate. Po isteku perioda,
          pretplata se <strong>ne obnavlja automatski</strong> — Korisnik prima podsjetnik i sam
          odlučuje hoće li produžiti uplatu novog predračuna.
        </p>

        <h2>6. Trial period (30 dana besplatno)</h2>
        <p>
          Novi korisnici imaju pravo na <strong>jednokratno besplatno 30-dnevno korištenje Pro
          paketa</strong> bez obaveze plaćanja. Pravila trial perioda:
        </p>
        <ul>
          <li>Trial se aktivira ručno od strane Korisnika i ne zahtijeva podatke o kartici</li>
          <li>Trial se može iskoristiti jednom po Korisniku (po email adresi)</li>
          <li>
            Nakon isteka 30 dana trial se <strong>automatski gasi</strong> i račun se vraća na Free
            paket — bez automatske naplate i bez aktiviranja Pro pretplate
          </li>
          <li>
            Sve dokumente koje je Korisnik generisao tokom trial perioda zadržava i nakon prelaska
            na Free, ali pristup generisanju novih Pro/Business dokumenata se prekida
          </li>
        </ul>

        <h2>7. Otkaz pretplate i brisanje računa</h2>
        <p>
          Korisnik može u bilo koje vrijeme prestati koristiti plaćenu pretplatu tako što ne uplati
          predračun za sljedeći period. Po isteku tekućeg perioda račun se automatski vraća na Free
          paket. Korisnički podaci ostaju sačuvani u skladu sa{" "}
          <Link href="/privatnost">Politikom privatnosti</Link>.
        </p>
        <p>
          Korisnik može zatražiti brisanje računa slanjem zahtjeva na{" "}
          <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>. Brisanje računa
          uključuje brisanje svih ličnih podataka Korisnika, klijenata i radnika koje je Korisnik
          unosio.
        </p>

        <h2>8. Povrat novca</h2>
        <p>
          <strong>Uplaćene pretplate nisu povrative</strong>, osim u slučajevima koje propisuje
          važeći zakon ili kada je do nemogućnosti pružanja usluge došlo isključivom krivnjom
          Davaoca usluge. Pravilo je opravdano postojanjem 30-dnevnog trial perioda koji svakom
          korisniku omogućava da testira Pro funkcionalnosti bez plaćanja.
        </p>

        <h2>9. Informativni karakter sadržaja</h2>
        <p>
          Sav sadržaj na Platformi — uključujući kalkulacije, obrasce, ugovore, šifre djelatnosti i
          tekstove — pruža se isključivo u informativne svrhe i ne predstavlja pravni, porezni ni
          računovodstveni savjet. Korisnik je odgovoran za provjeru tačnosti generisanih dokumenata
          prije njihove zvanične upotrebe.
        </p>
        <p>
          Davalac usluge ulaže razumne napore da podaci budu tačni i ažurirani u skladu s važećim
          propisima FBiH, ali ne snosi odgovornost za eventualne greške, netačnosti, zastarjele
          informacije ili promjene propisa. Za specifične situacije preporučuje se konsultacija s
          ovlaštenim poreznim savjetnikom ili računovođom.
        </p>

        <h2>10. Korisnikove obaveze i zabranjeno ponašanje</h2>
        <p>Korisnik se obavezuje da neće:</p>
        <ul>
          <li>koristiti Platformu u protupravne svrhe ili na način zabranjen ovim Uvjetima</li>
          <li>pokušavati neovlašteno pristupiti Platformi, njenim serverima ili nalozima drugih korisnika</li>
          <li>distribuirati zlonamjerni softver, slati spam ili ometati rad Platforme</li>
          <li>
            unositi tuđe lične podatke (klijente, radnike) bez odgovarajuće pravne osnove —
            Korisnik je <strong>rukovalac</strong> takvih podataka u smislu propisa o zaštiti
            ličnih podataka
          </li>
          <li>preprodavati, licencirati ili dijeliti pristup svom računu trećim licima</li>
          <li>scrape-ovati, kopirati ili automatizovano preuzimati sadržaj Platforme</li>
        </ul>

        <h2>11. Klijenti i radnici koje Korisnik unosi (B2B)</h2>
        <p>
          Korisnici sa Business pretplatom mogu unositi podatke o svojim klijentima i radnicima
          radi generisanja dokumenata za njih. U tom odnosu:
        </p>
        <ul>
          <li>
            <strong>Korisnik</strong> je rukovalac (controller) ličnih podataka klijenata i radnika
          </li>
          <li>
            <strong>Davalac usluge</strong> je obrađivač (processor) — podatke obrađuje isključivo
            po nalogu Korisnika, radi pružanja usluge
          </li>
          <li>
            Korisnik je obavezan imati zakonsku osnovu za obradu (ugovor, privola, zakonska obaveza)
            i informisati svoje klijente/radnike o korištenju Platforme
          </li>
        </ul>

        <h2>12. Intelektualno vlasništvo</h2>
        <p>
          Sav sadržaj Platforme — tekst, grafika, logotipi, ikone, izvorni kod i softver — vlasništvo
          je Davaoca usluge ili njegovih davalaca licence i zaštićen je primjenjivim zakonima o
          autorskim pravima. Obrasci (SPR, GPD, ZO3, AMS, JS3100) i predlošci ugovora generisani od
          strane Korisnika ostaju u vlasništvu Korisnika.
        </p>
        <p>
          Zabranjeno je reproduciranje, distribucija ili stvaranje izvedenih djela iz softvera
          Platforme bez izričitog pisanog odobrenja.
        </p>

        <h2>13. Dostupnost usluge</h2>
        <p>
          Davalac usluge ulaže razumne napore da Platforma bude dostupna 24/7, ali ne garantuje
          neprekidan rad. Povremeni prekidi su mogući zbog održavanja, nadogradnji ili tehničkih
          problema. Davalac usluge ne snosi odgovornost za štetu nastalu zbog nedostupnosti
          Platforme.
        </p>

        <h2>14. Ograničenje odgovornosti</h2>
        <p>
          U mjeri dozvoljenoj važećim zakonom, ukupna odgovornost Davaoca usluge prema Korisniku po
          osnovu ovih Uvjeta ne može preći iznos koji je Korisnik uplatio Davaocu usluge u 12
          mjeseci prije nastanka štete. Davalac usluge ne odgovara za posrednu, slučajnu, posebnu
          ili posljedičnu štetu, izgubljenu dobit ili gubitak podataka.
        </p>

        <h2>15. Suspenzija ili gašenje računa</h2>
        <p>
          Davalac usluge zadržava pravo da privremeno suspenduje ili trajno ugasi račun Korisnika u
          slučaju kršenja ovih Uvjeta, sumnje na zloupotrebu, ili neplaćanja dospjelih obaveza.
          Davalac usluge će obavijestiti Korisnika o suspenziji u razumnom roku, osim u slučajevima
          kada to nije moguće zbog hitnosti ili zakonske obaveze.
        </p>

        <h2>16. Veze prema trećim stranama</h2>
        <p>
          Platforma može sadržavati veze prema web stranicama trećih strana (npr. službene
          institucije, izvori klasifikacija). Ove veze služe radi praktičnosti i ne podrazumijevaju
          odobravanje ili preuzimanje odgovornosti za sadržaj tih stranica.
        </p>

        <h2>17. Izmjene uvjeta</h2>
        <p>
          Davalac usluge zadržava pravo izmjene ovih Uvjeta. Značajne izmjene biće najavljene putem
          email obavještenja registrovanim korisnicima i objavom na ovoj stranici najmanje 14 dana
          prije stupanja na snagu. Nastavak korištenja Platforme nakon stupanja izmjena na snagu
          smatra se prihvatanjem novih uvjeta.
        </p>

        <h2>18. Mjerodavno pravo i nadležnost</h2>
        <p>
          Na ove Uvjete primjenjuju se zakoni Bosne i Hercegovine, odnosno Federacije BiH. Za sve
          sporove koji proizađu iz ili u vezi s ovim Uvjetima nadležan je stvarno i mjesno nadležan
          sud u FBiH prema sjedištu Davaoca usluge.
        </p>

        <h2>Kontakt</h2>
        <p>
          Za pitanja u vezi s ovim Uvjetima kontaktirajte nas na:{" "}
          <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>
        </p>
      </div>
    </div>
  );
}
