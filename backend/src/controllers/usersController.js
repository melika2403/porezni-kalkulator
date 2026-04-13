const userRepository = require("../repositories/userRepository");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateUserPayload(body) {
  const { firstName, lastName, phone, address, role } = body ?? {};

  if (!isNonEmptyString(firstName))
    return { ok: false, message: "firstName is required" };
  if (!isNonEmptyString(lastName))
    return { ok: false, message: "lastName is required" };
  if (!isNonEmptyString(phone))
    return { ok: false, message: "phone is required" };
  if (!isNonEmptyString(role))
    return { ok: false, message: "role is required" };
  if (address != null && typeof address !== "string") {
    return { ok: false, message: "address must be a string" };
  }

  return {
    ok: true,
    value: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      address: typeof address === "string" ? address.trim() : null,
      role: role.trim(),
    },
  };
}

async function list(req, res) {
  const users = await userRepository.listUsers();
  res.status(200).json({ ok: true, data: users });
}

async function getById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const user = await userRepository.getUserById(id);
  if (!user)
    return res.status(404).json({ ok: false, error: "User not found" });

  res.status(200).json({ ok: true, data: user });
}

async function create(req, res) {
  const validation = validateUserPayload(req.body);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.message });
  }

  try {
    const user = await userRepository.createUser(validation.value);
    res.status(201).json({ ok: true, data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const validation = validateUserPayload(req.body);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.message });
  }

  try {
    const user = await userRepository.updateUserById(id, validation.value);
    if (!user)
      return res.status(404).json({ ok: false, error: "User not found" });
    res.status(200).json({ ok: true, data: user });
  } catch (error) {
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
  create,
  update,
  remove,
};
