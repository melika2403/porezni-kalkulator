import { type ApiResponse } from "src/api/auth";
import { type DayEntry } from "src/sections/sihterica/fillSihterica";

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

export type SihtericaMonth = { year: number; month: number };
export type SihtericaData = { days: (DayEntry | null)[] };

export function getSihtericaMonths(workerId: number) {
  return request<SihtericaMonth[]>(`/api/sihterica/months?workerId=${workerId}`);
}

export function getSihtericaWorkerMonths(orgId: number) {
  return request<Record<string, SihtericaMonth[]>>(
    `/api/sihterica/worker-months?orgId=${orgId}`,
  );
}

export function getSihterica(workerId: number, year: number, month: number) {
  return request<SihtericaData | null>(
    `/api/sihterica?workerId=${workerId}&year=${year}&month=${month}`,
  );
}

export function saveSihterica(payload: {
  workerId: number;
  year: number;
  month: number;
  days: (DayEntry | null)[];
}) {
  return request<{ id: number }>(`/api/sihterica`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteSihterica(workerId: number, year: number, month: number) {
  return request<null>(
    `/api/sihterica?workerId=${workerId}&year=${year}&month=${month}`,
    { method: "DELETE" },
  );
}
