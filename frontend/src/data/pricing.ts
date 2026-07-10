// ──────────────────────────────────────────────────────────────────────────────
//  Jedan izvor istine za cijene pretplata (frontend).
//  Backend ima identične brojeve u config/pricing.js — kad mijenjaš cijene,
//  mijenjaj na oba mjesta.
//
//  Svi iznosi su NETO (bez PDV-a) — osnovica na koju se PDV dodaje. Cijene se
//  prikazuju kao "200 KM + PDV"; bruto (za naplatu) = neto × (1 + VAT_RATE).
//
//  Godišnja = 10× mjesečna → 2 mjeseca besplatno (ušteda = 2× mjesečna).
// ──────────────────────────────────────────────────────────────────────────────

export type OfficePlan = "OFFICE_2" | "OFFICE_10" | "OFFICE_25" | "OFFICE_50";
export type Plan = "PRO" | "BUSINESS" | OfficePlan;
export type BillingCycle = "monthly" | "yearly";

export const VAT_RATE = 0.17;

export const PLAN_PRICING: Record<Plan, Record<BillingCycle, number>> = {
  PRO: { monthly: 20, yearly: 200 },
  BUSINESS: { monthly: 50, yearly: 500 },
  OFFICE_2: { monthly: 20, yearly: 200 },
  OFFICE_10: { monthly: 80, yearly: 800 },
  OFFICE_25: { monthly: 175, yearly: 1750 },
  OFFICE_50: { monthly: 300, yearly: 3000 },
};

// PK Office paketi: naplata po broju obrta, SVE PK Office funkcije i sve
// Business funkcije u svakom paketu; razlika je samo limit broja obrta.
export const OFFICE_PLANS: {
  id: OfficePlan;
  naziv: string;
  maxObrta: number;
}[] = [
  { id: "OFFICE_2", naziv: "Office Start", maxObrta: 2 },
  { id: "OFFICE_10", naziv: "Office Tim", maxObrta: 10 },
  { id: "OFFICE_25", naziv: "Office Agencija", maxObrta: 25 },
  { id: "OFFICE_50", naziv: "Office Agencija+", maxObrta: 50 },
];

export function isOfficePlan(plan: Plan): plan is OfficePlan {
  return plan.startsWith("OFFICE_");
}

/** Najmanji Office paket koji pokriva zadani broj obrta (null = preko 50). */
export function officePlanForCount(brojObrta: number) {
  return OFFICE_PLANS.find((p) => brojObrta <= p.maxObrta) ?? null;
}

// Ušteda na godišnjoj u odnosu na 12× mjesečnu (= 2 mjeseca gratis).
export function annualSavings(plan: Plan): number {
  return PLAN_PRICING[plan].monthly * 2;
}

// Iznos PDV-a i bruto (za naplatu) iz neto osnovice.
export const calcVat = (net: number) => +(net * VAT_RATE).toFixed(2);
export const calcGross = (net: number) =>
  +(net + net * VAT_RATE).toFixed(2);

export function formatKm(n: number): string {
  return n
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
