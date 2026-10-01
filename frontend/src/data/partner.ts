// Ogledalo backend/src/config/reklame.js: novi ključ ide na OBA mjesta.

export type ReklamaPozicija =
  | "SIDEBAR_LIJEVO"
  | "SIDEBAR_DESNO"
  | "INLINE"
  | "DUGME"
  | "MODAL"
  | "BANER"
  | "BANER_ISPOD"
  | "SPONZOR";

export type ReklamaStranica =
  | "pocetna"
  | "ams"
  | "spr"
  | "gpd"
  | "zo3"
  | "pozajmica"
  | "pdv"
  | "neto_bruto"
  | "sifre_djelatnosti"
  | "sifre_zanimanja"
  | "javni_prihodi"
  | "vijesti"
  | "vodici"
  | "rasprave";

export const POZICIJE: {
  id: ReklamaPozicija;
  naziv: string;
  opis: string;
}[] = [
  {
    id: "SIDEBAR_LIJEVO",
    naziv: "Bočni stub lijevo",
    opis: "Visoka kartica lijevo od obrasca, prati skrol. Samo široki ekrani (od oko 1340px).",
  },
  {
    id: "SIDEBAR_DESNO",
    naziv: "Bočni stub desno",
    opis: "Visoka kartica desno od obrasca. Na Vijestima stoji u desnoj koloni.",
  },
  {
    id: "INLINE",
    naziv: "Kartica u obrascu",
    opis: "Mala kartica \"Sponzorisano\" unutar obrasca, vidljiva i na mobitelu.",
  },
  {
    id: "DUGME",
    naziv: "Dugme za preuzimanje",
    opis: "\"Preuzimanje omogućila <brend>\" na dugmetu za preuzimanje PDF-a.",
  },
  {
    id: "MODAL",
    naziv: "Poruka poslije preuzimanja",
    opis: "Sponzorisana poruka u prozoru \"Vaš obrazac je spreman\".",
  },
  {
    id: "BANER",
    naziv: "Veliki baner na početnoj",
    opis: "Najveća pozicija, samo na početnoj stranici ispod Pretplata. Na prelaz mišem se blago uveća. Vidljiv i na mobitelu.",
  },
  {
    id: "BANER_ISPOD",
    naziv: "Baner ispod obrasca",
    opis: "Vodoravna kartica ispod alata (AMS, SPR, GPD, kalkulatori...), na dnu vodiča i rasprava. Glavno mjesto na mobitelu.",
  },
];

/** SPONZOR ne bira partner na kreativi: admin ga dodjeljuje sponzorisanom tekstu. */
export const NAZIV_SPONZOR = "Sponzorisan tekst";

/**
 * Koje pozicije postoje na kojoj stranici (za editor i stranicu Pozicije).
 * Kreativa izabrana za poziciju koje na stranici nema tamo se ne prikazuje.
 */
export const POZICIJE_PO_STRANICI: Record<ReklamaStranica, ReklamaPozicija[]> = {
  pocetna: ["BANER"],
  ams: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "DUGME", "MODAL", "BANER_ISPOD"],
  spr: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "DUGME", "MODAL", "BANER_ISPOD"],
  gpd: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "DUGME", "MODAL", "BANER_ISPOD"],
  zo3: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "DUGME", "BANER_ISPOD"],
  pozajmica: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "DUGME", "BANER_ISPOD"],
  pdv: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "BANER_ISPOD"],
  neto_bruto: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "BANER_ISPOD"],
  sifre_djelatnosti: ["SIDEBAR_DESNO"],
  sifre_zanimanja: ["SIDEBAR_DESNO"],
  javni_prihodi: ["SIDEBAR_DESNO"],
  vijesti: ["SIDEBAR_DESNO", "INLINE"],
  vodici: ["BANER_ISPOD"],
  rasprave: ["BANER_ISPOD"],
};

/** Porezni rokovi za kampanje "pojačano pred rokove" (ogledalo backend ROKOVI). */
export const ROKOVI: { id: string; naziv: string; opis: string }[] = [
  {
    id: "MJESECNI",
    naziv: "Mjesečni rokovi (1. do 10. u mjesecu)",
    opis: "Doprinosi, porez na dohodak i PDV za prethodni mjesec.",
  },
  {
    id: "GODISNJI",
    naziv: "Godišnje prijave (januar do marta)",
    opis: "GPD-1051 i SPR-1053 za prethodnu godinu, rok 31.3.",
  },
];

export const STRANICE: { id: ReklamaStranica; naziv: string; kratko: string }[] = [
  { id: "ams", naziv: "AMS-1035 (prihod iz inostranstva)", kratko: "AMS-1035" },
  { id: "spr", naziv: "SPR-1053", kratko: "SPR-1053" },
  { id: "gpd", naziv: "GPD-1051", kratko: "GPD-1051" },
  { id: "zo3", naziv: "ZO3 obrazac", kratko: "ZO3" },
  { id: "pozajmica", naziv: "Ugovor o pozajmici", kratko: "Ugovor o pozajmici" },
  { id: "pdv", naziv: "PDV kalkulator", kratko: "PDV kalkulator" },
  { id: "neto_bruto", naziv: "Preračun neto/bruto plate", kratko: "Neto/bruto" },
  { id: "sifre_djelatnosti", naziv: "Šifre djelatnosti", kratko: "Šifre djelatnosti" },
  { id: "sifre_zanimanja", naziv: "Šifre zanimanja", kratko: "Šifre zanimanja" },
  { id: "javni_prihodi", naziv: "Javni prihodi (uplatni računi)", kratko: "Javni prihodi" },
  { id: "vijesti", naziv: "Vijesti (naslovna)", kratko: "Vijesti" },
  { id: "vodici", naziv: "Vodiči", kratko: "Vodiči" },
  { id: "rasprave", naziv: "Rasprave", kratko: "Rasprave" },
  { id: "pocetna", naziv: "Početna stranica", kratko: "Početna" },
];

export function kratkoStranice(id: string): string {
  if (id === "*") return "sve stranice";
  return STRANICE.find((s) => s.id === id)?.kratko ?? id;
}

export function nazivPozicije(id: string): string {
  if (id === "SPONZOR") return NAZIV_SPONZOR;
  return POZICIJE.find((p) => p.id === id)?.naziv ?? id;
}

export function nazivStranice(id: string): string {
  if (id === "*") return "Sve stranice";
  return STRANICE.find((s) => s.id === id)?.naziv ?? id;
}

/**
 * Prijedlozi teksta po stranici: posjetilac te stranice ima konkretnu
 * potrebu (prihod iz inostranstva, novi obrt, isplata plata), pa poruka
 * koja je pogađa radi bolje od opšte. Partner klikom preuzme prijedlog i
 * prilagodi ga svojoj ponudi.
 */
export const PRIJEDLOZI_TEKSTA: {
  stranice: ReklamaStranica[];
  naziv: string;
  naslov: string;
  tekst: string;
  cta: string;
}[] = [
  {
    stranice: ["ams"],
    naziv: "Prihod iz inostranstva",
    naslov: "Primate novac iz *inostranstva*?",
    tekst: "Devizni račun sa brzim prilivom uplata iz inostranstva i jasnim naknadama.",
    cta: "Otvorite devizni račun",
  },
  {
    stranice: ["sifre_djelatnosti", "sifre_zanimanja", "javni_prihodi"],
    naziv: "Novi obrt ili firma",
    naslov: "Otvarate *obrt ili firmu*?",
    tekst: "Poslovni račun otvarate odmah po registraciji, a dio koraka završavate online.",
    cta: "Saznajte kako",
  },
  {
    stranice: ["spr", "gpd", "zo3"],
    naziv: "Račun za obrtnike",
    naslov: "Račun za vaš *obrt*",
    tekst: "Poslovni račun i e-bankarstvo: porezi i doprinosi plaćeni iz jednog mjesta.",
    cta: "Otvorite račun",
  },
  {
    stranice: ["neto_bruto", "pdv"],
    naziv: "Isplata plata",
    naslov: "Isplata plata *bez gužve*",
    tekst: "Paket za poslodavce: plate, doprinosi i porezi plaćeni elektronski, u jednom nalogu.",
    cta: "Paket za poslodavce",
  },
  {
    stranice: ["pozajmica"],
    naziv: "Kredit za posao",
    naslov: "Kredit za *razvoj posla*",
    tekst: "Umjesto pozajmice, kredit za obrtnike i male firme sa jasnim planom otplate.",
    cta: "Izračunajte ratu",
  },
  {
    stranice: ["gpd", "spr"],
    naziv: "Godišnja prijava (rok 31.3.)",
    naslov: "Rok za godišnju prijavu je *31. mart*",
    tekst: "Platite porez za prethodnu godinu kroz e-bankarstvo, bez odlaska u banku.",
    cta: "Platite online",
  },
];
