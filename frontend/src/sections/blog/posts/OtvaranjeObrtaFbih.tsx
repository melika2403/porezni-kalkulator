import Link from "next/link";
import styles from "../blog.module.css";

export default function OtvaranjeObrtaFbih() {
  return (
    <>
      <p className={styles.lead}>
        Otvaranje obrta u Federaciji BiH je relativno brz proces, najduže
        do 30 dana, sa ukupnim troškovima između <strong>230 i 500 KM</strong>{" "}
        u Kantonu Sarajevo (manje u drugim kantonima). U ovom vodiču
        objašnjavamo svaki korak, koje dokumente trebate, koliko košta i
        koje obaveze nastaju odmah nakon registracije.
      </p>

      <h2>Korak 1: Odredite djelatnost i lokaciju</h2>
      <p>
        Prije svega odlučite čime ćete se baviti. Djelatnost mora biti
        klasifikovana po Klasifikaciji djelatnosti BiH 2010 (KD BiH 2010,
        ekvivalent NACE Rev. 2). Možete imati glavnu djelatnost i jednu ili
        više dopunskih.
      </p>
      <p>
        Tačnu šifru za vašu djelatnost možete pronaći u našoj kompletnoj
        listi:{" "}
        <Link href="/sifre-djelatnosti">Šifre djelatnosti FBiH</Link>{" "}
        (sa detaljnim opisima šta svaka šifra obuhvata).
      </p>
      <p>
        Trebate i poslovni prostor sa pravnim osnovom korištenja: vlasnički
        list, ugovor o zakupu, ili saglasnost vlasnika. Neke djelatnosti se
        mogu obavljati i u vlastitom stanu (npr. programer), ali tada
        treba saglasnost komšija.
      </p>

      <h2>Korak 2: Pripremite dokumente za općinu</h2>
      <p>
        U općini gdje će obrt biti prijavljen podnosite zahtjev sa sljedećim
        dokumentima:
      </p>
      <ul>
        <li>Zahtjev za izdavanje rješenja o obavljanju obrta (obrazac općine)</li>
        <li>Lična karta (kopija) ili putna isprava</li>
        <li>CIPS prijava prebivališta</li>
        <li>
          Dokaz o stručnoj spremi za djelatnost (ako se traži za vašu vrstu
          obrta, npr. zanati)
        </li>
        <li>Uvjerenje o izmirenim poreznim obavezama</li>
        <li>
          Dokaz o pravu korištenja poslovnog prostora (vlasnički list,
          ugovor o zakupu ili saglasnost vlasnika)
        </li>
        <li>Dokaz o uplati administrativne takse</li>
        <li>Saglasnosti nadležnih organa za posebne djelatnosti (npr. ugostiteljstvo, prehrana)</li>
      </ul>
      <p>
        Administrativna taksa za otvaranje obrta u Kantonu Sarajevo (Općina
        Novi Grad) je <strong>80 KM</strong>. U drugim općinama varira od 50
        do 120 KM. Kantoni izvan Sarajeva (TK, ZDK, USK) imaju slične iznose.
      </p>

      <h2>Korak 3: Dobijte Rješenje o obavljanju obrta</h2>
      <p>
        Općinski organ ima zakonski rok od <strong>7 dana</strong> da donese
        rješenje ako je zahtjev uredan. U praksi to bude 7 do 30 dana
        ovisno od opterećenosti općine i kompliciranosti djelatnosti.
      </p>
      <p>
        Rješenje sadrži vaš obrt naziv, JIB (jedinstveni identifikacioni
        broj), šifru djelatnosti, sjedište i datum početka obavljanja
        djelatnosti.
      </p>

      <h2>Korak 4: Izradite pečat</h2>
      <p>
        Sa rješenjem idete u pečatariju (mnoge u Sarajevu rade za 24-48
        sati). Trošak pečata je oko <strong>30-50 KM</strong>. Bez pečata
        ne možete obavljati transakcije sa drugim firmama.
      </p>

      <h2>Korak 5: Registracija kod Porezne uprave FBiH (PUFBiH)</h2>
      <p>
        Sa rješenjem i pečatom idete u nadležnu ispostavu PUFBiH:
      </p>
      <ul>
        <li>Podnosite zahtjev za poreznu registraciju</li>
        <li>Dobijate <strong>Uvjerenje o poreznoj registraciji</strong> sa ID brojem</li>
        <li>
          Dobijate <strong>Obavještenje o razvrstavanju po šiframa
          djelatnosti</strong>
        </li>
        <li>Odlučujete o režimu oporezivanja: stvarni dohodak ili paušalni</li>
      </ul>
      <p>
        Ako birate paušalni režim, plaćate fiksnu mjesečnu osnovicu
        doprinosa (vidi naš članak{" "}
        <Link href="/blog/obrt-vs-doo-2026">Obrt vs d.o.o.</Link> za
        kompletne osnovice za 2026). Paušalni je dostupan samo za
        određene kategorije: stari i tradicionalni zanati, poljoprivreda,
        taksi, trgovac pojedinac. Slobodna zanimanja (programer, advokat,
        knjigovođa) moraju ići stvarnim dohotkom.
      </p>

      <h2>Korak 6: Otvaranje transakcijskog računa u banci</h2>
      <p>
        Sa rješenjem, pečatom i uvjerenjem o poreznoj registraciji idete u
        banku po izboru i otvarate poslovni transakcijski račun. Trošak je
        obično <strong>0-50 KM</strong> (mnoge banke ne naplaćuju otvaranje,
        ali mjesečnu naknadu računa 10-30 KM).
      </p>
      <p>
        Bez poslovnog računa ne možete primati uplate od klijenata ni
        isplaćivati doprinose državi.
      </p>

      <h2>Korak 7: Prijava u PIO/MIO i Zavod zdravstvenog</h2>
      <p>
        Kao vlasnik obrta vi ste <strong>sam svoj uplatilac doprinosa</strong>{" "}
        (poslodavac sebi). Trebate se prijaviti u Jedinstveni sistem
        registracije, kontrole i naplate doprinosa kroz obrazac{" "}
        <Link href="/prijave-radnika">JS3100</Link>. U sistemu ćete biti
        evidentirani po fiksnoj mjesečnoj osnovici prema vašem režimu
        oporezivanja.
      </p>

      <h2>Korak 8: Fiskalizacija</h2>
      <p>
        Fiskalna kasa je <strong>obavezna za većinu obrta</strong> u FBiH,
        bez obzira da li primate gotovinu ili sve transakcije idu preko
        žiro računa. Trošak fiskalne kase je{" "}
        <strong>300-800 KM</strong> ovisno od modela, plus mjesečna naknada
        za servisera.
      </p>
      <p>
        Postoje izuzeća propisana Zakonom o fiskalnim sistemima FBiH. Među
        najčešćima:
      </p>
      <ul>
        <li>
          <strong>Stari i tradicionalni zanati</strong> (frizer, krojač,
          obućar, pekara, časovničar i drugi sa liste tradicionalnih zanata)
        </li>
        <li>
          <strong>Poljoprivrednici</strong> koji prodaju vlastite proizvode
        </li>
        <li>Određene kategorije taksi i sitne uslužne djelatnosti</li>
      </ul>
      <p>
        Tačnu listu izuzetih djelatnosti i pravila fiskalizacije provjerite
        kod nadležne Porezne uprave FBiH ili kod knjigovođe prilikom
        registracije obrta.
      </p>

      <h2>Ukupni početni troškovi (sumarno)</h2>
      <ul>
        <li>Administrativna taksa općine: 50-120 KM</li>
        <li>Pečat: 30-50 KM</li>
        <li>Otvaranje računa u banci: 0-50 KM</li>
        <li>Uvjerenja i kopije dokumenata: 10-30 KM</li>
        <li>Fiskalna kasa (obavezna za većinu): 300-800 KM</li>
        <li>Knjigovođa (prvi mjesec, ako koristite): 50-200 KM</li>
        <li>
          <strong>Ukupno za većinu obrta: 450-1.200 KM</strong>
        </li>
        <li>
          <strong>Za izuzeta zanimanja (stari i tradicionalni zanati,
          poljoprivrednici), bez kase: 150-450 KM</strong>
        </li>
      </ul>

      <h2>Obaveze odmah nakon registracije</h2>
      <p>Čim počnete poslovati, imate sljedeće redovne obaveze:</p>

      <h3>Mjesečno</h3>
      <ul>
        <li>
          Uplata doprinosa za vlasnika (na fiksnu osnovicu, do 10. u mjesecu
          za prethodni mjesec, na Obrazac 2002)
        </li>
        <li>
          Uplata akontacije poreza na dohodak (za stvarni režim) ili paušalni
          porez (za paušalni režim)
        </li>
        <li>
          Ako ste PDV obveznik: PDV prijava i uplata do 10. u mjesecu (vidi
          naš članak o PDV registraciji)
        </li>
      </ul>

      <h3>Godišnje</h3>
      <ul>
        <li>
          GPD-1051 godišnja prijava poreza na dohodak (do 31.03. tekuće
          godine za prethodnu).{" "}
          <Link href="/gpd">Online popunjavanje</Link>.
        </li>
        <li>
          SPR-1053 specifikacija dohotka iz samostalne djelatnosti (uz
          GPD-1051, isti rok).{" "}
          <Link href="/spr">Online popunjavanje</Link>.
        </li>
        <li>
          Predaja finansijskog izvještaja ako vodite poslovne knjige
          (stvarni režim)
        </li>
      </ul>

      <h2>Šta ako planirate zapošljavati radnike?</h2>
      <p>
        Za svakog radnika morate:
      </p>
      <ul>
        <li>
          Pripremiti i potpisati{" "}
          <Link href="/ugovor-o-radu">ugovor o radu</Link> (najmanje dan
          prije početka rada)
        </li>
        <li>
          Podnijeti <Link href="/prijave-radnika">JS3100</Link> obrazac za
          prijavu osiguranja
        </li>
        <li>
          Mjesečno obračunavati platu, doprinose i porez (mi to radimo
          automatski:{" "}
          <Link href="/prijave-radnika?tab=obracun">Obračun plata</Link>)
        </li>
        <li>
          Voditi šihtericu (evidenciju radnog vremena):{" "}
          <Link href="/sihterica">Online šihterica</Link>
        </li>
        <li>Predavati Obrazac 2001 mjesečno za svakog radnika</li>
      </ul>

      <h2>Najčešća pitanja</h2>

      <p>
        <strong>Mogu li biti vlasnik obrta dok sam zaposlen u drugoj firmi?</strong>
      </p>
      <p>
        Da, dozvoljeno je. Tada plaćate samo paušalnu osnovicu za "dopunsku
        djelatnost" koja je niža od osnovne. Provjerite tačan iznos u Sl.
        novinama FBiH za 2026.
      </p>

      <p>
        <strong>
          Koja je razlika između obrta i samostalne djelatnosti?
        </strong>
      </p>
      <p>
        Praktično ništa. "Samostalna djelatnost" je širi pojam koji
        uključuje obrte, slobodna zanimanja, poljoprivrednike i druge. U
        zakonskoj terminologiji obrt je tehnički "obavljanje obrtničke i
        srodne djelatnosti", dok npr. programer je "obavljanje slobodne
        djelatnosti". Porezni tretman je sličan, razlikuju se osnovice.
      </p>

      <p>
        <strong>
          Mogu li promijeniti djelatnost obrta kasnije?
        </strong>
      </p>
      <p>
        Da. Podnosi se zahtjev u istoj općini sa novim ili dopunjenim šiframa
        djelatnosti. Procedura je brža od prvobitne registracije (obično 3-7
        dana) i ima nižu taksu.
      </p>

      <p>
        <strong>Mogu li obrt registrovati u jednoj općini a poslovati u drugoj?</strong>
      </p>
      <p>
        Sjedište obrta je vezano za općinu gdje je registrovan. Možete imati
        izdvojene poslovne jedinice u drugim općinama, ali to zahtijeva
        dodatnu registraciju izdvojenih jedinica.
      </p>

      <p>
        <strong>Kako otkazati obrt?</strong>
      </p>
      <p>
        Podnosi se zahtjev za prestanak obavljanja djelatnosti u istoj općini
        gdje je obrt registrovan. Treba podmiriti sve neizmirene porezne i
        druge obaveze. Brisanje iz registra je obično 7-15 dana nakon
        zahtjeva. Kao knjigovođe to mogu uraditi u vaše ime.
      </p>

      <p>
        <strong>Izvori i reference:</strong>{" "}
        <a
          href="https://administrator.ba/kako-otvoriti-obrt-u-fbih/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Agencija Administrator: Kako brzo i jednostavno pokrenuti obrt u FBiH
        </a>
        ,{" "}
        <a
          href="https://oktk.ba/2023/04/11/detaljno-uputstvo-kako-pokrenuti-obrt-u-fbih/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Obrtnička komora TK
        </a>
        – Zakon o obrtu FBiH, Zakon o porezu na dohodak FBiH (čl. 12, 19, 31),
        Zakon o doprinosima FBiH (čl. 6 i 9). Iznosi taksi su za Kanton
        Sarajevo i variraju po općinama.
      </p>
    </>
  );
}
