// Ručno zatvaranje stavki na kartici partnera (veze Z1, Z2...) i otvaranje
// veza, ručnih i automatskih. Model i pravila: services/zatvaranjaService.js.

const {
  sequelize,
  Partner,
  BankTransaction,
  UlazniRacun,
  Invoice,
  PartnerOpeningBalance,
  PartnerZatvaranje,
  PartnerZatvaranjeStavka,
} = require("../models");
const { STRANE, otvoriZatvaranje } = require("../services/zatvaranjaService");
const {
  normalizeDigits,
  normalizeName,
  isNonPartnerCategory,
} = require("./partnersController");
const {
  maybeRevertInvoice,
  maybeReopenUlazniRacun,
} = require("./bankStatementsController");

const TIPOVI = ["UPLATA", "ULAZNI_RACUN", "FAKTURA", "POCETNO_STANJE"];
const toCents = (v) => Math.round(Number(v) * 100);
const jeOdobrenje = (vrsta) =>
  vrsta === "KNJIZNA_OBAVIJEST" || vrsta === "STORNO_AVANSNE";

function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

class Odbijeno extends Error {
  constructor(code, detalj) {
    super(code);
    this.code = code;
    this.detalj = detalj;
  }
}

/** Učita i provjeri jednu stavku za zatvaranje. Vraća opis sa kolonom
 *  (D/P) i iznosom sa predznakom na toj koloni, kao na kartici i PDF-u:
 *  odobrenja (knjižna obavijest, storno) su na strani dokumenta u minusu. */
async function ucitajStavku(organizationId, partner, strana, tip, id, t) {
  const dob = strana === "DOBAVLJAC";
  const lock = { transaction: t, lock: t.LOCK.UPDATE };
  if (tip === "UPLATA") {
    const tx = await BankTransaction.findOne({
      where: { id, organizationId, partnerId: partner.id },
      ...lock,
    });
    if (
      !tx ||
      tx.status !== "CONFIRMED" ||
      tx.direction !== (dob ? "OUT" : "IN") ||
      isNonPartnerCategory(tx.category)
    ) {
      throw new Odbijeno("STAVKA_NIJE_NA_KARTICI", `${tip}:${id}`);
    }
    if (tx.zatvaranjeId || (dob ? tx.ulazniRacunId : tx.invoiceId)) {
      throw new Odbijeno("STAVKA_VEC_ZATVORENA", `${tip}:${id}`);
    }
    return {
      tip,
      model: tx,
      kolona: dob ? "D" : "P",
      iznos: Number(tx.amount) || 0,
      datum: String(tx.date || "").slice(0, 10),
    };
  }
  if (tip === "ULAZNI_RACUN") {
    if (!dob) throw new Odbijeno("STAVKA_NIJE_NA_KARTICI", `${tip}:${id}`);
    const r = await UlazniRacun.findOne({
      where: { id, organizationId, partnerId: partner.id },
      ...lock,
    });
    if (!r || r.samoEvidencija) {
      throw new Odbijeno("STAVKA_NIJE_NA_KARTICI", `${tip}:${id}`);
    }
    const vezan = await BankTransaction.count({
      where: { organizationId, ulazniRacunId: r.id },
      transaction: t,
    });
    if (r.zatvaranjeId || r.status !== "OTVOREN" || vezan > 0) {
      throw new Odbijeno("STAVKA_VEC_ZATVORENA", `${tip}:${id}`);
    }
    const iznos = Number(r.iznos) || 0;
    return {
      tip,
      model: r,
      kolona: "P",
      iznos: jeOdobrenje(r.vrstaDokumenta) ? -iznos : iznos,
      datum: String(r.datumRacuna).slice(0, 10),
    };
  }
  if (tip === "FAKTURA") {
    if (dob) throw new Odbijeno("STAVKA_NIJE_NA_KARTICI", `${tip}:${id}`);
    const inv = await Invoice.findOne({
      where: { id, organizationId, type: "INVOICE" },
      ...lock,
    });
    const pJib = normalizeDigits(partner.jib);
    const pripada =
      inv &&
      ((pJib && normalizeDigits(inv.buyerIdNumber) === pJib) ||
        normalizeName(inv.buyerName) === normalizeName(partner.name));
    if (!pripada) throw new Odbijeno("STAVKA_NIJE_NA_KARTICI", `${tip}:${id}`);
    const vezana = await BankTransaction.count({
      where: { organizationId, invoiceId: inv.id },
      transaction: t,
    });
    if (inv.zatvaranjeId || inv.status !== "ISSUED" || vezana > 0) {
      throw new Odbijeno("STAVKA_VEC_ZATVORENA", `${tip}:${id}`);
    }
    const iznos = Number(inv.grossTotal) || 0;
    return {
      tip,
      model: inv,
      kolona: "D",
      iznos: jeOdobrenje(inv.docType) ? -iznos : iznos,
      datum: String(inv.issueDate).slice(0, 10),
    };
  }
  // POCETNO_STANJE: pozitivno = dug na toj strani (dokument), negativno =
  // avans (plaćanje), kao red početnog stanja na kartici
  const o = await PartnerOpeningBalance.findOne({
    where: { id, organizationId, partnerId: partner.id },
    ...lock,
  });
  const iznos = o ? Number(dob ? o.dobavljacIznos : o.kupacIznos) || 0 : 0;
  if (!o || toCents(iznos) === 0) {
    throw new Odbijeno("STAVKA_NIJE_NA_KARTICI", `${tip}:${id}`);
  }
  if (dob ? o.zatvaranjeDobId : o.zatvaranjeKupacId) {
    throw new Odbijeno("STAVKA_VEC_ZATVORENA", `${tip}:${id}`);
  }
  // dobavljač: dug (pozitivno) potražuje; kupac: dug duguje
  const dugKolona = dob ? "P" : "D";
  const avansKolona = dob ? "D" : "P";
  return {
    tip,
    model: o,
    kolona: iznos > 0 ? dugKolona : avansKolona,
    iznos: Math.abs(iznos),
    datum: String(o.datum).slice(0, 10),
  };
}

// POST /api/partners/:orgId/:partnerId/zatvaranja
// body: { strana: "DOBAVLJAC"|"KUPAC", stavke: [{ tip, id }] }
async function zatvori(req, res) {
  const organizationId = parseId(req.params.orgId);
  const partnerId = parseId(req.params.partnerId);
  const strana = String(req.body?.strana || "");
  const ulaz = Array.isArray(req.body?.stavke) ? req.body.stavke : [];
  if (!organizationId || !partnerId || !STRANE.includes(strana)) {
    return res.status(400).json({ ok: false, error: "INVALID_INPUT" });
  }
  const kljucevi = new Set();
  const stavke = [];
  for (const s of ulaz) {
    const tip = String(s?.tip || "");
    const id = parseId(s?.id);
    if (!TIPOVI.includes(tip) || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_INPUT" });
    }
    const k = `${tip}:${id}`;
    if (kljucevi.has(k)) continue;
    kljucevi.add(k);
    stavke.push({ tip, id });
  }
  if (stavke.length < 2 || stavke.length > 500) {
    return res.status(400).json({ ok: false, error: "PREMALO_STAVKI" });
  }
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
  });
  if (!partner) {
    return res.status(404).json({ ok: false, error: "PARTNER_NOT_FOUND" });
  }

  try {
    const rezultat = await sequelize.transaction(async (t) => {
      // zaključaj partnera: zatvaranja istog partnera idu jedno za drugim,
      // pa dvije istovremene veze ne dobiju isti broj (Z5 dvaput)
      await Partner.findOne({
        where: { id: partnerId, organizationId },
        attributes: ["id"],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const ucitane = [];
      for (const s of stavke) {
        ucitane.push(
          await ucitajStavku(organizationId, partner, strana, s.tip, s.id, t),
        );
      }
      const sumD = ucitane
        .filter((x) => x.kolona === "D")
        .reduce((a, x) => a + toCents(x.iznos), 0);
      const sumP = ucitane
        .filter((x) => x.kolona === "P")
        .reduce((a, x) => a + toCents(x.iznos), 0);
      if (sumD <= 0 || sumP <= 0 || sumD !== sumP) {
        throw new Odbijeno("ZBIR_NIJE_NULA", {
          duguje: sumD / 100,
          potrazuje: sumP / 100,
        });
      }
      // dan izmirenja: najkasnija uplata u vezi; bez uplate (npr. avans iz
      // početnog stanja protiv računa) najkasnija stavka veze
      const najkasniji = (list) =>
        list
          .map((x) => x.datum)
          .filter(Boolean)
          .sort()
          .pop() || null;
      const paidAt =
        najkasniji(ucitane.filter((x) => x.tip === "UPLATA")) ||
        najkasniji(ucitane) ||
        new Date().toISOString().slice(0, 10);
      const zadnji = await PartnerZatvaranje.max("broj", {
        where: { organizationId, partnerId, strana },
        transaction: t,
      });
      const z = await PartnerZatvaranje.create(
        {
          organizationId,
          partnerId,
          strana,
          broj: (Number(zadnji) || 0) + 1,
          iznos: sumD / 100,
          datum: paidAt,
          createdById: req.user?.id ?? null,
        },
        { transaction: t },
      );
      for (const x of ucitane) {
        const st = {
          zatvaranjeId: z.id,
          tip: x.tip,
          refId: x.model.id,
          iznos: x.iznos,
          kolona: x.kolona,
          prethodniStatus: null,
          prethodniPaidAt: null,
        };
        if (x.tip === "UPLATA") {
          await x.model.update({ zatvaranjeId: z.id }, { transaction: t });
        } else if (x.tip === "POCETNO_STANJE") {
          await x.model.update(
            strana === "DOBAVLJAC"
              ? { zatvaranjeDobId: z.id }
              : { zatvaranjeKupacId: z.id },
            { transaction: t },
          );
        } else {
          st.prethodniStatus = x.model.status;
          st.prethodniPaidAt = x.model.paidAt || null;
          await x.model.update(
            {
              zatvaranjeId: z.id,
              status: x.tip === "FAKTURA" ? "PAID" : "PLACEN",
              paidAt,
            },
            { transaction: t },
          );
        }
        await PartnerZatvaranjeStavka.create(st, { transaction: t });
      }
      return { id: z.id, broj: z.broj, oznaka: `Z${z.broj}`, iznos: sumD / 100 };
    });
    return res.json({ ok: true, data: rezultat });
  } catch (e) {
    if (e instanceof Odbijeno) {
      return res
        .status(409)
        .json({ ok: false, error: e.code, detalj: e.detalj ?? null });
    }
    console.error("zatvaranje stavki error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// DELETE /api/partners/:orgId/:partnerId/zatvaranja/:zatvaranjeId
async function otvori(req, res) {
  const organizationId = parseId(req.params.orgId);
  const partnerId = parseId(req.params.partnerId);
  const zatvaranjeId = parseId(req.params.zatvaranjeId);
  if (!organizationId || !partnerId || !zatvaranjeId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const z = await PartnerZatvaranje.findOne({
    where: { id: zatvaranjeId, organizationId, partnerId },
  });
  if (!z) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await otvoriZatvaranje(organizationId, z.id);
  return res.json({ ok: true, data: null });
}

// POST /api/partners/:orgId/:partnerId/zatvaranja/otvori-automatsku
// body: { tip: "ULAZNI_RACUN"|"FAKTURA", dokId } - odvezuje sve isplate
// (uplate) automatski vezane za taj dokument; dokument se vraća u otvoren
// ako ga ne drži ništa drugo. Kategorija i potvrda stavke izvoda ostaju.
async function otvoriAutomatsku(req, res) {
  const organizationId = parseId(req.params.orgId);
  const partnerId = parseId(req.params.partnerId);
  const tip = String(req.body?.tip || "");
  const dokId = parseId(req.body?.dokId);
  if (
    !organizationId ||
    !partnerId ||
    !dokId ||
    !["ULAZNI_RACUN", "FAKTURA"].includes(tip)
  ) {
    return res.status(400).json({ ok: false, error: "INVALID_INPUT" });
  }
  const kolona = tip === "ULAZNI_RACUN" ? "ulazniRacunId" : "invoiceId";
  const [n] = await BankTransaction.update(
    { [kolona]: null },
    { where: { organizationId, partnerId, [kolona]: dokId } },
  );
  if (n === 0) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  if (tip === "ULAZNI_RACUN") {
    await maybeReopenUlazniRacun(organizationId, dokId);
  } else {
    await maybeRevertInvoice(organizationId, dokId);
  }
  return res.json({ ok: true, data: { odvezano: n } });
}

module.exports = { zatvori, otvori, otvoriAutomatsku };
