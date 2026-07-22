const { Op } = require("sequelize");
const { Worker, Organization, OrganizationMember, ContractCounter, sequelize } = require("../models/index");
const { encryptJmbg, decryptJmbg } = require("../utils/encryptJmbg");
const { getOrgOwnerRole } = require("../services/tierService");
const {
  resolveEvidencija,
  editableList,
  EDITABLE_FIELDS,
} = require("../utils/evidencija");
const { generateEvidencijaPdf } = require("../utils/evidencijaPdf");
const ownerIdentitySync = require("../services/ownerIdentitySync");

const PRO_WORKERS_LIMIT = 5;
const USER_WORKERS_LIMIT = 1;

const VALID_ROLES = ["VLASNIK", "RADNIK"];

function parseOrgId(req) {
  const id = Number(req.params.orgId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseWorkerId(req) {
  const id = Number(req.params.workerId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function assertMembership(orgId, userId, roles = ["OWNER", "ADMIN", "MEMBER"]) {
  return OrganizationMember.findOne({
    where: { organizationId: orgId, userId, role: { [Op.in]: roles } },
  });
}

function toPublicWorker(w) {
  if (!w) return null;
  const plain = w.toJSON ? w.toJSON() : w;
  const { jmbg, ...rest } = plain;
  const prijavaDate = rest.prijavaDate ? String(rest.prijavaDate).slice(0, 10) : null;
  const odjavaDate = rest.odjavaDate ? String(rest.odjavaDate).slice(0, 10) : null;
  // Status se derivira iz datuma — datumi su master. To osigurava da ako
  // korisnik upiše prijavaDate ali zaboravi prebaciti status dropdown, status
  // se ipak prikaže kao PRIJAVLJEN. Stari podaci se ovim ispravljaju automatski.
  const derivedStatus = odjavaDate
    ? "ODJAVLJEN"
    : prijavaDate
      ? "PRIJAVLJEN"
      : "DRAFT";
  return {
    ...rest,
    employmentStatus: derivedStatus,
    jmbg: jmbg ? decryptJmbg(jmbg) : null,
    startDate: rest.startDate ? String(rest.startDate).slice(0, 10) : null,
    endDate: rest.endDate ? String(rest.endDate).slice(0, 10) : null,
    contractEndDate: rest.contractEndDate ? String(rest.contractEndDate).slice(0, 10) : null,
    firstEmploymentDate: rest.firstEmploymentDate
      ? String(rest.firstEmploymentDate).slice(0, 10)
      : null,
    priorWorkYears: rest.priorWorkYears != null ? Number(rest.priorWorkYears) : null,
    prijavaDate,
    odjavaDate,
    salaryBruto: rest.salaryBruto != null ? Number(rest.salaryBruto) : null,
    salaryNeto: rest.salaryNeto != null ? Number(rest.salaryNeto) : null,
    taxCoefficient: rest.taxCoefficient != null ? Number(rest.taxCoefficient) : 1.0,
    minuliRadRate: rest.minuliRadRate != null ? Number(rest.minuliRadRate) : 0.4,
    overtimeRate: rest.overtimeRate != null ? Number(rest.overtimeRate) : 25.0,
    nightRate: rest.nightRate != null ? Number(rest.nightRate) : 25.0,
    sundayRate: rest.sundayRate != null ? Number(rest.sundayRate) : 20.0,
    holidayRate: rest.holidayRate != null ? Number(rest.holidayRate) : 50.0,
    defaultMealAllowance: rest.defaultMealAllowance != null ? Number(rest.defaultMealAllowance) : 0,
    defaultTravelExpense: rest.defaultTravelExpense != null ? Number(rest.defaultTravelExpense) : 0,
    mealAllowancePerDay: rest.mealAllowancePerDay != null ? Number(rest.mealAllowancePerDay) : null,
    travelAllowancePerMonth:
      rest.travelAllowancePerMonth != null ? Number(rest.travelAllowancePerMonth) : null,
    contractedHours: rest.contractedHours != null ? Number(rest.contractedHours) : 8,
    prebivalisteEntitet: rest.prebivalisteEntitet === "RS" ? "RS" : "FBIH",
    opcinaKod: rest.opcinaKod || null,
    koristVoziloAktivna: !!rest.koristVoziloAktivna,
    koristVoziloMetoda: rest.koristVoziloMetoda || null,
    koristVoziloVrijednost:
      rest.koristVoziloVrijednost != null ? Number(rest.koristVoziloVrijednost) : null,
    koristVoziloSaPdv: rest.koristVoziloSaPdv == null ? true : !!rest.koristVoziloSaPdv,
    koristVoziloOpis: rest.koristVoziloOpis || null,
    evidencijaPodaci: parseEvidencija(rest.evidencijaPodaci),
  };
}

// MariaDB vraća JSON kolonu kao string; parsiraj u objekat.
function parseEvidencija(v) {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

const VALID_CONTRACT_TYPES = ["NEODREDJENO", "ODREDJENO"];
const VALID_EMPLOYMENT_STATUSES = ["DRAFT", "PRIJAVLJEN", "ODJAVLJEN"];

function pickEmploymentFields(body, target) {
  const {
    position,
    salaryBruto,
    salaryNeto,
    contractType,
    contractEndDate,
    probationMonths,
    noticePeriod,
    contractNumber,
    employmentStatus,
    prijavaDate,
    odjavaDate,
  } = body ?? {};

  if (position !== undefined) target.position = position?.trim() || null;
  if (salaryBruto !== undefined) {
    target.salaryBruto =
      salaryBruto === null || salaryBruto === "" ? null : Number(salaryBruto);
  }
  if (salaryNeto !== undefined) {
    target.salaryNeto =
      salaryNeto === null || salaryNeto === "" ? null : Number(salaryNeto);
  }
  if (contractType !== undefined) {
    if (contractType === null || contractType === "") {
      target.contractType = null;
    } else if (VALID_CONTRACT_TYPES.includes(contractType)) {
      target.contractType = contractType;
    } else {
      return "Vrsta ugovora mora biti NEODREDJENO ili ODREDJENO";
    }
  }
  if (contractEndDate !== undefined) {
    target.contractEndDate = contractEndDate ? new Date(contractEndDate) : null;
  }
  if (probationMonths !== undefined) {
    const n = probationMonths === null || probationMonths === "" ? null : Number(probationMonths);
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 6)) {
      return "Probni rad može trajati 0–6 mjeseci";
    }
    target.probationMonths = n;
  }
  if (noticePeriod !== undefined) target.noticePeriod = noticePeriod?.trim() || null;
  if (contractNumber !== undefined) target.contractNumber = contractNumber?.trim() || null;
  if (employmentStatus !== undefined) {
    if (!VALID_EMPLOYMENT_STATUSES.includes(employmentStatus)) {
      return "Status mora biti DRAFT, PRIJAVLJEN ili ODJAVLJEN";
    }
    target.employmentStatus = employmentStatus;
  }
  if (prijavaDate !== undefined) target.prijavaDate = prijavaDate ? new Date(prijavaDate) : null;
  if (odjavaDate !== undefined) target.odjavaDate = odjavaDate ? new Date(odjavaDate) : null;

  // JS3100 stabilna polja (osnov osiguranja, zanimanje) — prefill prijave/odjave.
  const {
    osnovOsiguranjaOpis,
    osnovOsiguranjaSifra,
    zanimanjeOpis,
    zanimanjeSifra,
  } = body ?? {};
  if (osnovOsiguranjaOpis !== undefined)
    target.osnovOsiguranjaOpis = osnovOsiguranjaOpis?.trim() || null;
  if (osnovOsiguranjaSifra !== undefined)
    target.osnovOsiguranjaSifra = osnovOsiguranjaSifra?.trim() || null;
  if (zanimanjeOpis !== undefined)
    target.zanimanjeOpis = zanimanjeOpis?.trim() || null;
  if (zanimanjeSifra !== undefined)
    target.zanimanjeSifra = zanimanjeSifra?.trim() || null;

  const { spol, strucnaSpremaIdx } = body ?? {};
  if (spol !== undefined) {
    if (spol === null || spol === "") {
      target.spol = null;
    } else if (spol === "M" || spol === "Z") {
      target.spol = spol;
    } else {
      return "Spol mora biti M ili Z";
    }
  }
  if (strucnaSpremaIdx !== undefined) {
    const n = strucnaSpremaIdx === null || strucnaSpremaIdx === "" ? null : Number(strucnaSpremaIdx);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 9)) {
      return "Stručna sprema mora biti 0–9";
    }
    target.strucnaSpremaIdx = n;
  }

  const { taxCoefficient, minuliRadRate } = body ?? {};
  if (taxCoefficient !== undefined) {
    if (taxCoefficient === null || taxCoefficient === "") {
      target.taxCoefficient = 1.0;
    } else {
      const n = Number(taxCoefficient);
      if (!Number.isFinite(n) || n < 0 || n > 10) {
        return "Porezni koeficijent mora biti broj između 0 i 10";
      }
      target.taxCoefficient = n;
    }
  }
  if (minuliRadRate !== undefined) {
    if (minuliRadRate === null || minuliRadRate === "") {
      target.minuliRadRate = 0.4;
    } else {
      const n = Number(minuliRadRate);
      if (!Number.isFinite(n) || n < 0 || n > 10) {
        return "Stopa minulog rada mora biti broj između 0 i 10";
      }
      target.minuliRadRate = n;
    }
  }

  // Polja za ukupan radni staž (za minuli rad). Vidi komentar u modelu.
  const { firstEmploymentDate, priorWorkYears } = body ?? {};
  if (firstEmploymentDate !== undefined) {
    target.firstEmploymentDate = firstEmploymentDate
      ? new Date(firstEmploymentDate)
      : null;
  }
  if (priorWorkYears !== undefined) {
    if (priorWorkYears === null || priorWorkYears === "") {
      target.priorWorkYears = null;
    } else {
      const n = Number(priorWorkYears);
      if (!Number.isFinite(n) || n < 0 || n > 60) {
        return "Staž prije naše firme mora biti broj između 0 i 60";
      }
      target.priorWorkYears = n;
    }
  }

  const { contractedHours } = body ?? {};
  if (contractedHours !== undefined) {
    if (contractedHours === null || contractedHours === "") {
      target.contractedHours = 8;
    } else {
      const n = Number(contractedHours);
      if (!Number.isInteger(n) || n < 1 || n > 8) {
        return "Ugovoreno radno vrijeme mora biti cijeli broj 1–8 sati";
      }
      target.contractedHours = n;
    }
  }

  const VALID_SALARY_TYPES = ["BRUTO", "NETO_UGOVOR", "NETO_ISPLATA"];
  const { salaryType } = body ?? {};
  if (salaryType !== undefined) {
    if (salaryType === null || salaryType === "") {
      target.salaryType = "NETO_ISPLATA";
    } else if (VALID_SALARY_TYPES.includes(salaryType)) {
      target.salaryType = salaryType;
    } else {
      return "Tip plate mora biti BRUTO, NETO_UGOVOR ili NETO_ISPLATA";
    }
  }

  const rateChecks = [
    ["overtimeRate", 25.0, "Stopa prekovremenog rada"],
    ["nightRate", 25.0, "Stopa noćnog rada"],
    ["sundayRate", 20.0, "Stopa rada nedjeljom"],
    ["holidayRate", 50.0, "Stopa rada na praznik"],
  ];
  for (const [key, def, label] of rateChecks) {
    const v = body?.[key];
    if (v === undefined) continue;
    if (v === null || v === "") {
      target[key] = def;
      continue;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 200) {
      return `${label} mora biti broj između 0 i 200`;
    }
    target[key] = n;
  }

  // Dnevna stopa toplog obroka (override organizacijske). Prazno = naslijedi
  // od firme.
  const { mealAllowancePerDay } = body ?? {};
  if (mealAllowancePerDay !== undefined) {
    if (mealAllowancePerDay === null || mealAllowancePerDay === "") {
      target.mealAllowancePerDay = null;
    } else {
      const n = Number(mealAllowancePerDay);
      if (!Number.isFinite(n) || n < 0) {
        return "Dnevna stopa toplog obroka mora biti pozitivan broj";
      }
      target.mealAllowancePerDay = n;
    }
  }

  // Fiksni mjesečni putni trošak (naknada za prevoz). Prazno = bez auto-popune.
  const { travelAllowancePerMonth } = body ?? {};
  if (travelAllowancePerMonth !== undefined) {
    if (travelAllowancePerMonth === null || travelAllowancePerMonth === "") {
      target.travelAllowancePerMonth = null;
    } else {
      const n = Number(travelAllowancePerMonth);
      if (!Number.isFinite(n) || n < 0) {
        return "Putni trošak mora biti pozitivan broj";
      }
      target.travelAllowancePerMonth = n;
    }
  }

  // Entitet prebivališta (FBIH/RS) + šifra opštine za RS radnika.
  const { prebivalisteEntitet, opcinaKod } = body ?? {};
  if (prebivalisteEntitet !== undefined) {
    target.prebivalisteEntitet = prebivalisteEntitet === "RS" ? "RS" : "FBIH";
    // FBiH radnik nema RS opštinu, počisti je da ne ostane zaostala
    if (target.prebivalisteEntitet === "FBIH") target.opcinaKod = null;
  }
  if (opcinaKod !== undefined) {
    const v = String(opcinaKod || "").trim();
    // postavlja se samo ako je (ili ostaje) RS radnik
    if (target.prebivalisteEntitet !== "FBIH") {
      target.opcinaKod = v || null;
    }
  }
  return null;
}

async function list(req, res) {
  const orgId = parseOrgId(req);
  if (!orgId) return res.status(400).json({ ok: false, error: "Invalid orgId" });

  const membership = await assertMembership(orgId, req.user.id);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const workers = await Worker.findAll({
    where: { organizationId: orgId },
    order: [["role", "ASC"], ["endDate", "ASC"], ["startDate", "DESC"]],
  });

  return res.json({ ok: true, data: workers.map(toPublicWorker) });
}

async function create(req, res) {
  const orgId = parseOrgId(req);
  if (!orgId) return res.status(400).json({ ok: false, error: "Invalid orgId" });

  const membership = await assertMembership(orgId, req.user.id, ["OWNER", "ADMIN"]);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  // Worker count limits follow the OWNER's plan, not the caller's.
  // A free MEMBER inside a BUSINESS owner's org enjoys BUSINESS limits (unlimited).
  // Faza 3: brojimo SAMO radnike s rolom RADNIK; VLASNIK (auto-kreiran) se ne broji.
  const ownerTier = req.orgOwnerTier ?? (await getOrgOwnerRole(orgId));
  const resolvedRoleForLimit = (req.body?.role ?? "RADNIK");
  if (resolvedRoleForLimit === "RADNIK") {
    if (ownerTier === "USER") {
      const count = await Worker.count({ where: { organizationId: orgId, role: "RADNIK" } });
      if (count >= USER_WORKERS_LIMIT) {
        return res.status(403).json({ ok: false, error: "WORKERS_LIMIT_REACHED" });
      }
    } else if (ownerTier === "PRO") {
      const count = await Worker.count({ where: { organizationId: orgId, role: "RADNIK" } });
      if (count >= PRO_WORKERS_LIMIT) {
        return res.status(403).json({ ok: false, error: "WORKERS_LIMIT_REACHED" });
      }
    }
  }

  const { firstName, lastName, jmbg, role, startDate, endDate, email, phone, address, city, idCardNumber, bankAccount } = req.body ?? {};
  const resolvedRole = role ?? "RADNIK";

  if (!VALID_ROLES.includes(resolvedRole))
    return res.status(400).json({ ok: false, error: "Uloga mora biti VLASNIK ili RADNIK" });
  if (!String(firstName ?? "").trim()) return res.status(400).json({ ok: false, error: "Ime je obavezno" });
  if (!String(lastName ?? "").trim()) return res.status(400).json({ ok: false, error: "Prezime je obavezno" });
  // Datum prijave (JS3100) ili startDate je obavezan za radnika. Forma više
  // ne pokazuje startDate, koristi se prijavaDate kao primary; startDate
  // ostaje za backward kompatibilnost.
  const { prijavaDate: bodyPrijavaDate } = req.body ?? {};
  if (resolvedRole === "RADNIK" && !startDate && !bodyPrijavaDate)
    return res
      .status(400)
      .json({ ok: false, error: "Datum prijave je obavezan za radnika" });
  if (startDate && endDate && new Date(endDate) <= new Date(startDate))
    return res.status(400).json({ ok: false, error: "Datum kraja mora biti nakon datuma početka" });

  let encryptedJmbg = null;
  if (jmbg?.trim()) {
    if (!/^\d{13}$/.test(jmbg.trim()))
      return res.status(400).json({ ok: false, error: "JMBG mora imati tačno 13 cifara" });
    encryptedJmbg = encryptJmbg(jmbg.trim());
  }

  const payload = {
    organizationId: orgId,
    role: resolvedRole,
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    jmbg: encryptedJmbg,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    address: address?.trim() || null,
    city: city?.trim() || null,
    idCardNumber: idCardNumber?.trim() ? idCardNumber.trim().slice(0, 9) : null,
    bankAccount: bankAccount?.trim() || null,
  };
  const empErr = pickEmploymentFields(req.body, payload);
  if (empErr) return res.status(400).json({ ok: false, error: empErr });

  // Ako klijent ne pošalje salaryType, naslijedi default iz organizacije
  // (knjigovođa može imati klijente sa različitim "stilom" — npr. svi radnici
  // na minimalcu = NETO_ISPLATA; drugi klijent ima ugovorne bruto plate).
  if (payload.salaryType == null) {
    const org = await Organization.findByPk(orgId, { attributes: ["defaultSalaryType"] });
    payload.salaryType = org?.defaultSalaryType || "NETO_ISPLATA";
  }

  try {
    const worker = await Worker.create(payload);
    return res.status(201).json({ ok: true, data: toPublicWorker(worker) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function update(req, res) {
  const orgId = parseOrgId(req);
  const workerId = parseWorkerId(req);
  if (!orgId || !workerId) return res.status(400).json({ ok: false, error: "Invalid id" });

  const membership = await assertMembership(orgId, req.user.id, ["OWNER", "ADMIN"]);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const existing = await Worker.findOne({ where: { id: workerId, organizationId: orgId } });
  if (!existing) return res.status(404).json({ ok: false, error: "Radnik nije pronađen" });

  const { firstName, lastName, jmbg, role, startDate, endDate, email, phone, address, city, idCardNumber, bankAccount } = req.body ?? {};
  const data = {};

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ ok: false, error: "Uloga mora biti VLASNIK ili RADNIK" });
    data.role = role;
  }
  if (firstName !== undefined) {
    if (!String(firstName).trim()) return res.status(400).json({ ok: false, error: "Ime je obavezno" });
    data.firstName = String(firstName).trim();
  }
  if (lastName !== undefined) {
    if (!String(lastName).trim()) return res.status(400).json({ ok: false, error: "Prezime je obavezno" });
    data.lastName = String(lastName).trim();
  }
  if (jmbg !== undefined) {
    if (jmbg === null || jmbg === "") {
      data.jmbg = null;
    } else {
      if (!/^\d{13}$/.test(String(jmbg).trim()))
        return res.status(400).json({ ok: false, error: "JMBG mora imati tačno 13 cifara" });
      data.jmbg = encryptJmbg(String(jmbg).trim());
    }
  }
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
  if (email !== undefined) data.email = email?.trim() || null;
  if (phone !== undefined) data.phone = phone?.trim() || null;
  if (address !== undefined) data.address = address?.trim() || null;
  if (city !== undefined) data.city = city?.trim() || null;
  if (idCardNumber !== undefined)
    data.idCardNumber = idCardNumber?.trim() ? idCardNumber.trim().slice(0, 9) : null;
  if (bankAccount !== undefined)
    data.bankAccount = bankAccount?.trim() || null;

  const { defaultStartTime, defaultEndTime, defaultDaysOff, defaultPause } = req.body ?? {};
  if (defaultStartTime !== undefined)
    data.defaultStartTime = defaultStartTime?.trim() || null;
  if (defaultEndTime !== undefined)
    data.defaultEndTime = defaultEndTime?.trim() || null;
  if (defaultDaysOff !== undefined)
    data.defaultDaysOff = defaultDaysOff?.trim() || null;
  if (defaultPause !== undefined)
    data.defaultPause = defaultPause?.trim() || null;

  const empErr = pickEmploymentFields(req.body, data);
  if (empErr) return res.status(400).json({ ok: false, error: empErr });

  const finalStart = data.startDate !== undefined ? data.startDate : existing.startDate;
  const finalEnd = data.endDate !== undefined ? data.endDate : existing.endDate;
  if (finalStart && finalEnd && finalEnd <= finalStart)
    return res.status(400).json({ ok: false, error: "Datum kraja mora biti nakon datuma početka" });

  if (Object.keys(data).length === 0)
    return res.status(400).json({ ok: false, error: "Nema polja za ažuriranje" });

  try {
    await Worker.update(data, { where: { id: workerId } });
    const updated = await Worker.findOne({ where: { id: workerId } });
    // Ako je ovo VLASNIK korisnikove VLASTITE djelatnosti, mirror identitet nazad
    // na profil i ostale vlastite djelatnosti (best-effort).
    try {
      const ownerUserId = await ownerIdentitySync.ownerUserIdForWorker(orgId, existing);
      if (ownerUserId) {
        await ownerIdentitySync.syncFromOwnerWorker(ownerUserId, workerId, data);
      }
    } catch (syncErr) {
      console.error("ownerIdentitySync.syncFromOwnerWorker:", syncErr?.message || syncErr);
    }
    return res.json({ ok: true, data: toPublicWorker(updated) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function remove(req, res) {
  const orgId = parseOrgId(req);
  const workerId = parseWorkerId(req);
  if (!orgId || !workerId) return res.status(400).json({ ok: false, error: "Invalid id" });

  const membership = await assertMembership(orgId, req.user.id, ["OWNER", "ADMIN"]);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const existing = await Worker.findOne({ where: { id: workerId, organizationId: orgId } });
  if (!existing) return res.status(404).json({ ok: false, error: "Radnik nije pronađen" });

  // Vlasnik se ne briše: organizacija ne može funkcionisati bez vlasnika
  // (obrt po definiciji, a i kod d.o.o. se vlasnik/potpisnik izvodi iz ovog
  // zapisa). Promjena vlasnika ide kroz postavke organizacije, ne brisanjem.
  if (existing.role === "VLASNIK") {
    return res.status(409).json({ ok: false, error: "VLASNIK_SE_NE_BRISE" });
  }

  // Radnik označen kao direktor/potpisnik d.o.o.-a se ne briše dok mu se
  // ne dodijeli zamjena (inače ugovori i dokumenti ostaju bez potpisnika).
  const { Organization } = require("../models/index");
  const org = await Organization.findByPk(orgId, {
    attributes: ["id", "directorWorkerId"],
  });
  if (org && Number(org.directorWorkerId) === Number(workerId)) {
    return res.status(409).json({ ok: false, error: "DIREKTOR_SE_NE_BRISE" });
  }

  // Radnik sa obračunima plata se NE briše: obračuni moraju ostati (GIP i
  // ostali godišnji izvještaji hvataju i radnike odjavljene/otišle u toku
  // godine). Takvog radnika treba odjaviti, ne brisati. Brisanje je dozvoljeno
  // samo za radnike bez ijednog obračuna (npr. greškom uneseni).
  const { Payroll } = require("../models/index");
  if (Payroll) {
    const payrollCount = await Payroll.count({ where: { workerId } });
    if (payrollCount > 0) {
      return res.status(409).json({ ok: false, error: "RADNIK_IMA_OBRACUNE" });
    }
  }
  await Worker.destroy({ where: { id: workerId } });
  return res.json({ ok: true });
}

async function listAllForUser(req, res) {
  const memberships = await OrganizationMember.findAll({
    where: { userId: req.user.id },
    include: [
      {
        model: require("../models/index").Organization,
        as: "organization",
        attributes: ["id", "name"],
        include: [{ model: Worker, as: "workers" }],
      },
    ],
  });

  const data = memberships.flatMap((m) => {
    const org = m.organization;
    if (!org) return [];
    return (org.workers || []).map((w) => ({
      ...toPublicWorker(w),
      organizationId: org.id,
      organizationName: org.name,
    }));
  });

  return res.json({ ok: true, data });
}

/* ── Contract counter (broj ugovora o radu) ───────────────────────────────── */

function parseYear(req) {
  const y = Number(req.query.year ?? req.body?.year ?? new Date().getFullYear());
  return Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : new Date().getFullYear();
}

// GET — vraća sljedeći broj BEZ inkrementiranja (za prikaz u UI).
async function peekContractNumber(req, res) {
  const orgId = parseOrgId(req);
  if (!orgId) return res.status(400).json({ ok: false, error: "Invalid orgId" });

  const membership = await assertMembership(orgId, req.user.id);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const year = parseYear(req);
  const existing = await ContractCounter.findOne({
    where: { organizationId: orgId, year },
  });
  const next = (existing?.lastNumber ?? 0) + 1;
  return res.json({ ok: true, data: { number: `${next}/${year}`, year, next } });
}

// POST — inkrementira i vraća novi broj (zovati pri downloadu).
async function takeContractNumber(req, res) {
  const orgId = parseOrgId(req);
  if (!orgId) return res.status(400).json({ ok: false, error: "Invalid orgId" });

  const membership = await assertMembership(orgId, req.user.id);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const year = parseYear(req);

  try {
    const result = await sequelize.transaction(async (t) => {
      const [row] = await ContractCounter.findOrCreate({
        where: { organizationId: orgId, year },
        defaults: { organizationId: orgId, year, lastNumber: 0 },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      row.lastNumber = Number(row.lastNumber) + 1;
      await row.save({ transaction: t });
      return row.lastNumber;
    });
    return res.json({ ok: true, data: { number: `${result}/${year}`, year, next: result } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

// ── GET /:orgId/workers/:workerId/evidencija ────────────────────────────────
// Matična evidencija: 24 stavke (resolved) + editabilna polja (sa defaultima).
async function getEvidencija(req, res) {
  const orgId = parseOrgId(req);
  const workerId = parseWorkerId(req);
  if (!orgId || !workerId)
    return res.status(400).json({ ok: false, error: "Invalid id" });
  const membership = await assertMembership(orgId, req.user.id, [
    "OWNER",
    "ADMIN",
    "MEMBER",
  ]);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const existing = await Worker.findOne({
    where: { id: workerId, organizationId: orgId },
  });
  if (!existing)
    return res.status(404).json({ ok: false, error: "Radnik nije pronađen" });
  const org = await Organization.findByPk(orgId);
  const w = toPublicWorker(existing);

  return res.json({
    ok: true,
    data: {
      workerId,
      workerName: `${w.firstName || ""} ${w.lastName || ""}`.trim(),
      items: resolveEvidencija(w, org),
      editable: editableList(w, org),
      zadnjaIzmjena: existing.updatedAt
        ? new Date(existing.updatedAt).toISOString().slice(0, 10)
        : null,
    },
  });
}

// ── PATCH /:orgId/workers/:workerId/evidencija ──────────────────────────────
// Snima dodatne podatke evidencije (worker.evidencijaPodaci). Ne dira ostala
// polja radnika.
async function saveEvidencija(req, res) {
  const orgId = parseOrgId(req);
  const workerId = parseWorkerId(req);
  if (!orgId || !workerId)
    return res.status(400).json({ ok: false, error: "Invalid id" });
  const membership = await assertMembership(orgId, req.user.id, [
    "OWNER",
    "ADMIN",
  ]);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const existing = await Worker.findOne({
    where: { id: workerId, organizationId: orgId },
  });
  if (!existing)
    return res.status(404).json({ ok: false, error: "Radnik nije pronađen" });

  const incoming = req.body?.evidencijaPodaci;
  if (incoming == null || typeof incoming !== "object")
    return res.status(400).json({ ok: false, error: "INVALID_PAYLOAD" });

  const validKeys = new Set(EDITABLE_FIELDS.map((f) => f.key));
  const clean = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (!validKeys.has(k)) continue;
    const s = v == null ? "" : String(v).trim();
    if (s) clean[k] = s;
  }
  await Worker.update(
    { evidencijaPodaci: clean },
    { where: { id: workerId, organizationId: orgId } },
  );
  return res.json({ ok: true, data: { evidencijaPodaci: clean } });
}

// ── GET /:orgId/workers/:workerId/evidencija-pdf ────────────────────────────
async function generateEvidencija(req, res) {
  const orgId = parseOrgId(req);
  const workerId = parseWorkerId(req);
  if (!orgId || !workerId)
    return res.status(400).json({ ok: false, error: "Invalid id" });
  const membership = await assertMembership(orgId, req.user.id, [
    "OWNER",
    "ADMIN",
    "MEMBER",
  ]);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const existing = await Worker.findOne({
    where: { id: workerId, organizationId: orgId },
  });
  if (!existing)
    return res.status(404).json({ ok: false, error: "Radnik nije pronađen" });
  const org = await Organization.findByPk(orgId);
  const w = toPublicWorker(existing);
  const items = resolveEvidencija(w, org);

  const todayIso = new Date().toISOString().slice(0, 10);
  const pdf = await generateEvidencijaPdf(items, {
    orgName: org?.name || "",
    orgAddress: [org?.address, org?.city].filter(Boolean).join(", "),
    orgTaxNumber: org?.taxNumber || "",
    datumIzrade: todayIso,
    zadnjaIzmjena: existing.updatedAt
      ? new Date(existing.updatedAt).toISOString().slice(0, 10)
      : null,
  });

  const safeName = `${w.firstName || ""}_${w.lastName || ""}`
    .trim()
    .replace(/\s+/g, "_");
  const fileName = `Maticna_evidencija_${safeName || workerId}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  return res.send(pdf);
}

module.exports = {
  list,
  listAllForUser,
  create,
  update,
  remove,
  peekContractNumber,
  takeContractNumber,
  getEvidencija,
  saveEvidencija,
  generateEvidencija,
};
