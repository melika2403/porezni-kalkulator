const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { decryptJmbg } = require("../utils/encryptJmbg");
const { sendPasswordResetEmail } = require("../utils/mailer");

const prisma = require("../prisma");
const googleAuth = require("../auth/googleAuth");

const GOOGLE_STATE_COOKIE = "g_oauth_state";
const REMEMBER_ME_DURATION_MS = 1000 * 60 * 60 * 24 * 365 * 10; // 10 years
const REMEMBER_ME_JWT_EXPIRES = "87600h"; // 10 years
const DEFAULT_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment");
  }
  return secret;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || "7d";
}

function setAuthCookie(res, token, rememberMe = false) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: rememberMe ? REMEMBER_ME_DURATION_MS : DEFAULT_COOKIE_MAX_AGE,
  });
}

function clearAuthCookie(res) {
  res.clearCookie("access_token", {
    path: "/",
  });
}

function publicUserSelect() {
  return {
    id: true,
    email: true,
    jmbg: true,
    firstName: true,
    lastName: true,
    phone: true,
    address: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  };
}

function toPublicUser(user) {
  if (!user) return null;
  const { jmbg, ...rest } = user;
  return { ...rest, jmbg: jmbg ? decryptJmbg(jmbg) : null };
}

async function register(req, res) {
  const { email, password, firstName, lastName, phone, address } =
    req.body ?? {};

  if (!isNonEmptyString(email)) {
    return res.status(400).json({ ok: false, error: "email is required" });
  }
  if (!isNonEmptyString(password) || password.trim().length < 6) {
    return res
      .status(400)
      .json({ ok: false, error: "password must be at least 6 characters" });
  }
  if (!isNonEmptyString(firstName)) {
    return res.status(400).json({ ok: false, error: "firstName is required" });
  }
  if (!isNonEmptyString(lastName)) {
    return res.status(400).json({ ok: false, error: "lastName is required" });
  }
  if (!isNonEmptyString(phone)) {
    return res.status(400).json({ ok: false, error: "phone is required" });
  }
  if (address != null && typeof address !== "string") {
    return res
      .status(400)
      .json({ ok: false, error: "address must be a string" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        address: typeof address === "string" ? address.trim() : null,
        role: "USER",
      },
      select: publicUserSelect(),
    });

    const secret = getJwtSecret();
    const token = jwt.sign({ role: user.role }, secret, {
      subject: String(user.id),
      expiresIn: getJwtExpiresIn(),
    });

    setAuthCookie(res, token);
    return res.status(201).json({ ok: true, data: toPublicUser(user) });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "P2002") {
      return res.status(409).json({ ok: false, error: "DUPLICATE_VALUE" });
    }

    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

async function login(req, res) {
  const { email, password, rememberMe } = req.body ?? {};

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res
      .status(400)
      .json({ ok: false, error: "email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.password) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const secret = getJwtSecret();
    const expiresIn = rememberMe ? REMEMBER_ME_JWT_EXPIRES : getJwtExpiresIn();
    const token = jwt.sign({ role: user.role }, secret, {
      subject: String(user.id),
      expiresIn,
    });

    setAuthCookie(res, token, Boolean(rememberMe));

    const safeUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: publicUserSelect(),
    });

    return res.status(200).json({ ok: true, data: toPublicUser(safeUser) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

async function logout(_req, res) {
  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
}

async function me(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect(),
  });

  if (!user) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  return res.status(200).json({ ok: true, data: toPublicUser(user) });
}

function signJwtForUser(user) {
  const secret = getJwtSecret();
  return jwt.sign({ role: user.role }, secret, {
    subject: String(user.id),
    expiresIn: getJwtExpiresIn(),
  });
}

async function forgotPassword(req, res) {
  const { email } = req.body ?? {};

  if (!isNonEmptyString(email)) {
    return res.status(400).json({ ok: false, error: "email is required" });
  }

  // Always return 200 to avoid revealing whether email exists
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (user && user.password) {
      const plainToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(plainToken)
        .digest("hex");

      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashedToken,
          passwordResetTokenExpiry: expiry,
        },
      });

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const resetUrl = `${frontendUrl}/reset-lozinke?token=${plainToken}`;

      await sendPasswordResetEmail(user.email, resetUrl);
    }
  } catch (error) {
    // Log but don't leak error details
    console.error("forgotPassword error:", error);
  }

  return res.status(200).json({ ok: true });
}

async function resetPassword(req, res) {
  const { token, newPassword } = req.body ?? {};

  if (!isNonEmptyString(token)) {
    return res.status(400).json({ ok: false, error: "token is required" });
  }
  if (!isNonEmptyString(newPassword) || newPassword.trim().length < 6) {
    return res
      .status(400)
      .json({ ok: false, error: "password must be at least 6 characters" });
  }

  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ ok: false, error: "INVALID_OR_EXPIRED_TOKEN" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

async function googleStart(_req, res) {
  try {
    const state = googleAuth.createStateToken();
    const isProd = process.env.NODE_ENV === "production";
    res.cookie(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60 * 1000, // 10 min
    });
    const url = googleAuth.buildAuthUrl(state);
    return res.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

function redirectToFrontend(res, path) {
  const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
  return res.redirect(`${frontend}${path}`);
}

async function googleCallback(req, res) {
  const { code, state, error: googleError } = req.query ?? {};
  const cookieState = req.cookies?.[GOOGLE_STATE_COOKIE];
  res.clearCookie(GOOGLE_STATE_COOKIE, { path: "/" });

  if (googleError) {
    return redirectToFrontend(res, "/prijava?error=google_denied");
  }
  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !cookieState ||
    state !== cookieState
  ) {
    return redirectToFrontend(res, "/prijava?error=invalid_state");
  }

  try {
    const tokens = await googleAuth.exchangeCodeForToken(code);
    const profile = await googleAuth.fetchUserInfo(tokens.access_token);

    if (!profile.sub || !profile.email_verified) {
      return redirectToFrontend(res, "/prijava?error=email_not_verified");
    }

    const email = String(profile.email).toLowerCase();
    const firstName = profile.given_name || profile.name || "Korisnik";
    const lastName = profile.family_name || "";

    let user = await prisma.user.findUnique({
      where: { googleId: profile.sub },
      select: publicUserSelect(),
    });

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingByEmail) {
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId: profile.sub },
          select: publicUserSelect(),
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            googleId: profile.sub,
            firstName,
            lastName,
            role: "USER",
          },
          select: publicUserSelect(),
        });
      }
    }

    const token = signJwtForUser(user);
    setAuthCookie(res, token);
    return redirectToFrontend(res, "/");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("googleCallback error:", message);
    return redirectToFrontend(res, "/prijava?error=google_failed");
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  googleStart,
  googleCallback,
};
