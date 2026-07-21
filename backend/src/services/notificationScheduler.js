// Pokreće dnevni notifikacijski job jednom dnevno, prvi put nakon 08:00 po
// lokalnom vremenu servera. Bez vanjskih zavisnosti (obični interval); dedup
// log u notificationsService čini job idempotentnim, pa ni restart backenda
// u toku dana ne može izazvati duplo slanje.
const { runDaily } = require("./notificationsService");

let lastRunDay = null;
let running = false;

async function tick() {
  const now = new Date();
  const dayKey = now.toDateString();
  if (now.getHours() < 8 || lastRunDay === dayKey || running) return;
  running = true;
  lastRunDay = dayKey;
  try {
    await runDaily(now);
  } catch (e) {
    console.error("notifikacije: dnevni job pao:", e);
  } finally {
    running = false;
  }
}

function startNotificationScheduler() {
  // provjera svakih 10 min + jedna ubrzo nakon starta (slučaj: restart u toku
  // dana poslije 08h; dedup log štiti od duplog slanja)
  setInterval(() => void tick(), 10 * 60 * 1000);
  setTimeout(() => void tick(), 30 * 1000);
}

module.exports = { startNotificationScheduler };
