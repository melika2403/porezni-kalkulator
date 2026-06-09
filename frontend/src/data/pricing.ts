// ──────────────────────────────────────────────────────────────────────────────
//  Jedan izvor istine za cijene pretplata (frontend).
//  Backend ima identične brojeve u utils/predracunPdf.js (PLAN_PRICES) — kad
//  mijenjaš cijene, mijenjaj na oba mjesta.
//
//  Svi iznosi su BRUTO (sa PDV-om) — ono što kupac plaća. Neto/PDV se
//  back-kalkulišu iz bruta po stopi VAT_RATE.
//
//  Godišnja = 10× mjesečna → 2 mjeseca besplatno (ušteda = 2× mjesečna).
// ──────────────────────────────────────────────────────────────────────────────

export type Plan = "PRO" | "BUSINESS";
export type BillingCycle = "monthly" | "yearly";

export const VAT_RATE = 0.17;

export const PLAN_PRICING: Record<Plan, Record<BillingCycle, number>> = {
  PRO: { monthly: 20, yearly: 200 },
  BUSINESS: { monthly: 50, yearly: 500 },
};

// Ušteda na godišnjoj u odnosu na 12× mjesečnu (= 2 mjeseca gratis).
export function annualSavings(plan: Plan): number {
  return PLAN_PRICING[plan].monthly * 2;
}

export const calcNet = (gross: number) =>
  +(gross - gross * (VAT_RATE / (1 + VAT_RATE))).toFixed(2);
export const calcVat = (gross: number) =>
  +(gross * (VAT_RATE / (1 + VAT_RATE))).toFixed(2);

export function formatKm(n: number): string {
  return n
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
