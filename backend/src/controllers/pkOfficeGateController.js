// PK Office pristup po Office paketima: ko ima pristup (pretplata ili trial),
// koliko obrta smije voditi (slotovi) i aktivacija/deaktivacija obrta.
//
// Ponašanje je iza env prekidača PK_OFFICE_NAPLATA: dok nije "true", svi
// prijavljeni imaju pun pristup bez limita (kao prije naplate), a slot UI se
// na frontendu ne prikazuje. Launch naplate = PK_OFFICE_NAPLATA=true.
//
// Pravila (dogovorena):
//  - Office paket daje maxObrta slotova; obrt se EKSPLICITNO aktivira.
//  - Deaktivacija oslobađa slot tek od narednog mjeseca (obrt deaktiviran u
//    tekućem mjesecu i dalje zauzima slot), da se slotovi ne rotiraju.
//  - Podaci deaktiviranog obrta se NE brišu; ponovna aktivacija ih vraća.
//  - Trial: 30 dana, nivo Office Tim (10 obrta), jednom po korisniku.
const { Op } = require("sequelize");
const {
  sequelize,
  Organization,
  OrganizationMember,
  Subscription,
  User,
} = require("../models/index");
const { OFFICE_PLANS } = require("../config/pricing");
const { officeUserIds } = require("../services/tierService");

const TRIAL_DANA = 30;
const TRIAL_PLAN_KEY = "OFFICE_10";

const naplataUkljucena = () => process.env.PK_OFFICE_NAPLATA === "true";

// subscriptions.plan je lowercase ("office_10"), config ključevi UPPERCASE
function officePlanInfo(plan) {
  return OFFICE_PLANS[String(plan || "").toUpperCase()] || null;
}

function pocetakMjeseca() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Slot je zauzet: aktivan obrt, ili deaktiviran u TEKUĆEM mjesecu
 * (anti-rotacija). U PROBNOM periodu anti-rotacije nema: slot se oslobađa
 * odmah, da korisnik može isprobati sve svoje klijente prije izbora paketa.
 */
function zauzimaSlot(org, trial = false) {
  if (org.pkOfficeEnabled) return true;
  if (trial) return false;
  return Boolean(
    org.pkOfficeDisabledAt &&
      new Date(org.pkOfficeDisabledAt) >= pocetakMjeseca(),
  );
}

/**
 * NASLIJEĐEN pristup: korisnik BEZ vlastite pretplate/probe koji je član
 * (bilo koja org rola) bar jednog obrta koji je aktiviran u PK Office, a
 * čiji vlasnik ima aktivan office paket ili trial. Tipično: knjigovođa
 * zaposlena u agenciji. Radi u tim obrtima, ali ne upravlja slotovima.
 * Vraća listu org id-eva kroz koje pristup postoji, ili null.
 */
async function nasljedjeniPristup(userId) {
  const memberships = await OrganizationMember.findAll({
    where: { userId },
    include: [
      {
        model: Organization,
        as: "organization",
        where: { type: "BUSINESS", pkOfficeEnabled: true },
        attributes: ["id"],
      },
    ],
    attributes: ["organizationId"],
  });
  const orgIds = memberships.map((m) => m.organizationId);
  if (orgIds.length === 0) return null;

  const owners = await OrganizationMember.findAll({
    where: {
      organizationId: { [Op.in]: orgIds },
      role: "OWNER",
      userId: { [Op.ne]: userId },
    },
    attributes: ["userId", "organizationId"],
    raw: true,
  });
  if (owners.length === 0) return null;

  const office = await officeUserIds(owners.map((o) => o.userId));
  const okOrgIds = owners
    .filter((o) => office.has(o.userId))
    .map((o) => o.organizationId);
  return okOrgIds.length > 0 ? { orgIds: okOrgIds } : null;
}

/**
 * Office pristup korisnika: vlastita pretplata (subscriptions.plan office_*)
 * ili trial (scope "vlastiti"), ili naslijeđen kroz članstvo u obrtu office
 * pretplatnika (scope "naslijedjen": bez slotova i bez upravljanja).
 */
async function getOfficeAccess(userId) {
  if (!naplataUkljucena()) {
    return {
      enforced: false,
      hasOffice: true,
      scope: "vlastiti",
      plan: null,
      planNaziv: null,
      maxObrta: null,
      trial: false,
      trialEndsAt: null,
      trialIskoristen: false,
    };
  }
  const user = await User.findByPk(userId);
  const nista = {
    enforced: true,
    hasOffice: false,
    scope: null,
    plan: null,
    planNaziv: null,
    maxObrta: null,
    trial: false,
    trialEndsAt: null,
    trialIskoristen: Boolean(user?.pkOfficeTrialEndsAt),
  };
  if (!user) return nista;
  // administratori platforme uvijek imaju pristup (podrška/held desk)
  if (user.role === "ADMIN") {
    return {
      ...nista,
      hasOffice: true,
      scope: "vlastiti",
      planNaziv: "Administrator",
    };
  }

  const sub = await Subscription.findOne({ where: { userId } });
  const danas = new Date();
  danas.setHours(0, 0, 0, 0);
  if (sub && sub.isActive && String(sub.plan || "").startsWith("office")) {
    const info = officePlanInfo(sub.plan);
    const vrijedi = !sub.endDate || new Date(sub.endDate) >= danas;
    if (info && vrijedi) {
      return {
        ...nista,
        hasOffice: true,
        scope: "vlastiti",
        plan: String(sub.plan),
        planNaziv: info.label,
        maxObrta: info.maxObrta,
        trial: Boolean(sub.isTrial),
      };
    }
  }
  if (
    user.pkOfficeTrialEndsAt &&
    new Date(user.pkOfficeTrialEndsAt) >= new Date()
  ) {
    const info = officePlanInfo(TRIAL_PLAN_KEY);
    return {
      ...nista,
      hasOffice: true,
      scope: "vlastiti",
      plan: TRIAL_PLAN_KEY.toLowerCase(),
      planNaziv: "Probni period",
      maxObrta: info?.maxObrta ?? 10,
      trial: true,
      trialEndsAt: user.pkOfficeTrialEndsAt,
    };
  }

  // (b) naslijeđen pristup kroz obrte office pretplatnika kojima sam član
  const inherited = await nasljedjeniPristup(userId);
  if (inherited) {
    return {
      ...nista,
      hasOffice: true,
      scope: "naslijedjen",
      planNaziv: "Pristup preko vlasnika obrta",
      nasljedjeneOrgIds: inherited.orgIds,
    };
  }
  return nista;
}

/** Organizacije (obrti) kojima korisnik upravlja (OWNER/ADMIN). */
async function upravljiveOrge(userId) {
  const memberships = await OrganizationMember.findAll({
    where: { userId, role: { [Op.in]: ["OWNER", "ADMIN"] } },
    include: [{ model: Organization, as: "organization" }],
  });
  return memberships
    .map((m) => m.organization)
    .filter((o) => o && o.type === "BUSINESS");
}

function orgJson(o, trial = false) {
  return {
    id: o.id,
    name: o.name,
    isClientOrg: Boolean(o.isClientOrg),
    pkOfficeEnabled: Boolean(o.pkOfficeEnabled),
    // deaktiviran ovaj mjesec: slot zauzet do kraja mjeseca (nikad u trialu)
    zauzetDoKrajaMjeseca: !o.pkOfficeEnabled && zauzimaSlot(o, trial),
  };
}

// GET /api/pk-office/pristup — pristup + slotovi + lista obrta sa statusom
async function pristup(req, res) {
  try {
    const userId = req.user.id;
    const access = await getOfficeAccess(userId);
    if (!access.enforced || !access.hasOffice) {
      return res.json({
        ok: true,
        data: { ...access, slotovi: null, organizations: [] },
      });
    }
    // naslijeđen pristup: bez slotova i upravljanja; organizations su obrti
    // kroz koje pristup postoji (aktivirani obrti office pretplatnika)
    if (access.scope === "naslijedjen") {
      const orgs = await Organization.findAll({
        where: { id: { [Op.in]: access.nasljedjeneOrgIds ?? [] } },
      });
      return res.json({
        ok: true,
        data: {
          ...access,
          slotovi: null,
          organizations: orgs.map((o) => orgJson(o, false)),
        },
      });
    }
    const orgs = await upravljiveOrge(userId);
    const zauzeto = orgs.filter((o) => zauzimaSlot(o, access.trial)).length;
    // max: null = bez limita (admin); UI i tada prikazuje panel i prekidače
    return res.json({
      ok: true,
      data: {
        ...access,
        slotovi: { zauzeto, max: access.maxObrta },
        organizations: orgs.map((o) => orgJson(o, access.trial)),
      },
    });
  } catch (err) {
    console.error("pk-office pristup error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function nadjiOrg(userId, orgId) {
  const membership = await OrganizationMember.findOne({
    where: {
      userId,
      organizationId: orgId,
      role: { [Op.in]: ["OWNER", "ADMIN"] },
    },
    include: [{ model: Organization, as: "organization" }],
  });
  return membership?.organization ?? null;
}

// POST /api/pk-office/organizacije/:orgId/aktiviraj
async function aktiviraj(req, res) {
  try {
    const userId = req.user.id;
    const orgId = Number(req.params.orgId);
    if (!Number.isInteger(orgId) || orgId <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const access = await getOfficeAccess(userId);
    if (!access.hasOffice) {
      return res.status(403).json({ ok: false, error: "NEMA_OFFICE_PAKETA" });
    }
    // slotovima upravlja samo nosilac pretplate (naslijeđen pristup ne smije
    // trošiti ni oslobađati tuđe slotove)
    if (access.enforced && access.scope !== "vlastiti") {
      return res.status(403).json({ ok: false, error: "SAMO_NOSILAC_PRETPLATE" });
    }

    // Provjera limita i aktivacija moraju biti atomične: bez zaključavanja dvije
    // istovremene aktivacije (dupli klik/skripta) obje pročitaju zauzeto < max i
    // obje prođu, pa se probije slot limit paketa. Zato brojanje i upis idu u
    // jednoj transakciji koja zaključa SVE upravljive obrte korisnika (FOR
    // UPDATE), pa druga aktivacija čeka i vidi ažuriran broj. Order by id da se
    // izbjegne deadlock pri konzistentnom redoslijedu zaključavanja.
    const rezultat = await sequelize.transaction(async (t) => {
      const memberships = await OrganizationMember.findAll({
        where: { userId, role: { [Op.in]: ["OWNER", "ADMIN"] } },
        attributes: ["organizationId"],
        raw: true,
        transaction: t,
      });
      const ids = memberships.map((m) => m.organizationId);
      if (!ids.length) return { status: 404, error: "ORG_NOT_FOUND" };

      const zakljucane = await Organization.findAll({
        where: { id: { [Op.in]: ids }, type: "BUSINESS" },
        order: [["id", "ASC"]],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      const org = zakljucane.find((o) => o.id === orgId);
      if (!org) return { status: 404, error: "ORG_NOT_FOUND" };
      if (org.pkOfficeEnabled) return { org };

      // obrt deaktiviran ovaj mjesec već zauzima slot: reaktivacija je slobodna
      if (access.maxObrta != null && !zauzimaSlot(org, access.trial)) {
        const zauzeto = zakljucane.filter((o) =>
          zauzimaSlot(o, access.trial),
        ).length;
        if (zauzeto >= access.maxObrta) {
          return { status: 409, error: "LIMIT_PAKETA" };
        }
      }
      await org.update(
        {
          pkOfficeEnabled: true,
          pkOfficeActivatedAt: new Date(),
          pkOfficeDisabledAt: null,
        },
        { transaction: t },
      );
      return { org };
    });

    if (rezultat.error) {
      return res
        .status(rezultat.status)
        .json({ ok: false, error: rezultat.error });
    }
    return res.json({ ok: true, data: orgJson(rezultat.org, access.trial) });
  } catch (err) {
    console.error("pk-office aktiviraj error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/pk-office/organizacije/:orgId/deaktiviraj
async function deaktiviraj(req, res) {
  try {
    const userId = req.user.id;
    const orgId = Number(req.params.orgId);
    if (!Number.isInteger(orgId) || orgId <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const org = await nadjiOrg(userId, orgId);
    if (!org) {
      return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });
    }
    const access = await getOfficeAccess(userId);
    // slotovima upravlja samo nosilac pretplate
    if (access.enforced && access.scope !== "vlastiti") {
      return res.status(403).json({ ok: false, error: "SAMO_NOSILAC_PRETPLATE" });
    }
    if (!org.pkOfficeEnabled) {
      return res.json({ ok: true, data: orgJson(org, access.trial) });
    }
    await org.update({
      pkOfficeEnabled: false,
      pkOfficeDisabledAt: new Date(),
    });
    return res.json({ ok: true, data: orgJson(org, access.trial) });
  } catch (err) {
    console.error("pk-office deaktiviraj error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/**
 * Dodijeli PK Office trial korisniku (postavlja pkOfficeTrialEndsAt na +30
 * dana). Poziva se i iz verifikacije maila (users.wantsOfficeTrial), pa ne
 * radi ništa kad naplata nije uključena: tada je pristup ionako slobodan i
 * trial bi se bespotrebno potrošio. Vraća datum isteka ili null.
 */
async function dodijeliOfficeTrial(user) {
  if (!naplataUkljucena()) return null;
  if (!user || user.pkOfficeTrialEndsAt) return null;
  const ends = new Date();
  ends.setDate(ends.getDate() + TRIAL_DANA);
  await user.update({ pkOfficeTrialEndsAt: ends });
  await autoAktivirajObrteZaTrial(user.id);
  return ends;
}

/**
 * Pri startu triala odmah aktiviraj SVE obrte korisnika u PK Office, ali samo
 * ako ih ima do trial limita (Office Tim, 10): proba mora pokazati podatke
 * odmah, bez ručnog paljenja obrta jednog po jednog. Sa VIŠE obrta od limita
 * ne biramo umjesto korisnika, neka sam izabere kojih 10. Ne baca grešku:
 * trial je dodijeljen i ako aktivacija padne.
 */
async function autoAktivirajObrteZaTrial(userId) {
  try {
    const max = officePlanInfo(TRIAL_PLAN_KEY)?.maxObrta ?? 10;
    const orgs = await upravljiveOrge(userId);
    if (orgs.length === 0 || orgs.length > max) return;
    const sad = new Date();
    for (const org of orgs) {
      if (org.pkOfficeEnabled) continue;
      await org.update({
        pkOfficeEnabled: true,
        pkOfficeActivatedAt: sad,
        pkOfficeDisabledAt: null,
      });
    }
  } catch (err) {
    console.error(
      "auto-aktivacija obrta za trial nije uspjela:",
      err?.message || err,
    );
  }
}

// POST /api/pk-office/trial — 30 dana probe (nivo Office Tim), jednom
async function startOfficeTrial(req, res) {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
    }
    const access = await getOfficeAccess(userId);
    // blokira samo VLASTITA pretplata; naslijeđen pristup (knjigovođa u
    // agenciji) smije pokrenuti svoju probu ako želi vlastite slotove
    if (access.hasOffice && access.scope === "vlastiti" && !access.trial) {
      return res.status(400).json({ ok: false, error: "ALREADY_SUBSCRIBED" });
    }
    if (user.pkOfficeTrialEndsAt) {
      return res.status(400).json({ ok: false, error: "TRIAL_ALREADY_USED" });
    }
    const ends = new Date();
    ends.setDate(ends.getDate() + TRIAL_DANA);
    await user.update({ pkOfficeTrialEndsAt: ends });
    // proba odmah pokazuje podatke: svi obrti (do limita) ulaze u PK Office
    await autoAktivirajObrteZaTrial(user.id);
    return res.json({ ok: true, data: { trialEndsAt: ends } });
  } catch (err) {
    console.error("pk-office trial error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  pristup,
  aktiviraj,
  deaktiviraj,
  startOfficeTrial,
  dodijeliOfficeTrial,
  getOfficeAccess,
};
