// PK Freelancer: ko ima pristup paketu.
//
// Pristup daje (redom): ADMIN; aktivna pretplata plan "freelancer"; bilo koji
// viši paket (PRO/BUSINESS rola ili PK Office paket/proba, preko
// effectiveRole); aktivna Freelancer proba (users.freelancerTrialEndsAt).
// Bez pristupa ostaje BESPLATNI nivo: generator AMS-a, do 5 isplatilaca i do 3
// sačuvane uplate godišnje.
const { Subscription, User } = require("../models/index");
const { getEffectiveRole } = require("./tierService");

const BESPLATNO = { maxUplataGodisnje: 3, maxIsplatilaca: 5 };
const PROBA_DANA = 30;

function krajDanaMs(dateOnly) {
  const d = new Date(dateOnly);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function nista(proba = { aktivna: false, endsAt: null, iskoristena: false }) {
  return {
    hasAccess: false,
    izvor: null,
    plan: null,
    endDate: null,
    proba,
    besplatno: BESPLATNO,
  };
}

/**
 * @param {{id:number}} userLike prijavljeni korisnik (req.user ili model)
 * @returns {Promise<{hasAccess:boolean, izvor:"admin"|"freelancer"|"paket"|"proba"|null,
 *   plan:string|null, endDate:string|null,
 *   proba:{aktivna:boolean,endsAt:Date|null,iskoristena:boolean},
 *   besplatno:{maxUplataGodisnje:number,maxIsplatilaca:number}}>}
 */
async function getFreelancerAccess(userLike) {
  const id = Number(userLike?.id);
  if (!id) return nista();
  const user = await User.findByPk(id, {
    attributes: ["id", "role", "freelancerTrialEndsAt", "pkOfficeTrialEndsAt"],
  });
  if (!user) return nista();

  const now = Date.now();
  const probaKraj = user.freelancerTrialEndsAt
    ? new Date(user.freelancerTrialEndsAt)
    : null;
  const proba = {
    aktivna: !!probaKraj && probaKraj.getTime() >= now,
    endsAt: probaKraj,
    iskoristena: Boolean(probaKraj),
  };

  const sub = await Subscription.findOne({ where: { userId: id } });
  const plan = String(sub?.plan || "").toLowerCase();
  const subAktivna =
    !!sub &&
    sub.isActive &&
    plan !== "free" &&
    (!sub.endDate || krajDanaMs(sub.endDate) >= now);
  const osnova = {
    ...nista(proba),
    plan: subAktivna ? plan : null,
    endDate: subAktivna ? sub.endDate : null,
  };

  if (user.role === "ADMIN") return { ...osnova, hasAccess: true, izvor: "admin" };
  if (subAktivna && plan === "freelancer") {
    return { ...osnova, hasAccess: true, izvor: "freelancer" };
  }
  // viši paketi uključuju niži: PRO/BUSINESS rola, PK Office paket ili proba
  // (tierService diže effectiveRole na BUSINESS za office)
  const eff = await getEffectiveRole(user);
  if (eff === "PRO" || eff === "BUSINESS" || eff === "ADMIN") {
    return { ...osnova, hasAccess: true, izvor: "paket" };
  }
  if (proba.aktivna) return { ...osnova, hasAccess: true, izvor: "proba" };
  return osnova;
}

module.exports = { getFreelancerAccess, BESPLATNO, PROBA_DANA };
