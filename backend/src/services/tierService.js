const { Op } = require("sequelize");
const { OrganizationMember, User, Subscription } = require("../models/index");

const TIER_RANK = { USER: 0, PRO: 1, BUSINESS: 2, ADMIN: 3 };

/**
 * Batch: koji od datih korisnika imaju aktivan PK Office paket (subscriptions
 * plan office_*) ili aktivan office trial (users.pkOfficeTrialEndsAt).
 * Office paket za marketing funkcije znači BUSINESS nivo (dogovoreno pravilo:
 * Tim i veći = kompletan Business; Start = Business za svoja 2 obrta, a
 * ograda mu je limit kreiranja organizacija, ne per-feature provjere).
 */
async function officeUserIds(userIds) {
  const ids = [...new Set(userIds)].filter(
    (id) => Number.isInteger(id) && id > 0,
  );
  if (ids.length === 0) return new Set();

  const danas = new Date();
  danas.setHours(0, 0, 0, 0);
  const subs = await Subscription.findAll({
    where: {
      userId: { [Op.in]: ids },
      isActive: true,
      plan: { [Op.like]: "office%" },
    },
    attributes: ["userId", "endDate"],
    raw: true,
  });
  const ok = new Set();
  for (const s of subs) {
    if (!s.endDate || new Date(s.endDate) >= danas) ok.add(s.userId);
  }

  const bezPaketa = ids.filter((id) => !ok.has(id));
  if (bezPaketa.length > 0) {
    const trialUsers = await User.findAll({
      where: {
        id: { [Op.in]: bezPaketa },
        pkOfficeTrialEndsAt: { [Op.gte]: new Date() },
      },
      attributes: ["id"],
      raw: true,
    });
    for (const u of trialUsers) ok.add(u.id);
  }
  return ok;
}

/**
 * Rola korisnika NAKON provjere isteka pretplate (lijeni istek, isto pravilo
 * kao na /me, ali na svakom mjestu koje odlučuje o pristupu): PRO/BUSINESS
 * čija je AKTIVNA pretplata prošla endDate se gasi (isActive=false) i rola
 * se spušta na USER, pa izbjegavanje /me ne čuva stara prava kroz direktne
 * API pozive. Rola bez pretplate (ručna dodjela) ili sa već ugašenom
 * pretplatom se NE dira, identično ponašanju /me.
 */
async function freshRole(userLike) {
  const role = userLike?.role ?? null;
  if (role !== "PRO" && role !== "BUSINESS") return role;
  const id = userLike?.id;
  if (!id) return role;
  const sub = await Subscription.findOne({ where: { userId: id } });
  if (!sub || !sub.isActive || !sub.endDate) return role;
  const end = new Date(sub.endDate);
  end.setHours(23, 59, 59, 999);
  if (end.getTime() >= Date.now()) return role;
  await Subscription.update({ isActive: false }, { where: { userId: id } });
  await User.update({ role: "USER" }, { where: { id } });
  return "USER";
}

/**
 * Efektivna rola za marketing funkcije: users.role (nakon provjere isteka
 * pretplate), s tim da aktivan PK Office paket/trial diže USER/PRO na
 * BUSINESS. Rola u bazi se NE mijenja zbog office paketa, office pristup je
 * činjenica pretplate, ne role.
 */
async function getEffectiveRole(userLike) {
  let role = userLike?.role ?? null;
  if (role === "ADMIN") return role;
  role = await freshRole(userLike);
  if (role === "BUSINESS") return role;
  const id = userLike?.id;
  if (!id) return role;
  const office = await officeUserIds([id]);
  return office.has(id) ? "BUSINESS" : role;
}

/**
 * Tier organizacije = EFEKTIVNA rola njenog vlasnika (office paket vlasnika
 * podiže org na BUSINESS, pa članovi nasljeđuju kroz requireOwnerTier /
 * effectiveTier isto kao i do sada kod PRO/BUSINESS vlasnika).
 */
async function getOrgOwnerRole(organizationId) {
  const ownerMembership = await OrganizationMember.findOne({
    where: { organizationId, role: "OWNER" },
    include: [{ model: User, as: "user", attributes: ["id", "role"] }],
  });
  const owner = ownerMembership?.user;
  if (!owner) return null;
  return getEffectiveRole(owner);
}

function tierAtLeast(actualTier, minimumTier) {
  const a = TIER_RANK[actualTier];
  const m = TIER_RANK[minimumTier];
  if (a == null || m == null) return false;
  return a >= m;
}

/**
 * Da li korisnik dostiže traženi plan nivo IGDJE: vlastita efektivna rola,
 * ili efektivna rola VLASNIKA bilo koje organizacije u kojoj je član (npr.
 * free knjigovođa u obrtu BUSINESS/office vlasnika). Server-side ekvivalent
 * frontend useMaxAccessibleTier (page-level gate): backend guard dijeljenih
 * modula (plate, fakture, partneri) propušta tačno ono što i UI nudi.
 */
async function hasAccessibleTier(userId, minimumTier) {
  const user = await User.findByPk(userId, { attributes: ["id", "role"] });
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const own = await getEffectiveRole(user);
  if (tierAtLeast(own, minimumTier)) return true;

  const memberships = await OrganizationMember.findAll({
    where: { userId },
    attributes: ["organizationId"],
    raw: true,
  });
  const orgIds = memberships.map((m) => m.organizationId);
  if (orgIds.length === 0) return false;

  const owners = await OrganizationMember.findAll({
    where: {
      organizationId: { [Op.in]: orgIds },
      role: "OWNER",
      userId: { [Op.ne]: userId },
    },
    include: [{ model: User, as: "user", attributes: ["id", "role"] }],
  });
  const ownerUsers = owners.map((o) => o.user).filter(Boolean);
  // Istekle pretplate vlasnika: AKTIVNA pretplata sa prošlim endDate znači
  // da PRO/BUSINESS rola vlasnika više ne važi za nasljeđivanje. Batch,
  // bez upisa: degradaciju u bazi upisuje freshRole kad se sam vlasnik
  // negdje provjeri, tuđi zahtjev ne treba pisati po drugim korisnicima.
  const placeniIds = ownerUsers
    .filter((o) => o.role === "PRO" || o.role === "BUSINESS")
    .map((o) => o.id);
  const istekli = new Set();
  if (placeniIds.length > 0) {
    const subs = await Subscription.findAll({
      where: { userId: { [Op.in]: placeniIds }, isActive: true },
      attributes: ["userId", "endDate"],
      raw: true,
    });
    const sad = Date.now();
    for (const s of subs) {
      if (!s.endDate) continue;
      const end = new Date(s.endDate);
      end.setHours(23, 59, 59, 999);
      if (end.getTime() < sad) istekli.add(s.userId);
    }
  }
  for (const o of ownerUsers) {
    if (istekli.has(o.id)) continue;
    // vlasnik ADMIN se za tier organizacije računa kao BUSINESS
    const rola = o.role === "ADMIN" ? "BUSINESS" : o.role;
    if (tierAtLeast(rola, minimumTier)) return true;
  }
  // office paket/trial vlasnika diže njegov nivo na BUSINESS
  const kandidati = ownerUsers.filter(
    (o) => o.role === "USER" || o.role === "PRO",
  );
  if (kandidati.length === 0) return false;
  const office = await officeUserIds(kandidati.map((o) => o.id));
  return kandidati.some((o) => office.has(o.id));
}

module.exports = {
  getOrgOwnerRole,
  getEffectiveRole,
  freshRole,
  officeUserIds,
  tierAtLeast,
  hasAccessibleTier,
  TIER_RANK,
};
