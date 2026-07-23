import type { Upustvo } from "./types";

export const partneri: Upustvo = {
  naslov: "Partneri",
  podnaslov:
    "Jedan registar za sve poslovne partnere. Da li je neko kupac ili dobavljač vidi se iz samog poslovanja.",
  sekcije: [
    {
      naslov: "Dodavanje partnera",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Kliknite na novog partnera.",
            "Unesite naziv, ID/PDV broj i ostale podatke.",
            "Sačuvajte; partner je odmah dostupan na fakturama i izvodima.",
          ],
        },
        {
          t: "savjet",
          text: "Partnere možete i grupno uvesti iz fajla izvezenog iz drugog programa, pa ne morate unositi jednog po jednog. Postojeći se preskaču uz obrazloženje.",
        },
        {
          t: "p",
          text: "Iznad liste program predlaže partnere pronađene u vašim izvodima i fakturama: dodaju se jednim klikom, sa podacima koje već imamo. Uplate poreza i doprinosa, polog pazara, prenosi između vlastitih računa, rate kredita i bankarske provizije se ne predlažu (čim stavka na izvodu dobije takvu kategoriju, protivstrana nestaje iz prijedloga).",
        },
        {
          t: "savjet",
          text: "Ako se u prijedlozima ipak nađe neko ko nije partner, kliknite X pored njega i potvrdite: taj prijedlog se trajno uklanja i više se ne predlaže (pamti se po žiro računu i nazivu). Transakcije ostaju netaknute.",
        },
      ],
    },
    {
      naslov: "Kupac ili dobavljač",
      blokovi: [
        {
          t: "p",
          text: "Ne morate ništa označavati. Kada partneru izdate fakturu on je kupac, a kada od njega primite račun ili mu platite on je dobavljač. Uloga se čita iz prometa.",
        },
      ],
    },
    {
      naslov: "Kartica partnera",
      blokovi: [
        {
          t: "p",
          text: "Klik na partnera otvara njegovu karticu: promet (duguje, potražuje, saldo), prekidač kartica kupca/dobavljača, ulazni računi i dokumenti (kartica u PDF, IOS, opomena). Kolona Dospijeće pokazuje rok računa, a redovi kojima je rok prošao a nisu plaćeni su blago crveni.",
        },
        {
          t: "p",
          text: "Pregled je po godinama: default je tekuća godina, a na vrhu kartice birate drugu godinu ili \"Sve godine\". Dug iz ranijih godina se prikazuje kao prvi red \"Donos iz ranijeg perioda\" i računa se sam (početno stanje + sav raniji promet), pa se prenos u novu godinu ne mora raditi ručno. Dugovi u karticama i na listi su uvijek živi, bez obzira na izabranu godinu.",
        },
        {
          t: "p",
          text: "Klik na red računa u kartici otvara taj dokument: izlazna faktura se otvori na Fakturama, ulazni račun na tabu Ulazne.",
        },
        {
          t: "savjet",
          text: "Opomena kupcu je aktivna tek kad ima dospjelih računa preko roka; inače je dugme onemogućeno uz objašnjenje. Opomena je PDF sa spiskom dospjelih računa, rokom i računom za uplatu, šalje se mailom ili se preuzme.",
        },
      ],
    },
    {
      naslov: "Početna stanja (migracija)",
      blokovi: [
        {
          t: "p",
          text: "Ako je obrt prije programa vođen negdje drugo, otvorene dugove partnera unesite kao početna stanja: pojedinačno na kartici partnera (red \"Poč. stanje\" u panelu dokumenata) ili grupno dugmetom \"Početna stanja\" iznad liste, sa zaključnih kartica iz starog programa na dan 31.12. prethodne godine.",
        },
        {
          t: "koraci",
          stavke: [
            "Kliknite \"Početna stanja\" iznad liste partnera.",
            "Provjerite datum stanja (default 31.12. prethodne godine).",
            "Za svakog partnera upišite koliko on duguje vama i/ili vi njemu; prazno = bez duga.",
            "Sačuvajte: iznosi ulaze u kartice kao donos i u otvorene dugove.",
          ],
        },
        {
          t: "savjet",
          text: "Uplata partnera prvo zatvara najstariji dug, dakle početno stanje, pa tek onda nove fakture. Početno stanje ulazi i u IOS i u opomenu.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Zašto na listi vidim promet samo za jednu godinu?",
      o: "Lista i kartice su default na tekućoj godini; gore birate drugu godinu ili \"Sve godine\". Kolone duga su uvijek živo, ukupno stanje, jer se po njima radi naplata.",
    },
    {
      p: "Moram li označiti da je neko kupac ili dobavljač?",
      o: "Ne. Uloga proizlazi iz poslovanja: uplate, isplate i fakture. Isti partner može biti i kupac i dobavljač.",
    },
    {
      p: "Mogu li uvesti partnere iz drugog programa?",
      o: "Da, kroz grupni uvoz iz fajla drugog programa (XML ili CSV). Partneri koji već postoje se preskaču.",
    },
    {
      p: "Gdje se partner koristi?",
      o: "Na fakturama (kao kupac ili dobavljač) i pri kategorizaciji izvoda, gdje se protivstrana veže za partnera.",
    },
    {
      p: "Zašto bankarska provizija ne ulazi u karticu partnera?",
      o: "Banka uz plaćanje dobavljaču često knjiži i proviziju sa imenom dobavljača u opisu. Provizija nije promet sa partnerom: takve stavke (provizije, pazar, prenosi, porezi i doprinosi) se ne vežu na karticu i ne ulaze u promet partnera, nego samo u KPR po svojoj kategoriji.",
    },
    {
      p: "Kada mogu poslati opomenu kupcu?",
      o: "Tek kad kupac ima dospjeli dug preko roka plaćanja; do tada je dugme Opomena onemogućeno. Opomena je PDF sa dospjelim računima, rokom i računom za uplatu, pošaljete je mailom ili preuzmete.",
    },
    {
      p: "Šta znače crveni redovi u kartici?",
      o: "Račun kojem je prošao rok plaćanja a nije plaćen. Crveno je vizuelni signal dospjelog duga.",
    },
  ],
};
