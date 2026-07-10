// Jedan izvor istine za cijene pretplata na backendu (net = bez PDV-a).
// PDV se dodaje odozgo (vidi utils/predracunPdf.js). Mora odgovarati
// frontend/src/data/pricing.ts.
// PK Office paketi (OFFICE_*): naplata po broju obrta, SVE funkcije u
// svakom paketu + sve Business funkcije marketing dijela. Godišnja =
// 10x mjesečna (2 mjeseca gratis), kao i PRO/BUSINESS.
const PLAN_PRICES = {
  PRO: { yearly: 200.0, monthly: 20.0 },
  BUSINESS: { yearly: 500.0, monthly: 50.0 },
  OFFICE_2: { yearly: 200.0, monthly: 20.0 },
  OFFICE_10: { yearly: 800.0, monthly: 80.0 },
  OFFICE_25: { yearly: 1750.0, monthly: 175.0 },
  OFFICE_50: { yearly: 3000.0, monthly: 300.0 },
};

// PK Office paketi: limit broja obrta po paketu (osnova za budući gate
// pri kreiranju organizacije) i naziv za prikaz/PDF.
const OFFICE_PLANS = {
  OFFICE_2: { maxObrta: 2, label: "PK Office Start (do 2 obrta)" },
  OFFICE_10: { maxObrta: 10, label: "PK Office Tim (do 10 obrta)" },
  OFFICE_25: { maxObrta: 25, label: "PK Office Agencija (do 25 obrta)" },
  OFFICE_50: { maxObrta: 50, label: "PK Office Agencija+ (do 50 obrta)" },
};

const ALL_PLANS = Object.keys(PLAN_PRICES);
const isKnownPlan = (plan) =>
  Object.prototype.hasOwnProperty.call(PLAN_PRICES, plan);
const isOfficePlan = (plan) =>
  Object.prototype.hasOwnProperty.call(OFFICE_PLANS, plan);

// Mjesečni ekvivalent (za MRR): godišnje / 12, mjesečno = puna cijena.
function monthlyEquivalent(plan, cycle) {
  const p = PLAN_PRICES[plan];
  if (!p) return 0;
  return cycle === "monthly" ? p.monthly : p.yearly / 12;
}

module.exports = {
  PLAN_PRICES,
  OFFICE_PLANS,
  ALL_PLANS,
  isKnownPlan,
  isOfficePlan,
  monthlyEquivalent,
};
