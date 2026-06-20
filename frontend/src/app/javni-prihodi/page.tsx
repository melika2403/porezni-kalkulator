import type { Metadata } from "next";
import { reviewedFor } from "src/data/contentMeta";
import JavniPrihodi from "src/sections/javni-prihodi/JavniPrihodi";
import {
  VRSTE_PRIHODA_GROUPS,
  BUDZETSKE_ORGANIZACIJE,
} from "src/data/javni-prihodi";
import {
  FEDERALNI_RACUNI,
  KANTONALNI_BUDZETI,
  KANTONALNI_ZZO,
  KANTONALNE_SLUZBE_ZAPOSLJAVANJE,
} from "src/data/uplatni-racuni";
import { OPCINE_GROUPS } from "src/data/opcine";

const PAGE_URL = "https://poreznikalkulator.ba/javni-prihodi";

const totalVrste = VRSTE_PRIHODA_GROUPS.reduce((a, g) => a + g.items.length, 0);
const totalRacuni =
  FEDERALNI_RACUNI.length +
  KANTONALNI_BUDZETI.length +
  KANTONALNI_ZZO.length +
  KANTONALNE_SLUZBE_ZAPOSLJAVANJE.length;
const totalOpcina = OPCINE_GROUPS.reduce((a, g) => a + g.opcine.length, 0);

export const metadata: Metadata = {
  title:
    "Uplatni računi javnih prihoda FBiH, 315 šifri vrsta prihoda + općinski računi | Porezni Kalkulator BiH",
  description:
    `Kompletna referenca: ${totalRacuni} federalna i kantonalna uplatna računa, ${totalVrste} šifri vrsta prihoda i ${totalOpcina} općinskih računa za uplate javnih prihoda u FBiH. Pretraga po šifri ili nazivu, copy-paste direktno u platni nalog. Federalni računi uvijek aktuelni sa PUFBiH stranice.`,
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
    type: "article",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title:
      "Uplatni računi javnih prihoda FBiH, 315 šifri vrsta prihoda + općinski računi",
    description:
      "Brojevi računa, šifre vrsta prihoda, općinski računi i budžetske organizacije za sve uplate javnih prihoda u FBiH. Federalni računi uvijek aktuelni sa PUFBiH stranice.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Uplatni računi javnih prihoda FBiH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Uplatni računi javnih prihoda FBiH, kompletna referenca",
    description:
      "315 šifri vrsta prihoda, federalni i kantonalni računi, općinski računi i budžetske organizacije.",
    images: ["/og-image.png"],
  },
};

// ── JSON-LD schemas ─────────────────────────────────────────────────────

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Uplatni računi javnih prihoda FBiH (PUFBiH)",
  description:
    "Referenca uplatnih računa, šifri vrsta prihoda, općinskih računa i budžetskih organizacija za uplate javnih prihoda u Federaciji BiH. Federalni i kantonalni računi sinhronizirani sa live PUFBiH stranicom.",
  url: PAGE_URL,
inLanguage: ["bs", "hr", "sr"],
  isAccessibleForFree: true,
  dateModified: reviewedFor("/javni-prihodi"),
  variableMeasured: [
    `${totalRacuni} federalnih i kantonalnih uplatnih računa`,
    `${totalVrste} šifri vrsta prihoda`,
    `${totalOpcina} općinskih budžetskih računa`,
  ],
  creator: {
    "@type": "Organization",
    name: "Porezna uprava Federacije BiH",
    url: "https://www.pufbih.ba",
  },
  publisher: {
    "@type": "Organization",
    name: "Porezni Kalkulator BiH",
    url: "https://poreznikalkulator.ba",
  },
  license: "https://www.pufbih.ba",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Šta je vrsta prihoda i gdje se upisuje u platni nalog?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Vrsta prihoda je šestocifrena šifra po ekonomskoj klasifikaciji javnih prihoda u FBiH (npr. 712112 za doprinos PIO/MIO, 716111 za porez na dohodak iz plate). Upisuje se u polje 11. platnog naloga i određuje na koji depozitni račun se prihod usmjerava.",
      },
    },
    {
      "@type": "Question",
      name: "Koja je šifra vrste prihoda za doprinos PIO/MIO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Doprinos za penzijsko i invalidsko osiguranje iz plaća i na plaće ima šifru 712112. Uplaćuje se na račun Budžeta Federacije: 102-050-00001066-98 (Union banka d.d. Sarajevo).",
      },
    },
    {
      "@type": "Question",
      name: "Koje su šifre vrste prihoda za doprinose za zdravstveno osiguranje?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Doprinos za zdravstveno osiguranje iz plate i na platu ima šifru 712111. Iznos se dijeli: 89,8% na kantonalni ZZO prema prebivalištu radnika, 10,2% na ZZO i reosiguranja FBiH (račun 102-050-00000640-18).",
      },
    },
    {
      "@type": "Question",
      name: "Koja je šifra vrste prihoda za doprinos za nezaposlenost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Doprinos za osiguranje od nezaposlenosti ima šifru 712113. Dijeli se: 30% na račun Federalnog zavoda za zapošljavanje (161-000-00285700-03), 70% na kantonalnu službu za zapošljavanje prema prebivalištu radnika.",
      },
    },
    {
      "@type": "Question",
      name: "Koja je šifra vrste prihoda za porez na dohodak?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Porez na dohodak fizičkih lica od imovine i imovinskih prava ima šifru 716113. Uplaćuje se na račun kantonalnog budžeta prema prebivalištu obveznika.",
      },
    },
    {
      "@type": "Question",
      name: "Koji je račun Budžeta Federacije BiH?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Račun javnih prihoda Budžeta Federacije BiH je 102-050-00001066-98 (Union banka d.d. Sarajevo). Na njega se uplaćuju federalni porezi, doprinos PIO/MIO, opća vodna naknada, naknada za zaštitu od prirodnih nesreća i drugi federalni prihodi.",
      },
    },
    {
      "@type": "Question",
      name: "Razlikuju li se kantonalni računi za zdravstveno osiguranje?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. Svaki od 10 kantona u FBiH ima svoj kantonalni Zavod zdravstvenog osiguranja sa zasebnim računom. 89,8% obračunatog doprinosa za zdravstvo uplaćuje se na kantonalni račun prema mjestu prebivališta radnika, a 10,2% na federalni ZZO račun.",
      },
    },
    {
      "@type": "Question",
      name: "Šta je budžetska organizacija u platnom nalogu?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Budžetska organizacija je sedmocifrena šifra organizacione klasifikacije korisnika javnog prihoda. Upisuje se u polje 15. platnog naloga kada se prihod prati po budžetskom korisniku (npr. 5102001 za Federalni zavod za PIO/MIO).",
      },
    },
    {
      "@type": "Question",
      name: "Šta je trocifrena šifra općine i gdje se upisuje?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Trocifrena šifra općine identifikuje općinu prema mjestu prebivališta poreznog obveznika ili sjedišta organizacije. Upisuje se u polje 14. platnog naloga. Npr. Sarajevo Centar = 077, Tuzla = 094, Mostar = 180.",
      },
    },
    {
      "@type": "Question",
      name: "Da li su uplatni računi sa ove stranice aktuelni?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Federalni i kantonalni računi (Budžet FBiH, ZZO, Federalni zavod za zapošljavanje, Fond invalida, kantonalni budžeti) sinhronizirani su sa live PUFBiH API-jem i uvijek su aktuelni. Općinski računi su iz najnovijeg pravilnika PUFBiH (sekcija 12.1.3), za 100% aktuelne podatke provjeriti na pufbih.ba.",
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
      name: "Uplatni računi javnih prihoda FBiH",
      item: PAGE_URL,
    },
  ],
};

// DefinedTermSet — every vrsta prihoda becomes a DefinedTerm for SEO
const definedTermSetSchema = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  "@id": PAGE_URL + "#vrste-prihoda",
  name: "Šifre vrsta prihoda FBiH",
  description:
    "Šestocifrene šifre vrsta prihoda po ekonomskoj klasifikaciji javnih prihoda u Federaciji BiH (polje 11. platnog naloga).",
  url: PAGE_URL,
  inLanguage: "bs",
  hasDefinedTerm: VRSTE_PRIHODA_GROUPS.flatMap((g) =>
    g.items
      .filter((it) => it.name)
      .map((it) => ({
        "@type": "DefinedTerm",
        "@id": `${PAGE_URL}#prihod-${it.code}`,
        identifier: it.code,
        name: it.name,
        termCode: it.code,
        url: `${PAGE_URL}#prihod-${it.code}`,
        inDefinedTermSet: PAGE_URL + "#vrste-prihoda",
      })),
  ),
};

void BUDZETSKE_ORGANIZACIJE; // referenced for typing only

export default function JavniPrihodiPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetSchema) }} />
      <JavniPrihodi />
    </>
  );
}
