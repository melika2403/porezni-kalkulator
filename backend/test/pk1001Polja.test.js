// Provjera mape polja obrasca PK-1001 NAD STVARNIM ŠABLONOM.
//
// Regresija: comb polja (JMB, iznosi, koeficijenti) u ovom šablonu nemaju /DA
// zapis, pa pdf-lib baca grešku na setFontSize. Dok je taj poziv bio prije
// setText-a i unutar istog try bloka, 96 od 145 polja je ostajalo prazno, a
// obrazac je izgledao ispravno jer su se imena i srodstva ipak upisala.
// Ovaj test puni SVA polja iz mape i traži da svako vrati svoju vrijednost.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { PDFDocument } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const FRONTEND = path.join(__dirname, "..", "..", "frontend");
const SABLON = path.join(FRONTEND, "public", "templates", "PK-1001.pdf");
const FONT = path.join(FRONTEND, "public", "templates", "arialbd.ttf");
const MAPA_PATH = path.join(
  FRONTEND,
  "src",
  "sections",
  "porezna-kartica",
  "pk1001Polja.ts",
);

let mapa;
test.before(async () => {
  mapa = await import(pathToFileURL(MAPA_PATH).href);
});

// Isti postupak kao u fillPk1001.ts: veličina fonta se postavlja odvojeno i
// smije pasti, upis vrijednosti ne smije.
function upisi(form, font, ime, vrijednost) {
  const polje = form.getTextField(ime);
  try {
    polje.setFontSize(9);
  } catch {
    // comb polje bez /DA
  }
  polje.setText(vrijednost);
  polje.updateAppearances(font);
  return polje.getText();
}

async function otvori() {
  const doc = await PDFDocument.load(fs.readFileSync(SABLON));
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fs.readFileSync(FONT));
  return { doc, font, form: doc.getForm() };
}

test("šablon PK-1001 postoji i ima očekivan broj polja", async () => {
  const { form } = await otvori();
  const polja = form.getFields();
  assert.equal(polja.length, 150);
  const kvacice = polja.filter((f) => f.constructor.name === "PDFCheckBox");
  assert.equal(kvacice.length, 5); // 3 vrste zahtjeva + zaposlen/nezaposlen
});

test("sva polja iz mape postoje u šablonu i primaju vrijednost", async () => {
  const { form, font } = await otvori();
  const grupe = [
    ["Dio 3", mapa.RED_BRACNI],
    ["Dio 4", mapa.RED_DJECA],
    ["Dio 5", mapa.RED_OSTALI],
    ["Dio 6", mapa.RED_ALIMENTACIJE],
    ["Dio 7", mapa.RED_INVALIDNOST],
  ];
  let provjereno = 0;
  for (const [dio, redovi] of grupe) {
    redovi.forEach((r, i) => {
      const testVrijednosti = {
        jmb: "1234567890123",
        ime: "Test Testić",
        iznosCijeli: "150",
        iznosDec: "50",
        srodstvo: "majka",
        udio: "100",
        koefCijeli: "0",
        koefDec: "50",
      };
      for (const [kolona, vrijednost] of Object.entries(testVrijednosti)) {
        const ime = r[kolona];
        if (!ime) continue; // kolona ne postoji u tom dijelu (npr. prihod u Dijelu 7)
        const dobio = upisi(form, font, ime, vrijednost);
        assert.equal(
          dobio,
          vrijednost,
          `${dio}, red ${i + 1}, kolona ${kolona} (polje "${ime}") nije primilo vrijednost`,
        );
        provjereno++;
      }
    });
  }
  // 1 + 5 + 4 + 4 + 3 redova sa svojim kolonama
  assert.ok(provjereno >= 100, `provjereno samo ${provjereno} polja`);
});

test("polja Dijela 1, 2, 8 i 9 primaju vrijednost", async () => {
  const { form, font } = await otvori();
  const jednostavna = [
    ["1 Prezime", "Hodžić"],
    ["2 Ime", "Amina"],
    ["3 Ime jednog roditelja", "Salih"],
    ["4 JMB", "1010000323135"],
    ["5 Adresa prebivališta", "Ulica 1"],
    ["fill_1", "Cazin"],
    ["comb_2", "10"],
    ["undefined", "10"],
    ["undefined_2", "2000"],
    ["8 Telefon", "061"],
    ["undefined_3", "16"],
    ["undefined_4", "533840"],
    ["undefined_5", "2222222222222"],
    ["10 Naziv poslodavca", "Test Obrt"],
    [mapa.POLJE_UKUPAN_KOEF, "3,80"],
    ...mapa.POLJE_DATUM_PRIMJENE.map((ime, i) => [ime, ["15", "08", "2026"][i]]),
    ...mapa.POLJE_DATUM_PODNOSENJA.map((ime, i) => [ime, ["15", "08", "2026"][i]]),
  ];
  for (const [ime, vrijednost] of jednostavna) {
    assert.equal(
      upisi(form, font, ime, vrijednost),
      vrijednost,
      `polje "${ime}" nije primilo vrijednost`,
    );
  }
});

test("kvačice zaglavlja i statusa se mogu označiti", async () => {
  const { form } = await otvori();
  for (const ime of [
    "Prvo izdavanje",
    "Izmjena",
    "Poništavanje",
    "Zaposlen",
    "Nezaposlen",
  ]) {
    const cb = form.getCheckBox(ime);
    cb.check();
    assert.equal(cb.isChecked(), true, `kvačica "${ime}" se ne može označiti`);
  }
});

test("nijedno ime polja se ne ponavlja u mapi (kopiran red bi tiho pregazio drugi)", () => {
  const sva = [
    ...mapa.RED_BRACNI,
    ...mapa.RED_DJECA,
    ...mapa.RED_OSTALI,
    ...mapa.RED_ALIMENTACIJE,
    ...mapa.RED_INVALIDNOST,
  ].flatMap((r) => Object.values(r).filter(Boolean));
  const vidjeno = new Set();
  for (const ime of sva) {
    assert.equal(vidjeno.has(ime), false, `ime polja "${ime}" se ponavlja u mapi`);
    vidjeno.add(ime);
  }
});
