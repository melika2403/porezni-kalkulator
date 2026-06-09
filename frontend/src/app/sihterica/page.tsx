import { Suspense } from "react";
import type { Metadata } from "next";
import Sihterica from "src/sections/sihterica/Sihterica";
import SihtericaEdu from "src/sections/sihterica/SihtericaEdu";

const PAGE_URL = "https://poreznikalkulator.ba/sihterica";
const OG_TITLE = "Šihterica online — evidencija radnog vremena FBiH (PDF)";
const OG_DESCRIPTION =
  "Popunite šihtericu online za sve radnike i preuzmite popunjeni PDF obrazac. Evidencija radnog vremena prema propisima FBiH — brzo, jednostavno, besplatno za probu.";

export const metadata: Metadata = {
  title:
    "Šihterica online — evidencija radnog vremena radnika FBiH | PDF besplatno",
  description: OG_DESCRIPTION,
  keywords: [
    "šihterica",
    "šihterica online",
    "šihterica besplatno",
    "šihterica PDF",
    "šihterica obrazac FBiH",
    "evidencija radnog vremena",
    "evidencija radnog vremena FBiH",
    "evidencija radnog vremena radnika",
    "evidencija radnog vremena PDF",
    "evidencija radnog vremena online",
    "kako popuniti šihtericu",
    "šihterica obrazac",
    "šihterica šifre odsustva",
    "šifra 9.1 godišnji odmor",
    "šifra 9.2 praznik",
    "šifra 9.3 bolovanje",
    "šifra 9.4 porodiljsko",
    "obrazac evidencije radnog vremena BiH",
    "obrazac evidencije radnog vremena FBiH",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Šihterica — evidencija radnog vremena FBiH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Šta je šihterica i ko je dužan voditi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Šihterica je obrazac evidencije radnog vremena radnika koji svaki poslodavac u Federaciji BiH mora voditi prema Zakonu o radu FBiH i Pravilniku o sadržaju i načinu vođenja evidencije radnika. Sadrži dnevni početak i kraj rada, pauze, prekovremene sate, terenski rad, pripravnost i odsustva.",
      },
    },
    {
      "@type": "Question",
      name: "Kako se računaju ukupni sati u šihterici?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ukupni dnevni sati = (Kraj − Početak) − Pauza. Ručno upisana vremena uvijek pobjeđuju kod odsustva. Ako nema upisanih vremena, plaćena odsustva (9.1 godišnji, 9.2 praznik, 9.3 bolovanje, 9.4 porodiljsko, 9.5 plaćeno) računaju se kao puni radni dan. Sedmični odmor i neplaćena odsustva se ne računaju.",
      },
    },
    {
      "@type": "Question",
      name: "Šta znače šifre odsustva u šihterici (9.1, 9.2, 9.3 itd.)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "9.1 — godišnji ili sedmični odmor; 9.2 — državni praznik; 9.3 — bolovanje; 9.4 — porodiljsko/roditeljsko odsustvo; 9.5 — plaćeno odsustvo; 9.6 — neplaćeno odsustvo; 9.7 — neprisutnost po zahtjevu radnika; 9.8 — neprisutnost krivicom radnika; 9.9 — štrajk; 9.10 — lockout (isključenje s rada).",
      },
    },
    {
      "@type": "Question",
      name: "Kako popuniti šihtericu online i preuzeti PDF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Registrujte se besplatno, dodajte djelatnost i radnika, izaberite mjesec i koristite auto-popunu (početak/kraj rada, slobodni dani, godišnji, praznici, bolovanje). Aplikacija automatski računa dnevne i mjesečne sate. PDF preuzimanje je dostupno uz Pro pretplatu — prvih 30 dana besplatno.",
      },
    },
    {
      "@type": "Question",
      name: "Da li je šihterica besplatna?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Unos i popunjavanje šihterice za jednog radnika su besplatni nakon registracije. PDF preuzimanje i napredne funkcije (više radnika, bulk export svih radnika u ZIP) dostupne su uz Pro ili Business pretplatu. Svaki novi nalog dobija 30 dana Pro-a besplatno.",
      },
    },
    {
      "@type": "Question",
      name: "Vrijedi li šihterica iz aplikacije pred inspekcijom rada?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Generisani PDF obrazac slijedi propisani format evidencije radnog vremena u FBiH (kolone: datum, početak, kraj, pauza, ukupni dnevni sati, terenski, pripravnost, odsustvo, ostali podaci). Poslodavac potpisom i pečatom potvrđuje vjerodostojnost.",
      },
    },
  ],
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kako popuniti šihtericu online",
  description:
    "Vodič kroz online popunjavanje obrasca evidencije radnog vremena radnika u FBiH i preuzimanje PDF obrasca.",
  step: [
    {
      "@type": "HowToStep",
      name: "Registrujte se i dodajte djelatnost",
      text: "Otvorite besplatan nalog i dodajte podatke svoje firme/obrta na profilu.",
    },
    {
      "@type": "HowToStep",
      name: "Dodajte radnika",
      text: "U sekciji Radnici unesite ime, JMBG i datum početka radnog odnosa.",
    },
    {
      "@type": "HowToStep",
      name: "Izaberite mjesec i koristite auto-popunu",
      text: "Postavite početak i kraj rada, pauzu, slobodne dane u sedmici, godišnji odmor i bolovanje za odabrani mjesec — aplikacija će popuniti sve dane.",
    },
    {
      "@type": "HowToStep",
      name: "Preuzmite PDF obrazac",
      text: "Kliknite Preuzmi PDF i dobijete popunjeni obrazac evidencije radnog vremena za odabrani mjesec.",
    },
  ],
};

export default function SihtenicaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <Suspense fallback={null}>
        <Sihterica />
      </Suspense>
      <SihtericaEdu />
    </>
  );
}
