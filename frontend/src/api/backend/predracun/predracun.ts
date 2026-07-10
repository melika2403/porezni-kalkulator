// ──────────────────────────────────────────────────────────────────────────────
//  Predracun API helper
//    POST /api/predracun  → kreira predračun (PDF + email)
//    GET  /api/predracun  → admin: lista svih predračuna
// ──────────────────────────────────────────────────────────────────────────────
import type { ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

export type Plan =
  | "PRO"
  | "BUSINESS"
  | "OFFICE_2"
  | "OFFICE_10"
  | "OFFICE_25"
  | "OFFICE_50";
export type BillingCycle = "monthly" | "yearly";

export interface BuyerInput {
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email: string;
  idNumber?: string;
  vatNumber?: string;
}

export interface PredracunResult {
  ok: true;
  pdfBlob: Blob;
  pdfUrl: string;
  fullNumber: string;
  plan: Plan;
  gross: string;
}
export interface PredracunError {
  ok: false;
  error: string;
}

export async function createPredracun(
  plan: Plan,
  billingCycle: BillingCycle,
  buyer: BuyerInput,
  // Opciono: obnova — period nove pretplate počinje na ovaj datum (YYYY-MM-DD),
  // dan nakon isteka tekuće pretplate (kontinuitet, bez prekida).
  periodStart?: string,
): Promise<PredracunResult | PredracunError> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/predracun`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, billingCycle, buyer, periodStart }),
    });

    if (!res.ok) {
      // pokušaj parsirati JSON greške
      try {
        const j = await res.json();
        return { ok: false, error: j?.error || `HTTP ${res.status}` };
      } catch {
        return { ok: false, error: `HTTP ${res.status}` };
      }
    }

    const fullNumber = res.headers.get("X-Predracun-Number") || "";
    const planHeader = (res.headers.get("X-Predracun-Plan") as Plan) || plan;
    const gross = res.headers.get("X-Predracun-Gross") || "";

    const pdfBlob = await res.blob();
    const pdfUrl = URL.createObjectURL(pdfBlob);

    return { ok: true, pdfBlob, pdfUrl, fullNumber, plan: planHeader, gross };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "NETWORK_ERROR" };
  }
}

// ── Admin: lista svih predračuna ────────────────────────────────────────────
export type PredracunListItem = {
  id: number;
  fullNumber: string;
  plan: Plan;
  billingCycle: BillingCycle;
  periodStart: string | null;
  periodEnd: string | null;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  issueDate: string;
  dueDate: string;
  status: "ISSUED" | "PAID" | "CANCELLED";
  buyer: {
    code: string | null;
    name: string;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string;
    idNumber: string | null;
    vatNumber: string | null;
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    role: string;
  } | null;
  createdAt: string;
};

export type PredracunListResponse = {
  items: PredracunListItem[];
  total: number;
  page: number;
  limit: number;
};

export type PredracunStatus = "ISSUED" | "PAID" | "CANCELLED";

export async function updatePredracunStatus(
  id: number,
  status: PredracunStatus,
): Promise<
  ApiResponse<{
    id: number;
    fullNumber: string;
    status: PredracunStatus;
    updatedAt: string;
  }>
> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/predracun/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<{
      id: number;
      fullNumber: string;
      status: PredracunStatus;
      updatedAt: string;
    }> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "NETWORK_ERROR",
    };
  }
}

export async function deletePredracun(
  id: number,
): Promise<ApiResponse<null>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/predracun/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<null> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "NETWORK_ERROR",
    };
  }
}

// URL za PDF pojedinačnog predračuna (admin). Otvara se u novom tabu;
// kolačić sesije ide automatski jer je isti origin/backend.
export function predracunPdfUrl(id: number): string {
  return `${BACKEND_URL}/api/predracun/${id}/pdf`;
}

export async function listPredracuni(params?: {
  q?: string;
  plan?: Plan | "";
  status?: PredracunStatus | "";
  page?: number;
  limit?: number;
}): Promise<ApiResponse<PredracunListResponse>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.plan) sp.set("plan", params.plan);
  if (params?.status) sp.set("status", params.status);
  sp.set("page", String(params?.page ?? 1));
  sp.set("limit", String(params?.limit ?? 20));

  try {
    const res = await fetch(`${BACKEND_URL}/api/predracun?${sp.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const json = (await res.json().catch(() => null)) as
      | ApiResponse<PredracunListResponse>
      | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "NETWORK_ERROR",
    };
  }
}
