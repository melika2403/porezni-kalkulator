import UgovorOPozajmici from "src/sections/ugovor-o-pozajmici/UgovorOPozajmici";
import { OG_IMAGE } from "src/lib/ogImage";

import type { Metadata } from "next";
import SlotServer from "src/components/PartnerSlot/SlotServer";

const PAGE_URL = "https://www.poreznikalkulator.ba/ugovor-o-pozajmici";

export const metadata: Metadata = {
  title: "Ugovor o pozajmici novca, Word i PDF",
  description:
    "Ugovor o pozajmici novca između fizičkih i pravnih lica u BiH: online popuna iznosa, kamate i roka, preuzimanje u PDF i Word formatu, besplatno.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    images: OG_IMAGE,
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Ugovor o pozajmici novca, online predložak BiH",
    description:
      "Online generator ugovora o pozajmici novca. PDF i Word formati, sa svim obaveznim klauzulama.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Da li ugovor o pozajmici mora biti ovjeren kod notara?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nije obavezna notarska ovjera za ugovor o pozajmici između fizičkih osoba u FBiH, ali se preporučuje za veće iznose radi veće pravne sigurnosti. Notarski ovjeren ugovor je direktno izvršna isprava što olakšava naplatu u slučaju spora.",
      },
    },
    {
      "@type": "Question",
      name: "Da li se plaća porez na pozajmicu novca?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sama pozajmica nije oporeziva jer se radi o povratu sredstava. Međutim, kamata na pozajmicu predstavlja prihod zajmodavca i podliježe oporezivanju porezom na dohodak kao prihod od kapitala po stopi od 10%.",
      },
    },
    {
      "@type": "Question",
      name: "Da li kamata mora biti ugovorena?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ne, kamata nije obavezna, stranke mogu dogovoriti beskamatnu pozajmicu. Ukoliko se radi o pozajmici između pravnih osoba ili između pravne i fizičke osobe, Porezna uprava može primijeniti tržišnu kamatnu stopu radi izbjegavanja prikrivenih distribucija dobiti.",
      },
    },
    {
      "@type": "Question",
      name: "Koji minimalni podaci moraju biti u ugovoru o pozajmici?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ugovor mora sadržavati: identifikacione podatke zajmodavca i zajmoprimca, iznos pozajmice, valutu, rok vraćanja, kamatnu stopu (ili izjavu da je beskamatna) i datum zaključenja ugovora. Preporučuje se i klauzula o načinu vraćanja i posljedicama kašnjenja.",
      },
    },
    {
      "@type": "Question",
      name: "Može li ugovor o pozajmici biti između firme i vlasnika?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da, ugovor može biti zaključen između privrednog društva i njegovog vlasnika ili direktora. U tom slučaju potrebno je voditi računa o transfernim cijenama i tržišnoj kamatnoj stopi kako bi se izbjegla porezna reklasifikacija kao prikrivena raspodjela dobiti.",
      },
    },
    {
      "@type": "Question",
      name: "Šta ako zajmoprimac ne vrati novac na vrijeme?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ugovorom se mogu predvidjeti zatezne kamate na neplaćeni iznos. U slučaju spora, zajmodavac može pokrenuti sudski postupak. Uz notarski ovjeren ugovor moguće je direktno pokrenuti izvršni postupak bez prethodne presude, što značajno ubrzava naplatu.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kako sastaviti ugovor o pozajmici novca",
  description:
    "Korak-po-korak vodič za pravno validan ugovor o pozajmici između fizičkih ili pravnih lica u BiH.",
  inLanguage: "bs",
  totalTime: "PT10M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Unesite podatke o zajmodavcu i zajmoprimcu",
      text: "Ime, JMB ili JIB, adresa, te način zastupanja za pravne osobe.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Definirajte iznos, valutu i kamatu",
      text: "Tačan iznos pozajmice, valuta (KM ili EUR) i kamatna stopa (ili beskamatno).",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Odredite rok i način vraćanja",
      text: "Datum vraćanja, način (gotovinski, transfer), jednokratno ili u ratama.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Preuzmite ugovor u PDF ili Word formatu",
      text: "Potpišite obje strane; za veće iznose preporučuje se notarska ovjera radi izvršne snage.",
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
      name: "Ugovor o pozajmici",
      item: PAGE_URL,
    },
  ],
};

export default function UgovorOPozajmiciPage() {
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
      <SlotServer stranica="pozajmica">
        <UgovorOPozajmici />
      </SlotServer>
    </>
  );
}
