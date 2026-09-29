// Potpune kaskade brisanja za admin akcije — uklanja entitet i SVE povezane
// zapise (forme, verzije, attachmente, plate, dokumente radnika, fakture,
// brojače, članove, kartice) u jednoj transakciji.
const { Op } = require("sequelize");
const {
  sequelize,
  Organization,
  Worker,
  Client,
  Form,
  FormVersion,
  FormAttachment,
  OrganizationMember,
  Invoice,
  InvoiceItem,
  InvoiceCounter,
  ContractCounter,
  KarticaMember,
  Payroll,
  PayrollDocument,
  WorkerDocument,
  PartnerZatvaranje,
  PartnerZatvaranjeStavka,
} = require("../models/index");

async function deleteFormsByIds(formIds, t) {
  if (!formIds.length) return;
  await FormAttachment.destroy({ where: { formId: { [Op.in]: formIds } }, transaction: t });
  await FormVersion.destroy({ where: { formId: { [Op.in]: formIds } }, transaction: t });
  await Form.destroy({ where: { id: { [Op.in]: formIds } }, transaction: t });
}

async function deletePayrollsWhere(where, t) {
  const ids = (
    await Payroll.findAll({ where, attributes: ["id"], transaction: t })
  ).map((p) => p.id);
  if (!ids.length) return;
  await PayrollDocument.destroy({ where: { payrollId: { [Op.in]: ids } }, transaction: t });
  await Payroll.destroy({ where: { id: { [Op.in]: ids } }, transaction: t });
}

async function deleteInvoicesWhere(where, t) {
  const ids = (
    await Invoice.findAll({ where, attributes: ["id"], transaction: t })
  ).map((i) => i.id);
  if (!ids.length) return;
  await InvoiceItem.destroy({ where: { invoiceId: { [Op.in]: ids } }, transaction: t });
  // Razveži proforma→faktura reference koje pokazuju na obrisane.
  await Invoice.update(
    { convertedFromProformaId: null },
    { where: { convertedFromProformaId: { [Op.in]: ids } }, transaction: t },
  );
  await Invoice.destroy({ where: { id: { [Op.in]: ids } }, transaction: t });
}

async function deleteWorkersByIds(workerIds, t) {
  if (!workerIds.length) return;
  await deletePayrollsWhere({ workerId: { [Op.in]: workerIds } }, t);
  await WorkerDocument.destroy({ where: { workerId: { [Op.in]: workerIds } }, transaction: t });
  const formIds = (
    await Form.findAll({ where: { workerId: { [Op.in]: workerIds } }, attributes: ["id"], transaction: t })
  ).map((f) => f.id);
  await deleteFormsByIds(formIds, t);
  await Worker.destroy({ where: { id: { [Op.in]: workerIds } }, transaction: t });
}

async function deleteClientsByIds(clientIds, t) {
  if (!clientIds.length) return;
  const formIds = (
    await Form.findAll({ where: { clientId: { [Op.in]: clientIds } }, attributes: ["id"], transaction: t })
  ).map((f) => f.id);
  await deleteFormsByIds(formIds, t);
  // Fakture izdate ovom klijentu zadržavamo (sadrže snapshot kupca), samo
  // uklanjamo vezu na klijenta.
  await Invoice.update(
    { clientId: null },
    { where: { clientId: { [Op.in]: clientIds } }, transaction: t },
  );
  await Client.destroy({ where: { id: { [Op.in]: clientIds } }, transaction: t });
}

// Kaskada za jednu organizaciju UNUTAR postojeće transakcije (bez provjere
// postojanja). Koristi se i iz deleteUserById preko više org-a.
async function deleteOrganizationInner(orgId, t) {
  const workerIds = (
    await Worker.findAll({ where: { organizationId: orgId }, attributes: ["id"], transaction: t })
  ).map((w) => w.id);
  await deleteWorkersByIds(workerIds, t);

  // Preostale plate vezane direktno za org (defanzivno).
  await deletePayrollsWhere({ organizationId: orgId }, t);

  const clientIds = (
    await Client.findAll({ where: { organizationId: orgId }, attributes: ["id"], transaction: t })
  ).map((c) => c.id);
  await deleteClientsByIds(clientIds, t);

  const orgFormIds = (
    await Form.findAll({ where: { organizationId: orgId }, attributes: ["id"], transaction: t })
  ).map((f) => f.id);
  await deleteFormsByIds(orgFormIds, t);

  await deleteInvoicesWhere({ organizationId: orgId }, t);
  // ručne veze (Z) sa kartica partnera ove organizacije
  const vezeIds = (
    await PartnerZatvaranje.findAll({ where: { organizationId: orgId }, attributes: ["id"], transaction: t })
  ).map((z) => z.id);
  if (vezeIds.length) {
    await PartnerZatvaranjeStavka.destroy({ where: { zatvaranjeId: { [Op.in]: vezeIds } }, transaction: t });
    await PartnerZatvaranje.destroy({ where: { id: { [Op.in]: vezeIds } }, transaction: t });
  }
  await InvoiceCounter.destroy({ where: { organizationId: orgId }, transaction: t });
  await ContractCounter.destroy({ where: { organizationId: orgId }, transaction: t });
  await KarticaMember.destroy({ where: { organizationId: orgId }, transaction: t });
  await OrganizationMember.destroy({ where: { organizationId: orgId }, transaction: t });
  await Organization.destroy({ where: { id: orgId }, transaction: t });
}

// ── Javne kaskade ───────────────────────────────────────────────────────────
async function deleteOrganizationCascade(orgId) {
  return sequelize.transaction(async (t) => {
    const exists = await Organization.findOne({ where: { id: orgId }, attributes: ["id"], transaction: t });
    if (!exists) return false;
    await deleteOrganizationInner(orgId, t);
    return true;
  });
}

async function deleteFormCascade(formId) {
  return sequelize.transaction(async (t) => {
    const exists = await Form.findOne({ where: { id: formId }, attributes: ["id"], transaction: t });
    if (!exists) return false;
    await deleteFormsByIds([formId], t);
    return true;
  });
}

async function deleteWorkerCascade(workerId) {
  return sequelize.transaction(async (t) => {
    const exists = await Worker.findOne({ where: { id: workerId }, attributes: ["id"], transaction: t });
    if (!exists) return false;
    await deleteWorkersByIds([workerId], t);
    return true;
  });
}

async function deletePersonClientCascade(clientId) {
  return sequelize.transaction(async (t) => {
    const exists = await Client.findOne({ where: { id: clientId }, attributes: ["id"], transaction: t });
    if (!exists) return false;
    await deleteClientsByIds([clientId], t);
    return true;
  });
}

module.exports = {
  deleteOrganizationCascade,
  deleteWorkerCascade,
  deletePersonClientCascade,
  deleteFormCascade,
  // Helperi za upotrebu unutar druge transakcije (npr. deleteUserById):
  deleteOrganizationInner,
  deleteWorkersByIds,
  deleteClientsByIds,
  deleteFormsByIds,
  deleteInvoicesWhere,
};
