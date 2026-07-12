// Sistemske notifikacije (email + in-app): postavke po članu obrta, dedup
// log poslanih, i dnevni job koji šalje podsjetnike. Pravila protiv spama:
//   • sve zbirno PO KORISNIKU (knjigovođa sa 30 obrta dobije JEDAN email),
//   • podsjetnik za rok se šalje SAMO ako obaveza nije izmirena,
//   • dedup log garantuje da se isti (user, type, period) nikad ne šalje dvaput,
//     pa je job idempotentan (smije se ponoviti / preživjeti restart).
const { Op } = require("sequelize");
const {
  User,
  Organization,
  OrganizationMember,
  UserNotification,
  NotificationLog,
  Worker,
  Payroll,
  Form,
  Subscription,
  Invoice,
  BankStatement,
  BankTransaction,
} = require("../models/index");
const { computeObligations, MJESECI } = require("./obligationsService");
const {
  sendNotifikacijaEmail,
  sendSubscriptionReminderEmail,
} = require("../utils/mailer");

const FRONTEND =
  process.env.FRONTEND_URL || "https://www.poreznikalkulator.ba";

// ── Postavke ─────────────────────────────────────────────────────────────────
// Default: SVE uključeno. Svaka notifikacija je ili vezana za zakonski rok,
// ili se šalje samo kad stvarno ima sadržaja (digest), pa nema spama.
const ORG_PREF_DEFAULTS = {
  doprinosiDeadline: true,
  pdvDeadline: true,
  plateReminder: true,
  godisnjiRokovi: true,
  digest: true,
  inApp: true,
};
const USER_PREF_DEFAULTS = {
  podrskaEmail: true,
};

function orgPrefs(member) {
  return { ...ORG_PREF_DEFAULTS, ...(member?.notifPrefs || {}) };
}
function userPrefs(user) {
  return { ...USER_PREF_DEFAULTS, ...(user?.notifPrefs || {}) };
}

// ── Dedup ────────────────────────────────────────────────────────────────────
// true = prvi put (zabilježeno), false = već poslano (preskoči).
async function prviPut(userId, type, periodKey) {
  try {
    const [, created] = await NotificationLog.findOrCreate({
      where: { userId, type, periodKey },
      defaults: { userId, type, periodKey },
    });
    return created;
  } catch (e) {
    // paralelan upis istog ključa (unique index) = već poslano
    if (e && e.name === "SequelizeUniqueConstraintError") return false;
    throw e;
  }
}

// Poništi dedup zapis kad dostava potpuno padne (tranzijentni SMTP, bez in-app
// fallbacka), da se notifikacija pokuša ponovo na sljedećem ticku umjesto da se
// trajno izgubi.
async function ponistiDedup(userId, type, periodKey) {
  try {
    await NotificationLog.destroy({ where: { userId, type, periodKey } });
  } catch (e) {
    console.warn("notifikacije: poništavanje dedup-a nije uspjelo:", e?.message || e);
  }
}

// ── In-app ───────────────────────────────────────────────────────────────────
async function pushInApp({ userId, organizationId = null, type, title, body, link }) {
  await UserNotification.create({
    userId,
    organizationId,
    type,
    title: String(title).slice(0, 255),
    body: body || null,
    link: link || null,
  });
}

// ── Podaci za job ────────────────────────────────────────────────────────────
// Sva članstva u BUSINESS (obrt) organizacijama, sa korisnikom i orgom.
async function loadClanstva() {
  return OrganizationMember.findAll({
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "email", "firstName", "notifPrefs", "isEmailVerified"],
        required: true,
      },
      {
        model: Organization,
        as: "organization",
        attributes: ["id", "name", "type", "isPdvObveznik"],
        required: true,
        where: { type: "BUSINESS" },
      },
    ],
  });
}

// grupisanje članstava po korisniku: Map<userId, { user, clanstva: [...] }>
function poKorisniku(clanstva) {
  const m = new Map();
  for (const c of clanstva) {
    const u = c.user;
    if (!u?.email) continue;
    const cur = m.get(u.id) || { user: u, clanstva: [] };
    cur.clanstva.push(c);
    m.set(u.id, cur);
  }
  return m;
}

async function posaljiEmailSigurno(opts) {
  try {
    await sendNotifikacijaEmail(opts);
    return true;
  } catch (e) {
    console.warn("notifikacije: email nije poslan:", e?.message || e);
    return false;
  }
}

// ── 1) Rokovi plaćanja (7. i 10. u mjesecu) ─────────────────────────────────
async function rokoviJob(now, korisnici) {
  const day = now.getDate();
  if (day !== 7 && day !== 10) return;
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rokLabel = `10.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}.`;

  // obaveze po organizaciji (jednom po orgu, ne po članu)
  const cacheObaveza = new Map();
  async function obavezeZa(orgId) {
    if (!cacheObaveza.has(orgId)) {
      cacheObaveza.set(orgId, await computeObligations(orgId, now));
    }
    return cacheObaveza.get(orgId);
  }

  for (const { user, clanstva } of korisnici.values()) {
    const linije = [];
    // in-app linije SAMO za obrte kojima je korisnik ostavio inApp uključen
    // (email ide zbirno, ali u Inboxu ne smiju iskrsnuti obrti sa inApp=false)
    const inAppLinije = [];
    for (const c of clanstva) {
      const prefs = orgPrefs(c);
      if (!prefs.doprinosiDeadline && !prefs.pdvDeadline) continue;
      const data = await obavezeZa(c.organization.id);
      if (!data) continue;
      const otvorene = data.items.filter((it) => {
        if (it.done) return false;
        return it.id === "pdv" ? prefs.pdvDeadline : prefs.doprinosiDeadline;
      });
      if (otvorene.length === 0) continue;
      const linija = `${c.organization.name}: ${otvorene.map((it) => it.title).join(", ")}`;
      linije.push(linija);
      if (prefs.inApp) inAppLinije.push(linija);
    }
    if (linije.length === 0) continue;
    if (!(await prviPut(user.id, "ROKOVI", `${ym}:d${day}`))) continue;

    const naslov =
      day === 7
        ? `Rok se bliži: uplate do ${rokLabel}`
        : `Danas je rok: uplate do ${rokLabel}`;
    const emailOk = await posaljiEmailSigurno({
      to: user.email,
      subject: naslov,
      title: naslov,
      intro:
        "Prema izvodima još nije evidentirana uplata za sljedeće obaveze:",
      lines: linije,
      ctaUrl: `${FRONTEND}/app/dashboard`,
      ctaLabel: "Otvori PK Office",
    });
    if (inAppLinije.length) {
      await pushInApp({
        userId: user.id,
        type: "ROKOVI",
        title: naslov,
        body: inAppLinije.join("\n"),
        link: "/app/dashboard",
      });
    }
    // ništa nije stvarno dostavljeno (email pao, nema in-app) -> retry sljedeći put
    if (!emailOk && inAppLinije.length === 0) {
      await ponistiDedup(user.id, "ROKOVI", `${ym}:d${day}`);
    }
  }
}

// ── 2) Plate (5.) i MIP (12.) za prethodni mjesec ───────────────────────────
async function plateJob(now, korisnici) {
  const day = now.getDate();
  if (day !== 5 && day !== 12) return;

  let py = now.getFullYear();
  let pm = now.getMonth(); // prethodni mjesec 1-12
  if (pm === 0) {
    pm = 12;
    py -= 1;
  }
  const prevName = MJESECI[pm - 1];
  const ym = `${py}-${String(pm).padStart(2, "0")}`;

  // status po orgu: ima li radnika, ima li obračuna, je li MIP preuzet
  const orgIds = new Set();
  for (const { clanstva } of korisnici.values()) {
    for (const c of clanstva) orgIds.add(c.organization.id);
  }
  const ids = [...orgIds];
  if (ids.length === 0) return;

  const radnici = await Worker.findAll({
    where: {
      organizationId: { [Op.in]: ids },
      employmentStatus: { [Op.ne]: "ODJAVLJEN" },
    },
    attributes: ["organizationId"],
    raw: true,
  });
  const imaRadnika = new Set(radnici.map((r) => r.organizationId));

  const payrolls = await Payroll.findAll({
    where: { organizationId: { [Op.in]: ids }, year: py, month: pm },
    attributes: ["organizationId", "mipDownloadedAt"],
    raw: true,
  });
  const imaObracun = new Set(payrolls.map((p) => p.organizationId));
  const mipPreuzet = new Set(
    payrolls.filter((p) => p.mipDownloadedAt).map((p) => p.organizationId),
  );

  for (const { user, clanstva } of korisnici.values()) {
    const linije = [];
    for (const c of clanstva) {
      if (!orgPrefs(c).plateReminder) continue;
      const oid = c.organization.id;
      if (!imaRadnika.has(oid)) continue;
      if (day === 5 && !imaObracun.has(oid)) {
        linije.push(`${c.organization.name}: plate za ${prevName} nisu obračunate`);
      }
      if (day === 12 && imaObracun.has(oid) && !mipPreuzet.has(oid)) {
        linije.push(
          `${c.organization.name}: MIP-1023 za ${prevName} nije preuzet`,
        );
      }
    }
    if (linije.length === 0) continue;
    const tip = day === 5 ? "PLATE" : "MIP";
    if (!(await prviPut(user.id, tip, ym))) continue;

    const naslov =
      day === 5
        ? `Plate za ${prevName} još nisu obračunate`
        : `MIP-1023 za ${prevName} još nije preuzet`;
    await posaljiEmailSigurno({
      to: user.email,
      subject: naslov,
      title: naslov,
      lines: linije,
      ctaUrl: `${FRONTEND}/app/obracuni-plata`,
      ctaLabel: "Otvori obračune plata",
    });
    await pushInApp({
      userId: user.id,
      type: tip,
      title: naslov,
      body: linije.join("\n"),
      link: "/app/obracuni-plata",
    });
  }
}

// ── 3) Godišnji rokovi: GIP (20.01.) i GPD/SPR (20.03.) ─────────────────────
async function godisnjiJob(now, korisnici) {
  const day = now.getDate();
  const month = now.getMonth() + 1;
  if (day !== 20 || (month !== 1 && month !== 3)) return;
  const prevYear = now.getFullYear() - 1;

  // GPD se preskače orgu koji već ima spremljen GPD za prošlu godinu
  let imaGpd = new Set();
  if (month === 3) {
    const forms = await Form.findAll({
      where: { type: "GPD", year: prevYear },
      attributes: ["organizationId"],
      raw: true,
    });
    imaGpd = new Set(forms.map((f) => f.organizationId));
  }

  for (const { user, clanstva } of korisnici.values()) {
    const orgNames = [];
    for (const c of clanstva) {
      if (!orgPrefs(c).godisnjiRokovi) continue;
      if (month === 3 && imaGpd.has(c.organization.id)) continue;
      orgNames.push(c.organization.name);
    }
    if (orgNames.length === 0) continue;
    const tip = month === 1 ? "GIP" : "GPD";
    if (!(await prviPut(user.id, tip, String(prevYear)))) continue;

    const naslov =
      month === 1
        ? `GIP-1022 za ${prevYear}. se predaje do 31.01.`
        : `Godišnja prijava (GPD sa SPR-om) za ${prevYear}. se predaje do 31.03.`;
    await posaljiEmailSigurno({
      to: user.email,
      subject: naslov,
      title: naslov,
      intro: "Podsjetnik za obrte koje vodite:",
      lines: orgNames,
      ctaUrl:
        month === 1
          ? `${FRONTEND}/prijave-radnika?tab=obracun`
          : `${FRONTEND}/app/obrasci`,
      ctaLabel: month === 1 ? "Otvori obračun plata" : "Otvori obrasce",
    });
    await pushInApp({
      userId: user.id,
      type: tip,
      title: naslov,
      body: orgNames.join(", "),
      link: month === 1 ? "/app/obracuni-plata" : "/app/obrasci",
    });
  }
}

// ── 4) Sedmični digest (ponedjeljak): nepovezane transakcije, dospjele
//      fakture, stari izvodi. Šalje se samo ako ima nečega. ─────────────────
async function digestJob(now, korisnici) {
  if (now.getDay() !== 1) return; // ponedjeljak
  const danKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const today = danKey;
  const prije30 = new Date(now.getTime() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const orgIds = new Set();
  for (const { clanstva } of korisnici.values()) {
    for (const c of clanstva) orgIds.add(c.organization.id);
  }
  const ids = [...orgIds];
  if (ids.length === 0) return;

  // nepovezane transakcije po orgu
  const unmatched = await BankTransaction.findAll({
    where: { organizationId: { [Op.in]: ids }, status: "UNMATCHED" },
    attributes: ["organizationId"],
    raw: true,
  });
  const unmatchedByOrg = new Map();
  for (const t of unmatched) {
    unmatchedByOrg.set(
      t.organizationId,
      (unmatchedByOrg.get(t.organizationId) || 0) + 1,
    );
  }

  // dospjele nenaplaćene fakture (KO/storno umanjuju, ista konvencija kao kartica)
  const dospjele = await Invoice.findAll({
    where: {
      organizationId: { [Op.in]: ids },
      type: "INVOICE",
      status: "ISSUED",
      dueDate: { [Op.lt]: today },
    },
    attributes: ["organizationId", "grossTotal", "docType"],
    raw: true,
  });
  const dospjeleByOrg = new Map();
  for (const inv of dospjele) {
    const sign =
      inv.docType === "KNJIZNA_OBAVIJEST" || inv.docType === "STORNO_AVANSNE"
        ? -1
        : 1;
    dospjeleByOrg.set(
      inv.organizationId,
      (dospjeleByOrg.get(inv.organizationId) || 0) +
        sign * (Number(inv.grossTotal) || 0),
    );
  }

  // zadnji izvod po orgu (upozorenje ako je stariji od 30 dana)
  const statements = await BankStatement.findAll({
    where: { organizationId: { [Op.in]: ids } },
    attributes: ["organizationId", "statementDate"],
    raw: true,
  });
  const zadnjiIzvod = new Map();
  for (const s of statements) {
    if (!s.statementDate) continue;
    const cur = zadnjiIzvod.get(s.organizationId);
    if (!cur || s.statementDate > cur) {
      zadnjiIzvod.set(s.organizationId, s.statementDate);
    }
  }

  const fmtKm = (n) =>
    n.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const fmtDatum = (iso) => {
    const [y, m, d] = String(iso).slice(0, 10).split("-");
    return `${d}.${m}.${y}.`;
  };

  for (const { user, clanstva } of korisnici.values()) {
    const linije = [];
    for (const c of clanstva) {
      if (!orgPrefs(c).digest) continue;
      const oid = c.organization.id;
      const ime = c.organization.name;
      const nep = unmatchedByOrg.get(oid) || 0;
      if (nep > 0) linije.push(`${ime}: ${nep} nepovezanih transakcija čeka pregled`);
      const dug = dospjeleByOrg.get(oid) || 0;
      if (dug > 0.005) linije.push(`${ime}: kupci duguju ${fmtKm(dug)} KM preko roka`);
      const zadnji = zadnjiIzvod.get(oid);
      if (zadnji && String(zadnji).slice(0, 10) < prije30) {
        linije.push(`${ime}: zadnji izvod je od ${fmtDatum(zadnji)}`);
      }
    }
    if (linije.length === 0) continue;
    if (!(await prviPut(user.id, "DIGEST", danKey))) continue;

    const emailOk = await posaljiEmailSigurno({
      to: user.email,
      subject: "Sedmični pregled: šta čeka vašu pažnju",
      title: "Sedmični pregled",
      intro: "Stanje po obrtima na početku sedmice:",
      lines: linije,
      ctaUrl: `${FRONTEND}/app/dashboard`,
      ctaLabel: "Otvori PK Office",
    });
    // digest nema in-app fallback: na neuspjeh vrati dedup da se pokuša ponovo
    if (!emailOk) await ponistiDedup(user.id, "DIGEST", danKey);
  }
}

// ── 5) Istek pretplate (7 i 1 dan prije) ────────────────────────────────────
async function pretplataJob(now) {
  const todayMs = new Date(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T00:00:00`,
  ).getTime();
  const subs = await Subscription.findAll({
    where: { isActive: true, endDate: { [Op.ne]: null } },
    // Subscription.belongsTo(User) je bez aliasa → sub.User
    include: [
      {
        model: User,
        attributes: ["id", "email", "firstName", "role"],
        required: true,
      },
    ],
  });
  for (const sub of subs) {
    const endStr = String(sub.endDate).slice(0, 10);
    const daysLeft = Math.round(
      (new Date(`${endStr}T00:00:00`).getTime() - todayMs) / 86400000,
    );
    if (daysLeft !== 7 && daysLeft !== 1) continue;
    const u = sub.User;
    if (!u?.email) continue;
    if (!(await prviPut(u.id, "PRETPLATA", `${endStr}:d${daysLeft}`))) continue;

    const isTrial = Boolean(sub.isTrial);
    const [y, m, d] = endStr.split("-");
    const planForMail =
      sub.plan === "PRO" || sub.plan === "BUSINESS"
        ? sub.plan
        : u.role === "PRO" || u.role === "BUSINESS"
          ? u.role
          : null;
    try {
      await sendSubscriptionReminderEmail(u.email, u.firstName || "korisniče", {
        plan: planForMail,
        endDateStr: `${d}.${m}.${y}.`,
        renewUrl: isTrial
          ? `${FRONTEND}/pretplate`
          : `${FRONTEND}/profil?tab=pretplata`,
        daysLeft,
        isTrial,
      });
    } catch (e) {
      console.warn("notifikacije: pretplata email nije poslan:", e?.message || e);
      // jedini kanal za istek pretplate: na neuspjeh vrati dedup da se ponovi
      await ponistiDedup(u.id, "PRETPLATA", `${endStr}:d${daysLeft}`);
    }
  }
}

// ── Dnevni job (poziva ga scheduler u 08:00) ────────────────────────────────
async function runDaily(now = new Date()) {
  const clanstva = await loadClanstva();
  const korisnici = poKorisniku(clanstva);
  await rokoviJob(now, korisnici);
  await plateJob(now, korisnici);
  await godisnjiJob(now, korisnici);
  await digestJob(now, korisnici);
  await pretplataJob(now);
}

// ── Event: podrška odgovorila dok korisnik nije online ──────────────────────
// Zove socket sloj (on zna presence). Dedup po (tiket, zadnje čitanje):
// najviše jedan email po "nepročitanoj sesiji" razgovora.
async function podrskaOfflineEmail({ ticket, ownerOnline }) {
  if (ownerOnline) return;
  const u = await User.findByPk(ticket.userId, {
    attributes: ["id", "email", "firstName", "notifPrefs"],
  });
  if (!u?.email) return;
  if (!userPrefs(u).podrskaEmail) return;
  const readKey = ticket.userLastReadAt
    ? new Date(ticket.userLastReadAt).toISOString()
    : "nikad";
  if (!(await prviPut(u.id, "PODRSKA", `t${ticket.id}:${readKey}`.slice(0, 64)))) {
    return;
  }
  await posaljiEmailSigurno({
    to: u.email,
    subject: "Podrška vam je odgovorila",
    title: "Podrška vam je odgovorila",
    intro: `Imate novi odgovor u razgovoru "${ticket.subject}".`,
    ctaUrl: `${FRONTEND}/app/inbox?tab=podrska`,
    ctaLabel: "Otvori razgovor",
  });
}

// ── Event: kolega učitao izvod (in-app ostalim članovima obrta) ─────────────
async function izvodUcitanEvent({ organizationId, uploadedById, statement }) {
  try {
    const clanovi = await OrganizationMember.findAll({
      where: { organizationId, userId: { [Op.ne]: uploadedById } },
      include: [
        {
          model: Organization,
          as: "organization",
          attributes: ["id", "name"],
          required: true,
        },
      ],
    });
    if (clanovi.length === 0) return;
    const uploader = await User.findByPk(uploadedById, {
      attributes: ["firstName", "lastName"],
    });
    const ko = uploader
      ? `${uploader.firstName || ""} ${uploader.lastName || ""}`.trim()
      : "Kolega";
    for (const c of clanovi) {
      if (!orgPrefs(c).inApp) continue;
      await pushInApp({
        userId: c.userId,
        organizationId,
        type: "IZVOD",
        title: `Novi izvod za ${c.organization.name}`,
        body: `${ko} je učitao izvod${statement?.statementNumber ? ` br. ${statement.statementNumber}` : ""}${statement?.bankName ? ` (${statement.bankName})` : ""}.`,
        link: "/app/bankovni-izvodi",
      });
    }
  } catch (e) {
    // notifikacija nikad ne smije srušiti upload
    console.warn("notifikacije: izvod event:", e?.message || e);
  }
}

module.exports = {
  ORG_PREF_DEFAULTS,
  USER_PREF_DEFAULTS,
  orgPrefs,
  userPrefs,
  runDaily,
  podrskaOfflineEmail,
  izvodUcitanEvent,
};
