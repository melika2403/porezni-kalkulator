// ──────────────────────────────────────────────────────────────────────────────
//  Single source of truth za uplatne račune koje koristimo u obrascima.
//  Verifikovani podaci sa zvanične PUFBiH stranice:
//    https://www.pufbih.ba/servisi-za-obveznike/uplatni-racuni
//
//  Frontend (AMS, GPD, UoD, JavniPrihodi page) importuje direktno.
//  Backend (payroll PDF generator) čita preko skripte
//    scripts/sync-racuni-backend.mjs koja generiše
//    backend/src/utils/uplatniRacuniData.json.
//
//  Kad mijenjaš račune, izmijeni samo ovaj fajl pa pokreni:
//    node scripts/sync-racuni-backend.mjs
// ──────────────────────────────────────────────────────────────────────────────

export type KantonKey =
  | "USK" | "POS" | "TUZ" | "ZDK" | "BPK"
  | "SBK" | "HNK" | "ZHK" | "KS"  | "K10";

export type Opcina = { ime: string; kod: string };

export interface KantonData {
  ime: string;
  genitiv: string;
  zoRacun: string;       // Kantonalni zavod zdravstvenog osiguranja
  budzet: string;        // Kantonalni budžet (porez na dohodak i kantonalne naknade)
  nezapRacun: string;    // Kantonalna služba za zapošljavanje
  opcine: Opcina[];
}

export const KANTONI: Record<KantonKey, KantonData> = {
  USK: {
    ime: "Unsko-sanski kanton",
    genitiv: "Unsko-sanskog kantona",
    zoRacun: "338-500-22751661-53",
    budzet: "338-000-22100058-77",
    nezapRacun: "338-000-22100129-58",
    opcine: [
      { ime: "Bihać", kod: "003" },
      { ime: "Bosanska Krupa", kod: "008" },
      { ime: "Bosanski Petrovac", kod: "011" },
      { ime: "Cazin", kod: "019" },
      { ime: "Ključ", kod: "048" },
      { ime: "Sanski Most", kod: "076" },
      { ime: "Velika Kladuša", kod: "097" },
      { ime: "Bužim", kod: "124" },
    ],
  },
  POS: {
    ime: "Posavski kanton",
    genitiv: "Posavskog kantona",
    zoRacun: "161-080-00026400-20",
    budzet: "338-000-22104571-21",
    nezapRacun: "306-042-00009586-97",
    opcine: [
      { ime: "Orašje", kod: "068" },
      { ime: "Odžak", kod: "066" },
      { ime: "Domaljevac-Šamac", kod: "012" },
    ],
  },
  TUZ: {
    ime: "Tuzlanski kanton",
    genitiv: "Tuzlanskog kantona",
    zoRacun: "338-440-22124691-66",
    budzet: "132-100-02560000-80",
    nezapRacun: "132-100-03110200-32",
    opcine: [
      { ime: "Banovići", kod: "001" },
      { ime: "Gračanica", kod: "035" },
      { ime: "Gradačac", kod: "036" },
      { ime: "Kalesija", kod: "044" },
      { ime: "Kladanj", kod: "047" },
      { ime: "Čelić", kod: "056" },
      { ime: "Lukavac", kod: "057" },
      { ime: "Srebrenik", kod: "085" },
      { ime: "Tuzla", kod: "094" },
      { ime: "Živinice", kod: "106" },
      { ime: "Doboj-Istok", kod: "128" },
      { ime: "Sapna", kod: "138" },
      { ime: "Teočak", kod: "142" },
    ],
  },
  ZDK: {
    ime: "Zeničko-dobojski kanton",
    genitiv: "Zeničko-dobojskog kantona",
    zoRacun: "134-010-00000021-57",
    budzet: "134-010-00000016-72",
    nezapRacun: "134-010-00001075-96",
    opcine: [
      { ime: "Breza", kod: "016" },
      { ime: "Kakanj", kod: "043" },
      { ime: "Maglaj", kod: "060" },
      { ime: "Olovo", kod: "067" },
      { ime: "Tešanj", kod: "090" },
      { ime: "Vareš", kod: "096" },
      { ime: "Visoko", kod: "098" },
      { ime: "Zavidovići", kod: "102" },
      { ime: "Zenica", kod: "103" },
      { ime: "Žepče", kod: "105" },
      { ime: "Doboj-Jug", kod: "132" },
      { ime: "Usora", kod: "025" },
    ],
  },
  BPK: {
    ime: "Bosansko-podrinjski kanton",
    genitiv: "Bosansko-podrinjskog kantona",
    zoRacun: "134-620-10082668-97",
    budzet: "101-140-0078226-394",
    nezapRacun: "101-140-00004638-22",
    opcine: [
      { ime: "Goražde", kod: "033" },
      { ime: "Foča", kod: "134" },
      { ime: "Pale", kod: "136" },
    ],
  },
  SBK: {
    ime: "Srednjobosanski kanton",
    genitiv: "Središnjobosanskog kantona",
    zoRacun: "134-481-10082431-53",
    budzet: "134-113-0360000-194",
    nezapRacun: "338-000-22100281-87",
    opcine: [
      { ime: "Bugojno", kod: "017" },
      { ime: "Busovača", kod: "018" },
      { ime: "Donji Vakuf", kod: "026" },
      { ime: "Dobretići", kod: "050" },
      { ime: "Fojnica", kod: "030" },
      { ime: "Gornji Vakuf", kod: "034" },
      { ime: "Jajce", kod: "042" },
      { ime: "Kiseljak", kod: "046" },
      { ime: "Kreševo", kod: "051" },
      { ime: "Novi Travnik", kod: "065" },
      { ime: "Travnik", kod: "091" },
      { ime: "Vitez", kod: "100" },
    ],
  },
  HNK: {
    ime: "Hercegovačko-neretvanski kanton",
    genitiv: "Hercegovačko-neretvanskog kantona",
    zoRacun: "555-090-0069475-156",
    budzet: "134-209-0360000-146",
    nezapRacun: "161-020-00138001-91",
    opcine: [
      { ime: "Čapljina", kod: "021" },
      { ime: "Čitluk", kod: "023" },
      { ime: "Grad Mostar", kod: "180" },
      { ime: "Jablanica", kod: "041" },
      { ime: "Konjic", kod: "049" },
      { ime: "Neum", kod: "107" },
      { ime: "Prozor-Rama", kod: "073" },
      { ime: "Ravno", kod: "207" },
      { ime: "Stolac", kod: "086" },
    ],
  },
  ZHK: {
    ime: "Zapadno-hercegovački kanton",
    genitiv: "Zapadno-hercegovačkog kantona",
    zoRacun: "102-874-0000000-362",
    budzet: "338-000-22000040-13",
    nezapRacun: "338-000-22000102-21",
    opcine: [
      { ime: "Široki Brijeg", kod: "054" },
      { ime: "Grude", kod: "037" },
      { ime: "Ljubuški", kod: "059" },
      { ime: "Posušje", kod: "070" },
    ],
  },
  KS: {
    ime: "Kanton Sarajevo",
    genitiv: "Kantona Sarajevo",
    zoRacun: "154-921-20146172-45",
    budzet: "141-196-53200084-75",
    nezapRacun: "154-921-20101710-56",
    opcine: [
      { ime: "Hadžići", kod: "038" },
      { ime: "Ilijaš", kod: "040" },
      { ime: "Centar", kod: "077" },
      { ime: "Ilidža", kod: "078" },
      { ime: "Novo Sarajevo", kod: "079" },
      { ime: "Vogošća", kod: "080" },
      { ime: "Novi Grad", kod: "108" },
      { ime: "Stari Grad", kod: "109" },
      { ime: "Trnovo", kod: "093" },
    ],
  },
  K10: {
    ime: "Kanton 10",
    genitiv: "Kantona 10",
    zoRacun: "154-921-20048246-10",
    budzet: "161-020-00335600-61",
    nezapRacun: "338-000-22000344-71",
    opcine: [
      { ime: "Livno", kod: "055" },
      { ime: "Tomislavgrad", kod: "028" },
      { ime: "Kupres", kod: "052" },
      { ime: "Glamoč", kod: "032" },
      { ime: "Bosansko Grahovo", kod: "013" },
      { ime: "Drvar", kod: "027" },
    ],
  },
};

// ── Federalni i fondovski računi ────────────────────────────────────────────
export const FBIH_BUDZET_RACUN = "102-050-00001066-98";   // Budžet FBiH (PIO/MIO, vodna, nesreće…)
export const FBIH_ZO_RACUN = "102-050-00000640-18";       // Zavod zdravstvenog osiguranja FBiH (10,2%)
export const FBIH_NEZAP_RACUN = "161-000-00285700-03";    // Federalni zavod za zapošljavanje (30%)
export const FOND_INVALIDI_RACUN = "338-690-22963585-21"; // Fond za prof. rehabilitaciju i zapošljavanje OSI
export const JRT_TREZOR_BIH_RACUN = "338-000-22100183-90"; // JRT Trezor BiH — administrativne takse (UniCredit Banka d.d. Mostar)

// ── Helper: kanton → opcina mapping ────────────────────────────────────────
export function kantonForOpcina(
  opcinaIme: string,
): { kantonKey: KantonKey; kantonData: KantonData; opcinaKod: string } | null {
  if (!opcinaIme) return null;
  const target = opcinaIme.trim().toLowerCase();
  for (const key of Object.keys(KANTONI) as KantonKey[]) {
    const k = KANTONI[key];
    for (const o of k.opcine) {
      if (o.ime.toLowerCase() === target) {
        return { kantonKey: key, kantonData: k, opcinaKod: o.kod };
      }
    }
  }
  return null;
}

// ── Aggregated structure za JavniPrihodi reference page ────────────────────
export type Racun = {
  naziv: string;
  banka: string;
  racun: string;
  napomena?: string;
};

// BiH bank prefixes (prve 3 cifre transakcijskog računa identifikuju banku)
const BANK_PREFIXES: Record<string, string> = {
  "101": "Privredna banka Sarajevo d.d.",
  "102": "Union banka d.d. Sarajevo",
  "132": "NLB Banka d.d. Tuzla",
  "134": "ASA Banka d.d. Sarajevo",
  "140": "Sparkasse Bank d.d.",
  "141": "Bosna Bank International d.d.",
  "154": "Intesa Sanpaolo Banka d.d. BiH",
  "160": "Vakufska banka d.d. Sarajevo",
  "161": "Raiffeisen Bank d.d. BiH",
  "180": "Komercijalno-investiciona banka d.d.",
  "199": "Sparkasse Bank d.d.",
  "306": "ASA Banka d.d.",
  "338": "UniCredit Bank d.d.",
  "555": "ASA Banka Naša i Snažna d.d.",
};

export function bankFromAccount(acc: string): string {
  return BANK_PREFIXES[acc.slice(0, 3)] || "—";
}

// Federalni / fondovski računi za JavniPrihodi page
export const FEDERALNI_RACUNI: Racun[] = [
  {
    naziv: "Budžet Federacije BiH",
    banka: bankFromAccount(FBIH_BUDZET_RACUN),
    racun: FBIH_BUDZET_RACUN,
    napomena: "Doprinos PIO/MIO, federalni porezi, vodna naknada, zaštita od nesreća",
  },
  {
    naziv: "Zavod zdravstvenog osiguranja i reosiguranja FBiH",
    banka: bankFromAccount(FBIH_ZO_RACUN),
    racun: FBIH_ZO_RACUN,
    napomena: "Federalni dio zdravstvenog osiguranja (10,2%)",
  },
  {
    naziv: "Federalni zavod za zapošljavanje",
    banka: bankFromAccount(FBIH_NEZAP_RACUN),
    racun: FBIH_NEZAP_RACUN,
    napomena: "Federalni dio doprinosa za nezaposlenost (30%)",
  },
  {
    naziv: "Fond za prof. rehabilitaciju i zapošljavanje osoba s invaliditetom",
    banka: bankFromAccount(FOND_INVALIDI_RACUN),
    racun: FOND_INVALIDI_RACUN,
    napomena: "0,5% bruto plata svih radnika",
  },
  {
    naziv: "JRT Trezor BiH — depozitni račun",
    banka: "UniCredit Banka d.d. Mostar",
    racun: JRT_TREZOR_BIH_RACUN,
    napomena: "Administrativne takse (federalne)",
  },
];

// Kantonalni budžeti za JavniPrihodi page
export const KANTONALNI_BUDZETI: Racun[] = (Object.keys(KANTONI) as KantonKey[]).map((k) => ({
  naziv: `Budžet ${KANTONI[k].genitiv}`,
  banka: bankFromAccount(KANTONI[k].budzet),
  racun: KANTONI[k].budzet,
  napomena: "Porez na dohodak, kantonalne naknade",
}));

// Kantonalni ZZO za JavniPrihodi page
export const KANTONALNI_ZZO: Racun[] = (Object.keys(KANTONI) as KantonKey[]).map((k) => ({
  naziv: `Zavod zdravstvenog osiguranja — ${KANTONI[k].genitiv}`,
  banka: bankFromAccount(KANTONI[k].zoRacun),
  racun: KANTONI[k].zoRacun,
  napomena: "Kantonalni dio zdravstvenog osiguranja (89,8%)",
}));

// Kantonalne službe za zapošljavanje za JavniPrihodi page
export const KANTONALNE_SLUZBE_ZAPOSLJAVANJE: Racun[] = (Object.keys(KANTONI) as KantonKey[]).map((k) => ({
  naziv: `Kantonalna služba za zapošljavanje — ${KANTONI[k].genitiv}`,
  banka: bankFromAccount(KANTONI[k].nezapRacun),
  racun: KANTONI[k].nezapRacun,
  napomena: "Kantonalni dio doprinosa za nezaposlenost (70%)",
}));
