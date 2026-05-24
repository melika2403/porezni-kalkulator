import Link from "next/link";
import styles from "../blog.module.css";

export default function Gpd1051KorakPoKorak() {
  return (
    <>
      <p className={styles.lead}>
        GPD-1051 je godišnja prijava poreza na dohodak u FBiH, podnosi se{" "}
        <strong>do 31. marta tekuće godine za prethodnu godinu</strong>.
        Predaje je svaki obrtnik koji vodi poslovne knjige (stvarni režim),
        zaposleni koji su imali više izvora dohotka, freelanceri sa
        honorarima, i fizička lica sa prihodima iz inostranstva. U ovom
        vodiču objašnjavamo ko sve mora podnijeti, koje podatke trebate, i
        kako pravilno popuniti obrazac.
      </p>

      <h2>Ko mora podnijeti GPD-1051 za 2025.</h2>
      <p>
        Obavezni su podnijeti:
      </p>
      <ul>
        <li>
          <strong>Obrtnici u stvarnom režimu</strong> oporezivanja (sa
          poslovnim knjigama). Uz GPD-1051 ide i SPR-1053 specifikacija
          dohotka iz samostalne djelatnosti.
        </li>
        <li>
          <strong>Zaposleni sa više poslodavaca</strong> ili više vrsta
          dohotka kroz godinu
        </li>
        <li>
          <strong>Honorarci (ugovori o djelu)</strong> sa značajnim godišnjim
          honorarima
        </li>
        <li>
          <strong>Fizička lica sa prihodima iz inostranstva</strong>
          (freelanceri za strane klijente, kamate na štednju u inostranstvu,
          dividende iz inostranstva)
        </li>
        <li>
          <strong>Vlasnici nekretnina</strong> koji ostvaruju dohodak od
          zakupa
        </li>
        <li>
          <strong>Sportisti, umjetnici, autori</strong> sa autorskim
          honorarima
        </li>
      </ul>
      <p>
        Ne moraju podnijeti zaposleni koji su cijelu godinu radili kod istog
        poslodavca koji je već obračunavao i uplaćivao porez kroz mjesečne
        plate, ako nemaju druge izvore dohotka.
      </p>

      <h2>Rok i način predaje</h2>
      <p>
        Rok je <strong>31. mart tekuće godine za prethodnu godinu</strong>.
        Za 2025. godinu rok je 31. mart 2026. GPD-1051 se trenutno ne
        može predati elektronski, samo u papirnom obliku:
      </p>
      <ul>
        <li>Lično u nadležnoj ispostavi Porezne uprave FBiH</li>
        <li>Poštom (preporučeno sa povratnicom)</li>
      </ul>
      <p>
        Naša online aplikacija za{" "}
        <Link href="/gpd">GPD-1051</Link> generiše obrazac u PDF formatu sa
        svim popunjenim podacima, spreman za štampu i predaju.
      </p>

      <h2>Koje podatke trebate prije popunjavanja</h2>

      <h3>1. Osobni podaci</h3>
      <ul>
        <li>JMBG</li>
        <li>Ime i prezime</li>
        <li>Adresa prebivališta</li>
        <li>Općina/kanton</li>
        <li>Telefon i email</li>
      </ul>

      <h3>2. Podaci o izdržavanim članovima (za uvećan lični odbitak)</h3>
      <ul>
        <li>Supružnik bez prihoda: ime, prezime, JMBG</li>
        <li>Djeca: imena, JMBG, redoslijed (prvo, drugo, treće+)</li>
        <li>Roditelji ili drugi izdržavani: ime, JMBG, dokaz o izdržavanju</li>
      </ul>

      <h3>3. Dohoci po izvorima</h3>
      <ul>
        <li>
          <strong>Iz nesamostalne djelatnosti (plate):</strong> sve potvrde
          o godišnjem dohotku od svih poslodavaca u prethodnoj godini
        </li>
        <li>
          <strong>Iz samostalne djelatnosti (obrt):</strong> SPR-1053
          specifikacija (godišnji prihodi minus rashodi)
        </li>
        <li>
          <strong>Iz druge samostalne djelatnosti:</strong> honorari po
          ugovoru o djelu, autorski, sportisti
        </li>
        <li>
          <strong>Iz imovine i imovinskih prava:</strong> zakup nekretnina,
          autorska prava
        </li>
        <li>
          <strong>Iz inostranstva:</strong> svi prihodi primljeni iz
          inozemstva (AMS-1035 forme ako su već podnesene)
        </li>
      </ul>

      <h3>4. Plaćeni porez tokom godine</h3>
      <ul>
        <li>Porez uplaćen kroz mjesečne plate (sa platnih listića)</li>
        <li>Akontacije uplaćene po SPR-u tokom godine</li>
        <li>
          Akontacija poreza po odbitku iz inostranstva (AMS-1035 obrazac)
        </li>
        <li>Sve druge uplaćene porezne obaveze</li>
      </ul>

      <h2>Popunjavanje obrasca korak po korak</h2>

      <h3>Dio I: Osnovni podaci</h3>
      <p>
        Upišite svoje osobne podatke, JMBG, adresu prebivališta, općinu i
        kanton. U našoj aplikaciji ovi podaci se automatski popunjavaju iz
        profila ako ste registrovani.
      </p>

      <h3>Dio II: Izdržavani članovi i lični odbitak</h3>
      <p>
        Upišite supružnika i djecu sa JMBG. Sistem računa porezni koeficijent
        (taxCoefficient) na osnovu broja izdržavanih članova. Osnovni lični
        odbitak je 300 KM mjesečno (3.600 KM godišnje), uvećan za izdržavane
        članove.
      </p>

      <h3>Dio III: Dohoci po izvorima</h3>
      <p>
        Razdvojiti dohoke po izvoru:
      </p>
      <ul>
        <li>
          Nesamostalna djelatnost: ukupan bruto sa svih plata u godini
        </li>
        <li>Samostalna djelatnost: dohodak iz SPR-1053</li>
        <li>Druga samostalna djelatnost: zbir honorara po UoD</li>
        <li>Imovina: prihodi od zakupa minus priznati rashodi</li>
        <li>Inostranstvo: ukupno iz svih AMS obrazaca</li>
      </ul>

      <h3>Dio IV: Obračun poreza</h3>
      <p>
        Sistem računa:
      </p>
      <ol>
        <li>Ukupan godišnji dohodak (zbir svih izvora)</li>
        <li>Doprinosi koji se odbijaju (iz plata i samostalne djelatnosti)</li>
        <li>Lični odbitak (300 KM × 12 × koeficijent)</li>
        <li>Osnovica za porez</li>
        <li>Porez 10%</li>
        <li>Plaćeni porez tokom godine (akontacije)</li>
        <li>
          Razlika: za uplatu (ako manje plaćeno) ili za povraćaj (ako više
          plaćeno)
        </li>
      </ol>

      <h3>Dio V: Potpis i predaja</h3>
      <p>
        Podnosilac potpisuje obrazac na zadnjoj strani. Ako predajete uz
        SPR-1053 (obrtnici), oba obrasca idu zajedno.
      </p>

      <h2>Primjer: programer obrtnik za 2025.</h2>
      <p>Programer u stvarnom režimu obrta, godišnji podaci:</p>
      <ul>
        <li>Prihod iz obrta: 80.000 KM</li>
        <li>Priznati rashodi: 25.000 KM</li>
        <li>Dohodak iz obrta: 55.000 KM</li>
        <li>Doprinosi vlasnika (osnovica 2.710 × 36% × 12): 11.707,20 KM</li>
        <li>Lični odbitak (samac, 300 × 12): 3.600 KM</li>
        <li>Osnovica za porez: 55.000 − 11.707,20 − 3.600 = 39.692,80 KM</li>
        <li>Porez 10%: 3.969,28 KM</li>
        <li>
          Akontacije uplaćene tokom 2025. (kvartalno): pretpostavimo 3.500 KM
        </li>
        <li>
          <strong>Razlika za uplatu: 469,28 KM</strong> (rok 31.03.2026.)
        </li>
      </ul>

      <h2>Šta nakon predaje</h2>
      <p>
        Porezna uprava prima obrazac, ima rok od 6 mjeseci da provjeri
        ispravnost. Ako su podaci uredni, obrada je tiha (nećete dobiti
        povratnu informaciju). Ako ima nepravilnosti, dobićete poziv na
        ispravak ili kontrolu.
      </p>
      <p>
        Razliku za uplatu (ako je obrazac pokazao da dugujete) plaćate
        odmah, najkasnije do 31. marta. Za povraćaj poreza (ako je obrazac
        pokazao da ste plaćali više), PUFBiH refundira na vaš račun u roku
        od 30 dana.
      </p>

      <h2>Najčešća pitanja</h2>

      <p>
        <strong>Šta ako kasnim sa predajom?</strong>
      </p>
      <p>
        Za prekršaj kasnog podnošenja predviđena je kazna od 200 do 2.000
        KM za fizička lica, plus kamata na neuplaćeni porez. Bolje predati i
        sa zakašnjenjem nego uopće ne predati.
      </p>

      <p>
        <strong>Mogu li ispraviti grešku nakon predaje?</strong>
      </p>
      <p>
        Da, podnosi se "izmijenjeni GPD-1051" sa naznakom da je ispravka i
        sa razlogom. Treba uraditi prije isteka roka zastare (5 godina).
      </p>

      <p>
        <strong>Šta ako sam radio samo dio godine?</strong>
      </p>
      <p>
        I dalje predajete GPD-1051 ako spadate u kategoriju obveznika.
        Dohoci se prijavljuju samo za period kad ste radili. Lični odbitak
        300 KM mjesečno × broj mjeseci aktivnog rada.
      </p>

      <p>
        <strong>Da li mi knjigovođa mora pripremiti GPD-1051?</strong>
      </p>
      <p>
        Knjigovođa nije obavezan, ali za stvarni režim obrta je preporučljiv
        jer ide sa SPR-1053 (specifikacija dohotka iz poslovnih knjiga). Za
        zaposlene i jednostavne slučajeve možete sami popuniti naš online
        obrazac.
      </p>

      <p>
        <strong>Da li je GPD-1051 isti kao SPR-1053?</strong>
      </p>
      <p>
        Ne. SPR-1053 je specifikacija dohotka iz samostalne djelatnosti
        (samo za obrte u stvarnom režimu). GPD-1051 je godišnja prijava
        ukupnog dohotka iz svih izvora. Obrtnik sa stvarnim režimom predaje
        oboje. Zaposleni sa platama predaje samo GPD-1051 (ako spada u
        obvezne).
      </p>

      <p>
        <strong>
          Mogu li dobiti uvećan lični odbitak retroaktivno?
        </strong>
      </p>
      <p>
        Da. Ako poslodavac kroz godinu nije primijenio uvećan koeficijent
        (npr. za novorođeno dijete koje ste imali u martu), u GPD-1051
        prijavljujete tačne podatke i porez se ponovo obračunava. Razlika
        ide za povraćaj.
      </p>

      <p>
        <strong>Šta sa freelancerima koji rade za stranog klijenta?</strong>
      </p>
      <p>
        Ako primate plate iz inostranstva, mjesečno ste trebali podnositi{" "}
        <Link href="/ams">AMS-1035 obrazac</Link> za akontaciju poreza po
        odbitku. Sve te uplate zbirno prijavljujete u GPD-1051 pod "dohodak
        iz inostranstva". Lično iskustvo: PUFBiH posebno kontroliše
        freelancere jer je dio sive ekonomije.
      </p>

      <p>
        <strong>Izvor:</strong> Zakon o porezu na dohodak FBiH (Sl. novine
        FBiH br. 10/08 sa izmjenama), Pravilnik o primjeni Zakona o porezu
        na dohodak FBiH. Rok i obrasci za poreznu godinu 2025. (predaja do
        31.03.2026.).
      </p>
    </>
  );
}
