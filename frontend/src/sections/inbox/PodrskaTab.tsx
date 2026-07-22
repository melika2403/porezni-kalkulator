"use client";

// Podrška: live chat sa administracijom (tiket-bazirano). Korisnik može otvoriti
// više razgovora; poruke idu u realnom vremenu preko Socket.IO, uz perzistenciju
// u bazi (historija preživi refresh).
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  IconHeadset,
  IconPlus,
  IconArrowLeft,
  IconSend,
  IconLock,
} from "@tabler/icons-react";
import {
  listMyTickets,
  type SupportTicket,
  type SupportMessage,
} from "src/api/support";
import { connectSupportSocket } from "src/lib/supportSocket";
import { danLabel, noviDan } from "src/lib/chatDatum";

function timeLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" });
}

type ChatFilter = "OTVOREN" | "ZATVOREN" | "SVI";

const CHAT_FILTERS: { id: ChatFilter; label: string }[] = [
  { id: "OTVOREN", label: "Otvoreni" },
  { id: "ZATVOREN", label: "Zatvoreni" },
  { id: "SVI", label: "Svi" },
];

export function PodrskaTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [adminsOnline, setAdminsOnline] = useState(false);
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false); // "novi razgovor" forma
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [loading, setLoading] = useState(true);
  // filter liste: zatvoreni razgovori ostaju čitljivi (arhiva)
  const [filter, setFilter] = useState<ChatFilter>("OTVOREN");

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Upsert tiketa u listu (sortirano po zadnjoj poruci).
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

  // Inicijalni load + socket listeneri.
  useEffect(() => {
    let alive = true;
    listMyTickets().then((res) => {
      if (!alive) return;
      if (res.ok) setTickets(res.data.tickets);
      setLoading(false);
    });

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
      // Razgovor koji korisnik trenutno gleda ne prikazuje nepročitane.
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

    // Admin je trajno obrisao razgovor: skloni ga iz liste; ako je bio
    // otvoren, vrati prazno stanje.
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
      alive = false;
      socket.off("message:new", onMessage);
      socket.off("ticket:updated", onTicketUpdated);
      socket.off("ticket:deleted", onTicketDeleted);
      socket.off("presence:update", onPresence);
    };
  }, [upsertTicket]);

  // Auto-scroll na dno pri novim porukama.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  const openTicket = useCallback((id: number) => {
    const socket = connectSupportSocket();
    setActiveId(id);
    setComposing(false);
    setMessages([]);
    socket.emit(
      "ticket:join",
      { ticketId: id },
      (res: { ok: boolean; messages?: SupportMessage[] }) => {
        if (res?.ok && res.messages) setMessages(res.messages);
      },
    );
    // Lokalno očisti badge nepročitanih za taj tiket.
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)),
    );
  }, []);

  const sendMessage = useCallback(() => {
    const body = draft.trim();
    if (!body || activeId == null) return;
    // zatvoren razgovor je samo za čitanje (server slanje i odbija)
    if (tickets.find((t) => t.id === activeId)?.status === "ZATVOREN") return;
    const socket = connectSupportSocket();
    socket.emit("message:send", { ticketId: activeId, body });
    setDraft("");
  }, [draft, activeId, tickets]);

  const createTicket = useCallback(() => {
    const body = newBody.trim();
    if (!body) return;
    const socket = connectSupportSocket();
    socket.emit(
      "ticket:create",
      { subject: newSubject.trim() || "Podrška", body },
      (res: { ok: boolean; ticket?: SupportTicket }) => {
        if (res?.ok && res.ticket) {
          upsertTicket(res.ticket);
          setNewSubject("");
          setNewBody("");
          openTicket(res.ticket.id);
        }
      },
    );
  }, [newBody, newSubject, upsertTicket, openTicket]);

  const activeTicket = useMemo(
    () => tickets.find((t) => t.id === activeId) || null,
    [tickets, activeId],
  );

  const vidljivi = useMemo(
    () =>
      filter === "SVI" ? tickets : tickets.filter((t) => t.status === filter),
    [tickets, filter],
  );

  return (
    <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-hidden">
      {/* Zaglavlje sa online statusom */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-cream-300">
        <span className="inline-flex w-9 h-9 rounded-full bg-brand-100 text-brand-700 items-center justify-center">
          <IconHeadset size={18} />
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-text-primary leading-tight">
            Podrška
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
            <span
              className={[
                "inline-block w-2 h-2 rounded-full",
                adminsOnline ? "bg-success" : "bg-cream-300",
              ].join(" ")}
            />
            {adminsOnline
              ? "Tim je online"
              : "Tim trenutno nije online · ostavite poruku, odgovaramo tokom radnog dana"}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] min-h-[440px]">
        {/* Lijevo: lista razgovora */}
        <div
          className={[
            "border-r border-cream-300 flex flex-col",
            activeId != null || composing ? "hidden md:flex" : "flex",
          ].join(" ")}
        >
          <div className="p-3 border-b border-cream-300 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setComposing(true);
                setActiveId(null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 transition-colors"
            >
              <IconPlus size={16} /> Novi razgovor
            </button>
            {/* filter: zatvoreni razgovori ostaju čitljivi kao arhiva */}
            <div className="inline-flex self-start items-center gap-0.5 p-0.5 rounded-full border border-cream-300 bg-cream-50">
              {CHAT_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={[
                    "px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-colors whitespace-nowrap",
                    filter === f.id
                      ? "bg-brand-600 text-white"
                      : "text-text-tertiary hover:text-text-primary hover:bg-cream-200",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-[13px] text-text-tertiary">Učitavanje...</div>
            ) : tickets.length === 0 ? (
              <div className="p-4 text-[13px] text-text-tertiary">
                Nemate razgovora. Kliknite &quot;Novi razgovor&quot; da
                postavite pitanje.
              </div>
            ) : vidljivi.length === 0 ? (
              <div className="p-4 text-[13px] text-text-tertiary">
                Nema razgovora u ovoj kategoriji.
              </div>
            ) : (
              vidljivi.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTicket(t.id)}
                  className={[
                    "w-full text-left px-4 py-3 border-b border-cream-200 transition-colors",
                    t.id === activeId ? "bg-cream-200" : "hover:bg-cream-50",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-medium text-text-primary truncate">
                      {t.subject}
                    </span>
                    {t.unread > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[11px] font-medium">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[12px] text-text-tertiary truncate">
                      {t.lastMessage
                        ? (t.lastMessage.senderRole === "ADMIN" ? "Podrška: " : "") +
                          t.lastMessage.body
                        : "Bez poruka"}
                    </span>
                    {t.status === "ZATVOREN" && (
                      <span className="text-[11px] text-text-tertiary shrink-0">
                        Zatvoren
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Desno: nit poruka ili nova forma ili prazno stanje */}
        <div
          className={[
            "flex-col",
            activeId != null || composing ? "flex" : "hidden md:flex",
          ].join(" ")}
        >
          {composing ? (
            <div className="p-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setComposing(false)}
                className="md:hidden inline-flex items-center gap-1 text-[13px] text-text-tertiary"
              >
                <IconArrowLeft size={15} /> Nazad
              </button>
              <div className="font-serif-display text-[20px] text-text-primary">
                Novi razgovor
              </div>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Naslov (opcionalno)"
                className="w-full px-3 py-2 rounded-lg border border-cream-300 bg-white text-[13.5px] text-text-primary outline-none focus:border-brand-600"
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Opišite vaše pitanje..."
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-cream-300 bg-white text-[13.5px] text-text-primary outline-none focus:border-brand-600 resize-none"
              />
              <button
                type="button"
                onClick={createTicket}
                disabled={!newBody.trim()}
                className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                <IconSend size={15} /> Pošalji
              </button>
            </div>
          ) : activeTicket ? (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-cream-300">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="md:hidden inline-flex items-center text-text-tertiary"
                >
                  <IconArrowLeft size={17} />
                </button>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium text-text-primary truncate">
                    {activeTicket.subject}
                  </div>
                  <div className="text-[11.5px] text-text-tertiary">
                    {activeTicket.status === "ZATVOREN" ? "Zatvoren" : "Otvoren"}
                  </div>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5 bg-cream-50 max-h-[360px]"
              >
                {messages.map((m, i) => {
                  const mine = m.senderRole === "USER";
                  return (
                    <Fragment key={m.id}>
                      {/* separator na promjeni dana: starije poruke bez ovoga
                          nemaju vremenski kontekst (vidi se samo sat) */}
                      {noviDan(messages[i - 1]?.createdAt, m.createdAt) && (
                        <div className="self-center px-2.5 py-0.5 rounded-full bg-cream-200 text-text-tertiary text-[10.5px] font-medium">
                          {danLabel(m.createdAt)}
                        </div>
                      )}
                      <div
                        className={mine ? "self-end max-w-[78%]" : "self-start max-w-[78%]"}
                      >
                        <div
                          className={[
                            "px-3.5 py-2 rounded-2xl text-[13.5px] leading-snug",
                            mine
                              ? "bg-brand-600 text-white rounded-br-sm"
                              : "bg-white border border-cream-300 text-text-primary rounded-bl-sm",
                          ].join(" ")}
                        >
                          {m.body}
                        </div>
                        <div
                          className={[
                            "text-[10.5px] text-text-tertiary mt-1",
                            mine ? "text-right" : "text-left",
                          ].join(" ")}
                        >
                          {mine ? "Vi" : "Podrška"} · {timeLabel(m.createdAt)}
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
              </div>

              {activeTicket.status === "ZATVOREN" ? (
                <div className="flex items-center gap-2 px-4 py-3 border-t border-cream-300 bg-cream-100 text-[12.5px] text-text-tertiary">
                  <IconLock size={15} className="shrink-0" />
                  Razgovor je zatvoren i ne može se odgovarati. Za novo pitanje
                  otvorite novi razgovor.
                </div>
              ) : (
                <div className="flex items-end gap-2 p-3 border-t border-cream-300 bg-cream-100">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Napišite poruku..."
                    rows={1}
                    className="flex-1 px-3 py-2 rounded-lg border border-cream-300 bg-white text-[13.5px] text-text-primary outline-none focus:border-brand-600 resize-none max-h-24"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!draft.trim()}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 shrink-0"
                    aria-label="Pošalji"
                  >
                    <IconSend size={18} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <p className="text-[13.5px] text-text-tertiary max-w-xs">
                Odaberite razgovor sa liste ili pokrenite novi da postavite
                pitanje našem timu.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
