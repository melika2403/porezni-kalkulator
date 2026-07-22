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
            "Sačuvajte; faktura dobije redni broj i može se odštampati u PDF.",
          ],
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
      o: "Dugmetom Pripremljeni računi dodajte šablon (kupac i stavke) pod odgovarajuću frekvenciju. Kad je vrijeme, u tom tabu kliknite Fakturiši sve i unesite datum i dospijeće; od svih aktivnih se naprave prave fakture (KIF, PDV i kartica kupca standardno).",
    },
    {
      p: "Kako da storniram ili obrišem izdatu fakturu?",
      o: "Storniraj poništava fakturu (status Stornirana) uz zadržavanje broja i izlazak iz KIF-a/PDV-a/kartice. Obriši je samo za nenaplaćene i ostavlja prazninu u numeraciji. Za ispravke je najbolji Uredi ili knjižna obavijest.",
    },
  ],
};
