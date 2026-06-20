import type { Metadata } from "next";
import AmsForm from "src/sections/ams/Ams";

const PAGE_URL = "https://poreznikalkulator.ba/ams";

export const metadata: Metadata = {
  title:
    "AMS generator, AMS-1035 obrazac i uplatnice (FBiH) | Porezni Kalkulator",
  description:
    "Kako popuniti AMS-1035 obrazac? Online generator AMS-1035 obrasca za akontaciju poreza po odbitku na druge samostalne djelatnosti i prihod iz inostranstva u FBiH. Automatski obračun, popunjene uplatnice spremne za banku, besplatno, bez registracije.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "AMS-1035 obrazac online, prihod iz inostranstva FBiH",
    description:
      "Brz online generator AMS-1035 obrasca i uplatnica za prihode iz inostranstva. Predaje se u roku od 5 dana od primitka.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Kolika je stopa doprinosa za zdravstveno osiguranje na drugi samostalni prihod (AMS-1035) u FBiH?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Doprinos za zdravstveno osiguranje na drugi samostalni prihod (prihod iz inostranstva po obrascu AMS-1035) u FBiH iznosi 4%. Pored toga obračunava se porez na dohodak 10%, uz normirane rashode 20% (30% za autorske naknade) koji umanjuju osnovicu. Zdravstveni doprinos od 4% plaća se bez obzira na to da li ste već osigurani po osnovu radnog odnosa.",
      },
    },
    {
      "@type": "Question",
      name: "Ko je obavezan podnositi AMS-1035 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AMS-1035 obrazac obavezno podnosi svaka fizička osoba rezident FBiH koja prima prihode od obavljanja djelatnosti iz inostranstva, npr. freelance rad, honorari, konsultantske usluge i slično, a isplatilac nije na teritoriji Bosne i Hercegovine.",
      },
    },
    {
      "@type": "Question",
      name: "Koji je rok za predaju AMS-1035 obrasca?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Obrazac se predaje u roku od 5 (pet) dana od dana primitka dohotka. Dakle, ako ste novac primili 10. u mjesecu, obrazac ste dužni predati do 15. istog mjeseca u nadležnu ispostavu Porezne uprave FBiH prema mjestu prebivališta fizičkog lica.",
      },
    },
    {
      "@type": "Question",
      name: "Kolika je stopa rashoda, 20% ili 30%?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Standardna stopa normiranih rashoda iznosi 20% od bruto iznosa. Stopa od 30% primjenjuje se isključivo na autorske naknade (npr. književna, muzička, filmska ili likovna ostvarenja).",
      },
    },
    {
      "@type": "Question",
      name: "Šta je porezni kredit i kada ga koristim?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Porezni kredit je iznos poreza koji ste već platili u inostranstvu na isti prihod. Na osnovu međunarodnih sporazuma o izbjegavanju dvostrukog oporezivanja, taj iznos možete odbititi od obaveze u FBiH.",
      },
    },
    {
      "@type": "Question",
      name: "Da li moram platiti zdravstveno osiguranje čak i kad već imam zaposlenje?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. Doprinos za zdravstveno osiguranje po stopi od 4% plaća se na svaki dohodak od samostalne djelatnosti, bez obzira na to da li ste već zdravstveno osigurani po osnovu radnog odnosa.",
      },
    },
    {
      "@type": "Question",
      name: "Može li se AMS-1035 podnijeti elektronski?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da, putem ePortala Porezne uprave FBiH moguće je podnijeti obrazac elektronski. Alternativno, popunjeni obrazac možete lično predati u nadležnoj ispostavi ili poslati poštom.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kako popuniti AMS-1035 obrazac",
  description:
    "Korak-po-korak vodič za prijavu akontacije poreza po odbitku na prihode iz inostranstva u FBiH.",
  inLanguage: "bs",
  totalTime: "PT10M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Unesite lične podatke i podatke o isplati",
      text: "Ime, prezime, JMB, adresa, datum primitka i bruto iznos sa konverzijom u KM po važećem kursu CBBiH na dan primitka.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Sistem obračunava poreznu osnovicu i obavezu",
      text: "Normirani rashodi 20% (ili 30% za autorske naknade), zdravstveno osiguranje 4%, porez na dohodak 10%. Porezni kredit za već plaćeni porez u inostranstvu.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Preuzmite popunjen AMS-1035 PDF i uplatnice",
      text: "Spremno za predaju u nadležnoj poreznoj ispostavi i uplatu u banci, najkasnije u roku od 5 dana od primitka dohotka.",
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
      name: "AMS-1035 obrazac",
      item: PAGE_URL,
    },
  ],
};

export default function AmsPage() {
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
      <AmsForm />
    </>
  );
}
