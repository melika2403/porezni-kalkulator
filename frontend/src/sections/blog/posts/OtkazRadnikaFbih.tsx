import Link from "next/link";
import styles from "../blog.module.css";
import { BlogCta } from "../BlogCta";

export default function OtkazRadnikaFbih() {
  return (
    <>
      <p className={styles.lead}>
        Otkaz radnog odnosa u FBiH je regulisan Zakonom o radu (Sl. novine
        FBiH br. 26/16). Postupak nije slobodan, postoje propisani razlozi,
        otkazni rokovi (minimum 7 dana, tipično 30) i obavezne procedure.
        Pogrešno proveden otkaz je čest razlog tužbi pred sudom, a kazne
        za poslodavca idu do <strong>10.000 KM</strong>. U ovom članku
        objašnjavamo zakonske razloge, korake postupka, otkazni rok i
        otpremnine.
      </p>

      <h2>Tri glavne vrste otkaza</h2>

      <h3>1. Otkaz od strane poslodavca (zbog razloga radnika ili poslovnih razloga)</h3>
      <p>
        Poslodavac može otkazati ugovor o radu samo iz zakonom propisanih
        razloga. Te razloge dijelimo u dvije grupe:
      </p>
      <ul>
        <li>
          <strong>Razlozi na strani radnika:</strong> kršenje radnih
          obaveza, nepravilan rad, nedolazak na posao, neuredno ponašanje
        </li>
        <li>
          <strong>Poslovni razlozi:</strong> ekonomske, tehnološke ili
          organizacione promjene u firmi (smanjenje obima posla, ukidanje
          radnog mjesta, restruktuiranje)
        </li>
      </ul>

      <h3>2. Otkaz od strane radnika</h3>
      <p>
        Radnik može u svakom trenutku otkazati ugovor o radu, bez
        obrazloženja. Mora poštovati otkazni rok prema ugovoru o radu
        (minimum 7 dana ako nije drugačije ugovoreno).
      </p>

      <h3>3. Sporazumni prestanak</h3>
      <p>
        Obje strane se dogovore i potpisuju sporazum o prestanku radnog
        odnosa. Često najbrža i najjeftinija varijanta jer ne ide otkazni
        rok i nema spora.
      </p>

      <h2>Zakonski razlozi za otkaz od strane poslodavca</h2>

      <h3>A) Razlozi na strani radnika (čl. 100 ZoR FBiH)</h3>
      <ul>
        <li>
          <strong>Teža povreda radnih obaveza</strong> (krađa, pijanstvo na
          poslu, fizički napad)
        </li>
        <li>
          <strong>Neopravdano odsustvo</strong> 5+ uzastopnih radnih dana
        </li>
        <li>
          <strong>Ponovljene lakše povrede</strong> nakon pismenog
          upozorenja
        </li>
        <li>
          <strong>Nemogućnost obavljanja posla</strong> (zdravstveni
          razlozi, nedostatak kvalifikacija)
        </li>
        <li>
          <strong>Gubitak povjerenja</strong> (otkrivanje poslovne tajne,
          rad za konkurenciju)
        </li>
      </ul>
      <p>
        Za otkaz iz razloga na strani radnika potrebno je pismeno
        upozorenje prije otkaza (osim u slučaju teže povrede gdje otkaz
        može biti odmah).
      </p>

      <h3>B) Poslovni razlozi (čl. 99 ZoR FBiH)</h3>
      <ul>
        <li>Smanjenje obima posla, gubitak ugovora ili klijenata</li>
        <li>Tehnološke promjene (ukidanje radnog mjesta)</li>
        <li>Organizaciona reorganizacija</li>
        <li>Ekonomski razlozi (smanjenje plate nije dovoljno)</li>
      </ul>
      <p>
        Za poslovne razloge poslodavac mora dokazati objektivne razloge i
        ponuditi radniku eventualno drugu poziciju u firmi ako postoji.
      </p>

      <h2>Razlozi koji NISU dozvoljeni za otkaz</h2>
      <p>
        Zakon o radu izričito zabranjuje otkaz iz sljedećih razloga:
      </p>
      <ul>
        <li>Pripadnost sindikatu ili učestvovanje u sindikalnim aktivnostima</li>
        <li>Pol, rasa, vjera, političko opredjeljenje</li>
        <li>Bračno stanje, trudnoća, porodiljsko odsustvo</li>
        <li>Bolovanje (osim ako traje duže od 6 mjeseci uzastopno)</li>
        <li>
          Pokretanje pravnog postupka ili podnošenje prijave inspekciji rada
        </li>
      </ul>
      <p>
        Otkaz iz ovih razloga je <strong>nezakonit</strong> i sud ga može
        poništiti, sa obavezom poslodavca da vrati radnika na posao plus
        isplati sve neisplaćene plate.
      </p>

      <h2>Otkazni rok</h2>
      <p>
        Otkazni rok je period između dana kad je odluka o otkazu uručena
        radniku i datuma stvarnog prestanka radnog odnosa. Zakon o radu
        FBiH propisuje:
      </p>
      <ul>
        <li>
          <strong>Minimum 7 dana</strong> ako otkaz daje radnik (sa
          mogućnošću dužeg roka po ugovoru)
        </li>
        <li>
          <strong>Minimum 14 dana</strong> ako poslodavac daje otkaz iz
          razloga na strani radnika
        </li>
        <li>
          <strong>Minimum 30 dana</strong> ako poslodavac daje otkaz iz
          poslovnih razloga
        </li>
        <li>
          <strong>Do 3 mjeseca</strong> kao maksimum, ovisno od dužine
          staža kod istog poslodavca
        </li>
      </ul>
      <p>
        Tipično se u ugovor o radu upisuje 30 dana za sve slučajeve. Tokom
        otkaznog roka radnik radi normalno, prima platu i ima sva prava.
        Može i biti oslobođen rada uz redovnu platu (na zahtjev poslodavca).
      </p>

      <h2>Otpremnina</h2>
      <p>
        Otpremnina se isplaćuje samo u slučaju otkaza iz{" "}
        <strong>poslovnih razloga</strong> i samo radnicima sa najmanje{" "}
        <strong>2 godine staža</strong> kod istog poslodavca. Visina:
      </p>
      <ul>
        <li>
          Najmanje <strong>1/3 prosječne mjesečne plate</strong> radnika za
          svaku godinu staža kod tog poslodavca
        </li>
        <li>
          Maksimum 6 prosječnih plata radnika (po Zakonu o radu, kolektivni
          ugovor može biti veći)
        </li>
      </ul>
      <p>
        Primjer: radnik sa 5 godina staža, prosječna plata 1.500 KM. Otpremnina
        = 5 × (1.500 / 3) = 5 × 500 = <strong>2.500 KM</strong>.
      </p>
      <p>
        Otpremnina se isplaćuje uz zadnju platu i NE oporezuje se do
        propisanog limita (~6 prosječnih neto plata FBiH). Iznad limita,
        višak se oporezuje kao dohodak.
      </p>

      <h2>Postupak otkaza korak po korak (poslodavac)</h2>

      <h3>Korak 1: Utvrđivanje razloga i dokumentacija</h3>
      <p>
        Prikupite dokaze: zapisnici o nedolasku, pismena upozorenja,
        evidencija o povredama radnih obaveza, finansijske podatke za
        poslovne razloge. Bez dokumentacije, sud lako poništava otkaz.
      </p>

      <h3>Korak 2: Pismeno upozorenje (za razloge na strani radnika)</h3>
      <p>
        Za većinu slučajeva razloga na strani radnika, prvo treba dati
        pismeno upozorenje sa rokom za ispravku ponašanja. Tek ako se
        ponavlja, slijedi otkaz.
      </p>

      <h3>Korak 3: Izrada odluke o otkazu</h3>
      <p>
        Odluka o otkazu mora sadržati:
      </p>
      <ul>
        <li>Podatke o poslodavcu i radniku</li>
        <li>Datum izdavanja i prijema</li>
        <li>Konkretan zakonski razlog (član ZoR)</li>
        <li>Dužinu otkaznog roka</li>
        <li>Datum prestanka radnog odnosa</li>
        <li>Otpremninu (ako pripada)</li>
        <li>Pouku o pravnom lijeku (rok za žalbu sudu 15 dana)</li>
      </ul>
      <p>
        Naša aplikacija za{" "}
        <Link href="/ugovor-o-radu">ugovor o radu i otkaz</Link> generiše
        kompletan PDF odluke o otkazu sa svim zakonskim elementima.
      </p>

      <h3>Korak 4: Uručivanje odluke radniku</h3>
      <p>
        Odluka se uručuje radniku lično uz potpis, ili poštom (preporučeno
        sa povratnicom). Datum uručenja je početak otkaznog roka.
      </p>

      <h3>Korak 5: Postupak tokom otkaznog roka</h3>
      <ul>
        <li>Radnik radi normalno (ili je oslobođen rada uz platu)</li>
        <li>Prima sve plate i naknade kao i do tada</li>
        <li>Ima pravo na do 4 sata sedmično slobodno za traženje novog posla</li>
      </ul>

      <h3>Korak 6: Završetak radnog odnosa</h3>
      <ul>
        <li>Zadnja plata i sve neisplaćene naknade</li>
        <li>Otpremnina (ako pripada)</li>
        <li>Naknada za neiskorišteni godišnji odmor</li>
        <li>
          <strong>JS3100 odjava radnika</strong> u roku od 7 dana od
          prestanka (vidi naš{" "}
          <Link href="/prijave-radnika">JS3100 alat</Link>)
        </li>
        <li>
          Predaja radne knjižice radniku sa upisanim datumom prestanka
        </li>
      </ul>

      <h2>Pravni lijekovi za radnika</h2>
      <p>
        Ako radnik smatra da je otkaz nezakonit, ima 15 dana od prijema
        odluke da podnese tužbu nadležnom sudu. Sud može:
      </p>
      <ul>
        <li>Poništiti odluku o otkazu</li>
        <li>Vratiti radnika na posao (ili presuditi nadoknadu)</li>
        <li>Naložiti isplatu neisplaćenih plata za period spora</li>
        <li>Dodijeliti naknadu nematerijalne štete</li>
      </ul>
      <p>
        Prosječno trajanje sudskog spora oko otkaza u FBiH je 1-2 godine. Za
        taj period, ako radnik dobije spor, poslodavac mora isplatiti sve
        plate plus kamate.
      </p>

      <h2>Najčešća pitanja</h2>

      <p>
        <strong>Mogu li otkazati radnika za vrijeme bolovanja?</strong>
      </p>
      <p>
        Ne, bolovanje je zaštićeno. Izuzetak: ako bolovanje traje duže od 6
        mjeseci uzastopno, otkaz je moguć uz medicinsku procjenu. Za
        bolovanje kraće od 6 mjeseci, otkaz je nezakonit i sud ga poništava.
      </p>

      <p>
        <strong>Šta sa trudnicama i porodiljama?</strong>
      </p>
      <p>
        Trudnice i porodilje imaju posebnu zaštitu, otkaz je zabranjen do
        kraja porodiljskog odsustva i još 30 dana nakon povratka. Izuzetak
        je samo brisanje firme iz registra.
      </p>

      <p>
        <strong>Mogu li otkazati u toku probnog rada?</strong>
      </p>
      <p>
        Da, za vrijeme probnog rada (do 3 mjeseca po ZoR FBiH) otkazni rok
        je samo 7 dana. Razlog: nepostojanje saglasnosti sa poslovnim
        zahtjevima. Otpremnina se ne plaća.
      </p>

      <p>
        <strong>Šta sa ugovorom o radu na određeno?</strong>
      </p>
      <p>
        Ugovor na određeno prestaje istekom roka, bez potrebe za otkazom. Ako
        želite ga raskinuti prije isteka, gledaju se isti zakonski razlozi
        kao za neodređeno. Pretvaranje "na određeno" u "na neodređeno" se
        dešava ako radnik radi nakon isteka roka više od 30 dana.
      </p>

      <p>
        <strong>Mogu li smanjiti broj radnika bez otpremnine?</strong>
      </p>
      <p>
        Ne, ako su radnici radili 2+ godine kod vas i otkaz je iz poslovnih
        razloga, otpremnina je obavezna. Alternative: sporazumni prestanak
        (radnik se odriče otpremnine za drugu naknadu) ili premještaj na
        drugo radno mjesto u firmi.
      </p>

      <p>
        <strong>Šta ako radnik ne preuzima odluku?</strong>
      </p>
      <p>
        Pošaljite preporučenom poštom sa povratnicom. Smatra se da je
        uručena na dan kad je vraćena pošti (ako radnik ne preuzme u roku 7
        dana). To rješava problem izbjegavanja prijema.
      </p>

      <p>
        <strong>Mogu li otkazati radnika koji je dao nekretnine pod hipoteku?</strong>
      </p>
      <p>
        To je njegova privatna stvar, nije razlog za otkaz. Otkaz iz takvih
        razloga je nezakonit.
      </p>

      <p>
        <strong>Šta sa kolektivnim ugovorom?</strong>
      </p>
      <p>
        Ako firma ima kolektivni ugovor, on može propisati strože uslove
        otkaza (duži otkazni rok, veću otpremninu, dodatne razloge zaštite
        radnika). Kolektivni ugovor uvijek nadjačava minimum Zakona o radu
        u korist radnika.
      </p>

      <p>
        <strong>Izvor:</strong> Zakon o radu FBiH (Sl. novine FBiH br.
        26/16 sa izmjenama 89/18), naročito članovi 96-114 (otkaz),
        otpremnine i otkazni rokovi. Pravilnik o sadržaju ugovora o radu
        FBiH. Za specifične slučajeve konsultujte advokata.
      </p>

      <BlogCta
        title="Ugovor o radu i otkaz: gotovi dokumenti"
        text="Naš generator pravi ugovor o radu i odluku o otkazu po Zakonu o radu FBiH: unesete podatke, preuzmete PDF ili Word, bez advokatskih šablona sa interneta."
        href="/ugovor-o-radu"
        button="Otvori generator ugovora"
      />
    </>
  );
}
