// Socket.IO setup za live chat podršku (korisnik ↔ admin).
//
// Auth: JWT iz httpOnly cookie `access_token` koji browser automatski šalje na
// WS handshake (uz withCredentials na klijentu). Nema `cookie` paketa kao
// top-level dependency pa cookie header parsiramo ručno.
//
// Rooms:
//   user:<id>      → svi socketi jednog korisnika (badge/notifikacije)
//   admins         → svi prijavljeni admini
//   ticket:<id>    → strane koje trenutno gledaju konkretan razgovor
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const support = require("./services/supportService");
const notifikacije = require("./services/notificationsService");

let io = null;

// userId -> broj aktivnih konekcija (presence). Admini se posebno prate.
const connections = new Map();

function addConnection(userId, role) {
  const key = Number(userId);
  connections.set(key, {
    count: (connections.get(key)?.count || 0) + 1,
    role,
  });
}
function removeConnection(userId) {
  const key = Number(userId);
  const cur = connections.get(key);
  if (!cur) return;
  if (cur.count <= 1) connections.delete(key);
  else connections.set(key, { ...cur, count: cur.count - 1 });
}
function isAdminOnline() {
  for (const v of connections.values()) if (v.role === "ADMIN") return true;
  return false;
}
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

async function getUserFromHandshake(socket) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const cookies = parseCookies(socket.handshake.headers?.cookie);
  const token =
    cookies.access_token || socket.handshake.auth?.token || null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret);
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    // Rola iz BAZE, ne iz token payloada (isto pravilo kao requireAuth):
    // stari token bivšeg admina ne smije ući u "admins" sobu podrške.
    const { User } = require("./models/index");
    const user = await User.findByPk(id, { attributes: ["id", "role"] });
    if (!user) return null;
    return { id, role: user.role };
  } catch {
    return null;
  }
}

// ── Emit helperi ─────────────────────────────────────────────────────────────

function emitPresence() {
  if (!io) return;
  io.emit("presence:update", { adminsOnline: isAdminOnline() });
}

async function emitUnreadToUser(userId) {
  if (!io) return;
  try {
    const total = await support.totalUnread({ role: "USER", userId });
    io.to(`user:${userId}`).emit("unread:update", { total });
  } catch (e) {
    console.warn("emitUnreadToUser:", e?.message || e);
  }
}

async function emitUnreadToAdmins() {
  if (!io) return;
  try {
    const total = await support.totalUnread({ role: "ADMIN" });
    io.to("admins").emit("unread:update", { total });
  } catch (e) {
    console.warn("emitUnreadToAdmins:", e?.message || e);
  }
}

// Osvježi listu razgovora na obje strane (svaka dobija svoju perspektivu
// nepročitanih) + ukupne badge brojeve.
async function broadcastTicket(ticketId) {
  if (!io) return;
  const full = await support.loadTicketFull(ticketId);
  if (!full) return;
  io.to("admins").emit("ticket:updated", {
    ticket: support.serializeTicket(full, "ADMIN"),
  });
  io.to(`user:${full.userId}`).emit("ticket:updated", {
    ticket: support.serializeTicket(full, "USER"),
  });
  await emitUnreadToUser(full.userId);
  await emitUnreadToAdmins();
}

// ── Setup ────────────────────────────────────────────────────────────────────

function initSocket(server) {
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const user = await getUserFromHandshake(socket);
    if (!user) return next(new Error("UNAUTHENTICATED"));
    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    socket.join(`user:${user.id}`);
    if (user.role === "ADMIN") socket.join("admins");
    addConnection(user.id, user.role);
    emitPresence();

    // Inicijalni badge broj za ovu konekciju.
    if (user.role === "ADMIN") emitUnreadToAdmins();
    else emitUnreadToUser(user.id);

    // Korisnik kreira novi razgovor.
    socket.on("ticket:create", async (payload, ack) => {
      try {
        const full = await support.createTicket({
          userId: user.id,
          subject: payload?.subject,
          body: payload?.body,
        });
        socket.join(`ticket:${full.id}`);
        const forUser = support.serializeTicket(full, "USER");
        if (typeof ack === "function") ack({ ok: true, ticket: forUser });
        await broadcastTicket(full.id);
      } catch (e) {
        if (typeof ack === "function") ack({ ok: false, error: e?.message || "ERROR" });
      }
    });

    // Otvaranje razgovora: pristup + join + označi pročitanim + vrati poruke.
    // Čitanje se markira po PERSPEKTIVI, ne po roli iz JWT-a: vlasnik tiketa
    // čita korisničku stranu (i admin može biti vlasnik svog tiketa!), admin
    // admin stranu. Inače adminu koji otvori vlastiti chat unread nikad ne padne.
    socket.on("ticket:join", async (payload, ack) => {
      try {
        const ticketId = Number(payload?.ticketId);
        const ticket = await support.getTicket(ticketId);
        if (!support.hasAccess(ticket, user)) throw new Error("FORBIDDEN");
        socket.join(`ticket:${ticketId}`);
        if (Number(ticket.userId) === Number(user.id)) {
          await support.markRead({ ticketId, role: "USER" });
        }
        if (user.role === "ADMIN") {
          await support.markRead({ ticketId, role: "ADMIN" });
        }
        const messages = await support.getMessages(ticketId);
        if (typeof ack === "function") ack({ ok: true, messages });
        // Čitanje mijenja unread → osvježi badge/listu.
        await broadcastTicket(ticketId);
      } catch (e) {
        if (typeof ack === "function") ack({ ok: false, error: e?.message || "ERROR" });
      }
    });

    socket.on("ticket:leave", (payload) => {
      const ticketId = Number(payload?.ticketId);
      if (ticketId) socket.leave(`ticket:${ticketId}`);
    });

    // Slanje poruke u postojeći razgovor.
    socket.on("message:send", async (payload, ack) => {
      try {
        const ticketId = Number(payload?.ticketId);
        const ticket = await support.getTicket(ticketId);
        if (!support.hasAccess(ticket, user)) throw new Error("FORBIDDEN");
        // Zatvoren razgovor: korisnik ne može odgovarati (čita samo); poruka
        // admina na zatvoren tiket ga ponovo otvara (addMessage to radi).
        if (ticket.status === "ZATVOREN" && user.role !== "ADMIN") {
          throw new Error("TICKET_CLOSED");
        }
        const { message } = await support.addMessage({
          ticketId,
          senderId: user.id,
          senderRole: user.role === "ADMIN" ? "ADMIN" : "USER",
          body: payload?.body,
        });
        io.to(`ticket:${ticketId}`).emit("message:new", { message });
        // Strane koje razgovor trenutno gledaju odmah su "pročitale" novu
        // poruku — bez ovoga unread raste i dok je druga strana u chatu.
        const room = io.sockets.adapter.rooms.get(`ticket:${ticketId}`);
        if (room) {
          let adminInRoom = false;
          let ownerInRoom = false;
          for (const sid of room) {
            const u = io.sockets.sockets.get(sid)?.data?.user;
            if (!u) continue;
            if (u.role === "ADMIN") adminInRoom = true;
            if (Number(u.id) === Number(ticket.userId)) ownerInRoom = true;
          }
          if (adminInRoom) await support.markRead({ ticketId, role: "ADMIN" });
          if (ownerInRoom) await support.markRead({ ticketId, role: "USER" });
        }
        // admin odgovorio a vlasnik tiketa nije online → email obavijest
        // (fire-and-forget: email nikad ne smije usporiti/srušiti slanje)
        if (user.role === "ADMIN") {
          const ownerOnline = connections.has(Number(ticket.userId));
          notifikacije
            .podrskaOfflineEmail({ ticket, ownerOnline })
            .catch((e) =>
              console.warn("podrska email:", e?.message || e),
            );
        }
        if (typeof ack === "function") ack({ ok: true, message });
        await broadcastTicket(ticketId);
      } catch (e) {
        if (typeof ack === "function") ack({ ok: false, error: e?.message || "ERROR" });
      }
    });

    // Označi razgovor pročitanim (npr. kad korisnik skroluje/fokusira nit).
    // Ista logika perspektive kao kod ticket:join.
    socket.on("ticket:read", async (payload, ack) => {
      try {
        const ticketId = Number(payload?.ticketId);
        const ticket = await support.getTicket(ticketId);
        if (!support.hasAccess(ticket, user)) throw new Error("FORBIDDEN");
        if (Number(ticket.userId) === Number(user.id)) {
          await support.markRead({ ticketId, role: "USER" });
        }
        if (user.role === "ADMIN") {
          await support.markRead({ ticketId, role: "ADMIN" });
        }
        if (typeof ack === "function") ack({ ok: true });
        await broadcastTicket(ticketId);
      } catch (e) {
        if (typeof ack === "function") ack({ ok: false, error: e?.message || "ERROR" });
      }
    });

    // Admin mijenja status (zatvori / ponovo otvori).
    socket.on("ticket:setStatus", async (payload, ack) => {
      try {
        if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
        const ticketId = Number(payload?.ticketId);
        await support.setStatus({ ticketId, status: payload?.status });
        if (typeof ack === "function") ack({ ok: true });
        await broadcastTicket(ticketId);
      } catch (e) {
        if (typeof ack === "function") ack({ ok: false, error: e?.message || "ERROR" });
      }
    });

    // Admin trajno briše razgovor (sa porukama). Obje strane odmah uklanjaju
    // tiket iz liste (ticket:deleted) i osvježavaju unread brojeve.
    socket.on("ticket:delete", async (payload, ack) => {
      try {
        if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
        const ticketId = Number(payload?.ticketId);
        const { userId } = await support.deleteTicket(ticketId);
        io.to("admins").emit("ticket:deleted", { ticketId });
        io.to(`user:${userId}`).emit("ticket:deleted", { ticketId });
        if (typeof ack === "function") ack({ ok: true });
        await emitUnreadToUser(userId);
        await emitUnreadToAdmins();
      } catch (e) {
        if (typeof ack === "function") ack({ ok: false, error: e?.message || "ERROR" });
      }
    });

    socket.on("disconnect", () => {
      removeConnection(user.id);
      emitPresence();
    });
  });

  return io;
}

function getIo() {
  return io;
}

module.exports = {
  initSocket,
  getIo,
  broadcastTicket,
  emitUnreadToUser,
  emitUnreadToAdmins,
};
