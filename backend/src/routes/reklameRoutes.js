const express = require("express");
const { requireAuth, optionalAuth, requireRole } = require("../middlewares/authMiddleware");
const { partnerUpload } = require("../utils/uploads");
const { rateLimit } = require("../middlewares/rateLimit");
const ctrl = require("../controllers/reklameController");

// Putanje su namjerno neutralne (/api/partner, /api/p, /r): ad-blokeri po
// javnim listama (EasyList) blokiraju zahtjeve sa riječima ad, ads, banner,
// promo, track, pixel, sponsor... u URL-u, pa bi sakrili plaćenu poziciju i
// banci pokvarili statistiku. Oznaka "Oglas"/"Sponzorisano" na samoj
// kreativi ostaje vidljiva, ne skrivamo da je reklama.

// ── Partner portal (/api/partner) ───────────────────────────────────────────
// Promoter upravlja SAMO svojim kreativama; ADMIN vidi sve (podrška).
const portal = express.Router();
const promoter = [requireAuth, requireRole("PROMOTER", "ADMIN")];

portal.get("/", ...promoter, ctrl.lista);
portal.post("/", ...promoter, ctrl.kreiraj);
portal.post("/slika", ...promoter, partnerUpload.single("slika"), ctrl.uploadSlike);
portal.get("/pregled", ...promoter, ctrl.pregled);
portal.get("/izvoz", ...promoter, ctrl.izvoz);
portal.get("/izvjestaj", ...promoter, ctrl.mjesecniIzvjestaj);
portal.get("/:id", ...promoter, ctrl.detalj);
portal.put("/:id", ...promoter, ctrl.izmijeni);
portal.post("/:id/status", ...promoter, ctrl.promijeniStatus);
portal.get("/:id/statistika", ...promoter, ctrl.statistika);
portal.delete("/:id", ...promoter, ctrl.obrisi);

// ── Javni slotovi (/api/p) ──────────────────────────────────────────────────
// Brojači bez prijave: ograničenje po adresi da petlja ne naduva statistiku
// koju banka plaća. Stranica sa 5 slotova šalje do 5 prikaza.
const javno = express.Router();
const prikazLimit = rateLimit({ prozorMs: 60 * 1000, maks: 60, imenik: "p-e" });

javno.get("/s", ctrl.aktivne);
// optionalAuth: prijavljeni admin i partner se ne broje (interni promet)
javno.post("/e/:id", prikazLimit, optionalAuth, ctrl.zabiljeziPrikaz);

// ── Klik (/r/:id) ───────────────────────────────────────────────────────────
// Klik je redirect: posjetilac preko limita i dalje mora stići do banke, samo
// se klik više ne broji. Zato se 429 iz rateLimit-a pretvara u zastavicu.
const klikLimit = rateLimit({ prozorMs: 60 * 1000, maks: 20, imenik: "p-k" });
function klikBrojac(req, _res, next) {
  const tihiRes = {
    set() {},
    status() {
      return {
        json() {
          req.bezBrojanja = true;
          next();
        },
      };
    },
  };
  klikLimit(req, tihiRes, next);
}

const klik = express.Router();
klik.get("/:id", klikBrojac, optionalAuth, ctrl.klik);

module.exports = { portal, javno, klik };
