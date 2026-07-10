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
 * Efektivna rola za marketing funkcije: users.role, s tim da aktivan PK
 * Office paket/trial diže USER/PRO na BUSINESS. Rola u bazi se NE mijenja,
 * office pristup je činjenica pretplate, ne role.
 */
async function getEffectiveRole(userLike) {
  const role = userLike?.role ?? null;
  if (role === "ADMIN" || role === "BUSINESS") return role;
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

module.exports = {
  getOrgOwnerRole,
  getEffectiveRole,
  officeUserIds,
  tierAtLeast,
  TIER_RANK,
};
