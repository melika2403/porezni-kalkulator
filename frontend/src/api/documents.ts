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

export type DocumentType = "AMS" | "SPR" | "ZO3" | "GPD" | "PLDI";

export type SavedDocument<T = unknown> = {
  id: number;
  type: DocumentType;
  year: number;
  month: number | null;
  title: string | null;
  data: T | null;
};

export function saveDocument(payload: {
  type: DocumentType;
  year: number;
  month?: number | null;
  title?: string;
  data: unknown;
  organizationId?: number | null;
  clientId?: number | null;
}) {
  return request<{ id: number }>("/api/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getDocument<T = unknown>(id: number) {
  return request<SavedDocument<T>>(`/api/documents/${id}`);
}

export function deleteDocument(id: number) {
  return request<null>(`/api/documents/${id}`, { method: "DELETE" });
}
