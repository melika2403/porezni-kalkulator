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
  city?: string;
  jmbg?: string | null;
  idCardNumber?: string | null;
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
  role: "USER" | "PRO" | "ADMIN" | "BUSINESS";
  phone: string | null;
  address: string | null;
  city: string | null;
  createdAt: string;
  isEmailVerified: boolean;
  subscription: Subscription | null;
};

export type UserUpdatePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  role?: "USER" | "PRO" | "ADMIN" | "BUSINESS";
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

export function deleteUser(userId: number) {
  return request<null>(`/api/users/${userId}`, { method: "DELETE" });
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
  city: string | null;
  idCardNumber: string | null;
};

export type OrgOwnerPayload = {
  firstName: string;
  lastName: string;
  jmbg: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  idCardNumber?: string;
};

export type Organization = {
  id: number;
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber: string | null;
  pdvNumber: string | null;
  activityCode: string | null;
  activityName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  bankAccount: string | null;
  logoUrl: string | null;
  owner: OrgOwner | null;
  memberRole: "OWNER" | "ADMIN" | "MEMBER";
  // Plan tier of the org's OWNER. In-org features (workers, members,
  // logo, JS3100, …) are gated by this rather than the viewer's own role.
  effectiveTier: "USER" | "PRO" | "BUSINESS" | "ADMIN" | null;
  createdAt: string;
  updatedAt: string;
};

export type OrgPayload = {
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber?: string;
  pdvNumber?: string;
  activityCode?: string;
  activityName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  bankAccount?: string;
  ownerData?: OrgOwnerPayload;
};

export function getOrganizations() {
  return request<Organization[]>("/api/organizations");
}

export function getClientOrganizations() {
  return request<Organization[]>("/api/organizations/clients");
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

export function deleteOrganization(id: number) {
  return request<null>(`/api/organizations/${id}`, { method: "DELETE" });
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
  city: string | null;
  idCardNumber: string | null;
  bankAccount: string | null;
  startDate: string | null;
  endDate: string | null;
  defaultStartTime: string | null;
  defaultEndTime: string | null;
  defaultDaysOff: string | null;
  defaultPause: string | null;
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
  city?: string;
  idCardNumber?: string;
  bankAccount?: string;
  startDate?: string | null;
  endDate?: string | null;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  defaultDaysOff?: string | null;
  defaultPause?: string | null;
};

export function getWorkers(orgId: number) {
  return request<Worker[]>(`/api/organizations/${orgId}/workers`);
}

export type WorkerWithOrg = Worker & {
  organizationId: number;
  organizationName: string;
};

export function getAllMyWorkers() {
  return request<WorkerWithOrg[]>(`/api/organizations/workers/mine`);
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

export type FormType =
  | "GPD"
  | "SPR"
  | "ZO3"
  | "UGOVOR" // ugovor o pozajmici (legacy)
  | "UOD"    // ugovor o djelu (Faza 3)
  | "SIH"
  | "PLDI"
  | "AMS"
  | "JS3100";
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
  // Faza 3B: backend sad vraća autora forme; koristi se za "Autor" kolonu kad
  // pregledamo team-shared forme.
  createdById: number | null;
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

// ─── Cities (lookup) ─────────────────────────────────────────────────────────

export type City = {
  id: number;
  name: string;
  municipalityCode: string;
  postalCode: string | null;
  kanton: string;
};

export function getCities() {
  return request<City[]>("/api/cities");
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
  city: string | null;
  idCardNumber: string | null;
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
  city?: string;
  idCardNumber?: string;
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

export function deletePersonClient(id: number) {
  return request<null>(`/api/clients/${id}`, { method: "DELETE" });
}

export function getAmortizacijaClients() {
  return request<PersonClient[]>("/api/clients/amortizacija");
}

// ─── Admin: sve organizacije ──────────────────────────────────────────────────

export type AdminOrgCreator = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
};

export type AdminOrganization = {
  id: number;
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber: string | null;
  activityCode: string | null;
  activityName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  bankAccount: string | null;
  isClientOrg: boolean;
  createdById: number;
  createdBy: AdminOrgCreator | null;
  owner: OrgOwner | null;
  workerCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrgsListResponse = {
  items: AdminOrganization[];
  total: number;
  page: number;
  limit: number;
};

export function adminGetOrganizations(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  sp.set("page", String(params?.page ?? 1));
  sp.set("limit", String(params?.limit ?? 20));
  return request<AdminOrgsListResponse>(`/api/organizations/admin/all?${sp.toString()}`);
}

// ─── Admin: sva fizička lica ──────────────────────────────────────────────────

export type AdminPersonClient = PersonClient & {
  idCardNumber: string | null;
  createdBy: AdminOrgCreator | null;
};

export type AdminPersonClientsListResponse = {
  items: AdminPersonClient[];
  total: number;
  page: number;
  limit: number;
};

export function adminGetPersonClients(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  sp.set("page", String(params?.page ?? 1));
  sp.set("limit", String(params?.limit ?? 20));
  return request<AdminPersonClientsListResponse>(`/api/clients/admin/all?${sp.toString()}`);
}

// Faza 3: payload prima organizationId — klijent se kreira kao team-shared
// kad je org-id poslat (svi članovi te org-e vide klijenta). Ako nije, klijent
// je "lični" (legacy ponašanje, vidi samo tvorac).
export function createAmortizacijaClient(payload: {
  firstName?: string;
  organizationId?: number | null;
}) {
  return request<PersonClient>("/api/clients/amortizacija", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
