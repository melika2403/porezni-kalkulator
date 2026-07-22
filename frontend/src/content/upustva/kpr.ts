import type { Upustvo } from "./types";

export const kpr: Upustvo = {
  naslov: "KPR-1041",
  podnaslov:
    "Knjiga prihoda i rashoda se puni automatski iz potvrđenih stavki bankovnih izvoda, po principu blagajne.",
  sekcije: [
    {
      naslov: "Kako se puni",
      blokovi: [
        {
          t: "p",
          text: "KPR ne unosite ručno. Svaka potvrđena stavka izvoda koja ima kategoriju uđe u odgovarajuću kolonu knjige.",
        },
        {
          t: "upozorenje",
          text: "Prihod se knjiži na datum naplate, a rashod na datum plaćanja (princip blagajne), ne na datum fakture.",
        },
      ],
    },
    {
      naslov: "Pregled i kontrola",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Odaberite godinu.",
            "Pregledajte prihode i rashode po kolonama.",
            "Ako nešto fali, provjerite je li stavka na izvodu potvrđena i ima li kategoriju.",
          ],
        },
      ],
    },
  ],
  faq: [
    {
      p: "Zašto neka stavka nije u KPR-u?",
      o: "Jer nije potvrđena na izvodu ili nema kategoriju. Otvorite izvod, dodijelite kategoriju i potvrdite stavku.",
    },
    {
      p: "Zašto je iznos knjižen na drugi datum od fakture?",
      o: "KPR radi po principu blagajne: bitan je datum naplate ili plaćanja, a ne datum izdavanja fakture.",
    },
    {
      p: "Mogu li ručno dodati stavku u KPR?",
      o: "KPR se puni iz izvoda i internih izvoda (npr. amortizacija, prebijanja). Tako ostaje usklađen sa stvarnim prometom.",
    },
  ],
};
