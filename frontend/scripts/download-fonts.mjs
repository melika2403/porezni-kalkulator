// Self-hosting Google fontova: skine woff2 fajlove i generiše
// src/app/fonts.css sa ISTIM font-family imenima (DM Sans, DM Serif
// Display), pa sve postojeće CSS reference rade bez izmjena.
// Pokretanje: node scripts/download-fonts.mjs
import fs from "node:fs";
import path from "node:path";

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const OUT_DIR = "public/fonts";
fs.mkdirSync(OUT_DIR, { recursive: true });

const res = await fetch(CSS_URL, { headers: { "User-Agent": UA } });
let css = await res.text();

const urls = [
  ...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g),
].map((m) => m[1]);
const unique = [...new Set(urls)];
console.log("woff2 fajlova:", unique.length);

for (const u of unique) {
  const name = u.split("/").slice(-2).join("-");
  const local = path.join(OUT_DIR, name);
  const r = await fetch(u, { headers: { "User-Agent": UA } });
  fs.writeFileSync(local, Buffer.from(await r.arrayBuffer()));
  css = css.split(u).join(`/fonts/${name}`);
}

const header =
  "/* Self-hostani Google fontovi (DM Sans, DM Serif Display).\n" +
  "   Generisano skriptom scripts/download-fonts.mjs.\n" +
  "   Ista font-family imena kao prije, pa sve postojece reference rade. */\n\n";
fs.writeFileSync("src/app/fonts.css", header + css);
console.log("snimljeno: src/app/fonts.css + fajlovi u public/fonts/");
