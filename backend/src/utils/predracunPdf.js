// ──────────────────────────────────────────────────────────────────────────────
//  Generator predračuna — pixel-perfect kopija uzorka iz BIRO JAPIĆ Cazin.
//  Layout:
//    • logo lijevo, firma blok desno-od-loga (bold ime + 5 redova info)
//    • horizontalna linija
//    • lijevo: KUPAC blok (kod, naziv, adresa, grad, telefon, ID, PDV) + barkod
//    • desno:  Datumi (Datum računa, DPO, Mjesto, Org. jedinica, Plaćanje, Fisk.)
//    • desno ispod datuma: "Predračun br. ..."
//    • tabela artikala sa dva reda header-a + redom brojeva kolona
//    • totali blok desno + SLOVIMA / napomena lijevo
//    • Vlasnik: + signature line desno
//    • footer (zakonska napomena 4 reda) + bottom row: FAK0209-AV / Com_Soft /
//      Datum ispisa / Amar Pjanić / 1/1
// ──────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

// ── PATHS ─────────────────────────────────────────────────────────────────────
const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");
const FONT_REG = path.join(FONTS_DIR, "arial.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "arialbd.ttf");
// Logo se traži u nizu — prvi koji postoji i validan je se koristi.
const LOGO_CANDIDATES = [path.join(__dirname, "..", "assets", "logo.jpg")];

// ── CIJENE ───────────────────────────────────────────────────────────────────
// Pricing model: NETO iznosi (cijena bez PDV-a) — osnovica na koju se PDV dodaje.
// PDV i bruto (za naplatu) se računaju odozgo po stopi VAT_RATE.
// Brojevi dolaze iz config/pricing.js (jedan izvor istine); ovdje dodajemo labele.
const { PLAN_PRICES: PRICE_NUMBERS } = require("../config/pricing");
const PLAN_PRICES = {
  PRO: {
    yearly: { net: PRICE_NUMBERS.PRO.yearly, label: "Godišnja pretplata PRO na poreznikalkulator.ba" },
    monthly: { net: PRICE_NUMBERS.PRO.monthly, label: "Mjesečna pretplata PRO na poreznikalkulator.ba" },
  },
  BUSINESS: {
    yearly: { net: PRICE_NUMBERS.BUSINESS.yearly, label: "Godišnja pretplata BUSINESS na poreznikalkulator.ba" },
    monthly: { net: PRICE_NUMBERS.BUSINESS.monthly, label: "Mjesečna pretplata BUSINESS na poreznikalkulator.ba" },
  },
};
const VAT_RATE = 0.17;

// Normalizuj ciklus na "yearly" | "monthly" (default yearly za back-compat).
function normalizeCycle(cycle) {
  return cycle === "monthly" ? "monthly" : "yearly";
}

// ── SLOVIMA (bosanski / hrvatski) ────────────────────────────────────────────
const ONES = [
  "",
  "Jedan",
  "Dva",
  "Tri",
  "Četiri",
  "Pet",
  "Šest",
  "Sedam",
  "Osam",
  "Devet",
  "Deset",
  "Jedanaest",
  "Dvanaest",
  "Trinaest",
  "Četrnaest",
  "Petnaest",
  "Šesnaest",
  "Sedamnaest",
  "Osamnaest",
  "Devetnaest",
];
// Stilski: sample koristi camelCase ("OsamDesetPet"), pa cijepamo "deset" sufiks.
const TENS = [
  "",
  "",
  "Dvadeset",
  "Trideset",
  "ČetrDeset",
  "PetDeset",
  "ŠezDeset",
  "SedamDeset",
  "OsamDeset",
  "DeveDeset",
];
function hundredsToWords(n) {
  if (n === 0) return "";
  let out = "";
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h === 1) out += "Sto";
  else if (h > 1) out += ONES[h] + "Stotina";
  if (r < 20) out += ONES[r];
  else {
    const t = Math.floor(r / 10);
    const u = r % 10;
    out += TENS[t] + ONES[u];
  }
  return out;
}
function intToWords(n) {
  if (n === 0) return "Nula";
  let out = "";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions > 0) {
    out += hundredsToWords(millions);
    out += millions === 1 ? "Milion" : "Miliona";
  }
  if (thousands > 0) {
    if (thousands === 1) out += "Hiljadu";
    else out += hundredsToWords(thousands) + "Hiljada";
  }
  if (rest > 0) out += hundredsToWords(rest);
  return out;
}
function amountInWords(value) {
  const km = Math.floor(value);
  const fen = Math.round((value - km) * 100);
  let s = intToWords(km) + " KM";
  if (fen > 0) s += " i " + intToWords(fen) + " feninga";
  return s;
}

// ── FORMAT ───────────────────────────────────────────────────────────────────
function formatNumber(n, decimals = 2) {
  return Number(n).toFixed(decimals).replace(".", ",");
}
function formatNumber4(n) {
  return Number(n).toFixed(4).replace(".", ",");
}
function formatDate(d) {
  // DATEONLY iz baze stiže kao string ("2026-06-16"), pri kreiranju kao Date.
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const day = String(dt.getDate()).padStart(2, "0");
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const yr = dt.getFullYear();
  return `${day}.${mo}.${yr}.`;
}
function formatBroj(seq, year) {
  const padded = String(seq).padStart(6, "0");
  return `001-09-${padded}/${year}`;
}
// Kalkulacija iz neto osnovice (cijena bez PDV-a):
//   PDV   = round(net * VAT_RATE, 2)
//   bruto = net + PDV   (za naplatu)
function calcAmounts(plan, cycle) {
  const planCfg = PLAN_PRICES[plan];
  if (!planCfg) throw new Error(`Unknown plan: ${plan}`);
  const cfg = planCfg[normalizeCycle(cycle)];
  if (!cfg) throw new Error(`Unknown billing cycle: ${cycle}`);
  const net = +Number(cfg.net).toFixed(2);
  const vat = +(net * VAT_RATE).toFixed(2);
  const gross = +(net + vat).toFixed(2);
  return { net, vat, gross, label: cfg.label };
}

// ── BARKOD (Code 39) ─────────────────────────────────────────────────────────
// Code 39 — svaki znak = 9 elemenata (5 bara + 4 spaces, alternating bar-space)
// 'n' = uska, 'w' = široka. Start/stop = '*'.
const C39 = {
  0: "nnnwwnwnn",
  1: "wnnwnnnnw",
  2: "nnwwnnnnw",
  3: "wnwwnnnnn",
  4: "nnnwwnnnw",
  5: "wnnwwnnnn",
  6: "nnwwwnnnn",
  7: "nnnwnnwnw",
  8: "wnnwnnwnn",
  9: "nnwwnnwnn",
  A: "wnnnwnnnw",
  B: "nnwnwnnnw",
  C: "wnwnwnnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  $: "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};
function drawCode39(page, text, x, y, opts = {}) {
  const NARROW = opts.narrow ?? 1.1; // px (PDF pt)
  const WIDE = opts.wide ?? NARROW * 2.5;
  const HEIGHT = opts.height ?? 30;
  const color = rgb(0, 0, 0);
  const seq = `*${text}*`;
  let cursor = x;
  for (let ci = 0; ci < seq.length; ci++) {
    const ch = seq[ci];
    const pat = C39[ch];
    if (!pat) continue;
    for (let i = 0; i < 9; i++) {
      const w = pat[i] === "w" ? WIDE : NARROW;
      const isBar = i % 2 === 0;
      if (isBar) {
        page.drawRectangle({
          x: cursor,
          y,
          width: w,
          height: HEIGHT,
          color,
        });
      }
      cursor += w;
    }
    // inter-character gap = 1 narrow
    if (ci < seq.length - 1) cursor += NARROW;
  }
  return cursor - x; // ukupna širina
}
function code39Width(text, narrow = 1.1, wide = null) {
  const W = wide ?? narrow * 2.5;
  const seq = `*${text}*`;
  // svaki znak: 6 narrow + 3 wide bara/space = 6n + 3w; +1 narrow gap između
  let total = 0;
  for (let i = 0; i < seq.length; i++) {
    total += 6 * narrow + 3 * W;
    if (i < seq.length - 1) total += narrow;
  }
  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
//  GLAVNA FUNKCIJA
// ─────────────────────────────────────────────────────────────────────────────
async function generatePredracunPdf({
  plan,
  billingCycle,
  periodStart,
  periodEnd,
  fullNumber,
  issueDate,
  dueDate,
  buyer,
  printedBy = "Amar Pjanić",
}) {
  const { net, vat, gross, label } = calcAmounts(plan, billingCycle);
  // Period pretplate (DD.MM.YYYY - DD.MM.YYYY) — prikazuje se ispod stavke.
  const fmtD = (d) => {
    if (!d) return "";
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()}.`;
  };
  const periodLabel =
    periodStart && periodEnd
      ? `Period pretplate: ${fmtD(periodStart)} - ${fmtD(periodEnd)}`
      : "";

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const fontReg = await pdf.embedFont(fs.readFileSync(FONT_REG), {
    subset: true,
  });
  const fontBold = await pdf.embedFont(fs.readFileSync(FONT_BOLD), {
    subset: true,
  });

  // ── LOGO (auto-detekcija JPEG/PNG, traži u više putanja) ──────────────────
  let logo = null;
  let logoW = 0;
  let logoH = 0;
  let logoUsedPath = null;
  for (const p of LOGO_CANDIDATES) {
    if (!fs.existsSync(p)) continue;
    try {
      const bytes = fs.readFileSync(p);
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
      const isPng =
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47;
      if (isJpeg) logo = await pdf.embedJpg(bytes);
      else if (isPng) logo = await pdf.embedPng(bytes);
      else {
        console.warn(
          `predracunPdf: ${p} nije validan JPEG/PNG (prvi bajtovi: ${bytes
            .slice(0, 4)
            .toString("hex")}), preskačem.`,
        );
        continue;
      }
      if (logo) {
        logoUsedPath = p;
        const target = 115; // cilj: visina ~115pt (kao u uzorku)
        const scale = target / logo.height;
        logoW = logo.width * scale;
        logoH = logo.height * scale;
        break;
      }
    } catch (e) {
      console.warn(`predracunPdf: ne mogu učitati ${p}:`, e?.message || e);
    }
  }
  if (!logo) {
    console.warn(
      `predracunPdf: logo nije pronađen, provjerio: ${LOGO_CANDIDATES.join(
        ", ",
      )}`,
    );
  } else {
    console.log(`predracunPdf: koristim logo iz ${logoUsedPath}`);
  }

  // ── PAGE ───────────────────────────────────────────────────────────────────
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const ink = rgb(0.05, 0.05, 0.05);
  const grey = rgb(0.55, 0.55, 0.55);

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const drawText = (txt, x, y, opts = {}) => {
    page.drawText(String(txt ?? ""), {
      x,
      y,
      size: opts.size ?? 9,
      font: opts.bold ? fontBold : fontReg,
      color: opts.color ?? ink,
    });
  };
  const drawCenter = (txt, xCenter, y, opts = {}) => {
    const s = String(txt ?? "");
    const f = opts.bold ? fontBold : fontReg;
    const w = f.widthOfTextAtSize(s, opts.size ?? 9);
    drawText(s, xCenter - w / 2, y, opts);
  };
  const drawRight = (txt, xRight, y, opts = {}) => {
    const s = String(txt ?? "");
    const f = opts.bold ? fontBold : fontReg;
    const w = f.widthOfTextAtSize(s, opts.size ?? 9);
    drawText(s, xRight - w, y, opts);
  };
  const hLine = (x1, x2, y, thickness = 0.5, color = ink) => {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
  };
  // Isprekidana (dashed) linija
  const dashLine = (x1, x2, y, dash = 1.5, gap = 1.5, thickness = 0.4) => {
    let cur = x1;
    while (cur < x2) {
      const end = Math.min(cur + dash, x2);
      page.drawLine({
        start: { x: cur, y },
        end: { x: end, y },
        thickness,
        color: ink,
      });
      cur = end + gap;
    }
  };

  const MARGIN_L = 36;
  const MARGIN_R = PAGE_W - 36;

  // ── HEADER ─────────────────────────────────────────────────────────────────
  // Logo lijevo, firma blok desno-od-loga.
  const HEADER_TOP = PAGE_H - 30;
  const LOGO_X = MARGIN_L + 6;
  const LOGO_Y = HEADER_TOP - logoH - 6;
  if (logo) {
    page.drawImage(logo, { x: LOGO_X, y: LOGO_Y, width: logoW, height: logoH });
  }

  // Centar firma-bloka = sredina prostora desno od loga, do desne ivice.
  const firmaCx = (LOGO_X + logoW + MARGIN_R) / 2;

  let yH = HEADER_TOP - 18;
  drawCenter('OBRT "BIRO JAPIĆ" Cazin', firmaCx, yH, {
    size: 18,
    bold: true,
  });
  yH -= 18;
  drawCenter("Računovodstvena i knjigovodstvena djelatnost", firmaCx, yH, {
    size: 10,
  });
  yH -= 12;
  drawCenter("vl. Almir Japić CR-7509/5", firmaCx, yH, { size: 10 });
  yH -= 12;
  drawCenter("Bošnjačkih šehida bb, Cazin   TEL:062/697-761", firmaCx, yH, {
    size: 10,
  });
  yH -= 12;
  drawCenter("ID BROJ:4364314150003   PDV:364314150003", firmaCx, yH, {
    size: 10,
    bold: true,
  });
  yH -= 12;
  drawCenter("TR:198-201-20200826-04 KIB BANKA", firmaCx, yH, { size: 10 });
  yH -= 12;
  drawCenter("e-mail:birojapic@gmail.com", firmaCx, yH, { size: 10 });

  // Linija ispod header-a
  let yDivider = Math.min(LOGO_Y, yH - 8);
  hLine(MARGIN_L, MARGIN_R, yDivider, 0.6);

  // ── KUPAC blok (lijevo) ────────────────────────────────────────────────────
  let yL = yDivider - 14;
  drawText(`KUPAC: ${buyer.code || ""}`, MARGIN_L, yL, { size: 9 });
  yL -= 14;
  drawText(buyer.name || "", MARGIN_L, yL, { size: 11, bold: true });
  yL -= 14;
  if (buyer.address) {
    drawText(buyer.address, MARGIN_L, yL, { size: 11, bold: true });
    yL -= 14;
  }
  const cityLine = [buyer.postalCode, buyer.city].filter(Boolean).join("  ");
  if (cityLine) {
    drawText(cityLine, MARGIN_L, yL, { size: 11, bold: true });
    yL -= 14;
  }
  drawText(`Telefon: ${buyer.phone || ""}`, MARGIN_L, yL, { size: 9 });
  yL -= 12;
  drawText("ID broj kupca:", MARGIN_L, yL, { size: 9 });
  drawText(buyer.idNumber || "", MARGIN_L + 90, yL, { size: 9, bold: true });
  yL -= 12;
  drawText("PDV broj kupca:", MARGIN_L, yL, { size: 9 });
  drawText(buyer.vatNumber || "", MARGIN_L + 90, yL, { size: 9, bold: true });

  // ── BARKOD (Code 39) — kod = "001" + buyer.code (npr. "00109000001") ──────
  const barcodeText = `00109${(buyer.code || "000000").padStart(6, "0")}`;
  yL -= 18;
  const bcWidth = code39Width(barcodeText);
  drawCode39(page, barcodeText, MARGIN_L, yL - 28, { height: 28 });
  drawText(barcodeText, MARGIN_L + Math.max(0, (bcWidth - 60) / 2), yL - 36, {
    size: 7,
  });

  // ── Datumi blok (desno, paralelno sa KUPAC) ────────────────────────────────
  let yR = yDivider - 14;
  const RIGHT_LABEL_X = 320;
  const RIGHT_VAL_X = 460;
  const drawRow = (lbl, val) => {
    drawText(lbl, RIGHT_LABEL_X, yR, { size: 9 });
    drawText(val, RIGHT_VAL_X, yR, { size: 9, bold: true });
    yR -= 14;
  };
  drawRow("Datum računa:", formatDate(issueDate));
  drawRow("Datum DPO:", formatDate(dueDate));
  drawRow("Mjesto izdavanja računa:", "CAZIN");
  drawRow("Organizaciona jedinica:", 'OBRT "BIRO JAPIĆ"');
  drawRow("Način plaćanja:", "Žiralno plaćanje");
  drawRow("Broj fiskalnog računa:", "");

  // "Predračun br." — desno, ispod datuma, blizu barkoda
  drawText(`Predračun br.  ${fullNumber}`, RIGHT_LABEL_X, yL - 32, {
    size: 13,
    bold: true,
  });

  // ── TABELA ─────────────────────────────────────────────────────────────────
  // Zajednički "y" — počinjemo niže od oba bloka (kupac sa barkodom i datumi)
  let y = Math.min(yL - 50, yR - 20);

  // Kolone (desne ivice za numeričke) — Rabat2 je izbačen radi šireg PDV-a
  const COLS = {
    rb: MARGIN_L + 4,
    sifra: MARGIN_L + 24,
    naziv: MARGIN_L + 70,
    jm: MARGIN_L + 222,
    kol: MARGIN_L + 282,
    cijena: MARGIN_L + 342,
    netoSaPdv: MARGIN_L + 402,
    rabat1: MARGIN_L + 434,
    pdv: MARGIN_L + 466,
    bruto: MARGIN_R - 4,
  };
  const cCijena = COLS.cijena - 28;
  const cNeto = COLS.netoSaPdv - 28;
  const cRab1 = COLS.rabat1 - 14;
  const cPdv = COLS.pdv - 16;
  const cBruto = COLS.bruto - 26;

  // Header row 1 (glavni naslovi)
  drawText("R/B", COLS.rb, y, { size: 8, bold: true });
  drawText("Šifra", COLS.sifra, y, { size: 8, bold: true });
  drawText("NAZIV ROBE - USLUGE", COLS.naziv, y, { size: 8, bold: true });
  drawText("J/M", COLS.jm, y, { size: 8, bold: true });
  drawCenter("Količina", COLS.kol - 22, y, { size: 8, bold: true });
  drawCenter("Cijena", cCijena, y, { size: 8, bold: true });
  drawCenter("Neto cijena", cNeto, y, { size: 8, bold: true });
  drawCenter("Rabat", cRab1, y, { size: 8, bold: true });
  drawCenter("PDV(%)", cPdv, y, { size: 8, bold: true });
  drawCenter("Bruto iznos", cBruto, y, { size: 8, bold: true });

  // Header row 2 (sub-labels)
  y -= 9;
  drawCenter("(bez PDV-a)", cCijena, y, { size: 7 });
  drawCenter("(sa PDV-om)", cNeto, y, { size: 7 });
  drawCenter("(%)", cRab1, y, { size: 7 });
  drawCenter("(bez PDV-a)", cBruto, y, { size: 7 });

  // Brojevi kolona (1 2 3 4 5 6 7 (6-8+9) 8 9 10 (5 x 6))
  y -= 10;
  drawCenter("1", COLS.rb + 6, y, { size: 7 });
  drawCenter("2", COLS.sifra + 14, y, { size: 7 });
  drawCenter("3", (COLS.naziv + COLS.jm) / 2, y, { size: 7 });
  drawCenter("4", COLS.jm + 16, y, { size: 7 });
  drawCenter("5", COLS.kol - 22, y, { size: 7 });
  drawCenter("6", cCijena, y, { size: 7 });
  drawCenter("7 (6-8)", cNeto, y, { size: 7 });
  drawCenter("8", cRab1, y, { size: 7 });
  // PDV nema broj u uzorku
  drawCenter("10 (5 x 6)", cBruto, y, { size: 7 });

  // Isprekidani separator
  y -= 5;
  dashLine(MARGIN_L, MARGIN_R, y);

  // ── Data row ──────────────────────────────────────────────────────────────
  y -= 12;
  drawText("1.", COLS.rb, y, { size: 9 });
  drawText("000001", COLS.sifra, y, { size: 9 });

  // Naziv može biti dugačak — wrap u dva reda
  const maxNazivW = COLS.jm - COLS.naziv - 4;
  const words = label.split(" ");
  let l1 = "";
  let l2 = "";
  for (const w of words) {
    const try1 = l1 ? l1 + " " + w : w;
    if (fontReg.widthOfTextAtSize(try1, 9) <= maxNazivW) l1 = try1;
    else l2 = (l2 ? l2 + " " : "") + w;
  }
  drawText(l1, COLS.naziv, y, { size: 9 });
  if (l2) drawText(l2, COLS.naziv, y - 11, { size: 9 });
  // Period pretplate ispod naziva (manji, sivi tekst).
  if (periodLabel) {
    drawText(periodLabel, COLS.naziv, y - (l2 ? 22 : 11), {
      size: 7.5,
      color: grey,
    });
  }

  drawText("KOM", COLS.jm, y, { size: 9 });
  drawRight("1,000", COLS.kol, y, { size: 9 });
  drawRight(formatNumber4(net), COLS.cijena, y, { size: 9 });
  drawRight(formatNumber4(net + vat), COLS.netoSaPdv, y, { size: 9 });
  drawRight("0,00", COLS.rabat1, y, { size: 9 });
  drawRight(`${(VAT_RATE * 100).toFixed(2).replace(".", ",")}`, COLS.pdv, y, {
    size: 9,
  });
  drawRight(formatNumber(net), COLS.bruto, y, { size: 9 });

  // Visina reda: naziv (1 ili 2 linije) + opciona period linija.
  let rowDrop = l2 ? 22 : 12;
  if (periodLabel) rowDrop += 11;
  y -= rowDrop;
  dashLine(MARGIN_L, MARGIN_R, y);

  // ── TOTALI (desno) i SLOVIMA (lijevo) ─────────────────────────────────────
  const TOT_L = 320;
  const TOT_VAL_RIGHT = MARGIN_R - 24;
  const TOT_KM_X = MARGIN_R - 4;

  let yT = y - 14;
  const totRow = (lbl, val, bold = false) => {
    drawText(lbl, TOT_L + 4, yT, { size: 9, bold });
    drawRight(formatNumber(val), TOT_VAL_RIGHT, yT, { size: 9, bold });
    drawRight("KM", TOT_KM_X, yT, { size: 9, bold });
    hLine(TOT_L, MARGIN_R, yT - 4, 0.3, grey);
    yT -= 14;
  };
  totRow("BRUTO IZNOS BEZ PDV-a:", net);
  totRow("-Rabat", 0);
  totRow("NETO IZNOS BEZ PDV-a:", net);
  totRow("Neoporezivo:", 0);
  totRow("Oporezivo (osnovica):", net);
  totRow("+Iznos PDV-a:", vat);
  totRow("ZA NAPLATU:", gross, true);

  // Slovima blok lijevo
  let yS = y - 14;
  drawText(`SLOVIMA: (${amountInWords(gross)} )`, MARGIN_L, yS, { size: 9 });
  yS -= 26;
  drawText(
    "PDV obračunat u skladu sa Zakonom o porezu na dodanu",
    MARGIN_L,
    yS,
    { size: 9 },
  );
  yS -= 11;
  drawText("vrijednost (Sl.glasnik BiH, broj 9/05 i 35/05)", MARGIN_L, yS, {
    size: 9,
  });

  // ── FOOTER (zakonska napomena) ────────────────────────────────────────────
  hLine(MARGIN_L, MARGIN_R, 130, 0.6);
  drawText(
    "Ovaj predračun je punovažan bez potpisa i pečata i važi 30 dana od datuma izdavanja.",
    MARGIN_L,
    118,
    { size: 7.5 },
  );

  // Bottom dotted-ish line + footer row
  dashLine(MARGIN_L, MARGIN_R, 76);
  drawRight("1/1", MARGIN_R, 64, { size: 7.5 });

  return Buffer.from(await pdf.save());
}

module.exports = {
  generatePredracunPdf,
  calcAmounts,
  formatBroj,
  formatDate,
  formatNumber,
  amountInWords,
  PLAN_PRICES,
  VAT_RATE,
};
// fingerprint:v2
