import { Suspense } from "react";
import type { Metadata } from "next";
import { OG_IMAGE } from "src/lib/ogImage";
import Freelancer from "src/sections/freelancer/Freelancer";
import { FREELANCER_FAQ } from "src/sections/freelancer/faq";

const PAGE_URL = "https://www.poreznikalkulator.ba/freelancer";

export const metadata: Metadata = {
  title: "PK Freelancer, porezni asistent za honorare iz inostranstva",
  description:
    "Evidencija uplata iz inostranstva za freelancere u FBiH: AMS-1035 i uplatnice iz evidencije, podsjetnik na rok od 5 dana, GPD-1051 jednim klikom i pregled prihoda za banku. 50 KM godišnje, 30 dana besplatno.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    images: OG_IMAGE,
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "PK Freelancer, porezni asistent za freelancere u FBiH",
    description:
      "Svaka uplata iz inostranstva na jednom mjestu: AMS-1035, uplatnice, rokovi, GPD-1051 i pregled prihoda. 50 KM godišnje sa PDV-om.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PK Freelancer, porezni asistent za honorare iz inostranstva",
    description:
      "AMS-1035 i uplatnice iz evidencije, podsjetnici na rokove, GPD-1051 jednim klikom. Za freelancere u FBiH.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FREELANCER_FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PK Freelancer",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  url: PAGE_URL,
  description:
    "Porezni asistent za freelancere u Federaciji BiH: evidencija uplata iz inostranstva, AMS-1035 i uplatnice, podsjetnici na rokove, GPD-1051 i pregled prihoda.",
  offers: {
    "@type": "Offer",
    price: "50.00",
    priceCurrency: "BAM",
    description: "Godišnja pretplata sa uračunatim PDV-om, prvih 30 dana besplatno",
  },
  publisher: { "@type": "Organization", name: "Porezni Kalkulator BiH", url: "https://www.poreznikalkulator.ba/" },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Početna", item: "https://www.poreznikalkulator.ba/" },
    { "@type": "ListItem", position: 2, name: "PK Freelancer", item: PAGE_URL },
  ],
};

export default function FreelancerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Suspense fallback={null}>
        <Freelancer />
      </Suspense>
    </>
  );
}
