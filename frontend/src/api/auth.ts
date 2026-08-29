import { getBackendUrl } from "src/utils/backendUrl";

export type AuthUser = {
  id: number;
  email: string | null;
  jmbg: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: string;
  /** Efektivna rola: PK Office paket/trial diže USER/PRO na BUSINESS
      (marketing funkcije). Rola u bazi ostaje netaknuta. */
  effectiveRole?: string;
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
  isGoogleUser: boolean;
  isEmailVerified: boolean;
  idCardNumber: string | null;
  trialUsedAt: string | null;
  /** Kraj PK Office probe; postavljen = proba je iskorištena (jednokratna). */
  pkOfficeTrialEndsAt?: string | null;
  /** Naziv na platnom listiću: null/izostavljeno = "PLATNI LISTIĆ". */
  payslipNaziv?: "PLATNA_LISTA" | null;
  subscription: {
    id: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    /** pro | business | office_2 | office_10 | office_25 | office_50 | free
        (backend šalje malim slovima; stari tip "PRO"|"BUSINESS" je lagao) */
    plan: string | null;
    billingCycle: "monthly" | "yearly" | null;
  } | null;
};

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

const BACKEND_URL = getBackendUrl();

export async function unwrap<T>(p: Promise<ApiResponse<T>>): Promise<T> {
  const res = await p;
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  utmSource?: string;
  utmCampaign?: string;
  // Registracija pokrenuta klikom na trial CTA -> trial se auto-aktivira pri
  // verifikaciji maila (i preskačemo "aktiviraj trial" welcome mail).
  wantsTrial?: boolean;
  // Isto, ali za PK Office trial (pkOfficeTrialEndsAt).
  wantsOfficeTrial?: boolean;
};

export function register(payload: RegisterPayload) {
  return request<{ email: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmail(token: string) {
  return request<null>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: "GET",
  });
}

export function resendVerification(email: string) {
  return request<null>("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function login(email: string, password: string, rememberMe = false) {
  return request<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, rememberMe }),
  });
}

export function forgotPassword(email: string) {
  return request<null>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, newPassword: string) {
  return request<null>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export function logout() {
  return request<null>("/api/auth/logout", { method: "POST" });
}

export function me() {
  return request<AuthUser>("/api/auth/me", { method: "GET" });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<null>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function startTrial() {
  return request<{
    id: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>("/api/subscriptions/trial", { method: "POST" });
}
