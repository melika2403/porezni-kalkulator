// Pomoćni PDF obrasca P PDV: raspored prati zvanični obrazac (dvije kolone
// IZLAZI/ULAZI, sekcije I-III, polje 80, potpis), crno-bijeli. Vrijednosti
// se sa njega ručno unose na UINO e-portal, pa ne mora biti piksel-identičan.
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { fmtIznos, lastDayOfPeriod, type PdvPrijava } from "./pdvObracun";

const A4: [number, number] = [595.28, 841.89];
const ML = 48; // lijeva margina
const MR = A4[0] - 48; // desna ivica sadržaja
const INK = rgb(0.05, 0.05, 0.05);
const MUTED = rgb(0.42, 0.42, 0.42);
const LINE = rgb(0.65, 0.65, 0.65);

// kolone: label | [broj] | kutija sa iznosom
const COL = {
  L: { label: ML, broj: 186, box: 208, boxW: 92 },
  R: { label: 318, broj: 442, box: 464, boxW: 84 },
} as const;

type Ctx = { page: PDFPage; font: PDFFont };

function drawText(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  { size = 9, color = INK } = {},
) {
  ctx.page.drawText(s, { x, y, size, font: ctx.font, color });
}

function drawRight(
  ctx: Ctx,
  s: string,
  rightX: number,
  y: number,
  { size = 9, color = INK } = {},
) {
  const w = ctx.font.widthOfTextAtSize(s, size);
  ctx.page.drawText(s, { x: rightX - w, y, size, font: ctx.font, color });
}

/** Polje obrasca: label (do 2 reda), broj polja i kutija sa iznosom. */
function fieldCell(
  ctx: Ctx,
  col: "L" | "R",
  y: number,
  broj: string,
  label: string[],
  value: number,
  { bold = false }: { bold?: boolean } = {},
) {
  const c = COL[col];
  const size = bold ? 9.5 : 8.5;
  label.forEach((l, i) => drawText(ctx, l, c.label, y + 4 - i * 10, { size: 8.5 }));
  drawText(ctx, broj, c.broj, y + 1, { size: 10.5 });
  ctx.page.drawRectangle({
    x: c.box,
    y: y - 4,
    width: c.boxW,
    height: 17,
    borderColor: INK,
    borderWidth: 0.9,
  });
  drawRight(ctx, fmtIznos(value), c.box + c.boxW - 5, y + 0.5, { size });
}

function sectionBar(ctx: Ctx, y: number, title: string) {
  ctx.page.drawLine({
    start: { x: ML, y: y + 15 },
    end: { x: MR, y: y + 15 },
    thickness: 0.7,
    color: LINE,
  });
  drawText(ctx, title, ML, y, { size: 10.5 });
}

export async function buildPdvPrijavaPdf(
  p: PdvPrijava,
  { povrat = false }: { povrat?: boolean } = {},
  // za testiranje van browsera: bajtovi fonta se mogu ubrizgati umjesto fetch-a
  assets?: { fontBytes: ArrayBuffer },
): Promise<Uint8Array> {
  const fontBytes: ArrayBuffer = assets
    ? assets.fontBytes
    : await fetch("/templates/arial.ttf").then((r) => r.arrayBuffer());
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  const page = doc.addPage(A4);
  const ctx: Ctx = { page, font };

  // ── Zaglavlje ──
  drawRight(ctx, "Obrazac P PDV", MR, A4[1] - 44, { size: 10 });
  const titleW = font.widthOfTextAtSize("PDV PRIJAVA", 16);
  drawText(ctx, "PDV PRIJAVA", (A4[0] - titleW) / 2, A4[1] - 70, { size: 16 });

  // lijevi blok: obveznik
  let y = A4[1] - 108;
  drawText(ctx, "Naziv poreskog obveznika:", ML, y, { size: 8, color: MUTED });
  drawText(ctx, p.org.naziv || "-", ML, y - 13, { size: 9.5 });
  y -= 34;
  drawText(ctx, "Adresa:", ML, y, { size: 8, color: MUTED });
  drawText(ctx, p.org.adresa || "-", ML, y - 13, { size: 9.5 });
  y -= 34;
  drawText(ctx, "Mjesto:", ML, y, { size: 8, color: MUTED });
  drawText(ctx, p.org.mjesto || "-", ML, y - 13, { size: 9.5 });

  // desni blok: ID broj (12 kućica) + period
  const idX = 330;
  drawText(ctx, "Identifikacioni broj:", idX, A4[1] - 108, {
    size: 8,
    color: MUTED,
  });
  const digits = (p.org.pdvBroj || "").replace(/\D+/g, "").slice(0, 12);
  const cell = 18;
  for (let i = 0; i < 12; i++) {
    const x = idX + i * cell;
    page.drawRectangle({
      x,
      y: A4[1] - 130,
      width: cell,
      height: 17,
      borderColor: INK,
      borderWidth: 0.9,
    });
    const d = digits[i];
    if (d) {
      const w = font.widthOfTextAtSize(d, 10);
      drawText(ctx, d, x + cell / 2 - w / 2, A4[1] - 126, { size: 10 });
    }
  }
  drawText(ctx, "Period:", idX, A4[1] - 150, { size: 8, color: MUTED });
  drawText(
    ctx,
    `1. ${p.month}. ${p.year}. - ${lastDayOfPeriod(p.month, p.year).replace(
      /^0/,
      "",
    )}`,
    idX,
    A4[1] - 164,
    { size: 9.5 },
  );

  // ── I. Isporuke i nabavke ──
  let sy = A4[1] - 208;
  sectionBar(ctx, sy, "I. Isporuke i nabavke (svi iznosi iskazani bez PDV-a)");
  drawText(ctx, "IZLAZI", COL.L.box + 25, sy - 16, { size: 8, color: MUTED });
  drawText(ctx, "ULAZI", COL.R.box + 25, sy - 16, { size: 8, color: MUTED });
  let ry = sy - 42;
  fieldCell(ctx, "L", ry, "11", ["Isporuke (uklj. vanposlovne", "svrhe), osim polja 12 i 13:"], p.p11);
  fieldCell(ctx, "R", ry, "21", ["Sve nabavke, osim", "polja 22 i 23:"], p.p21);
  ry -= 34;
  fieldCell(ctx, "L", ry, "12", ["Vrijednost izvoza:"], p.p12);
  fieldCell(ctx, "R", ry, "22", ["Vrijednost uvoza:"], p.p22);
  ry -= 34;
  fieldCell(ctx, "L", ry, "13", ["Isporuke oslobođene", "plaćanja PDV-a:"], p.p13);
  fieldCell(ctx, "R", ry, "23", ["Nabavke od", "poljoprivrednika:"], p.p23);

  // ── II. Izlazni / ulazni PDV ──
  sy = ry - 34;
  sectionBar(ctx, sy, "II. Izlazni PDV");
  drawRight(ctx, "Ulazni PDV", MR, sy, { size: 10.5 });
  ry = sy - 26;
  fieldCell(ctx, "R", ry, "41", ["Od registrovanih obveznika,", "osim polja 42 i 43:"], p.p41);
  ry -= 34;
  fieldCell(ctx, "R", ry, "42", ["PDV na uvoz:"], p.p42);
  ry -= 34;
  fieldCell(ctx, "R", ry, "43", ["Paušalna naknada za", "poljoprivrednike:"], p.p43);
  ry -= 34;
  fieldCell(ctx, "L", ry, "51", ["PDV obračunat na izlaze", "(dobra i usluge):"], p.p51, { bold: true });
  fieldCell(ctx, "R", ry, "61", ["Ulazni PDV (ukupno):"], p.p61, { bold: true });

  // ── 71 + 80 ──
  ry -= 44;
  fieldCell(ctx, "L", ry, "71", ["Iznos PDV-a za uplatu/povrat,", "razlika polja 51 i 61:"], p.p71, { bold: true });
  drawText(ctx, "Zahtjev za povrat", COL.R.label, ry + 4, { size: 8.5 });
  drawText(ctx, "80", COL.R.broj, ry + 1, { size: 10.5 });
  page.drawRectangle({
    x: COL.R.box,
    y: ry - 4,
    width: 17,
    height: 17,
    borderColor: INK,
    borderWidth: 0.9,
  });
  if (povrat) {
    const w = font.widthOfTextAtSize("X", 11);
    drawText(ctx, "X", COL.R.box + 8.5 - w / 2, ry, { size: 11 });
  }
  drawText(ctx, "obilježite sa 'X'", COL.R.box + 23, ry + 4, {
    size: 7,
    color: MUTED,
  });
  drawText(ctx, "ako želite povrat", COL.R.box + 23, ry - 4, {
    size: 7,
    color: MUTED,
  });

  // ── III. Krajnja potrošnja ──
  sy = ry - 34;
  sectionBar(ctx, sy, "III. Podaci o krajnjoj potrošnji");
  drawText(
    ctx,
    "PDV na isporuke licima koja nisu registrovani PDV obveznici u:",
    ML,
    sy - 17,
    { size: 8.5 },
  );
  ry = sy - 42;
  fieldCell(ctx, "L", ry, "32", ["Federaciji BiH:"], p.kp32);
  ry -= 30;
  fieldCell(ctx, "L", ry, "33", ["Republici Srpskoj:"], p.kp33);
  ry -= 30;
  fieldCell(ctx, "L", ry, "34", ["Brčko distriktu:"], p.kp34);

  // ── Potpis ──
  let fy = ry - 40;
  drawText(ctx, "Ovim potvrđujem da su navedeni podaci tačni.", ML, fy, {
    size: 9,
  });
  fy -= 28;
  drawText(ctx, `Mjesto:  ${p.org.mjesto || "____________"}`, ML, fy, {
    size: 9.5,
  });
  drawText(ctx, "Ime i prezime odgovornog lica: ____________________", 318, fy, {
    size: 9.5,
  });
  fy -= 22;
  drawText(ctx, `Datum:  ${lastDayOfPeriod(p.month, p.year)}`, ML, fy, {
    size: 9.5,
  });
  drawText(ctx, "Potpis: ____________________", 318, fy, { size: 9.5 });

  // ── Napomene ──
  fy -= 34;
  const napomene = [
    p.p71 >= 0
      ? "Polje 71: obavezu uplatiti na Jedinstveni račun UINO najkasnije do 10. u mjesecu."
      : "Polje 71 (negativno): porezni kredit; uz polje 80 (X) podnosi se zahtjev za povrat.",
    p.pdvNeodbitni > 0.005
      ? `Neodbitni ulazni PDV (nije u poljima 41/61): ${fmtIznos(p.pdvNeodbitni)} KM.`
      : null,
    "Pomoćni obrazac, obračunat automatski iz KUF/KIF; vrijednosti unijeti na e-porezi.uino.gov.ba.",
  ].filter(Boolean) as string[];
  for (const n of napomene) {
    drawText(ctx, `• ${n}`, ML, fy, { size: 8, color: MUTED });
    fy -= 12;
  }

  return doc.save();
}

export async function downloadPdvPrijava(
  p: PdvPrijava,
  opts: { povrat?: boolean } = {},
) {
  const bytes = await buildPdvPrijavaPdf(p, opts);
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PDV-prijava-${String(p.month).padStart(2, "0")}-${p.year}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
