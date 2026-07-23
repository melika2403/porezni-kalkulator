import Link from "next/link";
import styles from "../blog.module.css";
import { BlogCta } from "../BlogCta";

export default function UgovorDjeluVsRadu() {
  return (
    <>
      <p className={styles.lead}>
        Mnogi poslodavci pokušavaju izbjeći troškove plata kroz ugovore o
        djelu (honorar) umjesto klasičnog ugovora o radu. Razlika u troškovima
        je značajna, ali pravna pravila su jasna: ugovor o djelu se može
        koristiti samo za stvarno povremene, vremenski ograničene poslove. U
        ovom članku objašnjavamo razlike, kada je koji primjeren i koliko
        svaki košta.
      </p>

      <h2>Pravna razlika u jednoj rečenici</h2>
      <p>
        <strong>Ugovor o radu</strong> stvara stalni ili određeni radni
        odnos sa svim pravima radnika (plata, godišnji odmor, bolovanje,
        otkaz, otkazni rok).{" "}
        <strong>Ugovor o djelu</strong> je obveznopravni ugovor za
        pojedinačan, povremen posao bez stvaranja radnog odnosa.
      </p>

      <h2>Kada se koristi ugovor o djelu</h2>
      <p>
        Ugovor o djelu je primjeren samo kad ispunjeni sljedeći uslovi:
      </p>
      <ul>
        <li>
          <strong>Povremen, pojedinačan posao</strong>: prevod jednog
          dokumenta, izrada jednog logotipa, fotografisanje jednog događaja
        </li>
        <li>
          <strong>Definisan rezultat, ne radni odnos</strong>: ne zavisi od
          provedenog vremena nego od završenog djela
        </li>
        <li>
          <strong>Bez stalne obaveze</strong>: nakon završetka djela, nema
          obaveze za novi posao
        </li>
        <li>
          <strong>Izvršilac koristi vlastite alate i prostor</strong>: ne
          radi u prostorijama naručioca pod nadzorom
        </li>
      </ul>

      <h2>Kada NIJE dozvoljen ugovor o djelu</h2>
      <p>
        Ako "honorarac" radi svaki dan u vašim prostorijama, pod vašim
        nadzorom, sa vašom opremom, na poslovima koji su stalni dio vaše
        djelatnosti, to je <strong>stvarni radni odnos</strong> i mora biti
        regulisan ugovorom o radu. Inspekcija rada to redovno provjerava i
        kaznе su visoke (do 5.000 KM po radniku za poslodavca koji
        prikriva radni odnos).
      </p>
      <p>
        Tipični primjeri zloupotrebe ugovora o djelu:
      </p>
      <ul>
        <li>Sekretar koji "honorarno" radi 8 sati svaki dan u kancelariji</li>
        <li>Programer koji "honorarno" piše kod svaki dan kroz cijelu godinu</li>
        <li>
          Konobar koji "honorarno" radi tri smjene sedmično u istom kafiću
        </li>
      </ul>

      <h2>Porezni tretman: ugovor o djelu</h2>
      <p>
        Honorar iz ugovora o djelu se oporezuje kao "dohodak iz druge
        samostalne djelatnosti" (član 12 Zakona o porezu na dohodak FBiH).
        Stope su sljedeće:
      </p>
      <ul>
        <li>
          <strong>Doprinosi:</strong> PIO 23% + Zdravstvo 4% = 27% ukupno na
          oporezivi dohodak
        </li>
        <li>
          <strong>Porez na dohodak:</strong> 10% na oporezivi dohodak (nakon
          ličnog odbitka)
        </li>
        <li>
          <strong>Oporezivi dohodak:</strong> bruto honorar minus priznati
          rashodi (standardni 20% ili stvarni dokumentovani)
        </li>
      </ul>
      <p>
        Naša aplikacija za{" "}
        <Link href="/ugovor-o-djelu">ugovor o djelu</Link> računa sve to
        automatski i generiše obrazac sa uplatnicama spremnim za banku.
      </p>

      <h3>Primjer: honorar 1.000 KM bruto</h3>
      <ul>
        <li>Bruto honorar: 1.000,00 KM</li>
        <li>Standardni rashodi (20%): −200,00 KM</li>
        <li>Oporezivi dohodak: 800,00 KM</li>
        <li>Doprinosi (PIO 23% + Zdr 4% = 27% × 800): 216,00 KM</li>
        <li>Porez na dohodak (10% × 800): 80,00 KM</li>
        <li>
          <strong>Neto izvršiocu: 1.000 − 216 − 80 = 704,00 KM</strong>
        </li>
        <li>
          Trošak naručiocu: 1.000 KM (sve obaveze pokriva izvršilac iz
          bruta)
        </li>
      </ul>
      <p>
        Napomena: ako izvršilac nije osiguranik po drugom osnovu (npr.
        nezaposlen), doprinosi su isti. Ako je već zaposlen ili penzioner,
        određene komponente doprinosa mogu biti drugačije.
      </p>

      <h2>Porezni tretman: ugovor o radu</h2>
      <p>
        Plata iz ugovora o radu se oporezuje kao dohodak iz nesamostalne
        djelatnosti. Detalji su u našem članku{" "}
        <Link href="/blog/kako-se-racuna-neto-plata-fbih">
          Kako se računa neto plata u FBiH
        </Link>,
        ali ukratko:
      </p>
      <ul>
        <li>
          <strong>Doprinosi iz plate (radnik):</strong> 31% bruto (PIO 17 +
          Zdr 12,5 + Nez 1,5)
        </li>
        <li>
          <strong>Doprinosi na plate (poslodavac):</strong> 5% bruto (PIO
          2,5 + Zdr 2 + Nez 0,5), stope važeće od 1.7.2025.
        </li>
        <li>
          <strong>Plus naknade:</strong> vodna 0,5% + zaštita 0,5% (+ fond
          invalida 0,5% za d.o.o.)
        </li>
        <li>
          <strong>Porez na dohodak:</strong> 10% na osnovicu (bruto −
          doprinosi − lični odbitak 300 KM)
        </li>
      </ul>

      <h3>Primjer: bruto plata 1.000 KM (ugovor o radu)</h3>
      <ul>
        <li>Bruto: 1.000,00 KM</li>
        <li>Doprinosi iz 31%: −310,00 KM</li>
        <li>Osnovica nakon doprinosa: 690,00 KM</li>
        <li>Lični odbitak: −300,00 KM</li>
        <li>Osnovica za porez: 390,00 KM</li>
        <li>Porez 10%: −39,00 KM</li>
        <li>
          <strong>Neto radniku: 651,00 KM</strong>
        </li>
        <li>
          Doprinosi i naknade poslodavca (6% bruto za obrt): +60,00 KM
        </li>
        <li>
          <strong>Ukupan trošak poslodavca: 1.060,00 KM</strong>
        </li>
      </ul>

      <h2>Direktno poređenje: 1.000 KM bruto honorar vs 1.000 KM bruto plata</h2>
      <ul>
        <li>
          <strong>Ugovor o djelu:</strong> izvršilac dobija 704 KM, naručilac
          plaća 1.000 KM
        </li>
        <li>
          <strong>Ugovor o radu:</strong> radnik dobija 651 KM, poslodavac
          plaća 1.060 KM
        </li>
      </ul>
      <p>
        Na prvi pogled ugovor o djelu izgleda jeftiniji za poslodavca i
        bolji za izvršioca. Ali pažljivo pogledajte: izvršilac iz ugovora o
        djelu <strong>nema</strong> godišnji odmor, bolovanje, otkazni rok,
        topli obrok, regres, sigurnost stalnog primanja. Te dvije forme
        nisu zamjenjive, služe različitim svrhama.
      </p>

      <h2>Šta poslodavac dobija od svakog</h2>
      <p>
        <strong>Ugovor o radu:</strong> stabilan radnik koji svaki dan
        dolazi, gradi znanje firme, ima lojalnost. Veće obaveze (otkazni
        rokovi, otpremnine), ali bolja produktivnost dugoročno.
      </p>
      <p>
        <strong>Ugovor o djelu:</strong> brzo rješenje za jednokratan
        posao, bez dugoročnih obaveza. Idealno za specifičan projekat
        (redesign web stranice, ugradnja softvera, jedan prevod).
      </p>

      <h2>Šta izvršilac/radnik dobija</h2>
      <p>
        <strong>Ugovor o radu:</strong> sigurnost mjesečnog primanja,
        godišnji odmor 20+ dana, bolovanje, porodiljsko, otkazni rok pri
        gubitku posla, doprinosi za penziju i zdravstvo se uplaćuju
        kontinuirano.
      </p>
      <p>
        <strong>Ugovor o djelu:</strong> fleksibilnost, više slobode oko
        radnog vremena i mjesta. Ali nema prava na bolovanje, godišnji
        odmor, niti otkazni rok. Doprinosi se uplaćuju samo za period
        honorara, to umanjuje penziju.
      </p>

      <h2>Kada je optimalno koristiti ugovor o djelu</h2>
      <p>Realističke situacije:</p>
      <ul>
        <li>Izrada web stranice za firmu (jednokratan projekat 2-3 mjeseca)</li>
        <li>Prevod dokumenta sa engleskog</li>
        <li>Fotografisanje vjenčanja ili događaja</li>
        <li>Pisanje teksta za knjigu ili magazin</li>
        <li>Konsultantska usluga (revizija procesa, analiza tržišta)</li>
        <li>Renoviranje prostora od strane majstora</li>
      </ul>

      <h2>Najčešća pitanja</h2>

      <p>
        <strong>Mogu li imati istog izvršioca na više ugovora o djelu kroz
        godinu?</strong>
      </p>
      <p>
        Da, ali svaki mora biti za stvarno različit posao. Ako je isti
        izvršilac, iste vrste posla, kontinuirano kroz godinu, to je
        prikrivanje radnog odnosa. Inspekcija rada to lako uoči.
      </p>

      <p>
        <strong>Šta sa freelancerima koji rade za stranog klijenta?</strong>
      </p>
      <p>
        To je samostalna djelatnost (obrt) ili AMS-1035 obrazac za
        akontaciju poreza na prihode iz inostranstva. Vidi naš{" "}
        <Link href="/ams">AMS-1035 alat</Link> za detalje.
      </p>

      <p>
        <strong>Da li ugovor o djelu zahtijeva pisani ugovor?</strong>
      </p>
      <p>
        Da. Po Zakonu o obligacionim odnosima i Zakonu o porezu na dohodak,
        ugovor o djelu mora biti u pisanom obliku sa svim ključnim
        elementima: predmet posla, rok izvršenja, naknada, ko snosi rashode,
        nadležni sud. Aplikacija za{" "}
        <Link href="/ugovor-o-djelu">ugovor o djelu</Link> generiše
        kompletan predložak.
      </p>

      <p>
        <strong>Ko podnosi prijavu poreza za honorar?</strong>
      </p>
      <p>
        Naručilac (isplatilac) je obavezan obračunati i uplatiti doprinose i
        porez prije isplate izvršiocu. To se zove "isplata u neto iznosu sa
        obračunatim porezom". Izvršilac dobija neto, naručilac dostavlja
        Poreznoj upravi obrazac i uplatnice.
      </p>

      <p>
        <strong>
          Da li izvršilac mora prijaviti honorar u svojoj godišnjoj prijavi?
        </strong>
      </p>
      <p>
        Da, kod godišnje prijave (<Link href="/gpd">GPD-1051</Link>)
        izvršilac prijavljuje sve dohotke iz svih izvora, uključujući
        honorare. Ako je već plaćen porez kod isplate, to se uračunava kao
        plaćena akontacija.
      </p>

      <p>
        <strong>Šta sa autorskim honorarima?</strong>
      </p>
      <p>
        Autorske naknade (npr. za prava na knjigu, muziku, fotografiju)
        imaju specifičan tretman: standardni rashodi su 30% (umjesto 20%
        za obične honorare), ali porez i doprinosi se računaju na ostatak.
        Naša aplikacija za UoD podržava obje vrste obračuna.
      </p>

      <p>
        <strong>Izvor:</strong> Zakon o porezu na dohodak FBiH (čl. 12),
        Zakon o doprinosima FBiH, Zakon o radu FBiH, Zakon o obligacionim
        odnosima FBiH. Stope važeće za 2026. (sa izmjenama od 1.7.2025.).
      </p>

      <BlogCta
        title="Ugovor o djelu sa obračunom u minuti"
        text="Naš alat generiše ugovor o djelu i odmah obračuna doprinose i porez na honorar (4% PIO + 10% poreza), sa dokumentom spremnim za potpis."
        href="/ugovor-o-djelu"
        button="Otvori ugovor o djelu"
      />
    </>
  );
}
