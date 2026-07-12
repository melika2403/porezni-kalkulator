import type { Upustvo } from "./types";

export const pdv: Upustvo = {
  naslov: "PDV evidencije",
  podnaslov:
    "KUF i KIF se pune automatski, PDV prijava se računa iz knjiga, a e-KUF/e-KIF se preuzimaju kao CSV za UINO e-portal.",
  sekcije: [
    {
      naslov: "KUF i KIF",
      blokovi: [
        {
          t: "p",
          text: "KUF (knjiga ulaznih faktura) se puni iz proknjiženih ulaznih računa, a KIF (knjiga izlaznih faktura) iz izdanih faktura. Ne unose se ručno.",
        },
      ],
    },
    {
      naslov: "PDV prijava",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Odaberite mjesec.",
            "Program obračuna PDV iz KUF-a i KIF-a.",
            "Preuzmite PDF izvještaje i D-PDV.",
          ],
        },
      ],
    },
    {
      naslov: "e-KUF i e-KIF",
      blokovi: [
        {
          t: "p",
          text: "Za UINO e-portal preuzmite e-KUF i e-KIF kao CSV. Format je spreman za učitavanje na portal.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Odakle dolaze podaci u KUF i KIF?",
      o: "KUF iz proknjiženih ulaznih računa, KIF iz izdanih faktura. Zato je važno da su fakture i ulazni računi uredno unijeti.",
    },
    {
      p: "Kako da predam PDV prijavu?",
      o: "Za izabrani mjesec preuzmite D-PDV i izvještaje, a e-KUF i e-KIF CSV učitate na UINO e-portal.",
    },
    {
      p: "Šta ako fali stavka u KUF-u?",
      o: "Provjerite je li ulazni račun proknjižen. Neproknjiženi računi ne ulaze u KUF.",
    },
  ],
};
