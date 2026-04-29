const { City } = require("../models/index");

async function list(_req, res) {
  const cities = await City.findAll({
    attributes: ["id", "name", "municipalityCode", "postalCode", "kanton"],
    order: [["name", "ASC"]],
  });
  res.json({ ok: true, data: cities });
}

module.exports = { list };
