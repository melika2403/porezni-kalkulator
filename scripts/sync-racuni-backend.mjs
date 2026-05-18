#!/usr/bin/env node
// Generates backend/src/utils/uplatniRacuniData.json from
// frontend/src/data/uplatni-racuni.ts so that backend payroll uplatnice use
// the same data as frontend forms.
//
// Run: node scripts/sync-racuni-backend.mjs
// Run after editing frontend/src/data/uplatni-racuni.ts.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "frontend/src/data/uplatni-racuni.ts");
const OUT = path.join(ROOT, "backend/src/utils/uplatniRacuniData.json");

const src = fs.readFileSync(SRC, "utf8");

// Parse KANTONI const declaration as TS literal — convert to valid JSON.
function extractObject(text, startMarker) {
  const idx = text.indexOf(startMarker);
  if (idx < 0) throw new Error(`Missing marker: ${startMarker}`);
  const objStart = text.indexOf("{", idx);
  if (objStart < 0) throw new Error(`Object opening { not found after ${startMarker}`);
  // Brace-balanced match
  let depth = 0;
  let i = objStart;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(objStart, i + 1);
      }
    }
  }
  throw new Error("Unbalanced braces");
}

function extractConst(text, name) {
  const re = new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`);
  const m = text.match(re);
  if (!m) throw new Error(`Missing constant ${name}`);
  return m[1];
}

// Convert TS-style object literal to JSON: strip trailing commas, unquoted keys.
function tsObjectToJson(s) {
  // Remove single-line comments
  let out = s.replace(/^\s*\/\/.*$/gm, "");
  // Remove inline trailing comments after value
  out = out.replace(/,\s*\/\/.*$/gm, ",");
  out = out.replace(/\s*\/\/.*$/gm, "");
  // Quote unquoted identifier keys: { foo: ... } → { "foo": ... }
  out = out.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
  // Remove trailing commas before } or ]
  out = out.replace(/,(\s*[}\]])/g, "$1");
  return out;
}

const kantoniText = extractObject(src, "export const KANTONI");
const kantoniJson = tsObjectToJson(kantoniText);
const KANTONI = JSON.parse(kantoniJson);

const data = {
  KANTONI,
  FBIH_BUDZET_RACUN: extractConst(src, "FBIH_BUDZET_RACUN"),
  FBIH_ZO_RACUN: extractConst(src, "FBIH_ZO_RACUN"),
  FBIH_NEZAP_RACUN: extractConst(src, "FBIH_NEZAP_RACUN"),
  FOND_INVALIDI_RACUN: extractConst(src, "FOND_INVALIDI_RACUN"),
  JRT_TREZOR_BIH_RACUN: extractConst(src, "JRT_TREZOR_BIH_RACUN"),
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Wrote ${OUT}`);
console.log(`Kantons: ${Object.keys(KANTONI).length}, federal accounts: 5`);
