const path = require("path");
const fs = require("fs");
const Module = require("module");
const originalRequire = Module.prototype.require;

// Direct file load approach
const predracunPdfPath = "/sessions/kind-bold-turing/mnt/Porezni kalkulator/backend/src/utils/predracunPdf.js";
const predracunPdfCode = fs.readFileSync(predracunPdfPath, "utf-8");

// Create a module in memory
const module = new Module();
module.paths = ["/sessions/kind-bold-turing/mnt/Porezni kalkulator/backend/node_modules"];
module._compile(predracunPdfCode, predracunPdfPath);
const { generatePredracunPdf, formatBroj } = module.exports;

(async () => {
  try {
    const issueDate = new Date(2026, 4, 5); // 2026-05-05
    const dueDate = new Date(2026, 5, 4);   // +30
    const buf = await generatePredracunPdf({
      plan: "BUSINESS",
      fullNumber: formatBroj(1, 2026),
      issueDate,
      dueDate,
      buyer: {
        code: "000001",
        name: '"DURIĆ BETON" DOO CAZIN',
        address: "OSTROŽAC 225",
        city: "CAZIN",
        postalCode: "77220",
        phone: "",
        email: "test@durić.ba",
        idNumber: "4263257570008",
        vatNumber: "263257570008",
      },
    });
    const out = "/sessions/kind-bold-turing/mnt/Porezni kalkulator/test-predracun-business.pdf";
    fs.writeFileSync(out, buf);
    console.log("OK:", out, buf.length, "bytes");

    // also test PRO
    const buf2 = await generatePredracunPdf({
      plan: "PRO",
      fullNumber: formatBroj(2, 2026),
      issueDate,
      dueDate,
      buyer: {
        code: "000002",
        name: "TEST OBRT, vl. Marko Marković",
        address: "Ulica testa 12",
        city: "Sarajevo",
        postalCode: "71000",
        phone: "+387 61 123 456",
        email: "test@obrt.ba",
        idNumber: "1234567890003",
        vatNumber: "234567890003",
      },
    });
    const out2 = "/sessions/kind-bold-turing/mnt/Porezni kalkulator/test-predracun-pro.pdf";
    fs.writeFileSync(out2, buf2);
    console.log("OK:", out2, buf2.length, "bytes");
  } catch (e) {
    console.error("FAIL:", e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
