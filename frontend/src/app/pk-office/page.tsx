import type { Metadata } from "next";
import PkOfficeLanding from "src/sections/pk-office-landing/PkOfficeLanding";

const PAGE_URL = "https://www.poreznikalkulator.ba/pk-office";

export const metadata: Metadata = {
  title: "PK Office, knjigovodstvo obrta",
  description:
    "PK Office spaja bankovne izvode, automatsko knjiženje, obračun plata, KPR, PDV evidencije i porezne obrasce u jedan alat za obrte i knjigovođe u BiH.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "PK Office, knjigovodstvo obrta na jednom mjestu",
    description:
      "Bankovni izvodi, automatsko knjiženje, obračun plata i porezni obrasci za obrte u BiH. Isprobaj 30 dana besplatno.",
  },
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
      name: "PK Office",
      item: PAGE_URL,
    },
  ],
};

export default function PkOfficePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <PkOfficeLanding />
    </>
  );
}
