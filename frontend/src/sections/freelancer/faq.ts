// FAQ za /freelancer: isti sadržaj ide u vidljivi FaqSection (landing, klijent)
// i u FAQPage JSON-LD (app/freelancer/page.tsx, server). Zato živi u običnom
// modulu bez "use client": izvoz iz klijentskog modula bi serveru stigao kao
// referenca, ne kao niz.
import type { FaqItem } from "src/components/FaqSection/FaqSection";
import { FREELANCER_CIJENA_KM } from "src/api/freelancer";

export const FREELANCER_FAQ: FaqItem[] = [
  {
    q: "Za koga je PK Freelancer?",
    a: "Za fizička lica u Federaciji BiH koja primaju honorare iz inostranstva (freelance rad preko Upworka, direktni klijenti, autorske naknade) i prijavljuju ih obrascem AMS-1035. Ako imate registrovan obrt, prihod ide kroz obrt i za to je PK Office.",
  },
  {
    q: "Šta je besplatno, a šta traži paket?",
    a: "Generator AMS-1035 obrasca i tri uplatnice ostaje besplatan i bez registracije. Uz besplatnu registraciju čuvate do 5 isplatilaca i do 3 uplate godišnje u evidenciji. Paket PK Freelancer skida ta ograničenja i otključava podsjetnike na rokove, GPD-1051 iz evidencije, pregled prihoda za banku i arhivu ovjerenih obrazaca.",
  },
  {
    q: "Koliko košta i kako se plaća?",
    a: `${FREELANCER_CIJENA_KM} KM godišnje sa uračunatim PDV-om, bez mjesečnih planova. Prvih 30 dana je besplatno i proba se aktivira jednim klikom. Plaća se uplatom po predračunu na račun, kao i ostali paketi.`,
  },
  {
    q: "Kako se računa porez na uplatu iz inostranstva?",
    a: "Od bruto iznosa se odbijaju normirani rashodi 20% (30% za autorske naknade), na dohodak se plaća doprinos za zdravstveno osiguranje 4%, a porez na dohodak 10% na osnovicu umanjenu za taj doprinos. Evidencija računa isto kao i AMS generator, pa se iznosi poklapaju s obrascem.",
  },
  {
    q: "Koji su rokovi?",
    a: "AMS-1035 se predaje poreznoj ispostavi u roku od 5 dana od primitka uplate, a godišnja prijava GPD-1051 do 31. marta za prethodnu godinu. PK Freelancer računa rok za svaku uplatu i šalje podsjetnik dan prije i na dan roka, i u martu za GPD.",
  },
  {
    q: "Šta je pregled prihoda i kome služi?",
    a: "PDF sa svim uplatama u godini, obračunatim zdravstvenim i porezom i zbirovima, sa vašim podacima. Freelanceri ga traže za kredit, vizu ili stan jer nemaju platnu listu. Nije zvanična potvrda Porezne uprave: dokaz ostaju ovjereni AMS obrasci i uplatnice, koje možete čuvati u arhivi uz svaku uplatu.",
  },
];
