// Admin "360" detalj: pun pregled jedne organizacije (podaci, radnici,
// obračuni plata sa punim iznosima, dokumenti) i jednog korisnika. Sve rute
// su zaštićene requireRole("ADMIN"), pa ovdje ne provjeravamo članstvo, admin
// vidi sve. Dokumenti se preuzimaju kroz posebne admin download rute.
const fs = require("fs");
const path = require("path");
const { Op, fn, col } = require("sequelize");
const {
  Organization,
  Worker,
  Payroll,
  PayrollDocument,
  WorkerDocument,
  Form,
  FormVersion,
  Invoice,
  User,
  Subscription,
  OrganizationMember,
} = require("../models/index");
const { UPLOADS_ROOT } = require("../utils/uploads");
const { decryptJmbg } = require("../utils/encryptJmbg");

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function num(v) {
  return v == null ? 0 : Number(v);
}

function safeJmbg(enc) {
  if (!enc) return null;
  try {
    return decryptJmbg(enc);
  } catch {
    return null;
  }
}

// GET /api/admin/organizations/:id , pun detalj organizacije + brojači.
async function organizationDetail(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "INVALID_ID" });

  const org = await Organization.findByPk(id);
  if (!org) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const creator = org.createdById
    ? await User.findByPk(org.createdById, {
        attributes: ["id", "firstName", "lastName", "email", "role"],
      })
    : null;

  const ownerWorker = await Worker.findOne({
    where: { organizationId: id, role: "VLASNIK" },
    attributes: ["id", "firstName", "lastName", "jmbg"],
  });

  // Broj radnika: RADNIK uvijek; d.o.o. (COMPANY) k tome i prijavljeni
  // vlasnik-direktor (opcija 1) jer je on zaposlenik. Obrt (BUSINESS) vlasnik se
  // NE broji, on je vlasnik/obrtnik, ne radnik. "Prijavljen" se derivira iz
  // datuma (prijavaDate postavljen, nije odjavljen) , datumi su master, NE
  // stored employmentStatus (vidi ownerFromWorker/toPublicWorker).
  const isCompany = org.type === "COMPANY";
  const [radnikCount, directorCount, payrollCount, formCount, invoiceCount] =
    await Promise.all([
      Worker.count({ where: { organizationId: id, role: "RADNIK" } }),
      isCompany
        ? Worker.count({
            where: {
              organizationId: id,
              role: "VLASNIK",
              prijavaDate: { [Op.ne]: null },
              odjavaDate: null,
            },
          })
        : Promise.resolve(0),
      Payroll.count({ where: { organizationId: id } }),
      Form.count({ where: { organizationId: id } }),
      Invoice.count({ where: { organizationId: id } }),
    ]);
  const workerCount = radnikCount + directorCount;

  return res.json({
    ok: true,
    data: {
      id: org.id,
      name: org.name,
      type: org.type,
      isClientOrg: org.isClientOrg,
      taxNumber: org.taxNumber,
      pdvNumber: org.pdvNumber,
      activityCode: org.activityCode,
      activityName: org.activityName,
      email: org.email,
      phone: org.phone,
      address: org.address,
      city: org.city,
      bankAccount: org.bankAccount,
      taxRegime: org.taxRegime,
      taxCategory: org.taxCategory,
      defaultSalaryType: org.defaultSalaryType,
      mealAllowancePerDay:
        org.mealAllowancePerDay != null ? Number(org.mealAllowancePerDay) : null,
      createdAt: org.createdAt,
      createdBy: creator
        ? {
            id: creator.id,
            firstName: creator.firstName,
            lastName: creator.lastName,
            email: creator.email,
            role: creator.role,
          }
        : null,
      owner: ownerWorker
        ? {
            id: ownerWorker.id,
            firstName: ownerWorker.firstName,
            lastName: ownerWorker.lastName,
            jmbg: safeJmbg(ownerWorker.jmbg),
          }
        : null,
      counts: {
        workers: workerCount,
        payrolls: payrollCount,
        forms: formCount,
        invoices: invoiceCount,
      },
    },
  });
}

// GET /api/admin/organizations/:id/workers-full , radnici sa platnim poljima.
async function organizationWorkers(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "INVALID_ID" });
  const workers = await Worker.findAll({
    where: { organizationId: id },
    order: [["role", "ASC"], ["lastName", "ASC"]],
  });
  const items = workers.map((w) => ({
    id: w.id,
    firstName: w.firstName,
    lastName: w.lastName,
    role: w.role,
    position: w.position,
    employmentStatus: w.employmentStatus,
    salaryType: w.salaryType,
    salaryBruto: w.salaryBruto != null ? Number(w.salaryBruto) : null,
    salaryNeto: w.salaryNeto != null ? Number(w.salaryNeto) : null,
    startDate: w.startDate,
    endDate: w.endDate,
  }));
  return res.json({ ok: true, data: { items } });
}

// GET /api/admin/organizations/:id/payrolls?year=&month=
// Bez month-a: po-mjesečni brojači za godinu. Sa month-om: pune stavke +
// sažetak. Iznosi su PUNI (admin pregled za podršku).
async function organizationPayrolls(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "INVALID_ID" });
  const year = parseId(req.query.year) || new Date().getFullYear();
  const month = parseId(req.query.month);

  // godišnji pregled: koliko obračuna po mjesecu + ukupan trošak
  const monthly = await Payroll.findAll({
    where: { organizationId: id, year },
    attributes: [
      "month",
      [fn("COUNT", col("id")), "count"],
      [fn("SUM", col("net")), "netSum"],
      [fn("SUM", col("totalCost")), "costSum"],
    ],
    group: ["month"],
    raw: true,
  });
  const byMonth = monthly.map((m) => ({
    month: Number(m.month),
    count: Number(m.count),
    netSum: num(m.netSum),
    costSum: num(m.costSum),
  }));

  let items = [];
  let summary = null;
  if (month) {
    const workers = await Worker.findAll({
      where: { organizationId: id },
      attributes: ["id", "firstName", "lastName", "role"],
      raw: true,
    });
    const nameById = new Map(
      workers.map((w) => [w.id, `${w.firstName} ${w.lastName}`.trim()]),
    );
    const rows = await Payroll.findAll({
      where: { organizationId: id, year, month },
      order: [["workerId", "ASC"]],
    });
    items = rows.map((p) => ({
      id: p.id,
      workerId: p.workerId,
      workerName: nameById.get(p.workerId) || `#${p.workerId}`,
      status: p.status,
      paymentDate: p.paymentDate ? String(p.paymentDate).slice(0, 10) : null,
      gross: num(p.gross),
      net: num(p.net),
      empTotal: num(p.empTotal),
      incomeTax: num(p.incomeTax),
      erpTotal: num(p.erpTotal),
      mealAllowance: num(p.mealAllowance),
      vacationBonus: num(p.vacationBonus),
      travelExpense: num(p.travelExpense),
      totalCost: num(p.totalCost),
    }));
    summary = items.reduce(
      (acc, it) => {
        acc.gross += it.gross;
        acc.net += it.net;
        acc.empTotal += it.empTotal;
        acc.incomeTax += it.incomeTax;
        acc.erpTotal += it.erpTotal;
        acc.totalCost += it.totalCost;
        return acc;
      },
      { gross: 0, net: 0, empTotal: 0, incomeTax: 0, erpTotal: 0, totalCost: 0 },
    );
  }

  return res.json({
    ok: true,
    data: { year, month: month || null, byMonth, items, summary },
  });
}

// GET /api/admin/organizations/:id/documents , svi dokumenti firme.
async function organizationDocuments(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "INVALID_ID" });

  // obrasci (Form) sa zadnjom verzijom (pdfUrl)
  const forms = await Form.findAll({
    where: { organizationId: id },
    include: [
      {
        model: FormVersion,
        as: "versions",
        attributes: ["id", "pdfUrl", "createdAt"],
        separate: true,
        order: [["createdAt", "DESC"]],
        limit: 1,
      },
    ],
    order: [["updatedAt", "DESC"]],
    limit: 200,
  });

  // platne liste i uplatnice (PayrollDocument) za sve payrolle firme
  const payrolls = await Payroll.findAll({
    where: { organizationId: id },
    attributes: ["id", "year", "month"],
    raw: true,
  });
  const payrollById = new Map(payrolls.map((p) => [p.id, p]));
  const payrollDocs = payrolls.length
    ? await PayrollDocument.findAll({
        where: { payrollId: { [Op.in]: payrolls.map((p) => p.id) } },
        order: [["id", "DESC"]],
        limit: 300,
      })
    : [];

  // ugovori/otkazi/JS3100 (WorkerDocument)
  const workerDocs = await WorkerDocument.findAll({
    where: { organizationId: id },
    order: [["id", "DESC"]],
    limit: 300,
  });

  const data = {
    forms: forms.map((f) => ({
      id: f.id,
      type: f.type,
      title: f.title,
      status: f.status,
      year: f.year,
      month: f.month,
      pdfUrl: f.versions && f.versions[0] ? f.versions[0].pdfUrl : null,
      updatedAt: f.updatedAt,
    })),
    payrollDocuments: payrollDocs.map((d) => {
      const p = payrollById.get(d.payrollId);
      return {
        id: d.id,
        type: d.type,
        originalName: d.originalName,
        period: p ? `${String(p.month).padStart(2, "0")}/${p.year}` : null,
        downloadUrl: `/api/admin/payroll-documents/${d.id}/download`,
      };
    }),
    workerDocuments: workerDocs.map((d) => ({
      id: d.id,
      type: d.type,
      format: d.format,
      number: d.number,
      originalName: d.originalName,
      downloadUrl: `/api/admin/worker-documents/${d.id}/download`,
    })),
  };
  return res.json({ ok: true, data });
}

// GET /api/admin/users/:id , detalj korisnika + pretplata + organizacije.
async function userDetail(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "INVALID_ID" });

  const user = await User.findByPk(id, {
    attributes: [
      "id", "firstName", "lastName", "email", "phone", "address", "city",
      "role", "isEmailVerified", "trialUsedAt", "utmSource", "utmCampaign",
      "createdAt",
    ],
  });
  if (!user) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const sub = await Subscription.findOne({ where: { userId: id } });

  // organizacije: kreirane + članstva
  const created = await Organization.findAll({
    where: { createdById: id },
    attributes: ["id", "name", "type", "isClientOrg"],
    raw: true,
  });
  const memberships = await OrganizationMember.findAll({
    where: { userId: id },
    include: [
      {
        model: Organization,
        as: "organization",
        attributes: ["id", "name", "type", "isClientOrg"],
      },
    ],
  });
  const orgMap = new Map();
  for (const o of created) {
    orgMap.set(o.id, { ...o, role: "OWNER" });
  }
  for (const m of memberships) {
    const o = m.organization;
    if (o && !orgMap.has(o.id)) {
      orgMap.set(o.id, {
        id: o.id,
        name: o.name,
        type: o.type,
        isClientOrg: o.isClientOrg,
        role: m.role,
      });
    }
  }

  const [formCount, invoiceCount] = await Promise.all([
    Form.count({ where: { createdById: id } }),
    Invoice.count({ where: { userId: id } }),
  ]);

  return res.json({
    ok: true,
    data: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      city: user.city,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      trialUsedAt: user.trialUsedAt,
      utmSource: user.utmSource,
      utmCampaign: user.utmCampaign,
      createdAt: user.createdAt,
      subscription: sub
        ? {
            plan: sub.plan,
            billingCycle: sub.billingCycle,
            startDate: sub.startDate,
            endDate: sub.endDate,
            isActive: sub.isActive,
            isTrial: sub.isTrial,
          }
        : null,
      organizations: [...orgMap.values()],
      counts: { forms: formCount, invoices: invoiceCount },
    },
  });
}

// ── Admin download (bypass članstva, requireRole ADMIN na ruti) ──────────────
async function downloadPayrollDocument(req, res) {
  const docId = parseId(req.params.docId);
  if (!docId) return res.status(400).json({ ok: false, error: "INVALID_ID" });
  const doc = await PayrollDocument.findByPk(docId);
  if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const fullPath = path.join(UPLOADS_ROOT, "payroll-documents", doc.filename);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ ok: false, error: "FILE_MISSING" });
  }
  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
  );
  fs.createReadStream(fullPath).pipe(res);
}

async function downloadWorkerDocument(req, res) {
  const docId = parseId(req.params.docId);
  if (!docId) return res.status(400).json({ ok: false, error: "INVALID_ID" });
  const doc = await WorkerDocument.findByPk(docId);
  if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const fullPath = path.join(UPLOADS_ROOT, "worker-documents", doc.filename);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ ok: false, error: "FILE_MISSING" });
  }
  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
  );
  fs.createReadStream(fullPath).pipe(res);
}

module.exports = {
  organizationDetail,
  organizationWorkers,
  organizationPayrolls,
  organizationDocuments,
  userDetail,
  downloadPayrollDocument,
  downloadWorkerDocument,
};
