const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = require("../prisma");

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
  return process.env.JWT_EXPIRES_IN || "1h";
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60, // 1h (keep in sync with default JWT_EXPIRES_IN)
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
    firstName: true,
    lastName: true,
    phone: true,
    address: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  };
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
        role: "user",
      },
      select: publicUserSelect(),
    });

    const secret = getJwtSecret();
    const token = jwt.sign({ role: user.role }, secret, {
      subject: String(user.id),
      expiresIn: getJwtExpiresIn(),
    });

    setAuthCookie(res, token);
    return res.status(201).json({ ok: true, data: user });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "P2002") {
      return res.status(409).json({ ok: false, error: "DUPLICATE_VALUE" });
    }

    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

async function login(req, res) {
  const { email, password } = req.body ?? {};

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
    const token = jwt.sign({ role: user.role }, secret, {
      subject: String(user.id),
      expiresIn: getJwtExpiresIn(),
    });

    setAuthCookie(res, token);

    const safeUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: publicUserSelect(),
    });

    return res.status(200).json({ ok: true, data: safeUser });
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

  return res.status(200).json({ ok: true, data: user });
}

module.exports = {
  register,
  login,
  logout,
  me,
};
