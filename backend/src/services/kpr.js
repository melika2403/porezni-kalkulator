// KPR-1041 (Knjiga prihoda i rashoda) — izvedena knjiga.
//
// Knjiga se NE vodi kao posebna tabela nego se računa iz potvrđenih
// stavki izvoda sa kategorijom koja ide u KPR. Time je uvijek u sinhronu:
// promjena kategorije ili statusa stavke odmah mijenja knjigu, nema
// duplog knjiženja ni storniranja u Fazi 2.
//
// Kolone obrasca (sve sume u feninzima dok se ne vrati rezultat):
//   11 prihod u gotovini, 12 preko računa, 13 u stvarima/uslugama,
//   14 PDV u prihodima, 15 = 11+12+13−14,
//   16 roba/materijal, 17 bruto plate, 18 doprinosi poduzetnika,
//   19 ostali rashodi, 20 PDV u rashodima, 21 = 16+17+18+19−20.
//
// PDV split (samo PDV obveznici, kategorije sa pdvSplit): iz bruto iznosa
// se izbija 17%: pdv = round(bruto * 17 / 117).

const { Op } = require("sequelize");
const {
  BankTransaction,
  BankStatement,
  Organization,
  Worker,
  TkmPazar,
} = require("../models/index");
const { CATEGORY_BY_ID } = require("./bankStatements/categories");
const { decryptJmbg } = require("../utils/encryptJmbg");

const COLS = ["k11", "k12", "k13", "k14", "k15", "k16", "k17", "k18", "k19", "k20", "k21"];

function pdvFromGross(grossCents) {
  return Math.round((grossCents * 17) / 117);
}

function emptyCols() {
  const o = {};
  for (const c of COLS) o[c] = 0;
  return o;
}

function centsToKm(obj) {
  const o = {};
  for (const c of COLS) o[c] = obj[c] / 100;
  return o;
}

/**
 * @param {number} organizationId
 * @param {string} from - ISO datum početka perioda (uključivo)
 * @param {string} to - ISO datum kraja perioda (uključivo)
 */
async function buildKpr(organizationId, from, to) {
  const org = await Organization.findByPk(organizationId, {
    attributes: [
      "id",
      "name",
      "address",
      "city",
      "taxNumber",
      "isPdvObveznik",
      "kprPazarIzKp",
    ],
  });
  if (!org) return null;
  // opcija po obrtu: prihod od pazara u KPR ide iz dnevnog prometa
  // (KP-1042/tkm_pazari) umjesto iz pologa sa izvoda; tada se kategorija
  // PAZAR sa izvoda BEZUSLOVNO isključuje iz knjige (i ručno potvrđena),
  // da se isti novac ne knjiži dvaput
  const pazarIzKp = !!org.kprPazarIzKp;

  // vlasnik obrta postoji kao Worker sa rolom VLASNIK (dijeljeno sa
  // marketing dijelom) — za polja 1-3 KPR obrasca
  const vlasnik = await Worker.findOne({
    where: { organizationId, role: "VLASNIK" },
    attributes: ["firstName", "lastName", "jmbg", "address", "city"],
    order: [["id", "ASC"]],
  });
  let vlasnikJmb = "";
  if (vlasnik && vlasnik.jmbg) {
    try {
      vlasnikJmb = decryptJmbg(vlasnik.jmbg) || "";
    } catch {
      vlasnikJmb = "";
    }
  }

  const txs = await BankTransaction.findAll({
    where: {
      organizationId,
      status: "CONFIRMED",
      category: { [Op.ne]: null },
      date: { [Op.gte]: from, [Op.lte]: to },
    },
    include: [
      {
        model: BankStatement,
        as: "statement",
        attributes: ["statementNumber", "bankName"],
      },
    ],
    order: [
      ["date", "ASC"],
      ["id", "ASC"],
    ],
  });

  const rows = [];
  const totals = emptyCols();

  for (const tx of txs) {
    const cat = CATEGORY_BY_ID.get(tx.category);
    if (!cat || cat.kprColumn == null) continue; // "ne ide u KPR"
    // pazar ide iz KP-1042: polozi sa izvoda su samo prenos novca
    if (pazarIzKp && tx.category === "PAZAR") continue;

    const gross = Math.round(Number(tx.amount) * 100);
    const pdv = org.isPdvObveznik && cat.pdvSplit ? pdvFromGross(gross) : 0;
    const cols = emptyCols();

    if (tx.direction === "IN") {
      cols[`k${cat.kprColumn}`] = gross;
      cols.k14 = pdv;
      cols.k15 = gross - pdv;
    } else {
      cols[`k${cat.kprColumn}`] = gross;
      cols.k20 = pdv;
      cols.k21 = gross - pdv;
    }
    for (const c of COLS) totals[c] += cols[c];

    const statementNumber = tx.statement ? tx.statement.statementNumber : null;
    rows.push({
      datum: tx.date,
      brojDokumenta: statementNumber
        ? `Izvod ${statementNumber}`
        : tx.reference || "-",
      // kratak opis tipa knjiženja (ne ime organizacije)
      opis: cat.kprOpis || cat.label,
      kategorija: tx.category,
      ...centsToKm(cols),
    });
  }

  // dnevni promet iz KP-1042 kao prihod u gotovini (kolona 11), sa PDV
  // splitom za obveznike (bruto pazar sadrži PDV)
  if (pazarIzKp) {
    const pazari = await TkmPazar.findAll({
      where: { organizationId, datum: { [Op.gte]: from, [Op.lte]: to } },
      order: [["datum", "ASC"], ["id", "ASC"]],
    });
    for (const p of pazari) {
      const gross = Math.round(Number(p.iznos) * 100);
      const pdv = org.isPdvObveznik ? pdvFromGross(gross) : 0;
      const cols = emptyCols();
      cols.k11 = gross;
      cols.k14 = pdv;
      cols.k15 = gross - pdv;
      for (const c of COLS) totals[c] += cols[c];
      rows.push({
        datum: p.datum,
        brojDokumenta: "KP-1042",
        opis: p.opis || "Dnevni promet (pazar)",
        kategorija: "PAZAR",
        ...centsToKm(cols),
      });
    }
    // hronološki redoslijed nakon spajanja dva izvora
    rows.sort((a, b) => a.datum.localeCompare(b.datum));
  }

  rows.forEach((r, i) => {
    r.rbr = i + 1;
  });

  return {
    from,
    to,
    isPdvObveznik: !!org.isPdvObveznik,
    obveznik: {
      naziv: org.name,
      jib: org.taxNumber || "",
      adresa: [org.address, org.city].filter(Boolean).join(", "),
      vlasnikIme: vlasnik
        ? `${vlasnik.lastName} ${vlasnik.firstName}`.trim()
        : "",
      vlasnikJmb,
      vlasnikAdresa: vlasnik
        ? [vlasnik.address, vlasnik.city].filter(Boolean).join(", ")
        : "",
    },
    rows,
    totals: centsToKm(totals),
  };
}

module.exports = { buildKpr };
