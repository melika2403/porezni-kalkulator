// Pokreće dnevni notifikacijski job jednom dnevno, prvi put nakon 08:00 po
// lokalnom vremenu servera. Bez vanjskih zavisnosti (obični interval).
// Dvostruka zaštita od ponavljanja:
//   • u procesu: lastRunDay (postavlja se TEK nakon uspješnog prolaza),
//   • u bazi: marker dana u notification_log, koji provjerava runDaily sam —
//     zato respawn procesa (Passenger) ne vrti cijeli job iznova.
// Ako job padne, marker se ne upiše i sljedeći tick ga ponovi; dedup log po
// korisniku i dalje garantuje da se ništa ne pošalje dvaput.
const { runDaily, logGreska } = require("./notificationsService");

let lastRunDay = null; // dan koji je uspješno završen
let running = false;

async function tick() {
  const now = new Date();
  const dayKey = now.toDateString();
  if (now.getHours() < 8 || lastRunDay === dayKey || running) return;
  running = true;
  try {
    // false = ima šta da se ponovi; lastRunDay se tada NE postavlja, da sljedeći
    // tick pokuša opet umjesto da čeka sutra. Koliko puta se smije ponoviti
    // ograničava runDaily brojačem u bazi — brojač ovdje bi respawn resetovao.
    if (await runDaily(now)) lastRunDay = dayKey;
  } catch (e) {
    // runDaily hvata pad pojedinog posla sam; ovdje stiže samo pad prije njih
    // (npr. učitavanje članstava).
    logGreska("dnevni job pao", e);
  } finally {
    running = false;
  }
}

function startNotificationScheduler() {
  // provjera svakih 10 min + jedna ubrzo nakon starta (slučaj: restart u toku
  // dana poslije 08h; marker dana i dedup log štite od duplog slanja)
  setInterval(() => void tick(), 10 * 60 * 1000);
  setTimeout(() => void tick(), 30 * 1000);
}

module.exports = { startNotificationScheduler };
