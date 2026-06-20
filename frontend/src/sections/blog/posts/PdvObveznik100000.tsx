import Link from "next/link";
import styles from "../blog.module.css";

export default function PdvObveznik100000() {
  return (
    <>
      <p className={styles.lead}>
        Mnogi obrtnici i mala firme se pitaju kada moraju ući u PDV sistem.
        Od 2. decembra 2023. godine prag za obaveznu registraciju je{" "}
        <strong>100.000 KM</strong> godišnjeg oporezivog prometa (povećan
        sa 50.000 KM). U ovom članku objašnjavamo šta sve ulazi u taj
        promet, kada tačno morate podnijeti zahtjev kod UINO, šta se mijenja
        u poslovanju, i da li ima smisla registrovati se dobrovoljno prije
        praga.
      </p>

      <h2>Šta je PDV obveznik</h2>
      <p>
        PDV obveznik je svako pravno ili fizičko lice koje obavlja
        gospodarsku djelatnost i koje je upisano u Jedinstveni registar
        obveznika indirektnih poreza kod Uprave za indirektno oporezivanje
        BiH (UINO). PDV obveznik:
      </p>
      <ul>
        <li>Mora obračunavati PDV (17%) na svakoj fakturi</li>
        <li>Smije odbijati ulazni PDV (na svoje nabavke)</li>
        <li>Vodi knjige ulaznih i izlaznih faktura (KUF i KIF)</li>
        <li>
          Mjesečno (ili kvartalno za male obveznike) podnosi PDV prijavu i
          uplaćuje razliku UINO
        </li>
      </ul>

      <h2>Prag za obaveznu registraciju: 100.000 KM</h2>
      <p>
        Po članu 57. stav 1. Zakona o porezu na dodanu vrijednost BiH,
        obavezni ste registrovati se kao PDV obveznik ako vaš{" "}
        <strong>godišnji oporezivi promet pređe 100.000 KM</strong> ili je
        izgledno da će preći taj iznos.
      </p>
      <p>
        Ovaj prag je povećan sa ranijih 50.000 KM. Izmjene Zakona o PDV-u
        su usvojene 24. novembra 2023. i stupile na snagu 2. decembra
        2023. godine.
      </p>

      <h2>Šta se računa u oporezivi promet</h2>
      <p>
        U promet za prag se računa:
      </p>
      <ul>
        <li>Sve isporuke roba i usluga u BiH</li>
        <li>Izvoz robe i usluga (iako su izvozi 0% stopa, ulaze u promet)</li>
        <li>Svi prihodi od osnovne djelatnosti</li>
      </ul>
      <p>
        Ne računaju se: prihodi od prodaje stalnih sredstava, finansijski
        prihodi (kamate), donacije, naknade štete.
      </p>

      <h2>Kada konkretno morate podnijeti zahtjev</h2>
      <p>
        Zahtjev za registraciju u PDV sistem podnosite UINO{" "}
        <strong>
          najkasnije do 20. u kalendarskom mjesecu koji slijedi mjesec u
          kojem ste prešli (ili je izgledno da ćete preći) prag od 100.000 KM
        </strong>
        .
      </p>
      <p>
        Primjer: ako u martu 2026. vaš ukupan promet od početka godine
        dostigne 100.000 KM, zahtjev morate podnijeti do 20. aprila 2026.
        UINO će vas registrovati i izdati PDV broj.
      </p>
      <p>
        Ako ne prijavite na vrijeme, UINO može uraditi{" "}
        <strong>retroaktivnu registraciju po službenoj dužnosti</strong> sa
        kaznama. To znači da ćete morati platiti PDV za period kad ste već
        trebali biti obveznik, plus kazne i kamate.
      </p>

      <h2>Šta se mijenja kad postanete PDV obveznik</h2>

      <h3>1. Sve fakture moraju imati PDV</h3>
      <p>
        Na svakoj fakturi iskazujete: osnovicu, stopu PDV-a (17%), iznos
        PDV-a, ukupan iznos sa PDV-om. Naša aplikacija za{" "}
        <Link href="/fakture">fakture</Link> automatski računa i prikazuje
        sve obavezne elemente.
      </p>

      <h3>2. Vođenje KUF i KIF</h3>
      <p>
        <strong>KUF</strong> (knjiga ulaznih faktura) i <strong>KIF</strong>{" "}
        (knjiga izlaznih faktura) su evidencije koje su PDV obveznici dužni
        voditi. UINO traži dostavljanje tih knjiga u elektronskom formatu do
        20. u mjesecu za prethodni mjesec.
      </p>

      <h3>3. Mjesečna PDV prijava</h3>
      <p>
        Do 10. u mjesecu za prethodni mjesec podnosite PDV prijavu UINO i
        uplaćujete razliku između izlaznog i ulaznog PDV-a. Ako je ulazni
        veći od izlaznog (npr. mjesec kad ste kupili puno opreme), ostaje
        pretplaćeni iznos za prebijanje u sljedećim mjesecima.
      </p>

      <h3>4. Pravo na odbitak ulaznog PDV-a</h3>
      <p>
        Ovo je glavna prednost statusa obveznika: PDV koji platite na
        nabavke (oprema, materijal, usluge) odbijate od PDV-a koji
        naplatite od kupaca. Ne plaća se PDV dva puta.
      </p>

      <h3>5. Kontrola i revizije</h3>
      <p>
        PDV obveznici su češće na meti kontrole UINO. Sva dokumentacija mora
        biti uredna 5+ godina unazad.
      </p>

      <h2>Konkretan primjer: obrtnik PDV obveznik</h2>
      <p>
        Programer obrtnik, godišnji prihod 120.000 KM. U martu 2026. pređe
        prag.
      </p>
      <ol>
        <li>
          Do 20. aprila 2026. podnosi zahtjev kod UINO za registraciju u PDV
          sistem
        </li>
        <li>UINO ga registruje, dobija PDV broj</li>
        <li>
          Od datuma registracije, sve nove fakture izdaje sa PDV-om 17%
        </li>
        <li>Počinje voditi KUF i KIF, mjesečno ih predaje UINO</li>
        <li>
          Mjesečno do 10. u mjesecu predaje PDV prijavu i uplaćuje razliku
          PDV-a
        </li>
        <li>
          Pri godišnjoj prijavi (<Link href="/gpd">GPD-1051</Link> do
          31.03.), prihodi se prijavljuju bez PDV-a (PDV nije njegov prihod
          ni rashod)
        </li>
      </ol>

      <h2>Da li se isplati dobrovoljno registrovati prije praga?</h2>
      <p>
        Da, ako:
      </p>
      <ul>
        <li>
          <strong>Većina vaših kupaca su PDV obveznici</strong> (firme):
          oni mogu odbiti PDV pa im nije problem što plaćaju 17% više
        </li>
        <li>
          <strong>Imate značajne ulazne troškove</strong> (oprema, materijal,
          podizvođači sa PDV-om): možete odbiti ulazni PDV
        </li>
        <li>
          <strong>Planirate izvoz</strong>: izvoz je 0% PDV, ali ulazni PDV
          se može refundirati
        </li>
        <li>
          <strong>Vaši konkurenti su PDV obveznici</strong>: percepcija
          ozbiljnosti kod B2B klijenata
        </li>
      </ul>
      <p>
        Ne isplati se ako:
      </p>
      <ul>
        <li>
          Većina vaših kupaca su fizička lica koja ne mogu odbiti PDV (oni
          de facto plaćaju cijenu višu za 17%)
        </li>
        <li>
          Vaši ulazni troškovi su mali (nemate ulazni PDV za odbitak)
        </li>
        <li>
          Ne želite administrativni teret mjesečnih prijava i KUF/KIF
        </li>
      </ul>

      <h2>Procedura registracije korak po korak</h2>
      <ol>
        <li>
          <strong>Popunjavanje zahtjeva PDV-1</strong> (obrazac za upis u
          Jedinstveni registar obveznika indirektnih poreza)
        </li>
        <li>
          Predaja zahtjeva u nadležnu regionalnu kancelariju UINO (ovisno od
          sjedišta firme)
        </li>
        <li>
          Prilaganje: rješenje o registraciji obrta ili firme, JIB, lična
          isprava vlasnika, ugovor o poslovnom prostoru
        </li>
        <li>
          UINO obrađuje zahtjev (tipično 7-14 dana) i izdaje{" "}
          <strong>PDV broj</strong>
        </li>
        <li>
          Sa PDV brojem počinjete izdavati fakture sa PDV-om i voditi
          KUF/KIF
        </li>
      </ol>

      <h2>Najčešća pitanja</h2>

      <p>
        <strong>
          Šta ako je moj promet 95.000 KM godišnje?
        </strong>
      </p>
      <p>
        Ne morate biti PDV obveznik (ispod ste praga). Možete se
        dobrovoljno registrovati ako vam to ima ekonomskog smisla.
      </p>

      <p>
        <strong>Šta ako preskočim 100.000 KM samo u jednoj godini?</strong>
      </p>
      <p>
        Postajete obveznik. Ako sljedeće godine padnete ispod, možete
        zatražiti deregistraciju, ali UINO obično traži da budete u sistemu
        minimum 12 mjeseci.
      </p>

      <p>
        <strong>Kakav je tretman izvoza u EU?</strong>
      </p>
      <p>
        Izvoz robe i usluga u inostranstvo je oslobođen PDV-a sa pravom
        odbitka (0% stopa). Trebate dokaze o izvozu (carinska deklaracija,
        izvozni dokumenti). Ulazni PDV se i dalje može odbiti.
      </p>

      <p>
        <strong>Mogu li biti paušalni obrtnik a PDV obveznik?</strong>
      </p>
      <p>
        Da. Paušalni režim oporezivanja dohotka (član 31 ZPD FBiH) je
        nezavisan od PDV registracije. Paušalni obrtnik može biti PDV
        obveznik (i obrnuto, ne mora). Iako, paušalni obrti rijetko prelaze
        prag od 100.000 KM.
      </p>

      <p>
        <strong>Kako se obračunava PDV na fakturi?</strong>
      </p>
      <p>
        Najjednostavnije: cijena bez PDV-a × 1,17 = cijena sa PDV-om. Iz
        cijene sa PDV-om: × (17/117) = PDV iznos. Naš{" "}
        <Link href="/pdv-kalkulator">PDV kalkulator</Link> radi to u oba
        smjera za bilo koji iznos.
      </p>

      <p>
        <strong>Šta sa prodajom u Republiku Srpsku?</strong>
      </p>
      <p>
        Prodaja u RS i Brčko Distrikt se računa kao domaća isporuka u BiH,
        primjenjuje se redovna stopa 17% PDV-a. Nije izvoz.
      </p>

      <p>
        <strong>Mogu li deregistrovati kad padnem ispod 100.000 KM?</strong>
      </p>
      <p>
        Da, ali UINO obično odobrava deregistraciju nakon minimum 12 mjeseci
        u sistemu i samo ako možete dokazati da promet trajno pada ispod
        praga. Trebate podnijeti zahtjev sa obrazloženjem.
      </p>

      <p>
        <strong>Šta sa SaaS i digitalnim uslugama?</strong>
      </p>
      <p>
        Prodaja softvera, SaaS pretplata i digitalnih usluga u BiH se
        oporezuje istom stopom 17%. Za prodaju u inostranstvo (EU, USA)
        primjenjuju se posebna pravila, ako kupac ima validan PDV broj
        (B2B), faktura se izdaje bez PDV-a uz napomenu o reverse-charge
        mehanizmu.
      </p>

      <p>
        <strong>Izvori:</strong>{" "}
        <a
          href="https://www.uino.gov.ba/portal/bs/novosti/prag-za-ulazak-u-sistem-pdv-a-povecan-na-100-000-km"
          target="_blank"
          rel="noopener noreferrer"
        >
          UINO: Prag za ulazak u sistem PDV-a povećan na 100.000 KM
        </a>,
        Zakon o porezu na dodanu vrijednost BiH (Sl. glasnik BiH br. 9/05
        sa izmjenama, izmjene od 24.11.2023.), Pravilnik o registraciji i
        upisu u Jedinstveni registar obveznika indirektnih poreza (Sl.
        glasnik BiH br. 51/12).
      </p>
    </>
  );
}
