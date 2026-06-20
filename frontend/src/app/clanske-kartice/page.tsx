import ClanskeKartice from "src/sections/clanske-kartice/ClanskeKartice";
import type { Metadata } from "next";

const PAGE_URL = "https://poreznikalkulator.ba/clanske-kartice";

export const metadata: Metadata = {
  title:
    "Generator članskih kartica sa QR kodom | Porezni Kalkulator BiH",
  description:
    "Kreirajte profesionalne članske kartice sa QR kodom za klubove, fitness centre, biblioteke i druge organizacije. Veličina kreditne kartice, spremno za štampanje ili pokazivanje na mobitelu.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Generator članskih kartica sa QR kodom",
    description:
      "Kreirajte profesionalne članske kartice sa QR kodom u formatu kreditne kartice. Spremno za štampanje ili digitalni prikaz.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Generator članskih kartica sa QR kodom",
    description:
      "Kreirajte članske kartice sa QR kodom za vašu organizaciju ili klijente.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Šta su članske kartice sa QR kodom?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Članske kartice sa QR kodom su digitalne ili štampane kartice veličine kreditne kartice koje sadrže ime člana, jedinstveni kod, datum važenja i QR kod za brzu identifikaciju. Pogodne su za fitness centre, sportske klubove, biblioteke, udruženja i druge organizacije.",
      },
    },
    {
      "@type": "Question",
      name: "Kako se generišu članske kartice za više članova odjednom?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Putem bulk uvoza iz Excel ili CSV fajla. Sistem podržava upsert po paru organizacija + kod, tako da ponovni uvoz istog fajla ne pravi duplikate, samo ažurira postojeće.",
      },
    },
    {
      "@type": "Question",
      name: "U kojem formatu se preuzimaju kartice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pojedinačne kartice se preuzimaju kao PDF, a više kartica kao ZIP arhiva sa pojedinačnim PDF fajlovima. Veličina kartice je 85,6 × 54 mm (standard kreditne kartice), spremno za štampanje na PVC karticama ili običnom papiru.",
      },
    },
    {
      "@type": "Question",
      name: "Da li je generator dostupan besplatno?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Generator članskih kartica dostupan je uz Pro pretplatu na poreznikalkulator.ba. Pretplata uključuje neograničen broj kartica, bulk uvoz, prilagođavanje izgleda i QR kodova.",
      },
    },
    {
      "@type": "Question",
      name: "Za šta se može koristiti QR kod na kartici?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "QR kod sadrži jedinstveni identifikator člana i može se koristiti za kontrolu pristupa (npr. ulazak u teretanu), evidenciju dolazaka, verifikaciju statusa članstva, lojalty bodove i popuste.",
      },
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
      name: "Generator članskih kartica",
      item: PAGE_URL,
    },
  ],
};

export default function ClanskeKarticePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ClanskeKartice />
    </>
  );
}
