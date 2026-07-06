// Nađe bajt offsete placeholder-a u D-PDV templateu (pripremljenom skriptom
// dpdv-prep-template.ps1) i ispiše tabele NUM_SLOTS/STR_SLOTS za
// src/sections/pdv/dpdvExcel.ts. Provjerava tačan broj pojavljivanja.
// Upotreba: node scripts/dpdv-find-offsets.js <template.xls>
const fs = require("fs");
const XLSX = require("xlsx");

const tplPath = process.argv[2];
if (!tplPath) {
  console.log("upotreba: node scripts/dpdv-find-offsets.js <template.xls>");
  process.exit(1);
}
const buf = fs.readFileSync(tplPath);

const MAGIC_BASE = 987654301.234567;

// ── 1) SheetJS sanity: magic vrijednosti tačne, formule ws2 žive ─────────
const wb = XLSX.readFile(tplPath, { cellStyles: true });
const ws = wb.Sheets["Obrazac DPDV"];
const ws2 = wb.Sheets["Polja iz obrasca"];
console.log("F5 === magic0:", ws["F5"].v === MAGIC_BASE);
console.log("rows:", (ws["!rows"] || []).length, "cols:", (ws["!cols"] || []).length, "merges:", (ws["!merges"] || []).length);
let f2 = 0;
for (const k of Object.keys(ws2)) if (k[0] !== "!" && ws2[k].f) f2++;
console.log("ws2 formule:", f2, "| A1 cache:", JSON.stringify((ws2["A1"] || {}).v).slice(0, 40));
console.log("ws2 B1:", JSON.stringify((ws2["B1"] || {}).v), "E1:", JSON.stringify((ws2["E1"] || {}).v), "F1:", JSON.stringify((ws2["F1"] || {}).v));
console.log("ws2 M1 cache:", (ws2["M1"] || {}).v, "(magic28:", MAGIC_BASE + 28, ")");

// ── 2) pretraga bajtova ──────────────────────────────────────────────────
function findAll(hay, needle) {
  const out = [];
  let i = hay.indexOf(needle, 0);
  while (i !== -1) {
    out.push(i);
    i = hay.indexOf(needle, i + 1);
  }
  return out;
}
function utf16(s) {
  return Buffer.from(s, "utf16le");
}
function ph(tag, len) {
  return ("Ć" + tag).padEnd(len, "~");
}

// magic slotovi: redoslijed identičan prep skripti
const NUM_KEYS = [];
for (let i = 0; i < 12; i++) NUM_KEYS.push("id" + i);
for (let i = 0; i < 8; i++) NUM_KEYS.push("od" + i);
for (let i = 0; i < 8; i++) NUM_KEYS.push("do" + i);
NUM_KEYS.push(
  "iz1_bez","iz2_bez","iz3_bez","iz4_bez","iz5_bez","iz6_bez","iz6_pdv",
  "iz7_pdv","iz8_bez","iz8_pdv","iz9_bez","iz9_pdv","iz10_pdv",
  "ul1_bez","ul2_bez","ul2_pdv","ul3_bez","ul3_pdv","ul4_bez","ul4_pdv",
  "ul5_bez","ul5_pdv","ul6_bez","ul6_pdv","ul7_pdv","ul8_bez","ul8_pdv",
  "ul9_pdv","zalihe_bez",
);
if (NUM_KEYS.length !== 57) throw new Error("NUM_KEYS != 57");

const numSlots = [];
let bad = 0;
NUM_KEYS.forEach((key, i) => {
  const b = Buffer.alloc(8);
  b.writeDoubleLE(MAGIC_BASE + i, 0);
  const offs = findAll(buf, b);
  const expected = i < 28 ? 1 : 2; // iznosi imaju i keš formule na ws2
  if (offs.length !== expected) {
    console.log(`!! ${key} (magic ${i}): nađeno ${offs.length}, očekivano ${expected}`);
    bad++;
  }
  numSlots.push({ key, i, offs });
});

const STR_DEFS = [
  ["naziv", "NAZIV", 80, 2],
  ["adresa", "ADRESA", 60, 2],
  ["telefon", "TELEFON", 30, 2],
  ["djelatnost", "DJELATNOST", 60, 2],
  ["pretezna", "PRETEZNA", 40, 2],
  ["mjesto", "MJESTO", 30, 2],
  ["datum", "DATUM", 11, 2],
  ["odgovorno", "ODGOVORNO", 40, 2],
  ["s2_id", "IDB", 12, 1],
  ["s2_per", "PER", 4, 1],
  ["s2_datdo", "DATDO", 8, 1],
];
const strSlots = [];
for (const [key, tag, len, expected] of STR_DEFS) {
  const offs = findAll(buf, utf16(ph(tag, len)));
  if (offs.length !== expected) {
    console.log(`!! ${key}: nađeno ${offs.length}, očekivano ${expected}`);
    bad++;
  }
  strSlots.push({ key, tag, len, offs });
}

if (bad) {
  console.log("GREŠKE:", bad);
  process.exit(1);
}
console.log("svi uzorci nađeni tačno.");
console.log("veličina templatea:", buf.length);

// ── 3) TS tabela ─────────────────────────────────────────────────────────
const lines = [];
lines.push("const NUM_SLOTS: { key: string; i: number; offs: number[] }[] = [");
for (const s of numSlots) lines.push(`  { key: "${s.key}", i: ${s.i}, offs: [${s.offs.join(", ")}] },`);
lines.push("];");
lines.push("");
lines.push("const STR_SLOTS: { key: string; tag: string; len: number; offs: number[] }[] = [");
for (const s of strSlots) lines.push(`  { key: "${s.key}", tag: "${s.tag}", len: ${s.len}, offs: [${s.offs.join(", ")}] },`);
lines.push("];");
console.log("\n" + lines.join("\n"));
