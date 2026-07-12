import type { Upustvo } from "./types";

export const blagajna: Upustvo = {
  naslov: "Blagajna",
  podnaslov:
    "Gotovinska blagajna obrta: blagajnički nalozi (uplate i isplate) i blagajnički dnevnik sa saldom.",
  sekcije: [
    {
      naslov: "Nalozi",
      blokovi: [
        {
          t: "p",
          text: "Svaki gotovinski priliv ili odliv se evidentira nalogom (uplatnica ili isplatnica). Saldo blagajne se vodi automatski.",
        },
        {
          t: "koraci",
          stavke: [
            "Kliknite na novi nalog i odaberite uplatu ili isplatu.",
            "Unesite iznos, datum (DD.MM.GGGG.) i opis.",
            "Sačuvajte; nalog odmah ulazi u dnevnik i mijenja saldo.",
          ],
        },
        {
          t: "upozorenje",
          text: "Blagajna ne može otići u minus. Isplata veća od trenutnog salda nije dozvoljena.",
        },
      ],
    },
    {
      naslov: "Dnevnik",
      blokovi: [
        {
          t: "p",
          text: "Blagajnički dnevnik hronološki prikazuje sve naloge sa tekućim saldom i može se odštampati za izabrani period.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Zašto ne mogu unijeti isplatu?",
      o: "Vjerovatno je iznos veći od salda blagajne. U blagajni ne može biti manje od nule, pa prvo evidentirajte priliv.",
    },
    {
      p: "Kako da odštampam dnevnik?",
      o: "Iz blagajne pokrenite štampu dnevnika. Ispis prati prikazani period i saldo.",
    },
    {
      p: "Da li je datum obavezan na nalogu?",
      o: "Da. Svaki nalog ima datum, jer se po njemu vodi redoslijed u dnevniku i računa saldo.",
    },
  ],
};
