const express = require("express");
const ctrl = require("../controllers/uplatniRacuniController");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");

const router = express.Router();
const admin = [requireAuth, requireRole("ADMIN")];

// Javni šifarnik: čitaju ga obrasci (AMS, UoD, ČOK…) i stranica /javni-prihodi.
router.get("/", ctrl.javniSifarnik);

// Admin upravljanje (panel "Uplatni računi"); zaštita je na serveru.
router.get("/admin", ...admin, ctrl.adminLista);
router.put("/admin/:kljuc", ...admin, ctrl.adminIzmjena);
router.post("/admin/:kljuc/provjera", ...admin, ctrl.adminProvjera);
router.get("/admin/:kljuc/log", ...admin, ctrl.adminLog);

module.exports = router;
