const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { decryptJmbg } = require("../utils/encryptJmbg");
const {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} = require("../utils/mailer");
const {
  User,
  Subscription,
  Organization,
  OrganizationMember,
  UserPreference,
} = require("../models/index");
const googleAuth = require("../auth/googleAuth");

const GOOGLE_STATE_COOKIE = "g_oauth_state";
const REMEMBER_ME_DURATION_MS = 1000 * 60 * 60 * 24 * 365 * 10; // 10 godina
const REMEMBER_ME_JWT_EXPIRES = "87600h"; // 10 godina
// Default sesija (bez "zapamti me") — 24h. JWT i cookie u istom trajanju.
const DEFAULT_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in environment");
  return secret;
}

function getJwtExpiresIn() {
  // Default — kratka sesija (24h). Za "zapamti me" se koristi REMEMBER_ME_JWT_EXPIRES.
  return process.env.JWT_EXPIRES_IN || "24h";
}

function getCookieDomain() {
  const domain = process.env.COOKIE_DOMAIN;
  return domain && domain.trim() ? domain.trim() : undefined;
}

function setAuthCookie(res, token, rememberMe = false) {
  const isProd = process.env.NODE_ENV === "production";
  const domain = getCookieDomain();
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    ...(domain ? { domain } : {}),
    maxAge: rememberMe ? REMEMBER_ME_DURATION_MS : DEFAULT_COOKIE_MAX_AGE,
  });
}

function clearAuthCookie(res) {
  const domain = getCookieDomain();
  res.clearCookie("access_token", { path: "/", ...(domain ? { domain } : {}) });
}

const userAttributes = [
  "id",
  "email",
  "jmbg",
  "firstName",
  "lastName",
  "phone",
  "address",
  "city",
  "role",
  "createdAt",
  "updatedAt",
  "googleId",
  "isEmailVerified",
  "password",
  "idCardNumber",
  "trialUsedAt",
];

async function findUserWithSub(where) {
  return User.findOne({
    where,
    attributes: userAttributes,
    include: [
      {
        model: Subscription,
        as: "subscription",
        attributes: ["id", "startDate", "endDate", "isActive", "plan", "billingCycle"],
      },
    ],
  });
}

function toPublicUser(user) {
  if (!user) return null;
  const plain = user.toJSON ? user.toJSON() : user;
  const { jmbg, password, googleId, ...rest } = plain;
  return {
    ...rest,
    jmbg: jmbg ? decryptJmbg(jmbg) : null,
    hasPassword: !!password,
    isGoogleUser: !!googleId,
  };
}

function signJwtForUser(user, expiresIn) {
  const plain = user.toJSON ? user.toJSON() : user;
  const secret = getJwtSecret();
  return jwt.sign({ role: plain.role }, secret, {
    subject: String(plain.id),
    expiresIn: expiresIn || getJwtExpiresIn(),
  });
}

async function register(req, res) {
  const {
    email,
    password,
    firstName,
    lastName,
    phone,
    address,
    city,
    utmSource,
    utmCampaign,
  } = req.body ?? {};

  if (!isNonEmptyString(email))
    return res.status(400).json({ ok: false, error: "email is required" });
  if (!isNonEmptyString(password) || password.trim().length < 6)
    return res
      .status(400)
      .json({ ok: false, error: "password must be at least 6 characters" });
  if (!isNonEmptyString(firstName))
    return res.status(400).json({ ok: false, error: "firstName is required" });
  if (!isNonEmptyString(lastName))
    return res.status(400).json({ ok: false, error: "lastName is required" });
  if (address != null && typeof address !== "string")
    return res
      .status(400)
      .json({ ok: false, error: "address must be a string" });
  if (city != null && typeof city !== "string")
    return res
      .status(400)
      .json({ ok: false, error: "city must be a string" });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const plainToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(plainToken)
      .digest("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      email: email.trim().toLowerCase(),
      password: passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      address: typeof address === "string" ? address.trim() : null,
      city: typeof city === "string" ? city.trim() : null,
      role: "USER",
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: expiry,
      utmSource:
        typeof utmSource === "string" && utmSource.trim()
          ? utmSource.trim().slice(0, 80)
          : null,
      utmCampaign:
        typeof utmCampaign === "string" && utmCampaign.trim()
          ? utmCampaign.trim().slice(0, 120)
          : null,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const verifyUrl = `${frontendUrl}/verifikacija?token=${plainToken}`;
    try {
      await sendVerificationEmail(user.email, user.firstName, verifyUrl);
    } catch (mailErr) {
      console.error("Greška pri slanju verifikacijskog emaila:", mailErr);
    }

    return res.status(201).json({ ok: true, data: { email: user.email } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ ok: false, error: "DUPLICATE_VALUE" });
    }
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

async function login(req, res) {
  const { email, password, rememberMe } = req.body ?? {};

  if (!isNonEmptyString(email) || !isNonEmptyString(password))
    return res
      .status(400)
      .json({ ok: false, error: "email and password are required" });

  try {
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.password)
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });

    if (!user.isEmailVerified)
      return res.status(403).json({ ok: false, error: "EMAIL_NOT_VERIFIED" });

    const secret = getJwtSecret();
    const expiresIn = rememberMe ? REMEMBER_ME_JWT_EXPIRES : getJwtExpiresIn();
    const token = jwt.sign({ role: user.role }, secret, {
      subject: String(user.id),
      expiresIn,
    });

    setAuthCookie(res, token, Boolean(rememberMe));

    const safeUser = await findUserWithSub({ id: user.id });
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
  if (!userId)
    return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  let user = await findUserWithSub({ id: userId });
  if (!user)
    return res.status(404).json({ ok: false, error: "User not found" });

  // Lazy expiry: if subscription endDate has passed and is still active,
  // deactivate it and downgrade role to USER. Runs on each /me call.
  const sub = user.subscription;
  if (sub && sub.isActive && sub.endDate) {
    const end = new Date(sub.endDate);
    end.setHours(23, 59, 59, 999);
    if (end.getTime() < Date.now()) {
      await Subscription.update(
        { isActive: false },
        { where: { userId } },
      );
      if (user.role === "PRO" || user.role === "BUSINESS") {
        await User.update({ role: "USER" }, { where: { id: userId } });
      }
      user = await findUserWithSub({ id: userId });
    }
  }

  // PK Office: organizations sa role-om + active org + preferences.
  // Polja se vraćaju kao dodatna unutar `data` — postojeći marketing client
  // ih ignoriše, app dio ih konzumira.
  const memberships = await OrganizationMember.findAll({
    where: { userId },
    include: [{ model: Organization, as: "organization" }],
  });
  const organizations = memberships
    .filter((m) => m.organization)
    .map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      taxNumber: m.organization.taxNumber,
      type: m.organization.type,
      taxRegime: m.organization.taxRegime,
      logoUrl: m.organization.logoUrl,
      role: m.role,
    }));

  const preferences = await UserPreference.findOne({ where: { userId } });
  let activeOrganization = null;
  if (preferences?.activeOrganizationId) {
    activeOrganization =
      organizations.find((o) => o.id === preferences.activeOrganizationId) ||
      null;
  }

  return res.status(200).json({
    ok: true,
    data: {
      ...toPublicUser(user),
      organizations,
      activeOrganization,
      preferences: preferences
        ? {
            activeOrganizationId: preferences.activeOrganizationId,
            theme: preferences.theme,
            commandPaletteEnabled: !!preferences.commandPaletteEnabled,
          }
        : null,
    },
  });
}

async function forgotPassword(req, res) {
  const { email } = req.body ?? {};
  if (!isNonEmptyString(email))
    return res.status(400).json({ ok: false, error: "email is required" });

  try {
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (user && user.password) {
      const plainToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(plainToken)
        .digest("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000);

      await User.update(
        { passwordResetToken: hashedToken, passwordResetTokenExpiry: expiry },
        { where: { id: user.id } },
      );

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      await sendPasswordResetEmail(
        user.email,
        `${frontendUrl}/reset-lozinke?token=${plainToken}`,
      );
    }
  } catch (error) {
    console.error("forgotPassword error:", error);
  }

  return res.status(200).json({ ok: true });
}

async function resetPassword(req, res) {
  const { token, newPassword } = req.body ?? {};

  if (!isNonEmptyString(token))
    return res.status(400).json({ ok: false, error: "token is required" });
  if (!isNonEmptyString(newPassword) || newPassword.trim().length < 6)
    return res
      .status(400)
      .json({ ok: false, error: "password must be at least 6 characters" });

  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpiry: { [Op.gt]: new Date() },
      },
    });

    if (!user)
      return res
        .status(400)
        .json({ ok: false, error: "INVALID_OR_EXPIRED_TOKEN" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.update(
      {
        password: passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
      { where: { id: user.id } },
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

async function verifyEmail(req, res) {
  const { token } = req.query ?? {};
  if (!isNonEmptyString(token))
    return res.status(400).json({ ok: false, error: "INVALID_TOKEN" });

  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

    const user = await User.findOne({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: { [Op.gt]: new Date() },
        isEmailVerified: false,
      },
    });

    if (!user)
      return res
        .status(400)
        .json({ ok: false, error: "INVALID_OR_EXPIRED_TOKEN" });

    await User.update(
      {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
      { where: { id: user.id } },
    );

    const jwtToken = signJwtForUser(user);
    setAuthCookie(res, jwtToken);

    // Welcome email with 30-day PRO trial CTA (fire-and-forget)
    try {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const trialUrl = `${frontendUrl}/pretplate?trial=1`;
      void sendWelcomeEmail(user.email, user.firstName, trialUrl).catch(
        (err) => console.error("sendWelcomeEmail failed:", err?.message || err),
      );
    } catch (err) {
      console.error("welcome email dispatch error:", err?.message || err);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

async function resendVerification(req, res) {
  const { email } = req.body ?? {};
  if (!isNonEmptyString(email))
    return res.status(400).json({ ok: false, error: "email is required" });

  try {
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (user && user.password && !user.isEmailVerified) {
      const plainToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(plainToken)
        .digest("hex");
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await User.update(
        {
          emailVerificationToken: hashedToken,
          emailVerificationExpiry: expiry,
        },
        { where: { id: user.id } },
      );

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      try {
        await sendVerificationEmail(
          user.email,
          user.firstName,
          `${frontendUrl}/verifikacija?token=${plainToken}`,
        );
      } catch (mailErr) {
        console.error("Greška pri ponovnom slanju:", mailErr);
      }
    }
  } catch (error) {
    console.error("resendVerification error:", error);
  }

  return res.status(200).json({ ok: true });
}

async function googleStart(_req, res) {
  try {
    const state = googleAuth.createStateToken();
    const isProd = process.env.NODE_ENV === "production";
    const domain = getCookieDomain();
    res.cookie(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      ...(domain ? { domain } : {}),
      maxAge: 10 * 60 * 1000,
    });
    return res.redirect(googleAuth.buildAuthUrl(state));
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
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

  if (googleError)
    return redirectToFrontend(res, "/prijava?error=google_denied");
  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !cookieState ||
    state !== cookieState
  )
    return redirectToFrontend(res, "/prijava?error=invalid_state");

  try {
    const tokens = await googleAuth.exchangeCodeForToken(code);
    const profile = await googleAuth.fetchUserInfo(tokens.access_token);

    if (!profile.sub || !profile.email_verified)
      return redirectToFrontend(res, "/prijava?error=email_not_verified");

    const email = String(profile.email).toLowerCase();
    const firstName = profile.given_name || profile.name || "Korisnik";
    const lastName = profile.family_name || "";

    let user = await findUserWithSub({ googleId: profile.sub });

    if (!user) {
      const existingByEmail = await User.findOne({ where: { email } });
      if (existingByEmail) {
        await User.update(
          { googleId: profile.sub },
          { where: { id: existingByEmail.id } },
        );
        user = await findUserWithSub({ id: existingByEmail.id });
      } else {
        const created = await User.create({
          email,
          googleId: profile.sub,
          firstName,
          lastName,
          role: "USER",
          isEmailVerified: true,
        });
        user = await findUserWithSub({ id: created.id });

        // Welcome email sa 30-dnevnim PRO trial CTA (fire-and-forget).
        // Google OAuth korisnici preskaču email verification flow pa welcome
        // mail šaljemo ovdje da ne propustimo signup-time CTA.
        try {
          const frontendUrl =
            process.env.FRONTEND_URL || "http://localhost:3000";
          const trialUrl = `${frontendUrl}/pretplate?trial=1`;
          void sendWelcomeEmail(email, firstName, trialUrl).catch((err) =>
            console.error(
              "sendWelcomeEmail (google) failed:",
              err?.message || err,
            ),
          );
        } catch (err) {
          console.error(
            "welcome email dispatch error (google):",
            err?.message || err,
          );
        }
      }
    }

    // Google login uvijek pamti korisnika (dok eksplicitno ne klikne odjavu) —
    // JWT i cookie idu na dugi rok (10 godina). Korisnici očekuju da im se ne
    // gubi sesija prijavljeni preko Google-a, isti UX kao kod ostalih app-ova.
    const token = signJwtForUser(user, "3650d");
    setAuthCookie(res, token, true);
    return redirectToFrontend(res, "/");
  } catch (error) {
    console.error("googleCallback error:", error.message);
    return redirectToFrontend(res, "/prijava?error=google_failed");
  }
}

async function changePassword(req, res) {
  const userId = req.user?.id;
  if (!userId)
    return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const { currentPassword, newPassword } = req.body ?? {};
  if (!isNonEmptyString(currentPassword))
    return res
      .status(400)
      .json({ ok: false, error: "CURRENT_PASSWORD_REQUIRED" });
  if (!isNonEmptyString(newPassword) || newPassword.trim().length < 6)
    return res.status(400).json({ ok: false, error: "PASSWORD_TOO_SHORT" });

  const user = await User.findOne({
    where: { id: userId },
    attributes: ["password"],
  });
  if (!user || !user.password)
    return res.status(400).json({ ok: false, error: "NO_PASSWORD" });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid)
    return res.status(400).json({ ok: false, error: "WRONG_PASSWORD" });

  const hash = await bcrypt.hash(newPassword.trim(), 10);
  await User.update({ password: hash }, { where: { id: userId } });

  return res.status(200).json({ ok: true, data: null });
}

module.exports = {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  googleStart,
  googleCallback,
  changePassword,
};
