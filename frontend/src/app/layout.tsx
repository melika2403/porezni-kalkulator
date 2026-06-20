import type { Metadata } from "next";
import Script from "next/script";
import ConditionalNavbar from "src/components/Navbar/ConditionalNavbar";
import ConditionalFooter from "src/components/Footer/ConditionalFooter";
import Providers from "src/components/Providers/Providers";
import ConsentBanner from "src/components/ConsentBanner/ConsentBanner";
import ConditionalChrome from "src/components/ConditionalChrome/ConditionalChrome";
import "./fonts.css";
import "./globals.css";

// ── Replace with your real domain ─────────────────────────────────────────
const SITE_URL = "https://poreznikalkulator.ba";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Porezni Kalkulator BiH, SPR, GPD, ZO3, AMS-1035, Ugovor o pozajmici, Obračun plate, PDV",
    template: "%s | Porezni Kalkulator BiH",
  },

  description:
    "SPR-1053 · GPD-1051 · ZO3 obrazac · AMS-1035 · PDV kalkulator · Obračun neto/bruto plate · Stalna sredstva i amortizacija · Šihterica · Ugovori o djelu i pozajmici, besplatni porezni alati za poduzetnike u BiH. Bez excela, bez gužve.",
authors: [{ name: "Porezni Kalkulator BiH" }],
  creator: "Porezni Kalkulator BiH",

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  alternates: {
    canonical: SITE_URL,
    types: {
      "application/rss+xml": `${SITE_URL}/feed.xml`,
    },
  },

  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: SITE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Porezni Kalkulator BiH, SPR, GPD, ZO3, AMS-1035, Ugovor o pozajmici, Obračun plate, PDV",
    description:
      "SPR-1053 · GPD-1051 · ZO3 · AMS-1035 · PDV kalkulator · Obračun plate · Stalna sredstva · Šihterica · Ugovori, besplatni porezni alati za poduzetnike u BiH.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Porezni Kalkulator BiH",
      },
    ],
  },

  // Twitter/X kartice: definisan je samo tip; title/description/sliku
  // svaka stranica izvodi iz svojih og:* tagova (bez generičkog teksta)
  twitter: {
    card: "summary_large_image",
  },
};

// Jezici sadržaja — isti sadržaj razumljiv na bs/hr/sr (ne pravimo odvojene
// verzije). @id-ovi omogućavaju da se entiteti međusobno referenciraju.
const CONTENT_LANGS = ["bs", "hr", "sr"];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": `${SITE_URL}/#webapp`,
  name: "Porezni Kalkulator BiH",
  url: SITE_URL,
  description:
    "Besplatni porezni kalkulator za poduzetnike u Bosni i Hercegovini.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "BAM" },
  inLanguage: CONTENT_LANGS,
  publisher: { "@id": `${SITE_URL}/#organization` },
  areaServed: { "@type": "Country", name: "Bosnia and Herzegovina" },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Porezni Kalkulator BiH",
  url: SITE_URL,
  logo: `${SITE_URL}/og-image.png`,
  description:
    "Besplatni porezni alati za poduzetnike u Bosni i Hercegovini, obrasci, kalkulatori, obračun plata i reference za FBiH.",
  email: "info@poreznikalkulator.ba",
  address: {
    "@type": "PostalAddress",
    addressCountry: "BA",
  },
  sameAs: [
    "https://www.facebook.com/profile.php?id=61569234208200",
    "https://www.instagram.com/poreznikalkulator.ba/",
    "https://www.linkedin.com/in/porezni-kalkulator-513429404/",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Porezni Kalkulator BiH",
  url: SITE_URL,
  inLanguage: CONTENT_LANGS,
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/sifre-djelatnosti?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bs" suppressHydrationWarning>
      <body>
        <Script
          id="ld-json"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script
          id="ld-json-organization"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="ld-json-website"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2397552510995902"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Google Analytics 4 sa Consent Mode v2 (default = denied). */}
        {/* Stvarno prati tek kad korisnik prihvati u ConsentBanner-u. */}
        <Script
          id="ga4-loader"
          src="https://www.googletagmanager.com/gtag/js?id=G-60NQQS6QXJ"
          strategy="afterInteractive"
        />
        <Script
          id="ga4-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'wait_for_update': 500
              });
              gtag('js', new Date());
              gtag('config', 'G-60NQQS6QXJ', { anonymize_ip: true });
            `,
          }}
        />
        <Providers>
          <ConditionalNavbar />
          <div className="pageContent">{children}</div>
          <ConditionalFooter />
          <ConsentBanner />
        </Providers>
      </body>
    </html>
  );
}
