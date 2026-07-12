import type { Upustvo } from "./types";

export const inbox: Upustvo = {
  naslov: "Inbox",
  podnaslov:
    "Zajednički prijem za sve vaše obrte: grupni uvoz bankovnih izvoda, obavijesti i poruke podrške na jednom mjestu.",
  sekcije: [
    {
      naslov: "Grupni uvoz izvoda",
      blokovi: [
        {
          t: "p",
          text: "Umjesto da ulazite u svaki obrt posebno, ovdje odjednom učitate izvode za sve obrte. Program prepozna kojem obrtu izvod pripada po žiro računu.",
        },
        {
          t: "koraci",
          stavke: [
            "Otvorite tab za uvoz izvoda i učitajte PDF izvode (može više odjednom).",
            "Provjerite prepoznati obrt uz svaki izvod; neprepoznat dodijelite ručno.",
            "Kliknite \"Proknjiži sve spremne\" da se svi prepoznati izvodi proknjiže.",
            "Kliknite \"Potvrdi sve izvode\" da stavke uđu u KPR.",
          ],
        },
        {
          t: "savjet",
          text: "Lista ostaje ovdje dok sami ne kliknete \"Ukloni završene\", pa uvoz možete raditi u više navrata.",
        },
      ],
    },
    {
      naslov: "Pregled izvoda bez napuštanja Inboxa",
      blokovi: [
        {
          t: "p",
          text: "Klik na izvod otvara ga u prozoru preko trenutne stranice. Stavke potvrđujete i mijenjate kategoriju odmah tu, bez prebacivanja aktivnog obrta.",
        },
      ],
    },
    {
      naslov: "Obavijesti i poruke",
      blokovi: [
        {
          t: "p",
          text: "Obavijesti (rokovi, novosti) i poruke podrške stižu u zasebne tabove. Broj nepročitanih se vidi na stavci Inbox u meniju.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Kako program zna kojem obrtu pripada izvod?",
      o: "Po žiro računu na izvodu. Ako račun ne prepozna, obrt dodijelite ručno iz liste, a program to zapamti za ubuduće.",
    },
    {
      p: "Šta ako učitam isti izvod dvaput?",
      o: "Prepozna se kao duplikat po broju izvoda i ne knjiži se ponovo. Ponudi vam se da pogledate postojeći izvod.",
    },
    {
      p: "Zašto izvod piše proknjižen a stavke nisu u KPR-u?",
      o: "Knjiženje priprema izvod, ali stavke ulaze u KPR tek kad su potvrđene. Upotrijebite \"Potvrdi sve izvode\" ili otvorite izvod i potvrdite stavke.",
    },
    {
      p: "Moram li se prebacivati između obrta?",
      o: "Ne. Zato i postoji Inbox: izvode svih obrta rješavate iz jednog reda, bez mijenjanja aktivnog obrta.",
    },
  ],
};
