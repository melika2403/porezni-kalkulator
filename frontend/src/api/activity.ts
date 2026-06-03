// Bilježenje aktivnosti (generisanje dokumenata) + admin pregled.
import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

// Pozovi pri USPJEŠNOM generisanju dokumenta. Best-effort — nikad ne baca.
// Radi i za anonimne (backend veže userId iz cookie-a ako postoji).
export function trackEvent(action: string, label?: string): void {
  try {
    fetch(`${BACKEND_URL}/api/activity`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, label }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignoriši — tracking ne smije pokvariti download
  }
}

// ── Admin ───────────────────────────────────────────────────────────────────

export type ActivityItem = {
  id: number;
  action: string;
  label: string | null;
  createdAt: string;
  user: { id: number; name: string; email: string | null; role: string } | null;
};

export type ActivityListResponse = {
  items: ActivityItem[];
  total: number;
  page: number;
  limit: number;
};

export type ActivityStats = {
  days: number;
  total: number;
  registered: number;
  anonymous: number;
  byAction: { action: string; count: number }[];
};

async function request<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, { credentials: "include" });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export function listActivity(params: {
  action?: string;
  scope?: "all" | "registered" | "anon";
  q?: string;
  userId?: number;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params.action) sp.set("action", params.action);
  if (params.scope && params.scope !== "all") sp.set("scope", params.scope);
  if (params.q) sp.set("q", params.q);
  if (params.userId) sp.set("userId", String(params.userId));
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? 50));
  return request<ActivityListResponse>(`/api/activity/admin?${sp.toString()}`);
}

export function getActivityStats(days = 30) {
  return request<ActivityStats>(`/api/activity/admin/stats?days=${days}`);
}
