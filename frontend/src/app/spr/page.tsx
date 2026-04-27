import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "SPR-1053 obrazac — specifikacija dohotka od samostalne djelatnosti | Porezni Kalkulator BiH",
  description:
    "Kako popuniti SPR-1053 obrazac? Online popuna obrasca za specifikaciju dohotka od obrta, slobodnih zanimanja i poljoprivrede u FBiH. Preuzmite popunjeni PDF besplatno, bez registracije.",
  alternates: { canonical: "https://poreznikalkulator.ba/spr" },
};

// sections
import SprForm from "src/sections/spr/Spr";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Ko je obavezan podnijeti SPR-1053 obrazac?", acceptedAnswer: { "@type": "Answer", text: "SPR-1053 podnose fizičke osobe koje obavljaju samostalnu djelatnost (obrtnici, slobodna zanimanja, poljoprivrednici) radi utvrđivanja dohotka od te djelatnosti." } },
    { "@type": "Question", name: "Koji je rok za predaju SPR obrasca?", acceptedAnswer: { "@type": "Answer", text: "SPR-1053 se predaje do 31. marta tekuće godine za prethodnu kalendarsku godinu, zajedno sa godišnjom prijavom poreza (GPD-1051)." } },
    { "@type": "Question", name: "Šta su normirani rashodi i kolika je njihova stopa?", acceptedAnswer: { "@type": "Answer", text: "Normirani rashodi su paušalno priznat odbitak troškova poslovanja od ukupnog prihoda. Standardna stopa je 20%. Ukoliko su stvarni rashodi veći, možete koristiti stvarne troškove uz obavezu vođenja poslovnih knjiga." } },
    { "@type": "Question", name: "Razlika između SPR i GPD obrasca?", acceptedAnswer: { "@type": "Answer", text: "SPR-1053 je specifikacija dohotka od samostalne djelatnosti. GPD-1051 je godišnja prijava koja objedinjuje sve izvore dohotka i izračunava konačnu poreznu obavezu." } },
    { "@type": "Question", name: "Kako se obračunava akontacija poreza tokom godine?", acceptedAnswer: { "@type": "Answer", text: "Akontacija poreza je predviđanje Vaše dobiti na kraju poslovne godine, na osnovu dobiti prošle godine. Ona bi se trebala uplaćivati svaki mjesec, te ukoliko zatražite neki dokument ili potvrdu od porezne uprave, mogu od Vas zatražiti da su Vam sve akontacije do tog mjeseca uplaćene. Akontacije Vam pomažu da izbjegnete velike porezne obaveze na kraju godine. Ukoliko na kraju godine imate više uplaćenih akontacija nego poreza za platiti, one se prenose na sljedeću godinu." } },
  ],
};

export default function MaintenancePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SprForm />
    </>
  );
}
