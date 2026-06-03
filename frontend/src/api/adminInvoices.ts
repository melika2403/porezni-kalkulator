// Admin pregled SVIH korisničkih faktura/predračuna.
import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

export type AdminInvoiceItem = {
  id: number;
  type: "INVOICE" | "PROFORMA";
  fullNumber: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";
  currency: "BAM" | "EUR";
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  grossTotal: number;
  netTotal: number;
  buyerName: string;
  sellerName: string;
  emailSentAt: string | null;
  createdAt: string;
  organization: { id: number; name: string } | null;
  creator: {
    id: number;
    name: string;
    email: string | null;
    role: string;
  } | null;
};

export type AdminInvoicesResponse = {
  items: AdminInvoiceItem[];
  total: number;
  page: number;
  limit: number;
  totalsByCurrency: { currency: string; count: number; gross: number }[];
};

// Otvori PDF fakture u novom tabu (admin pregled). Koristi postojeći
// /api/invoices/:id/pdf — userCanAccessInvoice ima admin bypass.
export async function openInvoicePdf(id: number): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/invoices/${id}/pdf`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Obriši fakturu (admin). Backend (remove) ima admin bypass i briše invoice +
// stavke u transakciji.
export async function deleteInvoiceAdmin(
  id: number,
): Promise<ApiResponse<null>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<null> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export async function getAdminInvoices(params: {
  q?: string;
  type?: "INVOICE" | "PROFORMA" | "";
  status?: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED" | "";
  year?: number;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<AdminInvoicesResponse>> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.type) sp.set("type", params.type);
  if (params.status) sp.set("status", params.status);
  if (params.year) sp.set("year", String(params.year));
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? 20));
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/invoices?${sp.toString()}`, {
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as
      | ApiResponse<AdminInvoicesResponse>
      | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
