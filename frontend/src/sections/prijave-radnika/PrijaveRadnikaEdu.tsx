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
