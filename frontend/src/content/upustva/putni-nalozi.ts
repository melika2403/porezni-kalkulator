import type { Upustvo } from "./types";

export const putniNalozi: Upustvo = {
  naslov: "Putni nalozi",
  podnaslov:
    "Izdavanje putnih naloga za službena putovanja, sa automatskim obračunom dnevnica i troškova puta.",
  sekcije: [
    {
      naslov: "Novi nalog",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Kliknite na novi putni nalog.",
            "Unesite putnika, relaciju, datume i svrhu puta.",
            "Unesite broj dana za dnevnice i ostale troškove (prevoz, smještaj).",
            "Sačuvajte nalog.",
          ],
        },
      ],
    },
    {
      naslov: "Dnevnice i troškovi",
      blokovi: [
        {
          t: "p",
          text: "Dnevnica za službeni put u zemlji je 25 KM po danu. Ukupan iznos dnevnica se obračuna automatski iz unesenog broja dana.",
        },
        {
          t: "p",
          text: "Uz dnevnice možete unijeti i stvarne troškove puta (prevoz, smještaj, gorivo). Oni ulaze u ukupan obračun naloga.",
        },
        {
          t: "savjet",
          text: "Nalog izdajte prije puta, a stvarne troškove dopunite po povratku kad imate račune.",
        },
      ],
    },
    {
      naslov: "Štampa i evidencija",
      blokovi: [
        {
          t: "p",
          text: "Gotov nalog se štampa sa svim podacima o putu i obračunom, spreman za potpis i arhivu. Svi izdati nalozi ostaju u evidenciji obrta.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Koliko iznosi dnevnica?",
      o: "Za službeni put u zemlji 25 KM po danu. Program obračuna ukupno iz broja dana koji unesete.",
    },
    {
      p: "Mogu li dodati troškove prevoza i smještaja?",
      o: "Da. Uz dnevnice unosite i ostale troškove puta; oni ulaze u ukupan obračun naloga.",
    },
    {
      p: "Kako da odštampam nalog?",
      o: "Iz putnog naloga pokrenite štampu. Ispis sadrži podatke o putu i obračun dnevnica i troškova.",
    },
    {
      p: "Ulazi li putni nalog sam u KPR?",
      o: "Isplata dnevnica i troškova se u knjige unosi kroz bankovni izvod ili blagajnu, kao i svaki drugi rashod. Nalog je dokument koji taj trošak opravdava.",
    },
  ],
};
