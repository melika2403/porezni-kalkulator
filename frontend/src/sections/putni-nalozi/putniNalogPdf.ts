// PDF putnog naloga: prva sekcija je nalog za službeno putovanje (ko, kuda,
// zašto, čime, kada, akontacija) sa potpisom odgovornog lica, druga je
// obračun putnih troškova (dnevnice + stvarni troškovi, za isplatu i
// slovima) sa potpisima, plus prostor za izvještaj sa puta.
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Organization } from "src/api/profile";
import type { PutniNalog } from "src/api/putniNalozi";
import { iznosUSlova } from "src/sections/ugovor-o-djelu/iznosSlovima";

const A4: [number, number] = [595.28, 841.89];
const M = 42;
const INK = rgb(0, 0, 0);

const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const datumHr = (iso: string | null) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
};

export async function downloadPutniNalogPdf(
  n: PutniNalog,
  org: Organization,
) {
  const fontBytes = await fetch("/templates/arial.ttf").then((r) =>
    r.arrayBuffer(),
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  let page = doc.addPage(A4);
  let y = A4[1] - M - 10;

  // nova stranica kad ponestane mjesta (dug izvještaj ne smije gurnuti
  // tekst i potpise van stranice)
  const ensureSpace = (needed: number) => {
    if (y - needed < M) {
      page = doc.addPage(A4);
      y = A4[1] - M - 10;
    }
  };

  const text = (t: string, x: number, s: number, bold = false) => {
    page.drawText(t, { x, y, size: s, font, color: INK });
    if (bold) page.drawText(t, { x: x + 0.3, y, size: s, font, color: INK });
  };
  const hr = (thickness = 0.7) => {
    page.drawLine({
      start: { x: M, y },
      end: { x: A4[0] - M, y },
      thickness,
      color: INK,
    });
  };
  const red = (label: string, value: string, labelW = 160) => {
    text(label, M, 9);
    text(value, M + labelW, 10, true);
    y -= 8;
    page.drawLine({
      start: { x: M + labelW - 5, y },
      end: { x: A4[0] - M, y },
      thickness: 0.5,
      color: INK,
    });
    y -= 17;
  };

  // zaglavlje obrta
  text(org.name, M, 11, true);
  y -= 13;
  const adresa = [org.address, org.city].filter(Boolean).join(", ");
  if (adresa) {
    text(adresa, M, 8.5);
    y -= 11;
  }
  if (org.taxNumber) {
    text(`ID broj: ${org.taxNumber}`, M, 8.5);
    y -= 11;
  }
  y -= 12;

  const title = `PUTNI NALOG broj ${n.oznaka}`;
  const tw = font.widthOfTextAtSize(title, 13);
  text(title, (A4[0] - tw) / 2, 13, true);
  y -= 13;
  const sub = `Datum izdavanja: ${datumHr(n.datum)}`;
  const sw = font.widthOfTextAtSize(sub, 9);
  text(sub, (A4[0] - sw) / 2, 9);
  y -= 16;
  hr(1);
  y -= 20;

  red("Ime i prezime:", n.radnikIme);
  red("Relacija (odredište):", n.relacija);
  red("Svrha putovanja:", n.svrha);
  red("Prevozno sredstvo:", n.prevoznoSredstvo || "");
  red(
    "Polazak:",
    `${datumHr(n.polazakDatum)}${n.polazakVrijeme ? ` u ${n.polazakVrijeme} h` : ""}`,
  );
  red(
    "Povratak:",
    `${datumHr(n.povratakDatum)}${n.povratakVrijeme ? ` u ${n.povratakVrijeme} h` : ""}`,
  );
  red("Isplaćena akontacija:", `${km(n.akontacija)} KM`);

  y -= 8;
  text(
    "Nalogodavac (odgovorno lice): ________________________",
    A4[0] - M - 280,
    9,
  );
  y -= 26;

  // obračun
  const t2 = "OBRAČUN PUTNIH TROŠKOVA";
  const t2w = font.widthOfTextAtSize(t2, 11);
  text(t2, (A4[0] - t2w) / 2, 11, true);
  y -= 14;
  hr(1);
  y -= 18;

  red(
    "Dnevnice:",
    `${n.brojDnevnica.toLocaleString("de-DE")} x ${km(n.dnevnicaIznos)} KM = ${km(n.ukupnoDnevnice)} KM`,
    180,
  );
  red("Troškovi prevoza:", `${km(n.troskoviPrevoza)} KM`, 180);
  red("Troškovi smještaja:", `${km(n.troskoviSmjestaja)} KM`, 180);
  red(
    `Ostali troškovi${n.ostaloOpis ? ` (${n.ostaloOpis})` : ""}:`,
    `${km(n.ostaliTroskovi)} KM`,
    180,
  );
  red("UKUPNO:", `${km(n.ukupno)} KM`, 180);
  red("Minus akontacija:", `${km(n.akontacija)} KM`, 180);
  red(
    n.zaIsplatu >= 0 ? "ZA ISPLATU:" : "ZA POVRAT U BLAGAJNU:",
    `${km(Math.abs(n.zaIsplatu))} KM`,
    180,
  );
  red("Slovima:", iznosUSlova(Math.abs(n.zaIsplatu)), 180);

  y -= 4;
  text(
    "Uz obračun se prilažu računi (cestarine, parking, karte, smještaj i dr.).",
    M,
    8,
  );
  y -= 20;

  // izvještaj sa puta
  text("Izvještaj sa službenog putovanja:", M, 9, true);
  y -= 16;
  if (n.izvjestaj) {
    // grubi prelom teksta izvještaja
    const words = n.izvjestaj.split(/\s+/);
    let line = "";
    for (const w of words) {
      const probe = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(probe, 9) > A4[0] - 2 * M) {
        ensureSpace(13);
        text(line, M, 9);
        y -= 13;
        line = w;
      } else {
        line = probe;
      }
    }
    if (line) {
      ensureSpace(13);
      text(line, M, 9);
      y -= 13;
    }
    y -= 8;
  } else {
    for (let i = 0; i < 3; i++) {
      page.drawLine({
        start: { x: M, y },
        end: { x: A4[0] - M, y },
        thickness: 0.5,
        color: INK,
      });
      y -= 20;
    }
  }

  // potpisi (na novu stranicu ako nema mjesta za liniju + labelu)
  ensureSpace(40);
  y -= 26;
  const potpis = (label: string, x: number) => {
    page.drawLine({
      start: { x, y },
      end: { x: x + 150, y },
      thickness: 0.7,
      color: INK,
    });
    const lw = font.widthOfTextAtSize(label, 8.5);
    page.drawText(label, {
      x: x + (150 - lw) / 2,
      y: y - 12,
      size: 8.5,
      font,
      color: INK,
    });
  };
  potpis("Podnosilac obračuna", M);
  potpis("Odgovorno lice", A4[0] - M - 150);

  const bytes = await doc.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Putni-nalog-${n.broj}-${String(n.godina).slice(-2)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
