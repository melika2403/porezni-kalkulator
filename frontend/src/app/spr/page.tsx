import type { Metadata } from "next";
import { OG_IMAGE } from "src/lib/ogImage";
import SprForm from "src/sections/spr/Spr";

const PAGE_URL = "https://www.poreznikalkulator.ba/spr";

export const metadata: Metadata = {
  title: "SPR-1053 obrazac, specifikacija dohotka",
  description:
    "SPR-1053 obrazac za specifikaciju dohotka od samostalne djelatnosti u FBiH, online popuna i preuzimanje PDF-a besplatno, bez registracije.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    images: OG_IMAGE,
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "SPR-1053 obrazac online, specifikacija dohotka FBiH",
    description:
      "Online popuna SPR-1053 obrasca za samostalne djelatnosti u FBiH. Automatski obračun normiranih ili stvarnih rashoda, popunjen PDF spreman za predaju uz GPD-1051.",
  },
};

// ── FAQ schema — mora se poklapati sa vidljivim FAQ-om u Spr.tsx ──────────
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Ko je obavezan podnijeti SPR-1053 obrazac?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SPR-1053 podnose fizičke osobe koje obavljaju samostalnu djelatnost (obrtnici, slobodna zanimanja, poljoprivrednici i šumari) radi utvrđivanja dohotka od te djelatnosti. Obrazac se predaje nadležnoj ispostavi Porezne uprave FBiH.",
      },
    },
    {
      "@type": "Question",
      name: "Koji je rok za predaju SPR obrasca?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SPR-1053 se predaje do 31. marta tekuće godine za prethodnu kalendarsku godinu, zajedno sa godišnjom prijavom poreza (GPD-1051). Npr. obrazac za 2025. godinu se predaje do 31.03.2026.",
      },
    },
    {
      "@type": "Question",
      name: "Razlika između SPR i GPD obrasca?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SPR-1053 je specifikacija koja prikazuje kako je ostvaren dohodak od samostalne djelatnosti, prihodi minus rashodi. GPD-1051 je godišnja prijava poreza koja objedinjuje sve izvore dohotka (uključujući i SPR) i izračunava konačnu poreznu obavezu.",
      },
    },
    {
      "@type": "Question",
      name: "Moram li voditi poslovne knjige da bih podnio SPR?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da, porezni obveznici samostalne djelatnosti dužni su voditi propisane poslovne knjige po sistemu prostog ili dvojnog knjigovodstva i čuvati pripadajuće račune i izvode kao dokaz prihoda i rashoda.",
      },
    },
    {
      "@type": "Question",
      name: "Kako se obračunava akontacija poreza tokom godine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Akontacija poreza je predviđanje vaše dobiti na kraju poslovne godine, na osnovu dobiti prethodne godine. Uplaćuje se mjesečno. Ukoliko na kraju godine imate više uplaćenih akontacija nego konačnog poreza, razlika se prenosi u sljedeću godinu.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kako popuniti SPR-1053 obrazac",
  description:
    "Korak-po-korak vodič za popunjavanje SPR-1053 obrasca u FBiH, specifikacija dohotka od samostalne djelatnosti za godišnju poreznu prijavu.",
  inLanguage: "bs",
  totalTime: "PT15M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Unesite osnovne podatke o obvezniku",
      text: "Ime i prezime, JMB, adresa, naziv djelatnosti, JIB obrta i nadležna porezna ispostava. Registrovani korisnici imaju automatsku popunu iz profila.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Unesite prihode i rashode",
      text: "Iz poslovnih knjiga za prethodnu godinu. Sistem automatski obračunava razliku, oporezivi dohodak od samostalne djelatnosti.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Preuzmite popunjen SPR-1053 PDF",
      text: "Spreman za štampu i predaju uz GPD-1051 godišnju prijavu poreza, najkasnije do 31. marta tekuće godine.",
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
      name: "SPR-1053 obrazac",
      item: PAGE_URL,
    },
  ],
};

export default function SprPage() {
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
      <SprForm />
    </>
  );
}
