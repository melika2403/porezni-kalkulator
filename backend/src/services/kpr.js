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
  Invoice,
  UlazniRacun,
} = require("../models/index");
const { CATEGORY_BY_ID } = require("./bankStatements/categories");
const { decryptJmbg } = require("../utils/encryptJmbg");

const COLS = ["k11", "k12", "k13", "k14", "k15", "k16", "k17", "k18", "k19", "k20", "k21"];

function pdvFromGross(grossCents) {
  return Math.round((grossCents * 17) / 117);
}

// Da li je obrt bio u sistemu PDV-a na dati datum (DATEONLY string poredba).
// Koristi se SAMO kad je bar jedan od datuma postavljen (prelazni period);
// bez datuma važi staro ponašanje po trenutnom flagu, nula regresije.
function isInPdvOn(dateStr, org) {
  const od = org.pdvObveznikOd || null;
  const izasao = org.pdvObveznikDo || null;
  if (org.isPdvObveznik) {
    // trenutno obveznik: od datuma ulaska (null = oduvijek)
    return !od || dateStr >= od;
  }
  // trenutno NIJE obveznik: bio je samo u prozoru [od, do)
  if (!izasao) return false;
  return dateStr < izasao && (!od || dateStr >= od);
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
      "pdvObveznikOd",
      "pdvObveznikDo",
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

  // ── PDV split u prelaznom periodu (ulazak/izlazak iz PDV-a usred godine) ──
  // Bez postavljenih datuma: staro ponašanje (trenutni flag), postojeće knjige
  // ostaju identične. Sa datumom: odlučuje DOKUMENT koji se naplaćuje/plaća
  // (naplata stare ne-PDV fakture nema PDV-a i poslije ulaska u sistem, i
  // obratno), a za nevezane transakcije datum transakcije vs prozor PDV-a.
  const prelazniPeriod = !!(org.pdvObveznikOd || org.pdvObveznikDo);
  const invoiceById = new Map();
  const ulazniById = new Map();
  if (prelazniPeriod) {
    const invIds = [...new Set(txs.map((t) => t.invoiceId).filter(Boolean))];
    const urIds = [...new Set(txs.map((t) => t.ulazniRacunId).filter(Boolean))];
    if (invIds.length) {
      const invs = await Invoice.findAll({
        where: { id: { [Op.in]: invIds } },
        attributes: ["id", "applyVat", "vrstaIsporuke"],
      });
      for (const inv of invs) invoiceById.set(inv.id, inv);
    }
    if (urIds.length) {
      const urs = await UlazniRacun.findAll({
        where: { id: { [Op.in]: urIds } },
        attributes: [
          "id",
          "iznos",
          "pdvIznos",
          "pdvNeodbitan",
          "pdvNeodbitniIznos",
          "datumRacuna",
        ],
      });
      for (const ur of urs) ulazniById.set(ur.id, ur);
    }
  }

  // PDV komponenta jedne transakcije (u feninzima).
  function txPdv(tx, cat, gross) {
    if (!cat.pdvSplit) return 0;
    if (!prelazniPeriod) {
      // staro ponašanje: trenutni flag odlučuje za sve
      return org.isPdvObveznik ? pdvFromGross(gross) : 0;
    }
    if (tx.direction === "IN" && tx.invoiceId && invoiceById.has(tx.invoiceId)) {
      // naplata vezane izlazne fakture: PDV postoji samo ako je faktura
      // izdana sa PDV-om (snapshot na fakturi), bez obzira na datum uplate
      const inv = invoiceById.get(tx.invoiceId);
      return inv.applyVat && inv.vrstaIsporuke === "OPOREZIVA"
        ? pdvFromGross(gross)
        : 0;
    }
    if (
      tx.direction === "OUT" &&
      tx.ulazniRacunId &&
      ulazniById.has(tx.ulazniRacunId)
    ) {
      // plaćanje vezanog ulaznog računa: odbitni PDV sa računa, srazmjerno
      // plaćenom dijelu; odbitka nema ako obrt nije bio u PDV-u na datum računa
      const ur = ulazniById.get(tx.ulazniRacunId);
      const iznos = Math.round(Number(ur.iznos) * 100);
      const odbitni = ur.pdvNeodbitan
        ? 0
        : Math.max(
            0,
            Math.round(
              ((Number(ur.pdvIznos) || 0) -
                (Number(ur.pdvNeodbitniIznos) || 0)) * 100,
            ),
          );
      if (iznos <= 0 || odbitni <= 0) return 0;
      if (!isInPdvOn(String(ur.datumRacuna), org)) return 0;
      return Math.min(odbitni, Math.round((gross * odbitni) / iznos));
    }
    // nevezana transakcija: datum transakcije vs PDV prozor
    return isInPdvOn(String(tx.date), org) ? pdvFromGross(gross) : 0;
  }

  const rows = [];
  const totals = emptyCols();

  for (const tx of txs) {
    const cat = CATEGORY_BY_ID.get(tx.category);
    if (!cat || cat.kprColumn == null) continue; // "ne ide u KPR"
    // pazar ide iz KP-1042: polozi sa izvoda su samo prenos novca
    if (pazarIzKp && tx.category === "PAZAR") continue;

    const gross = Math.round(Number(tx.amount) * 100);
    const pdv = txPdv(tx, cat, gross);
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
      // izvor knjiženja, za klik na red u web knjizi
      statementId: tx.statementId || null,
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
      // pazar je promet tog dana: u prelaznom periodu PDV samo ako je obrt
      // bio u sistemu PDV-a na datum prometa
      const pdv = prelazniPeriod
        ? isInPdvOn(String(p.datum), org)
          ? pdvFromGross(gross)
          : 0
        : org.isPdvObveznik
          ? pdvFromGross(gross)
          : 0;
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
        statementId: null,
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
    // Flag upravlja prikazom PDV kolona (14/20) i oznakom na Zbirnom obračunu.
    // Kod izlaska iz PDV-a usred godine trenutni flag je false, a raniji
    // mjeseci u periodu IMAJU izdvojen PDV: kolone tada moraju ostati vidljive,
    // pa je flag true i kad period stvarno sadrži PDV split.
    isPdvObveznik: !!org.isPdvObveznik || totals.k14 > 0 || totals.k20 > 0,
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
