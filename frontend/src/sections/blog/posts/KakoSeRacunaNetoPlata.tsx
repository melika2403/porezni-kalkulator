import Link from "next/link";
import styles from "../blog.module.css";
import { BlogCta } from "../BlogCta";

export default function KakoSeRacunaNetoPlata() {
  return (
    <>
      <p className={styles.lead}>
        Obračun plate u Federaciji BiH nije komplikovan kad shvatite
        redoslijed: bruto plata, minus doprinosi radnika, minus porez na
        dohodak. To je neto. U ovom članku objašnjavamo formulu korak po
        korak, pokazujemo primjere za različite iznose i objašnjavamo
        ukupan trošak za poslodavca.
      </p>

      <h2>Formula u jednoj rečenici</h2>
      <p>
        <strong>
          Neto = Bruto − doprinosi iz plate (31%) − porez na dohodak
        </strong>
      </p>
      <p>
        Porez se računa po stopi 10% na osnovicu (bruto minus doprinosi
        minus lični odbitak 300 KM mjesečno za 2026).
      </p>

      <h2>Korak 1: Doprinosi iz plate (31%)</h2>
      <p>
        Iz bruto plate se prvo odbijaju tri doprinosa koje plaća radnik
        (zapravo poslodavac ih obračunava i uplaćuje u korist radnika):
      </p>
      <ul>
        <li>
          <strong>PIO/MIO (penziono):</strong> 17% bruto
        </li>
        <li>
          <strong>Zdravstveno osiguranje:</strong> 12,5% bruto
        </li>
        <li>
          <strong>Osiguranje od nezaposlenosti:</strong> 1,5% bruto
        </li>
        <li>
          <strong>Ukupno:</strong> 31% bruto
        </li>
      </ul>
      <p>
        Za bruto platu 2.000 KM: doprinosi iz = 620 KM.
      </p>

      <h2>Korak 2: Lični odbitak</h2>
      <p>
        Lični odbitak (poznat i kao "neoporezivi dio dohotka") je iznos koji
        se odbija od osnovice za porez. Za 2026. iznosi <strong>300 KM
        mjesečno</strong> (3.600 KM godišnje).
      </p>
      <p>
        Lični odbitak se može uvećati za izdržavane članove porodice:
      </p>
      <ul>
        <li>
          <strong>Supružnik bez prihoda:</strong> +0,5 × osnovni (+150 KM
          mjesečno)
        </li>
        <li>
          <strong>Svako dijete:</strong> +0,5 × osnovni (+150 KM mjesečno) za
          prvo i drugo, +1,0 (+300 KM) za treće i svako naredno
        </li>
        <li>
          <strong>Roditelj ili drugi izdržavani član:</strong> +0,3 × osnovni
          (+90 KM mjesečno)
        </li>
      </ul>
      <p>
        Da bi radnik koristio uvećan lični odbitak, mora priložiti dokaze i
        poslodavac mora upisati taxCoefficient (porezni koeficijent) u
        obračun. U našoj aplikaciji to se postavlja u profilu radnika.
      </p>

      <h2>Korak 3: Osnovica za porez i porez 10%</h2>
      <p>
        Nakon doprinosa i ličnog odbitka, ostatak je osnovica za porez:
      </p>
      <p>
        <strong>
          Osnovica = Bruto − doprinosi iz − lični odbitak (sa
          koeficijentom)
        </strong>
      </p>
      <p>
        Na tu osnovicu se obračunava porez na dohodak po stopi{" "}
        <strong>10%</strong> (jedinstvena stopa u FBiH).
      </p>

      <h2>Korak 4: Neto plata</h2>
      <p>
        Neto je ono što radnik prima na račun:
      </p>
      <p>
        <strong>Neto = Bruto − doprinosi iz − porez</strong>
      </p>

      <h2>Kompletan primjer: bruto plata 2.000 KM</h2>
      <ul>
        <li>Bruto: <strong>2.000,00 KM</strong></li>
        <li>Doprinosi iz 31%: −620,00 KM</li>
        <li>Osnovica nakon doprinosa: 1.380,00 KM</li>
        <li>Lični odbitak (samac): −300,00 KM</li>
        <li>Osnovica za porez: 1.080,00 KM</li>
        <li>Porez na dohodak 10%: −108,00 KM</li>
        <li>
          <strong>Neto: 1.272,00 KM</strong>
        </li>
      </ul>

      <h2>Ukupan trošak poslodavca</h2>
      <p>
        Bruto plata nije ukupan trošak. Na bruto se još dodaju doprinosi i
        naknade koje plaća poslodavac. Stope su izmijenjene 1. jula 2025.
        godine (Sl. novine FBiH br. 33/25) i sada su značajno niže nego
        ranije:
      </p>
      <ul>
        <li>
          <strong>PIO/MIO (na):</strong> 2,5% bruto (ranije 6%)
        </li>
        <li>
          <strong>Zdravstvo (na):</strong> 2% bruto (ranije 4%)
        </li>
        <li>
          <strong>Nezaposlenost (na):</strong> 0,5% bruto
        </li>
        <li>
          <strong>Opća vodna naknada:</strong> 0,5% bruto
        </li>
        <li>
          <strong>Naknada za zaštitu od nesreća:</strong> 0,5% bruto
        </li>
        <li>
          <strong>Fond invalida (samo d.o.o./d.d.):</strong> 0,5% bruto.
          Obrti su izuzeti.
        </li>
      </ul>
      <p>
        Ukupno za obrt: <strong>6% bruto</strong> dodatnih troškova.
        <br />
        Za d.o.o.: <strong>6,5% bruto</strong>.
      </p>

      <h3>Primjer trošak za bruto 2.000 KM (obrt)</h3>
      <ul>
        <li>Bruto: 2.000,00 KM</li>
        <li>Doprinosi na 5%: +100,00 KM</li>
        <li>Vodna naknada 0,5%: +10,00 KM</li>
        <li>Zaštita od nesreća 0,5%: +10,00 KM</li>
        <li>
          <strong>Ukupan trošak: 2.120,00 KM</strong>
        </li>
      </ul>
      <p>
        Drugim riječima, da bi radnik primio 1.272 KM neto u ruci, vas kao
        poslodavca košta 2.120 KM. Razlika 848 KM ide državi (doprinosi +
        porez).
      </p>

      <h2>Tabela: neto, bruto, ukupan trošak (obrt, 2026)</h2>
      <p>Brzi pregled za različite iznose:</p>
      <ul>
        <li>
          <strong>Bruto 1.605,48 / Neto 1.027,00 / Trošak 1.701,81</strong>{" "}
          (minimalna plata FBiH za 2026)
        </li>
        <li>
          <strong>Bruto 2.000 / Neto 1.272 / Trošak 2.120</strong>
        </li>
        <li>
          <strong>Bruto 2.500 / Neto 1.583 / Trošak 2.650</strong>
        </li>
        <li>
          <strong>Bruto 3.000 / Neto 1.893 / Trošak 3.180</strong>
        </li>
        <li>
          <strong>Bruto 4.000 / Neto 2.514 / Trošak 4.240</strong>
        </li>
      </ul>
      <p>
        Za tačan obračun za bilo koji iznos ili sa uvećanim ličnim odbitkom,
        koristite naš{" "}
        <Link href="/preracun-neto-bruto">
          kalkulator neto/bruto plate
        </Link>
        .
      </p>

      <h2>Najčešća pitanja</h2>

      <p>
        <strong>
          Da li se stope doprinosa i poreza mijenjaju?
        </strong>
      </p>
      <p>
        Stope su definisane Zakonom o doprinosima FBiH i Zakonom o porezu
        na dohodak FBiH. Najnovija značajna izmjena bila je{" "}
        <strong>1. jula 2025. godine</strong> kad je Vlada FBiH smanjila
        doprinose na teret poslodavca: PIO/MIO sa 6% na 2,5% i zdravstvo
        sa 4% na 2%. Zbirna stopa svih doprinosa je sa 41,5% pala na 36%.
        Cilj je bilo rasterećenje privrede u kontekstu povećanja minimalne
        plate od 1.1.2025. Doprinosi iz plate (radnički dio, 31%) i porez
        na dohodak (10%) ostali su nepromijenjeni. Lični odbitak (300 KM)
        se može mijenjati češće, prati ga aktuelna odluka.
      </p>

      <p>
        <strong>Šta ako bruto plata ne pokriva minimalnu neto?</strong>
      </p>
      <p>
        Ako za 2026. bruto plata radnika rezultira neto manjim od 1.027 KM,
        ugovor je nezakonit. Poslodavac mora aneksom povećati bruto na
        najmanje ~1.605 KM da neto bude minimum 1.027 KM. Vidi naš članak o{" "}
        <Link href="/blog/minimalna-plata-fbih-2026">minimalnoj plati</Link>.
      </p>

      <p>
        <strong>Kako se računa neto iz bruto i obrnuto?</strong>
      </p>
      <p>
        <strong>Bruto → Neto:</strong> Neto = 0,621 × Bruto + 30
        <br />
        (Formula: 0,69 × bruto − 0,10 × (0,69 × bruto − 300) = 0,621 × bruto
        + 30; vrijedi za samce sa osnovnim ličnim odbitkom).
      </p>
      <p>
        <strong>Neto → Bruto:</strong> Bruto = (Neto − 30) / 0,621
        <br />
        Za neto 1.500 KM: bruto = (1.500 − 30) / 0,621 = 2.367,15 KM.
      </p>

      <p>
        <strong>Šta sa minulim radom?</strong>
      </p>
      <p>
        Minuli rad je dodatak na bruto platu radnika prema dužini radnog
        staža (tipično 0,4–0,6% po godini, ali zavisi od kolektivnog
        ugovora ili ugovora o radu). Dodaje se na bruto prije obračuna
        doprinosa i poreza.
      </p>

      <p>
        <strong>
          Da li se topli obrok i regres oporezuju?
        </strong>
      </p>
      <p>
        Do propisanih neoporezivih iznosa NE. Topli obrok do ~10-12 KM
        dnevno, regres do ~70% prosječne plate godišnje, prevoz po stvarnom
        trošku. Iznad tih iznosa, višak se oporezuje kao redovan dohodak.
      </p>

      <p>
        <strong>Mogu li koristiti kalkulator za d.o.o. i obrt?</strong>
      </p>
      <p>
        Da, isti kalkulator radi za oba. Razlika je samo u dodatnih 0,5%
        fonda invalida za d.o.o. To prikazujemo zasebno u rezultatu.
      </p>

      <p>
        <strong>Izvor:</strong> Zakon o doprinosima FBiH (Sl. novine FBiH
        br. 35/98, sa izmjenama), Zakon o porezu na dohodak FBiH (Sl.
        novine FBiH br. 10/08, sa izmjenama). Stope važeće za 2026. godinu.
      </p>

      <BlogCta
        title="Obračun plata za FBiH u par klikova"
        text="Ne morate ručno kroz formulu: unesite neto ili bruto i naš obračun plata izračuna doprinose, porez, minuli rad i topli obrok, pa odmah preuzmete platne liste i uplatnice."
        href="/prijave-radnika?tab=obracun"
        button="Otvori obračun plata"
      />
    </>
  );
}
