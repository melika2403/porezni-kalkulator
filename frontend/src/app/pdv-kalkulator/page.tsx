import type { Metadata } from "next";
import { OG_IMAGE } from "src/lib/ogImage";
import PdvKalkulator from "src/sections/pdv/Pdv";

const PAGE_URL = "https://www.poreznikalkulator.ba/pdv-kalkulator";

export const metadata: Metadata = {
  title: "PDV kalkulator BiH, preračun stope 17%",
  description:
    "PDV kalkulator za BiH sa stopom 17%, preračun iz cijene bez PDV-a i iz maloprodajne cijene u oba smjera, podrška za KM i EUR, besplatno.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    images: OG_IMAGE,
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "PDV kalkulator BiH, stopa 17% u oba smjera",
    description:
      "Brz online PDV kalkulator za BiH. Iz neto u bruto cijenu i obrnuto, podrška KM i EUR.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Kolika je stopa PDV-a u Bosni i Hercegovini?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "U Bosni i Hercegovini se primjenjuje jedinstvena stopa PDV-a od 17%. Ista stopa važi na cijeloj teritoriji države, u FBiH, Republici Srpskoj i Brčko Distriktu. PDV administrira Uprava za indirektno oporezivanje (UINO).",
      },
    },
    {
      "@type": "Question",
      name: "Kako se računa PDV iz cijene bez PDV-a?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cijenu bez PDV-a pomnožite sa 1,17 da dobijete cijenu sa PDV-om. Primjer: 100,00 KM × 1,17 = 117,00 KM. Sam iznos PDV-a dobijete množenjem neto cijene sa 0,17 (17%).",
      },
    },
    {
      "@type": "Question",
      name: "Kako se računa PDV iz cijene s PDV-om?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cijenu s PDV-om podijelite sa 1,17 da dobijete cijenu bez PDV-a. Primjer: 117,00 KM ÷ 1,17 = 100,00 KM. Iznos PDV-a iz bruto cijene = bruto × 17/117 (≈ 0,1453).",
      },
    },
    {
      "@type": "Question",
      name: "Ko mora biti PDV obveznik u BiH?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Obavezna registracija u sistem PDV-a nastupa kada godišnji oporezivi promet pređe 100.000,00 KM. Ispod tog praga registracija je dobrovoljna. Uvoznici dobara su obvezni bez obzira na visinu prometa.",
      },
    },
    {
      "@type": "Question",
      name: "Kada se predaje PDV prijava?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PDV prijava se predaje UINO-u do 10. u mjesecu za prethodni mjesec, uz uplatu obračunate obaveze. e-KUF i e-KIF (knjige ulaznih i izlaznih faktura) dostavljaju se do 20. u mjesecu.",
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
      item: "https://www.poreznikalkulator.ba/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "PDV kalkulator",
      item: PAGE_URL,
    },
  ],
};

export default function PdvKalkulatorPage() {
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
      <PdvKalkulator />
    </>
  );
}
