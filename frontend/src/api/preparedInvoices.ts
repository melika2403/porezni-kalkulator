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

export type Frequency = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export const FREQ_LABEL: Record<Frequency, string> = {
  WEEKLY: "Sedmično",
  MONTHLY: "Mjesečno",
  QUARTERLY: "Kvartalno",
  YEARLY: "Godišnje",
};

export type PreparedItem = {
  id?: number;
  ordinal?: number;
  name: string;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatPct: number;
};

export type PreparedInvoice = {
  id: number;
  organizationId: number;
  partnerId: number | null;
  frequency: Frequency;
  active: boolean;
  applyVat: boolean;
  vrstaIsporuke: string;
  currency: "BAM" | "EUR";
  buyerName: string;
  buyerAddress: string | null;
  buyerCity: string | null;
  buyerPostalCode: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  buyerIdNumber: string | null;
  buyerVatNumber: string | null;
  notes: string | null;
  lastInvoicedAt: string | null;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  items: PreparedItem[];
};

export type PreparedPayload = {
  organizationId?: number;
  partnerId?: number | null;
  frequency: Frequency;
  active?: boolean;
  applyVat?: boolean;
  vrstaIsporuke?: string;
  currency?: "BAM" | "EUR";
  buyer: {
    name: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    phone?: string | null;
    email?: string | null;
    idNumber?: string | null;
    vatNumber?: string | null;
  };
  items: PreparedItem[];
  notes?: string | null;
};

export function listPreparedInvoices(organizationId: number) {
  return request<PreparedInvoice[]>(
    `/api/prepared-invoices?organizationId=${organizationId}`,
  );
}

export function createPreparedInvoice(payload: PreparedPayload) {
  return request<PreparedInvoice>("/api/prepared-invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePreparedInvoice(id: number, payload: PreparedPayload) {
  return request<PreparedInvoice>(`/api/prepared-invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function setPreparedActive(id: number, active: boolean) {
  return request<PreparedInvoice>(`/api/prepared-invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

export function deletePreparedInvoice(id: number) {
  return request<null>(`/api/prepared-invoices/${id}`, { method: "DELETE" });
}

export function invoicePrepared(body: {
  organizationId: number;
  frequency: Frequency;
  issueDate: string;
  dueDate: string | null;
}) {
  return request<{
    count: number;
    created: { id: number; fullNumber: string; buyerName: string }[];
  }>("/api/prepared-invoices/invoice", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
