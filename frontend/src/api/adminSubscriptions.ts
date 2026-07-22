// Admin lista SVIH pretplata (paketi, periodi, office slotovi).
import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

export type AdminSubscription = {
  userId: number;
  user: {
    id: number;
    name: string;
    email: string | null;
    role: string;
    pkOfficeTrialEndsAt: string | null;
  } | null;
  /** pro | business | free | office_2 | office_10 | office_25 | office_50 */
  plan: string | null;
  billingCycle: "monthly" | "yearly" | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isTrial: boolean;
  /** samo za office pakete: aktivirani obrti / limit paketa */
  officeSlotovi: { zauzeto: number; max: number } | null;
};

export async function getAdminSubscriptions(): Promise<
  ApiResponse<AdminSubscription[]>
> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/subscriptions`, {
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<
      AdminSubscription[]
    > | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
