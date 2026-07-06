const {
  Form,
  Invoice,
  PayrollDocument,
  WorkerDocument,
} = require("../models/index");

// Javna brojka za landing (social proof): ukupno generisanih dokumenata
// (sačuvani obrasci, fakture/predračuni, platni listići/uplatnice, dokumenti
// radnika). Kešira se 10 min i zaokružuje naniže na 50 da javno ne
// objavljujemo tačne interne brojke.
const TTL_MS = 10 * 60 * 1000;
let cache = { at: 0, value: null };

async function stats(req, res) {
  try {
    if (!cache.value || Date.now() - cache.at > TTL_MS) {
      const [forms, invoices, payrollDocs, workerDocs] = await Promise.all([
        Form.count(),
        Invoice.count(),
        PayrollDocument.count(),
        WorkerDocument.count(),
      ]);
      const total = forms + invoices + payrollDocs + workerDocs;
      cache = {
        at: Date.now(),
        value: { documents: Math.floor(total / 50) * 50 },
      };
    }
    res.status(200).json({ ok: true, data: cache.value });
  } catch (err) {
    console.error("publicStats error:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = { stats };
