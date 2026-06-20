// ──────────────────────────────────────────────────────────────────────────────
//  Generator BiH uplatnice (PDF) — AcroForm fill preko uplatnica_nova_v2.pdf
//  template-a koji ima 109 imenovanih polja (payer_*, recipient_*,
//  sender_account_NN, period_*, itd). Sva polja se uklanjaju i tekst se crta
//  direktno na page preko widget rect-ova, pa template borderi ostaju netaknuti.
//  Port iz backend/src/utils/uplatnicaPdf.js — držati u sinhronizaciji.
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, PDFForm, PDFPage, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ── Types ── */

// Import iz centralnog data fajla (single source of truth) + re-export
import {
  KANTONI,
  FBIH_ZO_RACUN,
  FBIH_BUDZET_RACUN,
  FBIH_NEZAP_RACUN,
  FOND_INVALIDI_RACUN,
  kantonForOpcina,
  type KantonKey,
  type KantonData,
} from "src/data/uplatni-racuni";

export {
  KANTONI,
  FBIH_ZO_RACUN,
  FBIH_BUDZET_RACUN,
  FBIH_NEZAP_RACUN,
  FOND_INVALIDI_RACUN,
  kantonForOpcina,
};
export type { KantonKey, KantonData };

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

/* ── AcroForm fill helpers — port iz backend/src/utils/uplatnicaPdf.js ── */

interface Rect { x: number; y: number; width: number; height: number; }
type Align = "left" | "center" | "right";

function drawInRect(page: PDFPage, font: PDFFont, rect: Rect, text: string, size: number, align: Align, liftY = 0) {
  if (!text) return;
  const s = String(text);
  const tw = font.widthOfTextAtSize(s, size);
  let x: number;
  if (align === "center") x = rect.x + rect.width / 2 - tw / 2;
  else if (align === "right") x = rect.x + rect.width - tw - 1;
  else x = rect.x + 2;
  const y = rect.y + rect.height / 2 - size * 0.28 + liftY;
  page.drawText(s, { x, y, size, font });
}

function drawAt(form: PDFForm, page: PDFPage, font: PDFFont, name: string, value: string, size: number, align: Align, liftY = 0) {
  try {
    const f = form.getTextField(name);
    const widget = f.acroField.getWidgets()[0];
    const rect = widget?.getRectangle();
    form.removeField(f);
    if (rect && value !== undefined && value !== null && value !== "") {
      drawInRect(page, font, rect, value, size, align, liftY);
    }
  } catch {
    // polje ne postoji — preskoči
  }
}

function drawDigits(form: PDFForm, page: PDFPage, font: PDFFont, prefix: string, count: number, value: string, size: number) {
  const digits = String(value || "").replace(/\D/g, "");
  for (let i = 0; i < count; i++) {
    const name = `${prefix}_${String(i + 1).padStart(2, "0")}`;
    drawAt(form, page, font, name, digits[i] || "", size, "center");
  }
}

function drawPeriod(form: PDFForm, page: PDFPage, font: PDFFont, prefix: string, dd: string, mm: string, yyyy: string, size: number) {
  const d = String(dd).padStart(2, "0");
  const m = String(mm).padStart(2, "0");
  const y = String(yyyy).padStart(4, "0");
  drawAt(form, page, font, `${prefix}_day_01`, d[0] || "", size, "center");
  drawAt(form, page, font, `${prefix}_day_02`, d[1] || "", size, "center");
  drawAt(form, page, font, `${prefix}_month_01`, m[0] || "", size, "center");
  drawAt(form, page, font, `${prefix}_month_02`, m[1] || "", size, "center");
  drawAt(form, page, font, `${prefix}_year_01`, y[0] || "", size, "center");
  drawAt(form, page, font, `${prefix}_year_02`, y[1] || "", size, "center");
  drawAt(form, page, font, `${prefix}_year_03`, y[2] || "", size, "center");
  drawAt(form, page, font, `${prefix}_year_04`, y[3] || "", size, "center");
}

function wrapTextToWidth(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
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

function drawWrappedFromIndex(
  form: PDFForm, page: PDFPage, font: PDFFont,
  fieldNames: string[], lines: string[], size: number, align: Align, startFromIndex: number,
) {
  const rects: (Rect | null)[] = [];
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
  const targetRects = rects.slice(startFromIndex).filter((r): r is Rect => r !== null);
  if (targetRects.length === 0) return;
  const wrapWidth = targetRects[0].width - 4;
  const all: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    const wrapped = wrapTextToWidth(line, wrapWidth, font, size);
    all.push(...wrapped);
  }
  for (let i = 0; i < all.length; i++) {
    const idx = startFromIndex + i;
    if (idx >= rects.length || !rects[idx]) break;
    drawInRect(page, font, rects[idx]!, all[i], size, align);
  }
}

/* ── FillPageOpts: input za jednu uplatnicu ── */

export interface FillPageOpts {
  uplatio: string[];         // [naziv, adresa, telefon?]
  svrha: string;             // jedan string, auto-wrap kroz 2-3 reda
  primatelj: string[];       // [naziv, adresa1?, adresa2?]
  racunPosilDigits?: string; // 16 cifara (bez crtica)
  racunPrimDigits: string;
  kmIznos: number;
  vrstaProhoda: string;      // 6 cifara
  jmbg: string;              // 13 cifara
  opcinaKod: string;         // 3 cifre
  opcinaIme: string;
  datum: string;             // ISO yyyy-mm-dd
  periodMjesec: string;      // "01"–"12"
  periodGodina: string;      // "2026"
  // Opcionalni custom period — koristi se za GPD (cijela godina) i specijalne slučajeve.
  customOdDan?: string;      // "01" (default), inače custom DD
  customOdMjesec?: string;   // default = periodMjesec
  customOdGodina?: string;   // default = periodGodina (4 cifre)
  customDoDan?: string;      // default = lastDayOfMonth(periodMjesec, periodGodina)
  customDoMjesec?: string;   // default = periodMjesec
  customDoGodina?: string;   // default = periodGodina
  customPoziv?: string;      // 10 cifara (default = pozivBroj(periodMjesec))
  skipJavniPrihodi?: boolean; // za "uplatu radniku", bez desnog dijela
}

/* ── Interna fillForm — popunjava jednu stranicu (template AcroForm uklonjen) ── */

function fillForm(form: PDFForm, page: PDFPage, font: PDFFont, opts: FillPageOpts) {
  const SZ_TEXT = 11;
  const SZ_BOX = 13;
  const SZ_AMOUNT = 15;
  const SZ_MJESTO = 11;

  // PAYER — payer_name ostaje prazan, sadržaj kreće iz 2. polja (payer_address).
  const u = Array.isArray(opts.uplatio) ? opts.uplatio : [];
  drawWrappedFromIndex(form, page, font,
    ["payer_name", "payer_address", "payer_phone"],
    [u[0] || "", u[1] || "", u[2] || ""],
    SZ_TEXT, "left", 1);

  // SVRHA — purpose_1 ostaje prazan, wrap od purpose_2.
  drawWrappedFromIndex(form, page, font,
    ["purpose_1", "purpose_2", "purpose_3"],
    [String(opts.svrha || "")],
    SZ_TEXT, "left", 1);

  // RECIPIENT — recipient_name ostaje prazan.
  const r = Array.isArray(opts.primatelj) ? opts.primatelj : [];
  drawWrappedFromIndex(form, page, font,
    ["recipient_name", "recipient_address_1", "recipient_address_2"],
    [r[0] || "", r[1] || "", r[2] || ""],
    SZ_TEXT, "left", 1);

  // MJESTO
  drawAt(form, page, font, "place", opts.opcinaIme || "", SZ_MJESTO, "left");

  // DATUM uplate (DD MM YYYY)
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

  // RAČUNI (16 cifara svaki)
  drawDigits(form, page, font, "sender_account", 16, opts.racunPosilDigits || "", SZ_BOX);
  drawDigits(form, page, font, "recipient_account", 16, opts.racunPrimDigits || "", SZ_BOX);

  // KM iznos (lift +2 da veći font ne prelazi donju liniju)
  drawAt(form, page, font, "amount_km", fmtKm(opts.kmIznos), SZ_AMOUNT, "center", 2);

  // signature_payer + urgent — ostaju prazni (popunjava se ručno pri štampi)
  drawAt(form, page, font, "signature_payer", "", SZ_TEXT, "left");
  drawAt(form, page, font, "urgent", "", SZ_BOX, "center");

  if (opts.skipJavniPrihodi) {
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

  // JMBG / broj poreznog obveznika (13 cifara)
  drawDigits(form, page, font, "tax_id", 13, opts.jmbg || "", SZ_BOX);

  // Vrsta uplate — fiksno "0"
  drawAt(form, page, font, "payment_type_01", "0", SZ_BOX, "center");

  // Vrsta prihoda (6 cifara)
  drawDigits(form, page, font, "revenue_type", 6, opts.vrstaProhoda || "", SZ_BOX);

  // Period od/do — custom override ili default iz periodMjesec/Godina
  const mPad = String(opts.periodMjesec || "").padStart(2, "0");
  const year = String(opts.periodGodina || "");
  const lastDay = lastDayOfMonth(opts.periodMjesec, opts.periodGodina);
  const odD = opts.customOdDan ?? "01";
  const odM = opts.customOdMjesec ?? mPad;
  const odY = opts.customOdGodina ?? year;
  const doD = opts.customDoDan ?? lastDay;
  const doM = opts.customDoMjesec ?? mPad;
  const doY = opts.customDoGodina ?? year;
  drawPeriod(form, page, font, "period_from", odD, odM, odY, SZ_BOX);
  drawPeriod(form, page, font, "period_to", doD, doM, doY, SZ_BOX);

  // Općina (3 cifre)
  drawDigits(form, page, font, "municipality", 3, opts.opcinaKod || "", SZ_BOX);

  // Proračunska organizacija (7 cifara; default sve nule)
  drawDigits(form, page, font, "budget_org", 7, "0000000", SZ_BOX);

  // Poziv na broj — 10 cifara
  const poziv = opts.customPoziv ?? pozivBroj(opts.periodMjesec);
  drawDigits(form, page, font, "reference_number", 10, poziv, SZ_BOX);
}

/* ── Public: build kombinovanog PDF-a od array-a FillPageOpts ── */

let cachedTemplate: ArrayBuffer | null = null;
let cachedFont: ArrayBuffer | null = null;

async function loadResources(): Promise<{ templateBytes: ArrayBuffer; fontBytes: ArrayBuffer }> {
  if (!cachedTemplate || !cachedFont) {
    const [t, f] = await Promise.all([
      fetch("/templates/uplatnica_nova_v2.pdf").then((r) => r.arrayBuffer()),
      fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
    ]);
    cachedTemplate = t;
    cachedFont = f;
  }
  return { templateBytes: cachedTemplate, fontBytes: cachedFont };
}

export async function buildUplatniceFromOpts(optsList: FillPageOpts[]): Promise<Uint8Array> {
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
  return out.save();
}

/* ── Main export — AMS uplatnice (3 stranice) ── */

export async function fillUplatnice(data: UplatnicaData): Promise<Uint8Array> {
  const kanton = KANTONI[data.kantonKey];
  const posilDigits = data.ziroRacun ? accDigits(data.ziroRacun) : undefined;

  const shared = {
    jmbg: data.jmbg,
    opcinaKod: data.opcinaKod,
    opcinaIme: data.opcinaIme,
    datum: data.datum,
    periodMjesec: data.periodMjesec,
    periodGodina: data.periodGodina,
    racunPosilDigits: posilDigits,
    uplatio: [data.imeIPrezime, data.adresa],
  };

  return buildUplatniceFromOpts([
    // 1) Kantonalni ZO
    {
      ...shared,
      svrha: "Doprinos za zdravstvo od uplate iz inostranstva",
      primatelj: ["Zavod zdravstvenog osiguranja i reosiguranja", kanton.genitiv],
      racunPrimDigits: accDigits(kanton.zoRacun),
      kmIznos: data.zdravstvenoKanton,
      vrstaProhoda: "712116",
    },
    // 2) Federalni ZZO
    {
      ...shared,
      svrha: "Doprinos za zdravstvo od uplate iz inostranstva",
      primatelj: ["Zavod zdravstvenog osiguranja i reosiguranja FBiH"],
      racunPrimDigits: accDigits(FBIH_ZO_RACUN),
      kmIznos: data.zdravstvenoFbih,
      vrstaProhoda: "712116",
    },
    // 3) Kantonalni budžet (porez)
    {
      ...shared,
      svrha: "Porez na dohodak od uplate iz inostranstva",
      primatelj: ["Budžet " + kanton.genitiv],
      racunPrimDigits: accDigits(kanton.budzet),
      kmIznos: data.porez,
      vrstaProhoda: "716116",
    },
  ]);
}

/* ── GPD uplatnica (single, full-year period) ── */

export interface GpdUplatnicaData {
  imeIPrezime: string;
  adresa: string;
  jmbg: string;
  godina: string;       // "2025"
  porez: number;
  kantonKey: KantonKey;
  opcinaKod: string;
  opcinaIme: string;
  datum: string;        // ISO yyyy-mm-dd
  ziroRacun?: string;
}

export async function fillGpdUplatnica(data: GpdUplatnicaData): Promise<Uint8Array> {
  const kanton = KANTONI[data.kantonKey];
  // godina može biti 2 ili 4 cifre — normaliziraj na 4 (npr. "25" → "2025")
  const fullYear = data.godina.length === 4 ? data.godina : "20" + data.godina;

  return buildUplatniceFromOpts([{
    uplatio: [data.imeIPrezime, data.adresa],
    svrha: `Porez na dohodak po godišnjoj prijavi za ${fullYear}. godinu`,
    primatelj: ["Budžet " + kanton.genitiv],
    racunPosilDigits: data.ziroRacun ? accDigits(data.ziroRacun) : undefined,
    racunPrimDigits: accDigits(kanton.budzet),
    kmIznos: data.porez,
    vrstaProhoda: "716117",
    jmbg: data.jmbg,
    opcinaKod: data.opcinaKod,
    opcinaIme: data.opcinaIme,
    datum: data.datum,
    periodMjesec: "01",
    periodGodina: fullYear,
    // Cijela godina kao period: 01/01/YYYY – 31/12/YYYY
    customOdDan: "01",
    customOdMjesec: "01",
    customOdGodina: fullYear,
    customDoDan: "31",
    customDoMjesec: "12",
    customDoGodina: fullYear,
    customPoziv: "0000000000",
  }]);
}
