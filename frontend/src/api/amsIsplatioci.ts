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

/** Snimljeni isplatilac za AMS-1035 (adresar korisnika, do 5 zapisa). */
export type AmsIsplatilac = {
  id: number;
  userId: number;
  naziv: string;
  adresa: string | null;
  grad: string | null;
  drzava: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AmsIsplatilacPayload = {
  naziv: string;
  adresa?: string | null;
  grad?: string | null;
  drzava?: string | null;
};

/** Koliko isplatilaca korisnik smije imati (isti broj čuva i backend). */
export const MAX_ISPLATILACA = 5;

export function listIsplatioci() {
  return request<AmsIsplatilac[]>("/api/ams/isplatioci");
}

export function createIsplatilac(payload: AmsIsplatilacPayload) {
  return request<AmsIsplatilac>("/api/ams/isplatioci", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateIsplatilac(id: number, payload: AmsIsplatilacPayload) {
  return request<AmsIsplatilac>(`/api/ams/isplatioci/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteIsplatilac(id: number) {
  return request<{ id: number }>(`/api/ams/isplatioci/${id}`, {
    method: "DELETE",
  });
}
