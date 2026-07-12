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
  // Eksplicitno imenovani org param ima prednost nad generičkim ":id". Na
  // dvoparametarskim rutama (npr. /:orgId/stanje/:id) ":id" je id podresursa,
  // NE organizacije: kad bi se uzeo prvi, autorizacija bi se radila na pogrešnom
  // id-u (feature bi pukao za ne-admin korisnike, a poklapanje id-a bi omogućilo
  // cross-tenant pristup). Na jednoparametarskim /:id rutama ":id" je i dalje org.
  const candidates = [req.params?.orgId, req.params?.organizationId, req.params?.id];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isInteger(n) && n > 0) return n;
  }
  // Fallback za rute bez org u putanji (org stiže u body/query, npr.
  // /amortizacija). Params uvijek imaju prednost, pa ovo ne dira postojeće rute.
  const bodyQuery = [
    req.body?.organizationId,
    req.body?.orgId,
    req.query?.organizationId,
    req.query?.orgId,
  ];
  for (const c of bodyQuery) {
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

/**
 * PK Office gate po obrtu (samo kad je PK_OFFICE_NAPLATA uključena):
 *  - obrt (BUSINESS) mora biti AKTIVIRAN u PK Office (pkOfficeEnabled slot),
 *  - korisnik mora imati office pristup: vlastita pretplata/trial, ili
 *    naslijeđen kroz TAJ obrt (član obrta office pretplatnika).
 * Primjenjuje se na čisto PK Office module (kalkulacije, lager, blagajna,
 * putni nalozi, prebijanja, PDV, izvodi), POSLIJE requireAuth/requireOrgRole.
 * Sa isključenom naplatom je no-op, sve radi kao prije.
 */
function requireOfficeOrg() {
  return async (req, res, next) => {
    try {
      if (process.env.PK_OFFICE_NAPLATA !== "true") return next();
      if (!req.user) {
        return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
      }
      if (req.user.role === "ADMIN") return next();

      const orgId = pickOrgIdFromReq(req);
      if (!orgId) {
        return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
      }
      // lazy require: izbjegni require-cikluse pri učitavanju modula
      const { Organization } = require("../models/index");
      const org = await Organization.findByPk(orgId, {
        attributes: ["id", "type", "pkOfficeEnabled"],
      });
      if (!org) {
        return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });
      }
      if (org.type === "BUSINESS" && !org.pkOfficeEnabled) {
        return res
          .status(403)
          .json({ ok: false, error: "ORG_NIJE_U_PK_OFFICE" });
      }
      const {
        getOfficeAccess,
      } = require("../controllers/pkOfficeGateController");
      const access = await getOfficeAccess(req.user.id);
      if (!access.enforced) return next();
      if (!access.hasOffice) {
        return res
          .status(403)
          .json({ ok: false, error: "NEMA_OFFICE_PRISTUPA" });
      }
      if (
        access.scope === "naslijedjen" &&
        !(access.nasljedjeneOrgIds || []).includes(orgId)
      ) {
        return res
          .status(403)
          .json({ ok: false, error: "NEMA_OFFICE_PRISTUPA" });
      }
      return next();
    } catch (err) {
      console.error("requireOfficeOrg error:", err);
      return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  };
}

// Postavi req.user ako validan token postoji; NE odbija ako ga nema.
// Koristi se za rute koje rade i za anonimne (npr. tracking aktivnosti).
function optionalAuth(req, _res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (token) {
      const payload = jwt.verify(token, getJwtSecret());
      const userId = Number(payload.sub);
      if (Number.isInteger(userId) && userId > 0) {
        req.user = {
          id: userId,
          role: typeof payload.role === "string" ? payload.role : undefined,
        };
      }
    }
  } catch {
    // nevažeći token → tretiraj kao anonimnog
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requireOrgRole,
  requireOwnerTier,
  requireOfficeOrg,
};
