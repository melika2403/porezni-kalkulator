// Lične statistike korisnika za Pregled (dashboard) — brojke koje se prikazuju
// kao KPI kartice. Sve scope-ovano na trenutnog korisnika i njegove org-e.
const { Op } = require("sequelize");
const organizationRepository = require("../repositories/organizationRepository");
const { Worker, Form, Payroll, Invoice, Client } = require("../models/index");

async function getStats(req, res) {
  try {
    const userId = req.user.id;
    const [own, clients] = await Promise.all([
      organizationRepository.getUserOrganizations(userId),
      organizationRepository.getClientOrganizations(userId),
    ]);
    const allOrgIds = [...own.map((o) => o.id), ...clients.map((o) => o.id)];

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const PAID = { [Op.in]: ["OBRACUNATO", "ISPLACENO"] };
    const orgFilter = allOrgIds.length ? { organizationId: { [Op.in]: allOrgIds } } : null;

    const [personClients, radnici, dokumenti, fakture, obracuniMjesec, obracuniPrev] =
      await Promise.all([
        Client.count({ where: { createdById: userId } }),
        orgFilter ? Worker.count({ where: orgFilter }) : 0,
        Form.count({ where: { createdById: userId } }),
        Invoice.count({ where: { userId } }),
        orgFilter
          ? Payroll.count({ where: { ...orgFilter, year: y, month: m, status: PAID } })
          : 0,
        orgFilter
          ? Payroll.count({ where: { ...orgFilter, year: prevY, month: prevM, status: PAID } })
          : 0,
      ]);

    return res.json({
      ok: true,
      data: {
        djelatnosti: own.length,
        klijenti: clients.length + personClients,
        radnici,
        dokumenti,
        fakture,
        obracuniMjesec,
        obracuniDelta: obracuniMjesec - obracuniPrev,
      },
    });
  } catch (e) {
    console.error("me stats failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

module.exports = { getStats };
