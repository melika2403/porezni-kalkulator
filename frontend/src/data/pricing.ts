// ──────────────────────────────────────────────────────────────────────────────
//  Jedan izvor istine za cijene pretplata (frontend).
//  Backend ima identične brojeve u config/pricing.js — kad mijenjaš cijene,
//  mijenjaj na oba mjesta.
//
//  Svi iznosi su NETO (bez PDV-a) — osnovica na koju se PDV dodaje. Cijene se
//  prikazuju kao "200 KM + PDV"; bruto (za naplatu) = neto × (1 + VAT_RATE).
//
//  Godišnja = 10× mjesečna → 2 mjeseca besplatno (ušteda = 2× mjesečna).
//
//  IZUZETAK, PK Freelancer (FREELANCER): paket za fizička lica, pa je cijena
//  definisana BRUTO (50 KM sa PDV-om) i PDV se računa unazad (bruto - neto),
//  inače bi 42,74 × 1,17 dalo 50,01. Samo godišnja naplata.
//
//  PK Office Solo (OFFICE_1): jedan obrt, "vodim sam sebi", ista cijena po
//  obrtu kao Office Start.
// ──────────────────────────────────────────────────────────────────────────────

export type OfficePlan =
  | "OFFICE_1"
  | "OFFICE_2"
  | "OFFICE_10"
  | "OFFICE_25"
  | "OFFICE_50";
export type Plan = "PRO" | "BUSINESS" | "FREELANCER" | OfficePlan;
export type BillingCycle = "monthly" | "yearly";

export const VAT_RATE = 0.17;

export const PLAN_PRICING: Record<Plan, Record<BillingCycle, number>> = {
  PRO: { monthly: 20, yearly: 200 },
  BUSINESS: { monthly: 50, yearly: 500 },
  OFFICE_1: { monthly: 10, yearly: 100 },
  OFFICE_2: { monthly: 20, yearly: 200 },
  OFFICE_10: { monthly: 80, yearly: 800 },
  OFFICE_25: { monthly: 175, yearly: 1750 },
  OFFICE_50: { monthly: 300, yearly: 3000 },
  // neto izvedeno iz 50 KM bruto; mjesečna vrijednost stoji samo radi tipa
  FREELANCER: { monthly: 42.74, yearly: 42.74 },
};

// Planovi sa fiksnom BRUTO cijenom (PDV unazad).
export const PLAN_BRUTO_FIKSNO: Partial<Record<Plan, Record<BillingCycle, number>>> = {
  FREELANCER: { monthly: 50, yearly: 50 },
};

// Planovi koji se prodaju samo godišnje.
export const SAMO_GODISNJE: readonly Plan[] = ["FREELANCER"];

// PK Office paketi: naplata po broju obrta, SVE PK Office funkcije i sve
// Business funkcije u svakom paketu; razlika je samo limit broja obrta.
// Redoslijed po maxObrta je bitan: officePlanForCount uzima prvi koji stane.
export const OFFICE_PLANS: {
  id: OfficePlan;
  naziv: string;
  maxObrta: number;
}[] = [
  { id: "OFFICE_1", naziv: "Office Solo", maxObrta: 1 },
  { id: "OFFICE_2", naziv: "Office Start", maxObrta: 2 },
  { id: "OFFICE_10", naziv: "Office Tim", maxObrta: 10 },
  { id: "OFFICE_25", naziv: "Office Agencija", maxObrta: 25 },
  { id: "OFFICE_50", naziv: "Office Agencija+", maxObrta: 50 },
];

/** "1 obrt" / "do 2 obrta" za prikaz uz paket. */
export function obrtaTekst(maxObrta: number): string {
  return maxObrta === 1 ? "1 obrt" : `do ${maxObrta} obrta`;
}

export function isOfficePlan(plan: Plan): plan is OfficePlan {
  return plan.startsWith("OFFICE_");
}

export function isFreelancerPlan(plan: Plan): plan is "FREELANCER" {
  return plan === "FREELANCER";
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

/** Neto, PDV i bruto za plan i ciklus; bruto-fiksni planovi računaju PDV unazad. */
export function iznosiZaPlan(plan: Plan, cycle: BillingCycle) {
  const net = PLAN_PRICING[plan][cycle];
  const fiksno = PLAN_BRUTO_FIKSNO[plan]?.[cycle];
  if (fiksno != null) {
    const gross = +fiksno.toFixed(2);
    return { net, vat: +(gross - net).toFixed(2), gross };
  }
  return { net, vat: calcVat(net), gross: calcGross(net) };
}

export function formatKm(n: number): string {
  return n
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
