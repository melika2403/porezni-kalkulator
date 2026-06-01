#!/usr/bin/env node
// Parses sifre-djelatnosti-fbih.txt (extracted from PDF) into a structured JSON
// containing area > oblast > grana > razred hierarchy with descriptions.
//
// Usage: node scripts/parse-kd-bih.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TXT = path.join(ROOT, "frontend/public/templates/sifre-djelatnosti-fbih.txt");
const OUT_TS = path.join(ROOT, "frontend/src/data/kd-bih-detailed.ts");

const raw = fs.readFileSync(TXT, "utf8").split(/\r?\n/);

// Section 4 starts after this line; everything before is metadata/Section 1-3.
const SECTION_4_RE = /^PODRU[ČC]JE A\s+[-–—]\s+POLJOPRIVREDA/;
let startIdx = raw.findIndex((l) => SECTION_4_RE.test(l));
if (startIdx < 0) throw new Error("Section 4 marker not found");

const lines = raw.slice(startIdx);

// Strip repeated page headers
const PAGE_HEADER = /^\s*Struktura KD BiH 2010 sa obja[šs]njenjima\s*$/;

// Match PODRUČJE X with any non-alphanumeric separator (-, –, —).
// For T the entire name line is garbled in PDF extraction, so we treat title as optional.
const AREA_RE = /^PODRU[ČC]JE\s+([A-U])(?:\s+[^\sA-Za-z0-9](.*))?$/;

// Hard-coded canonical names for areas whose title was mangled by PDF text extraction
// (T has unrecoverable garbling; E has a replacement char in the separator).
const CANONICAL_AREA_NAMES = {
  A: "POLJOPRIVREDA, ŠUMARSTVO I RIBOLOV",
  B: "VAĐENJE RUDA I KAMENA",
  C: "PRERAĐIVAČKA INDUSTRIJA",
  D: "PROIZVODNJA I SNABDIJEVANJE ELEKTRIČNOM ENERGIJOM, PLINOM, PAROM I KLIMATIZACIJA",
  E: "SNABDIJEVANJE VODOM; UKLANJANJE OTPADNIH VODA, UPRAVLJANJE OTPADOM TE DJELATNOSTI SANACIJE OKOLIŠA",
  F: "GRAĐEVINARSTVO",
  G: "TRGOVINA NA VELIKO I NA MALO; POPRAVAK MOTORNIH VOZILA I MOTOCIKALA",
  H: "PRIJEVOZ I SKLADIŠTENJE",
  I: "DJELATNOSTI PRUŽANJA SMJEŠTAJA TE PRIPREME I USLUŽIVANJA HRANE (HOTELIJERSTVO I UGOSTITELJSTVO)",
  J: "INFORMACIJE I KOMUNIKACIJE",
  K: "FINANSIJSKE DJELATNOSTI I DJELATNOSTI OSIGURANJA",
  L: "POSLOVANJE NEKRETNINAMA",
  M: "STRUČNE, NAUČNE I TEHNIČKE DJELATNOSTI",
  N: "ADMINISTRATIVNE I POMOĆNE USLUŽNE DJELATNOSTI",
  O: "JAVNA UPRAVA I ODBRANA; OBAVEZNO SOCIJALNO OSIGURANJE",
  P: "OBRAZOVANJE",
  Q: "DJELATNOSTI ZDRAVSTVENE I SOCIJALNE ZAŠTITE",
  R: "UMJETNOST, ZABAVA I REKREACIJA",
  S: "OSTALE USLUŽNE DJELATNOSTI",
  T: "DJELATNOSTI DOMAĆINSTAVA KAO POSLODAVACA; DJELATNOSTI DOMAĆINSTAVA KOJA PROIZVODE RAZLIČITA DOBRA I OBAVLJAJU RAZLIČITE USLUGE ZA VLASTITE POTREBE",
  U: "DJELATNOSTI VANTERITORIJALNIH ORGANIZACIJA I ORGANA",
};
const OBLAST_RE = /^(\d{2})\s+([A-ZČĆŠŽĐa-zčćšžđ].+)$/;
const GRANA_RE = /^(\d{2}\.\d)\s+([A-ZČĆŠŽĐa-zčćšžđ].+)$/;
const RAZRED_RE = /^(\d{2}\.\d{2})\s+(.+)$/;

const areas = [];
let area = null;
let oblast = null;
let grana = null;
let razred = null;
let buffer = [];

// Common heading words to detect mid-text reset (so we don't capture "Ovaj razred ukljucuje:" as a description heading)
function flushBufferTo(target) {
  if (!target) return;
  const text = buffer.join("\n").trim();
  if (text) target.description = (target.description ? target.description + "\n\n" : "") + text;
  buffer = [];
}

// Stop marker — section 5 (NACE history) starts after the last razred and would otherwise
// pollute area U with bogus oblasti like "129. NACE..." that match OBLAST_RE numerically.
const STOP_RE = /^5\.\s*EU\s+NACE\s+klasifikacije/;

for (const _rawLine of lines) {
  // Strip leading form-feed chars that PDF extraction sometimes injects between pages
  const rawLine = _rawLine.replace(/^[\f\x0c]+/, "");
  if (PAGE_HEADER.test(rawLine)) continue;
  if (STOP_RE.test(rawLine)) break;
  const line = rawLine.trimEnd();

  // Skip pure form-feed / decorative lines
  if (/^\s*$/.test(line)) {
    buffer.push("");
    continue;
  }

  // Special case: T's heading is garbled by font issues; detect by content.
  let mArea = line.match(AREA_RE);
  if (!mArea && /^PODRU[ČC]JE\s/.test(line) && /POSLODAVACA/i.test(line)) {
    mArea = [line, "T", ""];
  }
  if (mArea) {
    flushBufferTo(razred || grana || oblast || area);
    razred = null; grana = null; oblast = null;
    area = {
      code: mArea[1],
      name: CANONICAL_AREA_NAMES[mArea[1]] || (mArea[2] || "").trim(),
      description: "",
      oblasti: [],
    };
    areas.push(area);
    continue;
  }

  // Razred takes priority over Oblast because "01.11" also matches no other pattern.
  const mRazred = line.match(RAZRED_RE);
  if (mRazred) {
    flushBufferTo(razred || grana || oblast || area);
    razred = {
      code: mRazred[1],
      name: mRazred[2].trim(),
      description: "",
    };
    if (grana) grana.razredi.push(razred);
    else if (oblast) {
      // razred outside any grana — attach directly via implicit grana
      const synthGrana = oblast.grane.find((g) => g.code === mRazred[1].slice(0, 4));
      if (synthGrana) {
        synthGrana.razredi.push(razred);
        grana = synthGrana;
      } else if (area) {
        // fallback — unattached razred (shouldn't happen)
        area._loose ??= [];
        area._loose.push(razred);
      }
    }
    continue;
  }

  const mGrana = line.match(GRANA_RE);
  if (mGrana) {
    // Skip cross-references that look like grana headers but are inline text
    // (e.g. "47.1 do 47.7; trgovina na malo izvan prodavnica..." inside oblast intro).
    // Real grana headings always start with a capital letter and never contain
    // "do 47.x" style ranges, semicolons, or parenthesized cross-refs near the start.
    const nameStart = mGrana[2].trim();
    const isPseudoHeader =
      /^do\s+\d/.test(nameStart) ||
      /^\d/.test(nameStart) ||
      (oblast && oblast.grane.some((g) => g.code === mGrana[1]));
    if (isPseudoHeader) {
      // Treat as body text instead of a header
      buffer.push(line);
      continue;
    }
    flushBufferTo(razred || grana || oblast || area);
    razred = null;
    grana = {
      code: mGrana[1],
      name: nameStart,
      description: "",
      razredi: [],
    };
    if (oblast) oblast.grane.push(grana);
    continue;
  }

  const mOblast = line.match(OBLAST_RE);
  if (mOblast) {
    flushBufferTo(razred || grana || oblast || area);
    razred = null; grana = null;
    oblast = {
      code: mOblast[1],
      name: mOblast[2].trim(),
      description: "",
      grane: [],
    };
    if (area) area.oblasti.push(oblast);
    continue;
  }

  // Otherwise it's body text for the current target
  buffer.push(line);
}
flushBufferTo(razred || grana || oblast || area);

// Garbled font lines that PDF text extraction produces because some headers
// in the PDF use a non-Unicode-mapped font. We replace them with their
// human-readable equivalents.
// Garbled font headers in the PDF — second non-Unicode font that produces
// gibberish like "KǀĂũ ƌĂǌƌĞĚ ŝƐŬůũƵēƵũĞ͗". The key markers are
// ŝƐŬůũƵēƵũĞ (isključuje) and ƵŬůũƵēƵũĞ (uključuje).
const GARBLED_LINES = [
  { pattern: /^K\S*\s*\S*\s*\S*[^\n]*ŝƐŬůũƵēƵũĞ[^\n]*$/gm, replacement: "Isključuje:" },
  { pattern: /^K\S*\s*\S*\s*\S*[^\n]*ƵŬůũƵēƵũĞ[^\n]*$/gm, replacement: "Uključuje:" },
  // Fallback: any remaining garbled "K..." headers
  { pattern: /^K[^\sA-Za-zŠŽĆČĐšžćčđ]{2,}[^\n]*$/gm, replacement: "Isključuje:" },
];

// Per-character mapping for the broken non-Unicode font used in parts of the PDF.
// Each entry maps the garbled codepoint to its real Bosnian equivalent.
//
// IMPORTANT: only includes characters that are UNAMBIGUOUSLY garbled — characters
// like Đ/Ž that are legitimately used in Bosnian are NOT included here, because
// we'd corrupt valid uppercase area names like "VAĐENJE", "GRAĐEVINARSTVO".
const CHAR_MAP_SAFE = {
  Ă: "a", ď: "b", ē: "č", Ě: "d", Ĝ: "đ", Ğ: "e", Ő: "g", Ś: "h",
  ŝ: "i", ũ: "j", Ŭ: "k", ů: "l", ŵ: "m", Ŷ: "n", Ɖ: "p", ƌ: "r",
  Ɛ: "s", ƚ: "t", Ƶ: "u", ǀ: "v", ǌ: "z", Ĩ: "f", Ɠ: "š", ǎ: "ž",
  ǆ: "dž", "<": "k", "^": "s", "/": "i", ">": "l", "Ĩ": "f",
};

// Characters that are ambiguous (legitimate Bosnian + also used in garbled font).
// Only applied when the surrounding word is detected as garbled (>50% safe-garbled chars).
const CHAR_MAP_AMBIGUOUS = {
  Ž: "o", Đ: "c", Š: "s", Č: "č",
};

const SAFE_GARBLED_RE = /[ĂďēĚĜĞŐŚŝũŬůŵŶɖƌƐƚƵǀǌĨĝŜɠɛğǎĨ]/;

function decodeGarbledWord(word) {
  let hasSafeGarbled = false;
  let out = "";
  for (const ch of word) {
    if (CHAR_MAP_SAFE[ch] !== undefined) {
      hasSafeGarbled = true;
      out += CHAR_MAP_SAFE[ch];
    } else {
      out += ch;
    }
  }
  // If we found at least one unambiguously garbled char, also decode the ambiguous ones.
  if (hasSafeGarbled) {
    let decoded = "";
    for (const ch of out) {
      decoded += CHAR_MAP_AMBIGUOUS[ch] ?? ch;
    }
    return decoded;
  }
  return word;
}

function decodeGarbled(text) {
  // Split on word boundaries, decode words that contain garbled chars.
  return text.replace(/\S+/g, (word) => (SAFE_GARBLED_RE.test(word) ? decodeGarbledWord(word) : word));
}

function cleanText(t) {
  if (!t) return "";
  let out = t;
  for (const { pattern, replacement } of GARBLED_LINES) {
    out = out.replace(pattern, replacement);
  }
  out = decodeGarbled(out);
  // Strip C0/C1 control characters (keep \t \n \r). These come from
  // page-number/footer glyphs rendered in the broken non-Unicode font and
  // render as tofu boxes in the browser.
  out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
  // Strip stray combining marks left over from the broken font.
  out = out.replace(/[\u0300-\u036F\u0350-\u035F]/g, "");
  return out
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function walk(node) {
  if (node.description) node.description = cleanText(node.description);
  if (node.oblasti) node.oblasti.forEach(walk);
  if (node.grane) node.grane.forEach(walk);
  if (node.razredi) node.razredi.forEach(walk);
}
areas.forEach(walk);

// T's area description is unrecoverable garbage (the PDF heading uses an
// entirely different broken font). Replace it with a clean canonical version.
const tArea = areas.find((a) => a.code === "T");
if (tArea) {
  tArea.description =
    "Ovo područje obuhvata djelatnosti domaćinstava kao poslodavaca koji zapošljavaju poslugu, te djelatnosti domaćinstava koja proizvode različita dobra i obavljaju različite usluge za vlastite potrebe.";
}

// Final pass: strip any lines that still contain bare garbled symbols
// (mostly fragments from the second uppercase broken font like '^d', '/E', '<K').
function stripResidualGarbage(text) {
  if (!text) return text;
  return text
    .split("\n")
    .filter((line) => {
      // A line is residual garbage if it contains 2+ standalone single chars
      // mixed with capitalized fragments and no normal words. We detect this
      // by checking for chars that should never appear in normal Bosnian text.
      const garbageChars = (line.match(/[\^<>\/]/g) || []).length;
      const words = line.trim().split(/\s+/).filter(Boolean);
      if (garbageChars >= 2 && words.length <= 8) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function deepStrip(node) {
  if (node.description) node.description = stripResidualGarbage(node.description);
  if (node.oblasti) node.oblasti.forEach(deepStrip);
  if (node.grane) node.grane.forEach(deepStrip);
  if (node.razredi) node.razredi.forEach(deepStrip);
}
areas.forEach(deepStrip);

// Stats
const totals = {
  areas: areas.length,
  oblasti: areas.reduce((s, a) => s + a.oblasti.length, 0),
  grane: areas.reduce((s, a) => s + a.oblasti.reduce((ss, o) => ss + o.grane.length, 0), 0),
  razredi: areas.reduce(
    (s, a) => s + a.oblasti.reduce((ss, o) => ss + o.grane.reduce((sss, g) => sss + g.razredi.length, 0), 0),
    0,
  ),
};
console.log("Parsed:", totals);

const ts = `// Auto-generated by scripts/parse-kd-bih.mjs from sifre-djelatnosti-fbih.pdf
// (Federalni zavod za statistiku, KD BiH 2010, NACE Rev. 2)
// Do not edit by hand — re-run the parser to regenerate.

export type KdBihRazred = {
  code: string;
  name: string;
  description: string;
};

export type KdBihGrana = {
  code: string;
  name: string;
  description: string;
  razredi: KdBihRazred[];
};

export type KdBihOblast = {
  code: string;
  name: string;
  description: string;
  grane: KdBihGrana[];
};

export type KdBihArea = {
  code: string;
  name: string;
  description: string;
  oblasti: KdBihOblast[];
};

export const KD_BIH_DETAILED: KdBihArea[] = ${JSON.stringify(areas, null, 2)};
`;

fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
fs.writeFileSync(OUT_TS, ts, "utf8");
console.log("Wrote", OUT_TS, `(${(fs.statSync(OUT_TS).size / 1024).toFixed(1)} KB)`);
