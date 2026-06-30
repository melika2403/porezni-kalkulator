import { Suspense } from "react";
import CesijeKompenzacije from "src/sections/cesije-i-kompenzacije/CesijeKompenzacije";
import RadniciTabBar from "src/components/RadniciTabBar/RadniciTabBar";
import type { Metadata } from "next";

const PAGE_URL = "https://www.poreznikalkulator.ba/cesije-i-kompenzacije";

export const metadata: Metadata = {
  title: "Ugovor o cesiji i kompenzacija, BiH",
  description:
    "Napravite ugovor o cesiji (ustupanje potraživanja) i prijedlog za međusobnu kompenzaciju (prijeboj) u BiH. Popuna iz organizacija, preuzimanje u PDF i Word formatu.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Ugovor o cesiji i kompenzacija, online predložak BiH",
    description:
      "Generator ugovora o cesiji i prijedloga za međusobnu kompenzaciju. PDF i Word, sa svim obaveznim elementima.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Šta je ugovor o cesiji?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cesija je ustupanje potraživanja kojim povjerilac (cedent) prenosi svoje potraživanje na novog povjerioca (cesionar), dok dužnik (cesus) ostaje isti. Regulisana je članovima 436 do 445 Zakona o obligacionim odnosima.",
      },
    },
    {
      "@type": "Question",
      name: "Šta je kompenzacija ili prijeboj?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kompenzacija je gašenje obaveza međusobnim prebijanjem potraživanja dvije strane koje duguju jedna drugoj. Prebija se manji iznos, a razlika se uplaćuje na žiro račun. Regulisana je članovima 336 do 343 Zakona o obligacionim odnosima.",
      },
    },
    {
      "@type": "Question",
      name: "Treba li dužnik (cesus) potpisati ugovor o cesiji?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pravno, pristanak dužnika nije uslov valjanosti cesije, dovoljan je sporazum cedenta i cesionara. U praksi se dužnik ipak potpisuje ili se obavještava o ustupanju kako bi znao da ubuduće plaća novom povjeriocu.",
      },
    },
    {
      "@type": "Question",
      name: "Kako se računa nekompenzirani iznos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kompenzuje se manji od dva ukupna iznosa obaveza. Razlika između većeg i manjeg iznosa je nekompenzirani iznos koji strana sa većom obavezom uplaćuje drugoj strani na žiro račun.",
      },
    },
    {
      "@type": "Question",
      name: "Da li je za cesiju ili kompenzaciju potrebna notarska ovjera?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Zakon ne propisuje obaveznu notarsku ovjeru za ugovor o cesiji ni za izjavu o kompenzaciji, dovoljni su potpisi i pečati strana. Ovjera se može uraditi radi veće pravne sigurnosti, posebno kod većih iznosa.",
      },
    },
    {
      "@type": "Question",
      name: "Koja je razlika između cesije i asignacije?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kod cesije cedent prenosi svoje postojeće potraživanje na cesionara, mijenja se povjerilac. Kod asignacije (upućivanja) uputilac ovlašćuje upućenika da izvrši plaćanje primaocu uputa, čime nastaje nov odnos plaćanja.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Početna", item: "https://www.poreznikalkulator.ba/" },
    { "@type": "ListItem", position: 2, name: "Cesije i kompenzacije", item: PAGE_URL },
  ],
};

export default function CesijeKompenzacijePage() {
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
      <Suspense fallback={null}>
        <RadniciTabBar />
      </Suspense>
      <CesijeKompenzacije />
    </>
  );
}
