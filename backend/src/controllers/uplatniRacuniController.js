// ──────────────────────────────────────────────────────────────────────────────
//  Uplatni računi javnih prihoda: javni šifarnik za frontend + admin CRUD.
//
//  Javni GET vraća trenutno stanje (baza + fallback) u obliku koji frontend
//  live-store primjenjuje preko statičkog snapshota. Admin rute (ADMIN rola)
//  mijenjaju brojeve uz blokirajuću validaciju (16 cifara, modulo 97),
//  obavezan izvor (broj Službenih novina), dupli unos i audit log.
// ──────────────────────────────────────────────────────────────────────────────
const { UplatniRacun, UplatniRacunLog, User } = require("../models");
const racuni = require("../services/racuniService");

// ── Javni šifarnik (bez autha; koriste ga obrasci i /javni-prihodi) ─────────
async function javniSifarnik(req, res) {
  const t = racuni.trenutni();
  const kantoni = {};
  for (const [key, k] of Object.entries(t.KANTONI)) {
    kantoni[key] = { zo: k.zoRacun, budzet: k.budzet, nezap: k.nezapRacun };
  }
  res.set("Cache-Control", "public, max-age=60");
  return res.json({
    ok: true,
    data: {
      kantoni,
      federalni: {
        budzet: t.FBIH_BUDZET_RACUN,
        zo: t.FBIH_ZO_RACUN,
        nezap: t.FBIH_NEZAP_RACUN,
        fondInvalidi: t.FOND_INVALIDI_RACUN,
        jrtTrezor: t.JRT_TREZOR_BIH_RACUN,
      },
      rsBudzet: t.RS_BUDZET_RACUN,
      komore: t.KOMORE,
      meta: racuni.getMeta(),
    },
  });
}

// ── Admin: lista svih slotova ───────────────────────────────────────────────
async function adminLista(req, res) {
  try {
    const rows = await UplatniRacun.findAll({ order: [["kljuc", "ASC"]], raw: true });
    const poKljucu = new Map(rows.map((r) => [r.kljuc, r]));
    // Redoslijed i opis dolaze iz SEED_DEFS da lista uvijek pokaže svih 38
    // slotova, i kad baza još nije seedovana (tada prikaz = seed vrijednosti).
    const lista = racuni.SEED_DEFS.map((def) => {
      const r = poKljucu.get(def.kljuc);
      const digits = r ? String(r.racun) : def.racun;
      return {
        kljuc: def.kljuc,
        grupa: def.grupa,
        kanton: def.kanton,
        korisnik: r ? r.korisnik : def.korisnik,
        vrstaPrihoda: r ? r.vrstaPrihoda : def.vrstaPrihoda,
        racun: digits,
        racunPrikaz: racuni.formatAccountDashed(digits),
        banka: (r ? r.banka : def.banka) || racuni.bankNameFromAccount(digits) || null,
        vaziOd: r ? r.vaziOd : null,
        izvor: r ? r.izvor : null,
        datumProvjere: r ? r.datumProvjere : null,
        izmijenjeno: r ? r.updatedAt : null,
        seedovano: Boolean(r),
      };
    });
    return res.json({ ok: true, data: { racuni: lista, meta: racuni.getMeta() } });
  } catch (err) {
    console.error("adminLista uplatnih računa:", err);
    return res.status(500).json({ ok: false, error: "Greška pri čitanju šifarnika." });
  }
}

// ── Admin: izmjena broja računa ─────────────────────────────────────────────
async function adminIzmjena(req, res) {
  try {
    const kljuc = String(req.params.kljuc || "");
    const red = await UplatniRacun.findOne({ where: { kljuc } });
    if (!red) {
      return res.status(404).json({ ok: false, error: "Nepoznat slot računa." });
    }

    const body = req.body || {};
    const izvor = String(body.izvor || "").trim();
    if (!izvor) {
      return res.status(400).json({
        ok: false,
        error: "Izvor izmjene je obavezan (broj Službenih novina FBiH i tačka).",
      });
    }
    if (izvor.length > 240) {
      return res.status(400).json({ ok: false, error: "Izvor je predugačak (max 240 znakova)." });
    }

    const noviDigits = racuni.normalizeAccountDigits(body.racun);
    const potvrdaDigits = racuni.normalizeAccountDigits(body.racunPotvrda);
    if (noviDigits !== potvrdaDigits) {
      return res.status(400).json({
        ok: false,
        error: "Broj računa i potvrda se ne poklapaju. Unesite broj dva puta.",
      });
    }
    const greska = racuni.validirajRacun(noviDigits);
    if (greska) return res.status(400).json({ ok: false, error: greska });

    let vaziOd = null;
    if (body.vaziOd) {
      const iso = String(body.vaziOd).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        return res.status(400).json({ ok: false, error: "Neispravan datum 'važi od'." });
      }
      vaziOd = iso;
    }

    const banka =
      String(body.banka || "").trim().slice(0, 120) ||
      racuni.bankNameFromAccount(noviDigits) ||
      null;

    const stariDigits = String(red.racun);
    const user = await User.findByPk(req.user.id, { attributes: ["id", "email"] });

    red.racun = noviDigits;
    red.banka = banka;
    red.vaziOd = vaziOd;
    red.izvor = izvor;
    red.datumProvjere = new Date().toISOString().slice(0, 10);
    red.updatedByUserId = req.user.id;
    await red.save();

    await UplatniRacunLog.create({
      kljuc,
      akcija: "izmjena",
      stariRacun: stariDigits,
      noviRacun: noviDigits,
      izvor,
      userId: req.user.id,
      userEmail: user ? user.email : null,
    });

    await racuni.osvjezi();
    return res.json({
      ok: true,
      data: { kljuc, racun: noviDigits, racunPrikaz: racuni.formatAccountDashed(noviDigits) },
    });
  } catch (err) {
    console.error("adminIzmjena uplatnog računa:", err);
    return res.status(500).json({ ok: false, error: "Izmjena nije snimljena." });
  }
}

// ── Admin: "provjereno, bez izmjene" ────────────────────────────────────────
async function adminProvjera(req, res) {
  try {
    const kljuc = String(req.params.kljuc || "");
    const red = await UplatniRacun.findOne({ where: { kljuc } });
    if (!red) {
      return res.status(404).json({ ok: false, error: "Nepoznat slot računa." });
    }
    const user = await User.findByPk(req.user.id, { attributes: ["id", "email"] });
    red.datumProvjere = new Date().toISOString().slice(0, 10);
    await red.save();
    await UplatniRacunLog.create({
      kljuc,
      akcija: "provjera",
      stariRacun: String(red.racun),
      noviRacun: String(red.racun),
      izvor: null,
      userId: req.user.id,
      userEmail: user ? user.email : null,
    });
    await racuni.osvjezi();
    return res.json({ ok: true, data: { kljuc, datumProvjere: red.datumProvjere } });
  } catch (err) {
    console.error("adminProvjera uplatnog računa:", err);
    return res.status(500).json({ ok: false, error: "Provjera nije snimljena." });
  }
}

// ── Admin: audit log jednog slota ───────────────────────────────────────────
async function adminLog(req, res) {
  try {
    const kljuc = String(req.params.kljuc || "");
    const rows = await UplatniRacunLog.findAll({
      where: { kljuc },
      order: [["id", "DESC"]],
      limit: 100,
      raw: true,
    });
    return res.json({
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        akcija: r.akcija,
        stariRacun: r.stariRacun ? racuni.formatAccountDashed(r.stariRacun) : null,
        noviRacun: r.noviRacun ? racuni.formatAccountDashed(r.noviRacun) : null,
        izvor: r.izvor,
        userEmail: r.userEmail,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("adminLog uplatnih računa:", err);
    return res.status(500).json({ ok: false, error: "Greška pri čitanju historije." });
  }
}

module.exports = { javniSifarnik, adminLista, adminIzmjena, adminProvjera, adminLog };
