import type { Upustvo } from "./types";

export const obracuniPlata: Upustvo = {
  naslov: "Obračuni plata",
  podnaslov:
    "Mjesečni obračun plata sa platnim listama, MIP-1023 obrascem i uvozom prethodnih plata za nove obrte.",
  sekcije: [
    {
      naslov: "Mjesečni obračun",
      blokovi: [
        {
          t: "p",
          text: "Obračun se vodi po mjesecu. Za svakog radnika program računa bruto, doprinose, porez i neto, te sastavlja platnu listu i naloge za plaćanje.",
        },
        {
          t: "koraci",
          stavke: [
            "Odaberite mjesec i godinu obračuna.",
            "Provjerite radnike i njihove osnovice (bruto ili koeficijent).",
            "Program obračuna doprinose, porez i neto po važećim stopama.",
            "Preuzmite platne liste i naloge za plaćanje.",
          ],
        },
      ],
    },
    {
      naslov: "MIP-1023",
      blokovi: [
        {
          t: "p",
          text: "MIP-1023 je mjesečni izvještaj o isplaćenim platama i doprinosima. Program ga generiše kao XML spreman za predaju.",
        },
        {
          t: "koraci",
          stavke: [
            "Kad je obračun gotov, preuzmite MIP-1023 XML za taj mjesec.",
            "Mjesec dobije oznaku da je MIP preuzet, da znate dokle ste stigli.",
          ],
        },
        {
          t: "upozorenje",
          text: "Vlasnik obrta ulazi u obračun doprinosa i Obrazac 2002, ali NE ulazi u MIP-1023. MIP je izvještaj za zaposlenike.",
        },
      ],
    },
    {
      naslov: "Uvoz prethodnih plata",
      blokovi: [
        {
          t: "p",
          text: "Kada preuzimate obrt usred godine, prethodne mjesece ne morate unositi ručno. Uvozom prethodnih plata upisujete bruto i koeficijent po radniku za ranije mjesece, bez minulog rada.",
        },
        {
          t: "savjet",
          text: "Uvezeni mjeseci prave iste zapise kao redovni obračun, pa se automatski sinhronizuju sa ostatkom aplikacije i godišnjim izvještajima.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Kako da unesem plate iz mjeseci prije nego što sam preuzeo obrt?",
      o: "Upotrijebite uvoz prethodnih plata. Za svaki raniji mjesec unesete bruto i koeficijent po radniku. Uvoz ne računa minuli rad i pravi iste zapise kao redovni obračun, pa je sve sinhronizovano.",
    },
    {
      p: "Ulazi li vlasnik obrta u MIP-1023?",
      o: "Ne. Vlasnik obrta ulazi u obračun doprinosa i Obrazac 2002, ali ne u MIP-1023. MIP se odnosi na zaposlenike.",
    },
    {
      p: "Šta znači oznaka da je MIP preuzet?",
      o: "To je podsjetnik da ste za taj mjesec već generisali MIP-1023 XML. Pomaže da ne preskočite mjesec i da znate koji su obračuni zaokruženi.",
    },
    {
      p: "Mogu li ponovo preuzeti platnu listu ili MIP za stari mjesec?",
      o: "Da. Otvorite željeni mjesec i ponovo preuzmite platne liste ili MIP-1023 XML kad god zatreba.",
    },
  ],
};
