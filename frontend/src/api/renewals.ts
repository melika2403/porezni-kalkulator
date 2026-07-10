// Obnove pretplata — lista koje uskoro ističu + slanje podsjetnika.
import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

export type RenewalItem = {
  userId: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: "USER" | "PRO" | "BUSINESS" | "ADMIN";
  /** PRO | BUSINESS | office_2..office_50 | free | null */
  plan: string | null;
  billingCycle: "monthly" | "yearly" | null;
  startDate: string;
  endDate: string;
  daysLeft: number;
  reminderSentAt: string | null;
  isTrial: boolean;
};

export type RenewalsResponse = {
  items: RenewalItem[];
  days: number;
  total: number;
};

export async function getExpiringRenewals(
  days = 30,
): Promise<ApiResponse<RenewalsResponse>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/renewals?days=${days}`, {
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as
      | ApiResponse<RenewalsResponse>
      | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export async function sendRenewalReminder(
  userId: number,
): Promise<ApiResponse<{ userId: number; reminderSentAt: string }>> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/admin/renewals/${userId}/reminder`,
      { method: "POST", credentials: "include" },
    );
    const json = (await res.json().catch(() => null)) as ApiResponse<{
      userId: number;
      reminderSentAt: string;
    }> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export async function toggleRenewalTrial(
  userId: number,
  isTrial: boolean,
): Promise<ApiResponse<{ userId: number; isTrial: boolean }>> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/admin/renewals/${userId}/trial`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTrial }),
      },
    );
    const json = (await res.json().catch(() => null)) as ApiResponse<{
      userId: number;
      isTrial: boolean;
    }> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
