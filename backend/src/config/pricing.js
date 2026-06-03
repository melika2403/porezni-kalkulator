// Jedan izvor istine za cijene pretplata na backendu (gross = sa PDV-om).
// Mora odgovarati frontend/src/data/pricing.ts.
const PLAN_PRICES = {
  PRO: { yearly: 200.0, monthly: 20.0 },
  BUSINESS: { yearly: 500.0, monthly: 50.0 },
};

// Mjesečni ekvivalent (za MRR): godišnje / 12, mjesečno = puna cijena.
function monthlyEquivalent(plan, cycle) {
  const p = PLAN_PRICES[plan];
  if (!p) return 0;
  return cycle === "monthly" ? p.monthly : p.yearly / 12;
}

module.exports = { PLAN_PRICES, monthlyEquivalent };
