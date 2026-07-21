// ─────────────────────────────────────────────────────────────────────────────
//  Kartica prometa partnera (kupca ili dobavljača) - PDF
//  Tabela: Rb, Datum, Dokument/Opis, Duguje, Potražuje, Saldo; sa UKUPNO
//  redom i paginacijom. Stil po uzoru na klasične knjigovodstvene kartice.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");
const FONT_REG = path.join(FONTS_DIR, "arial.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "arialbd.ttf");

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.45, 0.42);
const LINE = rgb(0.78, 0.76, 0.72);

function withThousands(s) {
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [int, dec] = body.split(".");
  const intT = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + intT + (dec ? "," + dec : "");
}
const fmt2 = (n) => withThousands(Number(n || 0).toFixed(2));

function fmtDate(d) {
  if (!d) return "";
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  return y && m && day ? `${day}.${m}.${y}.` : "";
}

/**
 * @param {object} input
 * @param {object} input.org      naša organizacija {name, address, city, jib}
 * @param {object} input.partner  partner {name, code, jib, address, city}
 * @param {"kupac"|"dobavljac"} input.type
 * @param {{from: string, to: string}} input.period  ISO datumi
 * @param {Array<{date: string, dospijece: string|null, label: string, duguje: number, potrazuje: number}>} input.rows
 *   hronološki redovi; saldo se računa kumulativno (duguje - potražuje)
 * @returns {Promise<Buffer>}
 */
async function buildKarticaPdf({ org, partner, type, period, rows }) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const reg = await doc.embedFont(fs.readFileSync(FONT_REG), { subset: true });
  const bold = await doc.embedFont(fs.readFileSync(FONT_BOLD), {
    subset: true,
  });

  const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait
  const M = 42;
  const tableW = PAGE.w - 2 * M;

  // kolone: rb 24, datum 58, dospijeće 58, opis flex, duguje 74, potražuje 74, saldo 80
  const cols = [
    { key: "rb", w: 24, align: "right", title: "Rb" },
    { key: "date", w: 58, align: "left", title: "Datum" },
    { key: "dospijece", w: 58, align: "left", title: "Dospijeće" },
    { key: "label", w: tableW - 24 - 58 - 58 - 74 - 74 - 80, align: "left", title: "Opis knjiženja" },
    { key: "duguje", w: 74, align: "right", title: "Duguje" },
    { key: "potrazuje", w: 74, align: "right", title: "Potražuje" },
    { key: "saldo", w: 80, align: "right", title: "Saldo" },
  ];

  const title =
    type === "kupac"
      ? `Kartica kupca ${String(partner.code || "").padStart(4, "0")}`
      : `Kartica dobavljača ${String(partner.code || "").padStart(4, "0")}`;

  let page = null;
  let y = 0;
  let pageNum = 0;
  const totalPagesHolder = [];

  function drawText(text, x, yy, { font = reg, size = 9, color = INK, align = "left", width = 0 } = {}) {
    const t = String(text ?? "");
    let tx = x;
    if (align === "right") tx = x + width - font.widthOfTextAtSize(t, size);
    else if (align === "center") tx = x + (width - font.widthOfTextAtSize(t, size)) / 2;
    page.drawText(t, { x: tx, y: yy, size, font, color });
  }

  function truncate(text, font, size, maxW) {
    let t = String(text ?? "");
    if (font.widthOfTextAtSize(t, size) <= maxW) return t;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxW) {
      t = t.slice(0, -1);
    }
    return `${t}...`;
  }

  function newPage() {
    page = doc.addPage([PAGE.w, PAGE.h]);
    pageNum += 1;
    y = PAGE.h - M;

    if (pageNum === 1) {
      // naša organizacija (istaknuto)
      drawText(org.name || "", M, y - 12, { font: bold, size: 13 });
      drawText(
        [org.address, org.city].filter(Boolean).join(", "),
        M,
        y - 27,
        { size: 10 },
      );
      drawText(org.jib ? `JIB: ${org.jib}` : "", M, y - 41, { size: 10 });

      // naslov + period, centrirano preko cijele širine
      drawText(title, M, y - 76, {
        font: bold,
        size: 16,
        align: "center",
        width: tableW,
      });
      drawText(
        `za period od ${fmtDate(period.from)} do ${fmtDate(period.to)}`,
        M,
        y - 93,
        { font: bold, size: 10, align: "center", width: tableW },
      );

      // partner blok
      const px = M;
      let py = y - 122;
      drawText(type === "kupac" ? "Kupac:" : "Dobavljač:", px, py, {
        size: 10.5,
        color: MUTED,
      });
      drawText(partner.name || "", px + 72, py, { font: bold, size: 11.5 });
      py -= 15;
      const partnerLine2 = [
        [partner.address, partner.city].filter(Boolean).join(", "),
        partner.jib ? `JIB: ${partner.jib}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      if (partnerLine2) {
        drawText(partnerLine2, px + 72, py, { size: 10 });
        py -= 15;
      }
      y = py - 12;
    } else {
      drawText(`${title} (nastavak)`, M, y - 12, { font: bold, size: 10 });
      y -= 30;
    }

    // zaglavlje tabele
    const headH = 18;
    page.drawRectangle({
      x: M,
      y: y - headH,
      width: tableW,
      height: headH,
      color: rgb(0.93, 0.92, 0.89),
    });
    let cx = M;
    for (const c of cols) {
      drawText(c.title, cx + 3, y - headH + 5.5, {
        font: bold,
        size: 8,
        align: c.align,
        width: c.w - 6,
        color: INK,
      });
      cx += c.w;
    }
    page.drawLine({
      start: { x: M, y: y - headH },
      end: { x: M + tableW, y: y - headH },
      thickness: 0.7,
      color: LINE,
    });
    y -= headH;
  }

  newPage();

  const rowH = 15;
  let saldo = 0;
  let sumDuguje = 0;
  let sumPotrazuje = 0;

  rows.forEach((r, idx) => {
    if (y - rowH < M + 40) newPage();
    saldo += (r.duguje || 0) - (r.potrazuje || 0);
    sumDuguje += r.duguje || 0;
    sumPotrazuje += r.potrazuje || 0;

    let cx = M;
    const vals = {
      rb: `${idx + 1}.`,
      date: fmtDate(r.date),
      dospijece: fmtDate(r.dospijece),
      label: truncate(r.label, reg, 8.5, cols[3].w - 8),
      duguje: r.duguje ? fmt2(r.duguje) : "",
      potrazuje: r.potrazuje ? fmt2(r.potrazuje) : "",
      saldo: fmt2(saldo),
    };
    for (const c of cols) {
      drawText(vals[c.key], cx + 3, y - rowH + 4.5, {
        size: 8.5,
        align: c.align,
        width: c.w - 6,
      });
      cx += c.w;
    }
    page.drawLine({
      start: { x: M, y: y - rowH },
      end: { x: M + tableW, y: y - rowH },
      thickness: 0.4,
      color: LINE,
    });
    y -= rowH;
  });

  // UKUPNO red
  if (y - 20 < M + 30) newPage();
  let cx = M;
  const totals = {
    rb: "",
    date: "",
    dospijece: "",
    label: "UKUPNO:",
    duguje: fmt2(sumDuguje),
    potrazuje: fmt2(sumPotrazuje),
    saldo: fmt2(saldo),
  };
  for (const c of cols) {
    drawText(totals[c.key], cx + 3, y - 16 + 4.5, {
      font: bold,
      size: 8.5,
      align: c.key === "label" ? "right" : c.align,
      width: c.w - 6,
    });
    cx += c.w;
  }
  page.drawLine({
    start: { x: M, y: y - 18 },
    end: { x: M + tableW, y: y - 18 },
    thickness: 0.9,
    color: INK,
  });

  // footeri sa brojem stranice (naknadno, kad znamo ukupan broj)
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    const t = `Stranica ${i + 1}/${pages.length} · ispis ${fmtDate(
      new Date().toISOString(),
    )} · poreznikalkulator.ba`;
    pg.drawText(t, {
      x: M,
      y: M - 18,
      size: 7.5,
      font: reg,
      color: MUTED,
    });
  });
  void totalPagesHolder;

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/**
 * IOS: Izvod otvorenih stavki na dan. Standardna forma za usaglašavanje
 * potraživanja i obaveza: povjerilac/dužnik blok, tabela otvorenih stavki
 * (dokument, datum, valuta, iznos), rok od 8 dana za ovjeren primjerak,
 * blok za potvrdu stanja primaoca i potpisi obje strane.
 *
 * @param {object} input
 * @param {object} input.org      naša organizacija {name, address, city, jib}
 * @param {object} input.partner  partner {name, code, jib, address, city}
 * @param {"kupac"|"dobavljac"} input.type
 *   kupac = naša potraživanja (mi povjerilac); dobavljac = naše obaveze
 * @param {string} input.naDan    ISO datum stanja
 * @param {Array<{broj: string, datum: string, valuta: string|null, iznos: number}>} input.rows
 * @returns {Promise<Buffer>}
 */
async function buildIosPdf({ org, partner, type, naDan, rows }) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const reg = await doc.embedFont(fs.readFileSync(FONT_REG), { subset: true });
  const bold = await doc.embedFont(fs.readFileSync(FONT_BOLD), {
    subset: true,
  });

  const PAGE = { w: 595.28, h: 841.89 };
  const M = 48;
  const tableW = PAGE.w - 2 * M;
  let page = doc.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - M;

  const draw = (text, x, yy, { font = reg, size = 9.5, color = INK, align = "left", width = 0 } = {}) => {
    const t = String(text ?? "");
    let tx = x;
    if (align === "right") tx = x + width - font.widthOfTextAtSize(t, size);
    else if (align === "center") tx = x + (width - font.widthOfTextAtSize(t, size)) / 2;
    page.drawText(t, { x: tx, y: yy, size, font, color });
  };
  // pasus prelomljen na širinu tabele
  const pasus = (text, { size = 9.5, lh = 14 } = {}) => {
    const rijeci = String(text).split(" ");
    let red = "";
    for (const w of rijeci) {
      const probni = red ? `${red} ${w}` : w;
      if (reg.widthOfTextAtSize(probni, size) > tableW && red) {
        draw(red, M, y, { size });
        y -= lh;
        red = w;
      } else {
        red = probni;
      }
    }
    if (red) {
      draw(red, M, y, { size });
      y -= lh;
    }
  };
  const hr = (yy, thickness = 0.6) =>
    page.drawLine({
      start: { x: M, y: yy },
      end: { x: M + tableW, y: yy },
      thickness,
      color: LINE,
    });

  // povjerilac je onaj čija su potraživanja u izvodu
  const povjerilac = type === "kupac" ? org : partner;
  const duznik = type === "kupac" ? partner : org;
  const strana = (label, s) => {
    draw(label, M, y, { size: 8.5, color: MUTED });
    y -= 13;
    draw(s.name || "", M, y, { font: bold, size: 11 });
    y -= 13;
    const linija2 = [
      [s.address, s.city].filter(Boolean).join(", "),
      s.jib ? `JIB: ${s.jib}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    if (linija2) {
      draw(linija2, M, y, { size: 9 });
      y -= 13;
    }
    y -= 6;
  };

  strana("POVJERILAC (sastavio izvod):", povjerilac);
  strana("DUŽNIK (primalac izvoda):", duznik);
  y -= 8;

  draw("IZVOD OTVORENIH STAVKI (IOS)", M, y, {
    font: bold,
    size: 15,
    align: "center",
    width: tableW,
  });
  y -= 17;
  draw(`na dan ${fmtDate(naDan)}`, M, y, {
    font: bold,
    size: 10.5,
    align: "center",
    width: tableW,
  });
  y -= 24;

  pasus(
    "Radi usaglašavanja međusobnih potraživanja i obaveza, u skladu sa " +
      "propisima o računovodstvu, dostavljamo vam pregled otvorenih " +
      `(neizmirenih) stavki na dan ${fmtDate(naDan)}. Prema našim poslovnim ` +
      "knjigama stanje je sljedeće:",
  );
  y -= 8;

  // tabela: Rb, Dokument, Datum, Valuta, Iznos
  const cols = [
    { key: "rb", w: 30, align: "right", title: "Rb" },
    { key: "broj", w: tableW - 30 - 78 - 78 - 92, align: "left", title: "Dokument" },
    { key: "datum", w: 78, align: "left", title: "Datum" },
    { key: "valuta", w: 78, align: "left", title: "Valuta" },
    { key: "iznos", w: 92, align: "right", title: "Iznos (KM)" },
  ];
  const headH = 18;
  page.drawRectangle({
    x: M,
    y: y - headH,
    width: tableW,
    height: headH,
    color: rgb(0.93, 0.92, 0.89),
  });
  let cx = M;
  for (const c of cols) {
    draw(c.title, cx + 3, y - headH + 5.5, {
      font: bold,
      size: 8,
      align: c.align,
      width: c.w - 6,
    });
    cx += c.w;
  }
  y -= headH;
  hr(y);

  const rowH = 15;
  let ukupno = 0;
  rows.forEach((r, idx) => {
    ukupno += r.iznos || 0;
    let x = M;
    const vals = {
      rb: `${idx + 1}.`,
      broj: r.broj,
      datum: fmtDate(r.datum),
      valuta: r.valuta ? fmtDate(r.valuta) : "",
      iznos: fmt2(r.iznos),
    };
    for (const c of cols) {
      let t = String(vals[c.key] ?? "");
      while (t.length > 1 && reg.widthOfTextAtSize(t, 8.5) > c.w - 8) {
        t = t.slice(0, -1);
      }
      draw(t, x + 3, y - rowH + 4.5, {
        size: 8.5,
        align: c.align,
        width: c.w - 6,
      });
      x += c.w;
    }
    y -= rowH;
    hr(y, 0.4);
  });
  if (rows.length === 0) {
    draw("Nema otvorenih stavki.", M + 3, y - rowH + 4.5, {
      size: 8.5,
      color: MUTED,
    });
    y -= rowH;
    hr(y, 0.4);
  }
  // UKUPNO
  draw("UKUPNO OTVORENO:", M, y - rowH + 4.5, {
    font: bold,
    size: 9,
    align: "right",
    width: tableW - 92 - 6,
  });
  draw(fmt2(ukupno), M + tableW - 92, y - rowH + 4.5, {
    font: bold,
    size: 9,
    align: "right",
    width: 92 - 6,
  });
  y -= rowH;
  hr(y, 0.9);
  y -= 18;

  pasus(
    "Molimo da provjerite iskazano stanje i jedan ovjeren primjerak ovog " +
      "izvoda vratite na našu adresu u roku od 8 dana od dana prijema. " +
      "Ukoliko u navedenom roku ne primimo ovjeren primjerak niti vaše " +
      "primjedbe, smatrat ćemo da ste saglasni sa iskazanim stanjem.",
  );
  y -= 16;

  // potvrda stanja (popunjava primalac)
  draw("POTVRDA STANJA (popunjava primalac izvoda)", M, y, {
    font: bold,
    size: 9.5,
  });
  y -= 16;
  pasus(
    `Potvrđujemo da se iskazano stanje na dan ${fmtDate(naDan)} u iznosu od ` +
      `${fmt2(ukupno)} KM (zaokružiti):   SLAŽE   /   NE SLAŽE   sa našim ` +
      "poslovnim knjigama.",
  );
  y -= 6;
  draw("Primjedbe:", M, y, { size: 9.5 });
  page.drawLine({
    start: { x: M + 55, y: y - 2 },
    end: { x: M + tableW, y: y - 2 },
    thickness: 0.5,
    color: LINE,
  });
  y -= 18;
  page.drawLine({
    start: { x: M, y: y - 2 },
    end: { x: M + tableW, y: y - 2 },
    thickness: 0.5,
    color: LINE,
  });
  y -= 40;

  // potpisi: za povjerioca i za dužnika
  const potW = 190;
  const potpis = (label, x) => {
    page.drawLine({
      start: { x, y },
      end: { x: x + potW, y },
      thickness: 0.7,
      color: INK,
    });
    draw(label, x, y - 13, {
      size: 8.5,
      align: "center",
      width: potW,
      color: MUTED,
    });
  };
  potpis("Za povjerioca (M.P. i potpis)", M);
  potpis("Za dužnika (M.P. i potpis)", M + tableW - potW);

  // footer
  draw(
    `IOS na dan ${fmtDate(naDan)} · ispis ${fmtDate(new Date().toISOString())} · poreznikalkulator.ba`,
    M,
    M - 18,
    { size: 7.5, color: MUTED },
  );

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Opomena kupcu za dospjele neplaćene račune. Sadržaj po uobičajenoj praksi:
//  podaci povjerioca i dužnika, tabela dospjelih računa (dokument, datum,
//  valuta, iznos), ukupan dug, rok za plaćanje, račun za uplatu, upozorenje
//  (nivo 2 = pred utuženje: kamata + sudski postupak), "zanemarite ako ste
//  platili" i potpis. Nema zakonski propisan obrazac; forma prati IOS stil.
// ─────────────────────────────────────────────────────────────────────────────
async function buildOpomenaPdf({ org, partner, naDan, rok = 8, nivo = 1, rows }) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const reg = await doc.embedFont(fs.readFileSync(FONT_REG), { subset: true });
  const bold = await doc.embedFont(fs.readFileSync(FONT_BOLD), {
    subset: true,
  });

  const PAGE = { w: 595.28, h: 841.89 };
  const M = 48;
  const tableW = PAGE.w - 2 * M;
  const page = doc.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - M;

  const draw = (text, x, yy, { font = reg, size = 9.5, color = INK, align = "left", width = 0 } = {}) => {
    const t = String(text ?? "");
    let tx = x;
    if (align === "right") tx = x + width - font.widthOfTextAtSize(t, size);
    else if (align === "center") tx = x + (width - font.widthOfTextAtSize(t, size)) / 2;
    page.drawText(t, { x: tx, y: yy, size, font, color });
  };
  const pasus = (text, { size = 9.5, lh = 14, font = reg } = {}) => {
    const rijeci = String(text).split(" ");
    let red = "";
    for (const w of rijeci) {
      const probni = red ? `${red} ${w}` : w;
      if (font.widthOfTextAtSize(probni, size) > tableW && red) {
        draw(red, M, y, { size, font });
        y -= lh;
        red = w;
      } else {
        red = probni;
      }
    }
    if (red) {
      draw(red, M, y, { size, font });
      y -= lh;
    }
  };
  const hr = (yy, thickness = 0.6) =>
    page.drawLine({
      start: { x: M, y: yy },
      end: { x: M + tableW, y: yy },
      thickness,
      color: LINE,
    });

  const strana = (label, s) => {
    draw(label, M, y, { size: 8.5, color: MUTED });
    y -= 13;
    draw(s.name || "", M, y, { font: bold, size: 11 });
    y -= 13;
    const linija2 = [
      [s.address, s.city].filter(Boolean).join(", "),
      s.jib ? `JIB: ${s.jib}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    if (linija2) {
      draw(linija2, M, y, { size: 9 });
      y -= 13;
    }
    y -= 6;
  };

  strana("POVJERILAC:", org);
  strana("DUŽNIK:", partner);
  y -= 8;

  const naslov = nivo === 2 ? "OPOMENA PRED UTUŽENJE" : "OPOMENA";
  draw(naslov, M, y, { font: bold, size: 15, align: "center", width: tableW });
  y -= 17;
  draw(`za dospjele neizmirene obaveze na dan ${fmtDate(naDan)}`, M, y, {
    font: bold,
    size: 10.5,
    align: "center",
    width: tableW,
  });
  y -= 24;

  pasus(
    "Uvidom u naše poslovne knjige utvrdili smo da prema nama imate " +
      "dospjele, a neizmirene obaveze po sljedećim računima:",
  );
  y -= 8;

  // tabela: Rb, Dokument, Datum, Valuta, Iznos (isti stil kao IOS)
  const cols = [
    { key: "rb", w: 30, align: "right", title: "Rb" },
    { key: "broj", w: tableW - 30 - 78 - 78 - 92, align: "left", title: "Dokument" },
    { key: "datum", w: 78, align: "left", title: "Datum" },
    { key: "valuta", w: 78, align: "left", title: "Valuta" },
    { key: "iznos", w: 92, align: "right", title: "Iznos (KM)" },
  ];
  const headH = 18;
  page.drawRectangle({
    x: M,
    y: y - headH,
    width: tableW,
    height: headH,
    color: rgb(0.93, 0.92, 0.89),
  });
  let cx = M;
  for (const c of cols) {
    draw(c.title, cx + 3, y - headH + 5.5, {
      font: bold,
      size: 8,
      align: c.align,
      width: c.w - 6,
    });
    cx += c.w;
  }
  y -= headH;
  hr(y);

  const rowH = 15;
  let ukupno = 0;
  rows.forEach((r, idx) => {
    ukupno += r.iznos || 0;
    let x = M;
    const vals = {
      rb: `${idx + 1}.`,
      broj: r.broj,
      datum: fmtDate(r.datum),
      valuta: r.valuta ? fmtDate(r.valuta) : "",
      iznos: fmt2(r.iznos),
    };
    for (const c of cols) {
      let t = String(vals[c.key] ?? "");
      while (t.length > 1 && reg.widthOfTextAtSize(t, 8.5) > c.w - 8) {
        t = t.slice(0, -1);
      }
      draw(t, x + 3, y - rowH + 4.5, {
        size: 8.5,
        align: c.align,
        width: c.w - 6,
      });
      x += c.w;
    }
    y -= rowH;
    hr(y, 0.4);
  });
  draw("UKUPAN DUG:", M, y - rowH + 4.5, {
    font: bold,
    size: 9,
    align: "right",
    width: tableW - 92 - 6,
  });
  draw(fmt2(ukupno), M + tableW - 92, y - rowH + 4.5, {
    font: bold,
    size: 9,
    align: "right",
    width: 92 - 6,
  });
  y -= rowH;
  hr(y, 0.9);
  y -= 18;

  pasus(
    `Molimo da ukupan iznos od ${fmt2(ukupno)} KM uplatite u roku od ${rok} ` +
      `dana od dana prijema ove opomene` +
      (org.bankAccount
        ? `, na naš transakcijski račun ${org.bankAccount}`
        : "") +
      `, uz poziv na broj računa iz tabele.`,
  );
  y -= 6;
  if (nivo === 2) {
    pasus(
      "Ukoliko obaveze ne izmirite u navedenom roku, bit ćemo prinuđeni " +
        "potraživanje ostvariti sudskim putem, uz obračun zakonske zatezne " +
        "kamate i troškova postupka, bez ponovnog upozorenja.",
      { font: bold },
    );
  } else {
    pasus(
      "Na dospjele obaveze zadržavamo pravo obračuna zakonske zatezne " +
        "kamate. Za dogovor oko plaćanja ili reklamaciju slobodno nas " +
        "kontaktirajte.",
    );
  }
  y -= 6;
  pasus(
    "Ako ste navedene obaveze izmirili u međuvremenu, molimo da ovu " +
      "opomenu smatrate bespredmetnom.",
    { size: 8.5 },
  );
  y -= 34;

  // potpis desno
  const potW = 190;
  page.drawLine({
    start: { x: M + tableW - potW, y },
    end: { x: M + tableW, y },
    thickness: 0.7,
    color: INK,
  });
  draw(`Za ${org.name || "povjerioca"} (M.P. i potpis)`, M + tableW - potW, y - 13, {
    size: 8.5,
    align: "center",
    width: potW,
    color: MUTED,
  });

  draw(
    `${naslov.charAt(0)}${naslov.slice(1).toLowerCase()} · ispis ${fmtDate(new Date().toISOString())} · poreznikalkulator.ba`,
    M,
    M - 18,
    { size: 7.5, color: MUTED },
  );

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

module.exports = { buildKarticaPdf, buildIosPdf, buildOpomenaPdf };
