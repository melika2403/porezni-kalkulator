"use client";

// Admin panel podrške: lista svih razgovora korisnika + chat u realnom vremenu.
// Koristi isti Socket.IO singleton kao korisnički inbox; admin socket se
// automatski pridružuje "admins" room-u pa prima sve izmjene tiketa.
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  IconCheck,
  IconMessageCircle,
  IconRefresh,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { useNotice } from "src/components/Notice/Notice";
import {
  listAdminTickets,
  type SupportTicket,
  type SupportMessage,
  type TicketStatus,
} from "src/api/support";
import { connectSupportSocket } from "src/lib/supportSocket";
import { danLabel, noviDan } from "src/lib/chatDatum";
import styles from "./AdminPodrska.module.css";

type Filter = "OTVOREN" | "ZATVOREN" | "SVI";

function timeLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" });
}

// inicijali za avatar krug u listi razgovora
function initials(name: string | null | undefined): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "K";
  return ((parts[0][0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function AdminPodrska() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filter, setFilter] = useState<Filter>("OTVOREN");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [adminsOnline, setAdminsOnline] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const upsertTicket = useCallback((t: SupportTicket) => {
    setTickets((prev) => {
      const rest = prev.filter((x) => x.id !== t.id);
      const next = [t, ...rest];
      next.sort((a, b) => {
        const av = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bv = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bv - av;
      });
      return next;
    });
  }, []);

  // Inicijalni load liste (po filteru).
  useEffect(() => {
    const status: TicketStatus | undefined =
      filter === "SVI" ? undefined : filter;
    listAdminTickets(status).then((res) => {
      if (res.ok) setTickets(res.data.tickets);
    });
  }, [filter]);

  // Socket listeneri.
  useEffect(() => {
    const socket = connectSupportSocket();

    const onMessage = (payload: { message: SupportMessage }) => {
      const m = payload?.message;
      if (!m) return;
      setActiveId((cur) => {
        if (cur === m.ticketId) {
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
        }
        return cur;
      });
    };
    const onTicketUpdated = (payload: { ticket: SupportTicket }) => {
      if (!payload?.ticket) return;
      // Razgovor koji admin trenutno gleda ne prikazuje nepročitane (badge
      // bi inače zatreperio dok server ne obradi markRead).
      setActiveId((cur) => {
        upsertTicket(
          cur != null && payload.ticket.id === cur
            ? { ...payload.ticket, unread: 0 }
            : payload.ticket,
        );
        return cur;
      });
    };
    const onPresence = (payload: { adminsOnline: boolean }) => {
      setAdminsOnline(Boolean(payload?.adminsOnline));
    };

    // Obrisani tiket nestaje iz liste; ako je bio otvoren, isprazni chat.
    const onTicketDeleted = (payload: { ticketId: number }) => {
      const id = Number(payload?.ticketId);
      if (!id) return;
      setTickets((prev) => prev.filter((t) => t.id !== id));
      setActiveId((cur) => {
        if (cur === id) {
          setMessages([]);
          return null;
        }
        return cur;
      });
    };

    socket.on("message:new", onMessage);
    socket.on("ticket:updated", onTicketUpdated);
    socket.on("ticket:deleted", onTicketDeleted);
    socket.on("presence:update", onPresence);
    return () => {
      socket.off("message:new", onMessage);
      socket.off("ticket:updated", onTicketUpdated);
      socket.off("ticket:deleted", onTicketDeleted);
      socket.off("presence:update", onPresence);
    };
  }, [upsertTicket]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  const openTicket = useCallback((id: number) => {
    const socket = connectSupportSocket();
    setActiveId(id);
    setMessages([]);
    socket.emit(
      "ticket:join",
      { ticketId: id },
      (res: { ok: boolean; messages?: SupportMessage[] }) => {
        if (res?.ok && res.messages) setMessages(res.messages);
      },
    );
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
  }, []);

  const sendMessage = useCallback(() => {
    const body = draft.trim();
    if (!body || activeId == null) return;
    connectSupportSocket().emit("message:send", { ticketId: activeId, body });
    setDraft("");
  }, [draft, activeId]);

  const active = useMemo(
    () => tickets.find((t) => t.id === activeId) || null,
    [tickets, activeId],
  );

  const toggleStatus = useCallback(() => {
    if (!active) return;
    const next: TicketStatus =
      active.status === "OTVOREN" ? "ZATVOREN" : "OTVOREN";
    connectSupportSocket().emit("ticket:setStatus", {
      ticketId: active.id,
      status: next,
    });
  }, [active]);

  // Trajno brisanje razgovora (uz potvrdu): nestaje i na korisničkoj strani.
  const { confirm: confirmDialog } = useNotice();
  const deleteActive = useCallback(async () => {
    if (!active) return;
    const ok = await confirmDialog(
      `Trajno obrisati razgovor "${active.subject}" sa svim porukama? ` +
        "Razgovor nestaje i korisniku i ne može se vratiti.",
    );
    if (!ok) return;
    connectSupportSocket().emit("ticket:delete", { ticketId: active.id });
  }, [active, confirmDialog]);

  // Vidljivi tiketi po filteru (lista se realtime ažurira, ali filtriramo lokalno).
  const visible = useMemo(() => {
    if (filter === "SVI") return tickets;
    return tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "OTVOREN", label: "Otvoreni" },
    { id: "ZATVOREN", label: "Zatvoreni" },
    { id: "SVI", label: "Svi" },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Podrška</h1>
          <div className={styles.subtitle}>
            Live chat sa korisnicima. Poruke stižu u realnom vremenu.
          </div>
          <div className={styles.presence} style={{ marginTop: 6 }}>
            <span
              className={`${styles.dot} ${adminsOnline ? styles.dotOn : ""}`}
            />
            {adminsOnline ? "Podrška online" : "Podrška offline"}
          </div>
        </div>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`${styles.filterBtn} ${filter === f.id ? styles.filterBtnActive : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.panel}>
        {/* Lista */}
        <div className={styles.list}>
          {visible.length === 0 ? (
            <div className={styles.empty}>Nema razgovora u ovoj kategoriji.</div>
          ) : (
            visible.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openTicket(t.id)}
                className={`${styles.ticket} ${t.id === activeId ? styles.ticketActive : ""}`}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {initials(t.user?.name)}
                </span>
                <div className={styles.ticketMain}>
                  <div className={styles.ticketTop}>
                    <span className={styles.ticketUser}>
                      {t.user?.name || "Korisnik"}
                    </span>
                    {t.unread > 0 && (
                      <span className={styles.badge}>{t.unread}</span>
                    )}
                  </div>
                  <div className={styles.ticketSubject}>{t.subject}</div>
                  <div className={styles.ticketPreview}>
                    {t.lastMessage
                      ? (t.lastMessage.senderRole === "ADMIN" ? "Vi: " : "") +
                        t.lastMessage.body
                      : "Bez poruka"}
                    {t.status === "ZATVOREN" ? "  · zatvoren" : ""}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Chat */}
        <div className={styles.chat}>
          {active ? (
            <>
              <div className={styles.chatHead}>
                <span className={styles.avatar} aria-hidden="true">
                  {initials(active.user?.name)}
                </span>
                <div className={styles.chatHeadInfo}>
                  <div className={styles.chatHeadTitle}>{active.subject}</div>
                  <div className={styles.chatHeadSub}>
                    {active.user?.name}
                    {active.user?.email ? ` · ${active.user.email}` : ""}
                  </div>
                </div>
                <div className={styles.chatHeadActions}>
                  <button
                    type="button"
                    className={styles.statusBtn}
                    onClick={toggleStatus}
                  >
                    {active.status === "OTVOREN" ? (
                      <IconCheck size={14} />
                    ) : (
                      <IconRefresh size={14} />
                    )}
                    {active.status === "OTVOREN" ? "Zatvori" : "Ponovo otvori"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.statusBtn} ${styles.dangerBtn}`}
                    onClick={() => void deleteActive()}
                  >
                    <IconTrash size={14} />
                    Obriši
                  </button>
                </div>
              </div>

              <div className={styles.messages} ref={scrollRef}>
                {messages.map((m, i) => {
                  const mine = m.senderRole === "ADMIN";
                  return (
                    <Fragment key={m.id}>
                      {/* separator na promjeni dana (starije poruke inače
                          pokazuju samo sat, bez datuma) */}
                      {noviDan(messages[i - 1]?.createdAt, m.createdAt) && (
                        <div className={styles.daySep}>
                          {danLabel(m.createdAt)}
                        </div>
                      )}
                      <div
                        className={`${styles.row} ${mine ? styles.rowMine : styles.rowTheirs}`}
                      >
                        <div
                          className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleTheirs}`}
                        >
                          {m.body}
                        </div>
                        <div className={`${styles.meta} ${mine ? styles.metaMine : ""}`}>
                          {mine ? "Vi" : active.user?.name || "Korisnik"} ·{" "}
                          {timeLabel(m.createdAt)}
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
              </div>

              <div className={styles.composer}>
                <textarea
                  className={styles.input}
                  value={draft}
                  rows={1}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Napišite odgovor..."
                />
                <button
                  type="button"
                  className={styles.sendBtn}
                  onClick={sendMessage}
                  disabled={!draft.trim()}
                  aria-label="Pošalji"
                >
                  <IconSend size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className={styles.placeholder}>
              <span className={styles.placeholderIcon} aria-hidden="true">
                <IconMessageCircle size={22} />
              </span>
              Odaberite razgovor sa liste da vidite poruke i odgovorite.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
