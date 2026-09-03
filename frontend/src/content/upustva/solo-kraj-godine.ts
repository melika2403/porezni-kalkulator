import type { Upustvo } from "./types";

// PK Office Solo: kraj godine, od KPR-a do predanog GPD-a.
export const soloKrajGodine: Upustvo = {
  naslov: "Kraj godine",
  podnaslov:
    "U januaru i februaru zatvarate godinu: SPR-1053 iz KPR-a, GPD-1051 iz SPR-a, zaključak i arhiva. Rok za predaju je 31. mart.",
  sekcije: [
    {
      naslov: "Prije obrazaca",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Učitajte i potvrdite izvode za sve mjesece do 31. decembra. KPR mora biti kompletan, obrasci se prave iz njega.",
            "Provjerite da su svi doprinosi vlasnika za godinu obračunati (12 mjeseci) i plaćeni; nedostajući mjeseci se vide na listi obaveza i u Doprinosi i uplatnice.",
            "Ako imate stalna sredstva (modul), obračunajte amortizaciju za godinu; ulazi u rashode KPR-a kao posebna stavka.",
            "Naplatite ili otpišite otvorene fakture koje ne očekujete: KPR je po naplati, pa nenaplaćene fakture nisu prihod te godine.",
          ],
        },
      ],
    },
    {
      naslov: "Obrasci, korak po korak",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Obrasci i kraj godine, SPR-1053: obrazac se popuni iz KPR-a (prihodi, rashodi, doprinosi). Pregledajte, snimite i preuzmite PDF.",
            "GPD-1051: otvara se popunjen iz snimljenog SPR-a, sa uplaćenim akontacijama poreza predloženim sa izvoda. Dopunite lični odbitak (porezna kartica) i ostale dohotke ako ih imate.",
            "Zaključak godine: čarobnjak provjeri da ništa ne nedostaje, zaključa godinu i pripremi arhivu (ZIP sa KPR-om, obrascima, izvodima i fakturama) koju čuvate.",
            "Predajte SPR i GPD Poreznoj upravi do 31. marta, elektronski (nPIS) ili na šalteru. Ako GPD pokazuje porez za doplatu, platite ga uz predaju.",
          ],
        },
        {
          t: "savjet",
          text: "Ako ste uz obrt imali i honorare iz inostranstva kao fizičko lice (AMS-1035), GPD ih spaja sa dohotkom obrta: otvorite GPD iz PK Freelancer evidencije, pa dodajte dohodak obrta iz SPR-a.",
        },
      ],
    },
    {
      naslov: "Nova godina",
      blokovi: [
        {
          t: "p",
          text: "Numeracija faktura kreće od 1 za novu godinu sama. Akontacija poreza za novu godinu se određuje po GPD-u; kad dobijete rješenje, iznos se plaća mjesečno i prati na listi obaveza.",
        },
        {
          t: "upozorenje",
          text: "Poslije zaključka godine stavke te godine se ne mijenjaju. Ako nešto morate ispraviti, prvo otključajte godinu u zaključku, ispravite, pa zaključite ponovo.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Šta je razlika između SPR-a i GPD-a?",
      o: "SPR-1053 je specifikacija dohotka obrta (prihodi minus rashodi iz KPR-a). GPD-1051 je godišnja prijava poreza na dohodak fizičkog lica: u nju ulazi dohodak obrta iz SPR-a, ali i plata, honorari ili najam ako ih imate, uz lične odbitke.",
    },
    {
      p: "Moram li praviti arhivu?",
      o: "Zakon traži čuvanje knjiga i dokumenata godinama. ZIP arhiva iz zaključka godine je najlakši način da sve za tu godinu imate na jednom mjestu, i van aplikacije.",
    },
  ],
};
