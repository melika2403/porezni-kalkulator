import type { Upustvo } from "./types";

export const kalkulacije: Upustvo = {
  naslov: "Kalkulacije",
  podnaslov:
    "Maloprodajne kalkulacije (KCM): brz unos artikala, sa automatskim knjiženjem ulaznog računa u KUF.",
  sekcije: [
    {
      naslov: "Unos kalkulacije",
      blokovi: [
        {
          t: "p",
          text: "Kalkulacija formira maloprodajnu cijenu (MPC) iz nabavne cijene, marže i PDV-a. Unos je brz: Enter vodi na sljedeći artikal.",
        },
        {
          t: "koraci",
          stavke: [
            "Otvorite novu kalkulaciju i odaberite dobavljača.",
            "Dodajte artikle iz šifarnika ili nove.",
            "Za svaki unesite nabavnu cijenu i maržu ili MPC (jedno računa drugo).",
            "Sačuvajte kalkulaciju.",
          ],
        },
        {
          t: "savjet",
          text: "Marža i MPC su povezane: promijenite jedno i drugo se preračuna. Tako lako pogodite željenu cijenu na polici.",
        },
      ],
    },
    {
      naslov: "Veza sa KUF i lagerom",
      blokovi: [
        {
          t: "p",
          text: "Snimljena kalkulacija automatski knjiži ulazni račun u KUF, a artikli iz šifarnika su osnova za lager listu.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Kako da brzo unesem puno artikala?",
      o: "Koristite Enter za prelazak na sljedeći artikal. Artikli se biraju iz šifarnika.",
    },
    {
      p: "Šta ako unesem MPC umjesto marže?",
      o: "Program izračuna maržu iz MPC-a i obrnuto. Unesite ono što vam je poznato, drugo se popuni samo.",
    },
    {
      p: "Knjiži li se nešto automatski?",
      o: "Da. Kalkulacija sama unese ulazni račun dobavljača u KUF, pa ga ne morate unositi posebno.",
    },
  ],
};
