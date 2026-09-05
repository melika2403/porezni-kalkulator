// FAQ za /solo: isti sadržaj ide u vidljivi FaqSection (klijent) i u FAQPage
// JSON-LD (app/solo/page.tsx, server), zato živi u modulu bez "use client".
import type { FaqItem } from "src/components/FaqSection/FaqSection";
import { PLAN_PRICING, calcGross, formatKmOkruglo as km } from "src/data/pricing";

export const SOLO_NETO = PLAN_PRICING.OFFICE_1.yearly;
export const SOLO_BRUTO = calcGross(SOLO_NETO);
export const SOLO_MJESECNO = PLAN_PRICING.OFFICE_1.monthly;

export const SOLO_FAQ: FaqItem[] = [
  {
    q: "Za koga je PK Office Solo?",
    a: "Za vlasnika jednog obrta u Federaciji BiH koji knjige želi voditi sam: freelancer sa obrtom, IT, dizajn, prevođenje, konsalting, uslužne djelatnosti, mali zanat. Najjednostavnije je kad nemaš radnike ni robu, ali i to Solo pokriva kroz dodatne module. Ako imaš d.o.o., Solo nije za tebe: društvo vodi dvojno knjigovodstvo, a PK Office vodi obrte.",
  },
  {
    q: "Mogu li zaista bez knjigovođe?",
    a: "Za obrt sa jednim vlasnikom, bez radnika i bez PDV-a, Solo pokriva sve što knjigovođa radi svakog mjeseca: izvod se proknjiži, KPR se popuni, doprinosi vlasnika se obračunaju sa uplatnicama i Obrascem 2002, a na kraju godine SPR i GPD nastanu iz knjiga. Obrasce predaješ sam, elektronski ili na šalteru. Ako je situacija složena (više djelatnosti, PDV sa posebnim isporukama, radnici sa posebnim ugovorima), knjigovođa ostaje dobar izbor, a PK Office tada koristite zajedno.",
  },
  {
    q: "Koliko košta i kako se plaća?",
    a: `${km(SOLO_NETO)} KM godišnje + PDV, odnosno ${km(SOLO_BRUTO)} KM sa PDV-om za jedan obrt, oko ${km(SOLO_MJESECNO)} KM mjesečno. Prvih 30 dana je besplatno, bez kartice. Plaća se uplatom po predračunu, kao i ostali paketi.`,
  },
  {
    q: "Šta ako još nemam otvoren obrt?",
    a: "Solo je za registrovan obrt. Ako tek planiraš, pročitaj vodič o otvaranju obrta u FBiH. Ako honorare iz inostranstva primaš kao fizičko lice bez obrta, za tebe je PK Freelancer i besplatni AMS-1035 generator.",
  },
  {
    q: "Imam radnike ili prodajem robu, radi li Solo?",
    a: "Da. U upitniku pri prvom ulasku uključiš module koji ti trebaju: radnici i plate (obračun, listići na email, MIP, prijave i odjave), roba i maloprodaja (kalkulacije, lager, popis), blagajna, putni nalozi, stalna sredstva. Obračun je isti kao u punom PK Office-u, samo je meni kraći.",
  },
  {
    q: "Kako prelazim iz starog programa ili od knjigovođe?",
    a: "Uvoz partnera, artikala, radnika i izvoda je besplatan, a početno stanje lagera i prethodne plate unosiš kroz gotove šablone. Od knjigovođe zatraži KPR za tekuću godinu i zadnji Obrazac 2002, pa nastavljaš od tekućeg mjeseca. Uputstvo Prvi mjesec vodi korak po korak.",
  },
  {
    q: "Šta kad obrt poraste?",
    a: "Prelaziš na Office Start (do 2 obrta) ili Tim (do 10) bez ponovnog unosa, svi podaci ostaju. Ako uzmeš knjigovođu, dodaš ga kao korisnika na svoj obrt i radite u istim knjigama.",
  },
];
