const bcrypt = require("bcryptjs");
const { User, UserPreference } = require("../models/index");
const userRepository = require("../repositories/userRepository");

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function publicProfile(user, preferences) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    address: user.address,
    city: user.city,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    preferences: preferences
      ? {
          theme: preferences.theme,
          activeOrganizationId: preferences.activeOrganizationId,
          commandPaletteEnabled: !!preferences.commandPaletteEnabled,
        }
      : { theme: "system", activeOrganizationId: null, commandPaletteEnabled: false },
  };
}

async function get(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const user = await userRepository.getUserById(userId);
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });
  const prefs = await UserPreference.findOne({ where: { userId } });

  return res.json({ ok: true, data: publicProfile(user, prefs) });
}

async function update(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const { firstName, lastName, phone, address, city } = req.body ?? {};
  const data = {};

  if (firstName !== undefined) {
    if (!isNonEmptyString(firstName))
      return res.status(400).json({ ok: false, error: "Ime je obavezno" });
    data.firstName = firstName.trim();
  }
  if (lastName !== undefined) {
    if (!isNonEmptyString(lastName))
      return res.status(400).json({ ok: false, error: "Prezime je obavezno" });
    data.lastName = lastName.trim();
  }
  if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
  if (address !== undefined) data.address = address ? String(address).trim() : null;
  if (city !== undefined) data.city = city ? String(city).trim() : null;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ ok: false, error: "Nema polja za ažuriranje" });
  }

  const user = await userRepository.updateUserById(userId, data);
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });
  const prefs = await UserPreference.findOne({ where: { userId } });
  return res.json({ ok: true, data: publicProfile(user, prefs) });
}

async function changePassword(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const { currentPassword, newPassword } = req.body ?? {};
  if (!isNonEmptyString(currentPassword))
    return res.status(400).json({ ok: false, error: "CURRENT_PASSWORD_REQUIRED" });
  if (!isNonEmptyString(newPassword) || newPassword.trim().length < 6)
    return res.status(400).json({ ok: false, error: "PASSWORD_TOO_SHORT" });

  const user = await User.findOne({ where: { id: userId }, attributes: ["password"] });
  if (!user || !user.password) return res.status(400).json({ ok: false, error: "NO_PASSWORD" });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(400).json({ ok: false, error: "WRONG_PASSWORD" });

  const hash = await bcrypt.hash(newPassword.trim(), 10);
  await User.update({ password: hash }, { where: { id: userId } });

  return res.json({ ok: true });
}

async function updatePreferences(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const { theme, commandPaletteEnabled } = req.body ?? {};
  const data = {};

  if (theme !== undefined) {
    if (!["light", "dark", "system"].includes(theme))
      return res.status(400).json({ ok: false, error: "INVALID_THEME" });
    data.theme = theme;
  }
  if (commandPaletteEnabled !== undefined) {
    data.commandPaletteEnabled = Boolean(commandPaletteEnabled);
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ ok: false, error: "Nema polja za ažuriranje" });
  }

  const [pref] = await UserPreference.findOrCreate({
    where: { userId },
    defaults: { userId, ...data },
  });
  await pref.update(data);

  return res.json({
    ok: true,
    data: {
      theme: pref.theme,
      activeOrganizationId: pref.activeOrganizationId,
      commandPaletteEnabled: !!pref.commandPaletteEnabled,
    },
  });
}

module.exports = { get, update, changePassword, updatePreferences };
