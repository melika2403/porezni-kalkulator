import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ── Types ── */

export type KantonKey =
  | "USK" | "POS" | "TUZ" | "ZDK" | "BPK"
  | "SBK" | "HNK" | "ZHK" | "KS"  | "K10";

export interface KantonData {
  ime: string;
  genitiv: string;
  zoRacun: string;
  budzet: string;
  opcine: { ime: string; kod: string }[];
}

export const KANTONI: Record<KantonKey, KantonData> = {
  USK: {
    ime: "Unsko-sanski kanton",
    genitiv: "Unsko-sanskog kantona",
    zoRacun: "338-500-22751661-53",
    budzet: "338-000-22100058-77",
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

const FBIH_ZO_RACUN = "102-050-00000640-18";

export interface UplatnicaData {
  imeIPrezime: string;
  adresa: string;
  jmbg: string;
  periodMjesec: string;      // "01"–"12"
  periodGodina: string;      // "2026"
  zdravstvenoKanton: number; // zdravstveno × 89,8% → uplatnica 1
  zdravstvenoFbih: number;   // zdravstveno × 10,2% → uplatnica 2
  porez: number;             // razlika poreza → uplatnica 3
  kantonKey: KantonKey;
  opcinaKod: string;         // 3-digit
  opcinaIme: string;         // for Mjesto
  datum: string;             // ISO yyyy-mm-dd
  ziroRacun?: string;        // formatted XXX-XXX-XXXXXXXX-XX (optional)
}

/* ── Helpers ── */

interface Box { x1: number; y1: number; x2: number; y2: number; }

// Strip dashes from account number → 16 digit string
const accDigits = (s: string) => s.replace(/-/g, "");

const fmtKm = (n: number) =>
  "=" + n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const lastDayOfMonth = (month: string, year: string): string => {
  const d = new Date(parseInt(year), parseInt(month), 0).getDate();
  return String(d).padStart(2, "0");
};

// 10-char "poziv na broj": all zeros, last 1 or 2 digits = month number
const pozivBroj = (month: string): string => {
  const m = parseInt(month).toString();
  return "0".repeat(10 - m.length) + m;
};

// Place a single char centred in a box
function drawChar(
  page: ReturnType<PDFDocument["getPage"]>,
  box: Box,
  char: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontSize: number
) {
  if (!char) return;
  const tw = font.widthOfTextAtSize(char, fontSize);
  const x = (box.x1 + box.x2) / 2 - tw / 2;
  const y = (box.y1 + box.y2) / 2 - fontSize * 0.36;
  page.drawText(char, { x, y, size: fontSize, font });
}

// Place chars one-per-box
function drawChars(
  page: ReturnType<PDFDocument["getPage"]>,
  boxes: Box[],
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontSize: number
) {
  for (let i = 0; i < Math.min(boxes.length, text.length); i++) {
    drawChar(page, boxes[i], text[i], font, fontSize);
  }
}

// Place text left-aligned in a large rect, multiple lines
function drawLines(
  page: ReturnType<PDFDocument["getPage"]>,
  box: Box,
  lines: string[],
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontSize: number
) {
  const pad = 12;
  const lineH = fontSize * 1.35;
  lines.forEach((line, i) => {
    if (!line) return;
    page.drawText(line, {
      x: box.x1 + pad,
      y: box.y2 - pad - fontSize - i * lineH,
      size: fontSize,
      font,
    });
  });
}

/* ── Annotation coordinate data (from PDF inspection) ── */

// Big text areas
const A_UPLATIO:  Box = { x1: 143,  y1: 1394, x2: 1495, y2: 1551 };
const A_SVRHA:   Box = { x1: 145,  y1: 1074, x2: 1498, y2: 1231 };
const A_PRIMATELJ: Box = { x1: 145, y1: 742,  x2: 1498, y2: 899  };
const A_MJESTO:  Box = { x1: 588,  y1: 591,  x2: 1047, y2: 675  };
const A_KM:      Box = { x1: 2086, y1: 1097, x2: 2755, y2: 1184 };

// Date boxes for "Mjesto i datum uplate" — [d1,d2,m1,m2,y1,y2]
const A_DATUM: Box[] = [
  { x1: 1065, y1: 588, x2: 1114, y2: 672 },
  { x1: 1117, y1: 588, x2: 1167, y2: 672 },
  { x1: 1228, y1: 588, x2: 1277, y2: 672 },
  { x1: 1280, y1: 588, x2: 1330, y2: 672 },
  { x1: 1391, y1: 588, x2: 1440, y2: 672 },
  { x1: 1446, y1: 588, x2: 1495, y2: 672 },
];

// Račun pošiljatelja — 16 boxes
const A_RACUN_POSIL: Box[] = [
  { x1: 1975, y1: 1494, x2: 2039, y2: 1578 },
  { x1: 2045, y1: 1494, x2: 2109, y2: 1578 },
  { x1: 2118, y1: 1494, x2: 2182, y2: 1578 },
  { x1: 2188, y1: 1493, x2: 2252, y2: 1577 },
  { x1: 2261, y1: 1493, x2: 2325, y2: 1577 },
  { x1: 2336, y1: 1493, x2: 2400, y2: 1577 },
  { x1: 2406, y1: 1493, x2: 2470, y2: 1577 },
  { x1: 2482, y1: 1493, x2: 2546, y2: 1577 },
  { x1: 2551, y1: 1493, x2: 2615, y2: 1577 },
  { x1: 2627, y1: 1493, x2: 2691, y2: 1577 },
  { x1: 2700, y1: 1493, x2: 2764, y2: 1577 },
  { x1: 2773, y1: 1493, x2: 2837, y2: 1577 },
  { x1: 2845, y1: 1493, x2: 2909, y2: 1577 },
  { x1: 2918, y1: 1493, x2: 2982, y2: 1577 },
  { x1: 2991, y1: 1493, x2: 3055, y2: 1577 },
  { x1: 3063, y1: 1493, x2: 3127, y2: 1577 },
];

// Račun primatelja — 16 boxes
const A_RACUN_PRIM: Box[] = [
  { x1: 1975, y1: 1251, x2: 2039, y2: 1336 },
  { x1: 2045, y1: 1251, x2: 2109, y2: 1336 },
  { x1: 2118, y1: 1251, x2: 2182, y2: 1336 },
  { x1: 2188, y1: 1251, x2: 2252, y2: 1336 },
  { x1: 2261, y1: 1251, x2: 2325, y2: 1336 },
  { x1: 2336, y1: 1251, x2: 2400, y2: 1336 },
  { x1: 2409, y1: 1251, x2: 2473, y2: 1336 },
  { x1: 2482, y1: 1251, x2: 2546, y2: 1336 },
  { x1: 2551, y1: 1251, x2: 2615, y2: 1336 },
  { x1: 2627, y1: 1251, x2: 2691, y2: 1336 },
  { x1: 2700, y1: 1254, x2: 2764, y2: 1339 },
  { x1: 2773, y1: 1254, x2: 2837, y2: 1339 },
  { x1: 2848, y1: 1254, x2: 2912, y2: 1339 },
  { x1: 2921, y1: 1254, x2: 2985, y2: 1339 },
  { x1: 2991, y1: 1254, x2: 3055, y2: 1339 },
  { x1: 3063, y1: 1254, x2: 3127, y2: 1339 },
];

// JMBG — 13 boxes
const A_JMBG: Box[] = [
  { x1: 1908, y1: 870, x2: 1972, y2: 954 },
  { x1: 1978, y1: 870, x2: 2042, y2: 954 },
  { x1: 2051, y1: 870, x2: 2115, y2: 954 },
  { x1: 2121, y1: 870, x2: 2185, y2: 954 },
  { x1: 2196, y1: 870, x2: 2261, y2: 954 },
  { x1: 2266, y1: 870, x2: 2330, y2: 954 },
  { x1: 2342, y1: 870, x2: 2406, y2: 954 },
  { x1: 2415, y1: 870, x2: 2479, y2: 954 },
  { x1: 2487, y1: 870, x2: 2551, y2: 954 },
  { x1: 2563, y1: 870, x2: 2627, y2: 954 },
  { x1: 2636, y1: 870, x2: 2700, y2: 954 },
  { x1: 2706, y1: 870, x2: 2770, y2: 954 },
  { x1: 2781, y1: 870, x2: 2845, y2: 954 },
];

// Vrsta uplate — 1 box
const A_VRSTA_UPLATE: Box = { x1: 3026, y1: 870, x2: 3081, y2: 957 };

// Vrsta prihoda — 6 boxes
const A_VRSTA_PRIHODA: Box[] = [
  { x1: 1911, y1: 611, x2: 1978, y2: 698 },
  { x1: 1984, y1: 611, x2: 2051, y2: 698 },
  { x1: 2057, y1: 611, x2: 2124, y2: 698 },
  { x1: 2127, y1: 611, x2: 2194, y2: 698 },
  { x1: 2199, y1: 611, x2: 2266, y2: 698 },
  { x1: 2272, y1: 611, x2: 2339, y2: 698 },
];

// Porezni period Od — [d1,d2,m1,m2,y1,y2]
const A_OD: Box[] = [
  { x1: 2636, y1: 652, x2: 2685, y2: 739 },
  { x1: 2688, y1: 652, x2: 2738, y2: 739 },
  { x1: 2799, y1: 652, x2: 2848, y2: 739 },
  { x1: 2854, y1: 652, x2: 2903, y2: 739 },
  { x1: 2962, y1: 652, x2: 3011, y2: 739 },
  { x1: 3017, y1: 652, x2: 3066, y2: 739 },
];

// Porezni period Do — [d1,d2,m1,m2,y1,y2]
const A_DO: Box[] = [
  { x1: 2636, y1: 521, x2: 2685, y2: 608 },
  { x1: 2691, y1: 521, x2: 2741, y2: 608 },
  { x1: 2799, y1: 521, x2: 2848, y2: 608 },
  { x1: 2854, y1: 521, x2: 2903, y2: 608 },
  { x1: 2962, y1: 521, x2: 3011, y2: 608 },
  { x1: 3017, y1: 521, x2: 3066, y2: 608 },
];

// Općina — 3 boxes
const A_OPCINA: Box[] = [
  { x1: 1917, y1: 358, x2: 1981, y2: 445 },
  { x1: 1990, y1: 361, x2: 2054, y2: 448 },
  { x1: 2063, y1: 361, x2: 2127, y2: 448 },
];

// Poziv na broj — 10 boxes
const A_POZIV: Box[] = [
  { x1: 1917, y1: 233, x2: 1981, y2: 317 },
  { x1: 1987, y1: 233, x2: 2051, y2: 317 },
  { x1: 2060, y1: 233, x2: 2124, y2: 317 },
  { x1: 2132, y1: 233, x2: 2196, y2: 317 },
  { x1: 2205, y1: 233, x2: 2269, y2: 317 },
  { x1: 2278, y1: 233, x2: 2342, y2: 317 },
  { x1: 2351, y1: 233, x2: 2415, y2: 317 },
  { x1: 2423, y1: 233, x2: 2487, y2: 317 },
  { x1: 2493, y1: 233, x2: 2557, y2: 317 },
  { x1: 2569, y1: 233, x2: 2633, y2: 317 },
];

// Proračunska/budžetska organizacija — 7 boxes
const A_PRORAC: Box[] = [
  { x1: 2586, y1: 364, x2: 2650, y2: 454 },
  { x1: 2659, y1: 364, x2: 2723, y2: 454 },
  { x1: 2732, y1: 364, x2: 2796, y2: 454 },
  { x1: 2802, y1: 364, x2: 2866, y2: 454 },
  { x1: 2874, y1: 364, x2: 2938, y2: 454 },
  { x1: 2950, y1: 364, x2: 3014, y2: 454 },
  { x1: 3020, y1: 364, x2: 3084, y2: 454 },
];

/* ── Fill a single uplatnica page ── */

function fillPage(
  page: ReturnType<PDFDocument["getPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  opts: {
    uplatio: string[];
    svrha: string;
    primatelj: string[];
    racunPosilDigits?: string;
    racunPrimDigits: string;
    kmIznos: number;
    vrstaProhoda: string;
    // shared
    jmbg: string;
    opcinaKod: string;
    opcinaIme: string;
    datum: string; // ISO
    periodMjesec: string;
    periodGodina: string;
  }
) {
  const FS_TEXT = 48;  // large text areas
  const FS_BOX  = 50;  // single-char boxes
  const FS_KM   = 48;  // KM amount

  const { datum, periodMjesec, periodGodina } = opts;

  // Parse ISO datum
  const [dy, dm, dd] = datum.split("-");
  const datumChars = [dd[0], dd[1], dm[0], dm[1], dy[2], dy[3]];

  // Period chars
  const mPad = periodMjesec.padStart(2, "0");
  const yShort = periodGodina.slice(-2);
  const lastDay = lastDayOfMonth(periodMjesec, periodGodina);
  const odChars  = ["0", "1", mPad[0], mPad[1], yShort[0], yShort[1]];
  const doChars  = [lastDay[0], lastDay[1], mPad[0], mPad[1], yShort[0], yShort[1]];

  // Poziv na broj
  const poziv = pozivBroj(periodMjesec);

  // Left side — text areas
  drawLines(page, A_UPLATIO, opts.uplatio, font, FS_TEXT);
  drawLines(page, A_SVRHA, [opts.svrha], font, FS_TEXT);
  drawLines(page, A_PRIMATELJ, opts.primatelj, font, FS_TEXT);

  // Mjesto
  page.drawText(opts.opcinaIme, {
    x: A_MJESTO.x1 + 10,
    y: (A_MJESTO.y1 + A_MJESTO.y2) / 2 - FS_TEXT * 0.36,
    size: FS_TEXT,
    font,
  });

  // Datum uplate boxes
  drawChars(page, A_DATUM, datumChars.join(""), font, FS_BOX);

  // Račun pošiljatelja (optional)
  if (opts.racunPosilDigits) {
    drawChars(page, A_RACUN_POSIL, opts.racunPosilDigits, font, FS_BOX);
  }

  // Račun primatelja
  drawChars(page, A_RACUN_PRIM, opts.racunPrimDigits, font, FS_BOX);

  // KM iznos
  const kmText = fmtKm(opts.kmIznos);
  page.drawText(kmText, {
    x: A_KM.x1 + 15,
    y: (A_KM.y1 + A_KM.y2) / 2 - FS_KM * 0.36,
    size: FS_KM,
    font,
  });

  // JMBG
  drawChars(page, A_JMBG, opts.jmbg, font, FS_BOX);

  // Vrsta uplate — always "0"
  drawChar(page, A_VRSTA_UPLATE, "0", font, FS_BOX);

  // Vrsta prihoda
  drawChars(page, A_VRSTA_PRIHODA, opts.vrstaProhoda, font, FS_BOX);

  // Porezni period
  drawChars(page, A_OD, odChars.join(""), font, FS_BOX);
  drawChars(page, A_DO, doChars.join(""), font, FS_BOX);

  // Općina
  drawChars(page, A_OPCINA, opts.opcinaKod, font, FS_BOX);

  // Proračunska/budžetska organizacija — all zeros
  drawChars(page, A_PRORAC, "0000000", font, FS_BOX);

  // Poziv na broj
  drawChars(page, A_POZIV, poziv, font, FS_BOX);
}

/* ── Main export ── */

export async function fillUplatnice(data: UplatnicaData): Promise<Uint8Array> {
  const kanton = KANTONI[data.kantonKey];

  const [templateBytes, fontBytes] = await Promise.all([
    fetch("/templates/UPLATNICA PRAZNA.pdf").then((r) => r.arrayBuffer()),
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
  ]);

  const out = await PDFDocument.create();
  out.registerFontkit(fontkit);
  const font = await out.embedFont(fontBytes);

  const posilDigits = data.ziroRacun ? accDigits(data.ziroRacun) : undefined;

  const shared = {
    jmbg: data.jmbg,
    opcinaKod: data.opcinaKod,
    opcinaIme: data.opcinaIme,
    datum: data.datum,
    periodMjesec: data.periodMjesec,
    periodGodina: data.periodGodina,
    racunPosilDigits: posilDigits,
  };

  // ── Uplatnica 1 — kantonalni ZO ──────────────────────────────────────────
  {
    const tpl = await PDFDocument.load(templateBytes);
    const [p] = await out.copyPages(tpl, [0]);
    out.addPage(p);
    fillPage(out.getPage(0), font, {
      ...shared,
      uplatio: [data.imeIPrezime, data.adresa],
      svrha: "Doprinos za zdravstvo od uplate iz inostranstva",
      primatelj: [
        "Zavod zdravstvenog osiguranja i reosiguranja",
        kanton.genitiv,
      ],
      racunPrimDigits: accDigits(kanton.zoRacun),
      kmIznos: data.zdravstvenoKanton,
      vrstaProhoda: "712116",
    });
  }

  // ── Uplatnica 2 — federalni ZZO ──────────────────────────────────────────
  {
    const tpl = await PDFDocument.load(templateBytes);
    const [p] = await out.copyPages(tpl, [0]);
    out.addPage(p);
    fillPage(out.getPage(1), font, {
      ...shared,
      uplatio: [data.imeIPrezime, data.adresa],
      svrha: "Doprinos za zdravstvo od uplate iz inostranstva",
      primatelj: ["Zavod zdravstvenog osiguranja i reosiguranja FBiH"],
      racunPrimDigits: accDigits(FBIH_ZO_RACUN),
      kmIznos: data.zdravstvenoFbih,
      vrstaProhoda: "712116",
    });
  }

  // ── Uplatnica 3 — kantonalni budžet (porez) ───────────────────────────────
  {
    const tpl = await PDFDocument.load(templateBytes);
    const [p] = await out.copyPages(tpl, [0]);
    out.addPage(p);
    fillPage(out.getPage(2), font, {
      ...shared,
      uplatio: [data.imeIPrezime, data.adresa],
      svrha: "Porez na dohodak od uplate iz inostranstva",
      primatelj: ["Budžet " + kanton.genitiv],
      racunPrimDigits: accDigits(kanton.budzet),
      kmIznos: data.porez,
      vrstaProhoda: "716116",
    });
  }

  return out.save();
}
