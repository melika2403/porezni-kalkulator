import type { Metadata } from "next";
import AmsForm from "src/sections/ams/Ams";

export const metadata: Metadata = {
  title: "AMS-1035 obrazac — akontacija poreza po odbitku na prihod iz inostranstva | Porezni Kalkulator BiH",
  description:
    "Kako popuniti AMS-1035 obrazac? Online generator AMS-1035 obrasca za akontaciju poreza po odbitku na druge samostalne djelatnosti i prihod iz inostranstva u FBiH. Automatski obračun, popunjene uplatnice spremne za banku — besplatno, bez registracije.",
  alternates: { canonical: "https://poreznikalkulator.ba/ams" },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Ko je obavezan podnositi AMS-1035 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AMS-1035 obrazac obavezno podnosi svaka fizička osoba rezident FBiH koja prima prihode od obavljanja djelatnosti iz inostranstva — npr. freelance rad, honorari, konsultantske usluge i slično — a isplatilac nije na teritoriji Bosne i Hercegovine.",
      },
    },
    {
      "@type": "Question",
      name: "Koji je rok za predaju AMS-1035 obrasca?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Obrazac se predaje u roku od 15 dana od dana isplate. Dakle, ako ste novac primili 10. u mjesecu, obrazac ste dužni predati do 25. istog mjeseca u nadležnu ispostavu Porezne uprave FBiH prema svom mjestu stanovanja.",
      },
    },
    {
      "@type": "Question",
      name: "Kolika je stopa rashoda — 20% ili 30%?",
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

export default function AmsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <AmsForm />
    </>
  );
}
