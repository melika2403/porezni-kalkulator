// Admin pregled svih sačuvanih dokumenata (forms) registrovanih korisnika.
import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

export type AdminFormItem = {
  id: number;
  type: string;
  status: "DRAFT" | "GENERATED" | "SUBMITTED" | "ARCHIVED";
  title: string | null;
  year: number;
  month: number | null;
  createdAt: string;
  updatedAt: string;
  organization: { id: number; name: string } | null;
  creator: {
    id: number;
    name: string;
    email: string | null;
    role: string;
  } | null;
};

export type AdminFormsResponse = {
  items: AdminFormItem[];
  total: number;
  page: number;
  limit: number;
  byType: { type: string; count: number }[];
};

export async function deleteAdminForm(id: number): Promise<ApiResponse<null>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/forms/${id}`, {
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

export async function getAdminForms(params: {
  type?: string;
  status?: string;
  year?: number;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<AdminFormsResponse>> {
  const sp = new URLSearchParams();
  if (params.type) sp.set("type", params.type);
  if (params.status) sp.set("status", params.status);
  if (params.year) sp.set("year", String(params.year));
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? 25));
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/forms?${sp.toString()}`, {
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as
      | ApiResponse<AdminFormsResponse>
      | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
