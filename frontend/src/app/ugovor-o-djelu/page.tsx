import UgovorODjelu from "src/sections/ugovor-o-djelu/UgovorODjelu";

import type { Metadata } from "next";

const PAGE_URL = "https://poreznikalkulator.ba/ugovor-o-djelu";

export const metadata: Metadata = {
  title: "Ugovor o djelu — kalkulator poreza i doprinosa, predložak (Word/PDF) | Porezni Kalkulator BiH",
  description:
    "Kako popuniti ugovor o djelu u FBiH? Online kalkulator poreza i doprinosa (NETO ↔ BRUTO), predložak ugovora u Word i PDF formatu te 6 uplatnica spremnih za banku — besplatno, bez registracije.",
  keywords: [
    "ugovor o djelu",
    "ugovor o djelu kalkulator",
    "ugovor o djelu FBiH",
    "obračun ugovora o djelu",
    "porez na ugovor o djelu",
    "doprinosi ugovor o djelu",
    "ugovor o djelu predložak",
    "kako popuniti ugovor o djelu",
    "uplatnice ugovor o djelu",
    "neto bruto ugovor o djelu",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Ugovor o djelu — kalkulator i predložak | Porezni Kalkulator BiH",
    description:
      "Online kalkulator poreza i doprinosa za ugovor o djelu (FBiH), predložak ugovora u Word i PDF formatu te 6 uplatnica spremnih za banku.",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "Ugovor o djelu — Porezni Kalkulator BiH" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ugovor o djelu — kalkulator, predložak i uplatnice (FBiH)",
    description:
      "Obračunajte porez i doprinose na ugovor o djelu u FBiH. Generišite ugovor (DOCX/PDF) i 6 uplatnica spremnih za banku.",
    images: ["/og-image.png"],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Šta je ugovor o djelu?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ugovor o djelu je vrsta autorskog ugovora kojim se izvršilac obavezuje da naručiocu obavi određeni posao (npr. izrada projekta, sastavljanje teksta, pružanje usluge), a naručilac da mu za to plati ugovorenu naknadu. Razlikuje se od ugovora o radu po tome što ne zasniva radni odnos.",
      },
    },
    {
      "@type": "Question",
      name: "Koji porezi i doprinosi se plaćaju na ugovor o djelu u FBiH?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Iz bruto naknade priznaju se 20% normirani rashodi (ili 30% za autorska djela, 0% za naknade članovima komisija). Na umanjenu osnovicu plaća se 4% doprinos za zdravstveno (radnik) i 10% porez na dohodak. Naručilac dodatno plaća 6% PIO doprinos te 0,5% zaštita od prirodnih nepogoda i 0,5% opšta vodna naknada na neto iznos.",
      },
    },
    {
      "@type": "Question",
      name: "Ko podnosi i plaća poreze i doprinose?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Naručilac (poslodavac) ima obavezu da obračuna i uplati sve poreze i doprinose pri isplati naknade izvršiocu. Naknada se isplaćuje neto, a sve dažbine idu na zaseban budžetski račun preko uplatnica.",
      },
    },
    {
      "@type": "Question",
      name: "Kako se računa neto iz bruto iznosa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Neto = Bruto × 0,8912 za standardni UoD (20% troškova). Za autorska djela (30% troškova) faktor je oko 0,927, a za komisije i nadzorne odbore (0% troškova) je 0,864. Suprotno, za pretvorbu neto u bruto koristi se faktor 1,122083 odnosno 1,157407 za komisije.",
      },
    },
    {
      "@type": "Question",
      name: "Mogu li sklopiti ugovor o djelu sa zaposlenom osobom?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. Ugovor o djelu može se sklopiti i sa licem koje je već u radnom odnosu kod drugog poslodavca. Stope poreza i doprinosa su iste. Bitno je da posao po UoD-u nije iste prirode kao redovni posao kod osnovnog poslodavca.",
      },
    },
    {
      "@type": "Question",
      name: "Koji je rok za uplatu poreza i doprinosa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Porezi i doprinosi se uplaćuju istovremeno sa isplatom naknade izvršiocu, najkasnije isti dan kad se neto iznos isplaćuje na njegov račun. Naručilac je odgovoran za pravovremeno podnošenje obrazaca i uplatu na nadležne račune.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kako popuniti ugovor o djelu i obračunati porez u FBiH",
  description:
    "Korak po korak: unesite iznos naknade, popunite naručioca i izvršioca, izaberite kanton/općinu i preuzmite ugovor (Word/PDF) i 6 uplatnica spremnih za banku.",
  totalTime: "PT5M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Unesite iznos naknade",
      text: "Odaberite vrstu naknade (standardna 20%, autorsko djelo 30%, komisija 0%) i unesite NETO ili BRUTO iznos. Kalkulator automatski računa porez, doprinose, PIO, zaštitu i vodnu naknadu.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Popunite ugovorne strane",
      text: "Unesite podatke naručioca (firma/obrt) i izvršioca (radnik). Ako imate sačuvane podatke u profilu, koristite dropdown 'Popuni' za jednim klikom.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Detalji ugovora",
      text: "Upišite predmet posla, datum zaključenja, rok izvršenja, broj ugovora, mjesto i nadležni sud u slučaju spora.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Preuzmite ugovor",
      text: "Generišite ugovor u Word (DOCX) ili PDF formatu — predložak je popunjen vašim podacima i spreman za potpis.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Preuzmite uplatnice",
      text: "Odaberite kanton i općinu naručioca, pa preuzmite jedan PDF sa svih 6 uplatnica (zdravstvo kantona/FBiH, porez, PIO, zaštita, vodna naknada) — svaka popunjena i spremna za banku ili elektronsko plaćanje.",
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Početna", item: "https://poreznikalkulator.ba/" },
    { "@type": "ListItem", position: 2, name: "Ugovori", item: "https://poreznikalkulator.ba/#funkcije" },
    { "@type": "ListItem", position: 3, name: "Ugovor o djelu", item: PAGE_URL },
  ],
};

export default function UgovorODjeluPage() {
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
      <UgovorODjelu />
    </>
  );
}
