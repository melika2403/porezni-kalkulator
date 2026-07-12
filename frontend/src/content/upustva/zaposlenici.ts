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
