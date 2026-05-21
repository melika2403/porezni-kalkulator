const jwt = require("jsonwebtoken");
const { OrganizationMember } = require("../models/index");
const { getOrgOwnerRole } = require("../services/tierService");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment");
  }
  return secret;
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const cookieToken = req.cookies?.access_token;
  if (typeof cookieToken === "string" && cookieToken) return cookieToken;

  return null;
}

function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    }

    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret);

    const userId = Number(payload.sub);
    const role = typeof payload.role === "string" ? payload.role : undefined;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ ok: false, error: "INVALID_TOKEN" });
    }

    req.user = { id: userId, role };
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "INVALID_TOKEN" });
  }
}

function requireRole(...requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    }

    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    next();
  };
}

function pickOrgIdFromReq(req) {
  const candidates = [req.params?.id, req.params?.orgId, req.params?.organizationId];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

function requireOrgRole(...allowedOrgRoles) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    if (req.user.role === "ADMIN") return next();

    const orgId = pickOrgIdFromReq(req);
    if (!orgId) return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });

    const membership = await OrganizationMember.findOne({
      where: { organizationId: orgId, userId: req.user.id },
    });
    if (!membership || !allowedOrgRoles.includes(membership.role)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    req.orgMembership = membership;
    next();
  };
}

function requireOwnerTier(...allowedTiers) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    if (req.user.role === "ADMIN") return next();

    const orgId = pickOrgIdFromReq(req);
    if (!orgId) return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });

    const ownerRole = await getOrgOwnerRole(orgId);
    if (!ownerRole) return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });

    if (!allowedTiers.includes(ownerRole)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_OWNER_TIER" });
    }

    req.orgOwnerTier = ownerRole;
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requireOrgRole,
  requireOwnerTier,
};
