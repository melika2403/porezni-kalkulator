import type { Metadata } from "next";
import SifreZanimanja from "src/sections/sifre-zanimanja/SifreZanimanja";
import { ZANIMANJA_FBIH } from "src/data/zanimanja-fbih";

const PAGE_URL = "https://www.poreznikalkulator.ba/sifre-zanimanja";
const BROJ = ZANIMANJA_FBIH.length; // 4193

export const metadata: Metadata = {
  title: "Šifre zanimanja FBiH, klasifikacija zanimanja (KZBiH-08)",
  description: `Kompletan spisak ${BROJ.toLocaleString("de-DE")} šifri zanimanja u FBiH po zvaničnoj Klasifikaciji zanimanja (KZBiH-08 / ISCO-08). Pretraga po nazivu ili šifri, 7 cifara bez tačke, spremno za JS3100 prijavu radnika.`,
  alternates: { canonical: PAGE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "article",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: `Šifre zanimanja FBiH, ${BROJ.toLocaleString("de-DE")} zanimanja iz zvanične klasifikacije`,
    description:
      "Klasifikacija zanimanja u FBiH (KZBiH-08 / ISCO-08): abecedni spisak sa šiframa, pretraga i kopiranje šifre za JS3100 obrazac.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Šifre zanimanja FBiH, Porezni Kalkulator BiH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Šifre zanimanja FBiH (klasifikacija zanimanja)",
    description: `Svih ${BROJ.toLocaleString("de-DE")} zanimanja sa šiframa za JS3100, pretraga po nazivu ili šifri.`,
    images: ["/og-image.png"],
  },
};

// ── JSON-LD ──────────────────────────────────────────────────────────────────

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Klasifikacija zanimanja u Federaciji BiH (KZBiH-08)",
  description: `Abecedni spisak ${BROJ} zanimanja sa šiframa prema Klasifikaciji zanimanja u FBiH, zasnovanoj na KZBiH-08 i međunarodnom standardu ISCO-08.`,
  url: PAGE_URL,
  inLanguage: ["bs", "hr", "sr"],
  isAccessibleForFree: true,
  variableMeasured: [`${BROJ} zanimanja sa sedmocifrenim šiframa`],
  creator: {
    "@type": "Organization",
    name: "Federalni zavod za statistiku",
    url: "https://fzs.ba",
  },
  publisher: {
    "@type": "Organization",
    name: "Porezni Kalkulator BiH",
    url: "https://www.poreznikalkulator.ba",
  },
  license: "https://fzs.ba",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Šta je Klasifikacija zanimanja u FBiH (KZBiH-08)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Obavezan statistički standard za evidentiranje zanimanja u Federaciji BiH, donesen Odlukom o klasifikaciji zanimanja u FBiH (Službene novine FBiH 40/04 sa dopunama). Zasnovana je na KZBiH-08, odnosno međunarodnom standardu ISCO-08, a objavljuje je Federalni zavod za statistiku.",
      },
    },
    {
      "@type": "Question",
      name: "Kako se šifra zanimanja upisuje u JS3100 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "U polje Zanimanje-Šifra upisuje se svih 7 cifara bez tačke: zanimanje 5131.002 upisuje se kao 5131002. U polje Zanimanje-Opis upisuje se naziv zanimanja sa spiska.",
      },
    },
    {
      "@type": "Question",
      name: "Šta znače cifre u šifri zanimanja?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Prve 4 cifre su ISCO-08 jedinična grupa zanimanja (npr. 5131 konobari), a zadnje 3 cifre su redni broj konkretnog zanimanja unutar grupe. Zvanično se piše sa tačkom, a u obrasce se unosi bez tačke.",
      },
    },
    {
      "@type": "Question",
      name: "Koliko zanimanja sadrži klasifikacija?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Abecedni spisak sadrži ${BROJ.toLocaleString("de-DE")} zanimanja, uključujući dopunu iz 2022. godine kojom je definisano 30 novih zanimanja.`,
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
      item: "https://www.poreznikalkulator.ba/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Šifre zanimanja FBiH",
      item: PAGE_URL,
    },
  ],
};

export default function SifreZanimanjaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <SifreZanimanja />
    </>
  );
}
