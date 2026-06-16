import type { Metadata } from "next";
import { reviewedFor } from "src/data/contentMeta";
import SifreDjelatnosti from "src/sections/sifre-djelatnosti/SifreDjelatnosti";
import { KD_BIH_DETAILED } from "src/data/kd-bih-detailed";

const PAGE_URL = "https://poreznikalkulator.ba/sifre-djelatnosti";

export const metadata: Metadata = {
  title: "Šifre djelatnosti FBiH (KD BiH 2010) — kompletna lista sa opisima",
  description:
    "Kompletna lista šifri djelatnosti za Federaciju BiH prema KD BiH 2010 (NACE Rev. 2). Pretražite po nazivu ili šifri, pročitajte detaljne opise i šta razred uključuje/izuzima — sve potrebno za otvaranje obrta ili registraciju djelatnosti u FBiH.",
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
    title: "Šifre djelatnosti FBiH (KD BiH 2010) — kompletna lista sa opisima",
    description:
      "Pronađite šifru djelatnosti za vaš obrt u FBiH. Sve šifre KD BiH 2010 (NACE Rev. 2) sa detaljnim opisima, primjerima i izuzecima.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Šifre djelatnosti FBiH (KD BiH 2010) — Porezni Kalkulator BiH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Šifre djelatnosti FBiH (KD BiH 2010)",
    description:
      "Kompletna lista šifri djelatnosti za FBiH sa detaljnim opisima — KD BiH 2010 (NACE Rev. 2).",
    images: ["/og-image.png"],
  },
};

// ── JSON-LD schemas ──────────────────────────────────────────────────────────

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Klasifikacija djelatnosti BiH 2010 (KD BiH 2010)",
  description:
    "Kompletna lista šifri djelatnosti u Bosni i Hercegovini prema KD BiH 2010, zasnovanoj na evropskoj klasifikaciji NACE Rev. 2.",
  url: PAGE_URL,
inLanguage: ["bs", "hr", "sr"],
  dateModified: reviewedFor("/sifre-djelatnosti"),
  creator: {
    "@type": "Organization",
    name: "Agencija za statistiku Bosne i Hercegovine",
  },
  publisher: {
    "@type": "Organization",
    name: "Porezni Kalkulator BiH",
    url: "https://poreznikalkulator.ba",
  },
  license: "https://www.bhas.gov.ba",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Šta je KD BiH 2010?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Klasifikacija djelatnosti Bosne i Hercegovine 2010 (KD BiH 2010) je službeni standard za razvrstavanje ekonomskih djelatnosti u BiH, donesen na osnovu Zakona o KD BiH ('Sl. glasnik BiH' 76/06). Zasnovana je na evropskoj NACE Rev. 2 klasifikaciji.",
      },
    },
    {
      "@type": "Question",
      name: "Kako da pronađem pravu šifru djelatnosti za moj obrt?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pretražite po ključnoj riječi (npr. 'programiranje', 'frizer', 'prevoz') ili po šifri ako je već znate. Otvorite područje i oblast, pa pročitajte šta razred uključuje, a šta izuzima — često postoji slična djelatnost u drugoj oblasti.",
      },
    },
    {
      "@type": "Question",
      name: "Koja je razlika između područja, oblasti, grane i razreda?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "KD BiH 2010 ima četiri nivoa hijerarhije: područje (slovo A–U), oblast (dvocifreni broj, npr. 62), grana (tri cifre, npr. 62.0) i razred (četiri cifre, npr. 62.01). Razred je najuži nivo koji se koristi prilikom registracije djelatnosti.",
      },
    },
    {
      "@type": "Question",
      name: "Mogu li registrovati više djelatnosti?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. Pri registraciji obrta navodi se glavna (pretežna) djelatnost, ali se može registrovati i više sporednih. Glavna djelatnost je ona koja generiše najveću dodatnu vrijednost ili zapošljava najviše ljudi.",
      },
    },
    {
      "@type": "Question",
      name: "Da li se šifre djelatnosti razlikuju u FBiH i RS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ne — KD BiH je jedinstvena na nivou cijele BiH i identična u oba entiteta, jer je preuzeta iz Zakona o KD BiH. Razlikuje se samo nadležni organ za registraciju.",
      },
    },
    {
      "@type": "Question",
      name: "Šta znači NACE Rev. 2?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NACE Rev. 2 je statistička klasifikacija ekonomskih djelatnosti Evropske unije (verzija 2008). KD BiH 2010 je nacionalna verzija usaglašena s NACE Rev. 2 — prve četiri cifre svake šifre odgovaraju evropskoj klasifikaciji.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Početna", item: "https://poreznikalkulator.ba/" },
    { "@type": "ListItem", position: 2, name: "Šifre djelatnosti FBiH", item: PAGE_URL },
  ],
};

// ItemList of areas — gives search engines a sense of structure without dumping all 615 razredi
const itemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Područja djelatnosti KD BiH 2010",
  numberOfItems: KD_BIH_DETAILED.length,
  itemListElement: KD_BIH_DETAILED.map((area, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: `Područje ${area.code}: ${area.name}`,
    url: `${PAGE_URL}#podrucje-${area.code}`,
  })),
};

// DefinedTermSet — every razred (4-digit code) becomes a DefinedTerm,
// giving Google per-code rich snippets for queries like "62.01 šifra".
// We limit description to a short summary to keep the blob manageable
// (full descriptions are already in the rendered HTML).
function shortDescription(text: string, max = 300): string {
  if (!text) return "";
  const firstPara = text.split("\n\n")[0] || text;
  const cleaned = firstPara.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1).trim() + "…" : cleaned;
}

const definedTermSetSchema = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  "@id": PAGE_URL + "#kd-bih-2010",
  name: "Klasifikacija djelatnosti BiH 2010 (KD BiH 2010)",
  description:
    "Standardizovana klasifikacija ekonomskih djelatnosti u Bosni i Hercegovini, zasnovana na evropskoj NACE Rev. 2 klasifikaciji.",
  url: PAGE_URL,
  inLanguage: "bs",
  hasDefinedTerm: KD_BIH_DETAILED.flatMap((area) =>
    area.oblasti.flatMap((oblast) =>
      oblast.grane.flatMap((grana) =>
        grana.razredi.map((razred) => ({
          "@type": "DefinedTerm",
          "@id": `${PAGE_URL}#sifra-${razred.code}`,
          identifier: razred.code,
          name: razred.name,
          description: shortDescription(razred.description),
          termCode: razred.code,
          url: `${PAGE_URL}#sifra-${razred.code}`,
          inDefinedTermSet: PAGE_URL + "#kd-bih-2010",
        })),
      ),
    ),
  ),
};

export default function SifreDjelatnostiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetSchema) }}
      />
      <SifreDjelatnosti />
    </>
  );
}
