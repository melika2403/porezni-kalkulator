// Pretplate (PK Office) — limit-i i meta podaci za prikaz na frontu.
// PRO = jedan obrt, BUSINESS = knjigovođa mode (više obrta).
const PLANS = {
  free: {
    key: "free",
    name: "Besplatan",
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      organizations: 1,
      // Vlastite (svoje) i klijentske organizacije imaju odvojene limite (-1 = neograničeno).
      ownOrganizations: 1,
      clientOrganizations: 0,
      transactionsPerMonth: 50,
      usersPerOrganization: 1,
      pdfImportsPerMonth: 0,
    },
    features: ["Osnovni alati", "Jedan obrt", "Manualni unos"],
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceMonthly: 29,
    priceYearly: 290,
    limits: {
      organizations: 2,
      ownOrganizations: 2,
      clientOrganizations: 20,
      transactionsPerMonth: 1000,
      usersPerOrganization: 3,
      pdfImportsPerMonth: 50,
    },
    features: [
      "Sve iz Besplatnog",
      "PDF import",
      "Auto-kategorizacija",
      "KPR-1041",
      "PDV",
    ],
  },
  business: {
    key: "business",
    name: "Business",
    priceMonthly: 79,
    priceYearly: 790,
    limits: {
      organizations: -1,
      ownOrganizations: -1,
      clientOrganizations: -1,
      transactionsPerMonth: -1,
      usersPerOrganization: -1,
      pdfImportsPerMonth: -1,
    },
    features: [
      "Sve iz Pro",
      "Neograničeno obrta",
      "Neograničeno korisnika",
      "Multi-klijent dashboard",
      "Prioritetna podrška",
    ],
  },
};

// Mapiranje user.role (USER/PRO/BUSINESS/ADMIN) -> plan key.
// Source of truth za plan je User.role; subscription.plan se sinhronizuje.
function planFromRole(role) {
  if (role === "PRO") return "pro";
  if (role === "BUSINESS") return "business";
  if (role === "ADMIN") return "business";
  return "free";
}

function getPlan(key) {
  return PLANS[key] || PLANS.free;
}

module.exports = { PLANS, getPlan, planFromRole };
