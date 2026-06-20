const { Organization, OrganizationMember } = require("../models/index");

// Mora se koristiti POSLIJE requireAuth.
// Čita X-Organization-Id header, provjerava membership, attach-uje
// req.organization i req.membership.
async function requireOrganization(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  }

  const headerValue = req.headers["x-organization-id"];
  const orgId = Number(headerValue);
  if (!Number.isInteger(orgId) || orgId <= 0) {
    return res
      .status(400)
      .json({ ok: false, error: "MISSING_ORGANIZATION_ID" });
  }

  try {
    const membership = await OrganizationMember.findOne({
      where: { userId: req.user.id, organizationId: orgId },
      include: [{ model: Organization, as: "organization" }],
    });

    if (!membership) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_ORGANIZATION" });
    }

    req.membership = membership;
    req.organization = membership.organization;
    next();
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "ORG_LOOKUP_FAILED" });
  }
}

module.exports = { requireOrganization };
