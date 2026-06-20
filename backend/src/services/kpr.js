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
    attributes: ["id", "name", "address", "city", "taxNumber", "isPdvObveznik"],
  });
  if (!org) return null;

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
  let rbr = 1;

  for (const tx of txs) {
    const cat = CATEGORY_BY_ID.get(tx.category);
    if (!cat || cat.kprColumn == null) continue; // "ne ide u KPR"

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
      rbr: rbr++,
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
