// ─────────────────────────────────────────────────────────────────────────────
//  Mjesečni izvještaj kampanje partnera (banke) - PDF
//  Jedna A4 strana: zaglavlje u boji brenda, ključne brojke uz promjenu u
//  odnosu na prethodni mjesec, prikazi po danu (stupci), tabele po poziciji,
//  stranici i kreativi, i napomena kako se broji. Partner ga preuzima sa
//  stranice Izvještaji u portalu (nema automatskog slanja).
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { NAZIVI_POZICIJA, NAZIVI_STRANICA } = require("../config/reklame");

const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");
const FONT_REG = path.join(FONTS_DIR, "arial.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "arialbd.ttf");

const INK = rgb(0.1, 0.12, 0.1);
const MUTED = rgb(0.43, 0.47, 0.44);
const LINE = rgb(0.89, 0.87, 0.83);
const ZEBRA = rgb(0.98, 0.97, 0.955);

const MJESECI = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

function hexURgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return rgb(0.85, 0.14, 0.18);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// boja pomiješana sa bijelom (udio 0..1 boje), za blijedu podlogu
function blijeda(c, udio) {
  return rgb(
    1 - (1 - c.red) * udio,
    1 - (1 - c.green) * udio,
    1 - (1 - c.blue) * udio,
  );
}

function broj(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function ctr(prikazi, klikovi) {
  if (!prikazi) return "–";
  return `${((klikovi / prikazi) * 100).toFixed(2).replace(".", ",")} %`;
}

function postotak(dio, cijelo) {
  if (!cijelo) return "–";
  return `${Math.round((dio / cijelo) * 100)} %`;
}

function promjena(sada, prije) {
  if (!prije) return sada ? "prošli mjesec bez podataka" : "bez promjene";
  const pct = Math.round(((sada - prije) / prije) * 100);
  return `${pct > 0 ? "+" : ""}${pct} % od prošlog mjeseca`;
}

function datumHr(iso) {
  const [g, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}.${m}.${g}.`;
}

/**
 * @param {object} p
 * @param {string} p.mjesec      "2026-09"
 * @param {string} p.brend       naziv brenda (iz zadnje kreative)
 * @param {string} p.boja        boja brenda #rrggbb
 * @param {object} p.podaci      rezultat podaciPregleda (reklameController)
 * @returns {Promise<Buffer>}
 */
async function buildPartnerIzvjestajPdf({ mjesec, brend, boja, podaci }) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const reg = await doc.embedFont(fs.readFileSync(FONT_REG), { subset: true });
  const bold = await doc.embedFont(fs.readFileSync(FONT_BOLD), { subset: true });

  const W = 595.28;
  const H = 841.89;
  const M = 40;
  const sirina = W - 2 * M;
  const brendBoja = hexURgb(boja);

  const page = doc.addPage([W, H]);
  const tekst = (t, x, y, { font = reg, size = 9, color = INK, align = "left", width = 0 } = {}) => {
    const s = String(t ?? "");
    let tx = x;
    if (align === "right") tx = x + width - font.widthOfTextAtSize(s, size);
    else if (align === "center") tx = x + (width - font.widthOfTextAtSize(s, size)) / 2;
    page.drawText(s, { x: tx, y, size, font, color });
  };
  const skrati = (t, font, size, max) => {
    let s = String(t ?? "");
    if (font.widthOfTextAtSize(s, size) <= max) return s;
    while (s.length > 1 && font.widthOfTextAtSize(`${s}...`, size) > max) s = s.slice(0, -1);
    return `${s}...`;
  };

  // ── Zaglavlje u boji brenda ──
  const [g, m] = mjesec.split("-").map(Number);
  page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: brendBoja });
  tekst("IZVJEŠTAJ KAMPANJE", M, H - 34, { font: bold, size: 9, color: rgb(1, 1, 1) });
  tekst(brend || "Partner", M, H - 58, { font: bold, size: 20, color: rgb(1, 1, 1) });
  tekst(`${MJESECI[m - 1]} ${g}.`, M, H - 80, { size: 11, color: rgb(1, 1, 1) });
  tekst("Porezni kalkulator BiH", M, H - 34, {
    font: bold,
    size: 10,
    color: rgb(1, 1, 1),
    align: "right",
    width: sirina,
  });
  tekst("poreznikalkulator.ba", M, H - 50, { size: 9, color: rgb(1, 1, 1), align: "right", width: sirina });
  tekst(`Period: ${datumHr(podaci.od)} do ${datumHr(podaci.do)}`, M, H - 80, {
    size: 9,
    color: rgb(1, 1, 1),
    align: "right",
    width: sirina,
  });

  // ── Ključne brojke ──
  const u = podaci.ukupno;
  const pr = podaci.prethodno;
  const kpi = [
    ["Prikazi", broj(u.prikazi), promjena(u.prikazi, pr.prikazi)],
    ["Klikovi", broj(u.klikovi), promjena(u.klikovi, pr.klikovi)],
    ["CTR", ctr(u.prikaziSaLinkom, u.klikovi), "pozicije sa linkom"],
    ["Posjetioci", broj(u.jedinstveni), "jedinstveni, zbir po danima"],
    ["Mobitel", postotak(u.prikaziMob, u.prikazi), "udio prikaza sa mobitela"],
  ];
  let y = H - 120;
  const kpiW = (sirina - 4 * 8) / 5;
  kpi.forEach(([naziv, vrijednost, opis], i) => {
    const x = M + i * (kpiW + 8);
    page.drawRectangle({
      x,
      y: y - 62,
      width: kpiW,
      height: 62,
      color: blijeda(brendBoja, 0.07),
      borderColor: blijeda(brendBoja, 0.3),
      borderWidth: 0.8,
    });
    tekst(naziv, x + 9, y - 15, { font: bold, size: 8, color: MUTED });
    tekst(vrijednost, x + 9, y - 36, { font: bold, size: 16 });
    tekst(skrati(opis, reg, 6.5, kpiW - 14), x + 9, y - 52, { size: 6.5, color: MUTED });
  });
  y -= 84;

  // ── Prikazi po danu (stupci) ──
  tekst("Prikazi i klikovi po danu", M, y, { font: bold, size: 11 });
  y -= 10;
  const grafH = 110;
  const dani = podaci.poDanu.map((d) => {
    const z = Object.values(d.pozicije || {}).reduce(
      (s, v) => ({ prikazi: s.prikazi + v.prikazi, klikovi: s.klikovi + v.klikovi }),
      { prikazi: 0, klikovi: 0 },
    );
    return { datum: d.datum, ...z };
  });
  const maks = Math.max(1, ...dani.map((d) => d.prikazi));
  const maksK = Math.max(1, ...dani.map((d) => d.klikovi));
  const dno = y - grafH;
  page.drawLine({ start: { x: M, y: dno }, end: { x: M + sirina, y: dno }, thickness: 0.6, color: LINE });
  const korak = sirina / Math.max(1, dani.length);
  dani.forEach((d, i) => {
    const h = (d.prikazi / maks) * (grafH - 14);
    const x = M + i * korak + korak * 0.18;
    const w = korak * 0.64;
    if (h > 0) page.drawRectangle({ x, y: dno, width: w, height: h, color: blijeda(brendBoja, 0.35) });
    const dan = Number(d.datum.slice(8, 10));
    if (dan === 1 || dan % 5 === 0) {
      tekst(`${d.datum.slice(8, 10)}.${d.datum.slice(5, 7)}.`, M + i * korak, dno - 10, {
        size: 6.5,
        color: MUTED,
        align: "center",
        width: korak,
      });
    }
  });
  // klikovi: linija na vlastitoj skali (na skali prikaza bi bili nevidljivi)
  const tacke = dani.map((d, i) => ({
    x: M + i * korak + korak / 2,
    y: dno + (d.klikovi / maksK) * (grafH - 14),
  }));
  for (let i = 1; i < tacke.length; i++) {
    page.drawLine({ start: tacke[i - 1], end: tacke[i], thickness: 1.4, color: brendBoja });
  }
  for (const t of tacke) page.drawCircle({ x: t.x, y: t.y, size: 1.6, color: brendBoja });
  tekst(`najviše ${broj(maks)} prikaza i ${broj(maksK)} klikova u danu`, M, y, {
    size: 7,
    color: MUTED,
    align: "right",
    width: sirina,
  });
  // legenda
  page.drawRectangle({ x: M, y: dno - 26, width: 8, height: 8, color: blijeda(brendBoja, 0.35) });
  tekst("prikazi", M + 12, dno - 25, { size: 7, color: MUTED });
  page.drawLine({ start: { x: M + 50, y: dno - 22 }, end: { x: M + 60, y: dno - 22 }, thickness: 1.4, color: brendBoja });
  tekst("klikovi (svoja skala)", M + 64, dno - 25, { size: 7, color: MUTED });
  y = dno - 46;

  // ── Tabele ──
  function tabela(naslov, redovi, sirinaT, xT) {
    let yy = y;
    tekst(naslov, xT, yy, { font: bold, size: 11 });
    yy -= 16;
    const k = [sirinaT - 150, 50, 50, 50];
    const zaglavlje = ["", "Prikazi", "Klikovi", "CTR"];
    page.drawRectangle({ x: xT, y: yy - 4, width: sirinaT, height: 15, color: blijeda(brendBoja, 0.08) });
    let x = xT;
    zaglavlje.forEach((z, i) => {
      tekst(z, x + 4, yy, { font: bold, size: 7.5, color: MUTED, align: i ? "right" : "left", width: k[i] - 8 });
      x += k[i];
    });
    yy -= 15;
    if (redovi.length === 0) {
      tekst("Nema prikaza u ovom mjesecu.", xT + 4, yy, { size: 8, color: MUTED });
      return yy - 14;
    }
    redovi.forEach((r, ri) => {
      if (ri % 2 === 1) page.drawRectangle({ x: xT, y: yy - 4, width: sirinaT, height: 14, color: ZEBRA });
      const vr = [
        skrati(r.naziv, reg, 8, k[0] - 8),
        broj(r.prikazi),
        r.brending ? "–" : broj(r.klikovi),
        r.brending ? "brending" : ctr(r.prikaziSaLinkom ?? r.prikazi, r.klikovi),
      ];
      let xx = xT;
      vr.forEach((v, i) => {
        tekst(v, xx + 4, yy, { size: 8, font: i === 1 ? bold : reg, align: i ? "right" : "left", width: k[i] - 8 });
        xx += k[i];
      });
      yy -= 14;
    });
    page.drawLine({ start: { x: xT, y: yy + 9 }, end: { x: xT + sirinaT, y: yy + 9 }, thickness: 0.5, color: LINE });
    return yy - 8;
  }

  // dugme za preuzimanje nema link na partnera: brending, bez CTR-a
  const bezLinka = (poz) => poz === "DUGME";
  const zbirPo = (lista, kljuc, naziv) => {
    const mapa = new Map();
    for (const r of lista) {
      const z = mapa.get(r[kljuc]) ?? {
        naziv: naziv(r),
        prikazi: 0,
        klikovi: 0,
        prikaziSaLinkom: 0,
        brending: true,
      };
      z.prikazi += r.prikazi;
      z.klikovi += r.klikovi;
      if (!bezLinka(r.pozicija)) {
        z.prikaziSaLinkom += r.prikazi;
        z.brending = false;
      }
      mapa.set(r[kljuc], z);
    }
    return [...mapa.values()].sort((a, b) => b.prikazi - a.prikazi);
  };

  const poPoziciji = zbirPo(podaci.poPoziciji, "pozicija", (r) => NAZIVI_POZICIJA[r.pozicija] ?? r.pozicija);
  const poStranici = (podaci.poStranici || []).map((r) => ({
    naziv: NAZIVI_STRANICA[r.stranica] ?? r.stranica,
    prikazi: r.prikazi,
    klikovi: r.klikovi,
    prikaziSaLinkom: r.prikaziSaLinkom,
    brending: !r.prikaziSaLinkom,
  }));
  const poKreativi = zbirPo(podaci.poPoziciji, "reklamaId", (r) => r.naziv || `Kreativa ${r.reklamaId}`);

  const pola = (sirina - 16) / 2;
  const startY = y;
  const yLijevo = tabela("Po poziciji", poPoziciji.slice(0, 8), pola, M);
  y = startY;
  const yDesno = tabela("Po stranici", poStranici.slice(0, 8), pola, M + pola + 16);
  y = Math.min(yLijevo, yDesno) - 6;
  y = tabela("Po kreativi", poKreativi.slice(0, 8), sirina, M);

  // ── Napomena o mjerenju ──
  const napomene = [
    "Prikaz se broji kad je kreativa bar napola vidljiva na ekranu najmanje 1 sekundu (IAB standard vidljivosti).",
    "Botovi, alati za pregled linkova i pristupi našeg tima i partnera se ne broje.",
    "Jedinstveni posjetioci se broje bez kolačića, dnevnim anonimnim ključem: zbir je zbir dnevnih brojeva.",
    "Klik vodi na link partnera sa UTM oznakama (utm_source=poreznikalkulator.ba), pa je vidljiv i u vašoj analitici.",
    "CTR se računa samo za pozicije sa linkom: dugme za preuzimanje je brending (klik na njega preuzima obrazac).",
  ];
  let yn = Math.max(y - 10, 70);
  page.drawLine({ start: { x: M, y: yn + 12 }, end: { x: M + sirina, y: yn + 12 }, thickness: 0.5, color: LINE });
  tekst("Kako brojimo", M, yn, { font: bold, size: 8, color: MUTED });
  yn -= 11;
  for (const n of napomene) {
    tekst(n, M, yn, { size: 7, color: MUTED });
    yn -= 10;
  }
  const danas = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Sarajevo" });
  tekst(`Izvještaj napravljen ${datumHr(danas)}`, M, 28, { size: 7, color: MUTED });
  tekst("Porezni kalkulator BiH · poreznikalkulator.ba", M, 28, {
    size: 7,
    color: MUTED,
    align: "right",
    width: sirina,
  });

  return Buffer.from(await doc.save());
}

module.exports = { buildPartnerIzvjestajPdf };
