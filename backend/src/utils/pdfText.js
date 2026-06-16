// Ekstrakcija teksta sa koordinatama iz PDF-a (pdfjs-dist).
// Osnova za parsiranje bankovnih izvoda: svaki tekstualni element nosi
// x/y poziciju pa se tabela rekonstruiše po redovima (y) i kolonama (x).
//
// pdfjs-dist je ESM-only, a backend je CommonJS — zato dinamički import().

let pdfjsPromise = null;
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsPromise;
}

/**
 * Vrati tekstualne elemente svih stranica PDF-a.
 * @param {Buffer|Uint8Array} buffer - sadržaj PDF fajla
 * @returns {Promise<Array<{pageNumber:number,width:number,height:number,items:Array<{str:string,x:number,y:number,w:number,h:number}>}>>}
 *   y je odozgo (0 = vrh stranice) da poređenje "red ispod reda" bude prirodno.
 */
async function extractTextItems(buffer) {
  const pdfjs = await getPdfjs();
  const path = require("path");
  // pdfjs traži URL sa kosom crtom na kraju (i na Windowsu mora "/", ne "\")
  const standardFontDataUrl =
    path
      .join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts")
      .replace(/\\/g, "/") + "/";
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // bez worker-a u Node okruženju
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl,
  });
  const doc = await loadingTask.promise;

  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = [];
    for (const it of content.items) {
      if (!("str" in it) || it.str.trim() === "") continue;
      // transform: [scaleX, skewY, skewX, scaleY, tx, ty]; ty je od dna stranice
      const x = it.transform[4];
      const yFromBottom = it.transform[5];
      items.push({
        str: it.str,
        x,
        y: viewport.height - yFromBottom, // odozgo
        w: it.width,
        h: it.height,
      });
    }
    // sortiraj po redu pa po koloni
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    pages.push({
      pageNumber: p,
      width: viewport.width,
      height: viewport.height,
      items,
    });
  }
  await loadingTask.destroy();
  return pages;
}

/**
 * Grupiši tekstualne elemente stranice u redove po y koordinati.
 * @param {Array<{str:string,x:number,y:number}>} items
 * @param {number} tolerance - max razlika y da bi elementi bili isti red
 * @returns {Array<{y:number,items:Array<{str:string,x:number,y:number,w:number}>}>}
 */
function groupIntoRows(items, tolerance = 2.5) {
  const rows = [];
  for (const it of items) {
    const row = rows.find((r) => Math.abs(r.y - it.y) <= tolerance);
    if (row) {
      row.items.push(it);
      // ponderisani prosjek da dugi red ne "odluta"
      row.y = (row.y * (row.items.length - 1) + it.y) / row.items.length;
    } else {
      rows.push({ y: it.y, items: [it] });
    }
  }
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);
  rows.sort((a, b) => a.y - b.y);
  return rows;
}

module.exports = { extractTextItems, groupIntoRows };
