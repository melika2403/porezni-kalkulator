import Link from "next/link";
import styles from "../blog.module.css";

export default function PriznatiRashodiObrta() {
  return (
    <>
      <p className={styles.lead}>
        Ako vodite obrt u režimu stvarnog dohotka, svaki priznati rashod
        direktno smanjuje vašu osnovicu za porez. Što više pravilno
        evidentiranih rashoda, to manji porez na dohodak na kraju godine. U
        ovom članku objašnjavamo šta se smatra priznatim rashodom u FBiH,
        koje kategorije najčešće promaknu obrtnicima i kako pravilno
        dokumentovati svaki trošak.
      </p>

      <h2>Šta je priznati rashod</h2>
      <p>
        Priznati rashod je trošak koji je direktno vezan za obavljanje vaše
        djelatnosti i koji možete dokazati validnim računom ili drugom
        ispravnom dokumentacijom. Po Zakonu o porezu na dohodak FBiH (član
        20), priznaju se troškovi koji su:
      </p>
      <ul>
        <li>Nužni za obavljanje djelatnosti</li>
        <li>Nastali u poreznom periodu</li>
        <li>Plaćeni iz poslovnog računa ili dokazano gotovinom</li>
        <li>Dokumentovani fakturom, računom ili drugim ispravnim dokumentom</li>
      </ul>
      <p>
        Pravilo je jednostavno: ako trošak nije direktno povezan sa vašom
        djelatnošću ili ne možete dokazati, NIJE priznati rashod.
      </p>

      <h2>Najčešće kategorije priznatih rashoda</h2>

      <h3>1. Operativni troškovi poslovnog prostora</h3>
      <ul>
        <li>Kirija (zakup) poslovnog prostora</li>
        <li>Komunalne usluge (struja, voda, grijanje, otpad)</li>
        <li>Internet i fiksni telefon</li>
        <li>Održavanje prostora, čišćenje</li>
        <li>Osiguranje prostora i opreme</li>
      </ul>
      <p>
        Ako poslujete iz vlastitog stana, možete priznati proporcionalan dio
        komunalija. Tipično 10-20% u zavisnosti od površine koja se koristi
        za djelatnost. Trebate sačiniti internu odluku i procjenu.
      </p>

      <h3>2. Oprema i sitan inventar</h3>
      <ul>
        <li>Računari, monitori, tastature</li>
        <li>Telefoni, tableti, fotoaparati</li>
        <li>Alati i mašine za zanat</li>
        <li>Kancelarijski namještaj (stolovi, stolice, ormari)</li>
      </ul>
      <p>
        Ako oprema košta <strong>do 1.000 KM</strong>, knjiži se kao tekući
        trošak u godini nabavke. Iznad 1.000 KM, ide u stalna sredstva i
        amortizuje se kroz više godina prema propisanim stopama. Aplikacija
        za <Link href="/amortizacija">stalna sredstva i amortizaciju</Link>{" "}
        vodi to automatski.
      </p>

      <h3>3. Vozila i putni nalozi</h3>
      <ul>
        <li>Gorivo (sa pravilno popunjenim putnim nalogom)</li>
        <li>Servis, registracija, osiguranje službenog vozila</li>
        <li>Cestarine, parking</li>
        <li>Najam vozila za poslovne svrhe</li>
      </ul>
      <p>
        Vozilo mora biti registrovano na obrt ili je trošak proporcionalan
        službenoj upotrebi. Za privatno vozilo koje se koristi u poslu,
        moguće je priznati putne troškove po kilometraži (oko 0,30-0,40
        KM/km) uz uredno vođen putni nalog.
      </p>

      <h3>4. Materijal i sirovine</h3>
      <ul>
        <li>Roba za dalju prodaju (trgovac)</li>
        <li>Sirovine za proizvodnju ili izradu (zanati)</li>
        <li>Potrošni materijal (papir, toner, alati za jednokratnu upotrebu)</li>
        <li>Ambalaža</li>
      </ul>

      <h3>5. Honorari i usluge trećih lica</h3>
      <ul>
        <li>Knjigovođa, advokat, notar, prevodilac</li>
        <li>Usluge marketinga i oglašavanja</li>
        <li>Web hosting, domain, SaaS pretplate</li>
        <li>Ugovori o djelu sa freelancerima (sa pravilnim obračunom)</li>
        <li>Usluge servisa, popravki</li>
      </ul>

      <h3>6. Plate i doprinosi za zaposlene</h3>
      <ul>
        <li>Bruto plate radnika</li>
        <li>Doprinosi koje plaća poslodavac (5% PIO/Zdr/Nez nakon izmjene od 1.7.2025.)</li>
        <li>Vodna naknada i naknada za zaštitu od nesreća (po 0,5%)</li>
        <li>Topli obrok, regres, putni trošak za radnike</li>
      </ul>
      <p>
        Cijeli ukupan trošak radnika je priznati rashod. Za precizan obračun
        vidi naš{" "}
        <Link href="/preracun-neto-bruto">kalkulator neto/bruto plate</Link>{" "}
        ili{" "}
        <Link href="/prijave-radnika?tab=obracun">mjesečni obračun plata</Link>.
      </p>

      <h3>7. Obrazovanje i stručno usavršavanje</h3>
      <ul>
        <li>Kursevi i seminari vezani za djelatnost</li>
        <li>Stručna literatura, knjige, časopisi</li>
        <li>Pretplate na profesionalne portale</li>
        <li>Učlanjenja u esnaf, komoru, asocijaciju</li>
      </ul>

      <h3>8. Reprezentacija (sa ograničenjem)</h3>
      <p>
        Troškovi reprezentacije (poslovni ručkovi, pokloni klijentima) se
        priznaju ograničeno, do <strong>0,5% ukupnih prihoda</strong>
        godišnje. Iznad tog limita, višak se ne priznaje. Mora postojati
        račun sa imenom poslovnog partnera i razlogom susreta.
      </p>

      <h3>9. Bankovni troškovi</h3>
      <ul>
        <li>Mjesečna naknada za poslovni račun</li>
        <li>Provizije za uplate i transakcije</li>
        <li>Naknade za izvode, kartice, online banking</li>
        <li>Kamate na poslovne kredite</li>
      </ul>

      <h3>10. Marketing i oglašavanje</h3>
      <ul>
        <li>Google Ads, Facebook Ads, Instagram</li>
        <li>Izrada i hosting web stranice</li>
        <li>Štampani materijali (brošure, vizit kartice, baneri)</li>
        <li>Profesionalne fotografije, video produkcija</li>
      </ul>

      <h2>Šta NIJE priznati rashod</h2>
      <p>
        Ovo su najčešći troškovi koje obrtnici pokušaju knjižiti a inspekcija
        ih ne priznaje:
      </p>
      <ul>
        <li>
          <strong>Lični troškovi vlasnika</strong> (privatna potrošnja,
          životne namirnice, lična garderoba)
        </li>
        <li>
          <strong>Kazne i penali</strong> (porezne, prekršajne, ugovorne) ne
          priznaju se
        </li>
        <li>
          <strong>Donacije</strong> iznad propisanog limita (do 0,5%
          prihoda godišnje su priznate, iznad ne)
        </li>
        <li>
          <strong>Reprezentacija iznad 0,5%</strong> ukupnih prihoda
        </li>
        <li>
          <strong>Putni troškovi bez putnog naloga</strong> ili sa nejasnom
          poslovnom svrhom
        </li>
        <li>
          <strong>Gorivo za vozilo registrovano na fizičko lice</strong> bez
          dokaza o poslovnoj upotrebi
        </li>
        <li>
          <strong>Plaćanja gotovinom bez fiskalnog računa</strong> (i kad
          imate račun, gotovinski limit je 100 KM za pojedinačnu transakciju)
        </li>
      </ul>

      <h2>Dokumentacija: šta čuvati i koliko</h2>
      <p>
        Sve račune, fakture, izvode i ugovore čuvate{" "}
        <strong>najmanje 5 godina</strong> nakon poreznog perioda (član 36
        Zakona o porezu na dohodak FBiH). U slučaju inspekcije, morate moći
        pokazati svaki dokument koji potkrepljuje rashod.
      </p>
      <p>
        Praktični savjeti:
      </p>
      <ul>
        <li>
          Sve račune skenirajte ili fotografišite čim ih dobijete (papir
          bleđi i nestaje)
        </li>
        <li>
          Vodite urednu evidenciju po mjesecima ili kategorijama (Excel,
          Google Sheets ili specijalizovani softver)
        </li>
        <li>
          Sve uplate radite preko poslovnog računa kad god je moguće (lakše
          se dokazuje)
        </li>
        <li>
          Putne naloge popunjavajte istog dana, ne naknadno (inspekcija
          provjerava konzistentnost datuma)
        </li>
      </ul>

      <h2>Primjer: kako rashodi smanjuju porez</h2>
      <p>
        Programer u stvarnom režimu, godišnji prihod 80.000 KM. Bez
        priznatih rashoda:
      </p>
      <ul>
        <li>Prihod: 80.000 KM</li>
        <li>Doprinosi vlasnika (osnovica 2.710 × 36% × 12): 11.707,20 KM</li>
        <li>Lični odbitak: 3.600 KM</li>
        <li>Osnovica za porez: 80.000 − 11.707,20 − 3.600 = 64.692,80 KM</li>
        <li>Porez 10%: <strong>6.469,28 KM</strong></li>
      </ul>
      <p>Sa priznatim rashodima 25.000 KM (laptop, internet, knjigovođa, kursevi, kirija dijela stana, putni nalozi):</p>
      <ul>
        <li>Prihod: 80.000 KM</li>
        <li>Rashodi: −25.000 KM</li>
        <li>Dohodak: 55.000 KM</li>
        <li>Doprinosi vlasnika: 11.707,20 KM</li>
        <li>Lični odbitak: 3.600 KM</li>
        <li>Osnovica za porez: 55.000 − 11.707,20 − 3.600 = 39.692,80 KM</li>
        <li>Porez 10%: <strong>3.969,28 KM</strong></li>
      </ul>
      <p>
        Razlika: <strong>2.500 KM manji porez</strong> (10% od 25.000 KM
        priznatih rashoda). Vrijedi vremena uloženog u urednu evidenciju.
      </p>

      <h2>Najčešća pitanja</h2>

      <p>
        <strong>Šta sa rashodima paušalnih obrtnika?</strong>
      </p>
      <p>
        Paušalni obrtnici ne odbijaju stvarne rashode jer plaćaju fiksni
        porez bez obzira na promet i troškove. Evidencija rashoda nije
        obavezna, ali možete je voditi za vlastiti pregled.
      </p>

      <p>
        <strong>Mogu li priznati rashode iz inostranstva?</strong>
      </p>
      <p>
        Da, ako su nužni za vašu djelatnost i imate validnu inostranu
        fakturu (sa svim podacima koje traži zakon BiH). Za usluge primljene
        iz EU možda trebate obračunati reverse-charge PDV ako ste PDV
        obveznik.
      </p>

      <p>
        <strong>Šta ako platim nešto privatnim novcem za posao?</strong>
      </p>
      <p>
        Refundirajte sebi iz poslovnog računa uz internu odluku, čuvajući
        račun. Idealno: sve poslovno plaćate iz poslovnog računa direktno.
      </p>

      <p>
        <strong>Mogu li priznati pretplate (Netflix, Spotify, itd.)?</strong>
      </p>
      <p>
        Samo ako se direktno koriste u poslu. Programer može priznati GitHub
        Copilot, ChatGPT Plus, AWS, direktno je profesionalni alat.
        Netflix, Spotify za ličnu upotrebu nisu priznati rashodi čak i ako
        plaćate iz poslovnog računa.
      </p>

      <p>
        <strong>Koliko knjigovođa naplaćuje za stvarni režim?</strong>
      </p>
      <p>
        U FBiH tipično 100-250 KM mjesečno za manji obrt (1-3 radnika,
        umjeren broj transakcija). Više za PDV obveznike sa puno faktura
        (200-400 KM mjesečno) ili više od 5 radnika.
      </p>

      <p>
        <strong>Da li smijem sam voditi knjige?</strong>
      </p>
      <p>
        Da, zakon dopušta. Trebate samo poznavati propise i koristiti
        odgovarajući softver. Većina obrtnika ipak angažuje knjigovođu da
        izbjegnu greške i pravne probleme. Naša aplikacija pomaže u
        generisanju obrazaca i obračuna, ali knjigovođa i dalje preuzima
        odgovornost za prijave.
      </p>

      <p>
        <strong>Izvor:</strong> Zakon o porezu na dohodak FBiH (Sl. novine
        FBiH br. 10/08 sa izmjenama, naročito čl. 19 i 20), Pravilnik o
        primjeni Zakona o porezu na dohodak FBiH, Zakon o doprinosima FBiH
        (Sl. novine FBiH br. 35/98 i izmjene 33/25).
      </p>
    </>
  );
}
