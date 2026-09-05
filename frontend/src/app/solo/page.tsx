import type { Metadata } from "next";
import SoloLanding from "src/sections/solo-landing/SoloLanding";
import { SOLO_BRUTO, SOLO_FAQ } from "src/sections/solo-landing/faq";

const PAGE_URL = "https://www.poreznikalkulator.ba/solo";

export const metadata: Metadata = {
  title: "PK Office Solo, vodi obrt sam bez knjigovođe",
  description:
    "Knjigovodstvo za jedan obrt koje vodiš sam: fakture, bankovni izvodi koji se sami knjiže, KPR-1041, doprinosi vlasnika sa Obrascem 2002, SPR i GPD iz knjiga. 100 KM godišnje + PDV, 30 dana besplatno.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "PK Office Solo, knjige obrta bez knjigovođe",
    description:
      "Jedan obrt, lista obaveza svaki mjesec, izvodi i KPR koji se sami pune, doprinosi vlasnika i obrasci na kraju godine. 30 dana besplatno.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: SOLO_FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PK Office Solo",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: PAGE_URL,
  description:
    "Knjigovodstvo jednog obrta u Federaciji BiH bez knjigovođe: fakture, bankovni izvodi, KPR-1041, doprinosi vlasnika, SPR i GPD, mjesečna lista obaveza.",
  offers: {
    "@type": "Offer",
    price: SOLO_BRUTO.toFixed(2),
    priceCurrency: "BAM",
    description: "Godišnja pretplata za jedan obrt sa uračunatim PDV-om, prvih 30 dana besplatno",
  },
  publisher: {
    "@type": "Organization",
    name: "Porezni Kalkulator BiH",
    url: "https://www.poreznikalkulator.ba/",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Početna", item: "https://www.poreznikalkulator.ba/" },
    { "@type": "ListItem", position: 2, name: "PK Office", item: "https://www.poreznikalkulator.ba/pk-office" },
    { "@type": "ListItem", position: 3, name: "PK Office Solo", item: PAGE_URL },
  ],
};

export default function SoloPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <SoloLanding />
    </>
  );
}
