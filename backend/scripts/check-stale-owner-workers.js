/* READ-ONLY provjera: d.o.o. (COMPANY) organizacije sa ne-zaposlenim vlasnikom
   (opcije 2/3/4) koje i dalje imaju živog, plaćenog VLASNIK Worker reda. To su
   slučajevi gdje vlasnik pogrešno ulazi u obračun. Skripta NE mijenja podatke,
   samo broji i ispisuje (id, naziv). */
require("dotenv").config();
const { Op } = require("sequelize");
const { sequelize, Organization, Worker } = require("../src/models/index");

function ownerIsWorker(type, ownerIsDirector, directorEngagement) {
  if (type === "BUSINESS") return true;
  return Boolean(ownerIsDirector) && directorEngagement === "ugovor_o_radu";
}

(async () => {
  try {
    const orgs = await Organization.findAll({
      where: { type: "COMPANY" },
      attributes: [
        "id",
        "name",
        "type",
        "ownerIsDirector",
        "directorEngagement",
      ],
    });

    const affected = [];
    for (const o of orgs) {
      if (ownerIsWorker(o.type, o.ownerIsDirector, o.directorEngagement)) continue;
      const stale = await Worker.findOne({
        where: {
          organizationId: o.id,
          role: "VLASNIK",
          [Op.or]: [
            { salaryBruto: { [Op.ne]: null } },
            { salaryNeto: { [Op.ne]: null } },
            { prijavaDate: { [Op.ne]: null } },
          ],
        },
        attributes: ["id", "employmentStatus", "salaryBruto", "salaryNeto", "prijavaDate"],
      });
      if (stale) {
        affected.push({
          orgId: o.id,
          naziv: o.name,
          workerId: stale.id,
          status: stale.employmentStatus,
          salaryBruto: stale.salaryBruto,
          salaryNeto: stale.salaryNeto,
          prijavaDate: stale.prijavaDate,
        });
      }
    }

    console.log(`COMPANY orgs pregledano: ${orgs.length}`);
    console.log(`Zaostalih (ne-zaposlen vlasnik + plaćen VLASNIK): ${affected.length}`);
    if (affected.length) console.table(affected);
  } catch (e) {
    console.error("Greška:", e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
