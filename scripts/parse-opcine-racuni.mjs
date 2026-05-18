#!/usr/bin/env node
// Parser općinskih uplatnih računa iz pravilnika PUFBiH (sekcija III. Jedinice
// lokalne samouprave). Tabela u PDF-u je fragmentirana — ovaj parser radi
// best-effort: za svaku općinu pokupi sve račune koji se pojavljuju u
// linijama od njenog markera do markera sljedeće općine.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TXT = path.join(ROOT, "frontend/public/templates/opcine-section.txt");
const CITIES = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/cities-dump.json"), "utf8"),
);
const OUT_TS = path.join(ROOT, "frontend/src/data/opcine.ts");

const lines = fs.readFileSync(TXT, "utf8").replace(/\f/g, "").split(/\r?\n/);

const KANTON_HEADER_RE = /^(UNSKO-SANSKI|POSAVSKI|TUZLANSKI|ZENIČKO-DOBOJSKI|BOSANSKO-PODRINJSKI|SREDNJOBOSANSKI|HERCEGOVAČKO-NERETVANSKI|ZAPADNOHERCEGOVAČKI|KANTON SARAJEVO|KANTON 10)\s+KANTON/i;
const OPCINA_MARKER_RE = /^(\d{1,3})\.\s+([A-ZČĆĐŠŽ][A-ZČĆĐŠŽ\-\. ]+?)(?=\s{2,}|\s+[A-Za-z]+\s+banka|\s+UniCredit|\s+INTESA|\s+NLB|\s+Sparkasse|\s+Vakufska|\s+Privredna|\s+Bosna|\s+Komercijalno|\s+Raiffeisen|\s+Union|\s+HYPO|\s+ASA|\s+Investiciono|\s+Investicionokomercijalna|\s+ProCredit|\s+Nova|$)/;
const ACCOUNT_RE = /\b(\d{3}-?\s*\d{2,4}-?\s*\d{6,10}-?\s*\d{1,3})\b/g;

const KANTON_NAME_TO_KEY = {
  "UNSKO-SANSKI": "USK",
  POSAVSKI: "POS",
  TUZLANSKI: "TUZ",
  "ZENIČKO-DOBOJSKI": "ZDK",
  "BOSANSKO-PODRINJSKI": "BPK",
  SREDNJOBOSANSKI: "SBK",
  "HERCEGOVAČKO-NERETVANSKI": "HNK",
  ZAPADNOHERCEGOVAČKI: "ZHK",
  "KANTON SARAJEVO": "KS",
  "KANTON 10": "K10",
};

// First find start of section III
let startIdx = lines.findIndex((l) => /JEDINICE LOKALNE SAMOUPRAVE/i.test(l));
// If our extracted file already starts mid-section (no header), use 0
if (startIdx < 0) startIdx = 0;

// Identify opcina rows (lines starting with "N. NAME")
const items = [];
let currentKanton = "";

for (let i = startIdx; i < lines.length; i++) {
  const ln = lines[i];
  if (!ln) continue;

  const kh = ln.match(KANTON_HEADER_RE);
  if (kh) {
    currentKanton = kh[1].toUpperCase();
    continue;
  }

  const m = ln.match(/^(\d{1,3})\.\s+([A-ZČĆĐŠŽ][A-ZČĆĐŠŽ\-\.\sa-zčćđšž]*?)(?:\s{2,}|\s{2}|$)/);
  if (!m) continue;
  const num = parseInt(m[1], 10);
  if (num < 1 || num > 200) continue;
  // Name: first uppercase token group
  let name = m[2].trim();
  // Truncate name if it contains "banka" / "Bank" etc (we accidentally captured bank)
  name = name.replace(/\s+(UniCredit|NLB|INTESA|Sparkasse|Vakufska|Privredna|Bosna|Komercijalno|Raiffeisen|Union|HYPO|ASA|Investiciono|Investicionokomercijalna|ProCredit|Nova|BANKA|Bank|banka).*$/i, "").trim();
  // Some opcina names spill onto next line (e.g. "BOSANSKI" / "PETROVAC"). Look ahead.
  const nextLn = lines[i + 1] ? lines[i + 1].trim() : "";
  if (nextLn && /^[A-ZČĆĐŠŽ\-]{3,}$/.test(nextLn) && !KANTON_HEADER_RE.test(nextLn)) {
    name += " " + nextLn;
  }
  items.push({
    num,
    name: name.replace(/\s+/g, " ").trim(),
    kantonHeader: currentKanton,
    lineIdx: i,
    accounts: [],
  });
}

// Assign accounts: scan from previous opcina's marker (exclusive) up to NEXT opcina's
// marker (exclusive), and capture all account-shaped strings on those lines.
// We DO NOT globally dedupe — same account may be referenced for multiple opcina
// in the pravilnik (e.g., spillover lines). User asked us not to gate on correctness.
for (let i = 0; i < items.length; i++) {
  const it = items[i];
  const prev = items[i - 1];
  const next = items[i + 1];
  // Capture window: from a few lines BEFORE the marker (to grab spillover accounts that
  // visually align with this row in the PDF column) up to just before next marker.
  const fromIdx = Math.max(prev ? prev.lineIdx + 1 : 0, it.lineIdx - 4);
  const endIdx = next ? next.lineIdx : Math.min(it.lineIdx + 20, lines.length);
  for (let k = fromIdx; k < endIdx; k++) {
    const ln = lines[k];
    if (!ln) continue;
    const matches = ln.match(/\b\d{3}-\s*\d+(?:-\s*\d+)*-\s*\d{2,3}\b/g);
    if (matches) {
      for (const acc of matches) {
        const normalized = acc.replace(/\s+/g, "");
        if (!it.accounts.includes(normalized) && it.accounts.length < 5) {
          it.accounts.push(normalized);
        }
      }
    }
  }
}

// Build opcina-name → accounts map (normalize names for matching with DB cities)
function normalizeForMatch(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\(fbih\)/g, "")
    .replace(/[\s\-\.()]/g, "")
    .replace(/sarajevo$/, "")
    .replace(/uskoplje$/, "");
}

// Manual aliases for parser-extracted names → DB city name keys (both after normalize)
const ALIASES = {
  bosanski: "bosanskipetrovac",
  bosansko: "bosanskograhovo",
  focaustikolina: "foca",
  palepraca: "pale",
  ntravnik: "novitravnik",
  dvakuf: "donjivakuf",
  gvakuf: "gornjivakuf",
  bihac: "bihac",
  bosanskakrupa: "bosanskakrupa",
  bosanskipetrovac: "bosanskipetrovac",
  buzim: "buzim",
  cazin: "cazin",
  kljuc: "kljuc",
  sanskimost: "sanskimost",
  velikakladusa: "velikakladusa",
  orasje: "orasje",
  odzak: "odzak",
  domaljevacsamac: "domaljevacsamac",
  banovici: "banovici",
  gracanica: "gracanica",
  gradacac: "gradacac",
  kalesija: "kalesija",
  kladanj: "kladanj",
  celic: "celic",
  lukavac: "lukavac",
  srebrenik: "srebrenik",
  tuzla: "tuzla",
  zivinice: "zivinice",
  dobojistok: "dobojistok",
  sapna: "sapna",
  teocak: "teocak",
  breza: "breza",
  usora: "usora",
  kakanj: "kakanj",
  maglaj: "maglaj",
  olovo: "olovo",
  tesanj: "tesanj",
  vares: "vares",
  visoko: "visoko",
  zavidovici: "zavidovici",
  zenica: "zenica",
  zepce: "zepce",
  dobojjug: "dobojjug",
  gorazde: "gorazde",
  palepraca: "pale",
  focaustikolina: "foca",
  travnik: "travnik",
  ntravnik: "novitravnik",
  bugojno: "bugojno",
  vitez: "vitez",
  kiseljak: "kiseljak",
  jajce: "jajce",
  dvakuf: "donjivakuf",
  gvakuf: "gornjivakuf",
  kresevo: "kresevo",
  fojnica: "fojnica",
  busovaca: "busovaca",
  dobretici: "dobretici",
  capljina: "capljina",
  citluk: "citluk",
  jablanica: "jablanica",
  konjic: "konjic",
  prozorrama: "prozorrama",
  stolac: "stolac",
  neum: "neum",
  gradmostar: "gradmostar",
  ravno: "ravno",
  siroki: "sirokibrijeg",
  sirokibrijeg: "sirokibrijeg",
  grude: "grude",
  ljubuski: "ljubuski",
  posusje: "posusje",
  hadzici: "hadzici",
  ilijas: "ilijas",
  ilidza: "ilidza",
  centar: "centarsarajevo",
  novigrad: "novigrad",
  novosarajevo: "novosarajevo",
  starigrad: "starigradsarajevo",
  vogosca: "vogosca",
  trnovo: "trnovofbih",
  livno: "livno",
  tomislavgrad: "tomislavgrad",
  drvar: "drvar",
  glamoc: "glamoc",
  kupres: "kupres",
  bosanskogrohovo: "bosanskograhovo",
  bosanskograhovo: "bosanskograhovo",
};

const parserMap = new Map();
for (const it of items) {
  const k = normalizeForMatch(it.name);
  if (!parserMap.has(k)) parserMap.set(k, []);
  parserMap.get(k).push(...it.accounts);
}

// Build output grouped by kanton (from DB cities)
const KANTON_NAMES = {
  USK: "Unsko-sanski kanton",
  POS: "Posavski kanton",
  TUZ: "Tuzlanski kanton",
  ZDK: "Zeničko-dobojski kanton",
  BPK: "Bosansko-podrinjski kanton",
  SBK: "Srednjobosanski kanton",
  HNK: "Hercegovačko-neretvanski kanton",
  ZHK: "Zapadnohercegovački kanton",
  KS: "Kanton Sarajevo",
  K10: "Kanton 10",
};

const grouped = {};
for (const c of CITIES) {
  if (!grouped[c.kanton]) grouped[c.kanton] = [];
  const key = normalizeForMatch(c.name);
  // Try direct match, then via ALIASES (reverse)
  let accounts = parserMap.get(key) || [];
  if (!accounts.length) {
    // Try alias lookup: find a parser key that maps via ALIASES to this DB key
    for (const [parserKey, dbKey] of Object.entries(ALIASES)) {
      if (dbKey === key) {
        accounts = parserMap.get(parserKey) || accounts;
        if (accounts.length) break;
      }
    }
  }
  grouped[c.kanton].push({
    name: c.name,
    kod: c.municipalityCode,
    postalCode: c.postalCode,
    racuni: accounts,
  });
}

const out = Object.keys(KANTON_NAMES).map((k) => ({
  kanton: k,
  kantonNaziv: KANTON_NAMES[k],
  opcine: (grouped[k] || []).sort((a, b) => a.name.localeCompare(b.name)),
}));

const totalOpcina = out.reduce((a, g) => a + g.opcine.length, 0);
const matched = out.reduce(
  (a, g) => a + g.opcine.filter((o) => o.racuni.length > 0).length,
  0,
);
console.log(`Opcina total: ${totalOpcina}, matched: ${matched}, no accounts: ${totalOpcina - matched}`);

const tsBody = `// Auto-generated by scripts/parse-opcine-racuni.mjs
// Source: cities table (DB) + pravilnik PUFBiH (sekcija III. Jedinice lokalne samouprave).
// Računi su iz prečišćenog teksta pravilnika (Sl. nov. FBiH br. 96/15) — mogu biti zastarjeli.
// Šifre općina (municipalityCode) iz interne DB tabele cities.

export type OpcinaRacuni = {
  name: string;
  kod: string;
  postalCode: string | null;
  racuni: string[];
};

export type OpcineKanton = {
  kanton: string;
  kantonNaziv: string;
  opcine: OpcinaRacuni[];
};

export const OPCINE_GROUPS: OpcineKanton[] = ${JSON.stringify(out, null, 2)};
`;
fs.writeFileSync(OUT_TS, tsBody, "utf8");
console.log(`Wrote ${OUT_TS}`);
