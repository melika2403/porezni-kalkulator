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

export type KarticaMember = {
  id: number;
  name: string;
  code: string;
  clubName: string | null;
  validUntil: string | null;
  organizationId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type KarticaMemberPayload = {
  name: string;
  code: string;
  clubName?: string | null;
  validUntil?: string | null;
  organizationId?: number | null;
};

export function listKarticaMembers(organizationId: number | null | undefined) {
  const q =
    organizationId === undefined
      ? ""
      : `?organizationId=${organizationId === null ? "null" : organizationId}`;
  return request<KarticaMember[]>(`/api/kartica-members${q}`);
}

export function createKarticaMember(payload: KarticaMemberPayload) {
  return request<KarticaMember>("/api/kartica-members", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateKarticaMember(id: number, payload: Partial<KarticaMemberPayload>) {
  return request<KarticaMember>(`/api/kartica-members/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteKarticaMember(id: number) {
  return request<null>(`/api/kartica-members/${id}`, { method: "DELETE" });
}

export type BulkUpsertPayload = {
  organizationId?: number | null;
  clubName?: string | null;
  items: Array<{ name: string; code: string; validUntil?: string | null }>;
};

export function bulkUpsertKarticaMembers(payload: BulkUpsertPayload) {
  return request<KarticaMember[]>("/api/kartica-members/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
