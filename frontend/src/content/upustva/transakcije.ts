import type { Upustvo } from "./types";

export const transakcije: Upustvo = {
  naslov: "Transakcije",
  podnaslov:
    "Sve stavke sa svih bankovnih izvoda aktivnog obrta na jednom mjestu, sa brzom pretragom.",
  sekcije: [
    {
      naslov: "Čemu služi",
      blokovi: [
        {
          t: "p",
          text: "Ovdje je objedinjen promet iz svih izvoda jednog obrta. Korisno kad tražite konkretnu uplatu ili isplatu, a ne sjećate se na kojem je izvodu ili u kojem mjesecu.",
        },
      ],
    },
    {
      naslov: "Pretraga",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Upišite pojam u pretragu: opis, protivstrana, referenca ili iznos.",
            "Lista se filtrira dok kucate, kroz sve izvode odjednom.",
            "Kliknite stavku za detalje (banka, izvod, datum, kategorija).",
          ],
        },
        {
          t: "savjet",
          text: "Ako tražite tačan iznos, upišite ga sa zarezom kao decimalnim znakom. Možete tražiti i po dijelu imena partnera.",
        },
      ],
    },
    {
      naslov: "Odnos prema KPR-u",
      blokovi: [
        {
          t: "p",
          text: "Transakcije su prikaz prometa, ne mjesto za knjiženje. Kategoriju stavke i njen ulazak u KPR mijenjate na bankovnom izvodu, ne ovdje.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Mogu li ovdje promijeniti kategoriju stavke?",
      o: "Ne. Kategorizacija i potvrda se rade na bankovnom izvodu. Ova stranica služi za pregled i pretragu cijelog prometa.",
    },
    {
      p: "Zašto ne vidim transakcije drugog obrta?",
      o: "Stranica prikazuje aktivni obrt. Promijenite aktivni obrt u prekidaču da vidite njegov promet.",
    },
    {
      p: "Kako da nađem sve stavke jednog partnera?",
      o: "Upišite dio naziva partnera ili protivstrane u pretragu; izlistaju se sve njegove uplate i isplate kroz sve izvode.",
    },
    {
      p: "Vidim li ovdje i gotovinu iz blagajne?",
      o: "Ne. Transakcije prikazuju samo bankovni promet sa izvoda. Gotovinski promet je u Blagajni.",
    },
  ],
};
