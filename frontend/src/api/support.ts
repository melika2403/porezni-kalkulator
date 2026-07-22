// Support (live chat): tipovi + REST helperi za inicijalni load i historiju.
// Realtime (slanje, primanje, badge) ide preko socketa (src/lib/supportSocket).
import { useEffect, useState } from "react";
import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";
import { connectSupportSocket } from "src/lib/supportSocket";

const BACKEND_URL = getBackendUrl();

export type TicketStatus = "OTVOREN" | "ZATVOREN";
export type SenderRole = "USER" | "ADMIN";

export type SupportMessage = {
  id: number;
  ticketId: number;
  senderId: number;
  senderRole: SenderRole;
  body: string;
  createdAt: string;
};

export type SupportTicket = {
  id: number;
  userId: number;
  subject: string;
  status: TicketStatus;
  lastMessageAt: string | null;
  createdAt: string;
  unread: number;
  lastMessage: {
    body: string;
    senderRole: SenderRole;
    createdAt: string;
  } | null;
  user: { id: number; name: string; email: string | null } | null;
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
export function listMyTickets() {
  return request<{ tickets: SupportTicket[] }>("/api/support/tickets");
}

export function getTicketMessages(id: number) {
  return request<{ messages: SupportMessage[] }>(
    `/api/support/tickets/${id}/messages`,
  );
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export function listAdminTickets(status?: TicketStatus) {
  const q = status ? `?status=${status}` : "";
  return request<{ tickets: SupportTicket[] }>(`/api/support/admin/tickets${q}`);
}

// ── Hook: ukupan broj nepročitanih (badge na više mjesta) ───────────────────────
// Konektuje singleton socket i sluša `unread:update`. Server šalje broj iz
// perspektive uloge trenutnog korisnika (admin dobija sve, korisnik svoje).
export function useSupportUnread(): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const socket = connectSupportSocket();
    function onUnread(payload: { total: number }) {
      setUnread(payload?.total ?? 0);
    }
    socket.on("unread:update", onUnread);
    return () => {
      socket.off("unread:update", onUnread);
    };
  }, []);

  return unread;
}
