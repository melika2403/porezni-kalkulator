import type { Metadata } from "next";
import PreracunPlate from "src/sections/plata/Plata";

const PAGE_URL = "https://poreznikalkulator.ba/preracun-neto-bruto";

export const metadata: Metadata = {
  title:
    "Kalkulator plate FBiH — preračun neto u bruto i bruto u neto | Porezni Kalkulator BiH",
  description:
    "Online kalkulator plate za Federaciju BiH — preračun neto u bruto i bruto u neto po važećim stopama. Pregled doprinosa radnika i poslodavca, poreza na dohodak i ukupnog troška poslodavca, besplatno.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Kalkulator plate FBiH — neto/bruto preračun",
    description:
      "Brz preračun plate u FBiH sa svim doprinosima i porezima. Doprinosi iz/na, porez na dohodak, ukupni trošak poslodavca.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Kako se računa neto plata iz bruto plate u FBiH?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Iz bruto plate se odbijaju doprinosi iz plate (31% ukupno: PIO 17%, zdravstveno 12,5%, nezaposlenost 1,5%). Na razliku se primjenjuje lični odbitak (300 KM × koeficijent) i obračunava porez na dohodak 10%. Neto plata = Bruto − doprinosi − porez.",
      },
    },
    {
      "@type": "Question",
      name: "Koje doprinose plaća poslodavac na bruto platu?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Poslodavac plaća dodatnih 10,5% na bruto platu: PIO/MIO 6%, zdravstveno 4%, nezaposlenost 0,5%. Dodatno se plaćaju opća vodna naknada 0,5% i naknada za zaštitu od nesreća 0,5%. Za privredna društva (d.o.o./d.d.) još i fond OSI 0,5%.",
      },
    },
    {
      "@type": "Question",
      name: "Šta uključuje ukupan trošak poslodavca za jednog radnika?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ukupan trošak = bruto plata + doprinosi na (10,5%) + opća vodna naknada (0,5%) + naknada za nesreće (0,5%) + fond OSI za d.o.o. (0,5%). Za obrt to je 111,5% bruto plate, za d.o.o. 112% bruto plate.",
      },
    },
    {
      "@type": "Question",
      name: "Kolika je stopa poreza na dohodak u FBiH?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "U Federaciji BiH se primjenjuje jedinstvena stopa poreza na dohodak od 10%. Porez se obračunava na poreznu osnovicu — bruto platu umanjenu za doprinose iz plate i lični odbitak.",
      },
    },
    {
      "@type": "Question",
      name: "Šta je lični odbitak i kako se uvećava?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Osnovni lični odbitak je 300 KM mjesečno (3.600 KM godišnje). Uvećava se preko poreznog koeficijenta za uzdržavane članove porodice — supružnika, djecu, roditelje. Da bi se koristio, radnik mora poslodavcu dostaviti Poreznu karticu (Obrazac PK-1) sa odobrenim koeficijentom.",
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
      name: "Preračun neto/bruto plate",
      item: PAGE_URL,
    },
  ],
};

export default function PreracunNetoBrutoPage() {
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
      <PreracunPlate />
    </>
  );
}
