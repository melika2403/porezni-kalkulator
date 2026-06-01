import styles from "./sihtericaEdu.module.css";

// Server-rendered edukativni sadržaj (SEO + AdSense) za /sihterica.
// Pojavljuje se ispod alata da bi crawler vidio puni tekstualni sadržaj.
export default function SihtericaEdu() {
  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h2>
          Šta je <em>šihterica</em> i ko je dužan voditi
        </h2>
        <p>
          <strong>Šihterica</strong> je obrazac evidencije radnog vremena
          radnika koji svaki poslodavac u <strong>Federaciji BiH</strong> mora
          voditi prema <strong>Zakonu o radu FBiH</strong> i Pravilniku o
          sadržaju i načinu vođenja evidencije radnika. Obavezna je za svakog
          radnika u radnom odnosu, bez obzira na vrstu ugovora (određeno,
          neodređeno, puno ili nepuno radno vrijeme).
        </p>
        <p>
          Obrazac sadrži: dnevni početak i kraj rada, pauzu, ukupne dnevne
          sate, prekovremene sate, terenski rad, pripravnost, šifre odsustva
          (godišnji, bolovanje, praznici, porodiljsko) i mjesečni zbir sati.
          Šihterica je osnov za obračun plate, doprinosa i regresa, pa je
          vode i poslodavci i knjigovođe.
        </p>
        <p>
          U inspekciji rada šihterica je prvi dokument koji se traži, jer
          dokazuje da poslodavac poštuje propisana radna vremena, prekovremene
          sate i prava na odmor.
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          Kako se <em>računaju</em> ukupni sati
        </h2>
        <p>
          Logika obračuna je sljedeća:
        </p>
        <ul>
          <li>
            <strong>Radni dan</strong>: ukupni sati = (Kraj − Početak) − Pauza.
          </li>
          <li>
            <strong>Ručno upisana vremena uvijek pobjeđuju</strong>: ako
            upišete Početak i Kraj, dan se računa po vremenima, bez obzira na
            kod odsustva.
          </li>
          <li>
            <strong>Plaćena odsustva bez upisanih vremena</strong> (godišnji
            9.1, praznik 9.2, bolovanje 9.3, porodiljsko 9.4, plaćeno 9.5)
            računaju se kao <strong>puni radni dan</strong> u mjesečnom fondu.
          </li>
          <li>
            <strong>Sedmični odmor</strong> (subota/nedjelja, ako je
            označeno) uvijek 0 sati.
          </li>
          <li>
            <strong>Neplaćena odsustva</strong> (9.6, 9.7, 9.8, 9.9, 9.10) se
            ne računaju u ukupne sate.
          </li>
        </ul>
        <p>
          Kroz panel <strong>Auto-popuna</strong> možete birati da li se 9.1,
          9.2 i 9.3 računaju kao puni dan ili kao 0 sati — postavka se pamti
          po korisniku.
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          <em>Šifre odsustva</em> u šihterici (FBiH)
        </h2>
        <p>
          Standardne šifre koje koristi šihterica:
        </p>
        <ul>
          <li>
            <strong>9.1</strong> — godišnji ili sedmični odmor
          </li>
          <li>
            <strong>9.2</strong> — državni praznik
          </li>
          <li>
            <strong>9.3</strong> — bolovanje
          </li>
          <li>
            <strong>9.4</strong> — porodiljsko / roditeljsko odsustvo
          </li>
          <li>
            <strong>9.5</strong> — plaćeno odsustvo (smrt u porodici, vjenčanje,
            krv)
          </li>
          <li>
            <strong>9.6</strong> — neplaćeno odsustvo
          </li>
          <li>
            <strong>9.7</strong> — neprisutnost po zahtjevu radnika
          </li>
          <li>
            <strong>9.8</strong> — neprisutnost krivicom radnika
          </li>
          <li>
            <strong>9.9</strong> — štrajk
          </li>
          <li>
            <strong>9.10</strong> — lockout (isključenje s rada)
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>
          Kako popuniti šihtericu <em>korak po korak</em>
        </h2>
        <ol>
          <li>
            <strong>Registrujte se besplatno</strong> i dodajte podatke svoje
            djelatnosti (obrt ili firma) na profilu.
          </li>
          <li>
            U sekciji <strong>Radnici</strong> unesite ime, JMBG i datum
            početka radnog odnosa.
          </li>
          <li>
            Odaberite <strong>mjesec</strong> i godinu za evidenciju.
          </li>
          <li>
            U panelu <strong>Auto-popuna</strong> postavite: standardni
            početak i kraj rada (npr. 08:00 do 16:00), pauza (npr. 30 min),
            slobodne dane u sedmici (npr. subota i nedjelja), godišnji odmor,
            praznike i bolovanje za mjesec.
          </li>
          <li>
            Aplikacija će automatski popuniti sve dane u mjesecu. Pojedinačne
            dane možete ručno korigovati.
          </li>
          <li>
            Kliknite <strong>Preuzmi PDF</strong> za popunjeni obrazac
            evidencije. Pro pretplata pokriva PDF preuzimanje i bulk export
            svih radnika u ZIP.
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2>
          Često postavljana <em>pitanja</em>
        </h2>
        <p>
          <strong>Da li je šihterica besplatna?</strong>
        </p>
        <p>
          Unos i popunjavanje šihterice u aplikaciji su besplatni nakon
          registracije. PDF preuzimanje i bulk export svih radnika dostupni
          su uz Pro ili Business pretplatu. Svaki novi nalog dobija 30 dana
          Pro pretplate besplatno, bez kartice.
        </p>

        <p>
          <strong>Vrijedi li PDF iz aplikacije pred inspekcijom rada?</strong>
        </p>
        <p>
          Da. Generisani PDF slijedi propisani format evidencije radnog
          vremena u FBiH (datum, početak, kraj, pauza, ukupni dnevni sati,
          terenski, pripravnost, odsustvo, mjesečni zbir). Poslodavac
          potpisom i pečatom potvrđuje vjerodostojnost.
        </p>

        <p>
          <strong>Koliko prekovremenih sati radnik može imati?</strong>
        </p>
        <p>
          Po Zakonu o radu FBiH, prekovremeni rad ne smije prelaziti 8 sati
          sedmično ni 32 sata mjesečno. Šihterica automatski razdvaja
          redovne i prekovremene sate na osnovu zakonskog dnevnog fonda.
        </p>

        <p>
          <strong>Mogu li podijeliti šihtericu sa knjigovođom?</strong>
        </p>
        <p>
          Da. Sa Business pretplatom možete pozvati knjigovođu da vidi i
          uređuje evidenciju vaše djelatnosti. Knjigovođa kroz svoj nalog
          može preuzimati šihterice za sve klijente kojima ima pristup.
        </p>

        <p>
          <strong>Čuvaju li se mjeseci iz prethodnih godina?</strong>
        </p>
        <p>
          Da. Svaki popunjeni mjesec ostaje u arhivi po radniku. Možete se
          vratiti na bilo koji prethodni mjesec, ponovo preuzeti PDF ili
          kopirati u novi mjesec.
        </p>

        <p>
          <strong>Šta ako radnik radi u smjenama?</strong>
        </p>
        <p>
          Auto-popuna pokriva standardno radno vrijeme. Za rad u smjenama
          ručno korigujte početak i kraj svakog dana — ručno upisana vremena
          uvijek pobjeđuju nad auto-popunom.
        </p>
      </section>
    </div>
  );
}
