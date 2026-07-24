import Link from "next/link";
import styles from "../blog.module.css";
import { PkOfficeCta } from "../BlogCta";

export default function ObrtVsDoo() {
  return (
    <>
      <p className={styles.lead}>
        Otvaranje vlastite firme u Federaciji BiH često počinje istom dilemom:
        registrovati <strong>obrt</strong> (samostalna djelatnost) ili
        osnovati <strong>društvo s ograničenom odgovornošću (d.o.o.)</strong>?
        Razlika nije samo administrativna, uticaj ima na poreze, ličnu
        odgovornost, troškove, ali i na to kako možete rasti.
      </p>

      <h2>Brzi pregled razlika</h2>
      <p>
        Najjednostavnije rečeno:
      </p>
      <ul>
        <li>
          <strong>Obrt</strong> je samostalna djelatnost fizičkog lica.
          Vlasnik i firma su jedno te isto, nema pravne podjele između
          vašeg ličnog imovinskog stanja i obaveza obrta.
        </li>
        <li>
          <strong>D.o.o.</strong> je pravno lice. Osniva ga jedan ili više
          osnivača; firma ima svoje JIB, svoje obaveze, i odgovara samo
          svojim kapitalom (osim u izuzecima zloupotrebe).
        </li>
      </ul>

      <h2>Registracija: vrijeme i troškovi</h2>
      <p>
        <strong>Obrt</strong> se registruje kod nadležne općine. Procedura
        traje obično 5–15 dana. Početni trošak je relativno nizak, taksa
        općine, izrada pečata, prijava u PIO/MIO i zdravstveno (vlasnik je
        sam svoj uplatilac). U Kantonu Sarajevo ukupan trošak je tipično
        100–300 KM.
      </p>
      <p>
        <strong>D.o.o.</strong> se registruje kod nadležnog suda. Procedura
        traje 2–4 sedmice. Trebate notarsku ovjeru osnivačkog akta, uplatu
        minimalnog osnivačkog kapitala (1.000 KM), izradu pečata, izjavu o
        osnivanju, JIB, registraciju u UINO ako ćete biti PDV obveznik.
        Ukupan trošak: tipično 1.500–3.000 KM uz pomoć knjigovođe.
      </p>

      <h2>Porez i doprinosi: gdje je velika razlika</h2>
      <p>
        Ovo je obično ključni faktor pri odluci.
      </p>

      <h3>Obrt: paušalni ili stvarni režim</h3>
      <ul>
        <li>
          <strong>Paušalni obrt</strong>: plaćate fiksnu mjesečnu osnovicu
          doprinosa (oko 1.142 KM za 2026) i fiksni porez koji ovisi o
          djelatnosti i opštini. Bez vođenja knjiga, bez SPR/GPD obrazaca.
          Idealno za male zanate i usluge sa godišnjim prometom do 50.000 KM.
        </li>
        <li>
          <strong>Stvarni obrt</strong>: vodite poslovne knjige, prijavljujete
          stvarni dohodak. Doprinosi se računaju na osnovicu (utvrđuje PUFBiH
          akontaciono), porez na dohodak 10% na razliku prihoda i rashoda
          minus lični odbitak. Predajete <Link href="/spr">SPR-1053</Link> i{" "}
          <Link href="/gpd">GPD-1051</Link> godišnje.
        </li>
      </ul>

      <h3>D.o.o.: porez na dobit + isplate</h3>
      <p>
        D.o.o. plaća <strong>porez na dobit 10%</strong> na neto dobit. Sve
        što firma isplati vlasniku kao platu prolazi kroz redovan obračun
        plata: bruto, doprinosi iz (31%), porez na dohodak (10%), neto.
        Ostatak dobiti ostaje na firmi i može se reinvestirati ili kasnije
        koristiti.
      </p>
      <p>
        Sa{" "}
        <Link href="/preracun-neto-bruto">kalkulatorom neto/bruto plate</Link>{" "}
        možete vidjeti tačno koliko košta isplata plate vlasniku d.o.o.
      </p>

      <h2>Lična odgovornost</h2>
      <p>
        <strong>Obrt</strong>: vlasnik odgovara cjelokupnom ličnom imovinom
        za obaveze obrta. Ako obrt ode u dugove, povjerioci mogu doći do
        vašeg stana, auta, štednje. To je najveći rizik forme.
      </p>
      <p>
        <strong>D.o.o.</strong>: odgovara samo kapitalom firme. Vlasnik je
        zaštićen, gubitak je ograničen na uloženi kapital. To je glavni
        razlog zašto se ozbiljniji biznisi i investitori uvijek opredjeljuju
        za d.o.o.
      </p>

      <h2>Knjigovodstvo i administracija</h2>
      <p>
        <strong>Paušalni obrt</strong>: najmanje administracije. Knjigovođa
        može koštati 50–80 KM mjesečno (ili može i sam vlasnik voditi).
      </p>
      <p>
        <strong>Stvarni obrt</strong>: redovno knjigovodstvo, SPR i GPD
        obrasci. Knjigovođa 100–200 KM mjesečno.
      </p>
      <p>
        <strong>D.o.o.</strong>: uvijek puno knjigovodstvo, finansijski
        izvještaji, bilans uspjeha, registracija u sudski registar.
        Knjigovođa 200–500 KM mjesečno zavisno od prometa.
      </p>

      <h2>Kada se isplati koja forma</h2>

      <h3>Obrt je dobar izbor ako:</h3>
      <ul>
        <li>
          Radite uslužnu djelatnost (programer, dizajner, frizer, zanatlija)
          gdje ne treba veliki kapital
        </li>
        <li>
          Promet vam je ispod 50.000 KM godišnje (možete biti paušalni
          obveznik PDV-a)
        </li>
        <li>
          Sami radite, bez planova za skoro zapošljavanje većeg tima
        </li>
        <li>
          Ne preuzimate velike rizike (visoke vrijednosti narudžbi, projekti
          gdje neuspjeh može značiti milionske dugove)
        </li>
        <li>
          Želite minimalnu administraciju i brzu registraciju
        </li>
      </ul>

      <h3>D.o.o. je bolji izbor ako:</h3>
      <ul>
        <li>
          Planirate veći obim, više od 100.000 KM godišnjeg prometa
        </li>
        <li>
          Imate ili planirate imati zaposlene
        </li>
        <li>
          Tražite investitore ili partnere (d.o.o. omogućava više vlasnika i
          podjelu udjela)
        </li>
        <li>
          Radite u rizičnijoj djelatnosti (građevina, trgovina velikim
          vrijednostima, IT projekti sa velikim klijentima)
        </li>
        <li>
          Trebate izlazak na strana tržišta (d.o.o. je standardna forma koju
          stranci razumiju i prihvataju)
        </li>
        <li>
          Planirate da kasnije prodate biznis ili pretvorite u d.d.
        </li>
      </ul>

      <h2>Mogu li prijeći iz obrta u d.o.o. kasnije?</h2>
      <p>
        Da. Mnogi preduzetnici počnu kao obrt, pa kad biznis raste i prelazi
        50.000 KM godišnje, osnivaju d.o.o. i prebacuju aktivu. Proces je
        relativno standardan: odjavite obrt, osnujete d.o.o., prenesete
        klijente i opremu. Postoji i opcija da paralelno funkcionišu, ali to
        je rijetko praktično.
      </p>

      <h2>Konkretan primjer obračuna</h2>
      <p>
        Recimo da imate godišnji prihod od 60.000 KM i rashode od 20.000 KM
        (40.000 KM dobiti pre poreza).
      </p>

      <h3>Osnovice doprinosa za vlasnika obrta (2026)</h3>
      <p>
        Vlasnik obrta u FBiH ne plaća doprinose na stvarnu zaradu, plaća na{" "}
        <strong>fiksnu mjesečnu osnovicu</strong> propisanu Sl. novinama
        FBiH br. 100/25, koja zavisi od režima oporezivanja (stvarni dohodak
        ili paušalni) i kategorije djelatnosti. Stopa doprinosa je{" "}
        <strong>36%</strong> (član 9 Zakona o doprinosima FBiH), vlasnik
        pokriva i radnički i poslodavčev dio iz vlastite osnovice.
      </p>

      <h4>A) Stvarni dohodak (poslovne knjige, član 19 ZPD)</h4>
      <ul>
        <li>
          <strong>Slobodna zanimanja</strong> (programer, advokat, ljekar,
          dizajner, konsultant): osnovica <strong>2.710 KM</strong> × 36% ={" "}
          <strong>975,60 KM mjesečno</strong> doprinosa (godišnje 11.707,20 KM)
        </li>
        <li>
          <strong>Obrt i srodne djelatnosti</strong> (zanatlija, ugostitelj,
          servisi): osnovica <strong>1.602 KM</strong> × 36% ={" "}
          <strong>576,72 KM mjesečno</strong> (godišnje 6.920,64 KM)
        </li>
        <li>
          <strong>Poljoprivreda i šumarstvo</strong>: osnovica{" "}
          <strong>715 KM</strong> × 36% = <strong>257,40 KM mjesečno</strong>{" "}
          (godišnje 3.088,80 KM)
        </li>
        <li>
          <strong>Trgovac pojedinac</strong>: osnovica <strong>715 KM</strong>{" "}
          × 36% = <strong>257,40 KM mjesečno</strong> (godišnje 3.088,80 KM)
        </li>
      </ul>

      <h4>B) Paušalni režim (član 31 ZPD)</h4>
      <p>
        <strong>Važno:</strong> slobodna zanimanja{" "}
        <strong>NE MOGU</strong> biti paušalci, moraju ići stvarnim
        dohotkom. Paušalni je dostupan samo za:
      </p>
      <ul>
        <li>
          <strong>Obrt i srodne djelatnosti</strong>: osnovica{" "}
          <strong>1.355 KM</strong> × 36% ={" "}
          <strong>487,80 KM mjesečno</strong> doprinosa (godišnje 5.853,60 KM)
        </li>
        <li>
          <strong>Stari i tradicionalni zanati</strong> (frizer, krojač,
          obućar, pekara): osnovica <strong>616 KM</strong> × 36% ={" "}
          <strong>221,76 KM mjesečno</strong> (godišnje 2.661,12 KM)
        </li>
        <li>
          <strong>Poljoprivreda i šumarstvo</strong>: osnovica{" "}
          <strong>616 KM</strong> × 36% = <strong>221,76 KM mjesečno</strong>{" "}
          (godišnje 2.661,12 KM)
        </li>
        <li>
          <strong>Taksi</strong>: osnovica <strong>616 KM</strong> × 36% ={" "}
          <strong>221,76 KM mjesečno</strong> (godišnje 2.661,12 KM)
        </li>
        <li>
          <strong>Trgovac pojedinac</strong>: osnovica <strong>715 KM</strong>{" "}
          × 36% = <strong>257,40 KM mjesečno</strong> (godišnje 3.088,80 KM)
        </li>
      </ul>

      <p>
        Plus porez na dohodak: kod stvarnog dohotka 10% na razliku (prihodi
        − rashodi − doprinosi − lični odbitak 300 KM/mjesec), kod paušalnog
        fiksni mjesečni iznos koji utvrđuje kantonalno porezno tijelo
        (obično 30–150 KM/mjesec ovisno od djelatnosti i opštine).
      </p>

      <p>
        <strong>Primjer za 40.000 KM dobiti</strong>, slobodno zanimanje
        (programer) na stvarnom dohotku:
      </p>
      <ul>
        <li>Doprinosi (osnovica 2.710 KM × 36% × 12): <strong>11.707,20 KM</strong></li>
        <li>Lični odbitak (300 × 12): −3.600 KM</li>
        <li>Osnovica za porez: 40.000 − 11.707,20 − 3.600 = 24.692,80 KM</li>
        <li>Porez 10%: <strong>2.469,28 KM</strong></li>
        <li>Knjigovođa: ~1.500 KM</li>
        <li>
          <strong>Ostaje vam: ~24.323 KM od 40.000 KM dobiti</strong>
        </li>
      </ul>

      <p>
        Stari i tradicionalni zanatlija (paušalni režim, ista 40.000 KM dobiti) plaća
        samo 2.661 KM doprinosa + ~720 KM paušalni porez = ostaje mu ~36.000
        KM. Razlika između paušalnog zanatlije i slobodnog zanimanja na
        stvarnom režimu je <strong>preko 11.000 KM godišnje</strong>, to je
        glavni razlog zašto se mnogi koji bi mogli da se registruju kao
        zanatlije (a ne kao slobodno zanimanje) tako i čine.
      </p>

      <h3>Isti prihod, ista 40.000 KM dobit: tri scenarija</h3>

      <h4>1) Stari i tradicionalni zanat (paušalni obrt)</h4>
      <p>Pekara, frizer, krojač, obućar, paušalni režim, osnovica 616 KM:</p>
      <ul>
        <li>Doprinosi (616 × 36% × 12): <strong>2.661,12 KM</strong></li>
        <li>Paušalni porez (utvrđuje kanton, ~60 KM × 12): ~720 KM</li>
        <li>Knjigovođa (nije obavezan): ~0–600 KM</li>
        <li>
          <strong>Ostaje vam: ~36.000 KM od 40.000 KM dobiti</strong>
        </li>
      </ul>

      <h4>2) Slobodno zanimanje na stvarnom dohotku (obrt)</h4>
      <p>
        Programer, advokat, knjigovođa: MORAJU stvarnim režimom, osnovica
        2.710 KM (paušalni im nije dozvoljen):
      </p>
      <ul>
        <li>Doprinosi (2.710 × 36% × 12): <strong>11.707,20 KM</strong></li>
        <li>Lični odbitak (300 × 12): −3.600 KM</li>
        <li>Osnovica za porez: 40.000 − 11.707,20 − 3.600 = 24.692,80 KM</li>
        <li>Porez 10%: <strong>2.469,28 KM</strong></li>
        <li>Knjigovođa: ~1.500 KM</li>
        <li>
          <strong>Ostaje vam: ~24.323 KM od 40.000 KM dobiti</strong>
        </li>
      </ul>

      <h4>3) Slobodno zanimanje kao d.o.o. (minimalna plata)</h4>
      <p>
        Isti programer ali kao d.o.o., isplaćuje sebi minimalnu neto platu
        (1.027 KM mjesečno, što je ~1.605 KM bruto). Ostatak dobiti ostaje
        na firmi i plaća porez na dobit:
      </p>
      <ul>
        <li>
          Vlasnik godišnje prima neto platu: 1.027 × 12 ={" "}
          <strong>12.324 KM</strong>
        </li>
        <li>
          Ukupan trošak plate za firmu (bruto plata + svi porezi i doprinosi
          koje plaća firma, sa novim sniženim stopama od 1.7.2025.):
          ~1.710 KM mjesečno, godišnje{" "}
          <strong>~20.518 KM</strong>
        </li>
        <li>Knjigovođa: ~3.500 KM godišnje</li>
        <li>
          Dobit firme nakon plate i knjigovođe: 40.000 − 20.518 − 3.500 ={" "}
          <strong>15.982 KM</strong>
        </li>
        <li>Porez na dobit 10%: 1.598,20 KM</li>
        <li>
          <strong>Ostaje na firmi: ~14.384 KM</strong> (vlasnikova imovina,
          može se reinvestirati ili kasnije podizati)
        </li>
      </ul>
      <p>
        <strong>U vlasnikovoj ruci (gotovina kroz godinu):</strong> 12.324
        KM neto plate.{" "}
        <strong>Plus imovina firme raste za:</strong> 14.384 KM. Ukupna
        vrijednost vlasniku: <strong>~26.708 KM od 40.000 KM dobiti</strong>.
      </p>

      <h3>Šta nam ovi brojevi govore</h3>
      <ul>
        <li>
          <strong>Stari i tradicionalni paušalni obrt je daleko najefikasniji</strong>:
          ostaje 90% dobiti. Ali ovaj režim je dostupan samo za zanatske,
          poljoprivredne i nekoliko drugih kategorija (NE za slobodna
          zanimanja).
        </li>
        <li>
          <strong>Stvarni obrt vam daje više gotovine u ruci, d.o.o. više
          imovine na firmi.</strong> Programer u stvarnom obrtu ima 24.323
          KM gotovine. Programer u d.o.o. ima 12.324 KM gotovine (neto
          plata) + 14.384 KM ostaje na firmi (ukupna vrijednost 26.708 KM).
          Ako vam treba odmah keš za životne troškove, obrt je bolji. Ako
          možete živjeti sa minimalnom platom i graditi vrijednost firme za
          dalje, d.o.o. ima prednost.
        </li>
        <li>
          <strong>Razlika između paušalnog zanatlije i slobodnog zanimanja
          je preko 11.000 KM godišnje</strong> na istih 40.000 KM dobiti,
          to je glavni razlog zašto je važno pravilno klasifikovati
          djelatnost pri registraciji.
        </li>
      </ul>

      <p>
        <strong>Izvor:</strong> Sl. novine FBiH br. 100/25 od 31.12.2025.
        (osnovice), Zakon o doprinosima FBiH čl. 9 (stope 36%), Zakon o
        porezu na dohodak FBiH čl. 19 i 31. Za precizan obračun u vašoj
        situaciji koristite naš{" "}
        <Link href="/preracun-neto-bruto">kalkulator plate</Link> ili
        konsultujte knjigovođu.
      </p>

      <h2>Zaključak: koja forma za koga</h2>
      <p>
        <strong>Stari i tradicionalni zanatlija, poljoprivrednik, taksi,
        mala trgovina:</strong> paušalni obrt je gotovo uvijek najisplativiji,
        ostaje vam 85–90% dobiti, najmanje administracije, knjigovođa nije
        obavezan.
      </p>
      <p>
        <strong>Slobodno zanimanje (programer, knjigovođa, advokat,
        ljekar, dizajner):</strong> ako vam treba odmah gotovina za životne
        troškove i ne planirate veliki rast, stvarni obrt vam ostavlja više
        u ruci. Ako možete živjeti sa minimalnom platom i graditi vrijednost
        firme, ili planirate primati klijente iz inostranstva i zaštititi
        ličnu imovinu, d.o.o. je bolji izbor.
      </p>
      <p>
        <strong>Veći biznisi (više od 100.000 KM prometa, zapošljavanje,
        rizik):</strong> d.o.o. je standard. Veći početni trošak se vraća
        kroz manji rizik za vašu ličnu imovinu i bolju strukturu za
        skaliranje, prodaju biznisa ili pristup investitorima.
      </p>
      <p>
        Za detalje o pojedinačnim obrascima i obračunima koje treba podnositi,
        pogledajte naše alate:{" "}
        <Link href="/spr">SPR-1053</Link>,{" "}
        <Link href="/gpd">GPD-1051</Link>,{" "}
        <Link href="/preracun-neto-bruto">kalkulator plate</Link>,{" "}
        <Link href="/prijave-radnika?tab=obracun">obračun plata</Link>.
      </p>

      <PkOfficeCta text="Ako izaberete obrt, PK Office vam ga vodi od prvog dana: učitate bankovni izvod, a KPR, fakture, plate i godišnji obrasci (SPR, GPD) se popunjavaju sami. Sve obaveze iz ovog članka na jednom mjestu." />
    </>
  );
}
