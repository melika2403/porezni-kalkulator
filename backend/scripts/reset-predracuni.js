// Jednokratna skripta: briše SVE pretplatničke predračune i resetuje brojač
// tako da sljedeći predračun ponovo krene od rednog broja 1.
// Pokretanje:  node scripts/reset-predracuni.js
require("dotenv").config();
const { sequelize, Predracun, PredracunCounter } = require("../src/models/index");

(async () => {
  try {
    const before = await Predracun.count();
    const counters = await PredracunCounter.count();
    console.log(`Prije: ${before} predračuna, ${counters} counter redova.`);

    await sequelize.transaction(async (t) => {
      await Predracun.destroy({ where: {}, transaction: t });
      // Brisanje counter redova → nextSequence ih ponovo kreira od 0 (prvi = 1).
      await PredracunCounter.destroy({ where: {}, transaction: t });
    });

    const after = await Predracun.count();
    console.log(`Poslije: ${after} predračuna. Brojač resetovan — sljedeći kreće od 1.`);
    await sequelize.close();
    process.exit(0);
  } catch (e) {
    console.error("Greška:", e?.message || e);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
})();
