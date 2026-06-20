// Dev alat: ispiše redove PDF-a sa x koordinatama, za pravljenje
// bank parser konfiguracija. Upotreba:
//   node scripts/dumpPdf.js "test/fixtures/UNICREDIT banka.pdf" [stranica]
const fs = require("fs");
const path = require("path");
const { extractTextItems, groupIntoRows } = require("../src/utils/pdfText");

async function main() {
  const file = process.argv[2];
  const onlyPage = process.argv[3] ? Number(process.argv[3]) : null;
  if (!file) {
    console.error("Upotreba: node scripts/dumpPdf.js <pdf> [stranica]");
    process.exit(1);
  }
  const buffer = fs.readFileSync(path.resolve(file));
  const pages = await extractTextItems(buffer);
  for (const page of pages) {
    if (onlyPage && page.pageNumber !== onlyPage) continue;
    console.log(
      `\n===== STRANICA ${page.pageNumber} (${Math.round(page.width)}x${Math.round(page.height)}) =====`,
    );
    const rows = groupIntoRows(page.items);
    for (const row of rows) {
      const cells = row.items
        .map((i) => `[${Math.round(i.x)}] ${i.str}`)
        .join("  ");
      console.log(`y=${String(Math.round(row.y)).padStart(4)} | ${cells}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
