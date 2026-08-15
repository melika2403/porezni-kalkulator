import Link from "next/link";
import styles from "src/sections/prijave-radnika/prijaveRadnikaEdu.module.css";
import FaqSection from "src/components/FaqSection/FaqSection";
import { PK1001_FAQ } from "./pk1001Faq";

// Server-rendered edukativni sadržaj (SEO) za /porezna-kartica.
export default function PoreznaKarticaEdu() {
  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h2>
          Šta je <em>porezna kartica</em> i čemu služi
        </h2>
        <p>
          <strong>Porezna kartica</strong> je dokument koji Porezna uprava
          Federacije BiH izdaje fizičkom licu, a u kojem je upisan{" "}
          <strong>koeficijent ličnog odbitka</strong>. Po tom koeficijentu
          poslodavac svaki mjesec umanjuje osnovicu za obračun poreza na
          dohodak, pa radnik sa karticom plaća manje poreza i ima veću neto
          platu.
        </p>
        <p>
          Kartica se ne dobija sama od sebe. Radnik prvo podnosi{" "}
          <strong>zahtjev na obrascu PK-1001</strong>, a Porezna uprava mu na
          osnovu tog zahtjeva izdaje karticu na{" "}
          <strong>obrascu PK-1002</strong>. Poslodavac karticu čuva dok traje
          radni odnos i po njoj obračunava lični odbitak.
        </p>
        <p>
          Ako radnik nema poreznu karticu, koeficijent je nula, nema ličnog
          odbitka i porez se obračunava na cijelu osnovicu. To je najskuplja
          greška koja se u praksi dešava novim radnicima.
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          Koeficijenti <em>ličnog odbitka</em>
        </h2>
        <p>
          Osnovni mjesečni lični odbitak je <strong>300 KM</strong> i njemu
          odgovara koeficijent 1,0. Svaki izdržavani član uvećava koeficijent:
        </p>
        <ul>
          <li>
            <strong>Izdržavani bračni drug:</strong> 150 KM, koeficijent 0,5
          </li>
          <li>
            <strong>Prvo dijete:</strong> 150 KM, koeficijent 0,5
          </li>
          <li>
            <strong>Drugo dijete:</strong> 210 KM, koeficijent 0,7
          </li>
          <li>
            <strong>Treće i svako dalje dijete:</strong> 270 KM, koeficijent 0,9
          </li>
          <li>
            <strong>Ostali izdržavani članovi uže porodice:</strong> 90 KM,
            koeficijent 0,3
          </li>
          <li>
            <strong>Vlastita invalidnost i invalidnost izdržavanog člana:</strong>{" "}
            90 KM, koeficijent 0,3
          </li>
        </ul>
        <p>
          Ukupan koeficijent je zbir osnovnog (1,0) i svih pojedinačnih
          koeficijenata. Mjesečni lični odbitak se dobije množenjem ukupnog
          koeficijenta sa 300 KM. Primjer: radnik sa suprugom bez prihoda i
          dvoje djece ima koeficijent 1,0 + 0,5 + 0,5 + 0,7 = 2,7, odnosno 810
          KM mjesečnog ličnog odbitka.
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          Pravila koja se <em>najčešće previde</em>
        </h2>
        <ul>
          <li>
            <strong>Prag od 300 KM:</strong> ko ima vlastiti mjesečni prihod
            veći od 300 KM (penzija, invalidnina, alimentacija ili druga lična
            primanja) nije izdržavani član i ne unosi se u zahtjev. To vrijedi i
            za bračnog druga i za djecu.
          </li>
          <li>
            <strong>Redoslijed djece:</strong> djeca se upisuju od najstarijeg
            prema najmlađem, jer redoslijed određuje koeficijent (0,5 pa 0,7 pa
            0,9).
          </li>
          <li>
            <strong>Udio u izdržavanju:</strong> ako dijete izdržavaju oba
            roditelja, koeficijent se dijeli po procentu. Kod omjera 50 prema 50
            prvo dijete nosi koeficijent 0,25.
          </li>
          <li>
            <strong>Ne vrijedi unazad:</strong> lični odbitak se primjenjuje od
            datuma izdavanja kartice, pa zahtjev treba predati odmah pri
            zaposlenju, a ne na kraju godine.
          </li>
          <li>
            <strong>Alimentacija:</strong> lice kojem se plaća alimentacija
            upisuje se u poseban dio zahtjeva, sa koeficijentom 0,5 za bivšeg
            supružnika i prvo dijete, 0,7 za drugo i 0,9 za treće.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>
          Kako se popunjava <em>PK-1001</em> u aplikaciji
        </h2>
        <p>
          Odaberete radnika u listi lijevo i podaci o obvezniku se popune iz
          njegovog kartona (ime, JMB, adresa, telefon), a podaci o poslodavcu iz
          profila firme (JIB i naziv). Datum rođenja se izvodi iz JMB-a.
        </p>
        <p>
          Zatim unosite izdržavane članove po dijelovima obrasca, a aplikacija
          sama dodjeljuje koeficijente po redoslijedu i udjelu, upozorava ako
          neko prelazi prag od 300 KM i računa ukupan koeficijent za Dio 8.
          Uneseni podaci se čuvaju na radniku, pa se kod sljedeće izmjene
          (novo dijete, supružnik se zaposlio) ne kucaju ponovo.
        </p>
        <p>
          Na kraju preuzimate popunjen PDF spreman za predaju Poreznoj upravi, a
          jednim klikom možete upisati izračunati koeficijent u karton radnika,
          da ga <Link href="/prijave-radnika?tab=obracun">obračun plate</Link>{" "}
          odmah koristi.
        </p>
      </section>

      <FaqSection items={PK1001_FAQ} title="Česta pitanja o poreznoj kartici" />

      <section className={styles.section}>
        <h2>
          Povezano sa <em>ostalim obavezama</em>
        </h2>
        <p>
          Porezna kartica je dio istog posla kao i{" "}
          <Link href="/prijave-radnika">JS3100 prijava radnika</Link>,{" "}
          <Link href="/ugovor-o-radu">ugovor o radu</Link> i{" "}
          <Link href="/prijave-radnika?tab=obracun">mjesečni obračun plate</Link>
          . Kod zaposlenja novog radnika redoslijed je: ugovor o radu, JS3100
          prijava, pa zahtjev za poreznu karticu.
        </p>
      </section>
    </div>
  );
}
