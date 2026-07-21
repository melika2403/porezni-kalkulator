import type { Upustvo } from "./types";

export const lager: Upustvo = {
  naslov: "Lager lista",
  podnaslov:
    "Stanje robe po artiklu i maloprodajnoj cijeni iz kalkulacija; popis (inventura) je jedini način razduženja.",
  sekcije: [
    {
      naslov: "Stanje",
      blokovi: [
        {
          t: "p",
          text: "Lager se zadužuje iz kalkulacija (ulaz robe). Stanje se vodi po artiklu i MPC-u, a lista prati filtere koje postavite.",
        },
      ],
    },
    {
      naslov: "Popis (inventura)",
      blokovi: [
        {
          t: "p",
          text: "Razduženje (prodaja, manjak) se evidentira kroz popis. To je jedini način da roba izađe sa lagera.",
        },
        {
          t: "koraci",
          stavke: [
            "Pokrenite novi popis.",
            "Unesite stvarno stanje po artiklu.",
            "Potvrdite popis; razlika razdužuje lager.",
            "Odštampajte popis.",
          ],
        },
        {
          t: "upozorenje",
          text: "Nema automatskog razduženja preko kase. Bez popisa roba ostaje na lageru.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Kako roba izlazi sa lagera?",
      o: "Samo kroz popis (inventuru). Prodaja se ne razdužuje automatski jer nema povezane kase.",
    },
    {
      p: "Odakle dolazi stanje?",
      o: "Iz kalkulacija: svaki ulaz robe kroz kalkulaciju zaduži lager po artiklu i MPC-u.",
    },
    {
      p: "Prati li štampa filtere?",
      o: "Da. Ispis lagera prati filtere koje ste postavili na listi.",
    },
  ],
};
