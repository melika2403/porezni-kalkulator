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
          text: "Klik na red računa u kartici otvara taj dokument: izlazna faktura se otvori na Fakturama, ulazni račun na tabu Ulazne.",
        },
        {
          t: "savjet",
          text: "Opomena kupcu je aktivna tek kad ima dospjelih računa preko roka; inače je dugme onemogućeno uz objašnjenje. Opomena je PDF sa spiskom dospjelih računa, rokom i računom za uplatu, šalje se mailom ili se preuzme.",
        },
      ],
    },
  ],
  faq: [
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
      p: "Kada mogu poslati opomenu kupcu?",
      o: "Tek kad kupac ima dospjeli dug preko roka plaćanja; do tada je dugme Opomena onemogućeno. Opomena je PDF sa dospjelim računima, rokom i računom za uplatu, pošaljete je mailom ili preuzmete.",
    },
    {
      p: "Šta znače crveni redovi u kartici?",
      o: "Račun kojem je prošao rok plaćanja a nije plaćen. Crveno je vizuelni signal dospjelog duga.",
    },
  ],
};
