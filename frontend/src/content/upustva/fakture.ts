import type { Upustvo } from "./types";

export const fakture: Upustvo = {
  naslov: "Fakture",
  podnaslov:
    "Izlazne fakture i ulazni računi dobavljača na jednom mjestu, zajedno sa avansnim fakturama, storniranjem i knjižnim obavijestima.",
  sekcije: [
    {
      naslov: "Vrste dokumenata",
      blokovi: [
        {
          t: "p",
          text: "Fakture su podijeljene na Izlazne (ono što vi izdajete kupcima), Ulazne (računi koje primate od dobavljača) i Sve (objedinjen pregled). Iznosi se svugdje unose kao pozitivni, a smjer (prihod ili rashod) određuje vrsta dokumenta.",
        },
      ],
    },
    {
      naslov: "Izlazna faktura",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Odaberite tab Izlazne i kliknite na novu fakturu.",
            "Izaberite kupca iz partnera, ili ga dodajte ako ga nema.",
            "Unesite stavke, količine i cijene; PDV se obračuna po vrsti stavke.",
            "Provjerite datum izdavanja i datum valute u obliku DD.MM.GGGG.",
            "Sačuvajte: \"Spremi i preuzmi PDF\" odmah skida PDF, a \"Samo sačuvaj\" snima bez preuzimanja (PDF se uvijek može skinuti kasnije sa liste).",
          ],
        },
        {
          t: "p",
          text: "Opcija \"Obračunavam PDV\" prati PDV status obrta iz postavki: obvezniku je uključena (stavke nude 17%), a obrtu koji nije u sistemu PDV-a isključena. Ako neobveznik ipak uključi PDV, forma pokaže upozorenje, ali snimanje ne blokira.",
        },
      ],
    },
    {
      naslov: "Uređivanje i brisanje",
      blokovi: [
        {
          t: "p",
          text: "Izdatu fakturu možete naknadno urediti: u meniju reda (tri tačke) ili u pregledu fakture izaberite Uredi. Broj ostaje isti, a izmjena stavki, iznosa ili kupca se preračuna i odražava u KIF-u, PDV prijavi i na kartici kupca. Snimate sa preuzimanjem PDF-a ili samo dugmetom Sačuvaj izmjene.",
        },
        {
          t: "upozorenje",
          text: "Uređivanje i brisanje su moguća samo dok faktura NIJE naplaćena. Naplaćene fakture se ispravljaju storniranjem ili knjižnom obaviješću.",
        },
        {
          t: "p",
          text: "Brisanje (meni pa Obriši) je za greške kod nenaplaćenih faktura i ostavlja prazninu u numeraciji (npr. F-0001, pa F-0003), pa je za ispravke bolji Uredi ili knjižna obavijest.",
        },
      ],
    },
    {
      naslov: "Ulazni računi (tab Ulazne)",
      blokovi: [
        {
          t: "p",
          text: "Ulazne fakture dobavljača su na tabu Ulazne: pregled, uređivanje, sortiranje, filtriranje i pretraga. Ulazni račun je jedan zapis koji hrani i KUF i karticu dobavljača.",
        },
        {
          t: "p",
          text: "Brisanje ulaznog računa (dugme Obriši) uklanja ga i iz KUF-a i sa kartice dobavljača odjednom, a transakcije sa bankovnog izvoda ostaju netaknute.",
        },
      ],
    },
    {
      naslov: "Avansne fakture i storno",
      blokovi: [
        {
          t: "p",
          text: "Za primljeni avans izdaje se avansna faktura (broj sa prefiksom A-). Kada isporučite robu ili uslugu, avansnu fakturu zatvarate storniranjem, čime se izbjegava dvostruko iskazivanje prometa.",
        },
        {
          t: "savjet",
          text: "Predračun nije knjigovodstveni dokument. Kada kupac plati, predračun jednim klikom pretvorite u pravu fakturu umjesto da unosite iznova.",
        },
      ],
    },
    {
      naslov: "Knjižne obavijesti",
      blokovi: [
        {
          t: "p",
          text: "Knjižnom obavijesti (broj sa prefiksom KO-) naknadno ispravljate već izdatu fakturu, na primjer kod odobrenog popusta ili povrata. Predznak proizlazi iz vrste, iznos i dalje unosite kao pozitivan.",
        },
      ],
    },
    {
      naslov: "Pripremljeni (ponavljajući) računi",
      blokovi: [
        {
          t: "p",
          text: "Za klijente kojima redovno fakturišete isto, dugme Pripremljeni računi otvara listu šablona po frekvenciji (sedmično, mjesečno, kvartalno, godišnje). Šablon ima kupca i stavke; kad je vrijeme, dugme Fakturiši sve od svih aktivnih napravi prave fakture (pita datum i dospijeće za cijelu turu).",
        },
        {
          t: "savjet",
          text: "Checkbox uz svaki pripremljeni račun ga uključuje ili isključuje iz fakturisanja; isključeni se preskaču. Možete ih uređivati i brisati bez uticaja na već fakturisane račune.",
        },
      ],
    },
    {
      naslov: "Automatsko izdavanje i slanje",
      blokovi: [
        {
          t: "p",
          text: "Pripremljeni račun ne mora se fakturisati ručno. U polje \"Automatski, dan u mjesecu\" upišite dan i program tog dana sam izda fakturu: mjesečni šablon svaki mjesec, kvartalni u januaru, aprilu, julu i oktobru, godišnji u januaru. Sedmični šabloni ostaju ručni. Prazno polje znači da se fakturiše samo ručno.",
        },
        {
          t: "koraci",
          stavke: [
            "Otvorite Pripremljeni računi i uredite šablon (ili dodajte novi).",
            "Upišite dan u mjesecu, najviše 28, da ga ima i februar.",
            "Za automatsko slanje unesite email kupca pa označite \"odmah pošalji kupcu emailom\"; bez adrese kvačica se ne može uključiti.",
            "Izaberite jezik fakture (bosanski, engleski ili dvojezično) i, za stranog kupca, valutu i vrstu isporuke.",
            "Sačuvajte: prvog dolaska tog dana faktura nastaje sama i ulazi u KIF, PDV i karticu kupca.",
          ],
        },
        {
          t: "p",
          text: "Vlasnik obrta o svakoj automatskoj fakturi dobije obavijest u aplikaciji. Ako je slanje traženo a email nije prošao, obavijest to izričito kaže, pa fakturu pošaljete ručno sa liste.",
        },
        {
          t: "savjet",
          text: "Ako program taj dan ne otkuca (na primjer zbog kratkog ispada), faktura se nadoknadi prvog sljedećeg dana u istom periodu. Dupla faktura nije moguća: svaki šablon ima najviše jednu automatsku fakturu po periodu, a dugme \"Fakturiši sve\" preskoči šablone koji su u tom periodu već fakturisani i to javi u poruci.",
        },
        {
          t: "p",
          text: "Jezik, valuta i vrsta isporuke sa šablona prelaze na svaku fakturu koja iz njega nastane: engleska ili dvojezična faktura ide sa oznakom BAM i engleskim mailom, izvoz i oslobođena isporuka nose svoju napomenu o PDV-u.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Koja je razlika između izlazne i ulazne fakture?",
      o: "Izlaznu fakturu vi izdajete kupcu i ona je prihod. Ulazni račun primate od dobavljača i on je rashod. Obje unosite sa pozitivnim iznosom, a program sam vodi predznak prema vrsti.",
    },
    {
      p: "Kako da poništim fakturu koju sam pogrešno izdao?",
      o: "Za avansne fakture koristi se storno, koji poništava njihov efekat na promet. Za ispravke već izdatih faktura koristite knjižnu obavijest (KO-), koja evidentira promjenu bez brisanja originala.",
    },
    {
      p: "Zašto su svi iznosi pozitivni iako je nešto rashod?",
      o: "Tako se izbjegavaju greške u predznaku. Vrsta dokumenta (izlazna, ulazna, avansna, knjižna obavijest) određuje da li iznos ide kao prihod ili rashod u evidencijama.",
    },
    {
      p: "Mogu li od predračuna napraviti fakturu?",
      o: "Da. Kad kupac plati po predračunu, otvorite ga i pretvorite u fakturu. Stavke i kupac se prenose, faktura dobije svoj redni broj.",
    },
    {
      p: "Kako da ispravim izdatu fakturu?",
      o: "Dok nije naplaćena, otvorite je i izaberite Uredi: broj ostaje isti, a iznosi se preračunaju u KIF-u, PDV prijavi i na kartici kupca. Ako je već naplaćena, koristite storno (za avansne) ili knjižnu obavijest.",
    },
    {
      p: "Mogu li obrisati izlaznu fakturu?",
      o: "Da, ali samo nenaplaćenu, kroz meni pa Obriši. Brisanje ostavlja prazninu u numeraciji, pa je za ispravke bolji Uredi ili knjižna obavijest.",
    },
    {
      p: "Gdje su ulazni računi i kako ih brišem?",
      o: "Na tabu Ulazne (pregled, uređivanje, sortiranje, filtriranje). Dugme Obriši uklanja račun iz KUF-a i sa kartice dobavljača odjednom, a bankovne transakcije ostaju.",
    },
    {
      p: "Kako da fakturišem stalne klijente svaki mjesec?",
      o: "Dugmetom Pripremljeni računi dodajte šablon (kupac i stavke) pod odgovarajuću frekvenciju. Ručno: u tom tabu kliknite Fakturiši sve i unesite datum i dospijeće; od svih aktivnih se naprave prave fakture (KIF, PDV i kartica kupca standardno). Automatski: upišite dan u mjesecu na šablonu i faktura tog dana nastane sama.",
    },
    {
      p: "Šta znači dan u mjesecu na pripremljenom računu?",
      o: "To je dan kad program sam izda fakturu iz tog šablona: mjesečni svaki mjesec, kvartalni u januaru, aprilu, julu i oktobru, godišnji u januaru. Najveći dan je 28 da ga ima i februar. Prazno polje znači da se šablon fakturiše samo ručno, a sedmični šabloni su uvijek ručni.",
    },
    {
      p: "Može li program sam poslati fakturu kupcu?",
      o: "Da. Unesite email kupca i označite \"odmah pošalji kupcu emailom\" na šablonu; bez adrese se kvačica ne može uključiti. Faktura ide kupcu sa PDF prilogom čim nastane, na jeziku koji je izabran na šablonu, a vi dobijete obavijest u aplikaciji. Ako slanje ne uspije, obavijest to kaže i fakturu pošaljete ručno sa liste.",
    },
    {
      p: "Može li kupac dobiti dvije fakture za isti mjesec?",
      o: "Ne. Svaki šablon ima najviše jednu automatsku fakturu po periodu, a Fakturiši sve preskoči šablone koji su u tom periodu već fakturisani i navede ih u poruci. Ako program taj dan ne otkuca, faktura se nadoknadi prvog sljedećeg dana u istom periodu.",
    },
    {
      p: "Kako izdajem fakturu stranom kupcu na engleskom?",
      o: "Na šablonu (ili na samoj fakturi) izaberite jezik engleski ili dvojezično, valutu i vrstu isporuke. Engleska i dvojezična faktura koriste oznaku BAM, izvoz i oslobođena isporuka nose svoju napomenu o PDV-u, a email kupcu ide na engleskom.",
    },
    {
      p: "Kako da storniram ili obrišem izdatu fakturu?",
      o: "Storniraj poništava fakturu (status Stornirana) uz zadržavanje broja i izlazak iz KIF-a/PDV-a/kartice. Obriši je samo za nenaplaćene i ostavlja prazninu u numeraciji. Za ispravke je najbolji Uredi ili knjižna obavijest.",
    },
  ],
};
