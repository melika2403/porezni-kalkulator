import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "GPD-1051 obrazac — godišnja prijava poreza na dohodak | Porezni Kalkulator BiH",
  description:
    "Popunite GPD-1051 obrazac online i preuzmite popunjeni PDF. Godišnja prijava poreza na dohodak fizičkih lica — besplatno, bez registracije.",
  alternates: { canonical: "https://poreznikalkulator.ba/gpd" },
};

// sections
import GpdForm from "src/sections/gpd/Gpd";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Ko je obavezan podnijeti GPD-1051 obrazac?", acceptedAnswer: { "@type": "Answer", text: "Godišnju prijavu poreza na dohodak obavezno podnosi svaka fizička osoba — rezident FBiH — koja je tokom godine ostvarila dohodak koji podliježe oporezivanju, uključujući dohotke od nesamostalne djelatnosti, samostalne djelatnosti, imovine i imovinskih prava, kapitala i ostale dohotke." } },
    { "@type": "Question", name: "Koji je rok za predaju GPD obrasca?", acceptedAnswer: { "@type": "Answer", text: "GPD-1051 obrazac predaje se najkasnije do 31. marta tekuće godine za prethodnu kalendarsku godinu." } },
    { "@type": "Question", name: "Ko ne mora podnositi godišnju prijavu poreza?", acceptedAnswer: { "@type": "Answer", text: "Osobe čiji su ukupni godišnji prihodi manji od iznosa godišnjeg ličnog odbitka (3.600 KM), te osobe koje su ostvarile isključivo dohodak od jednog poslodavca koji je pravilno obračunavao poreze." } },
    { "@type": "Question", name: "Šta su lični odbici i kako ih koristim?", acceptedAnswer: { "@type": "Answer", text: "Lični odbitak iznosi 300 KM mjesečno (3.600 KM godišnje). Dodatni odbici postoje za uzdržavane članove porodice, doprinos za zdravstveno osiguranje i plaćene kamate na stambene kredite." } },
    { "@type": "Question", name: "Mogu li tražiti povrat poreza putem GPD obrasca?", acceptedAnswer: { "@type": "Answer", text: "Da. Ukoliko su akontacije poreza plaćene tokom godine veće od stvarne godišnje porezne obaveze, imate pravo na povrat razlike zajedno sa GPD obrascem." } },
  ],
};

export default function MaintenancePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <GpdForm />
    </>
  );
}
