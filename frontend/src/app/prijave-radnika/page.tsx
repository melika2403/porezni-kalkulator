import { Suspense } from "react";
import type { Metadata } from "next";
import Js3100Form from "src/sections/prijave-radnika/Js3100";

const PAGE_URL = "https://poreznikalkulator.ba/prijave-radnika";

export const metadata: Metadata = {
  title:
    "JS3100 — prijava, odjava i promjena podataka radnika online (FBiH) | Porezni Kalkulator BiH",
  description:
    "Popunite obrazac JS3100 online — prijava, odjava ili promjena podataka radnika u Jedinstveni sistem registracije, kontrole i naplate doprinosa (FBiH). Auto-popuna podataka iz profila i radnika, preuzimanje popunjenog PDF-a.",
  keywords: [
    "JS3100",
    "JS3100 obrazac",
    "JS-3100",
    "prijava radnika",
    "odjava radnika",
    "promjena podataka radnika",
    "jedinstveni sistem registracije doprinosa",
    "PIO prijava radnika",
    "ZZO prijava radnika",
    "JS3100 PDF",
    "JS3100 online",
    "FBiH prijava radnika",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "JS3100 — prijava / odjava radnika online (FBiH)",
    description:
      "Online popunjavanje obrasca JS3100 — prijava, odjava ili promjena podataka radnika u FBiH. Auto-popuna i preuzimanje PDF-a.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JS3100 obrazac — Porezni Kalkulator BiH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JS3100 — prijava / odjava radnika online (FBiH)",
    description:
      "Obrazac JS3100 online — prijava, odjava i promjena podataka radnika u FBiH.",
    images: ["/og-image.png"],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Šta je obrazac JS3100?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "JS3100 je obrazac za prijavu, odjavu ili promjenu podataka osiguranika u Jedinstvenom sistemu registracije, kontrole i naplate doprinosa u Federaciji BiH. Podnosi ga poslodavac za svakog radnika koji ulazi ili izlazi iz osiguranja.",
      },
    },
    {
      "@type": "Question",
      name: "Kada se podnosi JS3100?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pri zasnivanju radnog odnosa (prijava), prestanku radnog odnosa (odjava) ili kada se mijenjaju ključni podaci o osiguraniku (promjena). Rok za podnošenje je najkasnije dan prije početka rada radnika (za prijavu) ili u zakonskom roku nakon prestanka radnog odnosa.",
      },
    },
    {
      "@type": "Question",
      name: "Ko podnosi JS3100 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Obveznik uplate doprinosa (poslodavac, obrtnik, samostalni preduzetnik) podnosi JS3100 nadležnoj poreznoj ispostavi za svakog osiguranika.",
      },
    },
    {
      "@type": "Question",
      name: "Mogu li popuniti JS3100 online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. Porezni Kalkulator BiH omogućava online popunjavanje JS3100 obrasca sa auto-popunom podataka o organizaciji i radnicima iz vašeg profila. Generisani PDF se može direktno štampati i podnijeti.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Početna",
      item: "https://poreznikalkulator.ba/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Radnici",
      item: "https://poreznikalkulator.ba/#funkcije",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "JS3100 — prijava radnika",
      item: PAGE_URL,
    },
  ],
};

export default function Js3100Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Suspense fallback={null}>
        <Js3100Form />
      </Suspense>
    </>
  );
}
