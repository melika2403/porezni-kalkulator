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

// ── Greške ───────────────────────────────────────────────────────────────────
// Sequelize omota MySQL grešku, pa gola poruka u logu ne kaže ništa (stack bez
// ijednog detalja). Ovdje se izvlači ono po čemu se uzrok stvarno prepoznaje:
// sqlMessage, kod (ER_*) i početak upita.
function opisGreske(e) {
  const p = e?.parent || e?.original;
  const o = { msg: p?.sqlMessage || e?.message || String(e) };
  if (p?.code || e?.name) o.code = p?.code || e?.name;
  if (p?.sql) o.sql = String(p.sql).slice(0, 300);
  return o;
}
function logGreska(kontekst, e, dodatno = {}) {
  console.error(`notifikacije: ${kontekst}`, { ...dodatno, ...opisGreske(e) });
}

// notifPrefs je JSON kolona, ali samo čitanje umije puknuti (getter radi
// JSON.parse nad sadržajem koji nije validan JSON — npr. red iz vremena kad je
// kolona bila TEXT). Bez ovoga jedan pokvaren red obori cijeli dnevni job.
function citajPrefs(instanca) {
  let raw;
  try {
    raw = instanca?.notifPrefs;
  } catch (e) {
    logGreska("notifPrefs se ne može pročitati", e, { id: instanca?.id });
    return null;
  }
  // neki drajveri vrate JSON kolonu kao string; spread stringa bi dao {0:'{',…}
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
}

function orgPrefs(member) {
  return { ...ORG_PREF_DEFAULTS, ...(citajPrefs(member) || {}) };
}
function userPrefs(user) {
  return { ...USER_PREF_DEFAULTS, ...(citajPrefs(user) || {}) };
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
// cekaRetry: runDaily po ovome zna da dan NIJE gotov iako nijedan posao nije
// pukao — bez toga bi marker dana zaključao dan i poništeni dedup se nikad ne bi
// iskoristio (a za rokoviJob, koji radi samo 7. i 10., to znači zauvijek).
let cekaRetry = false;

async function ponistiDedup(userId, type, periodKey) {
  try {
    await NotificationLog.destroy({ where: { userId, type, periodKey } });
    cekaRetry = true;
  } catch (e) {
    logGreska("poništavanje dedup-a nije uspjelo", e, { userId, type, periodKey });
  }
}

// ── In-app ───────────────────────────────────────────────────────────────────
// Nikad ne baca: in-app je sekundarni kanal (email je u tom trenutku već otišao),
// pa pad upisa ne smije srušiti dnevni job. Vraća da li je zapis stvarno upisan,
// jer o tome ovisi treba li poništiti dedup i pokušati ponovo.
async function pushInApp({ userId, organizationId = null, type, title, body, link }) {
  try {
    await UserNotification.create({
      userId,
      organizationId,
      type,
      title: String(title).slice(0, 255),
      body: body || null,
      link: link || null,
    });
    return true;
  } catch (e) {
    logGreska("in-app zapis nije upisan", e, { userId, organizationId, type });
    return false;
  }
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
    try {
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
      const inAppOk =
        inAppLinije.length > 0 &&
        (await pushInApp({
          userId: user.id,
          type: "ROKOVI",
          title: naslov,
          body: inAppLinije.join("\n"),
          link: "/app/dashboard",
        }));
      // ništa nije stvarno dostavljeno -> retry sljedeći put
      if (!emailOk && !inAppOk) {
        await ponistiDedup(user.id, "ROKOVI", `${ym}:d${day}`);
      }
    } catch (e) {
      logGreska("rokoviJob: korisnik preskočen", e, { userId: user.id });
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
    try {
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
      const emailOk = await posaljiEmailSigurno({
        to: user.email,
        subject: naslov,
        title: naslov,
        lines: linije,
        ctaUrl: `${FRONTEND}/app/obracuni-plata`,
        ctaLabel: "Otvori obračune plata",
      });
      const inAppOk = await pushInApp({
        userId: user.id,
        type: tip,
        title: naslov,
        body: linije.join("\n"),
        link: "/app/obracuni-plata",
      });
      if (!emailOk && !inAppOk) await ponistiDedup(user.id, tip, ym);
    } catch (e) {
      logGreska("plateJob: korisnik preskočen", e, { userId: user.id });
    }
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
    try {
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
      const emailOk = await posaljiEmailSigurno({
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
      const inAppOk = await pushInApp({
        userId: user.id,
        type: tip,
        title: naslov,
        body: orgNames.join(", "),
        link: month === 1 ? "/app/obracuni-plata" : "/app/obrasci",
      });
      if (!emailOk && !inAppOk) {
        await ponistiDedup(user.id, tip, String(prevYear));
      }
    } catch (e) {
      logGreska("godisnjiJob: korisnik preskočen", e, { userId: user.id });
    }
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
    try {
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
    } catch (e) {
      logGreska("digestJob: korisnik preskočen", e, { userId: user.id });
    }
  }
}

// ── 5) Istek pretplate ──────────────────────────────────────────────────────
// Godišnja: 30 dana, 7 dana i na dan isteka. Mjesečna: 3 dana i na dan isteka
// (godišnja najava od mjesec dana nema smisla za paket koji traje mjesec).
// Pretplate bez upisanog ciklusa se vode kao godišnje, jer to i jesu.
// Probe se ovdje NE šalju: PK Office probu pokriva officeProbaJob ispod.
const DANI_PODSJETNIKA = { yearly: [30, 7, 0], monthly: [3, 0] };

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
    try {
      await pretplataZaJednu(sub, todayMs);
    } catch (e) {
      logGreska("pretplataJob: pretplata preskočena", e, { subId: sub?.id });
    }
  }
}

async function pretplataZaJednu(sub, todayMs) {
  if (sub.isTrial) return;
  const endStr = String(sub.endDate).slice(0, 10);
  const daysLeft = Math.round(
    (new Date(`${endStr}T00:00:00`).getTime() - todayMs) / 86400000,
  );
  const ciklus =
    String(sub.billingCycle || "").toLowerCase() === "monthly"
      ? "monthly"
      : "yearly";
  if (!DANI_PODSJETNIKA[ciklus].includes(daysLeft)) return;
  const u = sub.User;
  if (!u?.email) return;
  if (!(await prviPut(u.id, "PRETPLATA", `${endStr}:d${daysLeft}`))) return;

  const [y, m, d] = endStr.split("-");
  // subscriptions.plan je lowercase ('pro','business','office_10'), pa se
  // poređenje mora raditi malim slovima. Office paketi u mailu idu kao
  // "PK Office", a rola je rezerva za redove bez upisanog plana.
  const planKey = String(sub.plan || "").toLowerCase();
  const planForMail = planKey.startsWith("office")
    ? "PK Office"
    : planKey === "pro" || planKey === "business"
      ? planKey.toUpperCase()
      : u.role === "PRO" || u.role === "BUSINESS"
        ? u.role
        : null;
  try {
    await sendSubscriptionReminderEmail(u.email, u.firstName || "korisniče", {
      plan: planForMail,
      endDateStr: `${d}.${m}.${y}.`,
      renewUrl: `${FRONTEND}/profil?tab=pretplata`,
      daysLeft,
      isTrial: false,
    });
  } catch (e) {
    logGreska("pretplata email nije poslan", e, { userId: u.id });
    // jedini kanal za istek pretplate: na neuspjeh vrati dedup da se ponovi
    await ponistiDedup(u.id, "PRETPLATA", `${endStr}:d${daysLeft}`);
  }
}

// ── 6) Istek PK Office probe (7 dana prije i na dan isteka) ─────────────────
// Proba ne živi u tabeli pretplata nego na users.pkOfficeTrialEndsAt, pa je
// pretplataJob ne vidi. Bez ovoga korisnik izgubi pristup modulima bez ijedne
// najave. Preskačemo one koji su u međuvremenu kupili office paket, njima
// proba više ništa ne znači.
const DANI_PROBE = [7, 0];

async function officeProbaJob(now) {
  const todayMs = new Date(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T00:00:00`,
  ).getTime();
  // samo probe u prozoru koji nas zanima (danas do +8 dana), da job ne vuče
  // sve korisnike koji su ikad imali probu
  const korisnici = await User.findAll({
    where: {
      pkOfficeTrialEndsAt: {
        [Op.gte]: new Date(todayMs),
        [Op.lt]: new Date(todayMs + 8 * 86400000),
      },
    },
    attributes: ["id", "email", "firstName", "pkOfficeTrialEndsAt"],
  });
  if (korisnici.length === 0) return;

  // ko već ima aktivan office paket (kupio prije isteka probe)
  const paketi = await Subscription.findAll({
    where: {
      userId: { [Op.in]: korisnici.map((u) => u.id) },
      isActive: true,
      plan: { [Op.like]: "office%" },
    },
    attributes: ["userId", "endDate"],
    raw: true,
  });
  const saPaketom = new Set(
    paketi
      .filter((s) => !s.endDate || new Date(s.endDate).getTime() >= todayMs)
      .map((s) => s.userId),
  );

  for (const u of korisnici) {
    try {
      if (!u.email || saPaketom.has(u.id)) continue;
      // lokalni datum (isto kao ostali jobovi), ne UTC preko toISOString
      const kraj = new Date(u.pkOfficeTrialEndsAt);
      const endStr = `${kraj.getFullYear()}-${String(kraj.getMonth() + 1).padStart(2, "0")}-${String(kraj.getDate()).padStart(2, "0")}`;
      const daysLeft = Math.round(
        (new Date(`${endStr}T00:00:00`).getTime() - todayMs) / 86400000,
      );
      if (!DANI_PROBE.includes(daysLeft)) continue;
      if (!(await prviPut(u.id, "OFFICE_PROBA", `${endStr}:d${daysLeft}`))) continue;

      const [y, m, d] = endStr.split("-");
      const datum = `${d}.${m}.${y}.`;
      const danas = daysLeft === 0;
      const ok = await posaljiEmailSigurno({
        to: u.email,
        subject: danas
          ? "PK Office proba ističe danas"
          : "PK Office proba ističe za 7 dana",
        title: danas
          ? "Probni period ističe danas"
          : "Probni period ističe za 7 dana",
        intro: danas
          ? `Zdravo ${u.firstName || "korisniče"}, vaš probni period ističe danas (${datum}). Svi podaci koje ste unijeli (obrti, izvodi, knjige, fakture, plate) ostaju sačuvani, ali pristup PK Office modulima i Business funkcijama prestaje dok ne aktivirate paket.`
          : `Zdravo ${u.firstName || "korisniče"}, vaš probni period ističe ${datum}. Uz njega koristite PK Office i sve Business funkcije. Ako želite nastaviti bez prekida, zatražite predračun za paket po broju obrta; sve što ste unijeli ostaje na svom mjestu.`,
        ctaUrl: `${FRONTEND}/pretplate#pk-office`,
        ctaLabel: "Pogledaj PK Office pakete",
      });
      // email je jedini kanal za ovo: na neuspjeh vrati dedup, da se pokuša opet
      if (!ok) await ponistiDedup(u.id, "OFFICE_PROBA", `${endStr}:d${daysLeft}`);
    } catch (e) {
      logGreska("officeProbaJob: korisnik preskočen", e, { userId: u.id });
    }
  }
}

// ── Dnevni job (poziva ga scheduler u 08:00) ────────────────────────────────
// Marker uspješno završenog dana leži u notification_log kao sistemski red
// (userId 0; tabela nema FK na users). Piše se TEK ako nijedan posao nije pao,
// pa restart poslije djelimičnog pada ponovi ono što nije prošlo, a dedup po
// korisniku i dalje čuva od duplog slanja.
const RUN_MARKER_USER = 0;
const RUN_MARKER_TYPE = "RUN_DAILY";
// Brojač pokušaja mora biti u BAZI, ne u modulu: Passenger respawna proces
// stalno, pa bi brojač u memoriji svaki put krenuo od nule i trajna greška
// (npr. jedna adresa koja uvijek bounce-uje) bi vrtjela pune prolaze bez kraja.
const RUN_TRY_TYPE = "RUN_TRY";
const MAX_POKUSAJA = 5;

function danKljuc(now) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Redni broj današnjeg pokušaja. Paralelni procesi mogu dobiti isti broj (upis
// tada padne na unique indeksu i prviPut vrati false) — to je prihvatljivo, ovo
// je sigurnosna granica a ne precizna evidencija.
async function zabiljeziPokusaj(dayKey) {
  try {
    const dosad = await NotificationLog.count({
      where: {
        userId: RUN_MARKER_USER,
        type: RUN_TRY_TYPE,
        periodKey: { [Op.like]: `${dayKey}:%` },
      },
    });
    await prviPut(RUN_MARKER_USER, RUN_TRY_TYPE, `${dayKey}:${dosad + 1}`);
    return dosad + 1;
  } catch (e) {
    // bez brojača radimo kao da je ovo zadnji pokušaj: radije jednom propustiti
    // retry nego riskirati beskonačno vrtenje
    logGreska("brojanje pokušaja nije uspjelo", e, { dayKey });
    return MAX_POKUSAJA;
  }
}

async function dnevniJobUradjen(dayKey) {
  try {
    const red = await NotificationLog.findOne({
      where: {
        userId: RUN_MARKER_USER,
        type: RUN_MARKER_TYPE,
        periodKey: dayKey,
      },
      attributes: ["id"],
    });
    return Boolean(red);
  } catch (e) {
    // pad provjere ne smije zaustaviti job; dedup po korisniku ionako štiti
    logGreska("provjera dnevnog markera nije uspjela", e, { dayKey });
    return false;
  }
}

async function runDaily(now = new Date()) {
  const dayKey = danKljuc(now);
  if (await dnevniJobUradjen(dayKey)) return true;

  const pokusaj = await zabiljeziPokusaj(dayKey);
  cekaRetry = false;
  const clanstva = await loadClanstva();
  const korisnici = poKorisniku(clanstva);
  const poslovi = [
    ["rokovi", () => rokoviJob(now, korisnici)],
    ["plate", () => plateJob(now, korisnici)],
    ["godisnji", () => godisnjiJob(now, korisnici)],
    ["digest", () => digestJob(now, korisnici)],
    ["pretplata", () => pretplataJob(now)],
    ["officeProba", () => officeProbaJob(now)],
  ];

  // Jedan posao koji padne ne smije oboriti ostale: bez ovoga je npr. pad na
  // plateJob značio da tog dana nisu otišli ni godišnji rokovi, ni digest, ni
  // podsjetnici za istek pretplate i PK Office probe.
  const pali = [];
  for (const [ime, fn] of poslovi) {
    try {
      await fn();
    } catch (e) {
      pali.push(ime);
      logGreska(`posao "${ime}" pao`, e, { dayKey });
    }
  }

  const razlog = pali.length
    ? `pali poslovi: ${pali.join(", ")}`
    : cekaRetry
      ? "neka dostava čeka ponovni pokušaj"
      : null;
  if (razlog && pokusaj < MAX_POKUSAJA) {
    console.warn(
      `notifikacije: dnevni job ${dayKey} (pokušaj ${pokusaj}/${MAX_POKUSAJA}) — ${razlog}; marker nije upisan, ponoviće se`,
    );
    return false;
  }
  if (razlog) {
    // marker se svejedno upisuje: dan se zaključava da se ne vrti u nedogled
    console.error(
      `notifikacije: dnevni job ${dayKey} odustaje nakon ${MAX_POKUSAJA} pokušaja — ${razlog}`,
    );
  }
  await prviPut(RUN_MARKER_USER, RUN_MARKER_TYPE, dayKey);
  return true;
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
      // pushInApp sam hvata i loguje svoj pad
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
    logGreska("izvod event", e, { organizationId });
  }
}

module.exports = {
  ORG_PREF_DEFAULTS,
  USER_PREF_DEFAULTS,
  orgPrefs,
  userPrefs,
  citajPrefs,
  runDaily,
  logGreska,
  podrskaOfflineEmail,
  izvodUcitanEvent,
};
