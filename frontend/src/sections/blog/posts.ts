import type { ComponentType } from "react";
import ObrtVsDoo from "./posts/ObrtVsDoo";
import MinimalnaPlataFbih2026 from "./posts/MinimalnaPlataFbih2026";
import KakoSeRacunaNetoPlata from "./posts/KakoSeRacunaNetoPlata";
import OtvaranjeObrtaFbih from "./posts/OtvaranjeObrtaFbih";
import PriznatiRashodiObrta from "./posts/PriznatiRashodiObrta";
import UgovorDjeluVsRadu from "./posts/UgovorDjeluVsRadu";
import PdvObveznik100000 from "./posts/PdvObveznik100000";
import Gpd1051KorakPoKorak from "./posts/Gpd1051KorakPoKorak";
import OtkazRadnikaFbih from "./posts/OtkazRadnikaFbih";
import TopliObrokRegres from "./posts/TopliObrokRegres";
import KolikoKostaRadnikPoslodavca from "./posts/KolikoKostaRadnikPoslodavca";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  /** Datum objave u ISO formatu (YYYY-MM-DD). */
  date: string;
  /** Procjena vremena čitanja, npr. "8 min". */
  readingTime: string;
  /** Tag / kategorija za grupisanje (opciono). */
  category?: string;
  Content: ComponentType;
};

// Najnoviji prvi (`date` desc).
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "koliko-kosta-radnik-poslodavca-fbih",
    title: "Koliko košta radnik poslodavca u FBiH 2026: ukupan trošak zaposlenog",
    excerpt:
      "Neto na oglasu je samo dio priče. Računamo stvarni mjesečni i godišnji trošak radnika u FBiH za 2026: doprinosi, porez, dodatne naknade, tabela po platama i skriveni troškovi (topli obrok, prevoz, regres).",
    date: "2026-06-04",
    readingTime: "8 min",
    category: "Plate i doprinosi",
    Content: KolikoKostaRadnikPoslodavca,
  },
  {
    slug: "topli-obrok-regres-fbih-2026",
    title: "Topli obrok i regres u FBiH 2026: neoporezivi iznosi i pravila",
    excerpt:
      "Topli obrok do 1% prosječne neto plate FBiH dnevno, regres do 50% kvartalno. Detaljan vodič o neoporezivim primanjima u FBiH za 2026, sa iznosima, dokumentacijom i praktičnim primjerima.",
    date: "2026-06-01",
    readingTime: "9 min",
    category: "Plate i doprinosi",
    Content: TopliObrokRegres,
  },
  {
    slug: "otkaz-radnika-fbih",
    title: "Otkaz radnika u FBiH: zakonski razlozi, otkazni rok i otpremnine",
    excerpt:
      "Kompletan vodič o otkazu radnog odnosa po Zakonu o radu FBiH. Razlozi na strani radnika i poslovni razlozi, otkazni rokovi (7-30 dana), otpremnine, zaštićene kategorije, postupak korak po korak.",
    date: "2026-05-31",
    readingTime: "11 min",
    category: "Ugovori",
    Content: OtkazRadnikaFbih,
  },
  {
    slug: "gpd-1051-korak-po-korak",
    title: "GPD-1051 godišnja prijava poreza na dohodak 2025: korak po korak",
    excerpt:
      "Detaljan vodič kroz popunjavanje GPD-1051 obrasca za 2025. godinu (rok 31.03.2026.). Ko mora podnijeti, koji podaci trebaju, kako prijaviti dohotke iz više izvora, primjer obračuna.",
    date: "2026-05-30",
    readingTime: "9 min",
    category: "Porezni obrasci",
    Content: Gpd1051KorakPoKorak,
  },
  {
    slug: "priznati-rashodi-obrta-2026",
    title: "Šta sve može u trošak obrta: lista priznatih rashoda 2026",
    excerpt:
      "Kompletan vodič kroz priznate rashode za obrtnike u stvarnom režimu: operativni troškovi, oprema, vozila, plate, reprezentacija, marketing. Šta NIJE priznato i kako pravilno dokumentovati.",
    date: "2026-05-29",
    readingTime: "10 min",
    category: "Porez i doprinosi",
    Content: PriznatiRashodiObrta,
  },
  {
    slug: "ugovor-o-djelu-vs-ugovor-o-radu",
    title: "Ugovor o djelu vs ugovor o radu: porezne razlike i kada koji",
    excerpt:
      "Detaljno poređenje ugovora o djelu (honorar) i ugovora o radu u FBiH. Stope doprinosa, primjeri obračuna, kada je honorar primjeren a kada je obavezan ugovor o radu, rizici inspekcije rada.",
    date: "2026-05-28",
    readingTime: "9 min",
    category: "Ugovori",
    Content: UgovorDjeluVsRadu,
  },
  {
    slug: "pdv-obveznik-prag-100000-km",
    title: "Kada moram postati PDV obveznik u BiH: prag 100.000 KM i šta nakon",
    excerpt:
      "Prag za obaveznu PDV registraciju u BiH je 100.000 KM od decembra 2023. Kada konkretno podnijeti zahtjev kod UINO, šta se mijenja u poslovanju (KIF, KUF, mjesečne prijave) i da li ima smisla dobrovoljna registracija.",
    date: "2026-05-27",
    readingTime: "10 min",
    category: "PDV",
    Content: PdvObveznik100000,
  },
  {
    slug: "minimalna-plata-fbih-2026",
    title: "Minimalna plata u FBiH 2026: koliko košta poslodavca i šta dobija radnik",
    excerpt:
      "Minimalna neto plata FBiH za 2026. iznosi 1.027 KM. Pregled odgovarajućeg bruta, ukupnog troška za poslodavca, šta sve može u minimalnu i kako aneksirati postojeće ugovore.",
    date: "2026-05-26",
    readingTime: "7 min",
    category: "Plate i doprinosi",
    Content: MinimalnaPlataFbih2026,
  },
  {
    slug: "kako-se-racuna-neto-plata-fbih",
    title: "Kako se računa neto plata u FBiH: formula, primjeri i ukupan trošak",
    excerpt:
      "Bruto, doprinosi 31%, lični odbitak 300 KM i porez 10%. Detaljna formula sa primjerima za različite plate, tabela neto/bruto/trošak i ukupna cijena radnika za poslodavca.",
    date: "2026-05-25",
    readingTime: "8 min",
    category: "Plate i doprinosi",
    Content: KakoSeRacunaNetoPlata,
  },
  {
    slug: "obrt-vs-doo-2026",
    title: "Obrt ili d.o.o.: šta odabrati u FBiH za 2026?",
    excerpt:
      "Detaljno poređenje između obrta i d.o.o. u FBiH: porezi, doprinosi, odgovornost, troškovi registracije i kada se koja forma isplati.",
    date: "2026-05-24",
    readingTime: "9 min",
    category: "Otvaranje firme",
    Content: ObrtVsDoo,
  },
  {
    slug: "otvaranje-obrta-fbih-korak-po-korak",
    title: "Otvaranje obrta u FBiH korak po korak: troškovi, dokumenti, vrijeme",
    excerpt:
      "Praktičan vodič kroz 8 koraka registracije obrta u FBiH. Administrativne takse 80 KM, ukupni troškovi 230-500 KM, lista dokumenata i obaveze odmah nakon registracije.",
    date: "2026-05-23",
    readingTime: "10 min",
    category: "Otvaranje firme",
    Content: OtvaranjeObrtaFbih,
  },
];

export function getPostBySlug(slug: string): BlogPost | null {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}
