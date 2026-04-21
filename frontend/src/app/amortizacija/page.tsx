import type { Metadata } from "next";
import Amortizacija from "../../sections/amortizacija/Amortizacija";

export const metadata: Metadata = {
  title: "Obračun amortizacije stalnih sredstava — PLDI-1043 Generator | Porezni Kalkulator BiH",
  description:
    "Besplatna izrada PLDI-1043 obrasca — popisna lista dugotrajne imovine i obračun amortizacije stalnih sredstava u FBiH. Automatski prenos podataka iz godine u godinu, jednostavno upravljanje imovinom.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Ko je obavezan podnijeti PLDI-1043 obrazac?", acceptedAnswer: { "@type": "Answer", text: "PLDI-1043 podnose fizičke osobe koje obavljaju samostalnu djelatnost i posjeduju dugotrajnu imovinu koja se koristi u poslovne svrhe. Obrazac se predaje kao prilog godišnjoj prijavi poreza (GPD-1051) i specifikaciji SPR-1053." } },
    { "@type": "Question", name: "Šta se smatra stalnim sredstvima?", acceptedAnswer: { "@type": "Answer", text: "Stalnim sredstvima smatraju se materijalna i nematerijalna dobra čiji je vijek trajanja duži od jedne godine. To uključuje: vozila, opremu, računare, namještaj, poslovne prostore, patente i licence." } },
    { "@type": "Question", name: "Koje stope amortizacije se primjenjuju u FBiH?", acceptedAnswer: { "@type": "Answer", text: "Stope ovise o vijeku trajanja: računari (3 god. — 33,33%), vozila (5 god. — 20%), oprema (7 god. — 14,29%), poslovni objekti (25–40 god.). Stope su propisane Pravilnikom o primjeni Zakona o porezu na dohodak FBiH." } },
    { "@type": "Question", name: "Šta se dešava kad je sredstvo prodano ili otpisano?", acceptedAnswer: { "@type": "Answer", text: "Amortizacija se obračunava samo za period korištenja do datuma prodaje. Preostala knjigovodstvena vrijednost ne prenosi se u narednu godinu." } },
    { "@type": "Question", name: "Kako funkcioniše prenos podataka iz prethodne godine?", acceptedAnswer: { "@type": "Answer", text: "Naš generator automatski prenosi knjigovodstvenu vrijednost iz prethodne godine u novu godinu. Sredstva koja su prodana ili otpisana ne prenose se dalje." } },
  ],
};

export default function AmortizacijaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Amortizacija />
    </>
  );
}
