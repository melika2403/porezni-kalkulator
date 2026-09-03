import type { Upustvo } from "./types";

export const zaposlenici: Upustvo = {
  naslov: "Zaposlenici",
  podnaslov:
    "Radnici i vlasnik obrta na jednom mjestu: pregled, dodavanje i uređivanje podataka.",
  sekcije: [
    {
      naslov: "Radnici",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Dodajte radnika i unesite lične podatke, JMBG i podatke o zaposlenju.",
            "Zanimanje birajte sa liste (Klasifikacija zanimanja FBiH): izbor popuni i naziv i sedmocifrenu šifru koja ide u JS3100 obrazac.",
            "Sačuvajte; radnik je odmah dostupan u obračunu plata.",
            "Uređivanjem mijenjate podatke koji ulaze u obračune i obrasce.",
          ],
        },
      ],
    },
    {
      naslov: "Vlasnik obrta",
      blokovi: [
        {
          t: "p",
          text: "Vlasnik obrta se vodi ovdje uz radnike. Vlasnik ulazi u obračun doprinosa i Obrazac 2002, ali ne u MIP-1023.",
        },
      ],
    },
    {
      naslov: "Izvoz i uvoz radnika (CSV)",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Izvoz (CSV) preuzima spisak prikazanih radnika za Excel; prati aktivni filter i pretragu.",
            "Uvoz (CSV): u prozoru preuzmite šablon, popunite ga u Excelu (jedan red po radniku) i ubacite fajl.",
            "Prije upisa vidite pregled: koji redovi su novi, koji se preskaču i koji imaju grešku sa razlogom.",
            "Uvoz samo dodaje nove radnike; postojeći (isti JMBG ili ime i prezime) se preskaču i ne mijenjaju.",
          ],
        },
      ],
    },
  ],
  faq: [
    {
      p: "Gdje se koriste podaci o radniku?",
      o: "U obračunu plata, MIP-u i kadrovskim aktima. Zato je važno da su JMBG i ostali podaci tačni.",
    },
    {
      p: "Po čemu se vlasnik razlikuje od radnika?",
      o: "Vlasnik ima svoj obračun doprinosa i Obrazac 2002. Ne ulazi u MIP-1023, koji se odnosi na zaposlenike.",
    },
    {
      p: "Šta ako radnik ode iz obrta?",
      o: "Uredite mu status zaposlenja. Historijski obračuni ostaju netaknuti.",
    },
  ],
};
