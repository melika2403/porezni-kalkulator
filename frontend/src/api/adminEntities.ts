// Admin brisanje entiteta (puna kaskada) + pregled radnika organizacije.
import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

export type AdminOrgWorker = {
  id: number;
  name: string;
  position: string | null;
  role: string;
  employmentStatus: string | null;
  startDate: string | null;
  endDate: string | null;
};

async function del(path: string): Promise<ApiResponse<null>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
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

export function getAdminOrgWorkers(
  orgId: number,
): Promise<ApiResponse<{ items: AdminOrgWorker[] }>> {
  return fetch(`${BACKEND_URL}/api/admin/organizations/${orgId}/workers`, {
    credentials: "include",
  })
    .then(async (res) => {
      const json = (await res.json().catch(() => null)) as
        | ApiResponse<{ items: AdminOrgWorker[] }>
        | null;
      if (!json) return { ok: false, error: `HTTP ${res.status}` } as const;
      return json;
    })
    .catch(() => ({ ok: false, error: "NETWORK_ERROR" }) as const);
}

export function deleteAdminOrganization(id: number) {
  return del(`/api/admin/organizations/${id}`);
}
export function deleteAdminWorker(id: number) {
  return del(`/api/admin/workers/${id}`);
}
export function deleteAdminPersonClient(id: number) {
  return del(`/api/admin/clients/${id}`);
}

export async function sendTrialInvite(
  userId: number,
): Promise<ApiResponse<{ userId: number }>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/trial-invite`, {
      method: "POST",
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<{
      userId: number;
    }> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

// Ručna verifikacija emaila (korisniku verifikacioni mail nije stigao).
export async function adminVerifyUserEmail(
  userId: number,
): Promise<ApiResponse<{ userId: number }>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/verify-email`, {
      method: "POST",
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<{
      userId: number;
    }> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
