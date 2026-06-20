import type { Metadata } from "next";
import { Suspense } from "react";
import Amortizacija from "../../sections/amortizacija/Amortizacija";

const PAGE_URL = "https://poreznikalkulator.ba/amortizacija";

export const metadata: Metadata = {
  title:
    "PLDI-1043 obrazac, popisna lista dugotrajne imovine i obračun amortizacije | Porezni Kalkulator BiH",
  description:
    "Online popis dugotrajne imovine i automatski obračun amortizacije stalnih sredstava u FBiH. Automatski prenos podataka iz godine u godinu. Preuzmite PLDI-1043 PDF besplatno.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "PLDI-1043, stalna sredstva i amortizacija FBiH",
    description:
      "Vodite popis dugotrajne imovine i obračunavajte amortizaciju online. Automatski prenos iz godine u godinu, PDF spreman za GPD-1051 prilog.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Ko je obavezan podnijeti PLDI-1043 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PLDI-1043 podnose fizičke osobe koje obavljaju samostalnu djelatnost i posjeduju dugotrajnu imovinu (stalna sredstva) koja se koristi u poslovne svrhe. Obrazac se predaje kao prilog godišnjoj prijavi poreza (GPD-1051) i specifikaciji SPR-1053.",
      },
    },
    {
      "@type": "Question",
      name: "Šta se smatra stalnim sredstvima (dugotrajnom imovinom)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Stalnim sredstvima smatraju se materijalna i nematerijalna dobra čiji je vijek trajanja duži od jedne godine i čija nabavna vrijednost prelazi propisani prag. To uključuje: vozila, opremu, računare, namještaj, poslovne prostore, patente, licence i slična sredstva koja se koriste u obavljanju djelatnosti.",
      },
    },
    {
      "@type": "Question",
      name: "Koje stope amortizacije se primjenjuju u FBiH?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Stope amortizacije ovise o vijeku trajanja sredstva. Primjeri: računari i softver (3 god. 33,33%), vozila (5 god. 20%), oprema (7 god. 14,29%), poslovni objekti (25–40 god. 2,5–4%). Porezno priznate stope propisane su Pravilnikom o primjeni Zakona o porezu na dohodak FBiH.",
      },
    },
    {
      "@type": "Question",
      name: "Šta se dešava kad je sredstvo prodano ili otpisano?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kod prodaje sredstva, amortizacija se obračunava samo za period dok je sredstvo korišteno (do datuma prodaje). Preostala knjigovodstvena vrijednost ne prenosi se u narednu godinu. Na PLDI obrascu se u koloni 17 upisuje napomena o prodaji umjesto preostale vrijednosti.",
      },
    },
    {
      "@type": "Question",
      name: "Kako funkcioniše prenos podataka iz prethodne godine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Naš generator automatski prenosi knjigovodstvenu vrijednost (kolona 13) iz prethodne godine u novu godinu, čime se osigurava kontinuitet evidencije. Sredstva koja su prodana ili otpisana ne prenose se dalje.",
      },
    },
    {
      "@type": "Question",
      name: "Mogu li koristiti različite stope amortizacije za različita sredstva?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da, svako sredstvo može imati svoju stopu amortizacije zavisno od njegove prirode i vijeka trajanja. Stopa mora biti u skladu s propisanim porezno priznatim stopama. Nije dozvoljeno nasumično mijenjanje stopa iz godine u godinu za isto sredstvo.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kako voditi popis stalnih sredstava i obračunati amortizaciju",
  description:
    "Korak-po-korak vodič za evidenciju dugotrajne imovine i godišnji obračun amortizacije u FBiH (PLDI-1043).",
  inLanguage: "bs",
  totalTime: "PT15M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Dodajte stalna sredstva",
      text: "Unesite naziv, datum nabavke, nabavnu vrijednost, vijek trajanja i stopu amortizacije za svako sredstvo.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Sistem računa godišnju amortizaciju",
      text: "Automatski obračun godišnje amortizacije, akumulirane amortizacije i preostale knjigovodstvene vrijednosti.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Prenos u sljedeću godinu",
      text: "Knjigovodstvena vrijednost se automatski prenosi kao početno stanje za narednu godinu.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Preuzmite PLDI-1043 PDF",
      text: "Spreman za predaju kao prilog uz GPD-1051 i SPR-1053 godišnju prijavu.",
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Početna",
      item: "https://poreznikalkulator.ba/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Stalna sredstva i amortizacija",
      item: PAGE_URL,
    },
  ],
};

export default function AmortizacijaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Suspense fallback={null}>
        <Amortizacija />
      </Suspense>
    </>
  );
}
