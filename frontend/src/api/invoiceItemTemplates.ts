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

export type InvoiceItemTemplate = {
  id: number;
  userId: number;
  name: string;
  unit: string | null;
  quantity: string | number;
  unitPrice: string | number;
  discountPct: string | number;
  vatPct: string | number;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceItemTemplatePayload = {
  name: string;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  vatPct?: number;
};

export function listItemTemplates() {
  return request<InvoiceItemTemplate[]>("/api/invoice-item-templates");
}

export function createItemTemplate(payload: InvoiceItemTemplatePayload) {
  return request<InvoiceItemTemplate>("/api/invoice-item-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateItemTemplate(id: number, payload: InvoiceItemTemplatePayload) {
  return request<InvoiceItemTemplate>(`/api/invoice-item-templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteItemTemplate(id: number) {
  return request<null>(`/api/invoice-item-templates/${id}`, { method: "DELETE" });
}
