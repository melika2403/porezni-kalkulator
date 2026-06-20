import type { Metadata } from "next";
import GpdForm from "src/sections/gpd/Gpd";

const PAGE_URL = "https://poreznikalkulator.ba/gpd";

export const metadata: Metadata = {
  title:
    "GPD-1051 obrazac, godišnja prijava poreza na dohodak FBiH | Porezni Kalkulator BiH",
  description:
    "Popunite GPD-1051 obrazac online za godišnju prijavu poreza na dohodak fizičkih lica u FBiH. Predaje se do 31. marta. Preuzmite popunjeni PDF besplatno, bez registracije.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "GPD-1051 obrazac online, godišnja prijava poreza FBiH",
    description:
      "Online popuna GPD-1051 obrasca za sve izvore dohotka u FBiH, plate, samostalna djelatnost, imovina, kapital. Automatski obračun, lični odbici i povrat poreza.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Ko je obavezan podnijeti GPD-1051 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Godišnju prijavu poreza na dohodak obavezno podnosi svaka fizička osoba, rezident FBiH, koja je tokom godine ostvarila dohodak koji podliježe oporezivanju, uključujući dohotke od nesamostalne djelatnosti, samostalne djelatnosti, imovine i imovinskih prava, kapitala i ostale dohotke.",
      },
    },
    {
      "@type": "Question",
      name: "Koji je rok za predaju GPD obrasca?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GPD-1051 obrazac predaje se najkasnije do 31. marta tekuće godine za prethodnu kalendarsku godinu. Kasno podnošenje može rezultirati novčanom kaznom od strane Porezne uprave FBiH.",
      },
    },
    {
      "@type": "Question",
      name: "Ko ne mora podnositi godišnju prijavu poreza?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Osobe čiji su ukupni godišnji prihodi manji od iznosa godišnjeg ličnog odbitka (trenutno 3.600 KM), te osobe koje su ostvarile isključivo dohodak od nesamostalne djelatnosti kod jednog poslodavca koji je pravilno obračunavao i uplaćivao akontacije poreza, generalno nisu obavezne na podnošenje GPD obrasca.",
      },
    },
    {
      "@type": "Question",
      name: "Šta su lični odbici i kako ih koristim?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lični odbitak je iznos koji se oduzima od ukupnog dohotka prije obračuna poreza. Osnovni lični odbitak iznosi 300 KM mjesečno (3.600 KM godišnje). Dodatni odbici postoje za uzdržavane članove porodice, doprinos za zdravstveno osiguranje i plaćene kamate na stambene kredite.",
      },
    },
    {
      "@type": "Question",
      name: "Šta ako sam radio kod više poslodavaca tokom godine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ukoliko ste tokom iste godine primali plaću od više poslodavaca, obavezni ste podnijeti godišnju prijavu poreza. Svaki poslodavac je obračunavao porez posebno, što može rezultirati razlikom u konačnoj poreznoj obavezi.",
      },
    },
    {
      "@type": "Question",
      name: "Mogu li tražiti povrat poreza putem GPD obrasca?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. Ukoliko su akontacije poreza plaćene tokom godine veće od stvarne godišnje porezne obaveze, imate pravo na povrat razlike. Zahtjev za povrat se podnosi zajedno sa GPD obrascem, a Porezna uprava je dužna izvršiti povrat u zakonskom roku.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kako popuniti GPD-1051 obrazac",
  description:
    "Korak-po-korak vodič za godišnju prijavu poreza na dohodak u FBiH, sve izvore dohotka, lične odbitke i povrat poreza.",
  inLanguage: "bs",
  totalTime: "PT20M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Unesite lične podatke",
      text: "Ime, prezime, JMB, adresa prebivališta i nadležna porezna ispostava. Registrovani korisnici imaju automatsku popunu iz profila.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Unesite sve izvore dohotka",
      text: "Plate iz radnog odnosa, dohodak iz samostalne djelatnosti (iz SPR-1053), dohodak od imovine, kapitala i ostale dohotke. Dodajte plaćene akontacije poreza.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Iskoristite lične odbitke",
      text: "Osnovni odbitak 3.600 KM godišnje, plus odbici za uzdržavane članove porodice, doprinos zdravstvenog i kamate na stambene kredite.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Preuzmite popunjen GPD-1051 PDF",
      text: "Spreman za predaju do 31. marta uz priloge (SPR-1053, ZO3, potvrde poslodavaca).",
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
      name: "GPD-1051 obrazac",
      item: PAGE_URL,
    },
  ],
};

export default function GpdPage() {
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
      <GpdForm />
    </>
  );
}
