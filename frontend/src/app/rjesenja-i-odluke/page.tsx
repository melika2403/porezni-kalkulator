import { Suspense } from "react";
import RjesenjaOdluke from "src/sections/rjesenja-i-odluke/RjesenjaOdluke";
import RadniciTabBar from "src/components/RadniciTabBar/RadniciTabBar";
import type { Metadata } from "next";

const PAGE_URL = "https://www.poreznikalkulator.ba/rjesenja-i-odluke";

export const metadata: Metadata = {
  title: "Rješenja i odluke, kadrovski akti FBiH",
  description:
    "Generator kadrovskih rješenja i odluka po Zakonu o radu FBiH: godišnji odmor, regres, odsustva, online popuna i preuzimanje u Word i PDF formatu.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Rješenja i odluke, kadrovski akti (FBiH)",
    description:
      "Generator kadrovskih rješenja i odluka prema Zakonu o radu FBiH, u Word i PDF formatu.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Rješenja i odluke, Porezni Kalkulator BiH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rješenja i odluke, kadrovski akti (FBiH)",
    description:
      "Predlošci kadrovskih rješenja i odluka prema Zakonu o radu FBiH, Word i PDF.",
    images: ["/og-image.png"],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Početna", item: "https://www.poreznikalkulator.ba/" },
    { "@type": "ListItem", position: 2, name: "Rješenja i odluke", item: PAGE_URL },
  ],
};

export default function RjesenjaOdlukePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Suspense fallback={null}>
        <RadniciTabBar />
        <RjesenjaOdluke />
      </Suspense>
    </>
  );
}
