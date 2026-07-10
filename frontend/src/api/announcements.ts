// Obavijesti: korisnički feed (admin obavijesti + status pretplate) i admin CRUD.
import { useEffect, useState, useCallback } from "react";
import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

export type AnnouncementType = "INFO" | "WARNING" | "SUCCESS";
export type Audience = "ALL" | "USER" | "PRO" | "BUSINESS" | "TRIAL";
export type SubscriptionState = "OK" | "EXPIRING" | "TODAY" | "EXPIRED";

export type Announcement = {
  id: number;
  title: string;
  body: string;
  type: AnnouncementType;
  audience: Audience;
  publishedAt: string;
  read: boolean;
};

export type SubscriptionNotice = {
  state: SubscriptionState;
  daysLeft: number;
  endDate: string;
  plan: "PRO" | "BUSINESS" | null;
} | null;

export type MyNotifications = {
  announcements: Announcement[];
  unread: number;
  subscription: SubscriptionNotice;
};

export type AdminAnnouncement = {
  id: number;
  title: string;
  body: string;
  type: AnnouncementType;
  audience: Audience;
  active: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
  author: string | null;
};

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

// ── Korisnik ──────────────────────────────────────────────────────────────────
export function getMyNotifications() {
  return request<MyNotifications>("/api/announcements");
}

export function markNotificationsRead() {
  return request<{ ok: boolean }>("/api/announcements/read", { method: "POST" });
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export function adminListAnnouncements() {
  return request<{ items: AdminAnnouncement[] }>("/api/announcements/admin");
}

export function createAnnouncement(payload: {
  title: string;
  body: string;
  audience: Audience;
  type: AnnouncementType;
  expiresAt?: string | null;
}) {
  return request<{ id: number }>("/api/announcements/admin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAnnouncement(
  id: number,
  patch: Partial<{
    title: string;
    body: string;
    audience: Audience;
    type: AnnouncementType;
    active: boolean;
    expiresAt: string | null;
  }>,
) {
  return request<{ id: number }>(`/api/announcements/admin/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteAnnouncement(id: number) {
  return request<{ id: number }>(`/api/announcements/admin/${id}`, {
    method: "DELETE",
  });
}

// ── Hook: broj nepročitanih (badge na tabu) ─────────────────────────────────────
export function useNotificationsUnread() {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    getMyNotifications().then((res) => {
      if (res.ok) setUnread(res.data.unread);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { unread, setUnread, refresh };
}
