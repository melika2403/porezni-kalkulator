export type AuthUser = {
  id: number;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  address: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

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
  phone: string;
  address?: string;
};

export function register(payload: RegisterPayload) {
  return request<AuthUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(email: string, password: string) {
  return request<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request<null>("/api/auth/logout", { method: "POST" });
}

export function me() {
  return request<AuthUser>("/api/auth/me", { method: "GET" });
}
