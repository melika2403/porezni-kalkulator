import { readFileSync } from "fs";
import { PDFDocument } from "pdf-lib";

const bytes = readFileSync("./public/templates/JS3100.pdf");
const doc = await PDFDocument.load(bytes);
const form = doc.getForm();

const fields = form.getFields();
const rows = [];

for (const f of fields) {
  const name = f.getName();
  const type = f.constructor.name;
  // Try to get widget rect
  const widgets = f.acroField?.getWidgets?.() ?? [];
  for (let i = 0; i < widgets.length; i++) {
    const w = widgets[i];
    const rect = w.getRectangle();
    const page = doc.getPages().findIndex((p) =>
      p.node.Annots()?.asArray().some((ref) => ref === w.dict),
    );
    rows.push({
      type,
      name: name + (widgets.length > 1 ? `[${i}]` : ""),
      page: page + 1 || "?",
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    });
  }
}

// Sort by page, then y desc (top to bottom), then x asc (left to right)
rows.sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);

console.log(`Total widgets: ${rows.length}\n`);
console.log("type".padEnd(15) + "page  " + "x".padEnd(5) + "y".padEnd(5) + "w".padEnd(5) + "h".padEnd(5) + "name");
console.log("-".repeat(80));
for (const r of rows) {
  console.log(
    r.type.padEnd(15) +
      String(r.page).padEnd(6) +
      String(r.x).padEnd(5) +
      String(r.y).padEnd(5) +
      String(r.w).padEnd(5) +
      String(r.h).padEnd(5) +
      r.name,
  );
}
