import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

export type AdminDashboard = {
  year: number;
  users: {
    total: number;
    new30: number;
    verified: number;
    byRole: { USER: number; PRO: number; BUSINESS: number; ADMIN: number };
  };
  subscriptions: {
    active: number;
    expiringSoon: number;
    byCycle: { monthly: number; yearly: number };
    pro: number;
    business: number;
  };
  finance: {
    subscriptionsEarned: number;
    otherIncome: number;
    totalEarned: number;
    totalInvested: number;
    profit: number;
  };
  predracuni: {
    byStatus: { ISSUED: number; PAID: number; CANCELLED: number };
    paidAmount: number;
  };
  activity: {
    last30: number;
    topActions: { action: string; count: number }[];
  };
  orgs: { total: number; workers: number };
  trials: { started: number; converted: number; rate: number };
  monthly: { registrations: number[]; revenue: number[] };
  recurring: { mrr: number; arr: number; churned30: number; churnRate: number };
  funnel: {
    anonymous: number;
    registrations: number;
    trials: number;
    paid: number;
  };
  acquisition: {
    bySource: { source: string; count: number }[];
    marketingSpend: number;
    newPaid: number;
    cac: number | null;
  };
};

export async function getAdminDashboard(
  year?: number,
): Promise<ApiResponse<AdminDashboard>> {
  const q = year ? `?year=${year}` : "";
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/dashboard${q}`, {
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as
      | ApiResponse<AdminDashboard>
      | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export type AdminEngagement = {
  topActive: {
    userId: number;
    name: string;
    email: string | null;
    role: string | null;
    events: number;
    documents: number;
    invoices: number;
    lastActivity: string;
  }[];
  dormant: {
    userId: number;
    name: string;
    email: string | null;
    role: string;
    createdAt: string;
  }[];
};

export async function getAdminEngagement(): Promise<ApiResponse<AdminEngagement>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/engagement`, {
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as
      | ApiResponse<AdminEngagement>
      | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
