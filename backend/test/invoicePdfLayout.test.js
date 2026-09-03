// Raspored fakture (mjereno na stvarno generisanom PDF-u, ne "na oko").
//   • dvojezično zaglavlje tabele: natpisi drugog reda su se preklapali
//     (stopa poreza je ulazila u natpis iznosa),
//   • red "slovima": na velikim iznosima je bez prelamanja ulazio u kolonu
//     totala (koja počinje na x 344), dvojezično u oba reda.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JMBG_ENCRYPT_KEY = process.env.JMBG_ENCRYPT_KEY || "0".repeat(64);

const { generateInvoicePdf } = require("../src/utils/invoicePdf");
const { extractTextItems } = require("../src/utils/pdfText");

// lijeva ivica kolone totala; sve lijevo od nje je slobodno
const TOT_L = 344;

function faktura(jezik, gross) {
  const net = +(gross / 1.17).toFixed(2);
  return {
    type: "INVOICE",
    docType: "STANDARD",
    jezik,
    currency: "BAM",
    applyVat: true,
    vrstaIsporuke: "OPOREZIVA",
    fullNumber: "F-0001-2026",
    issueDate: "2026-09-02",
    dueDate: "2026-09-17",
    sellerName: "Testni obrt",
    sellerAddress: "Ulica 1",
    sellerCity: "Sarajevo",
    buyerName: "Foreign Buyer Ltd",
    buyerAddress: "Street 5",
    buyerCity: "London",
    items: [
      { ordinal: 1, name: "Usluga", unit: "kom", quantity: 1, unitPrice: net, discountPct: 0, vatPct: 17 },
    ],
    netTotal: net,
    discountTotal: 0,
    vatTotal: +(gross - net).toFixed(2),
    grossTotal: gross,
  };
}

// Svi tekstovi sa iste linije, poredani slijeva; vraća parove koji se dodiruju.
async function preklapanja(invoice) {
  const pages = await extractTextItems(await generateInvoicePdf(invoice));
  const redovi = new Map();
  for (const it of pages[0].items) {
    if (!it.str.trim()) continue;
    const k = Math.round(it.y * 2) / 2;
    if (!redovi.has(k)) redovi.set(k, []);
    redovi.get(k).push(it);
  }
  const sudari = [];
  for (const [y, red] of redovi) {
    const s = red.slice().sort((a, b) => a.x - b.x);
    for (let i = 1; i < s.length; i++) {
      const kraj = s[i - 1].x + s[i - 1].w;
      if (kraj > s[i].x + 0.05) {
        sudari.push(`y=${y}: "${s[i - 1].str}" (do ${kraj.toFixed(1)}) ulazi u "${s[i].str}" (od ${s[i].x.toFixed(1)})`);
      }
    }
  }
  return { sudari, items: pages[0].items };
}

for (const jezik of ["bs", "en", "bs-en"]) {
  test(`zaglavlje i iznosi se ne preklapaju (jezik ${jezik})`, async () => {
    for (const gross of [117, 12345, 144443.52, 999999.99]) {
      const { sudari } = await preklapanja(faktura(jezik, gross));
      assert.deepEqual(sudari, [], `${jezik} / ${gross}`);
    }
  });

  test(`red slovima ostaje lijevo od kolone totala (jezik ${jezik})`, async () => {
    for (const gross of [12345, 144443.52, 999999.99, 9876543.21]) {
      const { items } = await preklapanja(faktura(jezik, gross));
      const slovima = items.filter((i) =>
        /SLOVIMA|IN WORDS|Hiljada|Miliona|thousand|million/i.test(i.str),
      );
      assert.ok(slovima.length > 0, "red slovima mora postojati");
      for (const s of slovima) {
        assert.ok(
          s.x + s.w <= TOT_L,
          `${jezik} / ${gross}: "${s.str.slice(0, 40)}" ide do ${(s.x + s.w).toFixed(1)}, a kolona totala počinje na ${TOT_L}`,
        );
      }
    }
  });
}
