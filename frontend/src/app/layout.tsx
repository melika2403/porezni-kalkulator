import type { Metadata } from "next";
import Navbar from "src/components/Navbar/Navbar";
import Footer from "src/components/Footer/Footer";
import "./globals.css";

// ── Replace with your real domain ─────────────────────────────────────────
const SITE_URL = "https://poreznikalkulator.ba";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Porezni Kalkulator BiH — SPR, GPD, Obračun plate, PDV",
    template: "%s | Porezni Kalkulator BiH",
  },

  description:
    "SPR-1053 · GPD-1051 · ZO3 obrazac · PDV kalkulator · Obračun neto/bruto plate · Stalna sredstva i amortizacija · Šihterica · Ugovori o djelu i pozajmici — besplatni porezni alati za poduzetnike u BiH. Bez excela, bez gužve.",

  keywords: [
    // ── Obrasci ──
    "SPR-1053",
    "GPD-1051",
    "ZO3 obrazac",
    "SPR obrazac BiH",
    "GPD obrazac BiH",
    "porezna prijava BiH",
    "porezni obrazac FBiH",
    "specifikacija dohotka samostalna djelatnost",
    "godišnja prijava poreza na dohodak",
    "ZO3 obrazac online",
    "ispunjavanje ZO3 obrasca",
    "ispuna ZO3 obrasca",
    "ZO3 obrazac PDF",
    "ZO3 obrazac USK",
    "ZO3 obrazac Tuzla",
    "ZO3 obrazac Sarajevo",
    "ZO3 obrazac Mostar",
    "ZO3 obrazac ZZO USK",
    "ZO3 obrazac KZZO SA",
    "Z03 obrazac HNŽ/K",
    "Z03 obrazac ZZO ZDK",
    "ZO3 obrazac ZZO TK",
    "ZO3",
    "GPD obrazac online",
    "GPD obrazac PDF",
    "GPD obrazac FBiH",
    "GPD obrazac BiH",
    "godišnja porezna prijava BiH",
    "godišnja porezna prijava FBiH",
    "godišnja porezna prijava online",
    "GPD popuni online",
    "Z03 popuni online",
    "SPR obrazac online",
    "SPR obrazac PDF",
    "SPR obrazac BiH",
    "SPR obrazac FBiH",
    "porezna prijava samostalna djelatnost BiH",
    "porezna prijava samostalna djelatnost FBiH",

    // ── Plate i doprinosi ──
    "obračun plate BiH",
    "neto bruto kalkulator",
    "kalkulator plate FBiH",
    "obračun doprinosa FBiH",
    "doprinosi na platu BiH",
    "bruto neto plata Bosna",
    "obračun neto plate",
    "obračun bruto plate",
    "porez na dohodak FBiH",
    "lični odbitak porez BiH",
    "PIO MIO doprinos BiH",
    "zdravstveno osiguranje FBiH",
    "troškovi poslodavca BiH",
    "troškovi na minimalnu platu BiH",
    "koliko košta radnik poslodavca BiH",
    "minimalna plata BiH 2026",
    "bruto plata minimalna BiH 2026",
    "bruo plata koliko košta",
    "neto plata minimalna BiH 2026",
    "troškovi pio 2026 FBiH",
    "troškovi zdravstvo 2026 FBiH",
    "porez na dohodak minimalna plata BiH 2026",
    "porez na dohodak bruto plata minimalna BiH 2026",
    "porez na dohodak neto plata minimalna BiH 2026",
    "stope doprinosa FBiH 2026",
    "stope poreza na dohodak FBiH 2026",
    "kolika je minimalna plata u BiH 2026",

    // ── PDV ──
    "PDV kalkulator BiH",
    "preračun PDV-a",
    "PDV 17% BiH",
    "kalkulator PDV Bosna",
    "cijena bez PDV-a",
    "cijena sa PDV-om",
    "izbijanje PDV-a BiH",
    "izbijanje PDV-a Bosna",
    "preračun PDV-a BiH",
    "preračun PDV-a Bosna",
    "Kako izbiti PDV iz cijene BiH",
    "Kako izbiti PDV iz cijene Bosna",
    "Kako izračunati PDV BiH",
    "Kako izračunati PDV Bosna",
    "Kako izračunati cijenu sa PDV-om BiH",
    "Kako izračunati cijenu sa PDV-om Bosna",
    "Kako izračunati cijenu bez PDV-a BiH",
    "Kako izračunati cijenu bez PDV-a Bosna",
    "pdv kalkulator online BiH",
    "pdv kalkulator online Bosna",
    "pdv kalkulator besplatni BiH",
    "pdv kalkulator besplatni Bosna",
    "cijena bez pdv-a i sa pdv-om BiH",
    "cijena bez pdv-a i sa pdv-om Bosna", 
    "preračun stope PDV-a BiH",
    "preračun stope PDV-a Bosna",
    "kako preračunati PDV",
    "Kako preračunati PDV BiH",
    "Kako preračunati PDV Bosna",


    // ── Stalna sredstva ──
    "stalna sredstva amortizacija",
    "obračun amortizacije BiH",
    "evidencija stalnih sredstava",
    "obračun amortizacije stalnih sredstava BiH",
    "kalkulator amortizacije BiH",
    "kalkulator amortizacije stalnih sredstava BiH",
    "amortizacija stalnih sredstava BiH",
    "amortizacija BiH",
    "stalna sredstva BiH",
    "vođenje stalnih sredstava BiH",
    "vođenje stalnih sredstava online BiH",
    "besplatno vođenje stalnih sredstava BiH",
    "besplatno vođenje stalnih sredstava online BiH",
    "stalna sredstva i amortizacija BiH",
    "stalna sredstva i amortizacija online BiH",
    "besplatno online vođenje stalnih sredstava i amortizacije BiH",
    "amortizacija vozila BiH",
    "amortizacija računara BiH",
    "amortizacija opreme BiH",
    "besplatna evidencija stalnih sredstava BiH",
    "besplatna evidencija stalnih sredstava online BiH",
    "kako obračunati amortizaciju BiH",
    "kako obračunati amortizaciju stalnih sredstava BiH",
    "kalkulator amortizacije vozila BiH",
    "kalkulator amortizacije računara BiH",
    "kalkulator amortizacije opreme BiH",

    // ── Ugovori ──
    "ugovor o djelu BiH",
    "ugovor o pozajmici",
    "ugovor o radu BiH",
    "obračun honorara BiH",
    "pozajmice obrazac BiH",
    "ugovor o zakupu BiH",
    "ugovor o kupoprodaji BiH",
    "ugovor o djelu sa obračunom troškova BiH",
    "ugovor o djelu sa obračunom poreza BiH",
    "besplatan ugovor o pozajmici PDF BiH",
    "besplatan ugovor o pozajmici online BiH",
    "besplatan ugovor o pozajmici BiH",
    "besplatan ugovor o pozajmici word BiH",
    "besplatan ugovor o zakupu PDF BiH",
    "besplatan ugovor o zakupu online BiH",
    "besplatan ugovor u pozajmici word dokument",
    "ugovor o pozajmici online template",
    "ugovor o pozajmici ispunjavanje online BiH",
    "ugovor o pozajmici ispunjavanje online Bosna",
    "besplatan ugovor o djelu sa obračunom troškova BiH",
    "besplatan ugovor o djelu sa obračunom poreza BiH",
    "ugovor o djelu sa obračunom troškova online BiH",
    "ugovor o djelu sa obračunom poreza online BiH",
    "šablon ugovora o pozajmici BiH",
    "šablon ugovora o zakupu BiH",
    "šablon ugovora o kupoprodaji BiH",
    "šablon ugovora o djelu BiH",
    "šablon ugovora o radu BiH",
    "besplatan šablon ugovora o pozajmici BiH",
    "besplatan šablon ugovora o zakupu BiH",
    "besplatan šablon ugovora o kupoprodaji BiH",
    "besplatan šablon ugovora o djelu BiH",
    "besplatan šablon ugovora o radu BiH",
    "ispuni ugovor o pozajmici online BiH",
    "ispuni ugovor o pozajmici online Bosna",
    "ispuni ugovor o zakupu online BiH",
    "ispuni besplatno ugovor o pozajmici",
    "obični template ugovora o pozajmici BiH",
    "obični template ugovora o zakupu BiH",
    "obični template ugovora o kupoprodaji BiH",
    "obični template ugovora o djelu BiH",
    "obični template ugovora o radu BiH",

    // ── Opći pojmovi ──
    "porezni kalkulator BiH",
    "porezni kalkulator Bosna",
    "porezne obaveze BiH",
    "porezna uprava FBiH",
    "FBiH porez",
    "kalkulator za poduzetnike BiH",
    "besplatni porezni alati BiH",
    "obrt BiH porez",
    "samostalna djelatnost BiH",
    "računovodstvo BiH online",
    "računovodstvo BiH besplatno online",
    "doo BiH porez",
    "porezni kalulatori FBiH",
    "porezni kalkulatori BiH",
    "porezni kalkulatori online BiH",
    "jednostavni porezni kalkulator BiH",
    "besplatni porezni kalkulator BiH",
    "besplatni online porezni kalkulator BiH",
    "porezne obaveze jednostavno BiH",

  ],

  authors: [{ name: "Porezni Kalkulator BiH" }],
  creator: "Porezni Kalkulator BiH",

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  alternates: {
    canonical: SITE_URL,
  },

  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: SITE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Porezni Kalkulator BiH — SPR, GPD, Obračun plate, PDV",
    description:
      "SPR-1053 · GPD-1051 · ZO3 · PDV kalkulator · Obračun plate · Stalna sredstva · Šihterica · Ugovori — besplatni porezni alati za poduzetnike u BiH.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Porezni Kalkulator BiH",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Porezni Kalkulator BiH — SPR, GPD, Obračun plate, PDV",
    description:
      "Besplatni porezni kalkulator za poduzetnike u BiH. SPR-1053, GPD-1051, PDV, obračun plate i više.",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Porezni Kalkulator BiH",
  url: SITE_URL,
  description:
    "Besplatni porezni kalkulator za poduzetnike u Bosni i Hercegovini.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "BAM" },
  inLanguage: "bs",
  areaServed: { "@type": "Country", name: "Bosnia and Herzegovina" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bs">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
