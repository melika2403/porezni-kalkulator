const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const subscriptionRepository = require("../repositories/subscriptionRepository");
const userRepository = require("../repositories/userRepository");
const {
  Subscription,
  Invoice,
  OrganizationMember,
  Organization,
  Predracun,
  User,
} = require("../models/index");
const { PLANS, getPlan, planFromRole } = require("../config/plans");
const {
  OFFICE_PLANS,
  PLAN_BRUTO_FIKSNO,
  SAMO_GODISNJE,
} = require("../config/pricing");

/**
 * Kraj dana za DATEONLY vrijednost. endDate je datum bez vremena, pa bi
 * new Date("2026-09-02") dalo ponoć po UTC-u i pretplata bi ispala istekla
 * već u 02:00 na sam dan isteka, a plan bi se tada trajno prepisao na free.
 */
function krajDanaMs(dateOnly) {
  const d = new Date(dateOnly);
  if (isNaN(d.getTime())) return 0;
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
// nivo i trajanje probe: jedan izvor istine (pkOfficeGateController)
const {
  TRIAL_PLAN_KEY,
  TRIAL_DANA,
  trialPlanKey,
} = require("./pkOfficeGateController");

function setAuthCookieWithRole(res, userId, role) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in environment");
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const token = jwt.sign({ role }, secret, {
    subject: String(userId),
    expiresIn,
  });
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

async function upsert(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid user id" });
  }

  const { startDate, endDate, isActive, plan, billingCycle, officeMaxObrta } =
    req.body ?? {};

  const data = {};

  // Poseban dogovor za PK Office (ruta je ADMIN-only): individualni limit
  // obrta na users.officeMaxObrta. undefined = ne diraj; null/"" = skini
  // (vrati na limit paketa); inače cijeli broj 1-1000.
  let officeMaxObrtaUpdate;
  if (officeMaxObrta !== undefined) {
    if (officeMaxObrta === null || officeMaxObrta === "") {
      officeMaxObrtaUpdate = null;
    } else {
      const n = Number(officeMaxObrta);
      if (!Number.isInteger(n) || n < 1 || n > 1000) {
        return res.status(400).json({
          ok: false,
          error: "officeMaxObrta mora biti cijeli broj 1-1000 ili prazno",
        });
      }
      officeMaxObrtaUpdate = n;
    }
  }

  if (startDate !== undefined) {
    const d = parseDate(startDate);
    if (!d)
      return res.status(400).json({ ok: false, error: "Invalid startDate" });
    data.startDate = d;
  }
  if (endDate !== undefined) {
    const d = parseDate(endDate);
    if (!d)
      return res.status(400).json({ ok: false, error: "Invalid endDate" });
    data.endDate = d;
  }
  if (isActive !== undefined) data.isActive = Boolean(isActive);

  // Postojeća pretplata treba i prije upisa: kod produženja bez poslanog plana
  // iz nje se čita da li paket smije biti mjesečni.
  const postojeca = await subscriptionRepository.getByUserId(userId);

  // Plan + ciklus naplate (opciono). PRO/BUSINESS određuju i rolu korisnika;
  // office_* paketi NE diraju rolu (effectiveRole u tierService ih diže na
  // BUSINESS za marketing funkcije, a PK Office limite čita iz plana).
  let normalizedPlan = null;
  let isOfficePlan = false;
  // PK Freelancer isto ne dira rolu: pristup ide kroz freelancerAccess po planu.
  let isFreelancerPlan = false;
  if (plan !== undefined && plan !== null && plan !== "") {
    const raw = String(plan);
    if (/^office_(1|2|10|25|50)$/i.test(raw)) {
      // office paketi su lowercase u subscriptions.plan enumu
      normalizedPlan = raw.toLowerCase();
      isOfficePlan = true;
    } else if (/^freelancer$/i.test(raw)) {
      normalizedPlan = "freelancer";
      isFreelancerPlan = true;
    } else {
      normalizedPlan = raw.toUpperCase();
      if (normalizedPlan !== "PRO" && normalizedPlan !== "BUSINESS") {
        return res.status(400).json({
          ok: false,
          error: "Plan mora biti PRO, BUSINESS, freelancer ili office_1/2/10/25/50",
        });
      }
    }
    // subscriptions.plan je ENUM sa MALIM slovima. Ranije se ovdje upisivalo
    // "PRO"/"BUSINESS", što MySQL nije primao kao validnu ENUM vrijednost, pa
    // je red završavao sa praznim planom (a poslije 'free'), i prava pretplata
    // se nije razlikovala od besplatnog reda. normalizedPlan ostaje velikim
    // slovima jer se ispod poredi sa rolom korisnika.
    data.plan = normalizedPlan.toLowerCase();
    // Dodjela pravog paketa gasi trial oznaku (korisnik je kupio/dobio paket,
    // inače bi mu "TRIAL" bedž ostao zauvijek u admin listama).
    data.isTrial = false;
  }
  let normalizedCycle = null;
  if (billingCycle !== undefined && billingCycle !== null && billingCycle !== "") {
    normalizedCycle = String(billingCycle).toLowerCase() === "monthly" ? "monthly" : "yearly";
    // Paketi koji se prodaju SAMO godišnje (PK Freelancer) ne smiju dobiti
    // mjesečni period ni preko admin forme ni preko dugmeta "Produži": inače bi
    // korisnik dobio mjesec dana za paket koji se plaća godišnje, a obnova bi mu
    // ponudila godišnji predračun. Isti izvor istine kao u predracunController.
    // Plan može doći iz zahtjeva ili, kod dugmeta "Produži" koje šalje samo
    // period, iz već upisane pretplate.
    const planZaCiklus = normalizedPlan || postojeca?.plan || "";
    if (SAMO_GODISNJE.has(String(planZaCiklus).toUpperCase())) {
      normalizedCycle = "yearly";
    }
    data.billingCycle = normalizedCycle;
  }

  // Ako endDate nije dat ali imamo startDate + ciklus → izračunaj automatski
  // (+1 mjesec / +1 godina od početka).
  if (data.endDate === undefined && data.startDate && normalizedCycle) {
    const e = new Date(data.startDate);
    if (normalizedCycle === "monthly") e.setMonth(e.getMonth() + 1);
    else e.setFullYear(e.getFullYear() + 1);
    data.endDate = e;
  }

  if (data.isActive === false && data.endDate === undefined) {
    data.endDate = new Date();
  }

  if (Object.keys(data).length === 0 && officeMaxObrtaUpdate === undefined) {
    return res.status(400).json({ ok: false, error: "No fields to update" });
  }

  // upsert requires startDate + endDate on create
  const existing = postojeca;
  if (
    !existing &&
    Object.keys(data).length > 0 &&
    (!data.startDate || !data.endDate)
  ) {
    return res.status(400).json({
      ok: false,
      error: "startDate and endDate are required when creating a subscription",
    });
  }

  // Aktivacija bez poslanog plana (npr. prekidač "Aktivna" u admin listi) je
  // ranije ostavljala plan = 'free', pa se plaćena pretplata nije razlikovala
  // od besplatnog reda. Plan se tada izvodi iz role, ali SAMO ako je prazan
  // ili 'free': postojeći office paket se ne smije pregaziti.
  if (data.plan === undefined && data.isActive === true) {
    const trenutniPlan = String(existing?.plan || "").toLowerCase();
    if (!trenutniPlan || trenutniPlan === "free") {
      const user = await userRepository.getUserById(userId);
      if (user?.role === "BUSINESS") data.plan = "business";
      else if (user?.role === "PRO" || user?.role === "USER") data.plan = "pro";
    }
  }

  try {
    let sub = existing;
    if (Object.keys(data).length > 0) {
      sub = await subscriptionRepository.upsert(userId, data);
    }
    if (officeMaxObrtaUpdate !== undefined) {
      await userRepository.updateUserById(userId, {
        officeMaxObrta: officeMaxObrtaUpdate,
      });
    }
    // Office paketi NE mijenjaju rolu: pristup ide preko effectiveRole
    // (tierService) i getOfficeAccess, rola u bazi ostaje kakva jeste.
    if (data.isActive === true && !isOfficePlan && !isFreelancerPlan) {
      const user = await userRepository.getUserById(userId);
      // Rola prati plan (PRO/BUSINESS). Ako plan nije poslan, zadrži staro
      // ponašanje (USER → PRO). Ne diramo ADMIN rolu.
      const targetRole = normalizedPlan || "PRO";
      if (user && user.role !== "ADMIN" && user.role !== targetRole) {
        // Ne degradiraj BUSINESS na PRO ako plan nije eksplicitno poslan.
        if (normalizedPlan || user.role === "USER") {
          await userRepository.updateUserById(userId, { role: targetRole });
        }
      }
    }
    res.status(200).json({ ok: true, data: sub });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
}

// POST /api/subscriptions/trial — self-service 30-day PRO trial
// One trial per user, gated by users.trialUsedAt
async function startTrial(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  }

  const user = await userRepository.getUserById(userId);
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });

  if (user.trialUsedAt) {
    return res.status(409).json({ ok: false, error: "TRIAL_ALREADY_USED" });
  }
  if (user.role !== "USER") {
    return res.status(409).json({ ok: false, error: "ALREADY_SUBSCRIBED" });
  }

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);

  try {
    const sub = await subscriptionRepository.upsert(userId, {
      startDate: start,
      endDate: end,
      isActive: true,
      isTrial: true,
    });
    await userRepository.updateUserById(userId, {
      role: "PRO",
      trialUsedAt: start,
    });
    // Reissue JWT so the new role is reflected on subsequent requests
    setAuthCookieWithRole(res, userId, "PRO");
    return res.status(200).json({ ok: true, data: sub });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

async function remove(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid user id" });
  }

  const deleted = await subscriptionRepository.remove(userId);
  if (!deleted)
    return res.status(404).json({ ok: false, error: "Subscription not found" });
  res.status(200).json({ ok: true });
}

// ─── /api/subscription (current user) ──────────────────────────────────────

async function computeUsage(userId) {
  const ownedOrgs = await OrganizationMember.count({
    where: { userId, role: "OWNER" },
    include: [{ model: Organization, as: "organization", where: { isClientOrg: false }, attributes: ["id"] }],
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const transactionsThisMonth = await Invoice.count({
    where: { userId, createdAt: { [Op.gte]: monthStart } },
  });

  return {
    organizations: ownedOrgs,
    transactionsThisMonth,
    users: 1,
  };
}

async function ensureSubscription(userId, role) {
  let sub = await Subscription.findOne({ where: { userId } });
  const planKey = planFromRole(role);

  if (!sub) {
    const start = new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 100); // free = "forever"
    // Besplatan plan NIJE pretplata: red se kreira samo da panel ima šta
    // pokazati, ali ostaje neaktivan. Inače bi svaki korisnik koji otvori tab
    // Pretplata u admin listi izgledao kao pretplatnik (isActive je upravo to
    // polje), a gasio bi se i prikaz probnog perioda.
    sub = await Subscription.create({
      userId,
      startDate: start,
      endDate: end,
      isActive: planKey !== "free",
      plan: planKey,
      status: "active",
    });
    return sub;
  }

  // Office paket je jači od role (rola office korisnika ostaje USER/PRO):
  // NE pregaziti AKTIVAN office plan planom izvedenim iz role, inače bi
  // otvaranje stranice Pretplata obrisalo office paket. Kad office istekne
  // (neaktivan ili prošao endDate), pusti da se plan vrati na role-derived,
  // da panel ne pokazuje zauvijek "PK Office ..." i poslije prestanka.
  // Isto važi i za PK Freelancer paket (rola ostaje USER).
  const planLower = String(sub.plan || "").toLowerCase();
  if (planLower.startsWith("office") || planLower === "freelancer") {
    // Paket vrijedi do KRAJA posljednjeg dana. Ranije se poredilo sa ponoći po
    // UTC-u, pa je paket ispadao istekao već ujutro na sam dan isteka i tada se
    // plan trajno prepisivao na free (vraćanje je tražilo admina).
    const stillValid =
      sub.isActive && (!sub.endDate || krajDanaMs(sub.endDate) >= Date.now());
    if (stillValid) return sub;
    // istekao: nastavi na sinhronizaciju plana iz role (free/pro/business)
  }

  // Sinhroniziraj plan iz role-a ako se razlikuje. Pad na free znači da
  // pretplate više nema, pa se gasi i zastavica (admin lista je čita).
  if (sub.plan !== planKey) {
    sub.plan = planKey;
    if (planKey === "free") sub.isActive = false;
    await sub.save();
  }
  return sub;
}

// Prikazni "plan" objekat za office pakete (nisu u config/plans.js):
// Business limiti + broj obrta iz paketa; Start je ograničen na 2
// organizacije ukupno.
function officeDisplayPlan(planKey) {
  const key = String(planKey || "");
  const meta = OFFICE_PLANS[key.toUpperCase()];
  if (!meta) return null;
  const business = getPlan("business");
  // Solo (1) i Start (2) imaju ukupan limit organizacija = broj obrta paketa;
  // Tim i veći su neograničeni (skuplji su od Business-a)
  const mali = meta.maxObrta <= 2;
  return {
    key: key.toLowerCase(),
    name: meta.label,
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      ...business.limits,
      organizations: meta.maxObrta,
      ownOrganizations: mali ? meta.maxObrta : -1,
      clientOrganizations: mali ? meta.maxObrta : -1,
    },
    features: [
      "Sve Business funkcije",
      `PK Office za do ${meta.maxObrta} obrta`,
    ],
  };
}

// Prikazni plan za PK Freelancer (nije u config/plans.js): free limiti
// marketing dijela (paket ne diže rolu) + cijena bruto iz pricing konfiguracije.
function freelancerDisplayPlan(planKey) {
  if (String(planKey || "").toLowerCase() !== "freelancer") return null;
  const free = getPlan("free");
  return {
    key: "freelancer",
    name: "PK Freelancer",
    priceMonthly: 0,
    priceYearly: PLAN_BRUTO_FIKSNO.FREELANCER?.yearly ?? 50,
    limits: { ...free.limits },
    features: [
      "Evidencija uplata iz inostranstva bez ograničenja",
      "AMS-1035 i uplatnice iz evidencije",
      "Podsjetnici na rokove, GPD iz evidencije, potvrda o prihodima",
    ],
  };
}

// Neki stariji zapisi nemaju popunjen status (admin upsert ga ne dira),
// pa ga izvedemo iz isActive + endDate da frontend nikad ne dobije prazno.
function effectiveStatus(sub) {
  if (sub.status) return sub.status;
  const end = sub.endDate ? new Date(sub.endDate) : null;
  if (!sub.isActive || (end && end.getTime() < Date.now())) return "expired";
  return "active";
}

function buildSubscriptionResponse(sub, plan, usage) {
  return {
    id: sub.id,
    plan: sub.plan,
    status: effectiveStatus(sub),
    isTrial: !!sub.isTrial,
    billingCycle: sub.billingCycle,
    isActive: sub.isActive,
    currentPeriodStart: sub.startDate,
    currentPeriodEnd: sub.endDate,
    cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd,
    cancelledAt: sub.cancelledAt,
    limits: plan.limits,
    usage,
  };
}

// Proba nema vlastiti zapis (samo users.pkOfficeTrialEndsAt), pa se početak
// izvodi iz datuma isteka: kraj minus trajanje probe.
function pocetakProbe(trialEnds) {
  const start = new Date(trialEnds);
  start.setDate(start.getDate() - TRIAL_DANA);
  return start;
}

async function getCurrent(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const user = await userRepository.getUserById(userId);
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });

  const sub = await ensureSubscription(userId, user.role);
  const usage = await computeUsage(userId);

  // PK Office proba se ne vodi kao pretplata (živi na users.pkOfficeTrialEndsAt),
  // pa bi panel inače pokazivao besplatan plan sa free limitima, iako proba
  // ide na nivou paketa Office Tim i nosi sve Business funkcije. Prikazujemo je
  // kao trenutni plan SAMO korisniku koji nema plaćen paket. Ko plaća Pro,
  // Business ili Office, pa uz to pokrene probu, mora u panelu i dalje vidjeti
  // svoju pretplatu i njene datume, ne probu.
  const trialEnds = user.pkOfficeTrialEndsAt
    ? new Date(user.pkOfficeTrialEndsAt)
    : null;
  const trialTraje = !!trialEnds && trialEnds.getTime() >= Date.now();
  const krajPretplate = sub.endDate ? new Date(sub.endDate) : null;
  if (krajPretplate) krajPretplate.setHours(23, 59, 59, 999);
  const subJePlacena =
    String(sub.plan || "").toLowerCase() !== "free" &&
    sub.isActive &&
    (!krajPretplate || krajPretplate.getTime() >= Date.now());

  if (trialTraje && !subJePlacena) {
    // Solo proba se i u panelu prikazuje kao Solo, ne kao Tim
    const probaKljuc = trialPlanKey(user);
    const trialPlan = officeDisplayPlan(probaKljuc);
    const virtualSub = {
      id: sub.id,
      plan: probaKljuc.toLowerCase(),
      status: "trialing",
      isTrial: true,
      billingCycle: null,
      isActive: true,
      // Početak PROBE, ne free reda: sub.startDate je datum registracije, pa
      // bi panel starijem korisniku ispisao period od prije godinu dana i
      // traku napretka skoro popunjenu čim proba počne.
      startDate: pocetakProbe(trialEnds),
      endDate: trialEnds,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    };
    return res.json({
      ok: true,
      data: buildSubscriptionResponse(virtualSub, trialPlan, usage),
    });
  }

  const plan =
    officeDisplayPlan(sub.plan) ??
    freelancerDisplayPlan(sub.plan) ??
    getPlan(sub.plan);

  return res.json({ ok: true, data: buildSubscriptionResponse(sub, plan, usage) });
}

async function listPlans(_req, res) {
  return res.json({ ok: true, data: Object.values(PLANS) });
}

// GET /api/admin/subscriptions — admin lista SVIH pretplata: korisnik, paket,
// period, status; za office pakete i zauzeti slotovi (aktivirani obrti).
async function adminList(_req, res) {
  try {
    // Stabilan poredak po isteku (istekle prve), ne po zadnjoj izmjeni:
    // inače red "skoči" na vrh čim admin klikne Produži.
    const subs = await Subscription.findAll({
      raw: true,
      order: [["endDate", "ASC"]],
    });
    const userIds = [...new Set(subs.map((s) => s.userId))];
    const users = userIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: userIds } },
          attributes: [
            "id",
            "firstName",
            "lastName",
            "email",
            "role",
            "pkOfficeTrialEndsAt",
            "officeMaxObrta",
          ],
          raw: true,
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    // zauzeti slotovi office pretplatnika: OWNER/ADMIN obrti sa pkOfficeEnabled
    const officeIds = subs
      .filter((s) => String(s.plan || "").startsWith("office"))
      .map((s) => s.userId);
    const slotCount = new Map();
    if (officeIds.length) {
      const rows = await OrganizationMember.findAll({
        where: {
          userId: { [Op.in]: officeIds },
          role: { [Op.in]: ["OWNER", "ADMIN"] },
        },
        include: [
          {
            model: Organization,
            as: "organization",
            where: { type: "BUSINESS", pkOfficeEnabled: true },
            attributes: [],
          },
        ],
        attributes: ["userId"],
        raw: true,
      });
      for (const r of rows) {
        slotCount.set(r.userId, (slotCount.get(r.userId) || 0) + 1);
      }
    }

    // Probe se ne vode u tabeli pretplata (žive na users.pkOfficeTrialEndsAt i
    // users.freelancerTrialEndsAt), pa ih admin ovdje inače ne bi vidio. Dodaju
    // se kao redovi SAMO ZA PRIKAZ (proba != null), bez akcija nad paketom.
    const danas = new Date();
    danas.setHours(0, 0, 0, 0);
    const probaKorisnici = await User.findAll({
      where: {
        [Op.or]: [
          { pkOfficeTrialEndsAt: { [Op.gte]: danas } },
          { freelancerTrialEndsAt: { [Op.gte]: danas } },
        ],
      },
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "role",
        "pkOfficeTrialEndsAt",
        "pkOfficeTrialPlan",
        "freelancerTrialEndsAt",
      ],
      raw: true,
    });
    const aktivanPlan = new Map();
    for (const s of subs) {
      if (!s.isActive) continue;
      if (s.endDate && krajDanaMs(s.endDate) < Date.now()) continue;
      aktivanPlan.set(s.userId, String(s.plan || "").toLowerCase());
    }
    const probaRed = (u, vrsta, kraj) => {
      const pocetak = new Date(kraj);
      pocetak.setDate(pocetak.getDate() - 30);
      return {
        userId: u.id,
        user: {
          id: u.id,
          name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
          email: u.email,
          role: u.role,
          pkOfficeTrialEndsAt: u.pkOfficeTrialEndsAt,
        },
        plan: null,
        proba: vrsta,
        billingCycle: null,
        startDate: pocetak,
        endDate: kraj,
        isActive: true,
        isTrial: true,
        officeSlotovi: null,
      };
    };
    const probe = [];
    for (const u of probaKorisnici) {
      const plan = aktivanPlan.get(u.id) || "";
      if (u.pkOfficeTrialEndsAt && !plan.startsWith("office")) {
        probe.push(
          probaRed(
            u,
            u.pkOfficeTrialPlan === "office_1" ? "office_solo" : "office",
            u.pkOfficeTrialEndsAt,
          ),
        );
      }
      if (u.freelancerTrialEndsAt && plan !== "freelancer") {
        probe.push(probaRed(u, "freelancer", u.freelancerTrialEndsAt));
      }
    }

    // probe i pretplate u istom poretku kao i do sada (po isteku, prve one koje
    // ističu najprije), da lista ostane predvidljiva
    const sviRedovi = [...probe, ...subs].sort((a, b) => {
      const x = a.endDate ? new Date(a.endDate).getTime() : Infinity;
      const y = b.endDate ? new Date(b.endDate).getTime() : Infinity;
      return x - y;
    });
    return res.json({
      ok: true,
      data: sviRedovi.map((s) => {
        if (s.proba) return s;
        const u = userById.get(s.userId) || null;
        const plan = String(s.plan || "");
        const office = plan.startsWith("office")
          ? OFFICE_PLANS[plan.toUpperCase()] || null
          : null;
        return {
          userId: s.userId,
          user: u
            ? {
                id: u.id,
                name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
                email: u.email,
                role: u.role,
                pkOfficeTrialEndsAt: u.pkOfficeTrialEndsAt,
              }
            : null,
          plan: plan || null,
          billingCycle: s.billingCycle,
          startDate: s.startDate,
          endDate: s.endDate,
          isActive: !!s.isActive,
          isTrial: !!s.isTrial,
          officeSlotovi: office
            ? {
                zauzeto: slotCount.get(s.userId) || 0,
                // Poseban dogovor (users.officeMaxObrta) ima prednost nad
                // limitom paketa; poseban=true da UI označi red. Isto pravilo
                // kao gate: samo broj > 0 se računa (0/negativno = paket).
                max:
                  u?.officeMaxObrta != null && Number(u.officeMaxObrta) > 0
                    ? Number(u.officeMaxObrta)
                    : office.maxObrta,
                poseban:
                  u?.officeMaxObrta != null && Number(u.officeMaxObrta) > 0,
              }
            : null,
        };
      }),
    });
  } catch (err) {
    console.error("admin subscriptions list error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function listInvoices(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const { count, rows } = await Predracun.findAndCountAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const data = rows.map((p) => ({
    id: p.id,
    invoiceNumber: p.fullNumber,
    amount: p.grossAmount,
    currency: "BAM",
    status: p.status === "PAID" ? "paid" : p.status === "CANCELLED" ? "refunded" : "pending",
    invoiceDate: p.issueDate,
    dueDate: p.dueDate,
    plan: p.plan,
    billingCycle: p.billingCycle || "yearly",
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    // Nemamo poseban datum uplate; kad admin označi PAID, updatedAt je najbliža aproksimacija.
    paidAt: p.status === "PAID" ? p.updatedAt : null,
    pdfUrl: null,
  }));

  return res.json({
    ok: true,
    data: { items: data, total: count, page, limit },
  });
}

// GET /api/subscription/invoices/:id/pdf — PDF vlastitog predračuna.
// Regeneriše se iz snimljenog zapisa (snapshot), isto kao admin verzija,
// ali sa provjerom vlasništva (predračun mora pripadati ulogovanom korisniku).
async function invoicePdf(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Nevažeći ID." });
  }

  const r = await Predracun.findOne({ where: { id, userId } });
  if (!r) {
    return res.status(404).json({ ok: false, error: "Predračun nije pronađen." });
  }

  try {
    const { generatePredracunPdf } = require("../utils/predracunPdf");
    const pdfBuffer = await generatePredracunPdf({
      plan: r.plan,
      billingCycle: r.billingCycle,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      fullNumber: r.fullNumber,
      issueDate: r.issueDate,
      dueDate: r.dueDate,
      buyer: {
        code: r.buyerCode,
        name: r.buyerName,
        address: r.buyerAddress,
        city: r.buyerCity,
        postalCode: r.buyerPostalCode,
        phone: r.buyerPhone,
        idNumber: r.buyerIdNumber,
        vatNumber: r.buyerVatNumber,
        email: r.buyerEmail,
      },
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Predracun-${String(r.fullNumber).replace(/\//g, "-")}.pdf"`,
    );
    return res.status(200).end(pdfBuffer);
  } catch (e) {
    console.error("subscription invoicePdf error:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

async function cancelCurrent(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const sub = await Subscription.findOne({ where: { userId } });
  if (!sub) return res.status(404).json({ ok: false, error: "NO_SUBSCRIPTION" });
  if (sub.plan === "free") {
    return res.status(400).json({ ok: false, error: "CANNOT_CANCEL_FREE" });
  }

  sub.cancelAtPeriodEnd = true;
  sub.cancelledAt = new Date();
  await sub.save();

  const user = await userRepository.getUserById(userId);
  const plan = getPlan(sub.plan);
  const usage = await computeUsage(userId);
  return res.json({ ok: true, data: buildSubscriptionResponse(sub, plan, usage) });
}

async function reactivateCurrent(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const sub = await Subscription.findOne({ where: { userId } });
  if (!sub) return res.status(404).json({ ok: false, error: "NO_SUBSCRIPTION" });

  sub.cancelAtPeriodEnd = false;
  sub.cancelledAt = null;
  sub.status = "active";
  sub.isActive = true;
  await sub.save();

  const plan = getPlan(sub.plan);
  const usage = await computeUsage(userId);
  return res.json({ ok: true, data: buildSubscriptionResponse(sub, plan, usage) });
}

module.exports = {
  upsert,
  remove,
  adminList,
  startTrial,
  getCurrent,
  listPlans,
  listInvoices,
  invoicePdf,
  cancelCurrent,
  reactivateCurrent,
};
