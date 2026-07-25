import type { Upustvo } from "./types";

export const dashboard: Upustvo = {
  naslov: "Kako početi",
  podnaslov:
    "Kratak vodič kroz redoslijed rada u PK Office, od praznog obrta do godišnjih obrazaca. Svaka stranica ima i svoje detaljno Uputstvo gore desno.",
  sekcije: [
    {
      naslov: "Šta je Početna",
      blokovi: [
        {
          t: "p",
          text: "Početna sažima stanje aktivnog obrta: ključni brojevi i brze akcije. Kartice se pune same čim stignu prvi podaci, ovdje ništa ne unosite ručno.",
        },
        {
          t: "p",
          text: "Cijela aplikacija radi na jednom, aktivnom obrtu. Traka Aktivni obrt na vrhu Početne pokazuje na kojem ste, uz JIB, PDV status, žiro račun i datum zadnjeg izvoda. Klikom na tu traku birate drugi obrt, isto kao prekidačem u bočnoj traci.",
        },
      ],
    },
    {
      naslov: "Redoslijed rada",
      blokovi: [
        {
          t: "p",
          text: "Ne morate raditi sve, samo ono što vaš obrt ima. Uobičajen tok je:",
        },
        {
          t: "koraci",
          stavke: [
            "Odaberite ili dodajte obrt (prekidač obrta gore).",
            "Učitajte bankovne izvode (PDF iz e-bankinga ili sa e-maila).",
            "Prođite stavke izvoda: provjerite kategoriju i potvrdite ih. Tek potvrđena stavka ulazi u KPR.",
            "Izdajte fakture (izlazne) i unesite ulazne račune dobavljača, ako ih imate.",
            "Ako imate radnike: uradite mjesečni obračun plata i MIP-1023.",
            "Ako ste u maloprodaji: kalkulacije zaduže lager, a popis ga razdužuje.",
            "Ako ste PDV obveznik: mjesečno provjerite PDV evidencije i prijavu.",
            "Na kraju godine: pripremite obrasce (SPR, GPD) i uradite zaključak godine.",
          ],
        },
        {
          t: "savjet",
          text: "KPR, KUF i KIF se pune sami iz izvoda i faktura. Nema ručnog prepisivanja u knjige, vi samo potvrđujete i ispravljate kategorije.",
        },
      ],
    },
    {
      naslov: "Ako vodite više obrta",
      blokovi: [
        {
          t: "p",
          text: "Ne morate ulaziti u svaki obrt posebno. U Inboxu odjednom učitate i proknjižite izvode za sve obrte, jer se obrt prepozna po žiro računu.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Odakle da počnem ako preuzimam obrt usred godine?",
      o: "Unesite prethodne mjesece kroz uvoz: prethodne plate na Obračunima plata, a početno stanje robe kroz uvoz na Lageru. Bankovne izvode učitajte redom od početka perioda da se KPR i saldo poklope.",
    },
    {
      p: "Moram li ručno unositi KPR?",
      o: "Ne. KPR se puni automatski iz potvrđenih stavki bankovnih izvoda. Vaš posao je da stavkama date ispravnu kategoriju i potvrdite ih.",
    },
    {
      p: "Kako da promijenim obrt na kojem radim?",
      o: "Klikom na traku Aktivni obrt na Početnoj ili prekidačem obrta u bočnoj traci. Ako vodite više od pet obrta, u tom spisku dobijete i pretragu. Aktivni obrt određuje šta vidite na svim stranicama.",
    },
    {
      p: "Gdje nađem detaljno uputstvo za pojedinu stranicu?",
      o: "Na svakoj stranici, dugme Uputstvo gore desno. Otvara panel baš za tu stranicu, sa koracima i čestim pitanjima.",
    },
  ],
};
