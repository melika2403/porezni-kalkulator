import type { Metadata } from "next";
import { OG_IMAGE } from "src/lib/ogImage";
import { Suspense } from "react";
import InvoiceForm from "src/sections/fakture/InvoiceForm";
import FaktureEdu from "src/sections/fakture/FaktureEdu";

const TITLE = "Nova faktura ili predračun, kreiraj online | Porezni Kalkulator BiH";
const DESC =
  "Napravi fakturu, predračun, profakturu ili račun u par klikova: stavke, rabat, PDV (17%), podaci prodavca i kupca, automatska numeracija i izvoz u PDF.";

export const metadata: Metadata = {
  title: "Nova faktura ili predračun online",
  description: DESC,
  alternates: { canonical: "https://www.poreznikalkulator.ba/fakture/nova" },
  keywords: [
    "nova faktura",
    "kreiraj fakturu",
    "napravi fakturu online",
    "izrada fakture besplatno",
    "novi predračun",
    "kreiraj predračun",
    "izrada predračuna online",
    "profaktura online",
    "predujam faktura",
    "račun online",
    "izrada računa BiH",
    "PDV faktura",
    "faktura sa PDV-om",
    "faktura PDF preuzimanje",
    "obračun fakture sa rabatom",
    "stavke fakture",
    "fakturisanje online BiH",
    "fakturisanje samostalna djelatnost",
    "fakturisanje obrtnik",
    "Porezni Kalkulator BiH",
  ],
  openGraph: {
    images: OG_IMAGE,
    type: "website",
    url: "https://www.poreznikalkulator.ba/fakture/nova",
    title: TITLE,
    description: DESC,
    siteName: "Porezni Kalkulator BiH",
    locale: "bs_BA",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Početna", item: "https://www.poreznikalkulator.ba/" },
    { "@type": "ListItem", position: 2, name: "Fakture i predračuni", item: "https://www.poreznikalkulator.ba/fakture" },
    { "@type": "ListItem", position: 3, name: "Nova faktura", item: "https://www.poreznikalkulator.ba/fakture/nova" },
  ],
};

export default function NovaFakturaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Suspense>
        <InvoiceForm />
      </Suspense>
      <FaktureEdu />
    </>
  );
}
