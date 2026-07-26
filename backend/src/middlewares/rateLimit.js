// Jednostavno ograničenje broja zahtjeva po IP adresi, u memoriji procesa.
//
// Namijenjeno javnim brojačima (pregledi, dijeljenja) gdje nema prijave pa
// nema ni drugog identiteta osim adrese. Cilj nije odbrana od distribuirane
// navale, nego da obična petlja u curlu ne naduva statistiku. Zato bez Redisa
// i bez vanjske zavisnosti: brojači žive u procesu i sami se čiste.
//
// Iza reverse proxyja Express bez "trust proxy" vidi adresu proxyja, pa bi svi
// posjetioci dijelili jednu kantu. Zato se uzima i X-Forwarded-For kad postoji.

const kante = new Map();

// stare kante se brišu povremeno, da Map ne raste bez granice; unref da timer
// ne drži proces živim
const CISCENJE_MS = 5 * 60 * 1000;
setInterval(() => {
  const sada = Date.now();
  for (const [kljuc, k] of kante) {
    if (k.istice <= sada) kante.delete(kljuc);
  }
}, CISCENJE_MS).unref();

function adresa(req) {
  const prosljedjena = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return prosljedjena || req.ip || req.socket?.remoteAddress || "nepoznata";
}

/**
 * @param {object} opcije
 * @param {number} opcije.prozorMs dužina prozora u milisekundama
 * @param {number} opcije.maks koliko zahtjeva smije u jednom prozoru
 * @param {string} opcije.imenik odvaja brojače različitih ruta
 */
function rateLimit({ prozorMs = 60 * 1000, maks = 30, imenik = "opsti" } = {}) {
  return function ogranici(req, res, next) {
    const sada = Date.now();
    const kljuc = `${imenik}:${adresa(req)}`;
    const k = kante.get(kljuc);

    if (!k || k.istice <= sada) {
      kante.set(kljuc, { broj: 1, istice: sada + prozorMs });
      return next();
    }
    k.broj += 1;
    if (k.broj > maks) {
      res.set("Retry-After", String(Math.ceil((k.istice - sada) / 1000)));
      return res.status(429).json({ ok: false, error: "PREVISE_ZAHTJEVA" });
    }
    return next();
  };
}

module.exports = { rateLimit };
