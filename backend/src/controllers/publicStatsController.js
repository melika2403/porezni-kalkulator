const { Op } = require("sequelize");
const {
  sequelize,
  ActivityLog,
  Form,
  Invoice,
  PayrollDocument,
  WorkerDocument,
  User,
  Organization,
} = require("../models/index");

// Javne brojke za landing (social proof traka). documents primarno iz
// dnevnika aktivnosti (ActivityLog: svako generisanje, registrovani +
// anonimni, bez skrivenih) — ista brojka koju admin vidi na Aktivnosti;
// sačuvani dokumenti su donja granica jer je dnevnik uveden kasnije, uzima
// se veća od te dvije. Uz to: aktivnost zadnjih 30 dana + po danima (mini
// grafikon), broj korisnika i organizacija, i anonimizovan "ticker" zadnjih
// događaja (samo tip dokumenta i vrijeme, NIKAD ime/organizacija). Brojke se
// zaokružuju NANIŽE (dokumenti na 50, ostalo na 10) i keširaju 10 min.
const TTL_MS = 10 * 60 * 1000;
let cache = { at: 0, value: null };

const floorTo = (n, step) => Math.floor(n / step) * step;

// akcije koje smiju u javni ticker, sa čitljivim nazivom (anonimizovano)
const TICKER_LABELS = {
  PLATA_GENERATE: "obračun plate",
  FAKTURA_GENERATE: "faktura",
  PREDRACUN_GENERATE: "predračun",
  OBRAZAC_2001_GENERATE: "obrazac 2001",
  OBRAZAC_2002_GENERATE: "obrazac 2002",
  MIP_GENERATE: "MIP-1023",
  GIP_GENERATE: "GIP-1022",
  UPLATNICE_GENERATE: "uplatnice",
  PLATNI_LISTIC_GENERATE: "platna lista",
  NALOG_KNJIZENJE_GENERATE: "nalog za knjiženje",
  SIH_GENERATE: "šihterica",
  ZO3_GENERATE: "ZO3 obrazac",
  AMS_GENERATE: "AMS-1035",
  GPD_GENERATE: "GPD-1051",
  SPR_GENERATE: "SPR-1053",
  PLDI_GENERATE: "PLDI-1043",
  JS3100_GENERATE: "JS3100 prijava",
  UGOVOR_RADU_GENERATE: "ugovor o radu",
  UGOVOR_DJELU_GENERATE: "ugovor o djelu",
  UGOVOR_POZAJMICA_GENERATE: "ugovor o pozajmici",
  RJESENJE_GENERATE: "rješenje",
  KARTICA_GENERATE: "članska kartica",
  EVIDENCIJA_GENERATE: "matična evidencija",
  OFFICE_IZVOD_UCITAN: "bankovni izvod",
  OFFICE_ULAZNI_RACUN: "ulazni račun",
  OFFICE_KALKULACIJA: "kalkulacija",
};

async function stats(req, res) {
  try {
    if (!cache.value || Date.now() - cache.at > TTL_MS) {
      // ponoć prije 29 dana = tačno 30 kalendarskih dana uključujući danas;
      // isti donji rub i za last30 i za grafikon pa zbir stubića == last30
      const prije30 = new Date();
      prije30.setHours(0, 0, 0, 0);
      prije30.setDate(prije30.getDate() - 29);
      const [events, last30, users, organizations, forms, invoices, payrollDocs, workerDocs, dailyRows, recent] =
        await Promise.all([
          ActivityLog.count({ where: { hiddenAt: null } }),
          ActivityLog.count({
            where: { hiddenAt: null, createdAt: { [Op.gte]: prije30 } },
          }),
          User.count(),
          Organization.count(),
          Form.count(),
          Invoice.count(),
          PayrollDocument.count(),
          WorkerDocument.count(),
          sequelize.query(
            `SELECT DATE(createdAt) AS d, COUNT(*) AS c
             FROM activity_logs
             WHERE hiddenAt IS NULL AND createdAt >= ?
             GROUP BY DATE(createdAt)`,
            { replacements: [prije30], type: sequelize.QueryTypes.SELECT },
          ),
          // dovoljno novijih da poslije dedupliramo po tipu dokumenta
          ActivityLog.findAll({
            where: {
              hiddenAt: null,
              action: { [Op.in]: Object.keys(TICKER_LABELS) },
            },
            attributes: ["action", "createdAt"],
            order: [["id", "DESC"]],
            limit: 120,
            raw: true,
          }),
        ]);
      const total = Math.max(
        events,
        forms + invoices + payrollDocs + workerDocs,
      );

      // ticker: po jedan (najnoviji) po tipu dokumenta, da se u rotaciji vidi
      // raznovrsnost (obračun plate, šihterica, faktura, izvod...) a ne 6x
      // isti tip; `recent` je već po id DESC pa je prvi po tipu i najnoviji
      const tickerSeen = new Set();
      const ticker = [];
      for (const r of recent) {
        if (tickerSeen.has(r.action)) continue;
        tickerSeen.add(r.action);
        ticker.push({ label: TICKER_LABELS[r.action], at: r.createdAt });
        if (ticker.length >= 8) break;
      }

      // po danima, hronološki, sa nulama za dane bez aktivnosti
      const byDay = new Map(
        dailyRows.map((r) => [String(r.d).slice(0, 10), Number(r.c) || 0]),
      );
      const daily = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
          .toISOString()
          .slice(0, 10);
        daily.push({ d, c: byDay.get(d) ?? 0 });
      }

      cache = {
        at: Date.now(),
        value: {
          documents: floorTo(total, 50),
          last30: floorTo(last30, 10),
          users: floorTo(users, 10),
          organizations: floorTo(organizations, 10),
          daily,
          ticker,
        },
      };
    }
    res.status(200).json({ ok: true, data: cache.value });
  } catch (err) {
    console.error("publicStats error:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = { stats };
