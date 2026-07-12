import type { Upustvo } from "./types";

export const stalnaSredstva: Upustvo = {
  naslov: "Stalna sredstva",
  podnaslov:
    "Registar stalnih sredstava i amortizacije (PLDI-1043). Isti podaci kao stranica Amortizacija na glavnom dijelu.",
  sekcije: [
    {
      naslov: "Unos sredstava",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Dodajte stalno sredstvo: naziv, nabavna vrijednost, datum, stopa i vijek trajanja.",
            "Program obračuna godišnju amortizaciju.",
            "Na kraju perioda prenesite preostalu vrijednost u iduću godinu.",
          ],
        },
      ],
    },
    {
      naslov: "Veza sa KPR-om i obrascima",
      blokovi: [
        {
          t: "p",
          text: "Amortizacija ulazi u KPR kroz interni izvod, a u SPR obrazac kao rashod. Podaci su isti kao na stranici Amortizacija na Poreznom Kalkulatoru.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Moram li unositi sredstva i ovdje i na Amortizaciji?",
      o: "Ne. To su isti podaci: što unesete ovdje vidi se tamo, i obrnuto.",
    },
    {
      p: "Kako amortizacija dođe u KPR?",
      o: "Kroz interni izvod (npr. AM-GGGG) koji se knjiži kao rashod. Tako je usklađena sa knjigama.",
    },
    {
      p: "Šta znači prenos u iduću godinu?",
      o: "Preostala (neamortizovana) vrijednost sredstava se prenosi kao početno stanje za sljedeći obračunski period.",
    },
  ],
};
