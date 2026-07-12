const jwt = require("jsonwebtoken");
const { OrganizationMember, User } = require("../models/index");
const {
  getOrgOwnerRole,
  hasAccessibleTier,
} = require("../services/tierService");

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

async function requireAuth(req, res, next) {
  let userId;
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    }

    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret);

    userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ ok: false, error: "INVALID_TOKEN" });
    }
  } catch {
    return res.status(401).json({ ok: false, error: "INVALID_TOKEN" });
  }

  // Rola se čita iz BAZE, ne iz token payloada: token je samo dokaz
  // identiteta (sub). Remember-me token traje godinama, pa bi rola iz
  // tokena nadživjela demote/downgrade/brisanje korisnika; ovako promjena
  // role važi odmah na svim rutama. DB greška je 500, ne 401: ne odjavljuj
  // korisnika zbog prolaznog problema sa bazom.
  try {
    const user = await User.findByPk(userId, { attributes: ["id", "role"] });
    if (!user) {
      return res.status(401).json({ ok: false, error: "INVALID_TOKEN" });
    }
    req.user = { id: userId, role: user.role };
    next();
  } catch (err) {
    console.error("requireAuth role lookup error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
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
      // PK Office radi samo sa obrtima (BUSINESS): d.o.o. (COMPANY) se ne
      // nudi u switcheru, a bez ovog odbijanja bi se kroz direktne API
      // pozive office moduli koristili na COMPANY organizacijama BEZ
      // trošenja slota (paketi se naplaćuju po broju obrta).
      if (org.type !== "BUSINESS") {
        return res.status(403).json({ ok: false, error: "ORG_NIJE_OBRT" });
      }
      if (!org.pkOfficeEnabled) {
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
      // Limit paketa se provjerava na VLASNIKU obrta (obrt troši vlasnikov
      // slot, ne pozivaočev): kad paket postane manji od broja aktivnih
      // obrta (downgrade, istek triala pa manji paket), moduli su blokirani
      // dok vlasnik ne deaktivira višak obrta. Blokiraju se SVI obrti, ne
      // implicitno izabranih prvih N: izbor koje obrte zadržati je svjesna
      // odluka vlasnika (ekran prekoračenja u PK Office).
      const ownerMembership = await OrganizationMember.findOne({
        where: { organizationId: orgId, role: "OWNER" },
        attributes: ["userId"],
        raw: true,
      });
      const ownerId = ownerMembership?.userId;
      const ownerAccess =
        !ownerId || ownerId === req.user.id
          ? access
          : await getOfficeAccess(ownerId);
      if (ownerAccess.prekoLimita) {
        return res
          .status(403)
          .json({ ok: false, error: "PREKO_LIMITA_PAKETA" });
      }
      return next();
    } catch (err) {
      console.error("requireOfficeOrg error:", err);
      return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  };
}

/**
 * Plan gate za DIJELJENE module (plate, fakture, partneri): akcije koje
 * kreiraju/mijenjaju/generišu traže da korisnik dostiže nivo IGDJE, kroz
 * vlastitu efektivnu rolu (office paket diže na BUSINESS) ili kroz vlasnika
 * bilo koje organizacije čiji je član. Ogledalo frontend useMaxAccessibleTier
 * gate-a: blokira samo ono što ni UI ne nudi (korisnike bez plana igdje).
 * ČITANJE se ne gate-uje: poslije isteka plana podaci ostaju read-only.
 * Org-specifična provjera (rute sa :orgId) i dalje ide kroz requireOwnerTier.
 */
function requirePlanTier(minimumTier) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
      }
      if (req.user.role === "ADMIN") return next();
      const ok = await hasAccessibleTier(req.user.id, minimumTier);
      if (!ok) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN_PLAN" });
      }
      return next();
    } catch (err) {
      console.error("requirePlanTier error:", err);
      return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  };
}

// Postavi req.user ako validan token postoji; NE odbija ako ga nema.
// Koristi se za rute koje rade i za anonimne (npr. tracking aktivnosti).
// Rola iz baze kao i kod requireAuth; nepostojeći korisnik ili DB greška
// → tretiraj kao anonimnog.
async function optionalAuth(req, _res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (token) {
      const payload = jwt.verify(token, getJwtSecret());
      const userId = Number(payload.sub);
      if (Number.isInteger(userId) && userId > 0) {
        const user = await User.findByPk(userId, {
          attributes: ["id", "role"],
        });
        if (user) req.user = { id: userId, role: user.role };
      }
    }
  } catch {
    // nevažeći token / greška → tretiraj kao anonimnog
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
  requirePlanTier,
};
