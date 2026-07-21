const organizationRepository = require("../repositories/organizationRepository");
const { getPlan, planFromRole } = require("../config/plans");
const { freshRole } = require("../services/tierService");
const { getOfficeAccess } = require("./pkOfficeGateController");
const { encryptJmbg } = require("../utils/encryptJmbg");
const {
  Organization,
  OrganizationMember,
  UserPreference,
  Worker,
  Payroll,
  BankStatement,
} = require("../models/index");
const { publicUrlFor, absPathFor, safeUnlink } = require("../utils/uploads");

const {
  formatAccountDashed,
} = require("../services/bankStatements/bankCodes");

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateOrgData(body, requireName = true) {
  const { name, type, taxNumber, email, phone, address, city } = body ?? {};
  const data = {};

  if (requireName || name != null) {
    if (!isNonEmptyString(name)) {
      return { ok: false, message: "Naziv organizacije je obavezan" };
    }
    data.name = name.trim();
  }

  if (type != null) {
    if (!["COMPANY", "BUSINESS"].includes(type)) {
      return { ok: false, message: "Tip mora biti COMPANY ili BUSINESS" };
    }
    data.type = type;
  }

  if (taxNumber !== undefined)
    data.taxNumber = taxNumber ? String(taxNumber).trim() : null;
  if (body.pdvNumber !== undefined) {
    const pdv = body.pdvNumber ? String(body.pdvNumber).replace(/\D/g, "") : "";
    if (pdv && pdv.length !== 12) {
      return { ok: false, message: "PDV broj mora imati tačno 12 cifara" };
    }
    data.pdvNumber = pdv || null;
  }
  if (body.activityCode !== undefined)
    data.activityCode = body.activityCode
      ? String(body.activityCode).trim()
      : null;
  if (body.activityName !== undefined)
    data.activityName = body.activityName
      ? String(body.activityName).trim()
      : null;
  if (email !== undefined) data.email = email ? String(email).trim() : null;
  if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
  if (address !== undefined)
    data.address = address ? String(address).trim() : null;
  if (city !== undefined) data.city = city ? String(city).trim() : null;
  if (body.bankAccount !== undefined)
    data.bankAccount = body.bankAccount
      ? String(body.bankAccount).trim()
      : null;
  // Lista svih žiro računa (samo cifre, bez duplikata); prvi je glavni
  // pa se bankAccount drži sinhronizovan sa njim.
  if (body.bankAccounts !== undefined) {
    if (body.bankAccounts === null) {
      data.bankAccounts = null;
    } else if (Array.isArray(body.bankAccounts)) {
      const seen = new Set();
      const list = [];
      for (const a of body.bankAccounts) {
        const digits = String(a || "").replace(/\D+/g, "");
        if (digits.length < 8 || seen.has(digits)) continue;
        seen.add(digits);
        list.push(digits);
      }
      data.bankAccounts = list.length ? list : null;
      data.bankAccount = list[0] ? formatAccountDashed(list[0]) : null;
    } else {
      return { ok: false, message: "bankAccounts mora biti lista računa" };
    }
  }

  // Režim oporezivanja vlasnika obrta (čl. 19 / 31 / 6 t.10)
  if (body.taxRegime !== undefined) {
    if (body.taxRegime === null || body.taxRegime === "") {
      data.taxRegime = null;
    } else if (
      !["STVARNI_DOHODAK", "PAUSALNI", "OSTALI"].includes(body.taxRegime)
    ) {
      return { ok: false, message: "Nepoznat režim oporezivanja" };
    } else {
      data.taxRegime = body.taxRegime;
    }
  }
  if (body.taxCategory !== undefined) {
    if (body.taxCategory === null || body.taxCategory === "") {
      data.taxCategory = null;
    } else {
      const cat = String(body.taxCategory).trim().toUpperCase();
      const valid = [
        "SLOBODNA_ZANIMANJA",
        "OBRT_SRODNE",
        "POLJOPRIVREDA_SUMARSTVO",
        "TRGOVAC_POJEDINAC",
        "ESNAFSKI_ZANATI",
        "TAXI",
      ];
      if (!valid.includes(cat)) {
        return { ok: false, message: "Nepoznata kategorija djelatnosti" };
      }
      data.taxCategory = cat;
    }
  }

  // Default tip plate za nove radnike — knjigovođa može imati klijente sa
  // različitim "stilom" (npr. svi na minimalcu = NETO_ISPLATA, drugi sa
  // ugovornim bruto-platama = BRUTO).
  if (body.defaultSalaryType !== undefined) {
    if (body.defaultSalaryType === null || body.defaultSalaryType === "") {
      data.defaultSalaryType = "NETO_ISPLATA";
    } else if (
      !["BRUTO", "NETO_UGOVOR", "NETO_ISPLATA"].includes(body.defaultSalaryType)
    ) {
      return { ok: false, message: "Nepoznat tip plate" };
    } else {
      data.defaultSalaryType = body.defaultSalaryType;
    }
  }

  if (body.jurisdiction !== undefined) {
    if (body.jurisdiction === null || body.jurisdiction === "") {
      data.jurisdiction = null;
    } else if (["FBIH", "RS", "BD"].includes(body.jurisdiction)) {
      data.jurisdiction = body.jurisdiction;
    } else {
      return {
        ok: false,
        message: "jurisdiction mora biti FBIH, RS ili BD",
      };
    }
  }

  if (body.isPdvObveznik !== undefined) {
    data.isPdvObveznik = Boolean(body.isPdvObveznik);
  }

  // prihod od pazara u KPR ide iz dnevnog prometa (KP-1042) umjesto iz
  // pologa sa izvoda (kategorija PAZAR se tada isključuje iz KPR-a)
  if (body.kprPazarIzKp !== undefined) {
    data.kprPazarIzKp = Boolean(body.kprPazarIzKp);
  }

  // Dnevna stopa toplog obroka za firmu (obračun je množi sa radnim danima).
  if (body.mealAllowancePerDay !== undefined) {
    if (body.mealAllowancePerDay === null || body.mealAllowancePerDay === "") {
      data.mealAllowancePerDay = null;
    } else {
      const rate = Number(body.mealAllowancePerDay);
      if (!Number.isFinite(rate) || rate < 0) {
        return { ok: false, message: "Neispravna dnevna stopa toplog obroka" };
      }
      data.mealAllowancePerDay = rate;
    }
  }

  // ── Model vlasništva / direktora (d.o.o.) ──────────────────────────────
  // Ova polja idu na Organization. Za obrt (BUSINESS) se ignorišu u logici
  // (vlasnik je uvijek obrtnik), ali ih svejedno prihvatamo.
  if (body.ownerType !== undefined) {
    const allowed = [
      "fizicko_domace",
      "fizicko_strano",
      "pravno_lice",
      "vise_lica",
    ];
    if (body.ownerType === null || body.ownerType === "") {
      data.ownerType = "fizicko_domace";
    } else if (!allowed.includes(body.ownerType)) {
      return { ok: false, message: "Nepoznat tip vlasnika" };
    } else {
      data.ownerType = body.ownerType;
    }
  }
  if (body.ownerIsDirector !== undefined) {
    data.ownerIsDirector = Boolean(body.ownerIsDirector);
  }
  if (body.directorEngagement !== undefined) {
    if (body.directorEngagement === null || body.directorEngagement === "") {
      data.directorEngagement = "ugovor_o_radu";
    } else if (
      !["ugovor_o_radu", "menadzerski"].includes(body.directorEngagement)
    ) {
      return { ok: false, message: "Nepoznat osnov direktora" };
    } else {
      data.directorEngagement = body.directorEngagement;
    }
  }
  if (body.directorWorkerId !== undefined) {
    data.directorWorkerId =
      body.directorWorkerId === null || body.directorWorkerId === ""
        ? null
        : Number(body.directorWorkerId);
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, message: "Nema polja za ažuriranje" };
  }

  return { ok: true, value: data };
}

// Validira identitet vlasnika. Oblik zavisi od ownerType:
//   fizicko_domace / fizicko_strano → ime + prezime (JMBG/strani ID)
//   pravno_lice                     → naziv firme + JIB
//   vise_lica                       → naziv ili lista lica
// requireJmbg traži JMBG samo za domaće fizičko lice na kreiranju.
function validateOwnerData(owner, opts = {}) {
  const { requireJmbg = true, ownerType = "fizicko_domace" } = opts;
  const isPerson =
    ownerType === "fizicko_domace" || ownerType === "fizicko_strano";
  const isLegal = ownerType === "pravno_lice";
  const isMulti = ownerType === "vise_lica";

  const data = {};

  if (isPerson) {
    if (!isNonEmptyString(owner?.firstName)) {
      return { ok: false, message: "Ime vlasnika je obavezno" };
    }
    if (!isNonEmptyString(owner?.lastName)) {
      return { ok: false, message: "Prezime vlasnika je obavezno" };
    }
    data.firstName = owner.firstName.trim();
    data.lastName = owner.lastName.trim();

    if (owner.jmbg && String(owner.jmbg).trim()) {
      const plainJmbg = String(owner.jmbg).trim();
      if (!/^\d{13}$/.test(plainJmbg)) {
        return {
          ok: false,
          message: "JMBG vlasnika mora imati tačno 13 cifara",
        };
      }
      data.jmbg = encryptJmbg(plainJmbg);
      // Spol se izvodi iz JMBG-a (cifre 10-12: < 500 = M, >= 500 = Z), isto kao
      // kod radnika, da ga payroll prepozna automatski.
      const nnn = parseInt(plainJmbg.slice(9, 12), 10);
      if (Number.isFinite(nnn)) data.spol = nnn >= 500 ? "Z" : "M";
    } else if (requireJmbg) {
      return { ok: false, message: "JMBG vlasnika je obavezan" };
    }
    // Strani ID / broj pasoša (za fizicko_strano umjesto JMBG-a).
    if (owner.idDoc) data.idDoc = String(owner.idDoc).trim();
  } else if (isLegal) {
    if (!isNonEmptyString(owner?.name)) {
      return { ok: false, message: "Naziv vlasnika (firme) je obavezan" };
    }
    data.name = owner.name.trim();
    if (owner.jib && String(owner.jib).trim()) {
      const jib = String(owner.jib).trim();
      if (!/^\d{13}$/.test(jib)) {
        return { ok: false, message: "JIB vlasnika mora imati tačno 13 cifara" };
      }
      data.jib = jib;
    }
  } else if (isMulti) {
    const hasName = isNonEmptyString(owner?.name);
    const persons = Array.isArray(owner?.persons)
      ? owner.persons.filter(
          (p) => p && (isNonEmptyString(p.firstName) || isNonEmptyString(p.lastName)),
        )
      : [];
    if (!hasName && persons.length === 0) {
      return {
        ok: false,
        message: "Unesite naziv ili bar jedno lice vlasnika",
      };
    }
    if (hasName) data.name = owner.name.trim();
    if (persons.length > 0) {
      data.persons = persons.map((p) => ({
        firstName: String(p.firstName || "").trim(),
        lastName: String(p.lastName || "").trim(),
        jmbg:
          p.jmbg && /^\d{13}$/.test(String(p.jmbg).trim())
            ? encryptJmbg(String(p.jmbg).trim())
            : null,
        idDoc: p.idDoc ? String(p.idDoc).trim() : null,
      }));
    }
  }

  if (owner.email) data.email = String(owner.email).trim();
  if (owner.phone) data.phone = String(owner.phone).trim();
  if (owner.address) data.address = String(owner.address).trim();
  if (owner.city) data.city = String(owner.city).trim();
  if (owner.idCardNumber) {
    const idn = String(owner.idCardNumber).trim();
    if (idn.length > 9)
      return {
        ok: false,
        message: "Broj lične karte može imati najviše 9 znakova",
      };
    data.idCardNumber = idn;
  }

  // prijavaDate i salaryBruto — ako su uneseni, vlasnik se računa kao
  // prijavljen radnik. Ako prijavaDate nije unesen, ostaje DRAFT — prijavljuje
  // se kasnije preko JS3100 ili ručnim editovanjem.
  if (owner.prijavaDate !== undefined) {
    if (owner.prijavaDate === null || owner.prijavaDate === "") {
      data.prijavaDate = null;
      data.employmentStatus = "DRAFT";
    } else {
      data.prijavaDate = new Date(owner.prijavaDate);
      data.employmentStatus = "PRIJAVLJEN";
    }
  }
  if (owner.salaryBruto !== undefined) {
    data.salaryBruto =
      owner.salaryBruto === null || owner.salaryBruto === ""
        ? null
        : Number(owner.salaryBruto);
  }
  if (owner.salaryNeto !== undefined) {
    data.salaryNeto =
      owner.salaryNeto === null || owner.salaryNeto === ""
        ? null
        : Number(owner.salaryNeto);
  }
  // Tip plate određuje šta engine vuče: BRUTO → salaryBruto, NETO_* → salaryNeto.
  if (
    owner.salaryType !== undefined &&
    owner.salaryType !== null &&
    owner.salaryType !== ""
  ) {
    if (
      !["BRUTO", "NETO_UGOVOR", "NETO_ISPLATA"].includes(owner.salaryType)
    ) {
      return { ok: false, message: "Nepoznat tip plate vlasnika" };
    }
    data.salaryType = owner.salaryType;
  }
  if (owner.taxCoefficient !== undefined) {
    const c = Number(owner.taxCoefficient);
    // 0 je validna vrijednost (bez porezne kartice → bez ličnog odbitka).
    if (Number.isFinite(c) && c >= 0) data.taxCoefficient = c;
  }

  return { ok: true, value: data };
}

async function list(req, res) {
  const orgs = await organizationRepository.getUserOrganizations(req.user.id);
  res.status(200).json({ ok: true, data: orgs });
}

async function listClients(req, res) {
  // Repository filters to orgs where this user has membership; no role gate needed.
  const orgs = await organizationRepository.getClientOrganizations(req.user.id);
  res.status(200).json({ ok: true, data: orgs });
}

// Lista svih organizacija (vlastite + klijentske) sa agregatnim podacima:
//  • broj radnika (aktivni, ne odjavljeni za odabrani mjesec ako se prosljeđuje)
//  • status payroll-a za odabrani mjesec
//  • broj obračunatih (OBRACUNATO + ISPLACENO) i isplaćenih (ISPLACENO) payrolla
// Query params: ?year=2026&month=5 (default = trenutni mjesec).
async function listWithPayrollStatus(req, res) {
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || now.getMonth() + 1;
  if (year < 2000 || year > 2100 || month < 1 || month > 12) {
    return res.status(400).json({ ok: false, error: "INVALID_PERIOD" });
  }

  const userId = req.user.id;
  const own = await organizationRepository.getUserOrganizations(userId);
  // Repository već filtrira na klijentske org. po user membership-u; ako user
  // nije dodan ni u jednu klijentsku org, vraća prazno.
  const clients = await organizationRepository.getClientOrganizations(userId);

  const orgIds = [...own.map((o) => o.id), ...clients.map((o) => o.id)];
  if (orgIds.length === 0) {
    return res.json({ ok: true, data: { own: [], clients: [], year, month } });
  }

  // Agregat: broj radnika po org (svi koji nisu odjavljeni — RADNIK + VLASNIK).
  const workersByOrg = new Map();
  const workers = await Worker.findAll({
    where: { organizationId: orgIds },
    attributes: ["id", "organizationId", "employmentStatus", "role"],
  });
  for (const w of workers) {
    if (w.employmentStatus === "ODJAVLJEN") continue;
    workersByOrg.set(
      w.organizationId,
      (workersByOrg.get(w.organizationId) || 0) + 1,
    );
  }

  // Agregat: payrolli za zadati mjesec po org → broj obračunatih i isplaćenih.
  const payrollsByOrg = new Map();
  const payrolls = await Payroll.findAll({
    where: { organizationId: orgIds, year, month },
    attributes: ["organizationId", "status", "mipDownloadedAt"],
  });
  for (const p of payrolls) {
    const cur = payrollsByOrg.get(p.organizationId) || {
      total: 0,
      obracunato: 0,
      isplaceno: 0,
      mipDownloadedAt: null,
    };
    cur.total += 1;
    if (p.status === "OBRACUNATO" || p.status === "ISPLACENO") {
      cur.obracunato += 1;
    }
    if (p.status === "ISPLACENO") {
      cur.isplaceno += 1;
    }
    // Batch update drži isti timestamp na svim payrollima mjeseca; uzmi najnoviji.
    if (
      p.mipDownloadedAt &&
      (!cur.mipDownloadedAt || p.mipDownloadedAt > cur.mipDownloadedAt)
    ) {
      cur.mipDownloadedAt = p.mipDownloadedAt;
    }
    payrollsByOrg.set(p.organizationId, cur);
  }

  // Zadnji učitani izvod po org (pregled obrta na PK Office početnoj).
  const lastStatementByOrg = new Map();
  const statements = await BankStatement.findAll({
    where: { organizationId: orgIds },
    attributes: ["organizationId", "statementDate"],
  });
  for (const s of statements) {
    if (!s.statementDate) continue;
    const cur = lastStatementByOrg.get(s.organizationId);
    if (!cur || s.statementDate > cur) {
      lastStatementByOrg.set(s.organizationId, s.statementDate);
    }
  }

  const enrich = (orgs) =>
    orgs.map((o) => {
      const workerCount = workersByOrg.get(o.id) || 0;
      const stats = payrollsByOrg.get(o.id) || {
        total: 0,
        obracunato: 0,
        isplaceno: 0,
        mipDownloadedAt: null,
      };
      // payrollStatus:
      //   "no_workers"   — org nema aktivnih radnika
      //   "none"         — ima radnike ali ni jedan payroll za mjesec
      //   "partial"      — neki obračunati, neki nisu
      //   "obracunato"   — svi obračunati ali nisu svi isplaćeni
      //   "isplaceno"    — svi obračunati I svi isplaćeni
      let payrollStatus;
      if (workerCount === 0) payrollStatus = "no_workers";
      else if (stats.obracunato === 0) payrollStatus = "none";
      else if (stats.isplaceno === workerCount) payrollStatus = "isplaceno";
      else if (stats.obracunato === workerCount) payrollStatus = "obracunato";
      else payrollStatus = "partial";

      return {
        ...o,
        workerCount,
        payrollObracunato: stats.obracunato,
        payrollIsplaceno: stats.isplaceno,
        payrollStatus,
        mipDownloadedAt: stats.mipDownloadedAt,
        lastStatementDate: lastStatementByOrg.get(o.id) || null,
      };
    });

  return res.json({
    ok: true,
    data: {
      own: enrich(own),
      clients: enrich(clients),
      year,
      month,
    },
  });
}

async function create(req, res) {
  const { ownerData, ...orgBody } = req.body ?? {};
  // Svježa rola (lijeni istek pretplate): istekli BUSINESS ne smije značiti
  // neograničeno kreiranje organizacija kroz direktne API pozive.
  const userRole = await freshRole(req.user);
  // Limiti po planu (USER=free, PRO=pro, BUSINESS/ADMIN=business). -1 = neograničeno.
  const planLimits = getPlan(planFromRole(userRole)).limits;

  // PK Office pretplatnik/trial (rola može ostati USER): kreiranje obrta je
  // slobodno, pravi limit je PK Office slot po paketu. Vrijedi SAMO kad je
  // naplata uključena (enforced) i SAMO za nosioca pretplate (scope
  // "vlastiti"): naslijeđen pristup (knjigovođa u agenciji) ne daje pravo
  // kreiranja mimo role. Sa isključenim flagom ponašanje kao prije.
  const office = await getOfficeAccess(req.user.id);
  const officeOk = Boolean(
    office.enforced && office.hasOffice && office.scope === "vlastiti",
  );

  // Office Start (do 2 obrta): jedini office paket sa ukupnim limitom
  // kreiranja. To je ograda dogovorenog pravila "Business funkcije za ta 2
  // obrta" (Tim i veći su neograničeni jer su skuplji od Business-a).
  if (officeOk && office.plan === "office_2") {
    const [ownCount, clientCount] = await Promise.all([
      organizationRepository.countOwnedOrganizations(req.user.id),
      organizationRepository.countClientOrganizations(req.user.id),
    ]);
    if (ownCount + clientCount >= 2) {
      return res.status(409).json({ ok: false, error: "OFFICE_START_LIMIT" });
    }
  }

  // Only elevated roles can create client orgs (with separate ownerData)
  const CLIENT_ORG_ROLES = ["PRO", "BUSINESS", "ADMIN"];
  if (ownerData && !CLIENT_ORG_ROLES.includes(userRole) && !officeOk) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  if (ownerData) {
    // Klijentska organizacija: limit po planu (PRO=20, BUSINESS/ADMIN=neograničeno).
    const limit = planLimits.clientOrganizations;
    if (limit !== -1 && !officeOk) {
      const clientCount =
        await organizationRepository.countClientOrganizations(req.user.id);
      if (clientCount >= limit) {
        return res
          .status(409)
          .json({ ok: false, error: "CLIENT_ORG_LIMIT_REACHED" });
      }
    }
  } else {
    // Vlastita organizacija: limit po planu (USER=1, PRO=2, BUSINESS/ADMIN=neograničeno).
    const limit = planLimits.ownOrganizations;
    if (limit !== -1 && !officeOk) {
      const ownedCount = await organizationRepository.countOwnedOrganizations(
        req.user.id,
      );
      if (ownedCount >= limit) {
        return res
          .status(409)
          .json({ ok: false, error: "ALREADY_HAS_OWN_ORG_LIMIT" });
      }
    }
  }

  const orgValidation = validateOrgData(orgBody, true);
  if (!orgValidation.ok) {
    return res.status(400).json({ ok: false, error: orgValidation.message });
  }

  let validatedOwner = null;
  if (ownerData) {
    const ownerType = orgBody.ownerType || "fizicko_domace";
    // JMBG je obavezan SAMO ako će vlasnik biti prijavljeni radnik (Worker
    // VLASNIK): obrt (BUSINESS) uvijek, ili d.o.o. gdje je vlasnik prijavljeni
    // direktor po ugovoru o radu (opcija 1). Kod samo-evidencije, menadžerskog
    // ugovora ili stranca vlasnik nije prijavljen, pa JMBG ne treba.
    const ownerIsRegisteredWorker =
      orgBody.type === "BUSINESS" ||
      (Boolean(orgBody.ownerIsDirector) &&
        orgBody.directorEngagement === "ugovor_o_radu");
    const ownerValidation = validateOwnerData(ownerData, {
      requireJmbg: ownerType === "fizicko_domace" && ownerIsRegisteredWorker,
      ownerType,
    });
    if (!ownerValidation.ok) {
      return res
        .status(400)
        .json({ ok: false, error: ownerValidation.message });
    }
    validatedOwner = ownerValidation.value;
  }

  try {
    const org = await organizationRepository.createOrganization(
      orgValidation.value,
      validatedOwner,
      req.user.id,
    );
    res.status(201).json({ ok: true, data: org });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        ok: false,
        error: "Porezni broj već postoji",
      });
    }
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const { ownerData, ...orgBody } = req.body ?? {};

  const orgValidation = validateOrgData(orgBody, false);
  if (!orgValidation.ok) {
    return res.status(400).json({ ok: false, error: orgValidation.message });
  }

  let validatedOwner = null;
  if (ownerData) {
    // JMBG nikad obavezan na update (može se dopuniti kasnije).
    const ownerValidation = validateOwnerData(ownerData, {
      requireJmbg: false,
      ownerType: orgBody.ownerType || "fizicko_domace",
    });
    if (!ownerValidation.ok) {
      return res
        .status(400)
        .json({ ok: false, error: ownerValidation.message });
    }
    validatedOwner = ownerValidation.value;
  }

  try {
    const org = await organizationRepository.updateOrganization(
      id,
      orgValidation.value,
      validatedOwner,
      req.user.id,
    );
    if (!org) {
      return res
        .status(404)
        .json({ ok: false, error: "Organizacija nije pronađena" });
    }
    res.status(200).json({ ok: true, data: org });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        ok: false,
        error: "Porezni broj već postoji",
      });
    }
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  try {
    const deleted = await organizationRepository.deleteOrganization(
      id,
      req.user.id,
    );
    if (!deleted)
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function getById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const org = await organizationRepository.getOrganizationForUser(
    id,
    req.user.id,
  );

  if (!org) {
    return res
      .status(404)
      .json({ ok: false, error: "Organizacija nije pronađena" });
  }

  return res.status(200).json({ ok: true, data: org });
}

async function adminListAll(req, res) {
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 100);

  const result = await organizationRepository.getAllOrganizationsForAdmin({
    search,
    page,
    limit,
  });
  res.status(200).json({ ok: true, data: result });
}

module.exports = {
  list,
  listClients,
  listWithPayrollStatus,
  create,
  update,
  remove,
  getById,
  adminListAll,
};
async function uploadLogo(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });
  if (!req.file)
    return res.status(400).json({ ok: false, error: "Nedostaje fajl" });

  const org = await organizationRepository.getOrganizationForUser(
    id,
    req.user.id,
  );
  if (!org) {
    safeUnlink(req.file.path);
    return res
      .status(404)
      .json({ ok: false, error: "Organizacija nije pronađena" });
  }

  const oldRow = await Organization.findByPk(id);
  const oldUrl = oldRow?.logoUrl || null;

  const newUrl = publicUrlFor("logos", req.file.filename);
  await Organization.update({ logoUrl: newUrl }, { where: { id } });

  if (oldUrl) safeUnlink(absPathFor(oldUrl));

  res.status(200).json({ ok: true, data: { id, logoUrl: newUrl } });
}

async function removeLogo(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  const org = await organizationRepository.getOrganizationForUser(
    id,
    req.user.id,
  );
  if (!org)
    return res
      .status(404)
      .json({ ok: false, error: "Organizacija nije pronađena" });

  const row = await Organization.findByPk(id);
  if (row?.logoUrl) {
    safeUnlink(absPathFor(row.logoUrl));
    await Organization.update({ logoUrl: null }, { where: { id } });
  }

  res.status(200).json({ ok: true, data: { id, logoUrl: null } });
}

// Postavlja aktivnu organizaciju za PK Office (sidebar org switcher).
// Provjerava da user ima membership prije aktivacije.
async function activate(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const membership = await OrganizationMember.findOne({
    where: { userId: req.user.id, organizationId: id },
  });
  if (!membership) {
    return res
      .status(403)
      .json({ ok: false, error: "FORBIDDEN_ORGANIZATION" });
  }

  // PK Office radi samo sa obrtima — COMPANY se ne može aktivirati.
  const org = await Organization.findByPk(id, { attributes: ["id", "type"] });
  if (!org || org.type !== "BUSINESS") {
    return res
      .status(400)
      .json({ ok: false, error: "ORGANIZATION_NOT_BUSINESS" });
  }

  const [pref] = await UserPreference.findOrCreate({
    where: { userId: req.user.id },
    defaults: { userId: req.user.id, activeOrganizationId: id },
  });
  if (pref.activeOrganizationId !== id) {
    pref.activeOrganizationId = id;
    await pref.save();
  }

  res
    .status(200)
    .json({ ok: true, data: { activeOrganizationId: id } });
}

module.exports = {
  list,
  listClients,
  listWithPayrollStatus,
  create,
  update,
  remove,
  getById,
  adminListAll,
  uploadLogo,
  removeLogo,
  activate,
};
