// Dev provjera višestraničnog KPR-1041 popunjavanja, van browsera.
// Pokretanje (Node 24, type stripping):
//   cd frontend && node scripts/test-kpr-fill.mjs [brojRedova]
// Generiše test PDF u backend/test/kpr-fill-test.pdf za vizuelni pregled.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fillKpr1041 } from "../src/sections/kpr/fillKpr1041.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const rowCount = Number(process.argv[2]) || 40;

const rows = [];
for (let i = 1; i <= rowCount; i++) {
  const prihod = i % 3 !== 0;
  const amount = Math.round((100 + i * 7.77) * 100) / 100;
  rows.push({
    rbr: i,
    datum: `2026-${String(((i - 1) % 12) + 1).padStart(2, "0")}-15`,
    brojDokumenta: `Izvod ${i}`,
    opis: prihod ? (i % 2 ? "Polog pazara" : "Naplata preko računa") : "Bankarska provizija",
    kategorija: prihod ? "PAZAR" : "PROVIZIJA_BANKE",
    k11: prihod && i % 2 ? amount : 0,
    k12: prihod && !(i % 2) ? amount : 0,
    k13: 0,
    k14: 0,
    k15: prihod ? amount : 0,
    k16: 0,
    k17: 0,
    k18: 0,
    k19: prihod ? 0 : amount,
    k20: 0,
    k21: prihod ? 0 : amount,
  });
}
const totals = rows.reduce(
  (acc, r) => {
    for (const k of Object.keys(acc)) acc[k] = Math.round((acc[k] + r[k]) * 100) / 100;
    return acc;
  },
  { k11: 0, k12: 0, k13: 0, k14: 0, k15: 0, k16: 0, k17: 0, k18: 0, k19: 0, k20: 0, k21: 0 },
);

const data = {
  from: "2026-01-01",
  to: "2026-12-31",
  isPdvObveznik: false,
  obveznik: {
    naziv: "Test Obrt VL Testić Test",
    jib: "4123456789012",
    adresa: "Testna ulica 1, Cazin",
    vlasnikIme: "Testić Test",
    vlasnikJmb: "0101990123456",
    vlasnikAdresa: "Vlasnička 2, Cazin",
  },
  rows,
  totals,
};

const templateBytes = fs.readFileSync(path.join(here, "..", "public", "templates", "KPR-1041.pdf"));
const fontBytes = fs.readFileSync(path.join(here, "..", "public", "templates", "arial.ttf"));

const bytes = await fillKpr1041(data, {
  templateBytes: templateBytes.buffer.slice(templateBytes.byteOffset, templateBytes.byteOffset + templateBytes.byteLength),
  fontBytes: fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength),
});

const outPath = path.join(here, "..", "..", "backend", "test", "kpr-fill-test.pdf");
fs.writeFileSync(outPath, bytes);
console.log(`OK: ${rowCount} redova → ${outPath} (${bytes.length} bajtova)`);
console.log(`Očekivano stranica: ${rowCount <= 13 ? 1 : 1 + Math.ceil((rowCount - 13) / 16)}`);
console.log(`Ukupno k15 (prihodi): ${totals.k15}, k21 (rashodi): ${totals.k21}`);
