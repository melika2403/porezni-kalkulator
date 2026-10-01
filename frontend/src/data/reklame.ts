// Ogledalo backend/src/config/reklame.js: novi ključ ide na OBA mjesta.

export type ReklamaPozicija =
  | "SIDEBAR_LIJEVO"
  | "SIDEBAR_DESNO"
  | "INLINE"
  | "DUGME"
  | "MODAL";

export type ReklamaStranica = "ams" | "spr" | "gpd" | "vijesti";

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
];

export const STRANICE: { id: ReklamaStranica; naziv: string; kratko: string }[] = [
  { id: "ams", naziv: "AMS-1035 (prihod iz inostranstva)", kratko: "AMS-1035" },
  { id: "spr", naziv: "SPR-1053", kratko: "SPR-1053" },
  { id: "gpd", naziv: "GPD-1051", kratko: "GPD-1051" },
  { id: "vijesti", naziv: "Vijesti (naslovna)", kratko: "Vijesti" },
];

export function kratkoStranice(id: string): string {
  if (id === "*") return "sve stranice";
  return STRANICE.find((s) => s.id === id)?.kratko ?? id;
}

export function nazivPozicije(id: string): string {
  return POZICIJE.find((p) => p.id === id)?.naziv ?? id;
}

export function nazivStranice(id: string): string {
  if (id === "*") return "Sve stranice";
  return STRANICE.find((s) => s.id === id)?.naziv ?? id;
}
