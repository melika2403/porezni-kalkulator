import type { Upustvo } from "./types";

export const obrasci: Upustvo = {
  naslov: "Obrasci",
  podnaslov:
    "Priprema godišnjih obrazaca iz knjiga: SPR-1053 i GPD-1051, uz ČOK/ONŠ i zaključak godine.",
  sekcije: [
    {
      naslov: "SPR i GPD",
      blokovi: [
        {
          t: "p",
          text: "SPR-1053 se puni iz KPR-a (prihodi i rashodi), amortizacije iz PLDI i akontacija sa izvoda. GPD-1051 se zatim puni iz snimljenog SPR-a.",
        },
        {
          t: "upozorenje",
          text: "Redoslijed je bitan: prvo uradite SPR, jer njegov dohodak (red 28) puni GPD.",
        },
        {
          t: "koraci",
          stavke: [
            "Odaberite godinu.",
            "Pripremite SPR i provjerite prihode, rashode i amortizaciju.",
            "Snimite SPR.",
            "Otvorite GPD; podaci iz SPR-a se prenose automatski.",
          ],
        },
      ],
    },
    {
      naslov: "Zaključak godine",
      blokovi: [
        {
          t: "p",
          text: "Kroz zaključak godine se zaokružuju knjige: amortizacija se knjiži u KPR, a obrasci se pripremaju iz konačnih podataka.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Zašto GPD nema podatke?",
      o: "Vjerovatno SPR nije snimljen. GPD se puni iz snimljenog SPR-a, pa prvo uradite i snimite SPR.",
    },
    {
      p: "Odakle akontacije u obrascu?",
      o: "Predlažu se sa bankovnog izvoda (uplate akontacije poreza vlasnika). Provjerite ih prije predaje.",
    },
    {
      p: "Šta su ČOK i ONŠ?",
      o: "To su članarina/naknada koje se računaju iz knjiga: ČOK iz doprinosa vlasnika, ONŠ kao postotak prihoda iz KPR-a. Osnovice se preuzimaju automatski.",
    },
  ],
};
