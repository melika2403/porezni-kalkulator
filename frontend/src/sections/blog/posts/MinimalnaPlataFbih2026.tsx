import Link from "next/link";
import styles from "../blog.module.css";

export default function MinimalnaPlataFbih2026() {
  return (
    <>
      <p className={styles.lead}>
        Od 2026. godine minimalna neto plata u Federaciji BiH iznosi{" "}
        <strong>1.027,00 KM</strong>. To je značajno povećanje u odnosu na
        prethodnu godinu i direktno utiče i na radnika (više u ruci) i na
        poslodavca (veći ukupan trošak). U ovom članku objašnjavamo šta
        tačno radnik dobija, šta sve plaća poslodavac, i kako da pravilno
        ažurirate postojeće ugovore.
      </p>

      <h2>Šta je minimalna plata i kako se utvrđuje</h2>
      <p>
        Minimalna plata u FBiH je najniži zakonom dozvoljen iznos neto plate
        koji poslodavac smije isplatiti radniku za puno radno vrijeme (40
        sati sedmično). Utvrđuje je Vlada FBiH posebnom odlukom, obično
        krajem decembra za narednu godinu, i objavljuje u Sl. novinama FBiH.
      </p>
      <p>
        Za 2026. godinu minimalna neto plata je{" "}
        <strong>1.027,00 KM mjesečno</strong>. To se odnosi na sve radnike
        koji rade puno radno vrijeme, bez obzira na djelatnost ili veličinu
        firme.
      </p>

      <h2>Bruto plata koja odgovara minimalnoj neto</h2>
      <p>
        Da bi radnik primio 1.027,00 KM neto u ruci, poslodavac mora obračunati
        bruto platu od približno <strong>1.605,48 KM</strong>. Razlika između
        bruto i neto su doprinosi iz plate (31%) i porez na dohodak (10% nakon
        ličnog odbitka 300 KM).
      </p>
      <p>Detaljan obračun za bruto 1.605,48 KM:</p>
      <ul>
        <li>Doprinosi iz plate (31% bruto): <strong>497,70 KM</strong></li>
        <li>
          U tome: PIO/MIO 17% (272,93), Zdravstvo 12,5% (200,69),
          Nezaposlenost 1,5% (24,08)
        </li>
        <li>Osnovica nakon doprinosa: 1.107,78 KM</li>
        <li>Lični odbitak (osnovni): 300,00 KM</li>
        <li>Osnovica za porez: 807,78 KM</li>
        <li>Porez na dohodak 10%: <strong>80,78 KM</strong></li>
        <li>
          <strong>Neto plata radnika: 1.027,00 KM</strong>
        </li>
      </ul>

      <h2>Šta poslodavac plaća povrh bruto plate</h2>
      <p>
        Bruto plata nije ukupan trošak poslodavca. Na bruto se dodaju
        doprinosi koje plaća poslodavac (5%) plus dvije naknade po 0,5%.
        Napomena: stope doprinosa na teret poslodavca su smanjene 1. jula
        2025. (sa 10,5% na 5%) prema Zakonu o izmjenama Zakona o
        doprinosima FBiH (Sl. novine FBiH br. 33/25):
      </p>
      <ul>
        <li>Doprinosi na plate (5% bruto): <strong>80,27 KM</strong></li>
        <li>
          U tome: PIO/MIO 2,5% (40,14), Zdravstvo 2% (32,11), Nezaposlenost
          0,5% (8,03)
        </li>
        <li>Opća vodna naknada (0,5% bruto): <strong>8,03 KM</strong></li>
        <li>
          Naknada za zaštitu od prirodnih i drugih nesreća (0,5% bruto):{" "}
          <strong>8,03 KM</strong>
        </li>
        <li>
          Za privredna društva (d.o.o., d.d.) dodatno: fond invalida 0,5% =
          8,03 KM. Obrti su izuzeti.
        </li>
      </ul>

      <h3>Ukupan trošak poslodavca za radnika na minimalnoj plati</h3>
      <ul>
        <li>Obrt (bez fonda invalida): <strong>1.701,81 KM mjesečno</strong></li>
        <li>
          D.o.o. / d.d. (sa fondom invalida): <strong>1.709,84 KM mjesečno</strong>
        </li>
        <li>
          <strong>Godišnje:</strong> obrt 20.421,72 KM, d.o.o. 20.518,08 KM
        </li>
      </ul>

      <h2>Šta sve može da uđe u "minimalnu platu"</h2>
      <p>
        Bitno za poslodavce: minimalna plata se odnosi samo na osnovnu neto
        platu za redovan rad. Sljedeća primanja idu zasebno i ne mogu se
        uračunavati u minimalnu:
      </p>
      <ul>
        <li>
          <strong>Topli obrok</strong>: dnevni iznos (do neoporezivog
          maksimuma, ~10-12 KM dnevno)
        </li>
        <li>
          <strong>Putni trošak (prevoz)</strong>: refundacija po cijeni karte
          ili kilometraži
        </li>
        <li>
          <strong>Regres za godišnji odmor</strong>: jednom godišnje, do
          neoporezivog iznosa (cca 70% prosječne plate FBiH)
        </li>
        <li>
          <strong>Naknada za rad noću, praznikom, prekovremeni rad</strong>:
          povećanje na osnovnu satnicu prema Zakonu o radu FBiH
        </li>
      </ul>
      <p>
        Drugim riječima, ako vam poslodavac kaže "minimalna plata 1.027 KM"
        a unutar tih 1.027 KM uračunava topli obrok, to je{" "}
        <strong>nezakonito</strong>. Topli obrok mora biti odvojeno iskazan
        na platnom listiću.
      </p>

      <h2>Praktični primjer obračuna</h2>
      <p>
        Pretpostavimo radnika na minimalnoj plati koji ima i pravo na topli
        obrok 8 KM/dan × 21 radni dan = 168 KM, plus prevoz 50 KM mjesečno:
      </p>
      <ul>
        <li>Neto plata: 1.027,00 KM</li>
        <li>Topli obrok: 168,00 KM</li>
        <li>Putni trošak: 50,00 KM</li>
        <li>
          <strong>Ukupno radnik dobija na račun: 1.245,00 KM</strong>
        </li>
        <li>Ukupan trošak poslodavca (obrt): 1.701,81 + 168 + 50 = <strong>1.919,81 KM</strong></li>
      </ul>
      <p>
        Za tačan obračun za vašu konkretnu situaciju (sa različitim ličnim
        odbicima za izdržavane članove, koeficijentom minulog rada itd.)
        koristite naš{" "}
        <Link href="/preracun-neto-bruto">
          besplatni kalkulator neto/bruto plate
        </Link>
        .
      </p>

      <h2>Šta sa postojećim ugovorima koji su ispod nove minimalne</h2>
      <p>
        Svi ugovori o radu koji propisuju neto platu nižu od 1.027 KM postaju
        nezakoniti od 1. januara 2026. godine. Poslodavac je dužan:
      </p>
      <ol>
        <li>
          Pripremiti aneks ugovora o radu kojim se neto plata povećava na
          najmanje 1.027 KM
        </li>
        <li>
          Aneks potpisati sa radnikom prije isteka januara 2026.
        </li>
        <li>
          Prvi obračun plate za januar 2026. raditi sa novom osnovicom
        </li>
        <li>
          Ažurirati ugovor i u svom internom registru radnika (u našoj
          aplikaciji to možete u sekciji{" "}
          <Link href="/aktivni-radnici">Aktivni radnici</Link>)
        </li>
      </ol>
      <p>
        Ako poslodavac propusti ovo i nastavi isplaćivati staru iznos,
        izlaže se inspekciji rada i kazni do 5.000 KM po radniku.
      </p>

      <h2>Najčešća pitanja</h2>

      <p>
        <strong>Da li minimalna plata vrijedi i za nepuno radno vrijeme?</strong>
      </p>
      <p>
        Proporcionalno. Radnik koji radi pola radnog vremena (20 sati
        sedmično umjesto 40) ima pravo na pola minimalne plate, dakle
        ~513,50 KM neto za 2026.
      </p>

      <p>
        <strong>Da li ovo važi za vlasnika obrta?</strong>
      </p>
      <p>
        Ne. Vlasnik obrta ne prima "platu" u klasičnom smislu, on plaća
        doprinose na fiksnu osnovicu propisanu Sl. novinama FBiH (vidi naš
        članak <Link href="/blog/obrt-vs-doo-2026">Obrt vs d.o.o.</Link>),
        ne na minimalnu platu. Minimalna se odnosi samo na zaposlene
        radnike u radnom odnosu.
      </p>

      <p>
        <strong>Mogu li dati radniku bruto 1.605 KM kao platu?</strong>
      </p>
      <p>
        Možete, i to je zapravo upravo ono što morate, da bi radnik primio
        neto 1.027 KM. Ne smijete dati bruto manji od ~1.605 KM jer rezultat
        ne bi pokrio minimalnu neto.
      </p>

      <p>
        <strong>Koliko godišnje košta zaposleni na minimalnoj plati?</strong>
      </p>
      <p>
        Za obrt: 1.701,81 × 12 = <strong>20.421,72 KM godišnje</strong> bez
        regresa i toplog obroka. Sa regresom (jednokratno, ~tipično 600-800
        KM) i toplim obrokom (~2.000 KM godišnje), realan godišnji trošak
        je oko 23.000 KM.
      </p>

      <p>
        <strong>Gdje provjeriti aktuelne stope doprinosa i naknada?</strong>
      </p>
      <p>
        Stope su definisane Zakonom o doprinosima FBiH i Zakonom o porezu na
        dohodak FBiH. Aplikacija se automatski ažurira kad Vlada FBiH
        objavi izmjene. Za jednostavnu računicu koristite{" "}
        <Link href="/preracun-neto-bruto">kalkulator plate</Link>, a za
        kompletan mjesečni obračun sa svim radnicima i generisanjem uplatnica{" "}
        <Link href="/prijave-radnika?tab=obracun">obračun plata</Link>.
      </p>

      <p>
        <strong>Izvor:</strong> Zakon o radu FBiH (Sl. novine FBiH br.
        26/16, 89/18), Odluka Vlade FBiH o minimalnoj plati za 2026.
        godinu, Zakon o doprinosima FBiH (čl. 6 i 9), Zakon o porezu na
        dohodak FBiH (čl. 12).
      </p>
    </>
  );
}
