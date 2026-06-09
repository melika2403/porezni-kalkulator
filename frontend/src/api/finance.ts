import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

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

// ─── Uplate klijenata (po mjesecima) ──────────────────────────────────────────

export type ClientPaymentCell = {
  id: number;
  amount: number;
  isAnnual: boolean;
  note: string | null;
};

export type FinanceClient = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  role: "USER" | "PRO" | "ADMIN" | "BUSINESS"; // paket
  subscriptionActive: boolean;
  subscriptionStart: string | null; // od (YYYY-MM-DD)
  subscriptionEnd: string | null; // do (YYYY-MM-DD)
};

export type FinancePaymentRow = {
  user: FinanceClient;
  // mjesec (1–12) → ćelija; mjeseci bez unosa nedostaju
  months: Record<string, ClientPaymentCell | undefined>;
  yearTotal: number;
};

export type PaymentsResponse = {
  items: FinancePaymentRow[];
  total: number;
  page: number;
  limit: number;
  year: number;
  summary: { totalEarned: number };
};

export type UpsertPaymentPayload = {
  userId: number;
  year: number;
  month: number; // 1–12
  amount: number;
  isAnnual?: boolean;
  note?: string | null;
};

export function getPayments(params: {
  year: number;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  sp.set("year", String(params.year));
  if (params.search) sp.set("search", params.search);
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? 20));
  return request<PaymentsResponse>(`/api/admin/finance/payments?${sp.toString()}`);
}

export function upsertPayment(payload: UpsertPaymentPayload) {
  return request<ClientPaymentCell | null>(`/api/admin/finance/payments`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePayment(id: number) {
  return request<null>(`/api/admin/finance/payments/${id}`, { method: "DELETE" });
}

// ─── Troškovi / ulaganja ──────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  "MARKETING",
  "INFRASTRUKTURA",
  "ALATI",
  "PLATE",
  "OSTALO",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MARKETING: "Marketing",
  INFRASTRUKTURA: "Infrastruktura",
  ALATI: "Alati",
  PLATE: "Plate",
  OSTALO: "Ostalo",
};

export type CompanyExpense = {
  id: number;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  category: ExpenseCategory;
  createdAt: string;
  updatedAt: string;
};

export type ExpensesResponse = {
  items: CompanyExpense[];
  year: number;
  summary: { totalInvested: number };
};

export type ExpensePayload = {
  date: string;
  amount: number;
  description: string;
  category?: ExpenseCategory;
};

export function getExpenses(year: number) {
  return request<ExpensesResponse>(`/api/admin/finance/expenses?year=${year}`);
}

export function createExpense(payload: ExpensePayload) {
  return request<CompanyExpense>(`/api/admin/finance/expenses`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExpense(id: number, payload: Partial<ExpensePayload>) {
  return request<CompanyExpense>(`/api/admin/finance/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteExpense(id: number) {
  return request<null>(`/api/admin/finance/expenses/${id}`, { method: "DELETE" });
}

// ─── Ostali prihodi (gotovina) ──────────────────────────────────────────────────

export type OtherIncome = {
  id: number;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type OtherIncomeResponse = {
  items: OtherIncome[];
  year: number;
  summary: { totalIncome: number };
};

export type OtherIncomePayload = {
  date: string;
  amount: number;
  description: string;
};

export function getOtherIncome(year: number) {
  return request<OtherIncomeResponse>(
    `/api/admin/finance/other-income?year=${year}`,
  );
}

export function createOtherIncome(payload: OtherIncomePayload) {
  return request<OtherIncome>(`/api/admin/finance/other-income`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOtherIncome(
  id: number,
  payload: Partial<OtherIncomePayload>,
) {
  return request<OtherIncome>(`/api/admin/finance/other-income/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteOtherIncome(id: number) {
  return request<null>(`/api/admin/finance/other-income/${id}`, {
    method: "DELETE",
  });
}

// ─── Zbir ─────────────────────────────────────────────────────────────────────

export type FinanceSummary = {
  year: number;
  totalEarned: number;
  totalInvested: number;
  profit: number;
};

export function getSummary(year: number) {
  return request<FinanceSummary>(`/api/admin/finance/summary?year=${year}`);
}
