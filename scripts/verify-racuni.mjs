#!/usr/bin/env node
// Verifies that all uplatni računi we use in forms match the live PUFBiH data.
// Live source: https://www.pufbih.ba/api/uplatni-racuni

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const live = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/pufbih-live.json"), "utf8"),
);
const ours = JSON.parse(
  fs.readFileSync(path.join(ROOT, "backend/src/utils/uplatniRacuniData.json"), "utf8"),
);

// Extract live accounts per category
const accountRe = /\b\d{3}[-\s]?\d{2,4}[-\s]?\d{2,12}[-\s]?\d{2,3}\b/g;
const liveByCategory = {};
for (const e of live) {
  const text = e.content.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  const accounts = (text.match(accountRe) || []).map((a) => a.replace(/\s+/g, ""));
  liveByCategory[e.title.trim()] = new Set(accounts);
}

// Flatten all our accounts
const oursList = [
  ["FBIH_BUDZET_RACUN", ours.FBIH_BUDZET_RACUN, "Računi budžeta Federacije Bosne i Hercegovine"],
  ["FBIH_ZO_RACUN", ours.FBIH_ZO_RACUN, "Računi zavoda za zdravstveno osiguranje"],
  ["FBIH_NEZAP_RACUN", ours.FBIH_NEZAP_RACUN, "Računi službi/zavoda za zapošljavanje"],
  ["FOND_INVALIDI_RACUN", ours.FOND_INVALIDI_RACUN, "Računi Fonda za profesionalnu rehabilitaciju i zapošljavanje osoba sa invaliditetom"],
];
for (const [key, k] of Object.entries(ours.KANTONI)) {
  oursList.push([`KANTONI.${key}.budzet`, k.budzet, "Računi budžeta kantona"]);
  oursList.push([`KANTONI.${key}.zoRacun`, k.zoRacun, "Računi zavoda za zdravstveno osiguranje"]);
  oursList.push([`KANTONI.${key}.nezapRacun`, k.nezapRacun, "Računi službi/zavoda za zapošljavanje"]);
}

let ok = 0,
  fail = 0;
const failures = [];
for (const [name, acc, category] of oursList) {
  const liveSet = liveByCategory[category];
  if (!liveSet) {
    fail++;
    failures.push(`${name}=${acc}: category "${category}" not found in live data`);
    continue;
  }
  if (liveSet.has(acc)) {
    ok++;
  } else {
    fail++;
    failures.push(`${name}=${acc} NOT FOUND in "${category}"`);
  }
}

console.log(`✓ ${ok} / ${oursList.length} accounts verified against live PUFBiH data`);
if (fail > 0) {
  console.log(`✗ ${fail} mismatches:`);
  failures.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("All accounts match live data ✓");
