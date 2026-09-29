// Prebijanja (kompenzacije i cesije): zatvaranje kupaca i dobavljača bez
// novca. Knjiženje kreira poseban "izvod" (bankId kompenzacija/cesija) sa
// odmah potvrđenim stavkama: priliv po fakturi (kategorija PRIHOD_RACUN,
// KPR kolona 12, odluka vlasnika) i odliv po ulaznom računu (ROBA_MATERIJAL
// k16 ili OSTALI_RASHODI k19). PDV split za obveznike radi automatski kroz
// KPR servis. Kompenzuje se manji zbir; stavka na strani viška ostaje
// djelimično otvorena (fakture nemaju parcijalno plaćanje).

const { Op } = require("sequelize");
const {
  sequelize,
  BankStatement,
  BankTransaction,
  Invoice,
  UlazniRacun,
  Partner,
  Prebijanje,
} = require("../models/index");
const { logEvent } = require("./activityController");
const { raspustiZaStavke } = require("../services/zatvaranjaService");
const {
  maybeRevertInvoice,
  maybeReopenUlazniRacun,
} = require("./bankStatementsController");

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const toC = (v) => Math.round(Number(v) * 100);
const RASHOD_KATEGORIJE = new Set(["ROBA_MATERIJAL", "OSTALI_RASHODI"]);

// Prekid transakcije sa kontrolisanim HTTP kodom (npr. stavka više nije
// otvorena kad je zaključamo unutar transakcije).
class AbortError extends Error {
  constructor(code) {
    super(code);
    this.abortCode = code;
  }
}

// Kategorija prihoda: faktura na koju NIJE obračunat PDV (izvoz/oslobođena
// isporuka ili applyVat=false) ide u kolonu 12 bez izbijanja PDV-a, da KPR
// PDV obveznika ne fabrikuje nepostojeći izlazni PDV.
function incomeCategoryFor(inv) {
  const bezPdv =
    inv.applyVat === false ||
    inv.vrstaIsporuke === "IZVOZ" ||
    inv.vrstaIsporuke === "OSLOBODJENA";
  return bezPdv ? "PRIHOD_RACUN_BEZ_PDV" : "PRIHOD_RACUN";
}

// Kategorija rashoda: račun bez ulaznog PDV-a (uvoz, od neobveznika ili
// pdvIznos prazan) ide u istu kolonu (16/19) ali bez izbijanja PDV-a.
function expenseCategoryFor(racun, base) {
  const bezPdv =
    racun.pdvIznos == null ||
    Number(racun.pdvIznos) === 0 ||
    racun.vrstaNabavke === "OD_NEOBVEZNIKA" ||
    racun.vrstaNabavke === "UVOZ";
  if (!bezPdv) return base;
  return base === "ROBA_MATERIJAL"
    ? "ROBA_MATERIJAL_BEZ_PDV"
    : "OSTALI_RASHODI_BEZ_PDV";
}

// Monotoni broj po tipu i godini (K-N/god, C-N/god): uzima MAKSIMALNI viđeni
// broj, ne count(), pa se nakon brisanja srednjeg prebijanja ne recikliraju
// brojevi. Unique index + retry hvataju istovremene zahtjeve.
async function nextBroj(organizationId, type, year, prefix, t) {
  const rows = await Prebijanje.findAll({
    where: {
      organizationId,
      type,
      datum: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] },
    },
    attributes: ["broj"],
    raw: true,
    transaction: t,
  });
  let max = 0;
  for (const r of rows) {
    const m = /^[A-Z]+-(\d+)\//.exec(r.broj || "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${max + 1}/${year}`;
}

// Alokacija iznosa redom po stavkama: zadnja može biti djelimična (ta stavka
// ostaje otvorena, u KPR ulazi samo alocirani dio).
function allocate(items, getAmount, totalC) {
  let remaining = totalC;
  const out = [];
  for (const item of items) {
    if (remaining <= 0) break;
    const itemC = toC(getAmount(item));
    const amountC = Math.min(itemC, remaining);
    out.push({ item, amountC, full: amountC === itemC });
    remaining -= amountC;
  }
  return out;
}

// POST /api/prebijanja/:orgId
async function create(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const body = req.body || {};
    const type =
      body.type === "CESIJA"
        ? "CESIJA"
        : body.type === "KOMPENZACIJA"
          ? "KOMPENZACIJA"
          : null;
    if (!type) return res.status(400).json({ ok: false, error: "INVALID_TYPE" });

    const datum = /^\d{4}-\d{2}-\d{2}$/.test(String(body.datum || ""))
      ? String(body.datum)
      : null;
    if (!datum) return res.status(400).json({ ok: false, error: "INVALID_DATE" });

    const rashodKategorija = RASHOD_KATEGORIJE.has(body.rashodKategorija)
      ? body.rashodKategorija
      : "OSTALI_RASHODI";

    const invoiceIds = Array.isArray(body.invoiceIds)
      ? [...new Set(body.invoiceIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
      : [];
    const racunIds = Array.isArray(body.racunIds)
      ? [...new Set(body.racunIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
      : [];
    if (invoiceIds.length === 0 || racunIds.length === 0) {
      return res.status(400).json({ ok: false, error: "NO_ITEMS" });
    }

    // strane: kompenzacija = isti partner na obje; cesija = cesus (kupac) +
    // cesionar (dobavljač)
    const prihodPartnerId = parseId(
      type === "CESIJA" ? body.cesusPartnerId : body.partnerId,
    );
    const rashodPartnerId = parseId(
      type === "CESIJA" ? body.cesionarPartnerId : body.partnerId,
    );
    if (!prihodPartnerId || !rashodPartnerId) {
      return res.status(400).json({ ok: false, error: "INVALID_PARTNER" });
    }
    const partneri = await Partner.findAll({
      where: {
        id: { [Op.in]: [prihodPartnerId, rashodPartnerId] },
        organizationId,
      },
    });
    const partnerById = new Map(partneri.map((p) => [p.id, p]));
    if (!partnerById.has(prihodPartnerId) || !partnerById.has(rashodPartnerId)) {
      return res.status(400).json({ ok: false, error: "INVALID_PARTNER" });
    }

    // stavke moraju biti otvorene i pripadati organizaciji; samo obične
    // fakture (STANDARD) su potraživanje, knjižne obavijesti i storna
    // (pozitivan iznos, negativan predznak) se NE smiju knjižiti kao prihod
    const invoices = await Invoice.findAll({
      where: {
        id: { [Op.in]: invoiceIds },
        organizationId,
        type: "INVOICE",
        docType: "STANDARD",
        status: "ISSUED",
      },
      order: [["issueDate", "ASC"], ["id", "ASC"]],
    });
    if (invoices.length !== invoiceIds.length) {
      return res.status(400).json({ ok: false, error: "INVOICE_NOT_OPEN" });
    }
    const racuni = await UlazniRacun.findAll({
      where: { id: { [Op.in]: racunIds }, organizationId, status: "OTVOREN" },
      order: [["datumRacuna", "ASC"], ["id", "ASC"]],
    });
    if (racuni.length !== racunIds.length) {
      return res.status(400).json({ ok: false, error: "RACUN_NOT_OPEN" });
    }
    if (racuni.some((r) => r.samoEvidencija)) {
      // samo-evidencijski račun (npr. uvoz) ne stvara obavezu prema dobavljaču
      return res.status(400).json({ ok: false, error: "RACUN_SAMO_EVIDENCIJA" });
    }

    const sumInC = invoices.reduce((a, i) => a + toC(i.grossTotal), 0);
    const sumOutC = racuni.reduce((a, r) => a + toC(r.iznos), 0);
    const iznosC = Math.min(sumInC, sumOutC);
    if (iznosC <= 0) {
      return res.status(400).json({ ok: false, error: "EMPTY_AMOUNT" });
    }

    const year = Number(datum.slice(0, 4));
    const prefix = type === "CESIJA" ? "C" : "K";
    const naziv = type === "CESIJA" ? "Cesija" : "Kompenzacija";

    const invAlloc = allocate(invoices, (i) => i.grossTotal, iznosC);
    const racAlloc = allocate(racuni, (r) => r.iznos, iznosC);
    const prihodPartner = partnerById.get(prihodPartnerId);
    const rashodPartner = partnerById.get(rashodPartnerId);

    // Cijelo knjiženje je atomično: izvod + KPR stavke + zatvaranje faktura i
    // računa u JEDNOJ transakciji. Stavke se ponovo zaključaju i provjere
    // unutar transakcije (spriječi da dva istovremena prebijanja potroše istu
    // fakturu). Broj se generiše u transakciji; unique index + retry rješavaju
    // istovremene brojeve.
    let broj = null;
    let created = null;
    for (let attempt = 0; ; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        created = await sequelize.transaction(async (t) => {
          const lockedInv = await Invoice.findAll({
            where: { id: { [Op.in]: invoiceIds }, organizationId },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });
          if (
            lockedInv.length !== invoiceIds.length ||
            lockedInv.some(
              (i) => i.status !== "ISSUED" || i.docType !== "STANDARD",
            )
          ) {
            throw new AbortError("INVOICE_NOT_OPEN");
          }
          const lockedRac = await UlazniRacun.findAll({
            where: { id: { [Op.in]: racunIds }, organizationId },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });
          if (
            lockedRac.length !== racunIds.length ||
            lockedRac.some((r) => r.status !== "OTVOREN")
          ) {
            throw new AbortError("RACUN_NOT_OPEN");
          }
          const invById = new Map(lockedInv.map((i) => [i.id, i]));
          const racById = new Map(lockedRac.map((r) => [r.id, r]));

          broj = await nextBroj(organizationId, type, year, prefix, t);

          const statement = await BankStatement.create(
            {
              organizationId,
              uploadedById: req.user.id,
              bankId: type.toLowerCase(),
              bankName: naziv,
              account: null,
              statementNumber: broj,
              statementDate: datum,
              currency: "BAM",
              openingBalance: null,
              closingBalance: null,
              fileName: null,
              warnings: null,
            },
            { transaction: t },
          );

          const txRows = [
            ...invAlloc.map((a) => ({
              organizationId,
              statementId: statement.id,
              date: datum,
              description: `${naziv} ${broj}: naplata fakture ${a.item.fullNumber || a.item.id}${a.full ? "" : " (djelimično)"}`,
              reference: null,
              counterpartyName: prihodPartner.name,
              counterpartyAccount: null,
              amount: a.amountC / 100,
              direction: "IN",
              balanceAfter: null,
              status: "CONFIRMED",
              category: incomeCategoryFor(a.item),
              invoiceId: a.item.id,
              partnerId: prihodPartnerId,
            })),
            ...racAlloc.map((a) => ({
              organizationId,
              statementId: statement.id,
              date: datum,
              description: `${naziv} ${broj}: plaćanje računa ${a.item.brojRacuna || a.item.id}${a.full ? "" : " (djelimično)"}`,
              reference: null,
              counterpartyName: rashodPartner.name,
              counterpartyAccount: null,
              amount: a.amountC / 100,
              direction: "OUT",
              balanceAfter: null,
              status: "CONFIRMED",
              category: expenseCategoryFor(a.item, rashodKategorija),
              ulazniRacunId: a.item.id,
              partnerId: rashodPartnerId,
            })),
          ];
          await BankTransaction.bulkCreate(txRows, { transaction: t });

          // statusi dokumenata unutar iste transakcije: samo PUNE alokacije
          // zatvaraju dokument, djelimična stavka ostaje otvorena za ostatak
          for (const a of invAlloc) {
            if (!a.full) continue;
            const inv = invById.get(a.item.id);
            if (inv && inv.status === "ISSUED") {
              inv.status = "PAID";
              inv.paidAt = datum;
              // eslint-disable-next-line no-await-in-loop
              await inv.save({ transaction: t });
            }
          }
          for (const a of racAlloc) {
            if (!a.full) continue;
            const r = racById.get(a.item.id);
            if (r && r.status === "OTVOREN") {
              r.status = "PLACEN";
              r.paidAt = datum;
              // eslint-disable-next-line no-await-in-loop
              await r.save({ transaction: t });
            }
          }

          return Prebijanje.create(
            {
              organizationId,
              type,
              broj,
              datum,
              iznos: iznosC / 100,
              partnerId: type === "KOMPENZACIJA" ? prihodPartnerId : null,
              cesusPartnerId: type === "CESIJA" ? prihodPartnerId : null,
              cesionarPartnerId: type === "CESIJA" ? rashodPartnerId : null,
              statementId: statement.id,
              napomena: String(body.napomena || "").trim() || null,
            },
            { transaction: t },
          );
        });
        break;
      } catch (e) {
        if (e instanceof AbortError) {
          return res.status(409).json({ ok: false, error: e.abortCode });
        }
        // istovremeni zahtjev je zauzeo isti broj: probaj ponovo (max 4)
        if (e.name === "SequelizeUniqueConstraintError" && attempt < 3) {
          continue;
        }
        throw e;
      }
    }
    const prebijanje = created;

    const partial = [
      ...invAlloc
        .filter((a) => !a.full)
        .map((a) => ({
          vrsta: "FAKTURA",
          oznaka: a.item.fullNumber || String(a.item.id),
          ostatak: (toC(a.item.grossTotal) - a.amountC) / 100,
        })),
      ...racAlloc
        .filter((a) => !a.full)
        .map((a) => ({
          vrsta: "ULAZNI_RACUN",
          oznaka: a.item.brojRacuna || String(a.item.id),
          ostatak: (toC(a.item.iznos) - a.amountC) / 100,
        })),
    ];

    // statistika PK Office korištenja (admin Aktivnost)
    void logEvent({
      userId: req.user?.id ?? null,
      action: "OFFICE_PREBIJANJE",
      label: `${type === "CESIJA" ? "Cesija" : "Kompenzacija"} ${broj}`,
      organizationId,
    });

    return res.status(201).json({
      ok: true,
      data: {
        id: prebijanje.id,
        broj,
        datum,
        iznos: iznosC / 100,
        partial,
      },
    });
  } catch (err) {
    console.error("prebijanja create error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// GET /api/prebijanja/:orgId
async function list(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const rows = await Prebijanje.findAll({
    where: { organizationId },
    include: [
      { model: Partner, as: "partner", attributes: ["id", "name"] },
      { model: Partner, as: "cesus", attributes: ["id", "name"] },
      { model: Partner, as: "cesionar", attributes: ["id", "name"] },
    ],
    order: [["datum", "DESC"], ["id", "DESC"]],
  });

  // stavke (opisi + iznosi) za prikaz u listi
  const statementIds = rows.map((r) => r.statementId).filter(Boolean);
  const txs = statementIds.length
    ? await BankTransaction.findAll({
        where: { statementId: { [Op.in]: statementIds }, organizationId },
        attributes: [
          "statementId",
          "description",
          "amount",
          "direction",
          "invoiceId",
          "ulazniRacunId",
        ],
        raw: true,
      })
    : [];
  const byStatement = new Map();
  for (const tx of txs) {
    const arr = byStatement.get(tx.statementId) || [];
    arr.push(tx);
    byStatement.set(tx.statementId, arr);
  }

  // Puni iznosi i oznake izvornih dokumenata: tx.amount je ALOCIRANI
  // (djelimični) iznos za KPR, ali PDF prijedloga kompenzacije prikazuje
  // CIJELE dokumente (nikad dio računa), razlika ide u "nekompenzirani
  // ostatak uplatiti na žiro račun". Zato uz stavku vraćamo i pun iznos.
  const invIds = [...new Set(txs.map((t) => t.invoiceId).filter(Boolean))];
  const racIds = [...new Set(txs.map((t) => t.ulazniRacunId).filter(Boolean))];
  const invMap = new Map(
    invIds.length
      ? (
          await Invoice.findAll({
            where: { id: { [Op.in]: invIds }, organizationId },
            attributes: ["id", "fullNumber", "grossTotal"],
            raw: true,
          })
        ).map((i) => [i.id, i])
      : [],
  );
  const racMap = new Map(
    racIds.length
      ? (
          await UlazniRacun.findAll({
            where: { id: { [Op.in]: racIds }, organizationId },
            attributes: ["id", "brojRacuna", "iznos"],
            raw: true,
          })
        ).map((r) => [r.id, r])
      : [],
  );

  return res.json({
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      type: r.type,
      broj: r.broj,
      datum: r.datum,
      iznos: r.iznos,
      napomena: r.napomena,
      partner: r.partner ? { id: r.partner.id, name: r.partner.name } : null,
      cesus: r.cesus ? { id: r.cesus.id, name: r.cesus.name } : null,
      cesionar: r.cesionar
        ? { id: r.cesionar.id, name: r.cesionar.name }
        : null,
      stavke: (byStatement.get(r.statementId) || []).map((tx) => {
        const inv = tx.invoiceId ? invMap.get(tx.invoiceId) : null;
        const rac = tx.ulazniRacunId ? racMap.get(tx.ulazniRacunId) : null;
        return {
          description: tx.description,
          amount: tx.amount,
          direction: tx.direction,
          // za PDF: oznaka i PUN iznos dokumenta (dokument može biti obrisan
          // naknadno, tada null pa front pada nazad na alocirani iznos)
          oznaka: inv
            ? `Faktura ${inv.fullNumber || inv.id}`
            : rac
              ? `Račun ${rac.brojRacuna || rac.id}`
              : null,
          punIznos: inv ? inv.grossTotal : rac ? rac.iznos : null,
        };
      }),
    })),
  });
}

// DELETE /api/prebijanja/:orgId/:id — briše prebijanje sa izvodom i vraća
// fakture/račune u otvoreno (revert helperi provjere druge uplate).
async function remove(req, res) {
  const organizationId = parseId(req.params.orgId);
  const id = parseId(req.params.id);
  if (!organizationId || !id) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const prebijanje = await Prebijanje.findOne({
    where: { id, organizationId },
  });
  if (!prebijanje) {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }

  const linked = await BankTransaction.findAll({
    where: { statementId: prebijanje.statementId, organizationId },
    attributes: ["invoiceId", "ulazniRacunId"],
    raw: true,
  });
  const invoiceIds = [
    ...new Set(linked.map((x) => x.invoiceId).filter(Boolean)),
  ];
  const racunIds = [
    ...new Set(linked.map((x) => x.ulazniRacunId).filter(Boolean)),
  ];

  // ručne veze (Z) sa stavkama ovog prebijanja se otvaraju prije brisanja
  const uVezama = await BankTransaction.findAll({
    where: {
      statementId: prebijanje.statementId,
      organizationId,
      zatvaranjeId: { [Op.ne]: null },
    },
    attributes: ["id"],
    raw: true,
  });
  if (uVezama.length) {
    await raspustiZaStavke(organizationId, {
      txIds: uVezama.map((x) => x.id),
    });
  }

  await sequelize.transaction(async (t) => {
    await BankTransaction.destroy({
      where: { statementId: prebijanje.statementId, organizationId },
      transaction: t,
    });
    await BankStatement.destroy({
      where: { id: prebijanje.statementId, organizationId },
      transaction: t,
    });
    await prebijanje.destroy({ transaction: t });
  });

  for (const invoiceId of invoiceIds) {
    await maybeRevertInvoice(organizationId, invoiceId);
  }
  for (const racunId of racunIds) {
    await maybeReopenUlazniRacun(organizationId, racunId);
  }
  return res.json({ ok: true });
}

module.exports = { create, list, remove };
