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

export type InvoiceType = "INVOICE" | "PROFORMA";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";

export type InvoiceItem = {
  id: number;
  invoiceId: number;
  ordinal: number;
  name: string;
  unit: string | null;
  quantity: string | number;
  unitPrice: string | number;
  discountPct: string | number;
  vatPct: string | number;
  netLine: string | number;
  discountLine: string | number;
  vatLine: string | number;
  grossLine: string | number;
};

export type Invoice = {
  id: number;
  userId: number;
  organizationId: number | null;
  clientId: number | null;
  type: InvoiceType;
  year: number;
  sequence: number;
  fullNumber: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  applyVat: boolean;
  currency: "BAM" | "EUR";
  status: InvoiceStatus;
  emailSentAt: string | null;
  emailSentTo: string | null;

  sellerName: string;
  sellerAddress: string | null;
  sellerCity: string | null;
  sellerPhone: string | null;
  sellerEmail: string | null;
  sellerTaxNumber: string | null;
  sellerVatNumber: string | null;
  sellerBankAccount: string | null;
  sellerLogoUrl: string | null;

  buyerName: string;
  buyerAddress: string | null;
  buyerCity: string | null;
  buyerPostalCode: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  buyerIdNumber: string | null;
  buyerVatNumber: string | null;

  netTotal: string | number;
  discountTotal: string | number;
  vatTotal: string | number;
  grossTotal: string | number;

  notes: string | null;
  convertedFromProformaId: number | null;
  convertedToInvoiceId?: number | null;
  convertedToFullNumber?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
};

export type CreateInvoicePayload = {
  type: InvoiceType;
  applyVat: boolean;
  currency?: "BAM" | "EUR";
  issueDate?: string;
  dueDate?: string | null;
  notes?: string | null;
  saveBuyerAsClient?: boolean;
  buyerKind?: "PERSON" | "COMPANY";
  seller: {
    organizationId?: number | null;
    name: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
    taxNumber?: string | null;
    vatNumber?: string | null;
    bankAccount?: string | null;
    logoUrl?: string | null;
  };
  buyer: {
    clientId?: number | null;
    name: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    phone?: string | null;
    email?: string | null;
    idNumber?: string | null;
    vatNumber?: string | null;
  };
  items: Array<{
    name: string;
    unit?: string | null;
    quantity: number;
    unitPrice: number;
    discountPct?: number;
    vatPct?: number;
  }>;
};

export function listInvoices(params?: { type?: InvoiceType; status?: InvoiceStatus; year?: number }) {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.status) q.set("status", params.status);
  if (params?.year) q.set("year", String(params.year));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return request<Invoice[]>(`/api/invoices${suffix}`);
}

export function getInvoice(id: number) {
  return request<Invoice>(`/api/invoices/${id}`);
}

export function createInvoice(payload: CreateInvoicePayload) {
  return request<Invoice>("/api/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchInvoice(
  id: number,
  body: { status?: InvoiceStatus; paidAt?: string | null; notes?: string | null },
) {
  return request<Invoice>(`/api/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteInvoice(id: number) {
  return request<null>(`/api/invoices/${id}`, { method: "DELETE" });
}

export function convertProformaToInvoice(id: number) {
  return request<Invoice>(`/api/invoices/${id}/convert`, { method: "POST" });
}

export function emailInvoice(id: number, body: { to?: string; message?: string }) {
  return request<{ sentTo: string }>(`/api/invoices/${id}/email`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function invoicePdfUrl(id: number) {
  return `${BACKEND_URL}/api/invoices/${id}/pdf`;
}

// Otvori PDF u novom tabu (uz cookie auth)
export async function downloadInvoicePdf(id: number, filename?: string) {
  const res = await fetch(`${BACKEND_URL}/api/invoices/${id}/pdf`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `Faktura-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Logo upload za organizaciju ────────────────────────────────────────────
export async function uploadOrganizationLogo(
  orgId: number,
  file: File,
): Promise<ApiResponse<{ id: number; logoUrl: string }>> {
  const fd = new FormData();
  fd.append("logo", file);
  try {
    const res = await fetch(`${BACKEND_URL}/api/organizations/${orgId}/logo`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const json = (await res.json().catch(() => null)) as
      | ApiResponse<{ id: number; logoUrl: string }>
      | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export function removeOrganizationLogo(orgId: number) {
  return request<{ id: number; logoUrl: null }>(`/api/organizations/${orgId}/logo`, {
    method: "DELETE",
  });
}

export function backendUrl() {
  return BACKEND_URL;
}
