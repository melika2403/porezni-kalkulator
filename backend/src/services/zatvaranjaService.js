// ─────────────────────────────────────────────────────────────────────────────
//  Zatvaranje stavki na kartici partnera ("veze" Z1, Z2...).
//
//  Ručna veza (PartnerZatvaranje) spaja plaćanja i dokumente jedne strane
//  kartice čiji su zbirovi jednaki. Zatvoreni dokument dobije status plaćen
//  (isto kao ručno "označi plaćeno", pa ga IOS, opomene i liste vide
//  zatvorenim), a zatvoreno plaćanje nosi zatvaranjeId i ne ulazi u FIFO
//  raspodjelu na ostale dokumente. Stavka veze pamti prethodni status
//  dokumenta, pa otvaranje veze vraća sve kako je bilo.
//
//  Automatska veza je postojeće 1:1 vezanje isplate za račun (ulazniRacunId)
//  ili uplate za fakturu (invoiceId); na kartici se prikazuje kao "ZA1"...
//
//  Ovdje su samo operacije nad modelima (bez zavisnosti od kontrolera), da ih
//  mogu zvati i izvodi, fakture, ulazni računi i kalkulacije kad mijenjaju ili
//  brišu stavku koja je u vezi (veza se tada otvara, jer zbir više ne štima).
// ─────────────────────────────────────────────────────────────────────────────

const { Op } = require("sequelize");
const {
  sequelize,
  BankTransaction,
  UlazniRacun,
  Invoice,
  PartnerOpeningBalance,
  PartnerZatvaranje,
  PartnerZatvaranjeStavka,
} = require("../models");

const STRANE = ["DOBAVLJAC", "KUPAC"];

/** Otvara ručnu vezu: vraća statuse dokumenata, skida oznake sa stavki i
 *  briše vezu. Vraća false ako veza ne postoji u toj organizaciji. */
async function otvoriZatvaranje(organizationId, zatvaranjeId, transaction) {
  const run = async (t) => {
    const z = await PartnerZatvaranje.findOne({
      where: { id: zatvaranjeId, organizationId },
      transaction: t,
    });
    if (!z) return false;
    const stavke = await PartnerZatvaranjeStavka.findAll({
      where: { zatvaranjeId: z.id },
      transaction: t,
    });
    for (const s of stavke) {
      if (s.tip === "ULAZNI_RACUN") {
        await UlazniRacun.update(
          {
            zatvaranjeId: null,
            ...(s.prethodniStatus
              ? { status: s.prethodniStatus, paidAt: s.prethodniPaidAt }
              : {}),
          },
          {
            where: { id: s.refId, organizationId, zatvaranjeId: z.id },
            transaction: t,
          },
        );
      } else if (s.tip === "FAKTURA") {
        await Invoice.update(
          {
            zatvaranjeId: null,
            ...(s.prethodniStatus
              ? { status: s.prethodniStatus, paidAt: s.prethodniPaidAt }
              : {}),
          },
          {
            where: { id: s.refId, organizationId, zatvaranjeId: z.id },
            transaction: t,
          },
        );
      }
    }
    await BankTransaction.update(
      { zatvaranjeId: null },
      { where: { organizationId, zatvaranjeId: z.id }, transaction: t },
    );
    await PartnerOpeningBalance.update(
      { zatvaranjeKupacId: null },
      { where: { organizationId, zatvaranjeKupacId: z.id }, transaction: t },
    );
    await PartnerOpeningBalance.update(
      { zatvaranjeDobId: null },
      { where: { organizationId, zatvaranjeDobId: z.id }, transaction: t },
    );
    await PartnerZatvaranjeStavka.destroy({
      where: { zatvaranjeId: z.id },
      transaction: t,
    });
    await z.destroy({ transaction: t });
    return true;
  };
  return transaction ? run(transaction) : sequelize.transaction(run);
}

/** Otvara sve ručne veze u kojima je neka od navedenih stavki. Poziva se
 *  prije brisanja/izmjene stavke (izvod, račun, faktura, početno stanje), jer
 *  bi veza inače ostala sa zbirom koji više ne štima. Vraća broj otvorenih. */
async function raspustiZaStavke(
  organizationId,
  { txIds = [], racunIds = [], invoiceIds = [], openingIds = [] },
  transaction,
) {
  const ids = new Set();
  const skupi = async (Model, where, polja) => {
    if (!where) return;
    const rows = await Model.findAll({
      where: { organizationId, ...where },
      attributes: polja,
      raw: true,
      transaction,
    });
    for (const r of rows) {
      for (const p of polja) if (r[p]) ids.add(r[p]);
    }
  };
  const uListi = (arr) =>
    arr.filter((x) => x != null).length
      ? { id: { [Op.in]: arr.filter((x) => x != null) } }
      : null;
  await skupi(BankTransaction, uListi(txIds), ["zatvaranjeId"]);
  await skupi(UlazniRacun, uListi(racunIds), ["zatvaranjeId"]);
  await skupi(Invoice, uListi(invoiceIds), ["zatvaranjeId"]);
  await skupi(PartnerOpeningBalance, uListi(openingIds), [
    "zatvaranjeKupacId",
    "zatvaranjeDobId",
  ]);
  for (const id of ids) {
    await otvoriZatvaranje(organizationId, id, transaction);
  }
  return ids.size;
}

/** Oznake veza za prikaz jedne strane kartice (ekran i PDF isto).
 *  Ključ stavke: "UPLATA:<id>", "ULAZNI_RACUN:<id>", "FAKTURA:<id>",
 *  "POCETNO_STANJE:<id>". Vrijednost: { kljuc, oznaka, rucno, zatvaranjeId? }
 *  gdje je kljuc zajednički svim stavkama iste veze (za poredak po vezama). */
async function oznakeZatvaranja(organizationId, partnerId, strana) {
  const out = new Map();
  if (!STRANE.includes(strana)) return out;
  const zatvaranja = await PartnerZatvaranje.findAll({
    where: { organizationId, partnerId, strana },
    raw: true,
  });
  const zById = new Map(zatvaranja.map((z) => [z.id, z]));
  if (zatvaranja.length) {
    const stavke = await PartnerZatvaranjeStavka.findAll({
      where: { zatvaranjeId: { [Op.in]: zatvaranja.map((z) => z.id) } },
      raw: true,
    });
    for (const s of stavke) {
      const z = zById.get(s.zatvaranjeId);
      out.set(`${s.tip}:${s.refId}`, {
        kljuc: `Z${z.broj}`,
        oznaka: `Z${z.broj}`,
        rucno: true,
        zatvaranjeId: z.id,
      });
    }
  }
  // automatske 1:1 veze (isplata → račun, uplata → faktura), redom po datumu
  const kolonaVeze = strana === "DOBAVLJAC" ? "ulazniRacunId" : "invoiceId";
  const auto = await BankTransaction.findAll({
    where: {
      organizationId,
      partnerId,
      status: "CONFIRMED",
      direction: strana === "DOBAVLJAC" ? "OUT" : "IN",
      [kolonaVeze]: { [Op.ne]: null },
    },
    attributes: ["id", "date", kolonaVeze],
    order: [
      ["date", "ASC"],
      ["id", "ASC"],
    ],
    raw: true,
  });
  const tipDok = strana === "DOBAVLJAC" ? "ULAZNI_RACUN" : "FAKTURA";
  let n = 0;
  const poDokumentu = new Map();
  for (const t of auto) {
    const dokId = t[kolonaVeze];
    // više isplata na isti račun = jedna veza
    let oz = poDokumentu.get(dokId);
    if (!oz) {
      n += 1;
      // otvaranje automatske veze odvezuje sve isplate tog dokumenta
      oz = { kljuc: `ZA${n}`, oznaka: `ZA${n}`, rucno: false, tipDok, dokId };
      poDokumentu.set(dokId, oz);
    }
    out.set(`UPLATA:${t.id}`, oz);
    if (!out.has(`${tipDok}:${dokId}`)) out.set(`${tipDok}:${dokId}`, oz);
  }
  return out;
}

module.exports = {
  STRANE,
  otvoriZatvaranje,
  raspustiZaStavke,
  oznakeZatvaranja,
};
