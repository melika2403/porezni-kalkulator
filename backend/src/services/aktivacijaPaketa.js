// Aktivacija paketa iz plaćenog predračuna. Kad admin označi predračun kao
// plaćen, pretplata se upiše sama iz podataka predračuna (plan, period,
// ciklus) i korisnik dobije mail. Ranije je admin morao posebno dodijeliti
// paket u listi korisnika, pa je korisnik čekao i poslije uplate.
const { User } = require("../models/index");
const subscriptionRepository = require("../repositories/subscriptionRepository");
const { sendNotifikacijaEmail } = require("../utils/mailer");
const { OFFICE_PLANS, PLAN_LABELS } = require("../config/pricing");

const FRONTEND = process.env.FRONTEND_URL || "https://www.poreznikalkulator.ba";

/** predracuni.plan (velika slova) u subscriptions.plan (mala slova), null = nepoznat. */
function planUPretplatu(plan) {
  const p = String(plan || "").toUpperCase();
  if (p.startsWith("OFFICE_")) return p.toLowerCase();
  if (p === "FREELANCER") return "freelancer";
  if (p === "PRO" || p === "BUSINESS") return p.toLowerCase();
  return null;
}

function nazivPlana(plan) {
  const p = String(plan || "").toUpperCase();
  if (OFFICE_PLANS[p]) return OFFICE_PLANS[p].label;
  if (PLAN_LABELS[p]) return PLAN_LABELS[p];
  if (p === "PRO") return "Pro";
  if (p === "BUSINESS") return "Business";
  return p;
}

function krajPerioda(start, cycle) {
  const e = new Date(start);
  if (cycle === "monthly") e.setMonth(e.getMonth() + 1);
  else e.setFullYear(e.getFullYear() + 1);
  return e;
}

/**
 * @param {import("sequelize").Model} predracun red iz tabele predracuni
 * @returns {Promise<{ok:boolean, razlog?:string, plan?:string, endDate?:Date}>}
 */
async function aktivirajIzPredracuna(predracun) {
  const userId = predracun?.userId;
  if (!userId) return { ok: false, razlog: "NEMA_KORISNIKA" };
  const plan = planUPretplatu(predracun.plan);
  if (!plan) return { ok: false, razlog: "NEPOZNAT_PLAN" };

  const cycle = predracun.billingCycle === "monthly" ? "monthly" : "yearly";
  const start = predracun.periodStart ? new Date(predracun.periodStart) : new Date();
  const end = predracun.periodEnd ? new Date(predracun.periodEnd) : krajPerioda(start, cycle);

  await subscriptionRepository.upsert(userId, {
    plan,
    billingCycle: cycle,
    startDate: start,
    endDate: end,
    isActive: true,
    isTrial: false,
    status: "active",
  });

  // PRO i BUSINESS su i rola korisnika; office paketi i freelancer rolu ne
  // diraju (pristup im ide preko plana), isto kao kod admin dodjele.
  const user = await User.findByPk(userId);
  if (user && (plan === "pro" || plan === "business")) {
    const ciljna = plan.toUpperCase();
    if (user.role !== "ADMIN" && user.role !== ciljna) await user.update({ role: ciljna });
  }

  if (user?.email) {
    const naziv = nazivPlana(predracun.plan);
    const ctaUrl = plan.startsWith("office")
      ? `${FRONTEND}/app`
      : plan === "freelancer"
        ? `${FRONTEND}/freelancer`
        : `${FRONTEND}/profil?tab=pretplata`;
    const kraj = `${String(end.getDate()).padStart(2, "0")}.${String(end.getMonth() + 1).padStart(2, "0")}.${end.getFullYear()}.`;
    try {
      await sendNotifikacijaEmail({
        to: user.email,
        subject: `Paket ${naziv} je aktiviran`,
        title: `Paket ${naziv} je aktiviran`,
        intro: `Zdravo ${user.firstName || "korisniče"}, uplata po predračunu ${predracun.fullNumber} je evidentirana i paket ${naziv} je aktivan do ${kraj}. Sve što ste unijeli tokom probe je na svom mjestu.`,
        ctaUrl,
        ctaLabel: plan.startsWith("office") ? "Otvori PK Office" : "Otvori",
      });
    } catch (e) {
      console.warn("aktivacija paketa: mail nije poslan:", e?.message || e);
    }
  }
  return { ok: true, plan, endDate: end };
}

module.exports = { aktivirajIzPredracuna, planUPretplatu, nazivPlana };
