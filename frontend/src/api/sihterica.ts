import { type ApiResponse } from "src/api/auth";
import { type DayEntry } from "src/sections/sihterica/fillSihterica";
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

export type SihtericaMonth = { year: number; month: number };
export type SihtericaData = {
  days: (DayEntry | null)[];
  meta?: Partial<SihtericaMeta>;
};

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

// Kontekst za vjeran re-render PDF-a iz liste dokumenata (ime radnika, org,
// raspored slobodnih dana). Snima se uz `days` da Šihterica bude preuzimljiva
// i bez ponovnog ulaska u alat.
export type SihtericaMeta = {
  workerName: string;
  orgName: string;
  orgAddress: string;
  orgCity: string;
  orgTaxNumber: string;
  weeklyDaysOff: number[];
  countAbsenceCodes: string[];
};

export function saveSihterica(payload: {
  workerId: number;
  year: number;
  month: number;
  days: (DayEntry | null)[];
  meta?: SihtericaMeta;
}) {
  return request<{ id: number }>(`/api/sihterica`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Preuzimanje šihterice → označi sačuvanu formu kao GENERATED (best-effort).
export function markSihtericaGenerated(
  workerId: number,
  year: number,
  month: number,
) {
  return request<null>(`/api/sihterica/mark-generated`, {
    method: "POST",
    body: JSON.stringify({ workerId, year, month }),
  });
}

export function deleteSihterica(workerId: number, year: number, month: number) {
  return request<null>(
    `/api/sihterica?workerId=${workerId}&year=${year}&month=${month}`,
    { method: "DELETE" },
  );
}
