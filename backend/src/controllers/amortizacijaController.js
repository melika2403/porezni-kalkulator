const { Op } = require("sequelize");
const {
  Form,
  FormVersion,
  Organization,
  OrganizationMember,
  BankStatement,
  BankTransaction,
  sequelize,
} = require("../models/index");

// Helper: prihvata ID-parametar iz query/body i vraća pozitivan integer ili null.
function parseIntId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

// Helper: da li je string ispravan kalendarski datum "YYYY-MM-DD" u datoj godini.
// Regex sam ne hvata 2026-02-30 / 2026-13-31 / 2026-00-00 (dobar oblik, nevalidan
// kalendar), pa gradimo Date i provjeravamo round-trip da ne prođe pokvaren datum.
function isValidYmd(s, year) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y !== year) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

// Pristupna kontrola: korisnik može pristupiti PLDI-ju samo za org-u kojoj je
// član (OWNER/ADMIN/MEMBER). Vraća { ok, org } ili { ok: false, reason }.
async function ensureOrgAccess(organizationId, userId) {
  if (organizationId === null) {
    // Lične PLDI forme (bez organizacije) — samo za vlastitog korisnika.
    return { ok: true, type: "personal" };
  }
  const org = await Organization.findByPk(organizationId);
  if (!org) return { ok: false, reason: "ORG_NOT_FOUND" };
  if (org.createdById === userId) return { ok: true, type: "org", org };
  const membership = await OrganizationMember.findOne({
    where: { organizationId, userId },
  });
  if (!membership) return { ok: false, reason: "FORBIDDEN" };
  return { ok: true, type: "org", org };
}

// GET /api/amortizacija/years?organizationId=X
async function getYears(req, res) {
  const orgId = parseIntId(req.query.organizationId ?? req.query.orgId);
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const where = { type: "PLDI" };
  if (orgId !== null) {
    where.organizationId = orgId;
  } else {
    // Lične PLDI forme — bez organizationId i bez clientId.
    where.organizationId = null;
    where.clientId = null;
    where.createdById = req.user.id;
  }

  const forms = await Form.findAll({
    where,
    attributes: ["year"],
    order: [["year", "DESC"]],
  });
  const years = [...new Set(forms.map((f) => f.year))];
  return res.status(200).json({ ok: true, data: years });
}

// GET /api/amortizacija?godina=YYYY&organizationId=X
async function get(req, res) {
  const { godina } = req.query;
  if (!godina) return res.status(400).json({ ok: false, error: "Missing godina" });
  const year = parseInt(godina, 10);
  if (Number.isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const orgId = parseIntId(req.query.organizationId ?? req.query.orgId);
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const where = { type: "PLDI", year };
  if (orgId !== null) {
    where.organizationId = orgId;
  } else {
    where.organizationId = null;
    where.clientId = null;
    where.createdById = req.user.id;
  }

  const form = await Form.findOne({
    where,
    include: [
      { model: FormVersion, as: "versions", order: [["versionNumber", "DESC"]], limit: 1 },
    ],
  });

  if (!form || !form.versions?.length) {
    return res.status(200).json({ ok: true, data: null });
  }

  const raw = form.versions[0].data;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return res.status(200).json({ ok: true, data: parsed });
}

// POST /api/amortizacija { godina, organizationId, obveznik, rows }
async function save(req, res) {
  const { godina, obveznik, rows } = req.body;
  if (!godina) return res.status(400).json({ ok: false, error: "Missing godina" });
  const year = parseInt(godina, 10);
  if (Number.isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const orgId = parseIntId(req.body.organizationId ?? req.body.orgId);
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const where = { type: "PLDI", year };
  if (orgId !== null) {
    where.organizationId = orgId;
  } else {
    where.organizationId = null;
    where.clientId = null;
    where.createdById = req.user.id;
  }

  // Snimanje PLDI-ja i appendAsset (knjiženje sredstva sa računa) diraju isti
  // FormVersion v1. Bez zaključavanja read-modify-write se preklapaju i gube
  // red (last-write-wins). Serijalizuj kroz transakciju sa lock-om reda org-e i
  // sačuvaj programski dodana sredstva (id "srv-...") koja klijentov snimak
  // (učitan prije knjiženja) nema, da booked sredstvo ne nestane tiho.
  const formId = await sequelize.transaction(async (t) => {
    if (orgId !== null) {
      await Organization.findByPk(orgId, { transaction: t, lock: t.LOCK.UPDATE });
    }
    let form = await Form.findOne({ where, transaction: t });
    if (!form) {
      // PLDI je gotov dokument čim se snimi (PDF se renderuje iz snimljenih
      // podataka bilo kad), pa ide odmah u GENERATED, ne DRAFT.
      form = await Form.create(
        {
          type: "PLDI",
          year,
          status: "GENERATED",
          createdById: req.user.id,
          organizationId: orgId,
        },
        { transaction: t },
      );
    } else if (form.status === "DRAFT") {
      // Postojeći "Nacrt" iz starog ponašanja podigni na GENERATED pri snimanju.
      await Form.update(
        { status: "GENERATED" },
        { where: { id: form.id }, transaction: t },
      );
    }

    const existing = await FormVersion.findOne({
      where: { formId: form.id, versionNumber: 1 },
      transaction: t,
    });

    // sačuvaj serverski dodana sredstva koja klijent nema (append poslije load-a)
    let mergedRows = Array.isArray(rows) ? [...rows] : [];
    if (existing) {
      const stored = typeof existing.data === "string"
        ? JSON.parse(existing.data)
        : existing.data;
      const storedRows = Array.isArray(stored?.rows) ? stored.rows : [];
      const incomingIds = new Set(mergedRows.map((r) => r && r.id).filter(Boolean));
      const bookedMissing = storedRows.filter(
        (r) =>
          r &&
          typeof r.id === "string" &&
          r.id.startsWith("srv-") &&
          !incomingIds.has(r.id),
      );
      if (bookedMissing.length) mergedRows = [...mergedRows, ...bookedMissing];
    }

    const dataStr = JSON.stringify({ obveznik, rows: mergedRows });
    if (existing) {
      await FormVersion.update(
        { data: dataStr },
        { where: { formId: form.id, versionNumber: 1 }, transaction: t },
      );
    } else {
      await FormVersion.create(
        { formId: form.id, versionNumber: 1, data: dataStr },
        { transaction: t },
      );
    }
    return form.id;
  });

  return res.status(200).json({ ok: true, data: { id: formId } });
}

// DELETE /api/amortizacija?godina=YYYY&organizationId=X
async function remove(req, res) {
  const { godina } = req.query;
  const year = parseInt(godina, 10);
  if (Number.isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const orgId = parseIntId(req.query.organizationId ?? req.query.orgId);
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const where = { type: "PLDI", year };
  if (orgId !== null) {
    where.organizationId = orgId;
  } else {
    where.organizationId = null;
    where.clientId = null;
    where.createdById = req.user.id;
  }

  const form = await Form.findOne({ where });
  if (!form) return res.status(200).json({ ok: true, data: null });

  await FormVersion.destroy({ where: { formId: form.id } });
  await Form.destroy({ where: { id: form.id } });
  return res.status(200).json({ ok: true, data: null });
}

// GET /api/amortizacija/org-years
// Vraća map { orgId: [year, year, ...] } za sve organizacije u kojima je
// korisnik član. Frontend koristi za "ima li podataka" indikator.
async function getOrgYears(req, res) {
  const memberships = await OrganizationMember.findAll({
    where: { userId: req.user.id },
    attributes: ["organizationId"],
  });
  const memberOrgIds = memberships.map((m) => m.organizationId);

  const ownOrgs = await Organization.findAll({
    where: { createdById: req.user.id },
    attributes: ["id"],
  });
  const ownOrgIds = ownOrgs.map((o) => o.id);

  const allOrgIds = [...new Set([...memberOrgIds, ...ownOrgIds])];
  if (allOrgIds.length === 0) {
    return res.status(200).json({ ok: true, data: {} });
  }

  const forms = await Form.findAll({
    where: {
      type: "PLDI",
      organizationId: { [Op.in]: allOrgIds },
    },
    attributes: ["organizationId", "year"],
  });
  const map = {};
  for (const f of forms) {
    const key = String(f.organizationId);
    if (!map[key]) map[key] = [];
    if (!map[key].includes(f.year)) map[key].push(f.year);
  }
  return res.status(200).json({ ok: true, data: map });
}

// POST /api/amortizacija/mark-generated { godina, organizationId }
// Preuzimanje PLDI obrasca → status DRAFT prelazi u GENERATED.
async function markGenerated(req, res) {
  const year = parseInt(req.body?.godina, 10);
  if (Number.isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const orgId = parseIntId(req.body.organizationId ?? req.body.orgId);
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const where = { type: "PLDI", year };
  if (orgId !== null) {
    where.organizationId = orgId;
  } else {
    where.organizationId = null;
    where.clientId = null;
    where.createdById = req.user.id;
  }
  await Form.update({ status: "GENERATED" }, { where });
  return res.status(200).json({ ok: true });
}

// ─── Veza sa PK Office knjigama ──────────────────────────────────────────────

// POST /api/amortizacija/assets { organizationId, godina, naziv, brojDokumenta,
// datumNabavke, nabavnaVrijednost, vijekTrajanja }
// Dodaje jedno stalno sredstvo u PLDI registar (org, godina): koristi ga
// "Stalno sredstvo" opcija na knjiženju ulaznog računa u PK Office. Ako
// registar za godinu ne postoji, kreira se sa predpopunjenim obveznikom.
async function appendAsset(req, res) {
  const year = parseInt(req.body?.godina, 10);
  if (Number.isNaN(year)) {
    return res.status(400).json({ ok: false, error: "INVALID_GODINA" });
  }
  const orgId = parseIntId(req.body.organizationId);
  if (orgId === null) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const naziv = String(req.body?.naziv || "").trim();
  const nabavna = Number(req.body?.nabavnaVrijednost);
  const vijek = parseInt(req.body?.vijekTrajanja, 10);
  const datumNabavke = String(req.body?.datumNabavke || "").slice(0, 10);
  if (!naziv) return res.status(400).json({ ok: false, error: "NAZIV_REQUIRED" });
  if (!Number.isFinite(nabavna) || nabavna <= 0) {
    return res.status(400).json({ ok: false, error: "INVALID_IZNOS" });
  }
  if (!Number.isInteger(vijek) || vijek < 1 || vijek > 40) {
    return res.status(400).json({ ok: false, error: "INVALID_VIJEK" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datumNabavke)) {
    return res.status(400).json({ ok: false, error: "INVALID_DATUM" });
  }

  const org = access.org || (await Organization.findByPk(orgId));

  try {
    // cijeli read-modify-write PLDI JSON-a ide kroz transakciju sa lock-om
    // reda organizacije: dva paralelna knjiženja u stalna sredstva (ili
    // preklapanje sa /amortizacija save-om) inače rade last-write-wins i
    // izgube red
    const rowsLen = await sequelize.transaction(async (t) => {
      await Organization.findByPk(orgId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const where = { type: "PLDI", year, organizationId: orgId };
      let form = await Form.findOne({ where, transaction: t });
      if (!form) {
        form = await Form.create(
          {
            type: "PLDI",
            year,
            status: "GENERATED",
            createdById: req.user.id,
            organizationId: orgId,
          },
          { transaction: t },
        );
      }

      const version = await FormVersion.findOne({
        where: { formId: form.id, versionNumber: 1 },
        transaction: t,
      });
      const raw = version ? version.data : null;
      const parsed = raw
        ? typeof raw === "string"
          ? JSON.parse(raw)
          : raw
        : null;
      const data = parsed || {
        // svjež registar: obveznik predpopunjen iz organizacije (ostalo se
        // dopuni na /amortizacija stranici)
        obveznik: {
          jmb: "",
          imeIPrezime: "",
          adresa: "",
          grad: "",
          jib: org?.taxNumber || "",
          naziv: org?.name || "",
          adresaDjelatnosti: org?.address || "",
          gradDjelatnosti: org?.city || "",
          vrstaSifra: org?.activityCode || "",
          vrstaNaziv: "",
          godina: String(year),
          manualPeriod: false,
          periodOd: "",
          periodDo: "",
        },
        rows: [],
      };

      const rows = Array.isArray(data.rows) ? data.rows : [];
      rows.push({
        id: `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        naziv,
        datumNabavke,
        brojDokumenta: String(req.body?.brojDokumenta || "").trim(),
        // format koji parseDec na frontendu čita (zarez kao decimalni)
        nabavnaVrijednost: nabavna.toFixed(2).replace(".", ","),
        // novo sredstvo: knjigovodstvena vrijednost na početku = nabavna
        // (bez ovoga PLDI obračun za red daje 0)
        kvPocetak: nabavna.toFixed(2).replace(".", ","),
        vijekTrajanja: String(vijek),
        stopaOverride: "",
        mjeseciOverride: "",
        napomena: "Dodano sa knjiženja ulaznog računa",
        prodano: false,
        datumProdaje: "",
      });
      data.rows = rows;

      const dataStr = JSON.stringify(data);
      if (version) {
        await FormVersion.update(
          { data: dataStr },
          { where: { formId: form.id, versionNumber: 1 }, transaction: t },
        );
      } else {
        await FormVersion.create(
          {
            formId: form.id,
            versionNumber: 1,
            data: dataStr,
          },
          { transaction: t },
        );
      }
      return rows.length;
    });
    return res.status(200).json({ ok: true, data: { rows: rowsLen } });
  } catch (err) {
    console.error("amortizacija appendAsset error:", err);
    return res.status(500).json({ ok: false, error: "APPEND_FAILED" });
  }
}

// GET /api/amortizacija/knjizenje?organizationId=X&godina=YYYY
// Da li je godišnja amortizacija već proknjižena u KPR (interni izvod).
async function knjizenjeStatus(req, res) {
  const year = parseInt(req.query?.godina, 10);
  const orgId = parseIntId(req.query.organizationId);
  if (Number.isNaN(year) || orgId === null) {
    return res.status(400).json({ ok: false, error: "INVALID_PARAMS" });
  }
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }
  const statement = await BankStatement.findOne({
    where: {
      organizationId: orgId,
      bankId: "amortizacija",
      statementNumber: `AM-${year}`,
    },
  });
  if (!statement) return res.json({ ok: true, data: { knjizeno: false } });
  const tx = await BankTransaction.findOne({
    where: { statementId: statement.id },
    attributes: ["amount"],
  });
  return res.json({
    ok: true,
    data: {
      knjizeno: true,
      iznos: tx ? Number(tx.amount) : null,
      statementId: statement.id,
    },
  });
}

// POST /api/amortizacija/knjizenje { organizationId, godina, iznos, datum? }
// Knjiži godišnju amortizaciju u KPR kao interni "izvod" (isti mehanizam kao
// prebijanja): jedna CONFIRMED OUT stavka kategorije AMORTIZACIJA. Datum je
// kraj perioda obračuna (default 31.12.; obrt zatvoren u toku godine šalje
// svoj kraj perioda). Iznos računa frontend istom logikom kao PLDI obrazac.
async function knjizi(req, res) {
  const year = parseInt(req.body?.godina, 10);
  const orgId = parseIntId(req.body.organizationId);
  const iznosRaw = Number(req.body?.iznos);
  if (Number.isNaN(year) || orgId === null) {
    return res.status(400).json({ ok: false, error: "INVALID_PARAMS" });
  }
  if (!Number.isFinite(iznosRaw)) {
    return res.status(400).json({ ok: false, error: "INVALID_IZNOS" });
  }
  // zaokruži PRIJE provjere > 0 da sićušan iznos (npr. 0.004) ne prođe pa
  // proknjiži 0.00 (koje bi onda 409-blokiralo pravo knjiženje)
  const iznos = Math.round(iznosRaw * 100) / 100;
  if (iznos <= 0) {
    return res.status(400).json({ ok: false, error: "INVALID_IZNOS" });
  }
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  // datum knjiženja = kraj perioda obračuna; nevalidan/izvan godine → 31.12.
  const rawDatum = String(req.body?.datum || "").slice(0, 10);
  const datum = isValidYmd(rawDatum, year) ? rawDatum : `${year}-12-31`;

  try {
    const created = await sequelize.transaction(async (t) => {
      // zaključaj red organizacije da dva paralelna knjiženja (dvoklik/retry)
      // ne mogu oba proći VEC_KNJIZENO provjeru i dvostruko proknjižiti
      // (jedinstveni indeks ne hvata ovo jer je account NULL)
      await Organization.findByPk(orgId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const existing = await BankStatement.findOne({
        where: {
          organizationId: orgId,
          bankId: "amortizacija",
          statementNumber: `AM-${year}`,
        },
        transaction: t,
      });
      if (existing) {
        const err = new Error("VEC_KNJIZENO");
        err.code = "VEC_KNJIZENO";
        throw err;
      }
      const statement = await BankStatement.create(
        {
          organizationId: orgId,
          uploadedById: req.user.id,
          bankId: "amortizacija",
          bankName: "Interno knjiženje",
          account: null,
          statementNumber: `AM-${year}`,
          statementDate: datum,
          currency: "BAM",
          openingBalance: null,
          closingBalance: null,
          fileName: null,
          warnings: null,
        },
        { transaction: t },
      );
      await BankTransaction.create(
        {
          organizationId: orgId,
          statementId: statement.id,
          date: datum,
          description: `Godišnja amortizacija stalnih sredstava za ${year}. (PLDI)`,
          reference: null,
          counterpartyName: null,
          counterpartyAccount: null,
          amount: iznos,
          direction: "OUT",
          balanceAfter: null,
          category: "AMORTIZACIJA",
          status: "CONFIRMED",
        },
        { transaction: t },
      );
      return statement;
    });
    return res
      .status(201)
      .json({ ok: true, data: { statementId: created.id } });
  } catch (err) {
    if (err && err.code === "VEC_KNJIZENO") {
      return res.status(409).json({ ok: false, error: "VEC_KNJIZENO" });
    }
    console.error("amortizacija knjizi error:", err);
    return res.status(500).json({ ok: false, error: "KNJIZENJE_FAILED" });
  }
}

module.exports = {
  getYears,
  get,
  save,
  markGenerated,
  remove,
  getOrgYears,
  appendAsset,
  knjizenjeStatus,
  knjizi,
};
