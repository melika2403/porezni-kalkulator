// Jednokratno: briše SVE zapise aktivnosti (ActivityLog) za jednog korisnika
// po email-u. Korisno za čišćenje test podataka.
// Pokretanje:  node scripts/clear-user-activity.js [email]
require("dotenv").config();
const { sequelize, User, ActivityLog } = require("../src/models/index");

const EMAIL = (process.argv[2] || "amarpjanic2@gmail.com").trim().toLowerCase();

(async () => {
  try {
    const user = await User.findOne({ where: { email: EMAIL }, attributes: ["id", "email"] });
    if (!user) {
      console.log(`Korisnik s emailom ${EMAIL} nije pronađen.`);
      await sequelize.close();
      process.exit(0);
    }
    const before = await ActivityLog.count({ where: { userId: user.id } });
    const deleted = await ActivityLog.destroy({ where: { userId: user.id } });
    console.log(`Korisnik ${user.email} (id ${user.id}): obrisano ${deleted} aktivnosti (prije: ${before}).`);
    await sequelize.close();
    process.exit(0);
  } catch (e) {
    console.error("Greška:", e?.message || e);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
})();
