const jwt = require("jsonwebtoken");

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

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
