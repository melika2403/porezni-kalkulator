// ──────────────────────────────────────────────────────────────────────────────
//  Generator BiH uplatnice (PDF) — AcroForm fill preko uplatnica_nova_v2.pdf
//  template-a koji ima 113 imenovanih polja (payer_*, recipient_*,
//  sender_account_NN, period_*, itd). Forma se popuni i flatten-uje.
//
//  Računi (KANTONI + federalni) se čitaju iz uplatniRacuniData.json koji je
//  auto-generisan iz frontend/src/data/uplatni-racuni.ts (single source of
//  truth). Re-generisanje: node scripts/sync-racuni-backend.mjs
// ──────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const RACUNI = require("./uplatniRacuniData.json");

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "templates",
  "uplatnica_nova_v2.pdf",
);
const FONT_PATH = path.join(__dirname, "..", "assets", "fonts", "arial.ttf");


// ── KANTONI + federalni računi ─────────────────────────────────────────────
// Single source of truth: frontend/src/data/uplatni-racuni.ts
// Re-generate JSON: node scripts/sync-racuni-backend.mjs
const KANTONI = RACUNI.KANTONI;
const FBIH_BUDZET_RACUN = RACUNI.FBIH_BUDZET_RACUN;
const FBIH_ZO_RACUN = RACUNI.FBIH_ZO_RACUN;
const FBIH_NEZAP_RACUN = RACUNI.FBIH_NEZAP_RACUN;
const FOND_INVALIDI_RACUN = RACUNI.FOND_INVALIDI_RACUN;

// Pronađi kantonski ključ na osnovu naziva općine (case-insensitive)
function kantonForOpcina(opcinaIme) {
  if (!opcinaIme) return null;
  // Normalize: lowercase, strip trailing " sarajevo" i "(fbih)" sufikse, trim
  const normalize = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s*\(fbih\)\s*$/i, "")
      .replace(/\s+sarajevo$/i, "")
      .trim();
  const target = normalize(opcinaIme);
  if (!target) return null;
  for (const [key, k] of Object.entries(KANTONI)) {
    for (const o of k.opcine) {
      if (normalize(o.ime) === target) {
        return { kantonKey: key, kantonData: k, opcinaKod: o.kod };
      }
    }
  }
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const accDigits = (s) => (s || "").replace(/-/g, "");
const fmtKm = (n) =>
  "=" +
  Number(n).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const lastDayOfMonth = (month, year) => {
  const d = new Date(parseInt(year), parseInt(month), 0).getDate();
  return String(d).padStart(2, "0");
};

// Poziv na broj — 10 cifara (novi template ima 10 ćelija). Format: left-pad
// nula + mjesec.
const pozivBroj = (month) => {
  const m = parseInt(month).toString();
  return "0".repeat(10 - m.length) + m;
};

// ── Helpers: ručni drawing preko AcroForm widget rect-ova ─────────────────
// Pristup: dohvatimo widget rect → uklonimo polje → ručno nacrtamo tekst.
// Tako ne pozivamo form.flatten() koji bi nacrtao bijelu pozadinu preko
// template borderi ćelija. Template ostaje vizuelno netaknut.

function drawInRect(page, font, rect, text, size, align, liftY = 0) {
  if (!text) return;
  const s = String(text);
  const tw = font.widthOfTextAtSize(s, size);
  let x;
  if (align === "center") x = rect.x + rect.width / 2 - tw / 2;
  else if (align === "right") x = rect.x + rect.width - tw - 1;
  else x = rect.x + 2; // left
  // y je baseline. Faktor 0.28 daje bolju vertikalnu sredinu. liftY je opcionalni
  // pomak prema gore (potreban za veći font u uskim boxovima — npr. amount_km).
  const y = rect.y + rect.height / 2 - size * 0.28 + liftY;
  page.drawText(s, { x, y, size, font });
}

function drawAt(form, page, font, name, value, size, align, liftY = 0) {
  try {
    const f = form.getTextField(name);
    const widget = f.acroField.getWidgets()[0];
    const rect = widget?.getRectangle();
    form.removeField(f);
    if (rect && value !== undefined && value !== null && value !== "") {
      drawInRect(page, font, rect, value, size, align, liftY);
    }
  } catch {
    // polje ne postoji u template-u — preskoči
  }
}

// Word-wrap teksta po maks. širini (širina je u istim jedinicama kao font size).
function wrapTextToWidth(text, maxWidth, font, size) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let current = "";
  for (const w of words) {
    const test = current ? current + " " + w : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth || !current) {
      current = test;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Popunjava sekvencu polja (npr. ["purpose_1","purpose_2","purpose_3"]) sa
// linijama teksta. Skip-uje prvih `startFromIndex` polja (ostaju prazni). Svaka
// ulazna linija se word-wrap-uje po širini prvog dostupnog polja; akumulirane
// linije se redom upisuju u preostala polja. Sva polja se uklanjaju iz forme.
function drawWrappedFromIndex(form, page, font, fieldNames, lines, size, align, startFromIndex) {
  const rects = [];
  for (const name of fieldNames) {
    try {
      const f = form.getTextField(name);
      const widget = f.acroField.getWidgets()[0];
      rects.push(widget ? widget.getRectangle() : null);
      form.removeField(f);
    } catch {
      rects.push(null);
    }
  }
  const targetRects = rects.slice(startFromIndex).filter(Boolean);
  if (targetRects.length === 0) return;
  const wrapWidth = targetRects[0].width - 4;
  const all = [];
  for (const line of lines) {
    if (!line) continue;
    const wrapped = wrapTextToWidth(line, wrapWidth, font, size);
    all.push(...wrapped);
  }
  for (let i = 0; i < all.length; i++) {
    const idx = startFromIndex + i;
    if (idx >= rects.length || !rects[idx]) break;
    drawInRect(page, font, rects[idx], all[i], size, align);
  }
}

// Crtaj cifre po cifre u {prefix}_01, {prefix}_02, ...
function drawDigits(form, page, font, prefix, count, value, size) {
  const digits = String(value || "").replace(/\D/g, "");
  for (let i = 0; i < count; i++) {
    const name = `${prefix}_${String(i + 1).padStart(2, "0")}`;
    drawAt(form, page, font, name, digits[i] || "", size, "center");
  }
}

// Crtaj period DD MM YYYY u polja {prefix}_{day,month,year}_NN
function drawPeriod(form, page, font, prefix, dd, mm, yyyy, size) {
  const d = String(dd).padStart(2, "0");
  const m = String(mm).padStart(2, "0");
  const y = String(yyyy).padStart(4, "0");
  drawAt(form, page, font, `${prefix}_day_01`, d[0], size, "center");
  drawAt(form, page, font, `${prefix}_day_02`, d[1], size, "center");
  drawAt(form, page, font, `${prefix}_month_01`, m[0], size, "center");
  drawAt(form, page, font, `${prefix}_month_02`, m[1], size, "center");
  drawAt(form, page, font, `${prefix}_year_01`, y[0], size, "center");
  drawAt(form, page, font, `${prefix}_year_02`, y[1], size, "center");
  drawAt(form, page, font, `${prefix}_year_03`, y[2], size, "center");
  drawAt(form, page, font, `${prefix}_year_04`, y[3], size, "center");
}

// ── Popunjavanje uplatnice ─────────────────────────────────────────────────
// Iterira kroz AcroForm polja iz uplatnica_nova_v2.pdf, uklanja ih i crta
// tekst direktno na page — template borderi ćelija ostaju netaknuti.
function fillForm(form, page, font, opts) {
  const SZ_TEXT = 11; // veći multiline boxovi (uplatio, svrha, primatelj)
  const SZ_BOX = 13; // single-char ćelije za cifre
  const SZ_AMOUNT = 15; // KM iznos
  const SZ_MJESTO = 11;

  // PAYER — uplatio. Prvo polje (payer_name) ostaje prazno; naziv organizacije
  // ide u payer_address (2. red), adresa u payer_phone (3. red). Ako naziv ne
  // stane u jedan red, wrap se prelije u sljedeća polja.
  const u = Array.isArray(opts.uplatio) ? opts.uplatio : [];
  drawWrappedFromIndex(form, page, font,
    ["payer_name", "payer_address", "payer_phone"],
    [u[0] || "", u[1] || "", u[2] || ""],
    SZ_TEXT, "left", 1);

  // SVRHA — purpose_1 ostaje prazan, sadržaj kreće iz purpose_2 i wrap-uje se
  // u purpose_3 ako je preduga.
  drawWrappedFromIndex(form, page, font,
    ["purpose_1", "purpose_2", "purpose_3"],
    [String(opts.svrha || "")],
    SZ_TEXT, "left", 1);

  // RECIPIENT — recipient_name ostaje prazan; primaoc i adresa idu u
  // recipient_address_1 i _2 (sa wrap-om po potrebi).
  const r = Array.isArray(opts.primatelj) ? opts.primatelj : [];
  drawWrappedFromIndex(form, page, font,
    ["recipient_name", "recipient_address_1", "recipient_address_2"],
    [r[0] || "", r[1] || "", r[2] || ""],
    SZ_TEXT, "left", 1);

  // MJESTO
  drawAt(form, page, font, "place", opts.opcinaIme || "", SZ_MJESTO, "left");

  // DATUM (DD MM YYYY) — novi template ima 4-cifrenu godinu
  const datum = String(opts.datum || "");
  const [dy, dm, dd] = datum.split("-");
  if (dd && dm && dy && dy.length === 4) {
    drawAt(form, page, font, "date_day_01", dd[0], SZ_BOX, "center");
    drawAt(form, page, font, "date_day_02", dd[1], SZ_BOX, "center");
    drawAt(form, page, font, "date_month_01", dm[0], SZ_BOX, "center");
    drawAt(form, page, font, "date_month_02", dm[1], SZ_BOX, "center");
    drawAt(form, page, font, "date_year_01", dy[0], SZ_BOX, "center");
    drawAt(form, page, font, "date_year_02", dy[1], SZ_BOX, "center");
    drawAt(form, page, font, "date_year_03", dy[2], SZ_BOX, "center");
    drawAt(form, page, font, "date_year_04", dy[3], SZ_BOX, "center");
  }

  // RAČUNI (16 cifara svaki, bez crtica)
  drawDigits(form, page, font, "sender_account", 16, opts.racunPosilDigits || "", SZ_BOX);
  drawDigits(form, page, font, "recipient_account", 16, opts.racunPrimDigits || "", SZ_BOX);

  // KM iznos — jedan text field sa formatiranim brojem (npr. "=1.234,56").
  // liftY=2 podiže tekst da veći font ne prelazi donju liniju boxa.
  drawAt(form, page, font, "amount_km", fmtKm(opts.kmIznos), SZ_AMOUNT, "center", 2);

  // signature_payer i urgent ostavljamo prazno (popunjava se ručno pri štampanju)
  drawAt(form, page, font, "signature_payer", "", SZ_TEXT, "left");
  drawAt(form, page, font, "urgent", "", SZ_BOX, "center");

  if (opts.skipJavniPrihodi) {
    // Javni prihodi ostavljeni prazni — moramo ipak ukloniti polja iz forme
    // da ne ostanu vizuelni AcroForm widget-i nakon save-a.
    drawDigits(form, page, font, "tax_id", 13, "", SZ_BOX);
    drawAt(form, page, font, "payment_type_01", "", SZ_BOX, "center");
    drawDigits(form, page, font, "revenue_type", 6, "", SZ_BOX);
    drawPeriod(form, page, font, "period_from", "", "", "", SZ_BOX);
    drawPeriod(form, page, font, "period_to", "", "", "", SZ_BOX);
    drawDigits(form, page, font, "municipality", 3, "", SZ_BOX);
    drawDigits(form, page, font, "budget_org", 7, "", SZ_BOX);
    drawDigits(form, page, font, "reference_number", 10, "", SZ_BOX);
    return;
  }

  // Broj poreznog obveznika — JIB firme (13 cifara) za uplate poslodavca,
  // ili JMBG za individualne uplate.
  const obveznikId = opts.brojObveznika || opts.jmbg || "";
  drawDigits(form, page, font, "tax_id", 13, obveznikId, SZ_BOX);

  // Vrsta uplate — fiksno "0"
  drawAt(form, page, font, "payment_type_01", "0", SZ_BOX, "center");

  // Vrsta prihoda — 6 cifara
  drawDigits(form, page, font, "revenue_type", 6, opts.vrstaProhoda || "", SZ_BOX);

  // Period od/do — novi template traži 4-cifrenu godinu (YYYY)
  const mPad = String(opts.periodMjesec || "").padStart(2, "0");
  const year = String(opts.periodGodina || "");
  const lastDay = lastDayOfMonth(opts.periodMjesec, opts.periodGodina);
  drawPeriod(form, page, font, "period_from", "01", mPad, year, SZ_BOX);
  drawPeriod(form, page, font, "period_to", lastDay, mPad, year, SZ_BOX);

  // Općina (3 cifre)
  drawDigits(form, page, font, "municipality", 3, opts.opcinaKod || "", SZ_BOX);

  // Proračunska organizacija (7 cifara; default sedam nula)
  const budgetOrgStr = opts.budgetOrg
    ? String(opts.budgetOrg).padStart(7, "0")
    : "0000000";
  drawDigits(form, page, font, "budget_org", 7, budgetOrgStr, SZ_BOX);

  // Poziv na broj — 10 ćelija (left-pad nula + mjesec)
  const poziv = opts.customPoziv ?? pozivBroj(opts.periodMjesec);
  drawDigits(form, page, font, "reference_number", 10, poziv, SZ_BOX);
}

// Cached resources
let cachedTemplate = null;
let cachedFontBytes = null;

async function loadResources() {
  if (!cachedTemplate) cachedTemplate = fs.readFileSync(TEMPLATE_PATH);
  if (!cachedFontBytes) cachedFontBytes = fs.readFileSync(FONT_PATH);
  return { templateBytes: cachedTemplate, fontBytes: cachedFontBytes };
}

/**
 * Generiše jednu uplatnicu kao PDF Buffer.
 * fillForm uklanja sva AcroForm polja i ručno crta tekst preko widget rect-ova,
 * pa form.flatten() nije potreban — template borderi ćelija ostaju netaknuti.
 * @param {Object} opts - parametri za fillForm + uplatio/primatelj data
 */
async function generateUplatnica(opts) {
  const { templateBytes, fontBytes } = await loadResources();
  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  fillForm(doc.getForm(), doc.getPage(0), font, opts);
  return Buffer.from(await doc.save());
}

/**
 * Generiše kombinovani PDF sa više uplatnica (jedna po stranici).
 * @param {Array<Object>} optsList - array fillForm opcija za svaku uplatnicu
 * @returns {Promise<Buffer>}
 */
async function generateUplatniceCombined(optsList) {
  const { templateBytes, fontBytes } = await loadResources();
  const out = await PDFDocument.create();

  for (const opts of optsList) {
    const single = await PDFDocument.load(templateBytes);
    single.registerFontkit(fontkit);
    const font = await single.embedFont(fontBytes);
    fillForm(single.getForm(), single.getPage(0), font, opts);
    const [p] = await out.copyPages(single, [0]);
    out.addPage(p);
  }
  return Buffer.from(await out.save());
}

module.exports = {
  KANTONI,
  FBIH_BUDZET_RACUN,
  FBIH_ZO_RACUN,
  FBIH_NEZAP_RACUN,
  FOND_INVALIDI_RACUN,
  kantonForOpcina,
  generateUplatnica,
  generateUplatniceCombined,
  accDigits,
};
