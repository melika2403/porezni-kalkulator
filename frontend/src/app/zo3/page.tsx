import type { Metadata } from "next";
import Zo3Form from "src/sections/zo3/Zo3";

const PAGE_URL = "https://poreznikalkulator.ba/zo3";

export const metadata: Metadata = {
  title:
    "ZO3 obrazac — prijava člana porodice na zdravstveno osiguranje | Porezni Kalkulator BiH",
  description:
    "Popunite ZO3 obrazac online i prijavite supružnika, dijete ili roditelja na zdravstveno osiguranje u FBiH. Auto-popuna, popunjen PDF spreman za predaju Zavodu — besplatno, bez registracije.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "ZO3 obrazac online — prijava člana porodice na zdravstveno",
    description:
      "Online popunjavanje ZO3 obrasca za sve kantone u FBiH — supružnik, djeca, roditelji. PDF spreman za predaju.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Šta je ZO3 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ZO3 je obrazac 'Prijava o promjeni u tijeku osiguranja' koji se koristi za prijavu članova porodice na zdravstveno osiguranje osiguranika. Putem ovog obrasca možete dodati supružnika, djecu ili roditelje na svoje zdravstveno osiguranje.",
      },
    },
    {
      "@type": "Question",
      name: "Ko može biti prijavljen kao član porodice na zdravstveno osiguranje?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Na zdravstveno osiguranje kao uzdržavani članovi porodice mogu se prijaviti: supružnik, djeca (maloljetna ili na redovnom školovanju), te roditelji osiguranika — ukoliko to pravo ne ostvaruju po drugom osnovu (npr. kroz vlastito zaposlenje ili penziju).",
      },
    },
    {
      "@type": "Question",
      name: "Kako se podnosi ZO3 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ZO3 obrazac podnosi poslodavac na zahtjev osiguranika, u dva primjerka, nadležnoj regionalnoj ispostavi Zavoda zdravstvenog osiguranja. Uz obrazac je potrebno priložiti odgovarajuću dokumentaciju zavisno od vrste člana porodice koji se prijavljuje.",
      },
    },
    {
      "@type": "Question",
      name: "Koja dokumentacija je potrebna uz ZO3 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Uz popunjeni i ovjereni ZO3 obrazac potrebno je priložiti dokumentaciju koja dokazuje srodstvo i uzdržavanje — npr. izvod iz matične knjige vjenčanih za supružnika, rodni list za djecu, te dokaz da član porodice nema zdravstveno osiguranje po drugom osnovu.",
      },
    },
    {
      "@type": "Question",
      name: "Gdje mogu preuzeti ZO3 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ZO3 obrazac dostupan je za preuzimanje na web stranicama kantonalnih zavoda zdravstvenog osiguranja. Na našoj stranici možete ga popuniti online i preuzeti u PDF formatu.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kako popuniti ZO3 obrazac",
  description:
    "Korak-po-korak vodič za prijavu člana porodice na zdravstveno osiguranje u FBiH putem ZO3 obrasca.",
  inLanguage: "bs",
  totalTime: "PT8M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Unesite podatke o osiguraniku",
      text: "Ime i prezime, JMB, adresa, JIB poslodavca i naziv kantonalnog Zavoda zdravstvenog osiguranja.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Unesite podatke o članu porodice",
      text: "Ime, prezime, JMB, srodstvo, datum stupanja na osiguranje. Za djecu na školovanju navedite školu i razred/godinu.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Preuzmite popunjeni ZO3 PDF",
      text: "Popunjeni obrazac u 2 primjerka, priloženu dokaznu dokumentaciju (rodni list, izvod iz matične knjige, dokaz o školovanju) i predaja u nadležnom Zavodu.",
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
      name: "ZO3 obrazac",
      item: PAGE_URL,
    },
  ],
};

export default function Zo3Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Zo3Form />
    </>
  );
}
