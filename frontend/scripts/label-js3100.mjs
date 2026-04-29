import { readFileSync, writeFileSync } from "fs";
import { PDFDocument } from "pdf-lib";

const bytes = readFileSync("./public/templates/JS3100.pdf");
const doc = await PDFDocument.load(bytes);
const form = doc.getForm();

for (const f of form.getFields()) {
  const name = f.getName();
  const type = f.constructor.name;
  if (type === "PDFTextField") {
    try {
      f.setText(name);
    } catch {}
  } else if (type === "PDFCheckBox") {
    // Don't check boxes — just note their position via rectangle
  }
}

form.flatten();
const out = await doc.save();
writeFileSync("./public/templates/JS3100_labeled.pdf", out);
console.log("Saved JS3100_labeled.pdf — open it to see where each field is.");
