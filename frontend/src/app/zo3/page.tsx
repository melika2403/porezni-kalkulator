import type { Metadata } from "next";
import Zo3Form from "src/sections/zo3/Zo3";

export const metadata: Metadata = {
  title: "ZO3 Obrazac — Prijava člana porodice na zdravstveno osiguranje | Porezni Kalkulator BiH",
  description: "Popunite ZO3 obrazac online i prijavite člana porodice (supružnika, dijete, roditelja) na zdravstveno osiguranje u FBiH. Besplatno, bez registracije.",
  alternates: { canonical: "https://poreznikalkulator.ba/zo3" },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Šta je ZO3 obrazac?", acceptedAnswer: { "@type": "Answer", text: "ZO3 je obrazac 'Prijava o promjeni u tijeku osiguranja' koji se koristi za prijavu članova porodice na zdravstveno osiguranje osiguranika. Putem ovog obrasca možete dodati supružnika, djecu ili roditelje na svoje zdravstveno osiguranje." } },
    { "@type": "Question", name: "Ko može biti prijavljen kao član porodice na zdravstveno osiguranje?", acceptedAnswer: { "@type": "Answer", text: "Na zdravstveno osiguranje kao uzdržavani članovi porodice mogu se prijaviti: supružnik, djeca (maloljetna ili na redovnom školovanju), te roditelji osiguranika — ukoliko to pravo ne ostvaruju po drugom osnovu." } },
    { "@type": "Question", name: "Kako se podnosi ZO3 obrazac?", acceptedAnswer: { "@type": "Answer", text: "ZO3 obrazac podnosi poslodavac na zahtjev osiguranika, u dva primjerka, nadležnoj regionalnoj ispostavi Zavoda zdravstvenog osiguranja." } },
    { "@type": "Question", name: "Koja dokumentacija je potrebna uz ZO3 obrazac?", acceptedAnswer: { "@type": "Answer", text: "Potrebno je priložiti dokumentaciju koja dokazuje srodstvo i uzdržavanje — npr. izvod iz matične knjige vjenčanih za supružnika, rodni list za djecu, te dokaz da član porodice nema zdravstveno osiguranje po drugom osnovu." } },
    { "@type": "Question", name: "Gdje mogu preuzeti ZO3 obrazac?", acceptedAnswer: { "@type": "Answer", text: "ZO3 obrazac dostupan je na web stranicama kantonalnih zavoda zdravstvenog osiguranja, te na našoj stranici gdje ga možete popuniti online i preuzeti u PDF formatu." } },
  ],
};

export default function Zo3Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Zo3Form />
    </>
  );
}
