import { type ApiResponse } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export type PlanKey = "free" | "pro" | "business";
/** PK Office paketi: dodjeljuju se kroz admin/predračun, ne kroz change-plan */
export type OfficePlanKey =
  | "office_2"
  | "office_10"
  | "office_25"
  | "office_50";
export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "past_due"
  | "trialing";
export type BillingCycle = "monthly" | "yearly";

export type PlanLimits = {
  organizations: number;
  transactionsPerMonth: number;
  usersPerOrganization: number;
  pdfImportsPerMonth: number;
};

export type Plan = {
  key: PlanKey;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  features: string[];
};

export type SubscriptionUsage = {
  organizations: number;
  transactionsThisMonth: number;
  users: number;
};

export type Subscription = {
  id: number;
  plan: PlanKey | OfficePlanKey;
  status: SubscriptionStatus;
  isTrial: boolean;
  billingCycle: BillingCycle | null;
  isActive: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  limits: PlanLimits;
  usage: SubscriptionUsage;
};

export type SubscriptionInvoice = {
  id: number;
  invoiceNumber: string;
  amount: string;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  invoiceDate: string;
  dueDate: string;
  /** PRO | BUSINESS | OFFICE_2 | OFFICE_10 | OFFICE_25 | OFFICE_50 */
  plan: string;
  billingCycle: BillingCycle;
  /** Period pretplate koji predračun pokriva (YYYY-MM-DD). */
  periodStart: string | null;
  periodEnd: string | null;
  /** Približan datum evidentiranja uplate (kad je označen plaćenim). */
  paidAt: string | null;
  pdfUrl: string | null;
};

/** URL za PDF vlastitog predračuna (auth kolačić ide automatski). */
export function subscriptionInvoicePdfUrl(id: number): string {
  return `${BACKEND_URL}/api/subscription/invoices/${id}/pdf`;
}

export type SubscriptionInvoicesResponse = {
  items: SubscriptionInvoice[];
  total: number;
  page: number;
  limit: number;
};

export function getSubscription() {
  return request<Subscription>("/api/subscription");
}

export function getPlans() {
  return request<Plan[]>("/api/subscription/plans");
}

export function getInvoices(page = 1, limit = 20) {
  return request<SubscriptionInvoicesResponse>(
    `/api/subscription/invoices?page=${page}&limit=${limit}`,
  );
}

export function changePlan(payload: {
  plan: PlanKey;
  billingCycle?: BillingCycle;
}) {
  return request<Subscription>("/api/subscription/change-plan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function cancelSubscription() {
  return request<Subscription>("/api/subscription/cancel", { method: "POST" });
}

export function reactivateSubscription() {
  return request<Subscription>("/api/subscription/reactivate", {
    method: "POST",
  });
}
