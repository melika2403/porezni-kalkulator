#!/usr/bin/env node
// Parses pravilnik-flow.txt (extracted from PDF in reading-flow mode) into
// structured JSON of vrste prihoda + grouping by economic classification.
//
// Usage: node scripts/parse-pravilnik.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TXT = path.join(ROOT, "frontend/public/templates/pravilnik-table.txt");
const OUT_TS = path.join(ROOT, "frontend/src/data/javni-prihodi.ts");

const raw = fs.readFileSync(TXT, "utf8");
const lines = raw.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim());

// ── Split into sections ──────────────────────────────────────────────────
// Top-level section header: "N. Title" where N is 1..50 and title is non-empty.
// Subsections "N.M ..." are paragraphs of explanation, not new sections.
const SECTION_RE = /^(\d{1,2})\.\s*(.+)$/;
const SUBSECTION_RE = /^\d{1,2}(\.\d{1,2}){1,3}\.?\s/;
const ROW_NUM_ONLY_RE = /^(\d{1,2})\.$/;
const ROW_WITH_TITLE_RE = /^(\d{1,2})\.\s+(.+)$/;
const CODE_RE = /\b(7[1-3][0-9]{4})\b/g;
const VRSTA_MARKER_RE = /VRSTA\s*PRIHODA/i;
const NAZIV_MARKER_RE = /NAZIV\s*PRIHODA/i;

// Walk through lines and assign each to a section. We enforce sequential
// numbering — section N must follow section N-1 (allow skips of up to 2 to
// tolerate parser misses, but reject random matches inside row tables).
const sections = []; // { num, title, lines: [] }
let cur = null;
let expectedNextNum = 1;
for (let i = 0; i < lines.length; i++) {
  const ln = lines[i];
  if (!ln) continue;
  if (SUBSECTION_RE.test(ln)) {
    if (cur) cur.lines.push(ln);
    continue;
  }
  const m = ln.match(SECTION_RE);
  if (m) {
    const num = parseInt(m[1], 10);
    const title = m[2];
    const isSequential =
      num >= expectedNextNum && num <= expectedNextNum + 2;
    // Section titles never end with a 6-digit code (that's a row in a table).
    const endsWithCode = /\b7[1-3][0-9]{4}\s*$/.test(title);
    const looksLikeSection =
      num >= 1 && num <= 50 &&
      title.length > 6 &&
      isSequential &&
      !endsWithCode &&
      !title.match(/^[0-9]/);
    if (looksLikeSection) {
      cur = { num: m[1], title, lines: [] };
      sections.push(cur);
      expectedNextNum = num + 1;
      continue;
    }
  }
  if (cur) cur.lines.push(ln);
}

// ── For each section, parse rows + codes ─────────────────────────────────
const allCodes = new Map();

function cleanName(name) {
  if (!name) return "";
  let n = name.trim();
  // Strip trailing/embedded page numbers (1-3 digit standalone)
  n = n.replace(/\s+\d{1,3}\s+/g, " ").replace(/\s+\d{1,3}$/, "");
  // Cut at opening quote (preface for quoted commentary / decision text)
  const quoteIdx = Math.min(
    ...["\"", "„", "“"].map((q) => {
      const i = n.indexOf(q);
      return i === -1 ? Infinity : i;
    }),
  );
  if (Number.isFinite(quoteIdx) && quoteIdx > 18) n = n.slice(0, quoteIdx).trim();
  // Cut at sentences/phrases that mark transition to explanatory paragraph
  const cutMarkers = [
    /\s+Ovi prihodi /i,
    /\s+Ovi se prihodi /i,
    /\s+Prihodi iz /i,
    /\s+Prihodi od (zakupa|posebnih|naknada)/i,
    /\s+Prihodi pod /i,
    /\s+Prihodi po /i,
    /\s+Prihod po osnovu /i,
    /\s+Prihod na ime /i,
    /\s+Obaveze iz /i,
    /\s+Novčane kazne iz /i,
    /\s+Usmjeravanje doprinosa /i,
    /\s+Prilikom /i,
    /\s+Naknada (za izvršeni|za izvršene|po osnovu) /i,
    /\s+\d{1,2}\.\d{1,2}(\.\d{1,2})?\.?[a-z]?\.?\s/, // 19.1.3.a etc.
    /\s+Zakon o izmjeni /i,
    /\s+Sredstva za podsticanje /i, // de-dupes repeated row name
    /\s+Sredstva za pripravnike /i,
    /\s+Sredstva za volontere /i,
    /\s+Sredstva za ostvarivanje /i,
    /\s+Naknada za izvršene veterinarsko/,
  ];
  for (const re of cutMarkers) {
    const m = n.match(re);
    if (m && m.index > 12) n = n.slice(0, m.index).trim();
  }
  // Trim trailing punctuation/whitespace
  n = n.replace(/[\s,;:.]+$/, "").trim();
  // Cap length defensively
  if (n.length > 200) n = n.slice(0, 197).trim() + "…";
  return n;
}

function cleanSection(s) {
  if (!s) return "";
  let r = s
    .replace(/\s+Red\.\s*Br\.\s*NAZIV PRIHODA.*$/i, "")
    .replace(/\s+Red\.\s*br\.\s*NAZIV PRIHODA.*$/i, "")
    .replace(/\s+NAZIV PRIHODA.*$/i, "")
    .replace(/\s+VRSTA\s*PRIHODA.*$/i, "")
    .trim();
  // Trim trailing conjunctions/fragments left by line breaks ("i", "u", "te", ",")
  r = r.replace(/[\s,;:.]+(i|u|te|na|od|po|za)\s*$/i, "");
  r = r.replace(/[\s,;:.]+$/, "");
  return r;
}

function pushCode(code, name, sectionTitle) {
  if (!code) return;
  const cleanedName = cleanName(name);
  const cleanedSection = cleanSection(sectionTitle);
  if (!allCodes.has(code)) {
    allCodes.set(code, { code, name: cleanedName, section: cleanedSection });
  } else {
    const ex = allCodes.get(code);
    if (!ex.name && cleanedName) {
      ex.name = cleanedName;
      ex.section = cleanedSection;
    }
  }
}

for (const sec of sections) {
  const sectionTitle = `${sec.num}. ${sec.title}`;
  const buf = sec.lines;
  if (!buf.length) continue;

  // First pass: build a sequence of rows. A row is either:
  //   - "N. Title text..." (single line with content)
  //   - "N." followed by subsequent lines that are continuation of the title
  const rows = [];
  let i = 0;
  while (i < buf.length) {
    const ln = buf[i];
    if (!ln) { i++; continue; }

    // Stop scanning rows once we hit a paragraph-style sentence (length > 220
    // chars and ends with a period) — those are usually explanatory notes
    // outside the table.
    if (ln.length > 280 && ln.endsWith(".")) {
      i++;
      continue;
    }

    // Row with title on same line
    const m1 = ln.match(ROW_WITH_TITLE_RE);
    if (m1 && parseInt(m1[1], 10) <= 30) {
      // Strip trailing code from title if present
      let title = m1[2];
      const codes = [];
      const trailing = title.match(/(7[1-3][0-9]{4})\s*$/);
      if (trailing) {
        codes.push(trailing[1]);
        title = title.slice(0, trailing.index).trim();
      }
      // Continuation lines: collect until next row, marker, or paragraph
      let j = i + 1;
      while (j < buf.length) {
        const nx = buf[j];
        if (!nx) { j++; continue; }
        if (ROW_NUM_ONLY_RE.test(nx) || ROW_WITH_TITLE_RE.test(nx) && parseInt(nx.match(ROW_WITH_TITLE_RE)[1], 10) <= 30) {
          // Only treat as new row if number is sequential (or close)
          break;
        }
        if (VRSTA_MARKER_RE.test(nx) || NAZIV_MARKER_RE.test(nx)) break;
        if (SUBSECTION_RE.test(nx)) break;
        if (nx.length > 200) break;
        // Skip pure-code lines
        const onlyCodes = nx.replace(CODE_RE, "").trim();
        if (!onlyCodes && nx.match(CODE_RE)) {
          for (const c of nx.match(CODE_RE)) codes.push(c);
          j++;
          continue;
        }
        title += " " + nx;
        j++;
      }
      title = title.replace(/\s{2,}/g, " ").trim();
      rows.push({ title, attachedCodes: codes });
      i = j;
      continue;
    }

    // Row with number only
    const m2 = ln.match(ROW_NUM_ONLY_RE);
    if (m2 && parseInt(m2[1], 10) <= 30) {
      let title = "";
      const codes = [];
      let j = i + 1;
      while (j < buf.length) {
        const nx = buf[j];
        if (!nx) { j++; continue; }
        if (ROW_NUM_ONLY_RE.test(nx) || (ROW_WITH_TITLE_RE.test(nx) && parseInt(nx.match(ROW_WITH_TITLE_RE)[1], 10) <= 30)) break;
        if (VRSTA_MARKER_RE.test(nx) || NAZIV_MARKER_RE.test(nx)) break;
        if (SUBSECTION_RE.test(nx)) break;
        if (nx.length > 200) break;
        const codeMatches = nx.match(CODE_RE);
        const noCodeText = nx.replace(CODE_RE, "").trim();
        if (codeMatches && !noCodeText) {
          for (const c of codeMatches) codes.push(c);
          j++;
          continue;
        }
        if (codeMatches) {
          for (const c of codeMatches) codes.push(c);
        }
        title += " " + noCodeText;
        j++;
      }
      title = title.replace(/\s{2,}/g, " ").trim();
      if (title) rows.push({ title, attachedCodes: codes });
      i = j;
      continue;
    }

    i++;
  }

  // Second pass: collect codes that appear after a "VRSTA PRIHODA" marker
  // anywhere in this section (free-floating codes used to pair with rows that
  // have no attached code).
  const freeCodes = [];
  let after = false;
  for (const ln of buf) {
    if (VRSTA_MARKER_RE.test(ln) || NAZIV_MARKER_RE.test(ln)) after = true;
    if (!after) continue;
    const cm = ln.match(CODE_RE);
    if (cm) for (const c of cm) freeCodes.push(c);
  }

  // Pair attached codes first
  const used = new Set();
  for (const r of rows) {
    for (const c of r.attachedCodes) {
      used.add(c);
      pushCode(c, r.title, sectionTitle);
    }
  }
  const remainingCodes = freeCodes.filter((c) => !used.has(c));
  const rowsWithoutCode = rows.filter((r) => r.attachedCodes.length === 0);
  // Heuristic pairing: dedupe codes preserving order
  const seen = new Set();
  const dedupedCodes = [];
  for (const c of remainingCodes) {
    if (!seen.has(c)) { seen.add(c); dedupedCodes.push(c); }
  }
  for (let k = 0; k < Math.min(dedupedCodes.length, rowsWithoutCode.length); k++) {
    pushCode(dedupedCodes[k], rowsWithoutCode[k].title, sectionTitle);
  }
  // Orphan codes (without name) — register so we don't lose them
  for (const c of dedupedCodes.slice(rowsWithoutCode.length)) {
    pushCode(c, "", sectionTitle);
  }
}

// ── Group labels (3-digit ekonomska klasifikacija FBiH) ──────────────────
const GROUPS = {
  "711": "Porezi na dobit pojedinca i preduzeća",
  "712": "Doprinosi za socijalna osiguranja",
  "713": "Porezi na plaću i radnu snagu",
  "714": "Porezi na imovinu",
  "715": "Domaći porezi na dobra i usluge (zaostali)",
  "716": "Porez na dohodak",
  "717": "Prihodi od indirektnih poreza",
  "719": "Ostali porezi",
  "721": "Prihodi od preduzetničkih aktivnosti i imovine",
  "722": "Naknade, takse i prihodi od pružanja javnih usluga",
  "723": "Novčane kazne (neporezne)",
  "725": "Prihodi po osnovu zaostalih obaveza",
  "729": "Ostali prihodi (vanredni)",
  "731": "Tekuće transfere",
  "732": "Kapitalne primljene transfere",
  "741": "Primici od finansijske imovine",
  "742": "Primici od prodaje stalnih sredstava",
};

const byGroup = new Map();
for (const v of allCodes.values()) {
  const g = v.code.slice(0, 3);
  if (!byGroup.has(g)) byGroup.set(g, []);
  byGroup.get(g).push(v);
}
const groupKeys = Array.from(byGroup.keys()).sort();
const structuredGroups = groupKeys.map((g) => ({
  code: g,
  name: GROUPS[g] || `Grupa ${g}`,
  items: byGroup.get(g).sort((a, b) => a.code.localeCompare(b.code)),
}));

const named = Array.from(allCodes.values()).filter((v) => v.name).length;
const total = allCodes.size;
console.log(`Sections: ${sections.length}`);
console.log(`Total codes: ${total}, with name: ${named}, missing: ${total - named}`);

// Uplatni računi (federalni + kantonalni) više se NE generišu u javni-prihodi.ts.
// JavniPrihodi page ih importuje direktno iz frontend/src/data/uplatni-racuni.ts
// (single source of truth, verifikovani podaci sa PUFBiH live stranice).

// ── Budžetske organizacije (polje 15. platnog naloga) ──────────────────────
// Samo verifikovane šifre iz prakse — ostatak (kompletan kontni plan budžetskih
// korisnika FBiH) je propisan posebnim aktom Ministarstva finansija i nije
// uvršten dok se ne pronađe zvanični izvor.
const BUDZETSKE_ORGANIZACIJE = [
  { kod: "5102001", naziv: "Federalni zavod za PIO/MIO" },
];

const out = `// Auto-generated by scripts/parse-pravilnik.mjs from pravilnik-javni-prihodi.pdf
// (Porezna uprava FBiH, Pravilnik o načinu uplate javnih prihoda — prečišćeni tekst)
// Do not edit by hand — re-run the parser to regenerate.
// Source: https://www.pufbih.ba/v1/public/upload/zakoni/94b8a-pravilnik-o-nacinu-uplate-javnih-prihoda-preciscen-tekst.pdf

export type VrstaPrihoda = {
  code: string;
  name: string;
  section: string;
};

export type EkonomskaGrupa = {
  code: string;
  name: string;
  items: VrstaPrihoda[];
};

export type BudzetskaOrganizacija = {
  kod: string;
  naziv: string;
};

export const BUDZETSKE_ORGANIZACIJE: BudzetskaOrganizacija[] = ${JSON.stringify(BUDZETSKE_ORGANIZACIJE, null, 2)};

export const VRSTE_PRIHODA_GROUPS: EkonomskaGrupa[] = ${JSON.stringify(structuredGroups, null, 2)};

export const VRSTE_PRIHODA_BY_CODE: Record<string, VrstaPrihoda> = Object.fromEntries(
  VRSTE_PRIHODA_GROUPS.flatMap((g) => g.items.map((it) => [it.code, it]))
);
`;
fs.writeFileSync(OUT_TS, out, "utf8");
console.log(`Wrote ${OUT_TS}`);
