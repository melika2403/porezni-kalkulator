import UgovorOPozajmici from "src/sections/ugovor-o-pozajmici/UgovorOPozajmici";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ugovor o pozajmici novca — predložak i online popuna | Porezni Kalkulator BiH",
  description:
    "Kako napisati ugovor o pozajmici novca? Kreirajte pravno validan ugovor između fizičkih ili pravnih lica u BiH — definirajte iznos, kamatu, rok i uslove. Preuzmite gotov ugovor u PDF ili Word formatu, besplatno.",
  alternates: { canonical: "https://poreznikalkulator.ba/ugovor-o-pozajmici" },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Da li ugovor o pozajmici mora biti ovjeren kod notara?", acceptedAnswer: { "@type": "Answer", text: "Nije obavezna notarska ovjera, ali se preporučuje za veće iznose. Notarski ovjeren ugovor je direktno izvršna isprava što olakšava naplatu u slučaju spora." } },
    { "@type": "Question", name: "Da li se plaća porez na pozajmicu novca?", acceptedAnswer: { "@type": "Answer", text: "Sama pozajmica nije oporeziva. Međutim, kamata na pozajmicu predstavlja prihod zajmodavca i podliježe oporezivanju porezom na dohodak kao prihod od kapitala po stopi od 10%." } },
    { "@type": "Question", name: "Da li kamata mora biti ugovorena?", acceptedAnswer: { "@type": "Answer", text: "Ne, kamata nije obavezna — stranke mogu dogovoriti beskamatnu pozajmicu. Između pravnih osoba Porezna uprava može primijeniti tržišnu kamatnu stopu radi izbjegavanja prikrivenih distribucija dobiti." } },
    { "@type": "Question", name: "Koji minimalni podaci moraju biti u ugovoru o pozajmici?", acceptedAnswer: { "@type": "Answer", text: "Ugovor mora sadržavati: identifikacione podatke stranaka, iznos pozajmice, valutu, rok vraćanja, kamatnu stopu ili izjavu da je beskamatna, i datum zaključenja." } },
    { "@type": "Question", name: "Šta ako zajmoprimac ne vrati novac na vrijeme?", acceptedAnswer: { "@type": "Answer", text: "Ugovorom se mogu predvidjeti zatezne kamate. Uz notarski ovjeren ugovor moguće je direktno pokrenuti izvršni postupak bez prethodne presude." } },
  ],
};

export default function UgovorOPozajmiciPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <UgovorOPozajmici />
    </>
  );
}
