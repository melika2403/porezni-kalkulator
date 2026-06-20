// Puca ako nađe em dash (—) u PK Office dijelu koda.
// Glavni (marketing) dio se NE skenira jer ima ~1300 postojećih em dasheva
// koji se čiste postepeno (vidi AGENTS.md). Novi PK Office kod mora biti čist.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

// Skeniramo samo PK Office dio.
const SCAN_DIRS = [
  "src/app/(app)",
  "src/components/app-shell",
  "src/sections/dashboard",
];

const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".md"]);
const EM_DASH = "—"; // —

/** @param {string} dir @param {string[]} out */
function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return; // dir ne postoji, preskoči
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else {
      const dot = name.lastIndexOf(".");
      if (dot !== -1 && EXT.has(name.slice(dot))) out.push(full);
    }
  }
}

const files = [];
for (const d of SCAN_DIRS) walk(join(ROOT, d), files);

const hits = [];
for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes(EM_DASH)) {
      hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
    }
  });
}

if (hits.length) {
  console.error(`\nNađeno ${hits.length} em dash(eva) u PK Office kodu:\n`);
  for (const h of hits) console.error("  " + h);
  console.error(
    "\nZamijeni em dash (—) zarezom, dvotačkom, tačkom, crticom (-), srednjom tačkom (·) ili en dashom (–) za prazne vrijednosti.\n",
  );
  process.exit(1);
}

console.log(`check:emdash ok (${files.length} fajlova, 0 em dasheva)`);
