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

// ─── User profile ────────────────────────────────────────────────────────────

export type ProfileUpdatePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  jmbg?: string | null;
};

export type Subscription = {
  id: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type UsersListResponse = {
  items: Users[];
  total: number;
  page: number;
  limit: number;
};

export type Users = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  role: "USER" | "ACCOUNTANT" | "ADMIN" | "SUPER_ADMIN";
  phone: string | null;
  address: string | null;
  createdAt: string;
  subscription: Subscription | null;
};

export type UserUpdatePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  role?: "USER" | "ACCOUNTANT" | "ADMIN" | "SUPER_ADMIN";
};

export type SubscriptionPayload = {
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

export function updateProfile(userId: number, payload: ProfileUpdatePayload) {
  return request(`/api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getUsers(params?: {
  firstName?: string;
  lastName?: string;
  email?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.firstName) sp.set("firstName", params.firstName);
  if (params?.lastName) sp.set("lastName", params.lastName);
  if (params?.email) sp.set("email", params.email);
  sp.set("page", String(params?.page ?? 1));
  sp.set("limit", String(params?.limit ?? 20));

  return request<UsersListResponse>(`/api/users?${sp.toString()}`);
}

export function adminUpdateUser(userId: number, payload: UserUpdatePayload) {
  return request<Users>(`/api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function upsertSubscription(
  userId: number,
  payload: SubscriptionPayload,
) {
  return request<Subscription>(`/api/users/${userId}/subscription`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSubscription(userId: number) {
  return request<null>(`/api/users/${userId}/subscription`, {
    method: "DELETE",
  });
}

// ─── Organizations ────────────────────────────────────────────────────────────

export type OrgOwner = {
  id: number;
  firstName: string;
  lastName: string;
  jmbg: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type OrgOwnerPayload = {
  firstName: string;
  lastName: string;
  jmbg: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type Organization = {
  id: number;
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  owner: OrgOwner | null;
  memberRole: "OWNER" | "ADMIN" | "MEMBER";
  createdAt: string;
  updatedAt: string;
};

export type OrgPayload = {
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  ownerData?: OrgOwnerPayload;
};

export function getOrganizations() {
  return request<Organization[]>("/api/organizations");
}

export function createOrganization(payload: OrgPayload) {
  return request<Organization>("/api/organizations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getOrganization(id: number) {
  return request<Organization>(`/api/organizations/${id}`);
}

export function updateOrganization(id: number, payload: Partial<OrgPayload>) {
  return request<Organization>(`/api/organizations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Members ─────────────────────────────────────────────────────────────────

export type OrgMember = {
  userId: number;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
  };
};

export function getMembers(orgId: number) {
  return request<OrgMember[]>(`/api/organizations/${orgId}/members`);
}

export function addMember(
  orgId: number,
  payload: { email: string; role: "ADMIN" | "MEMBER" },
) {
  return request<OrgMember>(`/api/organizations/${orgId}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMemberRole(
  orgId: number,
  userId: number,
  role: "ADMIN" | "MEMBER",
) {
  return request<OrgMember>(`/api/organizations/${orgId}/members/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export function removeMember(orgId: number, userId: number) {
  return request<null>(`/api/organizations/${orgId}/members/${userId}`, {
    method: "DELETE",
  });
}

// ─── Workers ─────────────────────────────────────────────────────────────────

export type Worker = {
  id: number;
  organizationId: number;
  role: "VLASNIK" | "RADNIK";
  firstName: string;
  lastName: string;
  jmbg: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkerPayload = {
  firstName: string;
  lastName: string;
  role?: "VLASNIK" | "RADNIK";
  jmbg?: string;
  email?: string;
  phone?: string;
  address?: string;
  startDate?: string | null;
  endDate?: string | null;
};

export function getWorkers(orgId: number) {
  return request<Worker[]>(`/api/organizations/${orgId}/workers`);
}

export function createWorker(orgId: number, payload: WorkerPayload) {
  return request<Worker>(`/api/organizations/${orgId}/workers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWorker(
  orgId: number,
  workerId: number,
  payload: Partial<WorkerPayload>,
) {
  return request<Worker>(`/api/organizations/${orgId}/workers/${workerId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteWorker(orgId: number, workerId: number) {
  return request<null>(`/api/organizations/${orgId}/workers/${workerId}`, {
    method: "DELETE",
  });
}

// ─── Forms history ────────────────────────────────────────────────────────────

export type FormType = "GPD" | "SPR" | "ZO3" | "UGOVOR";
export type FormStatus = "DRAFT" | "GENERATED" | "SUBMITTED" | "ARCHIVED";

export type FormRecord = {
  id: number;
  type: FormType;
  status: FormStatus;
  year: number;
  month: number | null;
  title: string | null;
  pdfUrl: string | null;
  createdAt: string;
  organization: { id: number; name: string } | null;
  client: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  } | null;
};

export function getForms(type?: FormType) {
  const qs = type ? `?type=${type}` : "";
  return request<FormRecord[]>(`/api/forms${qs}`);
}

// ─── Person clients (fizičko lice) ───────────────────────────────────────────

export type PersonClient = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  jmbg: string | null;
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonClientPayload = {
  firstName: string;
  lastName: string;
  jmbg?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export function getPersonClients() {
  return request<PersonClient[]>("/api/clients");
}

export function createPersonClient(payload: PersonClientPayload) {
  return request<PersonClient>("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePersonClient(
  id: number,
  payload: Partial<PersonClientPayload>,
) {
  return request<PersonClient>(`/api/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
