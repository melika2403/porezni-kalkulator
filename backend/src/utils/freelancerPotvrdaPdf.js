// ─────────────────────────────────────────────────────────────────────────────
//  PK Freelancer: Pregled prihoda iz inostranstva za godinu (PDF)
//  Za banku, ambasadu ili stanodavca: podaci o osobi, tabela svih uplata sa
//  obračunatim zdravstvenim i porezom, zbirovi, napomena da je izvor evidencija
//  korisnika (NIJE zvanična potvrda Porezne uprave), datum i potpis.
//  Stil i helperi po uzoru na karticaPdf.js (pdf-lib + Arial za naša slova).
// ─────────────────────────────────────────────────────────────────────────────
const { PDFDocument, rgb } = require("pdf-lib");
const { embedFonts } = require("./payslipPdf");

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.45, 0.42);
const LINE = rgb(0.78, 0.76, 0.72);
const HEAD_BG = rgb(0.93, 0.92, 0.89);

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

const STATUS_TEKST = {
  OBRACUNATO: "obračunato",
  PLACENO: "plaćeno",
  PREDANO: "predano",
};

/**
 * @param {object} input
 * @param {{ime:string,jmbg:string,adresa:string}} input.osoba
 * @param {number} input.godina
 * @param {Array<object>} input.rows  uplate (toPublic oblik), hronološki
 * @param {Date} [input.generisano]
 * @returns {Promise<Buffer>}
 */
async function buildPotvrdaPdf({ osoba, godina, rows, generisano = new Date() }) {
  const doc = await PDFDocument.create();
  const { reg, bold } = await embedFonts(doc);

  const PAGE = { w: 595.28, h: 841.89 };
  const M = 42;
  const tableW = PAGE.w - 2 * M;

  const cols = [
    { key: "rb", w: 22, align: "right", title: "Rb" },
    { key: "datum", w: 58, align: "left", title: "Datum" },
    { key: "isplatilac", w: tableW - 22 - 58 - 56 - 74 - 62 - 64 - 62, align: "left", title: "Isplatilac" },
    { key: "drzava", w: 56, align: "left", title: "Država" },
    { key: "iznos", w: 74, align: "right", title: "Iznos (KM)" },
    { key: "zdravstveno", w: 62, align: "right", title: "Zdrav. 4%" },
    { key: "porez", w: 64, align: "right", title: "Porez" },
    { key: "status", w: 62, align: "left", title: "AMS" },
  ];

  const title = `Pregled prihoda iz inostranstva za ${godina}. godinu`;

  let page = null;
  let y = 0;
  let pageNum = 0;

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

  function wrap(text, font, size, maxW) {
    const rijeci = String(text ?? "").split(/\s+/).filter(Boolean);
    const linije = [];
    let tekuca = "";
    for (const r of rijeci) {
      const proba = tekuca ? `${tekuca} ${r}` : r;
      if (font.widthOfTextAtSize(proba, size) <= maxW) tekuca = proba;
      else {
        if (tekuca) linije.push(tekuca);
        tekuca = r;
      }
    }
    if (tekuca) linije.push(tekuca);
    return linije;
  }

  function hr(yy, color = LINE, thickness = 0.5) {
    page.drawLine({ start: { x: M, y: yy }, end: { x: PAGE.w - M, y: yy }, thickness, color });
  }

  function tableHeader() {
    page.drawRectangle({ x: M, y: y - 18, width: tableW, height: 18, color: HEAD_BG });
    let cx = M;
    for (const c of cols) {
      drawText(c.title, cx + 3, y - 12.5, { font: bold, size: 8, align: c.align, width: c.w - 6 });
      cx += c.w;
    }
    y -= 18;
    hr(y, INK, 0.7);
  }

  function newPage() {
    page = doc.addPage([PAGE.w, PAGE.h]);
    pageNum += 1;
    y = PAGE.h - M;

    if (pageNum === 1) {
      drawText("poreznikalkulator.ba  ·  PK Freelancer", M, y - 10, {
        size: 8.5,
        color: MUTED,
        align: "right",
        width: tableW,
      });
      drawText(title, M, y - 40, { font: bold, size: 16, align: "center", width: tableW });
      drawText(
        "primljene uplate iz inostranstva i obračunate akontacije poreza po obrascu AMS-1035",
        M,
        y - 57,
        { size: 9.5, color: MUTED, align: "center", width: tableW },
      );

      // osoba
      let py = y - 92;
      const par = [
        ["Ime i prezime:", osoba.ime || ""],
        ["JMBG:", osoba.jmbg || ""],
        ["Adresa:", osoba.adresa || ""],
      ];
      for (const [k, v] of par) {
        drawText(k, M, py, { size: 10, color: MUTED });
        drawText(v, M + 90, py, { font: bold, size: 11 });
        py -= 15;
      }
      y = py - 8;
      tableHeader();
    } else {
      drawText(`${title} (nastavak)`, M, y - 12, { font: bold, size: 11 });
      y -= 26;
      tableHeader();
    }
  }

  function ensureSpace(need) {
    if (y - need < M + 40) newPage();
  }

  newPage();

  const rowH = 15;
  const sum = { iznos: 0, zdravstveno: 0, porez: 0, rashodi: 0, dohodak: 0, neto: 0 };
  rows.forEach((r, idx) => {
    ensureSpace(rowH);
    const vals = {
      rb: String(idx + 1),
      datum: fmtDate(r.datumPrimitka),
      isplatilac: truncate(
        r.valuta && r.valuta !== "BAM"
          ? `${r.isplatilacNaziv} (${fmt2(r.iznosValuta)} ${r.valuta})`
          : r.isplatilacNaziv,
        reg,
        8.5,
        cols[2].w - 6,
      ),
      drzava: truncate(r.isplatilacDrzava || "", reg, 8.5, cols[3].w - 6),
      iznos: fmt2(r.iznosKm),
      zdravstveno: fmt2(r.zdravstveno),
      porez: fmt2(r.razlika),
      status:
        r.status === "PREDANO" && r.datumPredaje
          ? `predan ${fmtDate(r.datumPredaje)}`
          : STATUS_TEKST[r.status] || "",
    };
    let cx = M;
    for (const c of cols) {
      drawText(vals[c.key], cx + 3, y - rowH + 4.5, { size: 8.5, align: c.align, width: c.w - 6 });
      cx += c.w;
    }
    y -= rowH;
    hr(y, LINE, 0.4);
    sum.iznos += Number(r.iznosKm) || 0;
    sum.zdravstveno += Number(r.zdravstveno) || 0;
    sum.porez += Number(r.razlika) || 0;
    sum.rashodi += Number(r.rashodi) || 0;
    sum.dohodak += Number(r.dohodak) || 0;
    sum.neto += Number(r.neto) || 0;
  });

  // UKUPNO red
  ensureSpace(rowH + 4);
  {
    const vals = {
      rb: "",
      datum: "",
      isplatilac: `UKUPNO (${rows.length} ${rows.length === 1 ? "uplata" : "uplata"})`,
      drzava: "",
      iznos: fmt2(sum.iznos),
      zdravstveno: fmt2(sum.zdravstveno),
      porez: fmt2(sum.porez),
      status: "",
    };
    let cx = M;
    for (const c of cols) {
      drawText(vals[c.key], cx + 3, y - rowH + 4.5, { font: bold, size: 8.5, align: c.align, width: c.w - 6 });
      cx += c.w;
    }
    y -= rowH;
    hr(y, INK, 0.9);
  }

  // rekapitulacija
  ensureSpace(140);
  y -= 22;
  drawText("Rekapitulacija", M, y, { font: bold, size: 11 });
  y -= 16;
  const rekap = [
    ["Ukupno primljeno (bruto)", sum.iznos],
    ["Normirani rashodi (20% / 30%)", sum.rashodi],
    ["Dohodak", sum.dohodak],
    ["Doprinos za zdravstveno osiguranje (4%)", sum.zdravstveno],
    ["Porez na dohodak (akontacija po odbitku)", sum.porez],
    ["Neto (bruto umanjen za zdravstveno i porez)", sum.neto],
  ];
  const kolW = 300;
  for (const [k, v] of rekap) {
    const jeNeto = k.startsWith("Neto");
    drawText(k, M, y, { size: 9.5, font: jeNeto ? bold : reg });
    drawText(`${fmt2(v)} KM`, M + kolW, y, { size: 9.5, font: jeNeto ? bold : reg, align: "right", width: 110 });
    y -= 14;
  }

  // napomena
  ensureSpace(90);
  y -= 8;
  const napomena =
    "Pregled je sačinjen na osnovu evidencije korisnika o primljenim uplatama iz inostranstva i obračunatim akontacijama poreza na dohodak po obrascu AMS-1035, vođene na poreznikalkulator.ba. Ovo nije zvanična potvrda Porezne uprave Federacije BiH; kao dokaz o prijavi i uplati služe ovjereni AMS-1035 obrasci i uplatnice.";
  for (const l of wrap(napomena, reg, 8.5, tableW)) {
    drawText(l, M, y, { size: 8.5, color: MUTED });
    y -= 11;
  }

  // datum i potpis
  ensureSpace(60);
  y -= 26;
  drawText(`Datum: ${fmtDate(generisano.toISOString())}`, M, y, { size: 9.5 });
  const potpisX = PAGE.w - M - 180;
  page.drawLine({ start: { x: potpisX, y: y - 2 }, end: { x: PAGE.w - M, y: y - 2 }, thickness: 0.6, color: INK });
  drawText("potpis", potpisX, y - 13, { size: 8, color: MUTED, align: "center", width: 180 });

  // podnožje sa brojem stranice
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    pg.drawText(
      `Stranica ${i + 1}/${pages.length}  ·  generisano ${fmtDate(generisano.toISOString())}  ·  poreznikalkulator.ba/freelancer`,
      { x: M, y: M - 18, size: 7.5, font: reg, color: MUTED },
    );
  });

  return Buffer.from(await doc.save());
}

module.exports = { buildPotvrdaPdf };
