// Predstojeće poreske obaveze tekućeg mjeseca za organizaciju, sa "done"
// statusom izvedenim iz potvrđenih uplata na izvodu (uplata te kategorije u
// tekućem mjesecu = obaveza izmirena). Jedinstveni izvor istine: koristi ga
// REST endpoint (dashboard/obaveze) i dnevne email notifikacije (rokovi).
const { Op } = require("sequelize");
const { Organization, BankTransaction } = require("../models/index");

const MJESECI = [
  "januar", "februar", "mart", "april", "maj", "juni",
  "juli", "august", "septembar", "oktobar", "novembar", "decembar",
];

// Vraća { items } ili null kad organizacija ne postoji. Svaka stavka:
// { id: "doprinosi"|"porez"|"pdv", title, due (ISO), done, overdue }.
async function computeObligations(organizationId, now = new Date()) {
  const org = await Organization.findByPk(organizationId, {
    attributes: ["id", "isPdvObveznik"],
  });
  if (!org) return null;

  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const monthStart = `${year}-${mm}-01`;
  const monthEnd = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const prevName = MJESECI[(month + 10) % 12];

  // potvrđene uplate po kategoriji u tekućem mjesecu
  const paidRows = await BankTransaction.findAll({
    where: {
      organizationId,
      status: "CONFIRMED",
      direction: "OUT",
      category: {
        [Op.in]: ["DOPRINOSI_PODUZETNIKA", "POREZ_DOHODAK_VLASNIKA", "PDV_UIO"],
      },
      date: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
    },
    attributes: ["category"],
    group: ["category"],
    raw: true,
  });
  const paid = new Set(paidRows.map((r) => r.category));

  // rokovi za prethodni mjesec: doprinosi/porez/PDV do 10. u tekućem
  const due10 = `${year}-${mm}-10`;
  const items = [
    {
      id: "doprinosi",
      title: `Akontacija doprinosa za ${prevName}`,
      due: due10,
      done: paid.has("DOPRINOSI_PODUZETNIKA"),
    },
    {
      id: "porez",
      title: `Akontacija poreza na dohodak za ${prevName}`,
      due: due10,
      done: paid.has("POREZ_DOHODAK_VLASNIKA"),
    },
  ];
  if (org.isPdvObveznik) {
    items.push({
      id: "pdv",
      title: `PDV prijava i uplata za ${prevName}`,
      due: due10,
      done: paid.has("PDV_UIO"),
    });
  }

  const today = `${year}-${mm}-${String(now.getDate()).padStart(2, "0")}`;
  for (const item of items) {
    item.overdue = !item.done && item.due < today;
  }
  items.sort(
    (a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due),
  );

  return { items };
}

module.exports = { computeObligations, MJESECI };
