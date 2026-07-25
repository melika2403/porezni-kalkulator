import type { Metadata } from "next";
import Script from "next/script";
import ConditionalNavbar from "src/components/Navbar/ConditionalNavbar";
import ConditionalFooter from "src/components/Footer/ConditionalFooter";
import Providers from "src/components/Providers/Providers";
import ConsentBanner from "src/components/ConsentBanner/ConsentBanner";
import TrialToast from "src/components/TrialToast/TrialToast";
import ConditionalChrome from "src/components/ConditionalChrome/ConditionalChrome";
import MetaPixelPageView from "src/components/MetaPixel/MetaPixelPageView";
import "./fonts.css";
import "./globals.css";

// ── Replace with your real domain ─────────────────────────────────────────
const SITE_URL = "https://www.poreznikalkulator.ba";

// Meta (Facebook) Pixel: postavi NEXT_PUBLIC_META_PIXEL_ID u .env da se
// aktivira. Consent model isti kao GA4: revoke po defaultu, grant tek na
// "Prihvati sve" (ConsentBanner); eventi prije granta čekaju u redu.
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Porezni Kalkulator BiH, obrasci, plate, PDV i ugovori",
    template: "%s | Porezni Kalkulator BiH",
  },

  description:
    "Obračun plate, porezni obrasci (SPR, GPD, MIP), fakture, ugovori i knjigovodstvo obrta na jednom mjestu. Besplatni alati za obrtnike, firme i knjigovođe u FBiH.",
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
    title: "Porezni Kalkulator BiH | Plate, obrasci i knjigovodstvo za FBiH",
    description:
      "Obračun plate, porezni obrasci, fakture, ugovori i knjigovodstvo obrta na jednom mjestu. Besplatni alati za obrtnike, firme i knjigovođe u FBiH.",
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

        {/* Meta Pixel (consent revoked dok korisnik ne prihvati u banneru). */}
        {META_PIXEL_ID && (
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
                n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
                s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
                document,'script','https://connect.facebook.net/en_US/fbevents.js');
                fbq('consent', 'revoke');
                try {
                  if (localStorage.getItem('cookieConsent') === 'accepted') {
                    fbq('consent', 'grant');
                  }
                } catch (e) {}
                fbq('init', '${META_PIXEL_ID}');
                fbq('track', 'PageView');
              `,
            }}
          />
        )}
        <Providers>
          <ConditionalNavbar />
          <div className="pageContent">{children}</div>
          <ConditionalFooter />
          <ConsentBanner />
          {/* potvrda aktivacije probe; mora biti van paywall-a koji nestane */}
          <TrialToast />
          {META_PIXEL_ID && <MetaPixelPageView />}
        </Providers>
      </body>
    </html>
  );
}
