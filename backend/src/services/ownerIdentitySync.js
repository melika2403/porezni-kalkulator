// Dvosmjerna sinhronizacija "identiteta vlasnika" izmedju User profila i
// VLASNIK Worker zapisa korisnikovih VLASTITIH (ne-klijentskih) djelatnosti.
//
// Zasto: za vlastitu djelatnost vlasnik-Worker se seeduje iz profila u trenutku
// kreiranja (snapshot). Bez ovoga, naknadna izmjena na jednom mjestu ne bi se
// odrazila na drugo, pa bi obrasci (2002/GIP/MIP) i uplatnice bili nepotpuni ili
// neuskladjeni. Klijentske org su iskljucene (tamo je VLASNIK = klijent, ne user).
const { Op } = require("sequelize");
const {
  User,
  Organization,
  OrganizationMember,
  Worker,
} = require("../models/index");
const { decryptJmbg } = require("../utils/encryptJmbg");

// Polja koja predstavljaju identitet vlasnika. email se NAMJERNO izostavlja jer
// je to login identitet korisnika (mijenjanje bi diralo prijavu/jedinstvenost).
const SHARED_FIELDS = [
  "firstName",
  "lastName",
  "jmbg",
  "address",
  "city",
  "phone",
  "idCardNumber",
];

// Spol vlasnika iz (vec kriptiranog) JMBG-a, da ga payroll prepozna kao radnika.
function spolFromEncryptedJmbg(enc) {
  if (!enc) return null;
  try {
    const j = String(decryptJmbg(enc) || "").replace(/\D/g, "");
    if (j.length >= 12) {
      const nnn = parseInt(j.slice(9, 12), 10);
      if (Number.isFinite(nnn)) return nnn >= 500 ? "Z" : "M";
    }
  } catch {
    return null;
  }
  return null;
}

// Izvuci shared polja koja su prisutna I NEPRAZNA. Namjerno NE propagiramo
// prazne/null vrijednosti: cilj je popuniti/uskladiti, a ne da brisanje na
// jednom mjestu slucajno pobrise vec upisan podatak na drugom (pravi podaci).
function pickShared(data) {
  const out = {};
  for (const f of SHARED_FIELDS) {
    const v = data[f];
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[f] = v;
  }
  return out;
}

// Worker varijanta: dodatno postavi spol kad se mijenja jmbg.
function toWorkerData(shared) {
  const out = { ...shared };
  if (out.jmbg !== undefined) out.spol = spolFromEncryptedJmbg(out.jmbg);
  return out;
}

// VLASNIK Worker ID-evi u svim VLASTITIM (ne-klijentskim) orgovima korisnika.
async function ownOwnerWorkerIds(userId, { excludeWorkerId = null } = {}) {
  const memberships = await OrganizationMember.findAll({
    where: { userId, role: "OWNER" },
    include: [
      {
        model: Organization,
        as: "organization",
        where: { isClientOrg: false },
        attributes: ["id"],
      },
    ],
  });
  const orgIds = memberships.map((m) => m.organization?.id).filter(Boolean);
  if (!orgIds.length) return [];
  const workers = await Worker.findAll({
    where: { organizationId: { [Op.in]: orgIds }, role: "VLASNIK" },
    attributes: ["id"],
  });
  return workers.map((w) => w.id).filter((id) => id !== excludeWorkerId);
}

// Vrati userId vlasnika (OWNER) ako je dati worker VLASNIK VLASTITE org; inace null.
// Koristi se kao okidac iz workersController (radi i kad edituje admin).
async function ownerUserIdForWorker(orgId, worker) {
  if (!worker || worker.role !== "VLASNIK") return null;
  const org = await Organization.findOne({
    where: { id: orgId },
    attributes: ["id", "isClientOrg"],
  });
  if (!org || org.isClientOrg) return null;
  const membership = await OrganizationMember.findOne({
    where: { organizationId: orgId, role: "OWNER" },
    attributes: ["userId"],
  });
  return membership?.userId ?? null;
}

// Profil (User) je promijenjen -> upisi shared polja na sve vlastite VLASNIK workere.
async function syncFromUser(userId, changedData) {
  const shared = pickShared(changedData);
  if (Object.keys(shared).length === 0) return;
  const ids = await ownOwnerWorkerIds(userId);
  if (!ids.length) return;
  await Worker.update(toWorkerData(shared), { where: { id: { [Op.in]: ids } } });
}

// VLASNIK worker vlastite org je promijenjen -> upisi na User + ostale vlastite
// VLASNIK workere (isti covjek u vise vlastitih djelatnosti).
async function syncFromOwnerWorker(ownerUserId, sourceWorkerId, changedData) {
  const shared = pickShared(changedData);
  if (Object.keys(shared).length === 0) return;
  await User.update(shared, { where: { id: ownerUserId } });
  const ids = await ownOwnerWorkerIds(ownerUserId, {
    excludeWorkerId: sourceWorkerId,
  });
  if (ids.length) {
    await Worker.update(toWorkerData(shared), {
      where: { id: { [Op.in]: ids } },
    });
  }
}

module.exports = {
  SHARED_FIELDS,
  syncFromUser,
  syncFromOwnerWorker,
  ownerUserIdForWorker,
};
