import { Suspense } from "react";
import type { Metadata } from "next";
import PoreznaKartica from "src/sections/porezna-kartica/PoreznaKartica";
import PoreznaKarticaEdu from "src/sections/porezna-kartica/PoreznaKarticaEdu";
import { pk1001FaqSchema } from "src/sections/porezna-kartica/pk1001Faq";
import RadniciTabBar from "src/components/RadniciTabBar/RadniciTabBar";

const PAGE_URL = "https://www.poreznikalkulator.ba/porezna-kartica";

export const metadata: Metadata = {
  title: "Porezna kartica FBiH, obrazac PK-1001 online",
  description:
    "Popunite zahtjev za izdavanje porezne kartice (obrazac PK-1001) online. Automatski izračun koeficijenta ličnog odbitka za bračnog druga, djecu i ostale izdržavane članove, sa preuzimanjem popunjenog PDF-a.",
  keywords: [
    "porezna kartica",
    "PK-1001",
    "PK-1002",
    "lični odbitak",
    "koeficijent ličnog odbitka",
    "porez na dohodak FBiH",
    "izdržavani članovi",
    "Porezna uprava FBiH",
  ],
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
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Porezna kartica FBiH, obrazac PK-1001 online",
    description:
      "Zahtjev za izdavanje porezne kartice sa automatskim izračunom koeficijenta ličnog odbitka. Popunjen PDF spreman za Poreznu upravu.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Porezna kartica PK-1001, Porezni Kalkulator BiH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Porezna kartica FBiH, obrazac PK-1001",
    description:
      "Online popunjavanje zahtjeva za poreznu karticu sa izračunom koeficijenta ličnog odbitka.",
    images: ["/og-image.png"],
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Porezna kartica PK-1001",
  description:
    "Online popunjavanje zahtjeva za izdavanje porezne kartice (obrazac PK-1001) u Federaciji BiH, sa automatskim izračunom koeficijenta ličnog odbitka.",
  url: PAGE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "bs",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BAM",
    description:
      "Besplatna registracija za pregled. Pro pretplata otključava preuzimanje popunjenog PK-1001 obrasca.",
  },
  provider: {
    "@type": "Organization",
    name: "Porezni Kalkulator BiH",
    url: "https://www.poreznikalkulator.ba",
  },
  featureList: [
    "Popunjavanje obrasca PK-1001 iz podataka o radniku",
    "Automatski izračun koeficijenta ličnog odbitka",
    "Bračni drug, djeca, ostali izdržavani članovi, alimentacija i invalidnost",
    "Upozorenje za članove sa prihodom preko 300 KM",
    "Podjela koeficijenta po udjelu u izdržavanju",
    "Upis koeficijenta u karton radnika za obračun plate",
    "Preuzimanje popunjenog PDF obrasca",
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pk1001FaqSchema) }}
      />
      {/* Suspense obuhvata SAMO traku kartica, jer ona koristi useSearchParams
          i time cijeli obuhvaćeni dio izbacuje iz statičkog HTML-a. Forma je
          izvan njega, pa njen h1 i sadržaj vidi i crawler. */}
      <Suspense fallback={null}>
        <RadniciTabBar />
      </Suspense>
      <PoreznaKartica />
      <PoreznaKarticaEdu />
    </>
  );
}
