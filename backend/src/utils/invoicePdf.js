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

function formatInvoiceNumber(seq, year, type, docType = "STANDARD") {
  // svaka serija ima svoj prefiks i brojač: P- predračuni, F- fakture,
  // A- avansne i storno avansnih (zajednička serija), KO- knjižne obavijesti
  const prefix =
    type === "PROFORMA"
      ? "P-"
      : docType === "AVANSNA" || docType === "STORNO_AVANSNE"
        ? "A-"
        : docType === "KNJIZNA_OBAVIJEST"
          ? "KO-"
          : "F-";
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
// oznaka: kad je zadana, njome se ispisuje valuta (dvojezična faktura koristi
// "BAM" i u bosanskom redu, da se ne miješa sa "KM" iz totala)
function amountInWords(value, currency = "BAM", oznaka = null) {
  const km = Math.floor(value);
  const fen = Math.round((value - km) * 100);
  const isEur = currency === "EUR";
  const main = oznaka || (isEur ? "EUR" : "KM");
  const sub = isEur ? "centi" : "feninga";
  let s = intToWords(km) + " " + main;
  if (fen > 0) s += " i " + intToWords(fen) + " " + sub;
  return s;
}

// ── IN WORDS (engleski) ─────────────────────────────────────────────────────
const EN_ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function enHundreds(n) {
  let out = "";
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) out += EN_ONES[h] + " hundred";
  if (r) {
    if (out) out += " ";
    out += r < 20 ? EN_ONES[r] : EN_TENS[Math.floor(r / 10)] + (r % 10 ? "-" + EN_ONES[r % 10] : "");
  }
  return out;
}
function intToWordsEn(n) {
  if (n === 0) return "zero";
  const parts = [];
  const mil = Math.floor(n / 1_000_000);
  const tho = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (mil) parts.push(enHundreds(mil) + " million");
  if (tho) parts.push(enHundreds(tho) + " thousand");
  if (rest) parts.push(enHundreds(rest));
  return parts.join(" ");
}
function amountInWordsEn(value, currency = "BAM", oznaka = null) {
  const main = Math.floor(value);
  const cents = Math.round((value - main) * 100);
  const cur = oznaka || (currency === "EUR" ? "euro" : "BAM");
  const sub = currency === "EUR" ? "cents" : "fenings";
  const w = intToWordsEn(main);
  let s = w.charAt(0).toUpperCase() + w.slice(1) + " " + cur;
  if (cents > 0) s += " and " + intToWordsEn(cents) + " " + sub;
  return s;
}

// ── JEZIK ISPISA ────────────────────────────────────────────────────────────
// "bs" (default), "en" i "bs-en" (dvojezično za inostrane kupce). Dvojezične
// labele su ručno skraćene da stanu u kolone; duži tekstovi (napomene o PDV-u,
// podnožje, slovima) idu u dva reda kroz L.multi().
const TXT_BS = {
  kupac: "KUPAC:", telefon: "Telefon:", idKupca: "ID broj kupca:", pdvKupca: "PDV broj kupca:",
  faktura: "Faktura", predracun: "Predračun", avansna: "Avansna faktura",
  stornoAvansne: "Storno avansne fakture", ko: "Knjižna obavijest", pazar: "Evidencija pazara",
  br: "br.", datumIzdavanja: "Datum izdavanja:", datumDospijeca: "Datum dospijeća:",
  poAvansnoj: "Po avansnoj fakturi:", uzFakturu: "Uz fakturu broj:", nacinPlacanja: "Način plaćanja:",
  avansnaUplata: "Avansna uplata", gotovina: "Gotovina", ziralno: "Žiralno",
  rb: "R/B", naziv: "NAZIV ROBE - USLUGE", jm: "J/M", kolicina: "Količina", cijena: "Cijena",
  rabat: "Rabat", pdv: "PDV", iznos: "Iznos", bezPdv: "(bez PDV-a)", posto: "(%)",
  bruto: "Bruto iznos:", minusRabat: "- Rabat:", osnovica: "Osnovica (bez PDV-a):", plusPdv: "+ PDV:",
  zaNaplatu: "ZA NAPLATU:", umanjenje: "UKUPNO UMANJENJE:", slovima: "SLOVIMA:",
  napomena: "Napomena:", tel: "Tel:", id: "ID:", pdvBr: "PDV:", tr: "TR:", email: "e-mail:",
  pdvObracunat: ["PDV obračunat u skladu sa Zakonom o PDV-u", "(Sl. glasnik BiH, broj 9/05 i 35/05)"],
  nijeObveznik: ["Obveznik nije u sistemu PDV-a, PDV nije obračunat."],
  izvoz: ["PDV nije obračunat: promet inostranom kupcu (izvoz), u skladu sa Zakonom o PDV-u BiH."],
  oslobodjena: ["PDV nije obračunat: oslobođena isporuka, u skladu sa Zakonom o PDV-u BiH."],
  koNapomena: ["Kupac PDV obveznik je dužan po ovoj knjižnoj obavijesti izvršiti", "ispravku (smanjenje) odbitka ulaznog PDV-a (član 20. stav 11. Zakona o PDV-u)."],
  punovaznaF: "Faktura je punovažna bez potpisa i pečata.",
  punovaznaP: "Predračun je punovažan bez potpisa i pečata.",
  punovaznaD: "Dokument je punovažan bez potpisa i pečata.",
};
const TXT_EN = {
  kupac: "BILL TO:", telefon: "Phone:", idKupca: "Buyer ID no.:", pdvKupca: "Buyer VAT no.:",
  faktura: "Invoice", predracun: "Proforma invoice", avansna: "Advance invoice",
  stornoAvansne: "Advance invoice reversal", ko: "Credit note", pazar: "Daily sales record",
  br: "No.", datumIzdavanja: "Issue date:", datumDospijeca: "Due date:",
  poAvansnoj: "Per advance invoice:", uzFakturu: "To invoice no.:", nacinPlacanja: "Payment method:",
  avansnaUplata: "Advance payment", gotovina: "Cash", ziralno: "Bank transfer",
  rb: "No.", naziv: "DESCRIPTION OF GOODS / SERVICES", jm: "Unit", kolicina: "Qty", cijena: "Price",
  rabat: "Discount", pdv: "VAT", iznos: "Amount", bezPdv: "(ex VAT)", posto: "(%)",
  bruto: "Gross amount:", minusRabat: "- Discount:", osnovica: "Net amount (ex VAT):", plusPdv: "+ VAT:",
  zaNaplatu: "TOTAL DUE:", umanjenje: "TOTAL CREDIT:", slovima: "IN WORDS:",
  napomena: "Note:", tel: "Phone:", id: "ID:", pdvBr: "VAT:", tr: "Account:", email: "e-mail:",
  pdvObracunat: ["VAT charged in accordance with the VAT Law of Bosnia and Herzegovina", "(Official Gazette of BiH, no. 9/05 and 35/05)"],
  nijeObveznik: ["The issuer is not registered for VAT; VAT is not charged."],
  izvoz: ["VAT not charged: supply to a foreign customer (export), pursuant to the VAT Law of Bosnia and Herzegovina."],
  oslobodjena: ["VAT not charged: VAT-exempt supply pursuant to the VAT Law of Bosnia and Herzegovina."],
  koNapomena: ["The VAT-registered buyer is required to reduce its input VAT deduction", "based on this credit note (Article 20(11) of the VAT Law)."],
  punovaznaF: "This invoice is valid without signature and stamp.",
  punovaznaP: "This proforma invoice is valid without signature and stamp.",
  punovaznaD: "This document is valid without signature and stamp.",
};
// dvojezično: kratke labele "bs / en", skraćene da stanu u kolone i desni blok
const TXT_BSEN = {
  ...TXT_BS,
  kupac: "KUPAC / BILL TO:", telefon: "Telefon / Phone:", idKupca: "ID broj / ID no.:", pdvKupca: "PDV broj / VAT no.:",
  faktura: "Faktura / Invoice", predracun: "Predračun / Proforma", avansna: "Avansna faktura / Advance invoice",
  stornoAvansne: "Storno avansne / Reversal", ko: "Knjižna obavijest / Credit note", pazar: "Evidencija pazara",
  br: "br. / No.", datumIzdavanja: "Datum / Issue date:", datumDospijeca: "Dospijeće / Due date:",
  poAvansnoj: "Po avansnoj / Per advance:", uzFakturu: "Uz fakturu / To invoice:", nacinPlacanja: "Plaćanje / Payment:",
  avansnaUplata: "Avans / Advance", gotovina: "Gotovina / Cash", ziralno: "Žiralno / Bank transfer",
  bruto: "Bruto / Gross:", minusRabat: "- Rabat / Discount:", osnovica: "Osnovica / Net:", plusPdv: "+ PDV / VAT:",
  zaNaplatu: "ZA NAPLATU / TOTAL DUE:", umanjenje: "UMANJENJE / CREDIT:",
  napomena: "Napomena / Note:", tel: "Tel:", id: "ID:", pdvBr: "PDV / VAT:", tr: "TR / Account:",
};
function labelsFor(jezik) {
  const j = String(jezik || "bs").toLowerCase();
  const base = j === "en" ? TXT_EN : j === "bs-en" ? TXT_BSEN : TXT_BS;
  return {
    ...base,
    jezik: j,
    dvojezicno: j === "bs-en",
    // duži tekstovi: en samo engleski, bs-en oba jezika (bs pa en), bs samo bosanski
    multi(key) {
      const bs = TXT_BS[key];
      const en = TXT_EN[key];
      const toArr = (v) => (Array.isArray(v) ? v : [v]);
      if (j === "en") return toArr(en);
      if (j === "bs-en") return [...toArr(bs), ...toArr(en)];
      return toArr(bs);
    },
  };
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
  const docType = invoice.docType || "STANDARD";
  // jezik ispisa (bs / en / bs-en); brojevi i obračun su isti
  const L = labelsFor(invoice.jezik);
  const docTitle = isProforma
    ? L.predracun
    : docType === "AVANSNA"
      ? L.avansna
      : docType === "STORNO_AVANSNE"
        ? L.stornoAvansne
        : docType === "KNJIZNA_OBAVIJEST"
          ? L.ko
          : docType === "PAZAR"
            ? L.pazar
            : L.faktura;
  // storno i knjižna obavijest se ISPISUJU negativno (u bazi su pozitivni,
  // predznak nosi vrsta dokumenta, isto kao u KIF-u i PDV prijavi)
  const sign =
    docType === "STORNO_AVANSNE" || docType === "KNJIZNA_OBAVIJEST" ? -1 : 1;

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
  // Prelamanje teksta na zadanu širinu (koristi ga i napomena i red "slovima").
  // Riječ duža od raspoložive širine se lomi po znakovima — iznos slovima je
  // jedna jedina riječ ("DevetstoDevedeset...Hiljada..."), pa bez toga ne bi
  // stao ni u jedan red.
  const wrapLines = (text, maxW, size = 9, font = fontReg) => {
    const out = [];
    for (const raw of String(text ?? "").split(/\r?\n/)) {
      let line = "";
      for (const word of raw.split(/\s+/).filter(Boolean)) {
        const probe = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(probe, size) <= maxW) {
          line = probe;
          continue;
        }
        if (line) out.push(line);
        line = "";
        // riječ sama po sebi šira od reda: lomi je po znakovima
        if (font.widthOfTextAtSize(word, size) > maxW) {
          let dio = "";
          for (const ch of word) {
            if (font.widthOfTextAtSize(dio + ch, size) > maxW && dio) {
              out.push(dio);
              dio = ch;
            } else {
              dio += ch;
            }
          }
          line = dio;
        } else {
          line = word;
        }
      }
      if (line) out.push(line);
    }
    return out.length ? out : [""];
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
  if (invoice.sellerPhone) { drawCenter(`${L.tel} ${invoice.sellerPhone}`, firmaCx, yH, { size: 10 }); yH -= 12; }
  const idLine = [
    invoice.sellerTaxNumber ? `${L.id} ${invoice.sellerTaxNumber}` : null,
    invoice.sellerVatNumber ? `${L.pdvBr} ${invoice.sellerVatNumber}` : null,
  ].filter(Boolean).join("    ");
  if (idLine) { drawCenter(idLine, firmaCx, yH, { size: 10, bold: true }); yH -= 12; }
  if (invoice.sellerBankAccount) { drawCenter(`${L.tr} ${invoice.sellerBankAccount}`, firmaCx, yH, { size: 10 }); yH -= 12; }
  if (invoice.sellerEmail) { drawCenter(`${L.email} ${invoice.sellerEmail}`, firmaCx, yH, { size: 10 }); yH -= 12; }

  const yDivider = Math.min(LOGO_Y, yH - 6);
  hLine(ML, MR, yDivider, 0.6);

  // ── KUPAC blok (lijevo) ────────────────────────────────────────────────
  let yL = yDivider - 14;
  drawText(L.kupac, ML, yL, { size: 9 });
  yL -= 14;
  drawText(invoice.buyerName || "", ML, yL, { size: 11, bold: true });
  yL -= 14;
  if (invoice.buyerAddress) { drawText(invoice.buyerAddress, ML, yL, { size: 10 }); yL -= 12; }
  const cityLine = [invoice.buyerPostalCode, invoice.buyerCity].filter(Boolean).join("  ");
  if (cityLine) { drawText(cityLine, ML, yL, { size: 10 }); yL -= 12; }
  if (invoice.buyerPhone) { drawText(`${L.telefon} ${invoice.buyerPhone}`, ML, yL, { size: 9 }); yL -= 12; }
  // dvojezične labele su šire, pa vrijednost ide dalje udesno
  const KUPAC_VAL_X = ML + (L.dvojezicno ? 112 : 92);
  if (invoice.buyerIdNumber) {
    drawText(L.idKupca, ML, yL, { size: 9 });
    drawText(invoice.buyerIdNumber, KUPAC_VAL_X, yL, { size: 9, bold: true });
    yL -= 12;
  }
  if (invoice.buyerVatNumber) {
    drawText(L.pdvKupca, ML, yL, { size: 9 });
    drawText(invoice.buyerVatNumber, KUPAC_VAL_X, yL, { size: 9, bold: true });
    yL -= 12;
  }

  // ── Datumi i broj (desno) ─────────────────────────────────────────────
  let yR = yDivider - 16;
  const RIGHT_LBL_X = 320;
  const RIGHT_VAL_X = 460;

  // Naslov dokumenta — prvi (na vrhu desnog bloka); duži naslovi (avansna,
  // storno, knjižna obavijest) idu u dva reda da ne izađu iz margine
  // dvojezični naslov je duži, pa ide u dva reda kao i ostali dugi naslovi
  if ((docType === "STANDARD" || isProforma) && !L.dvojezicno) {
    drawText(`${docTitle} ${L.br}  ${invoice.fullNumber}`, RIGHT_LBL_X, yR, { size: 14, bold: true });
    yR -= 22;
  } else {
    drawText(docTitle, RIGHT_LBL_X, yR, { size: 13, bold: true });
    yR -= 16;
    drawText(`${L.br}  ${invoice.fullNumber}`, RIGHT_LBL_X, yR, { size: 12, bold: true });
    yR -= 20;
  }

  const drawRow = (lbl, val) => {
    drawText(lbl, RIGHT_LBL_X, yR, { size: 9 });
    drawText(val, RIGHT_VAL_X, yR, { size: 9, bold: true });
    yR -= 14;
  };
  drawRow(L.datumIzdavanja, fmtDate(invoice.issueDate));
  if (invoice.dueDate) drawRow(L.datumDospijeca, fmtDate(invoice.dueDate));
  // veza na izvorni dokument (storno → avansna, KO → faktura)
  if (invoice.linkedFullNumber) {
    drawRow(
      docType === "STORNO_AVANSNE" ? L.poAvansnoj : L.uzFakturu,
      invoice.linkedFullNumber,
    );
  }
  if (docType === "AVANSNA") drawRow(L.nacinPlacanja, L.avansnaUplata);
  else if (docType === "PAZAR") drawRow(L.nacinPlacanja, L.gotovina);
  else if (sign > 0) drawRow(L.nacinPlacanja, L.ziralno);

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

  drawText(L.rb, COL_RB, y, { size: 8, bold: true });
  drawText(L.naziv, COL_NAZIV, y, { size: 8, bold: true });
  drawText(L.jm, COL_JM, y, { size: 8, bold: true });
  drawRight(L.kolicina, COL_KOL, y, { size: 8, bold: true });
  drawRight(L.cijena, COL_CIJ, y, { size: 8, bold: true });
  drawRight(L.rabat, COL_RAB, y, { size: 8, bold: true });
  drawRight(L.pdv, COL_PDV, y, { size: 8, bold: true });
  drawRight(L.iznos, COL_BRUTO, y, { size: 8, bold: true });
  y -= 9;
  // Drugi red zaglavlja: svaki natpis mora stati između svoje i lijeve kolone.
  // Engleski natpisi ("Amount ex VAT") su duži od bosanskih, pa se cijeli red
  // po potrebi ispisuje manjim slovima — nikad se ne prelijeva u susjednu
  // kolonu. GAP je razmak koji ostaje između dva natpisa.
  const GAP_ZAGLAVLJA = 4;
  const drugiRed = L.dvojezicno
    ? [
        { txt: TXT_EN.naziv, x: COL_NAZIV, lijevo: true, maxW: COL_JM - COL_NAZIV - GAP_ZAGLAVLJA },
        { txt: TXT_EN.jm, x: COL_JM, lijevo: true, maxW: COL_KOL - COL_JM - GAP_ZAGLAVLJA },
        { txt: TXT_EN.kolicina, x: COL_KOL, maxW: COL_KOL - COL_JM - GAP_ZAGLAVLJA },
        { txt: `${TXT_EN.cijena} (net)`, x: COL_CIJ, maxW: COL_CIJ - COL_KOL - GAP_ZAGLAVLJA },
        { txt: `${TXT_EN.rabat} %`, x: COL_RAB, maxW: COL_RAB - COL_CIJ - GAP_ZAGLAVLJA },
        { txt: `${TXT_EN.pdv} %`, x: COL_PDV, maxW: COL_PDV - COL_RAB - GAP_ZAGLAVLJA },
        { txt: `${TXT_EN.iznos} (net)`, x: COL_BRUTO, maxW: COL_BRUTO - COL_PDV - GAP_ZAGLAVLJA },
      ]
    : [
        { txt: L.bezPdv, x: COL_CIJ, maxW: COL_CIJ - COL_KOL - GAP_ZAGLAVLJA },
        { txt: L.posto, x: COL_RAB, maxW: COL_RAB - COL_CIJ - GAP_ZAGLAVLJA },
        { txt: L.posto, x: COL_PDV, maxW: COL_PDV - COL_RAB - GAP_ZAGLAVLJA },
        { txt: L.bezPdv, x: COL_BRUTO, maxW: COL_BRUTO - COL_PDV - GAP_ZAGLAVLJA },
      ];
  let zaglavljeSize = 7;
  for (const c of drugiRed) {
    while (
      zaglavljeSize > 5 &&
      fontReg.widthOfTextAtSize(String(c.txt), zaglavljeSize) > c.maxW
    ) {
      zaglavljeSize -= 0.25;
    }
  }
  for (const c of drugiRed) {
    if (c.lijevo) drawText(c.txt, c.x, y, { size: zaglavljeSize });
    else drawRight(c.txt, c.x, y, { size: zaglavljeSize });
  }

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
    drawRight(fmt2(sign * computed.netLine), COL_BRUTO, y, { size: 9 });

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
  // Oznaka valute prati jezik ispisa: domaća faktura "KM", engleska i
  // dvojezična "BAM" (međunarodna oznaka), isto kao u iznosu slovima i mailu.
  const currencyLabel =
    currency === "EUR" ? "EUR" : L.jezik === "bs" ? "KM" : "BAM";
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
  // storno/KO: "za naplatu" nema smisla, iznos je odobrenje kupcu
  const totalLbl = sign < 0 ? L.umanjenje : L.zaNaplatu;
  if (invoice.applyVat) {
    totRow(L.bruto, sign * (totals.netTotal + totals.discountTotal));
    if (totals.discountTotal > 0) totRow(L.minusRabat, sign * totals.discountTotal);
    totRow(L.osnovica, sign * totals.netTotal);
    totRow(L.plusPdv, sign * totals.vatTotal);
    totRow(totalLbl, sign * totals.grossTotal, true);
  } else {
    totRow(L.bruto, sign * (totals.netTotal + totals.discountTotal));
    if (totals.discountTotal > 0) totRow(L.minusRabat, sign * totals.discountTotal);
    totRow(totalLbl, sign * totals.grossTotal, true);
  }

  // Slovima blok lijevo (uvijek apsolutni iznos, predznak nose totali);
  // dvojezično: bosanski pa engleski red
  let yS = y - 14;
  const oznakaSlovima = currency === "EUR" ? null : currencyLabel;
  const slovimaRedovi =
    L.jezik === "en"
      ? [`${TXT_EN.slovima} (${amountInWordsEn(totals.grossTotal, currency)} )`]
      : L.jezik === "bs-en"
        ? [
            `${TXT_BS.slovima} (${amountInWords(totals.grossTotal, currency, oznakaSlovima)} )`,
            `${TXT_EN.slovima} (${amountInWordsEn(totals.grossTotal, currency)} )`,
          ]
        : [`${TXT_BS.slovima} (${amountInWords(totals.grossTotal, currency)} )`];
  // Blok "slovima" stoji lijevo od kolone totala (TOT_L), pa se prelama na
  // raspoloživu širinu: na velikim iznosima je red duži od pola stranice i bez
  // prelamanja bi ušao u iznose (dvojezično čak u dva reda).
  const SLOVIMA_MAX_W = TOT_L - 8 - ML;
  for (const red of slovimaRedovi) {
    for (const linija of wrapLines(red, SLOVIMA_MAX_W, 9)) {
      drawText(linija, ML, yS, { size: 9 });
      yS -= 12;
    }
  }
  yS -= 4;
  // napomena o PDV-u zavisi od vrste isporuke: izvoz i oslobođena isporuka
  // nisu "neobveznik", pa dobijaju svoj tekst
  const pdvKljuc = invoice.applyVat
    ? "pdvObracunat"
    : invoice.vrstaIsporuke === "IZVOZ"
      ? "izvoz"
      : invoice.vrstaIsporuke === "OSLOBODJENA"
        ? "oslobodjena"
        : "nijeObveznik";
  const pdvRedovi = L.multi(pdvKljuc);
  pdvRedovi.forEach((red, i) => {
    drawText(red, ML, yS, { size: 8, color: grey });
    if (i < pdvRedovi.length - 1) yS -= 11;
  });
  if (docType === "KNJIZNA_OBAVIJEST" && invoice.applyVat) {
    yS -= 14;
    const koRedovi = L.multi("koNapomena");
    koRedovi.forEach((red, i) => {
      drawText(red, ML, yS, { size: 8, color: grey });
      if (i < koRedovi.length - 1) yS -= 11;
    });
  }

  // ── Notes ──────────────────────────────────────────────────────────────
  if (invoice.notes && String(invoice.notes).trim()) {
    yS -= 18;
    drawText(L.napomena, ML, yS, { size: 9, bold: true });
    yS -= 12;
    const noteLines = wrapLines(invoice.notes, MR - ML, 9);
    noteLines.forEach((linija, i) => {
      drawText(linija, ML, yS, { size: 9 });
      if (i < noteLines.length - 1) yS -= 11;
    });
  }

  // ── FOOTER ─────────────────────────────────────────────────────────────
  hLine(ML, MR, 110, 0.6);
  const podnozjeKljuc = isProforma ? "punovaznaP" : docType === "STANDARD" ? "punovaznaF" : "punovaznaD";
  const podnozje = L.multi(podnozjeKljuc);
  podnozje.forEach((red, i) => {
    drawText(red, ML, 96 - i * 10, { size: 8, color: grey });
  });
  drawRight("1/1", MR, 96, { size: 8, color: grey });

  return Buffer.from(await pdf.save());
}

module.exports = {
  generateInvoicePdf,
  formatInvoiceNumber,
  computeItem,
  computeTotals,
  amountInWords,
  amountInWordsEn,
  labelsFor,
};
