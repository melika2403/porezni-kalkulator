const { OrganizationMember, User } = require("../models/index");

const TIER_RANK = { USER: 0, PRO: 1, BUSINESS: 2, ADMIN: 3 };

async function getOrgOwnerRole(organizationId) {
  const ownerMembership = await OrganizationMember.findOne({
    where: { organizationId, role: "OWNER" },
    include: [{ model: User, as: "user", attributes: ["role"] }],
  });
  return ownerMembership?.user?.role ?? null;
}

function tierAtLeast(actualTier, minimumTier) {
  const a = TIER_RANK[actualTier];
  const m = TIER_RANK[minimumTier];
  if (a == null || m == null) return false;
  return a >= m;
}

module.exports = { getOrgOwnerRole, tierAtLeast, TIER_RANK };
