import { Suspense } from "react";
import type { Metadata } from "next";
import PrijaveRadnikaTabs from "src/sections/prijave-radnika/PrijaveRadnikaTabs";
import PrijaveRadnikaEdu from "src/sections/prijave-radnika/PrijaveRadnikaEdu";

const PAGE_URL = "https://poreznikalkulator.ba/prijave-radnika";

export const metadata: Metadata = {
  title:
    "Obračun plata FBiH + JS3100 prijava/odjava radnika — online generator | Porezni Kalkulator BiH",
  description:
    "Mjesečni obračun bruto/neto plata, doprinosa i poreza za radnike u FBiH. Automatska generacija platnih listića, uplatnica i obrazaca 2001 i 2002. JS3100 prijava, odjava i promjena podataka radnika kod PUFBiH — sve iz jedne aplikacije, sa auto-popunom iz profila.",
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
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Obračun plata FBiH + JS3100 prijava/odjava radnika — online",
    description:
      "Mjesečni obračun bruto/neto plata, platni listići, uplatnice i obrasci 2001/2002. JS3100 prijava i odjava radnika — sve iz jedne aplikacije.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Obračun plata FBiH + JS3100 — Porezni Kalkulator BiH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Obračun plata FBiH + JS3100 — online generator",
    description:
      "Mjesečni obračun plata, platni listići, uplatnice, obrazac 2001/2002 i JS3100 prijava/odjava radnika.",
    images: ["/og-image.png"],
  },
};

// ── JSON-LD schemas ──────────────────────────────────────────────────────

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Obračun plata FBiH + JS3100",
  description:
    "Online aplikacija za mjesečni obračun plata, generaciju platnih listića, uplatnica i obrazaca 2001/2002 te JS3100 prijavu i odjavu radnika u Federaciji BiH.",
  url: PAGE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "bs",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BAM",
    description:
      "Besplatna registracija za preview. Pro pretplata otključava preuzimanje platnih listića, uplatnica, obrazaca 2001/2002 i JS3100 PDF-a.",
  },
  provider: {
    "@type": "Organization",
    name: "Porezni Kalkulator BiH",
    url: "https://poreznikalkulator.ba",
  },
  featureList: [
    "Mjesečni obračun bruto/neto plata po radniku",
    "Automatski izračun doprinosa (PIO 17%, zdravstvo 12,5%, nezaposlenost 1,5%)",
    "Doprinosi na osnovicu (PIO 6%, zdravstvo 4%, nezaposlenost 0,5%)",
    "Porez na dohodak (10%) sa ličnim odbitkom",
    "Posebna pravila za obrtnike i samostalne djelatnosti",
    "Generacija platnih listića u PDF formatu",
    "Generacija svih uplatnica za doprinose i poreze",
    "Obrazac 2001 — mjesečna specifikacija plata",
    "Obrazac 2002 — godišnja prijava za obrtnika",
    "JS3100 obrazac — prijava, odjava i promjena podataka radnika",
    "Auto-popuna podataka iz profila organizacije i radnika",
  ],
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
        text: "Iz bruto plate se prvo odbijaju doprinosi iz plate: PIO/MIO 17%, zdravstveno 12,5% i osiguranje od nezaposlenosti 1,5% (ukupno 31%). Na tako dobijenu osnovicu se odbija lični odbitak (300 KM mjesečno) i obračunava porez na dohodak po stopi od 10%. Neto plata = Bruto − doprinosi − porez. Aplikacija sve ovo radi automatski.",
      },
    },
    {
      "@type": "Question",
      name: "Šta uključuje ukupan trošak poslodavca za jednog radnika?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ukupan trošak poslodavca uključuje: bruto platu, doprinose na bruto platu (PIO/MIO 6%, zdravstveno 4%, nezaposlenost 0,5%), opću vodnu naknadu (0,5%), naknadu za zaštitu od prirodnih nesreća (0,5%) i — za privredna društva (COMPANY) — fond invalida (0,5%). Obrti su izuzeti od fonda invalida.",
      },
    },
    {
      "@type": "Question",
      name: "Koje uplatnice se generišu uz obračun plata?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Generišu se zbirne uplatnice po vrsti: PIO/MIO doprinos (712112), Zdravstvo kantonalni 89,8% (712111), Zdravstvo federalni 10,2% (712111), Nezaposlenost kantonalni 70% (712113), Nezaposlenost federalni 30% (712113), Porez na dohodak (716111), Opća vodna naknada (722529), Zaštita od prirodnih nesreća (722581) i — za društva — Fond invalida (722569).",
      },
    },
    {
      "@type": "Question",
      name: "Šta je Obrazac 2001 i kada se podnosi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Obrazac 2001 je mjesečna specifikacija isplata plata, doprinosa i poreza koja se podnosi Poreznoj upravi FBiH. Generiše se iz mjesečnog obračuna i pokriva radnike (ne vlasnike). Vlasnici obrta podnose Obrazac 2002 zasebno.",
      },
    },
    {
      "@type": "Question",
      name: "Šta je Obrazac 2002 i ko ga podnosi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Obrazac 2002 je godišnja prijava poreza i doprinosa za vlasnika obrta ili samostalne djelatnosti (paušalni obveznik). Aplikacija ga generiše po vlasniku iz mjesečnog obračuna i fiksne osnovice prema poreznom režimu.",
      },
    },
    {
      "@type": "Question",
      name: "Šta je obrazac JS3100?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "JS3100 je obrazac za prijavu, odjavu ili promjenu podataka osiguranika u Jedinstvenom sistemu registracije, kontrole i naplate doprinosa u Federaciji BiH. Podnosi ga poslodavac za svakog radnika koji ulazi u ili izlazi iz osiguranja.",
      },
    },
    {
      "@type": "Question",
      name: "Kada se podnosi JS3100?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pri zasnivanju radnog odnosa (prijava) — najkasnije dan prije početka rada. Pri prestanku radnog odnosa (odjava) — u zakonskom roku nakon prestanka. Kada se mijenjaju ključni podaci o osiguraniku (promjena podataka).",
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
      name: "Mogu li popuniti JS3100 i obračunati plate online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. Porezni Kalkulator BiH omogućava online popunjavanje JS3100 obrasca i kompletan mjesečni obračun plata, sa auto-popunom podataka o organizaciji i radnicima iz vašeg profila. Besplatna registracija otključava preview, a Pro pretplata omogućava preuzimanje PDF-ova.",
      },
    },
    {
      "@type": "Question",
      name: "Da li se podaci radnika čuvaju za sljedeći mjesec?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. Svi podaci o radnicima (JMBG, adresa, ugovor, plata) i organizacijama čuvaju se u vašem profilu i auto-popunjavaju se za svaki sljedeći mjesečni obračun ili JS3100 prijavu.",
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
      name: "Funkcije",
      item: "https://poreznikalkulator.ba/#funkcije",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Obračun plata + JS3100",
      item: PAGE_URL,
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kako obračunati mjesečnu platu radnika u FBiH",
  description:
    "Korak‑po‑korak vodič za mjesečni obračun bruto/neto plate, doprinosa, poreza i generisanje svih uplatnica i obrazaca.",
  inLanguage: "bs",
  totalTime: "PT10M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Dodajte organizaciju i radnike",
      text: "U profilu unesite podatke o organizaciji (obrt/d.o.o., adresa, JIB, opcina) i radnicima (ime, JMBG, ugovor, bruto/neto plata).",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Odaberite mjesec obračuna",
      text: "Na stranici Obračun plata izaberite mjesec i godinu za obračun.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Obračunajte plate",
      text: "Kliknite 'Obračunaj sve' — aplikacija automatski računa bruto, doprinose iz/na, porez na dohodak i neto za svakog radnika.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Preuzmite platne listiće",
      text: "Kliknite 'Preuzmi platne listiće' za PDF sa svim listićima za potpis radnika.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Preuzmite uplatnice za banku",
      text: "Kliknite 'Preuzmi uplatnice' za PDF sa zbirnim uplatnicama za sve doprinose, poreze i naknade — spremne za banku.",
    },
    {
      "@type": "HowToStep",
      position: 6,
      name: "Preuzmite Obrazac 2001 (i 2002 za vlasnike)",
      text: "Preuzmite mjesečnu specifikaciju (2001) za radnike i godišnju prijavu (2002) za vlasnike — sa svim doprinosima i porezima.",
    },
  ],
};

export default function PrijaveRadnikaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
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
        <PrijaveRadnikaTabs />
      </Suspense>
      <PrijaveRadnikaEdu />
    </>
  );
}
