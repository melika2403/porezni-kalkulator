// Jedan izvor istine za cijene pretplata na backendu (net = bez PDV-a).
// PDV se dodaje odozgo (vidi utils/predracunPdf.js). Mora odgovarati
// frontend/src/data/pricing.ts.
// PK Office paketi (OFFICE_*): naplata po broju obrta, SVE funkcije u
// svakom paketu + sve Business funkcije marketing dijela. Godišnja =
// 10x mjesečna (2 mjeseca gratis), kao i PRO/BUSINESS.
// PK Freelancer (FREELANCER): paket za fizička lica (honorari iz inostranstva,
// AMS-1035), pa je cijena definisana BRUTO, 50 KM SA PDV-om; neto 42,74 je
// izvedeno (50 / 1,17). Samo godišnja naplata: mjesečna vrijednost stoji da
// stari kod koji čita oba ciklusa ne pukne, UI je nikad ne nudi.
// PK Office Solo (OFFICE_1): jedan obrt, "vodim sam sebi", ista cijena po
// obrtu kao Office Start (100 KM/god), pa nema kanibalizacije.
const PLAN_PRICES = {
  PRO: { yearly: 200.0, monthly: 20.0 },
  BUSINESS: { yearly: 500.0, monthly: 50.0 },
  OFFICE_1: { yearly: 100.0, monthly: 10.0 },
  OFFICE_2: { yearly: 200.0, monthly: 20.0 },
  OFFICE_10: { yearly: 800.0, monthly: 80.0 },
  OFFICE_25: { yearly: 1750.0, monthly: 175.0 },
  OFFICE_50: { yearly: 3000.0, monthly: 300.0 },
  FREELANCER: { yearly: 42.74, monthly: 42.74 },
};

// Planovi čija je cijena fiksirana BRUTO: PDV se računa UNAZAD (bruto - neto),
// inače bi 42,74 x 1,17 dalo 50,01 umjesto 50,00.
const PLAN_BRUTO_FIKSNO = {
  FREELANCER: { yearly: 50.0, monthly: 50.0 },
};

// Nazivi za predračun/PDF izvan Office paketa (PRO/BUSINESS ostaju sirovi ključ,
// kao i do sada, da se postojeći predračuni ne mijenjaju).
const PLAN_LABELS = {
  FREELANCER: "PK Freelancer",
};

// Planovi koji se prodaju samo godišnje.
const SAMO_GODISNJE = new Set(["FREELANCER"]);

// PK Office paketi: limit broja obrta po paketu (osnova za budući gate
// pri kreiranju organizacije) i naziv za prikaz/PDF.
const OFFICE_PLANS = {
  OFFICE_1: { maxObrta: 1, label: "PK Office Solo (1 obrt)" },
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
const isFreelancerPlan = (plan) =>
  String(plan || "").toUpperCase() === "FREELANCER";

// Mjesečni ekvivalent (za MRR): godišnje / 12, mjesečno = puna cijena.
// Ključevi cjenovnika su velikim slovima, a subscriptions.plan je malim
// ("office_1", "freelancer", "pro"), pa je bez normalizacije svaki paket
// davao nulu i mjesečni prihod u admin pregledu je bio prazan.
function monthlyEquivalent(plan, cycle) {
  const p = PLAN_PRICES[String(plan || "").toUpperCase()];
  if (!p) return 0;
  if (cycle === "monthly") return p.monthly ?? 0;
  return (p.yearly ?? 0) / 12;
}

module.exports = {
  PLAN_PRICES,
  PLAN_BRUTO_FIKSNO,
  PLAN_LABELS,
  SAMO_GODISNJE,
  OFFICE_PLANS,
  ALL_PLANS,
  isKnownPlan,
  isOfficePlan,
  isFreelancerPlan,
  monthlyEquivalent,
};
