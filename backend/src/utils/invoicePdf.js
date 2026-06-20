// ──────────────────────────────────────────────────────────────────────────────
//  Invoice / Proforma PDF generator (korisničke fakture i predračuni)
//  - layout sličan predračunu pretplata, ali bez barkoda
//  - numeracija "0001-2026"
//  - tabela: RB, Naziv, JM, Količina, Cijena (bez PDV), Rabat (%), PDV (%), Bruto (bez PDV)
//  - logo iz organizacije ako postoji, fallback na default
// ──────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { absPathFor } = require("./uploads");

const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");
const FONT_REG = path.join(FONTS_DIR, "arial.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "arialbd.ttf");
// Bez fallback loga — ako organizacija nije postavila svoj logo, fakturu ide bez loga.

// ── FORMAT ───────────────────────────────────────────────────────────────────
function withThousands(s) {
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [int, dec] = body.split(".");
  const intT = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + intT + (dec ? "," + dec : "");
}
function fmt2(n) {
  return withThousands(Number(n || 0).toFixed(2));
}
function fmt3(n) {
  return withThousands(Number(n || 0).toFixed(3));
}
function fmt4(n) {
  return withThousands(Number(n || 0).toFixed(4));
}
function fmtDate(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = dt.getFullYear();
  return `${dd}.${mm}.${yy}.`;
}

function formatInvoiceNumber(seq, year, type) {
  const prefix = type === "PROFORMA" ? "P-" : "F-";
  return `${prefix}${String(seq).padStart(4, "0")}-${year}`;
}

// Računanje stavke (vraća snapshot vrijednosti za snimanje + prikaz)
function computeItem({ quantity, unitPrice, discountPct, vatPct }, applyVat) {
  const q = Number(quantity || 0);
  const up = Number(unitPrice || 0);
  const dPct = Number(discountPct || 0);
  const vPct = applyVat ? Number(vatPct || 0) : 0;

  const gross = +(q * up).toFixed(2); // bruto bez rabata, bez pdv
  const discountLine = +((gross * dPct) / 100).toFixed(2);
  const netLine = +(gross - discountLine).toFixed(2); // osnovica nakon rabata
  const vatLine = +((netLine * vPct) / 100).toFixed(2);
  const grossLine = +(netLine + vatLine).toFixed(2);
  return {
    netLine,
    discountLine,
    vatLine,
    grossLine,
    // dodatno: "bruto bez pdv-a" što user želi prikazati u tabeli =
    // količina * cijena - rabat = netLine
  };
}

function computeTotals(items, applyVat) {
  let netTotal = 0;
  let discountTotal = 0;
  let vatTotal = 0;
  let grossTotal = 0;
  for (const it of items) {
    const c = computeItem(it, applyVat);
    netTotal += c.netLine;
    discountTotal += c.discountLine;
    vatTotal += c.vatLine;
    grossTotal += c.grossLine;
  }
  return {
    netTotal: +netTotal.toFixed(2),
    discountTotal: +discountTotal.toFixed(2),
    vatTotal: +vatTotal.toFixed(2),
    grossTotal: +grossTotal.toFixed(2),
  };
}

// Fiksni kurs (currency board) — 1 EUR = 1,95583 KM.
const BAM_PER_EUR = 1.95583;

// Vraća kopiju fakture sa svim iznosima preračunatim u ciljnu valutu. Konvertuje
// se samo unitPrice po stavci (količina/rabat/PDV% ostaju), pa se totali ponovo
// izračunaju iz konvertovanih stavki — tako su per-stavka i totali interno
// konzistentni, isto kao na originalu. Bez ikakve napomene; sve isto, druga valuta.
function convertInvoiceCurrency(invoice, targetCurrency) {
  const from = invoice.currency === "EUR" ? "EUR" : "BAM";
  const to = targetCurrency === "EUR" ? "EUR" : "BAM";
  if (from === to) return invoice;
  // BAM → EUR: dijeli sa kursom; EUR → BAM: množi sa kursom.
  const factor = from === "BAM" ? 1 / BAM_PER_EUR : BAM_PER_EUR;
  const items = (invoice.items || []).map((it) => ({
    ...it,
    unitPrice: +(Number(it.unitPrice || 0) * factor).toFixed(4),
  }));
  const totals = computeTotals(items, invoice.applyVat);
  return {
    ...invoice,
    currency: to,
    items,
    netTotal: totals.netTotal,
    discountTotal: totals.discountTotal,
    vatTotal: totals.vatTotal,
    grossTotal: totals.grossTotal,
  };
}

// ── SLOVIMA (jednostavna implementacija) ────────────────────────────────────
const ONES = ["", "Jedan", "Dva", "Tri", "Četiri", "Pet", "Šest", "Sedam", "Osam", "Devet",
  "Deset", "Jedanaest", "Dvanaest", "Trinaest", "Četrnaest", "Petnaest", "Šesnaest",
  "Sedamnaest", "Osamnaest", "Devetnaest"];
const TENS = ["", "", "Dvadeset", "Trideset", "Četrdeset", "Pedeset", "Šezdeset",
  "Sedamdeset", "Osamdeset", "Devedeset"];
function hundreds(n) {
  if (n === 0) return "";
  let out = "";
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h === 1) out += "Sto";
  else if (h > 1) out += ONES[h] + "sto";
  if (r < 20) out += ONES[r];
  else out += TENS[Math.floor(r / 10)] + ONES[r % 10];
  return out;
}
function intToWords(n) {
  if (n === 0) return "Nula";
  let out = "";
  const mil = Math.floor(n / 1_000_000);
  const tho = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (mil > 0) out += hundreds(mil) + (mil === 1 ? "Milion" : "Miliona");
  if (tho > 0) out += tho === 1 ? "Hiljadu" : hundreds(tho) + "Hiljada";
  if (rest > 0) out += hundreds(rest);
  return out;
}
function amountInWords(value, currency = "BAM") {
  const km = Math.floor(value);
  const fen = Math.round((value - km) * 100);
  const isEur = currency === "EUR";
  const main = isEur ? "EUR" : "KM";
  const sub = isEur ? "centi" : "feninga";
  let s = intToWords(km) + " " + main;
  if (fen > 0) s += " i " + intToWords(fen) + " " + sub;
  return s;
}

// ── LOGO ────────────────────────────────────────────────────────────────────
async function embedLogo(pdf, sellerLogoUrl) {
  if (!sellerLogoUrl) return null;
  const abs = absPathFor(sellerLogoUrl);
  if (!abs || !fs.existsSync(abs)) return null;
  try {
    const bytes = fs.readFileSync(abs);
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    let img = null;
    if (isJpeg) img = await pdf.embedJpg(bytes);
    else if (isPng) img = await pdf.embedPng(bytes);
    if (img) {
      const target = 80;
      const scale = target / img.height;
      return { img, w: img.width * scale, h: img.height * scale };
    }
  } catch (e) {
    console.warn("invoicePdf: ne mogu učitati logo", abs, e?.message || e);
  }
  return null;
}

// ── GLAVNA FUNKCIJA ─────────────────────────────────────────────────────────
async function generateInvoicePdf(invoice, opts = {}) {
  // Opcioni ispis u protuvaluti — ista faktura, svi iznosi preračunati.
  if (opts.displayCurrency) {
    invoice = convertInvoiceCurrency(invoice, opts.displayCurrency);
  }
  const isProforma = invoice.type === "PROFORMA";
  const docTitle = isProforma ? "Predračun" : "Faktura";

  const items = (invoice.items || []).slice().sort((a, b) => a.ordinal - b.ordinal);
  const totals = {
    netTotal: Number(invoice.netTotal || 0),
    discountTotal: Number(invoice.discountTotal || 0),
    vatTotal: Number(invoice.vatTotal || 0),
    grossTotal: Number(invoice.grossTotal || 0),
  };

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontReg = await pdf.embedFont(fs.readFileSync(FONT_REG), { subset: true });
  const fontBold = await pdf.embedFont(fs.readFileSync(FONT_BOLD), { subset: true });

  const logo = await embedLogo(pdf, invoice.sellerLogoUrl);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const ink = rgb(0.05, 0.05, 0.05);
  const grey = rgb(0.55, 0.55, 0.55);

  const drawText = (txt, x, y, opts = {}) => {
    page.drawText(String(txt ?? ""), {
      x, y,
      size: opts.size ?? 9,
      font: opts.bold ? fontBold : fontReg,
      color: opts.color ?? ink,
    });
  };
  const drawCenter = (txt, xC, y, opts = {}) => {
    const s = String(txt ?? "");
    const f = opts.bold ? fontBold : fontReg;
    const w = f.widthOfTextAtSize(s, opts.size ?? 9);
    drawText(s, xC - w / 2, y, opts);
  };
  const drawRight = (txt, xR, y, opts = {}) => {
    const s = String(txt ?? "");
    const f = opts.bold ? fontBold : fontReg;
    const w = f.widthOfTextAtSize(s, opts.size ?? 9);
    drawText(s, xR - w, y, opts);
  };
  const hLine = (x1, x2, y, t = 0.5, c = ink) => {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: t, color: c });
  };
  const dashLine = (x1, x2, y, dash = 1.5, gap = 1.5, t = 0.4) => {
    let cur = x1;
    while (cur < x2) {
      const end = Math.min(cur + dash, x2);
      page.drawLine({ start: { x: cur, y }, end: { x: end, y }, thickness: t, color: ink });
      cur = end + gap;
    }
  };

  const ML = 36;
  const MR = PAGE_W - 36;

  // ── HEADER ─────────────────────────────────────────────────────────────
  const HEADER_TOP = PAGE_H - 30;
  const LOGO_X = ML + 6;
  const logoH = logo?.h || 0;
  const logoW = logo?.w || 0;
  const LOGO_Y = HEADER_TOP - logoH - 6;
  if (logo) page.drawImage(logo.img, { x: LOGO_X, y: LOGO_Y, width: logoW, height: logoH });

  // Kad nema loga, header tekst se centrira preko cijele širine.
  const firmaCx = logo ? (LOGO_X + logoW + MR) / 2 : (ML + MR) / 2;
  let yH = HEADER_TOP - 18;
  drawCenter(invoice.sellerName || "", firmaCx, yH, { size: 16, bold: true });
  yH -= 16;

  const addrLine = [invoice.sellerAddress, invoice.sellerCity].filter(Boolean).join(", ");
  if (addrLine) { drawCenter(addrLine, firmaCx, yH, { size: 10 }); yH -= 12; }
  if (invoice.sellerPhone) { drawCenter(`Tel: ${invoice.sellerPhone}`, firmaCx, yH, { size: 10 }); yH -= 12; }
  const idLine = [
    invoice.sellerTaxNumber ? `ID: ${invoice.sellerTaxNumber}` : null,
    invoice.sellerVatNumber ? `PDV: ${invoice.sellerVatNumber}` : null,
  ].filter(Boolean).join("    ");
  if (idLine) { drawCenter(idLine, firmaCx, yH, { size: 10, bold: true }); yH -= 12; }
  if (invoice.sellerBankAccount) { drawCenter(`TR: ${invoice.sellerBankAccount}`, firmaCx, yH, { size: 10 }); yH -= 12; }
  if (invoice.sellerEmail) { drawCenter(`e-mail: ${invoice.sellerEmail}`, firmaCx, yH, { size: 10 }); yH -= 12; }

  const yDivider = Math.min(LOGO_Y, yH - 6);
  hLine(ML, MR, yDivider, 0.6);

  // ── KUPAC blok (lijevo) ────────────────────────────────────────────────
  let yL = yDivider - 14;
  drawText("KUPAC:", ML, yL, { size: 9 });
  yL -= 14;
  drawText(invoice.buyerName || "", ML, yL, { size: 11, bold: true });
  yL -= 14;
  if (invoice.buyerAddress) { drawText(invoice.buyerAddress, ML, yL, { size: 10 }); yL -= 12; }
  const cityLine = [invoice.buyerPostalCode, invoice.buyerCity].filter(Boolean).join("  ");
  if (cityLine) { drawText(cityLine, ML, yL, { size: 10 }); yL -= 12; }
  if (invoice.buyerPhone) { drawText(`Telefon: ${invoice.buyerPhone}`, ML, yL, { size: 9 }); yL -= 12; }
  if (invoice.buyerIdNumber) {
    drawText("ID broj kupca:", ML, yL, { size: 9 });
    drawText(invoice.buyerIdNumber, ML + 92, yL, { size: 9, bold: true });
    yL -= 12;
  }
  if (invoice.buyerVatNumber) {
    drawText("PDV broj kupca:", ML, yL, { size: 9 });
    drawText(invoice.buyerVatNumber, ML + 92, yL, { size: 9, bold: true });
    yL -= 12;
  }

  // ── Datumi i broj (desno) ─────────────────────────────────────────────
  let yR = yDivider - 16;
  const RIGHT_LBL_X = 320;
  const RIGHT_VAL_X = 460;

  // Naslov dokumenta — prvi (na vrhu desnog bloka)
  drawText(`${docTitle} br.  ${invoice.fullNumber}`, RIGHT_LBL_X, yR, { size: 14, bold: true });
  yR -= 22;

  const drawRow = (lbl, val) => {
    drawText(lbl, RIGHT_LBL_X, yR, { size: 9 });
    drawText(val, RIGHT_VAL_X, yR, { size: 9, bold: true });
    yR -= 14;
  };
  drawRow("Datum izdavanja:", fmtDate(invoice.issueDate));
  if (invoice.dueDate) drawRow("Datum dospijeća:", fmtDate(invoice.dueDate));
  drawRow("Način plaćanja:", "Žiralno");

  // ── TABELA ─────────────────────────────────────────────────────────────
  let y = Math.min(yL, yR) - 24;
  hLine(ML, MR, y + 10, 0.4, grey);

  // 8 kolona: RB | Naziv | JM | Količina | Cijena | Rabat % | PDV % | Bruto bez PDV
  // Količina je right-aligned na COL_KOL — kad je iznos 100+ (npr. "1.000,000"),
  // tekst se proteže lijevo i ranije je clippao u J/M. Gap JM→KOL je sada 70px
  // (bilo 45), što prihvata i 6-cifrene količine.
  const COL_RB = ML + 4;
  const COL_NAZIV = ML + 24;
  const COL_JM = ML + 250;
  const COL_KOL = ML + 320;     // right-aligned (gap od JM = 70px)
  const COL_CIJ = ML + 380;     // right-aligned (gap 60)
  const COL_RAB = ML + 425;     // right-aligned (%)
  const COL_PDV = ML + 470;     // right-aligned (%)
  const COL_BRUTO = MR - 4;     // right-aligned (gap od PDV = 85)

  drawText("R/B", COL_RB, y, { size: 8, bold: true });
  drawText("NAZIV ROBE - USLUGE", COL_NAZIV, y, { size: 8, bold: true });
  drawText("J/M", COL_JM, y, { size: 8, bold: true });
  drawRight("Količina", COL_KOL, y, { size: 8, bold: true });
  drawRight("Cijena", COL_CIJ, y, { size: 8, bold: true });
  drawRight("Rabat", COL_RAB, y, { size: 8, bold: true });
  drawRight("PDV", COL_PDV, y, { size: 8, bold: true });
  drawRight("Iznos", COL_BRUTO, y, { size: 8, bold: true });
  y -= 9;
  drawRight("(bez PDV-a)", COL_CIJ, y, { size: 7 });
  drawRight("(%)", COL_RAB, y, { size: 7 });
  drawRight("(%)", COL_PDV, y, { size: 7 });
  drawRight("(bez PDV-a)", COL_BRUTO, y, { size: 7 });

  y -= 6;
  dashLine(ML, MR, y);
  y -= 12;

  // Stavke
  for (const it of items) {
    const computed = computeItem(it, invoice.applyVat);
    const naziv = String(it.name || "");
    const maxNazivW = COL_JM - COL_NAZIV - 4;

    // poštuj user-ove \n, dodatno wrap-aj svaki red po širini kolone
    const lines = [];
    const rawLines = naziv.split(/\r?\n/);
    for (const raw of rawLines) {
      if (!raw.trim()) { lines.push(""); continue; }
      let buf = "";
      for (const word of raw.split(/\s+/)) {
        const tt = buf ? buf + " " + word : word;
        if (fontReg.widthOfTextAtSize(tt, 9) <= maxNazivW) buf = tt;
        else {
          if (buf) lines.push(buf);
          buf = word;
        }
      }
      if (buf) lines.push(buf);
    }
    const rowH = Math.max(12, lines.length * 11);

    drawText(`${it.ordinal}.`, COL_RB, y, { size: 9 });
    lines.forEach((ln, i) => drawText(ln, COL_NAZIV, y - i * 11, { size: 9 }));
    drawText(it.unit || "", COL_JM, y, { size: 9 });
    drawRight(fmt3(it.quantity), COL_KOL, y, { size: 9 });
    drawRight(fmt4(it.unitPrice), COL_CIJ, y, { size: 9 });
    drawRight(fmt2(it.discountPct), COL_RAB, y, { size: 9 });
    drawRight(invoice.applyVat ? fmt2(it.vatPct) : "–", COL_PDV, y, { size: 9 });
    drawRight(fmt2(computed.netLine), COL_BRUTO, y, { size: 9 });

    y -= rowH;

    if (y < 180) {
      // nova stranica ako stavki ima previše
      const np = pdf.addPage([PAGE_W, PAGE_H]);
      // jednostavno: prebaci dalje renderiranje na novu stranicu
      // (za prvi MVP ne pravimo header/footer na slijedećoj — rijetko se događa)
      page.drawText("...nastavak na sljedećoj strani", { x: ML, y: 100, size: 8, font: fontReg, color: grey });
      // rebind page reference
      // eslint-disable-next-line no-param-reassign
      Object.assign(page, np);
      y = PAGE_H - 50;
    }
  }

  dashLine(ML, MR, y);

  // ── TOTALI desno ───────────────────────────────────────────────────────
  const currency = invoice.currency === "EUR" ? "EUR" : "BAM";
  const currencyLabel = currency === "EUR" ? "EUR" : "KM";
  const TOT_L = 340;
  const TOT_VAL_R = MR - 28;
  const TOT_KM_X = MR - 4;
  let yT = y - 14;
  const totRow = (lbl, val, bold = false) => {
    drawText(lbl, TOT_L + 4, yT, { size: 9, bold });
    drawRight(fmt2(val), TOT_VAL_R, yT, { size: 9, bold });
    drawRight(currencyLabel, TOT_KM_X, yT, { size: 9, bold });
    hLine(TOT_L, MR, yT - 4, 0.3, grey);
    yT -= 14;
  };
  if (invoice.applyVat) {
    totRow("Bruto iznos:", totals.netTotal + totals.discountTotal);
    if (totals.discountTotal > 0) totRow("- Rabat:", totals.discountTotal);
    totRow("Osnovica (bez PDV-a):", totals.netTotal);
    totRow("+ PDV:", totals.vatTotal);
    totRow("ZA NAPLATU:", totals.grossTotal, true);
  } else {
    totRow("Bruto iznos:", totals.netTotal + totals.discountTotal);
    if (totals.discountTotal > 0) totRow("- Rabat:", totals.discountTotal);
    totRow("ZA NAPLATU:", totals.grossTotal, true);
  }

  // Slovima blok lijevo
  let yS = y - 14;
  drawText(`SLOVIMA: (${amountInWords(totals.grossTotal, currency)} )`, ML, yS, { size: 9 });
  yS -= 16;
  if (invoice.applyVat) {
    drawText("PDV obračunat u skladu sa Zakonom o PDV-u", ML, yS, { size: 8, color: grey });
    yS -= 11;
    drawText("(Sl. glasnik BiH, broj 9/05 i 35/05)", ML, yS, { size: 8, color: grey });
  } else {
    drawText("Obveznik nije u sistemu PDV-a, PDV nije obračunat.", ML, yS, { size: 8, color: grey });
  }

  // ── Notes ──────────────────────────────────────────────────────────────
  if (invoice.notes && String(invoice.notes).trim()) {
    yS -= 18;
    drawText("Napomena:", ML, yS, { size: 9, bold: true });
    yS -= 12;
    const noteWords = String(invoice.notes).split(/\s+/);
    let line = "";
    const maxW = MR - ML;
    for (const w of noteWords) {
      const t = line ? line + " " + w : w;
      if (fontReg.widthOfTextAtSize(t, 9) <= maxW) line = t;
      else { drawText(line, ML, yS, { size: 9 }); yS -= 11; line = w; }
    }
    if (line) drawText(line, ML, yS, { size: 9 });
  }

  // ── FOOTER ─────────────────────────────────────────────────────────────
  hLine(ML, MR, 110, 0.6);
  drawText(
    isProforma
      ? "Predračun je punovažan bez potpisa i pečata."
      : "Faktura je punovažna bez potpisa i pečata.",
    ML, 96, { size: 8, color: grey },
  );
  drawRight("1/1", MR, 96, { size: 8, color: grey });

  return Buffer.from(await pdf.save());
}

module.exports = {
  generateInvoicePdf,
  formatInvoiceNumber,
  computeItem,
  computeTotals,
  amountInWords,
};
