import styles from "../sihterica/sihtericaEdu.module.css";

// Server-rendered edukativni sadržaj (SEO + AdSense) za /fakture i /fakture/nova.
// Pojavljuje se ispod alata da bi crawler vidio puni tekstualni sadržaj.
export default function FaktureEdu() {
  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h2>
          Fakture, predračuni i računi u <em>FBiH</em>
        </h2>
        <p>
          <strong>Faktura</strong> (račun) je dokument kojim prodavac
          potražuje plaćanje za isporučenu robu ili izvršenu uslugu. Po Zakonu
          o PDV-u BiH, svaki PDV obveznik mora izdati fakturu za svaku
          isporuku, sa propisanim podacima: ime/naziv kupca i prodavca, ID i
          PDV broj, datum isporuke, opis robe/usluge, jedinična cijena,
          količina, rabat, osnovica PDV-a, stopa PDV-a (17%) i ukupan iznos.
        </p>
        <p>
          <strong>Predračun</strong> (profaktura) je ponuda kupcu prije
          isporuke. Nije porezni dokument, ne ulazi u PDV knjige, ali se često
          koristi za uplatu unaprijed (avans). Kada kupac plati po
          predračunu, izdaje se konačna faktura.
        </p>
        <p>
          Aplikacija pravi oba dokumenta u jednom toku, sa istom formom i
          istom numeracijom, plus automatsko popunjavanje podataka prodavca iz
          vašeg profila i podataka kupca iz vaše baze klijenata.
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          <em>Obavezni</em> elementi fakture po Zakonu o PDV-u BiH
        </h2>
        <ul>
          <li>
            <strong>Broj fakture</strong> i datum izdavanja (numeracija mora
            biti uzlazna i bez praznina).
          </li>
          <li>
            <strong>Datum isporuke</strong> robe ili izvršenja usluge (može
            biti isti kao datum fakture).
          </li>
          <li>
            <strong>Naziv, adresa, ID i PDV broj prodavca</strong>.
          </li>
          <li>
            <strong>Naziv, adresa, ID</strong> kupca (i PDV broj ako je
            obveznik).
          </li>
          <li>
            <strong>Količina i naziv robe/usluge</strong>, jedinična cijena
            bez PDV-a, ukupna vrijednost.
          </li>
          <li>
            <strong>Rabat ili popust</strong>, ako se primjenjuje.
          </li>
          <li>
            <strong>Osnovica za PDV</strong>, stopa PDV-a (17% standardno, 0%
            za izvoz), iznos PDV-a.
          </li>
          <li>
            <strong>Ukupan iznos za plaćanje</strong> (bruto, sa PDV-om).
          </li>
          <li>
            <strong>Način plaćanja</strong>, rok plaćanja, broj računa u
            banci.
          </li>
        </ul>
        <p>
          Za neoporezive isporuke ili usluge ka EU treba navesti i pravnu
          osnovicu izuzeća (npr. član 27. Zakona o PDV-u za izvoz).
        </p>
      </section>

      <section className={styles.section}>
        <h2>
          Razlika između <em>fakture, predračuna, profakture i predujma</em>
        </h2>
        <ul>
          <li>
            <strong>Faktura (račun)</strong> — porezni dokument, evidentira
            se u KIF/KUF, izaziva PDV obavezu.
          </li>
          <li>
            <strong>Predračun</strong> — ponuda za uplatu unaprijed, nije
            porezni dokument, ne ulazi u PDV evidenciju. Najčešće se izdaje
            kada kupac plaća prije isporuke.
          </li>
          <li>
            <strong>Profaktura</strong> — sinonim za predračun. Često se
            koristi u međunarodnoj trgovini.
          </li>
          <li>
            <strong>Predujam (avansni račun)</strong> — porezni dokument za
            uplaćenu akontaciju. Izdaje se po prijemu uplate, sa pripadajućim
            PDV-om koji ulazi u tekuću prijavu.
          </li>
          <li>
            <strong>Storno fakture</strong> — dokument kojim se anulira
            ranije izdana faktura (npr. zbog povrata robe). Mora imati
            referencu na originalnu fakturu.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>
          Kako napraviti fakturu <em>korak po korak</em>
        </h2>
        <ol>
          <li>
            <strong>Odaberite tip dokumenta</strong>: Faktura, Predračun ili
            Profaktura.
          </li>
          <li>
            <strong>Odaberite svoju djelatnost</strong> kao prodavca —
            podaci (naziv, adresa, ID, PDV broj, žiro račun) auto-popunjavaju
            se iz profila.
          </li>
          <li>
            <strong>Odaberite kupca</strong> iz baze klijenata ili unesite
            ručno. Sa Pro pretplatom čuva se za sljedeću fakturu.
          </li>
          <li>
            <strong>Dodajte stavke</strong>: naziv, jedinica mjere, količina,
            cijena bez PDV-a. Aplikacija automatski računa osnovicu, rabat,
            PDV (17%) i ukupan iznos.
          </li>
          <li>
            <strong>Provjerite numeraciju</strong> — automatski je uzlazna po
            godini i tipu dokumenta. Možete ručno postaviti broj ako
            započinjete iz neke postojeće serije.
          </li>
          <li>
            <strong>Snimite i preuzmite PDF</strong> — uz Pro pretplatu PDF
            se generiše i čuva u arhivi, spreman za slanje klijentu
            mailom ili štampu.
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2>
          Često postavljana <em>pitanja</em>
        </h2>
        <p>
          <strong>Mogu li napraviti fakturu bez Pro pretplate?</strong>
        </p>
        <p>
          Formu možete popunjavati besplatno i vidjeti živi pregled fakture
          sa svim obračunima. Snimanje i preuzimanje PDF-a (čuvanje fakture u
          arhivi, ponovni izvoz) dostupno je uz Pro ili Business pretplatu.
          Svaki novi nalog dobija 30 dana Pro pretplate besplatno.
        </p>

        <p>
          <strong>Kako se računa rabat na stavkama?</strong>
        </p>
        <p>
          Rabat se unosi kao postotak po stavci i smanjuje osnovicu (cijenu
          bez PDV-a) prije obračuna PDV-a. Ukupan rabat se prikazuje na
          fakturi kao zasebna stavka, a osnovica za PDV se računa nakon
          rabata.
        </p>

        <p>
          <strong>Jesam li dužan obračunati PDV ako nisam PDV obveznik?</strong>
        </p>
        <p>
          Ne. Ako niste registrovani kao PDV obveznik kod UINO, ne smijete
          obračunavati ni iskazivati PDV na fakturi. Na profilu označite da
          niste PDV obveznik — aplikacija će izdati faktu bez PDV-a sa
          napomenom &quot;Nije iskazan PDV po članu 44. Zakona o PDV-u&quot;.
        </p>

        <p>
          <strong>Mogu li u istoj fakturi imati stavke sa različitim stopama PDV-a?</strong>
        </p>
        <p>
          Da. Standardna stopa u BiH je 17%, a 0% se primjenjuje na izvoz i
          neke posebne kategorije. Aplikacija pravi razdvojenu rekapitulaciju
          po stopama na dnu fakture.
        </p>

        <p>
          <strong>Kako numerišu fakture po godini?</strong>
        </p>
        <p>
          Numeracija se resetuje 1. januara i prati format koji odaberete
          (npr. <code>2026-001</code>, <code>F-001/2026</code>,{" "}
          <code>001-2026</code>). Aplikacija automatski uzima sljedeći
          slobodni broj po vašoj djelatnosti i tipu dokumenta.
        </p>

        <p>
          <strong>Mogu li poslati fakturu klijentu direktno iz aplikacije?</strong>
        </p>
        <p>
          Da. Nakon kreiranja fakture možete je poslati emailom klijentu
          direktno iz arhive — PDF se prikači kao attachment, sa standardnim
          tekstom koji možete editovati.
        </p>

        <p>
          <strong>Šta sa storno fakturama i ispravkama?</strong>
        </p>
        <p>
          Možete kreirati storno fakturu koja referencira originalnu —
          aplikacija povezuje dva dokumenta i prikazuje u arhivi pored
          originalne fakture. Za ispravke izdajte novu fakturu s referencom
          na originalnu.
        </p>
      </section>
    </div>
  );
}
