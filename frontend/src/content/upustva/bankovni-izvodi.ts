import type { Upustvo } from "./types";

export const bankovniIzvodi: Upustvo = {
  naslov: "Bankovni izvodi",
  podnaslov:
    "Učitajte PDF izvod iz e-bankinga, a program prepozna promet, predloži kategorije i ubaci stavke u KPR nakon vaše potvrde.",
  sekcije: [
    {
      naslov: "Učitavanje izvoda",
      blokovi: [
        {
          t: "p",
          text: "Izvod se učitava kao PDF fajl. Najčešće ga preuzmete iz internet bankarstva, ali može doći i kao prilog na e-mail; bitno je samo da je PDF. Program pročita svaku stavku prometa, iznos i opis, te provjeri početni i završni saldo da izvod bude tačan.",
        },
        {
          t: "koraci",
          stavke: [
            "Kliknite na polje za učitavanje ili prevucite PDF izvod u njega. Možete odabrati i više izvoda odjednom: uvoze se jedan po jedan, po redu.",
            "Sačekajte da program pročita izvod (traje par sekundi).",
            "Provjerite banku, broj računa i period koji su prepoznati.",
            "Izvodi se unutar godine numerišu redom, od broja 1 do zadnjeg.",
          ],
        },
        {
          t: "savjet",
          text: "Kad učitate jedan fajl, izvod se odmah otvori sa svim stavkama. Kad učitate više fajlova, na kraju dobijete rezime koliko je uvezeno, a izvodi se pojave u listi ispod, poredani po banci i broju izvoda.",
        },
        {
          t: "upozorenje",
          text: "Izvode učitavajte redom kako su stizali. Ako preskočite jedan, saldo se neće poklopiti sa sljedećim izvodom.",
        },
      ],
    },
    {
      naslov: "Početno stanje računa",
      blokovi: [
        {
          t: "p",
          text: "Ako obrt počinjete voditi u programu od ove godine, stare izvode ne morate učitavati. Umjesto toga kliknite \"Početno stanje računa\" (iznad liste izvoda) i upišite stanje sa zadnjeg izvoda prethodne godine, najčešće na dan 31.12. Program to koristi kao polaznu tačku: stanje računa je od tada tačno, a kontrola \"možda nedostaje izvod\" se veže za taj datum.",
        },
        {
          t: "koraci",
          stavke: [
            "Kliknite \"Početno stanje računa\" iznad liste izvoda.",
            "Izaberite žiro račun (ili upišite novi ako još nema izvoda).",
            "Upišite datum stanja (npr. 31.12.2025.) i iznos u KM sa zadnjeg izvoda te godine.",
            "Imate li više banaka, ponovite unos za svaki račun.",
          ],
        },
        {
          t: "savjet",
          text: "Po računu se čuva jedno početno stanje. Pogriješite li iznos ili datum, kliknite na red \"Početno stanje\" u listi i ispravite ga.",
        },
      ],
    },
    {
      naslov: "Kategorizacija stavki",
      blokovi: [
        {
          t: "p",
          text: "Svaka stavka dobije predloženu kategoriju na osnovu opisa (npr. pazar, provizija banke, plate, režije). Prijedlog je samo pomoć, konačnu odluku donosite vi.",
        },
        {
          t: "koraci",
          stavke: [
            "Otvorite izvod klikom na njega u listi.",
            "Prođite kroz stavke i provjerite predloženu kategoriju.",
            "Gdje prijedlog ne odgovara, promijenite kategoriju iz padajuće liste.",
            "Kad jednom ispravite kategoriju za nekog partnera, program to zapamti za taj obrt i sljedeći put predloži isto.",
          ],
        },
        {
          t: "savjet",
          text: "Naučena pravila po obrtu su jača od automatskih prijedloga. Nekoliko ispravki na početku i kasnije skoro sve dolazi tačno.",
        },
      ],
    },
    {
      naslov: "Potvrda i ulazak u KPR",
      blokovi: [
        {
          t: "p",
          text: "Proknjižen izvod ne znači automatski da su sve stavke u KPR-u. Stavka ulazi u KPR tek kad ima kategoriju i kad je potvrđena.",
        },
        {
          t: "koraci",
          stavke: [
            "Provjerite da svaka stavka ima ispravnu kategoriju.",
            "Potvrdite pojedinačnu stavku, ili upotrijebite dugme za potvrdu svih stavki izvoda.",
            "Potvrđene stavke odmah ulaze u KPR za taj obrt.",
          ],
        },
      ],
    },
    {
      naslov: "Grupni uvoz preko Inboxa",
      blokovi: [
        {
          t: "p",
          text: "Ako vodite više obrta, u Inboxu možete odjednom učitati izvode za sve njih. Program prepozna kojem obrtu izvod pripada po žiro računu i posloži ih u listu.",
        },
        {
          t: "koraci",
          stavke: [
            "U Inboxu odaberite tab za uvoz izvoda i učitajte fajlove.",
            "Kliknite \"Proknjiži sve spremne\" da se svi prepoznati izvodi proknjiže odjednom.",
            "Kliknite \"Potvrdi sve izvode\" da se stavke svih izvoda potvrde za KPR.",
            "Ručno riješite samo ono što traži pažnju: neprepoznat obrt, upozorenja ili stavke bez kategorije.",
          ],
        },
      ],
    },
  ],
  faq: [
    {
      p: "Zašto stavka nije ušla u KPR iako je izvod proknjižen?",
      o: "Stavka ulazi u KPR samo ako ima kategoriju i ako je potvrđena. Otvorite izvod, dodijelite kategoriju stavci koja je nema, pa je potvrdite. Proknjižen izvod bez potvrđenih stavki je pripremljen, ali još nije u KPR-u.",
    },
    {
      p: "Šta ako sam greškom učitao isti izvod dva puta?",
      o: "Program prepozna duplikat po broju izvoda i ne knjiži ga ponovo. Ponudi vam dugme da pogledate postojeći izvod, tako da odmah vidite da je već obrađen.",
    },
    {
      p: "Kako da promijenim pogrešnu kategoriju?",
      o: "Otvorite izvod, kliknite na kategoriju stavke i odaberite tačnu iz liste. Ako to uradite prije potvrde, stavka ulazi u KPR sa ispravnom kategorijom.",
    },
    {
      p: "Zašto se saldo ne poklapa?",
      o: "Najčešće je preskočen jedan izvod. Izvodi se nadovezuju: završni saldo jednog mora biti početni saldo sljedećeg. Učitajte izvode redom, bez preskakanja.",
    },
    {
      p: "Prepoznaje li program pazar u gotovini?",
      o: "Da. Kad u opisu piše pazar, program ga tretira kao gotovinski prihod, a ne kao naplatu preko računa. Ako naiđe na izraz koji ne prepozna, promijenite kategoriju ručno i program to zapamti.",
    },
  ],
};
