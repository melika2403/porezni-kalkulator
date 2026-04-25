const userRepository = require("../repositories/userRepository");
const { encryptJmbg } = require("../utils/encryptJmbg");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isAdmin(req) {
  return req.user?.role === "ADMIN";
}

function validateUserUpdatePayload(body) {
  const { firstName, lastName, phone, address, jmbg, role } = body ?? {};

  const data = {};

  if (firstName != null) {
    if (!isNonEmptyString(firstName)) {
      return { ok: false, message: "firstName must be a non-empty string" };
    }
    data.firstName = firstName.trim();
  }

  if (lastName != null) {
    if (!isNonEmptyString(lastName)) {
      return { ok: false, message: "lastName must be a non-empty string" };
    }
    data.lastName = lastName.trim();
  }

  if (phone != null) {
    if (!isNonEmptyString(phone)) {
      return { ok: false, message: "phone must be a non-empty string" };
    }
    data.phone = phone.trim();
  }

  if (address !== undefined) {
    if (address != null && typeof address !== "string") {
      return { ok: false, message: "address must be a string" };
    }
    data.address = typeof address === "string" ? address.trim() : null;
  }

  if (jmbg !== undefined) {
    if (jmbg != null) {
      if (typeof jmbg !== "string" || !/^\d{13}$/.test(jmbg.trim())) {
        return { ok: false, message: "jmbg must be exactly 13 digits" };
      }
      data.jmbg = encryptJmbg(jmbg.trim());
    } else {
      data.jmbg = null;
    }
  }

  if (role != null) {
    if (!isNonEmptyString(role)) {
      return { ok: false, message: "role must be a non-empty string" };
    }
    data.role = role.trim();
  }

  const { idCardNumber } = body ?? {};
  if (idCardNumber !== undefined) {
    data.idCardNumber = idCardNumber ? String(idCardNumber).trim().slice(0, 9) : null;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, message: "No fields to update" };
  }

  return { ok: true, value: data };
}

function firstQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePositiveInt(value, fallback) {
  const v = firstQueryValue(value);
  const n = Number.parseInt(typeof v === "string" ? v : "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function list(req, res) {
  const firstName = firstQueryValue(req.query.firstName);
  const lastName = firstQueryValue(req.query.lastName);
  const email = firstQueryValue(req.query.email);

  const pageNum = parsePositiveInt(req.query.page, 1);
  const limitNum = Math.min(parsePositiveInt(req.query.limit, 20), 100);

  const { items, total } = await userRepository.listUsers({
    firstName,
    lastName,
    email,
    page: pageNum,
    limit: limitNum,
  });

  return res.status(200).json({
    ok: true,
    data: { items, total, page: pageNum, limit: limitNum },
  });
}

async function getById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  if (!isAdmin(req) && req.user?.id !== id) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  const user = await userRepository.getUserById(id);
  if (!user)
    return res.status(404).json({ ok: false, error: "User not found" });

  res.status(200).json({ ok: true, data: user });
}

async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  if (!isAdmin(req) && req.user?.id !== id) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  const validation = validateUserUpdatePayload(req.body);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.message });
  }

  if (!isAdmin(req)) {
    delete validation.value.role;
    if (Object.keys(validation.value).length === 0) {
      return res.status(400).json({ ok: false, error: "No fields to update" });
    }
  }

  try {
    const user = await userRepository.updateUserById(id, validation.value);
    if (!user)
      return res.status(404).json({ ok: false, error: "User not found" });
    res.status(200).json({ ok: true, data: user });
  } catch (error) {
    if (error && error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ ok: false, error: "DUPLICATE_VALUE" });
    }
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
}

async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  try {
    const deleted = await userRepository.deleteUserById(id);
    if (!deleted)
      return res.status(404).json({ ok: false, error: "User not found" });
    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
}

module.exports = {
  list,
  getById,
  update,
  remove,
};
