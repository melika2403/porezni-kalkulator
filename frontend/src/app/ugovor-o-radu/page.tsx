import { Suspense } from "react";
import UgovorORadu from "src/sections/ugovor-o-radu/UgovorORadu";
import RadniciTabBar from "src/components/RadniciTabBar/RadniciTabBar";
import type { Metadata } from "next";

const PAGE_URL = "https://poreznikalkulator.ba/ugovor-o-radu";

export const metadata: Metadata = {
  title: "Ugovor o radu i otkaz — predložak (Word/PDF) FBiH",
  description:
    "Generator ugovora o radu i odluke o prestanku radnog odnosa prema Zakonu o radu FBiH. Popunite podatke jednom i preuzmite oba dokumenta u Word i PDF formatu — sa probnim radom, određenim/neodređenim trajanjem i automatskim popunjavanjem podataka iz profila.",
alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Ugovor o radu i otkaz — predložak (FBiH)",
    description:
      "Generator ugovora o radu i odluke o prestanku radnog odnosa prema Zakonu o radu FBiH, u Word i PDF formatu.",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "Ugovor o radu — Porezni Kalkulator BiH" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ugovor o radu i otkaz — predložak (FBiH)",
    description:
      "Predložak ugovora o radu i odluke o prestanku radnog odnosa, u Word i PDF formatu.",
    images: ["/og-image.png"],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Koji su obavezni elementi ugovora o radu u FBiH?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ugovor o radu mora sadržavati: ugovorne strane, datum početka rada, mjesto rada, naziv radnog mjesta i opis poslova, trajanje (neodređeno ili određeno + rok), trajanje punog/nepunog radnog vremena, iznos osnovne plate, te trajanje godišnjeg odmora.",
      },
    },
    {
      "@type": "Question",
      name: "Mora li ugovor o radu biti u pisanoj formi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. Zakon o radu FBiH zahtijeva da se ugovor o radu zaključi u pisanoj formi prije početka rada radnika. Usmeni dogovor o radu se smatra ugovorom na neodređeno vrijeme po samom zakonu.",
      },
    },
    {
      "@type": "Question",
      name: "Koliko može trajati probni rad?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Probni rad može trajati najduže 6 mjeseci. Tipično se ugovara 3 mjeseca. Ako probni rad nije izričito ugovoren, smatra se da je radnik primljen bez probnog rada.",
      },
    },
    {
      "@type": "Question",
      name: "Kada se ugovor zaključuje na određeno vrijeme?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ugovor na određeno se zaključuje kada postoji konkretan razlog (sezonski rad, zamjena odsutnog radnika, projekat). Maksimalno trajanje uzastopnih ugovora na određeno je 3 godine — nakon toga se ugovor automatski transformiše u ugovor na neodređeno.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kako popuniti ugovor o radu u FBiH",
  description:
    "Korak po korak: unesite poslodavca i radnika, izaberite vrstu ugovora (neodređeno/određeno/probni rad), odredite plaću i otkazni rok, pa preuzmite ugovor u Word ili PDF formatu.",
  totalTime: "PT5M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Odaberite radnika i poslodavca",
      text: "Izaberite organizaciju i radnika iz sidebar-a — podaci poslodavca, radnika i plate se automatski popunjavaju iz profila. Ako radnik nije u sistemu, dodajte ga preko '+ Novi radnik'.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Vrsta ugovora",
      text: "Odaberite ugovor na neodređeno, na određeno (sa rokom trajanja) ili probni rad (do 6 mjeseci). Naslov i tekst Člana 1 automatski se prilagođavaju.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Plata i otkazni rok",
      text: "Upišite osnovnu bruto/neto platu, otkazni rok (default 30 dana) i ostale obavezne elemente prema Zakonu o radu FBiH.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Preuzmite ugovor",
      text: "Generišite ugovor u Word (DOCX) ili PDF formatu, popunjen vašim podacima i spreman za potpis. Po želji preuzmite i pripadajući JS3100 obrazac za PIO/ZZO.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Otkaz (po potrebi)",
      text: "Kasnije iz iste forme možete generisati Odluku o prestanku radnog odnosa — otkaz od strane poslodavca/radnika ili sporazumni raskid — sa popunjenim podacima iz originalnog ugovora.",
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Početna", item: "https://poreznikalkulator.ba/" },
    { "@type": "ListItem", position: 2, name: "Ugovori", item: "https://poreznikalkulator.ba/#funkcije" },
    { "@type": "ListItem", position: 3, name: "Ugovor o radu", item: PAGE_URL },
  ],
};

export default function UgovorORaduPage() {
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
      <Suspense fallback={null}>
        <RadniciTabBar />
        <UgovorORadu />
      </Suspense>
    </>
  );
}
