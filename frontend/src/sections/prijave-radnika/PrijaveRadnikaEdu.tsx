import styles from "./prijaveRadnikaEdu.module.css";

// Server-rendered edukativni sadržaj (SEO) za /prijave-radnika.
// Pojavljuje se ispod aktivnog taba (JS3100 ili Obračun plata).
export default function PrijaveRadnikaEdu() {
  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h2>
          Obračun plata i prijava radnika u <em>FBiH</em>
        </h2>
        <p>
          Na stranici <strong>Obračun plata + JS3100</strong> objedinjene su sve
          mjesečne obaveze prema radnicima u Federaciji BiH — od prijave novog
          radnika u Jedinstveni sistem registracije (JS3100), preko obračuna
          bruto/neto plate sa svim doprinosima i porezima, do generisanja
          uplatnica za banku, Obrazaca 2001 i 2002, te platnih listića za
          potpis radnika.
        </p>
        <p>
          Aplikacija auto-popunjava sve podatke o organizaciji (naziv, JIB,
          adresa, opcina) i radnicima (ime, JMB, ugovor, bruto plata) iz vašeg
          profila, tako da svaki mjesečni obračun traje minutama umjesto sati.
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          JS3100 — <em>prijava i odjava</em> radnika
        </h2>
        <p>
          <strong>JS3100</strong> je obrazac za prijavu, odjavu ili promjenu
          podataka osiguranika u Jedinstvenom sistemu registracije, kontrole i
          naplate doprinosa u FBiH. Podnosi ga poslodavac u nadležnoj poreznoj
          ispostavi za svakog radnika koji ulazi u ili izlazi iz osiguranja.
        </p>
        <p>Rokovi:</p>
        <ul>
          <li>
            <strong>Prijava radnika:</strong> najkasnije dan prije početka rada.
          </li>
          <li>
            <strong>Odjava radnika:</strong> u roku od 7 dana od dana prestanka
            radnog odnosa.
          </li>
          <li>
            <strong>Promjena podataka:</strong> u zakonskom roku od nastanka
            promjene (npr. promjena adrese, plate, zanimanja).
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>
          Mjesečni <em>obračun plata</em> u FBiH
        </h2>
        <p>
          Iz bruto plate radnika obračunavaju se <strong>doprinosi iz plate</strong>{" "}
          (31% ukupno): PIO/MIO 17%, zdravstveno 12,5% i osiguranje od
          nezaposlenosti 1,5%. Na poreznu osnovicu (bruto − doprinosi − lični
          odbitak) primjenjuje se porez na dohodak po stopi od 10%.
        </p>
        <p>
          Poslodavac uz to plaća i <strong>doprinose na bruto platu</strong>{" "}
          (10,5%): PIO/MIO 6%, zdravstveno 4%, nezaposlenost 0,5%. Dodatno
          opća vodna naknada 0,5% i naknada za zaštitu od prirodnih nesreća
          0,5%. Za privredna društva (d.o.o./d.d.) još i fond OSI 0,5%; obrti
          su izuzeti.
        </p>
        <p>
          Aplikacija automatski generiše sve zbirne uplatnice po vrstama
          prihoda — PIO, zdravstveno (kantonalno + federalno), nezaposlenost
          (kantonalno + federalno), porez na dohodak po opcinama, vodna i
          naknada za nesreće — sve sa ispravnim brojevima žiro računa,
          šiframa vrste prihoda i opcinama prema sjedištu obrta i prebivalištu
          radnika.
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          Lista naloga za plaćanje i <em>specifikacije po radniku</em>
        </h2>
        <p>
          Pored zbirnih uplatnica i pojedinačnih platnih listića, aplikacija
          generiše i <strong>rekapitulacijske dokumente</strong> koji se obično
          predaju banci uz spisak isplata:
        </p>
        <ul>
          <li>
            <strong>Lista naloga za plaćanje</strong> — pregled svih naloga koje
            banka treba izvršiti za taj mjesec: doprinosi razdvojeni po vrstama
            (PIO, zdravstveno kantonalno/federalno, nezaposlenost
            kantonalna/federalna, porez na dohodak, fond invalida, vodna,
            nesreće) sa međuzbirom, zbirne isplate radnicima (neto plate, topli
            obrok, regres, putni trošak) i konačni ukupan zbir. Za obrt se
            doprinosi razdvajaju na poseban set za vlasnika i za radnike.
          </li>
          <li>
            <strong>Specifikacije po radniku</strong> — detaljan popis ko prima
            koliko i na koji žiro račun, razdvojeno po vrstama isplata: neto
            plate, topli obrok, putni trošak i regres. Svaka sekcija ima
            međuzbir, a na kraju je ukupan zbir svega. Banke ovo često traže
            kao prilog uz listu naloga.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>
          Obrazac 2001 i Obrazac 2002 — <em>razlika</em>
        </h2>
        <p>
          <strong>Obrazac 2001</strong> je mjesečna specifikacija isplata plata,
          doprinosa i poreza koja se podnosi PU FBiH za <strong>radnike</strong>.
          Generiše se iz mjesečnog obračuna i pokriva sve isplate u tom mjesecu.
        </p>
        <p>
          <strong>Obrazac 2002</strong> je mjesečna prijava poreza i doprinosa
          za <strong>vlasnike obrta i samostalnih djelatnosti</strong>. Predaje
          se do 10. u mjesecu za prethodni mjesec. Aplikacija ga generiše po
          vlasniku iz mjesečnog obračuna i fiksne osnovice prema poreznom
          režimu (paušalni ili stvarni rashodi).
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          MIP-1023 — <em>mjesečni izvještaj</em> o isplaćenim plaćama
        </h2>
        <p>
          <strong>MIP-1023</strong> je mjesečni izvještaj o isplaćenim plaćama,
          doprinosima i porezu na dohodak koji se podnosi Poreznoj upravi FBiH
          za svaki mjesec u kojem je bilo isplata. Obrazac sadrži podatke o
          poslodavcu (JIB, šifra djelatnosti, broj zaposlenih), zbirne iznose
          prihoda i doprinosa, te red po radniku sa svim relevantnim stavkama
          obračuna (bruto, doprinosi iz, lični odbitak, osnovica poreza, iznos
          poreza, sati, opcina prebivališta).
        </p>
        <p>
          <strong>Rok predaje:</strong> do 10. u mjesecu za prethodni mjesec,
          istovremeno s Obrascem 2001. MIP se predaje elektronski kroz nPIS
          (Nacionalni Porezni Informacijski Sistem) putem XML paketnog uvoza,
          ili se može odštampati i predati u nadležnoj poreznoj ispostavi.
        </p>
        <p>
          Aplikacija generiše MIP-1023 u dvije varijante: <strong>PDF</strong>{" "}
          (popunjen obrazac sa do 5 radnika po stranici, multi-page za veći broj
          radnika) i <strong>XML</strong> (paketni format spreman za uvoz u
          nPIS).
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          GIP-1022 — <em>godišnji izvještaj</em> o ukupno isplaćenim plaćama
        </h2>
        <p>
          <strong>GIP-1022</strong> je godišnji izvještaj o ukupno isplaćenim
          plaćama i drugim ličnim primanjima zaposlenika, koji poslodavac
          podnosi PU FBiH na kraju kalendarske godine. Sastoji se od{" "}
          <strong>jednog obrasca po radniku</strong> sa pregledom svih 12
          mjeseci i kumulativnim zbirom za godinu (ukupan prihod, doprinosi,
          lični odbici, porez na dohodak, neto isplata).
        </p>
        <p>
          <strong>Rok predaje:</strong> do 28. februara naredne godine. GIP se
          može predati elektronski kroz nPIS putem XML paketnog uvoza ili u
          štampanoj formi za svakog radnika pojedinačno.
        </p>
        <p>
          Aplikacija generiše GIP-1022 u tri varijante:{" "}
          <strong>PDF (sve u jednom)</strong> — svi radnici u jednom kombinovanom
          PDF-u za lakšu štampu;{" "}
          <strong>ZIP</strong> — zaseban PDF po radniku za individualnu predaju;
          i <strong>XML</strong> — paketni format sa svim radnicima u jednom
          fajlu, spreman za uvoz u nPIS. Vlasnici obrta su izuzeti iz GIP-a (oni
          se prijavljuju kroz Obrazac 2002 i godišnju poreznu prijavu obrtnika).
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          Auto-popuna i <em>višestruke organizacije</em>
        </h2>
        <p>
          Svi podaci o organizaciji i radnicima čuvaju se u profilu i
          auto-popunjavaju u svim obrascima i obračunima. Knjigovođe mogu
          upravljati neograničenim brojem klijentskih organizacija sa jednog
          naloga uz Business pretplatu.
        </p>
        <p>
          Klijenti mogu dijeliti pristup svojoj organizaciji sa knjigovođom
          putem email poziva u Profil → Članovi → Pozovi člana.
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          Kako koristiti — <em>brzi vodič</em>
        </h2>
        <p>
          Mjesečni obračun plata u aplikaciji od prijave radnika do podnošenja
          poreznih obrazaca:
        </p>
        <ol>
          <li>
            <strong>Postaviti radnika</strong> — u{" "}
            <a href="/aktivni-radnici">Aktivni radnici</a> ili kroz Profil →
            Radnici dodaj radnika (ime, JMB, adresa, bruto plata, datum
            prijave, ugovorene sate). Generiši <strong>JS3100</strong> obrazac
            za prijavu u Poreznu upravu (tab JS3100 prijava/odjava).
          </li>
          <li>
            <strong>Otvoriti mjesečni obračun</strong> — pređi na tab{" "}
            <em>Obračun plata</em>, odaberi organizaciju, godinu i mjesec.
            Aplikacija prikazuje listu aktivnih radnika za taj mjesec.
          </li>
          <li>
            <strong>Unijeti satnicu i dodatke</strong> — klikom na radnika
            otvara se detalj sa poljima: bruto osnovica (iz ugovora), neto
            (preračunava se automatski), broj radnih sati, bolovanje,
            prekovremeni rad, noćni rad, nedjelje i praznici. U sekciji{" "}
            <em>Neoporezivi dodaci</em> upiši topli obrok, regres i putni
            trošak. Klikom na <em>Obračunaj</em> sistem računa doprinose i
            porez. Šihterica se automatski preuzima ako postoji za taj mjesec.
          </li>
          <li>
            <strong>Obračunaj sve</strong> — kad svi radnici imaju popunjene
            podatke, jedan klik na <em>Obračunaj sve</em> obračuna sve radnike
            odjednom. Sumirani prikaz pokazuje ukupan bruto, neto, doprinose,
            porez i trošak poslodavca.
          </li>
          <li>
            <strong>Postaviti datum isplate</strong> — odaberi datum kada
            će plate biti isplaćene (default je posljednji dan mjeseca). Datum
            ide u uplatnice, platne listiće i Obrazac 2001.
          </li>
          <li>
            <strong>Preuzeti dokumente za banku</strong> — grupa{" "}
            <em>Za isplatu plata (banka)</em>: <strong>Platni listići</strong>{" "}
            (jedan PDF, stranica po radniku za potpis),{" "}
            <strong>Uplatnice</strong> (PDF sa svim virmanima za doprinose i
            poreze), <strong>Lista naloga</strong> (rekapitulacija svih
            naloga), <strong>Specifikacije po radniku</strong> (popis ko prima
            koliko po vrsti isplate).
          </li>
          <li>
            <strong>Preuzeti obrasce za Poreznu upravu</strong> — grupa{" "}
            <em>Za poreznu upravu (PUFBiH)</em>: <strong>Obrazac 2001</strong>{" "}
            (mjesečna specifikacija isplata), <strong>MIP-1023</strong> (PDF
            za štampu ili XML za nPIS paketni uvoz). Predaja je do 10. u
            mjesecu za prethodni mjesec.
          </li>
          <li>
            <strong>Označiti kao isplaćeno</strong> — nakon što se izvrše
            uplate u banci, klik na <em>Označi sve obračune kao isplaćene</em>{" "}
            mijenja status obračuna iz <em>Obračunato</em> u{" "}
            <em>Isplaćeno</em>.
          </li>
          <li>
            <strong>Krajem godine — GIP-1022</strong> — godišnji izvještaj
            po radniku za PUFBiH (rok 28. februar naredne godine). Generiši{" "}
            <strong>GIP-1022</strong> u tri varijante: kombinovani PDF za
            štampu, ZIP sa zasebnim fajlom po radniku, ili XML za nPIS.
          </li>
          <li>
            <strong>Odjava radnika</strong> — kada radnik napušta firmu,
            kroz JS3100 tab generiši obrazac odjave u roku od 7 dana od
            prestanka radnog odnosa.
          </li>
        </ol>
        <p>
          <strong>Savjet za knjigovođe:</strong> kroz Business pretplatu možeš
          upravljati neograničenim brojem klijentskih organizacija.
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          Povezani <em>alati</em>
        </h2>
        <ul>
          <li>
            <a href="/aktivni-radnici">Aktivni radnici</a> — centralni pregled
            svih radnika sa statusom prijave, ugovorima i brzim akcijama.
          </li>
          <li>
            <a href="/ugovor-o-radu">Ugovor o radu i otkaz</a> — generator
            ugovora sa auto-popunom iz profila (Business pretplata).
          </li>
          <li>
            <a href="/sihterica">Šihterica</a> — evidencija radnog vremena za
            tačan obračun sati i prekovremenog rada.
          </li>
          <li>
            <a href="/preracun-neto-bruto">Preračun neto/bruto plate</a> — brza
            provjera obračuna za jedan iznos.
          </li>
          <li>
            <a href="/javni-prihodi">Uplatni računi javnih prihoda</a> — sve
            šifre i žiro računi za uplatu doprinosa i poreza.
          </li>
        </ul>
      </section>
    </div>
  );
}
