import type { Metadata } from "next";
import { OG_IMAGE } from "src/lib/ogImage";
import Fakture from "src/sections/fakture/Fakture";
import FaktureEdu from "src/sections/fakture/FaktureEdu";

const TITLE = "Fakture, predračuni i profakture online, izrada i PDF | Porezni Kalkulator BiH";
const DESC =
  "Besplatna izrada faktura, predračuna, profaktura i računa online za BiH. Automatski PDV (17%), numeracija (0001-2026), podaci kupaca i organizacije, izvoz u PDF, bez instalacije.";

export const metadata: Metadata = {
  title: "Fakture, predračuni i profakture online",
  description:
    "Besplatna izrada faktura, predračuna, profaktura i računa online za BiH, automatski PDV 17 posto, numeracija, podaci kupaca, izvoz u PDF bez instalacije.",
  alternates: { canonical: "https://www.poreznikalkulator.ba/fakture" },
openGraph: {
  images: OG_IMAGE,
    type: "website",
    url: "https://www.poreznikalkulator.ba/fakture",
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
  ],
};

export default function FakturePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Fakture />
      <FaktureEdu />
    </>
  );
}
