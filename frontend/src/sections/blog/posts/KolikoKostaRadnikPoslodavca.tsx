import Link from "next/link";
import styles from "../blog.module.css";
import { BlogCta } from "../BlogCta";

export default function KolikoKostaRadnikPoslodavca() {
  return (
    <>
      <p className={styles.lead}>
        Kad razmišljate o zapošljavanju, plata na oglasu (neto) samo je dio
        priče. Stvarni trošak za poslodavca uključuje doprinose, porez i
        dodatne naknade. U ovom članku računamo koliko vas radnik stvarno
        košta mjesečno i godišnje u FBiH za 2026, sa konkretnim primjerima
        i skrivenim troškovima koje treba uračunati.
      </p>

      <h2>Bruto plata nije ukupan trošak</h2>
      <p>
        Postoje tri nivoa iznosa, i lako ih je pobrkati:
      </p>
      <ul>
        <li>
          <strong>Neto</strong>: ono što radnik prima na račun.
        </li>
        <li>
          <strong>Bruto</strong>: neto uvećan za doprinose iz plate (31%) i
          porez na dohodak (10%). To je iznos u ugovoru o radu.
        </li>
        <li>
          <strong>Ukupan trošak poslodavca</strong>: bruto uvećan za doprinose
          na platu (na teret poslodavca) i dodatne naknade.
        </li>
      </ul>
      <p>
        Drugim riječima: radnik gleda neto, ugovor gleda bruto, a vaš budžet
        gleda ukupan trošak.
      </p>

      <h2>Šta sve ulazi u trošak poslodavca</h2>
      <p>
        Na bruto platu poslodavac dodaje doprinose na platu (na svoj teret).
        Umjesto nabrajanja svake pojedinačne stavke, bitan je samo zbir:
      </p>
      <ul>
        <li>
          <strong>Obrt:</strong> +6% na bruto
        </li>
        <li>
          <strong>d.o.o. / d.d.:</strong> +6,5% na bruto (0,5% više za fond za
          profesionalnu rehabilitaciju, od kojeg su obrti izuzeti)
        </li>
      </ul>
      <p>
        Stope na teret poslodavca su smanjene 1. jula 2025. godine (Sl. novine
        FBiH br. 33/25).
      </p>
      <p>
        Važno: ovih 6% (6,5%) je ono što poslodavac plaća <strong>iznad</strong>{" "}
        bruto plate. To nije isto što i ukupne dažbine u primjeru ispod (oko 42%
        bruto), koje uključuju i doprinose i porez koji se odbijaju{" "}
        <strong>od</strong> bruto plate radnika.
      </p>

      <h2>Primjer: minimalna plata (obrt)</h2>
      <p>
        Uzmimo minimalnu platu, jer je iznos svima poznat. Za 2026. neto
        minimalac je 1.027 KM:
      </p>
      <ul>
        <li>
          <strong>BRUTO PLATA</strong> (u ugovoru): 1.605,48 KM
        </li>
        <li>
          <strong>DOPRINOSI</strong> (svi doprinosi i dodatni troškovi na
          platu, oko 42% bruto): 674,81 KM
        </li>
        <li>
          <strong>NETO PLATA</strong> (radnik na ruke): 1.027,00 KM
        </li>
      </ul>
      <p>
        Ukupan trošak poslodavca = neto + doprinosi ={" "}
        <strong>1.701,81 KM</strong> mjesečno, odnosno oko{" "}
        <strong>20.422 KM godišnje</strong> (bez toplog obroka, prevoza i
        regresa). Kod d.o.o. je trošak za 0,5% bruto veći (fond za
        profesionalnu rehabilitaciju invalida, oko 8 KM), dok su obrti izuzeti.
      </p>

      <h2>Tabela: koliko košta radnik (obrt, FBiH 2026)</h2>
      <p>Brzi pregled za različite nivoe plate:</p>
      <ul>
        <li>
          <strong>
            Neto 1.027 / Bruto 1.605,48 / Mjesečni trošak 1.701,81 / Godišnje
            ~20.422
          </strong>{" "}
          (minimalna plata FBiH za 2026)
        </li>
        <li>
          <strong>Neto 1.272 / Bruto 2.000 / Trošak 2.120 / Godišnje 25.440</strong>
        </li>
        <li>
          <strong>Neto 1.583 / Bruto 2.500 / Trošak 2.650 / Godišnje 31.800</strong>
        </li>
        <li>
          <strong>Neto 1.893 / Bruto 3.000 / Trošak 3.180 / Godišnje 38.160</strong>
        </li>
        <li>
          <strong>Neto 2.514 / Bruto 4.000 / Trošak 4.240 / Godišnje 50.880</strong>
        </li>
      </ul>
      <p>
        Za tačan iznos za bilo koju platu (i sa uvećanim ličnim odbitkom za
        izdržavane članove), koristite naš{" "}
        <Link href="/preracun-neto-bruto">kalkulator neto/bruto plate</Link>,
        koji odmah prikazuje i ukupan trošak za poslodavca.
      </p>

      <h2>Skriveni troškovi koje treba uračunati</h2>
      <p>
        Pored plate, realan trošak radnika obično uključuje i neoporeziva
        primanja koja se isplaćuju uz platu. Ona ne podliježu porezu i
        doprinosima do propisanih iznosa, ali su stvaran novčani izdatak:
      </p>
      <ul>
        <li>
          <strong>Topli obrok:</strong> dnevna naknada za radne dane.
        </li>
        <li>
          <strong>Prevoz:</strong> po stvarnom trošku dolaska na posao.
        </li>
        <li>
          <strong>Regres za godišnji odmor:</strong> godišnja isplata.
        </li>
      </ul>
      <p>
        Tačni neoporezivi iznosi i pravila su u članku o{" "}
        <Link href="/blog/topli-obrok-regres-fbih-2026">
          toplom obroku i regresu
        </Link>
        . Kad ih uračunate, godišnji trošak radnika je osjetno viši od pukih
        12 plata.
      </p>

      <h2>Obrt ili d.o.o.: razlika u trošku</h2>
      <p>
        Trošak radnika je gotovo identičan, jedina razlika je dodatnih 0,5%
        bruto za fond za profesionalnu rehabilitaciju, koji plaćaju d.o.o./d.d.,
        a obrti su izuzeti. Na bruto 2.000 KM to je 10 KM mjesečno više za
        d.o.o. Za širi pregled vidi{" "}
        <Link href="/blog/obrt-vs-doo-2026">obrt ili d.o.o.</Link>.
      </p>

      <h2>Kako optimizovati trošak (zakonito)</h2>
      <ul>
        <li>
          Dio primanja kroz <strong>neoporeziva primanja</strong> (topli obrok,
          prevoz, regres) do propisanih iznosa, umjesto da sve ide kroz bruto.
        </li>
        <li>
          Tačan <strong>lični odbitak</strong>: ako radnik ima izdržavane
          članove, veći odbitak znači manji porez, dakle manji bruto za isti
          neto. Postavlja se kroz porezni koeficijent u obračunu.
        </li>
        <li>
          Za povremene poslove razmotrite{" "}
          <Link href="/blog/ugovor-o-djelu-vs-ugovor-o-radu">
            ugovor o djelu umjesto ugovora o radu
          </Link>,
          kad je to pravno primjereno.
        </li>
      </ul>

      <h2>Najčešća pitanja</h2>

      <p>
        <strong>Da li je bruto plata isto što i trošak poslodavca?</strong>
      </p>
      <p>
        Ne. Bruto je iznos u ugovoru. Trošak poslodavca je bruto plus
        doprinosi na platu (6% za obrt, 6,5% za d.o.o.) plus eventualne
        naknade (topli obrok, prevoz, regres).
      </p>

      <p>
        <strong>Koliko košta minimalac u FBiH 2026?</strong>
      </p>
      <p>
        Minimalna neto plata za 2026. je 1.027 KM, što odgovara bruto iznosu
        od 1.605,48 KM i ukupnom mjesečnom trošku od oko 1.701,81 KM za obrt.
        Detaljnije u članku o{" "}
        <Link href="/blog/minimalna-plata-fbih-2026">minimalnoj plati</Link>.
      </p>

      <p>
        <strong>Mijenjaju li se stope?</strong>
      </p>
      <p>
        Doprinosi na teret poslodavca su smanjeni 1. jula 2025. godine. Stope
        doprinosa iz plate (31%) i porez na dohodak (10%) ostali su
        nepromijenjeni. Lični odbitak (300 KM) može se mijenjati zasebnom
        odlukom, pa uvijek provjerite aktuelni iznos.
      </p>

      <p>
        <strong>Izvor:</strong> Zakon o doprinosima FBiH i Zakon o porezu na
        dohodak FBiH, sa izmjenama. Stope doprinosa na platu prema Sl. novine
        FBiH br. 33/25 (izmjena od 1.7.2025). Iznosi važeći za 2026. godinu.
      </p>

      <BlogCta
        title="Izračunajte tačan trošak svog radnika"
        text="Unesite platu u naš obračun plata i dobijete kompletan trošak poslodavca: bruto, sve doprinose, porez i neoporezive naknade, sa platnom listom i uplatnicama za banku."
        href="/prijave-radnika?tab=obracun"
        button="Otvori obračun plata"
      />
    </>
  );
}
