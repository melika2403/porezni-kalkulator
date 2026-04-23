const formRepository = require("../repositories/formRepository");

const VALID_TYPES = ["GPD", "SPR", "ZO3", "UGOVOR", "AMS", "PLDI"];

async function list(req, res) {
  const { type } = req.query;

  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ ok: false, error: "Invalid form type" });
  }

  const forms = await formRepository.getUserForms(req.user.id, type || null);
  res.status(200).json({ ok: true, data: forms });
}

module.exports = { list };
