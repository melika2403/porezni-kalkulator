// Support (live chat korisnik / admin): jedinstveni izvor istine nad bazom.
// Koriste ga i REST kontroler (inicijalni load, historija) i socket handleri
// (realtime slanje/čitanje). Sve funkcije rade nad Sequelize modelima.
const { Op } = require("sequelize");
const {
  SupportTicket,
  SupportMessage,
  User,
} = require("../models/index");

// Serijalizuj poruku u oblik koji ide klijentu (bez suvišnih polja).
function serializeMessage(m) {
  return {
    id: m.id,
    ticketId: m.ticketId,
    senderId: m.senderId,
    senderRole: m.senderRole,
    body: m.body,
    createdAt: m.createdAt,
  };
}

// Broj nepročitanih poruka za jednu stranu u tiketu: poruke DRUGE strane
// nastale nakon što je ova strana zadnji put pročitala nit.
function unreadCountFor(ticket, role) {
  const messages = ticket.messages || [];
  const lastRead =
    role === "ADMIN" ? ticket.adminLastReadAt : ticket.userLastReadAt;
  const otherRole = role === "ADMIN" ? "USER" : "ADMIN";
  const lastReadMs = lastRead ? new Date(lastRead).getTime() : 0;
  return messages.filter(
    (m) =>
      m.senderRole === otherRole &&
      new Date(m.createdAt).getTime() > lastReadMs,
  ).length;
}

// Zajednička serijalizacija tiketa za listu/detalj. `role` određuje iz čije
// perspektive se računaju nepročitane.
function serializeTicket(ticket, role) {
  const messages = ticket.messages || [];
  const last = messages.length ? messages[messages.length - 1] : null;
  const u = ticket.user;
  return {
    id: ticket.id,
    userId: ticket.userId,
    subject: ticket.subject,
    status: ticket.status,
    lastMessageAt: ticket.lastMessageAt,
    createdAt: ticket.createdAt,
    unread: unreadCountFor(ticket, role),
    lastMessage: last
      ? { body: last.body, senderRole: last.senderRole, createdAt: last.createdAt }
      : null,
    user: u
      ? {
          id: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim(),
          email: u.email || null,
        }
      : null,
  };
}

// Učitaj tiket sa svim porukama i korisnikom (za serijalizaciju).
async function loadTicketFull(ticketId) {
  return SupportTicket.findByPk(ticketId, {
    include: [
      { model: SupportMessage, as: "messages" },
      { model: User, as: "user", attributes: ["id", "firstName", "lastName", "email"] },
    ],
    order: [[{ model: SupportMessage, as: "messages" }, "createdAt", "ASC"]],
  });
}

// Vlasnik tiketa ili bilo koji ADMIN smije pristupiti.
function hasAccess(ticket, user) {
  if (!ticket || !user) return false;
  return user.role === "ADMIN" || ticket.userId === Number(user.id);
}

async function createTicket({ userId, subject, body }) {
  const cleanSubject = String(subject || "").trim().slice(0, 200) || "Podrška";
  const cleanBody = String(body || "").trim();
  if (!cleanBody) throw new Error("EMPTY_BODY");

  const now = new Date();
  const ticket = await SupportTicket.create({
    userId,
    subject: cleanSubject,
    status: "OTVOREN",
    lastMessageAt: now,
    // Korisnik koji otvara nit odmah je "pročitao" svoju poruku.
    userLastReadAt: now,
    adminLastReadAt: null,
  });
  await SupportMessage.create({
    ticketId: ticket.id,
    senderId: userId,
    senderRole: "USER",
    body: cleanBody,
  });
  return loadTicketFull(ticket.id);
}

async function addMessage({ ticketId, senderId, senderRole, body }) {
  const cleanBody = String(body || "").trim();
  if (!cleanBody) throw new Error("EMPTY_BODY");

  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) throw new Error("TICKET_NOT_FOUND");

  const now = new Date();
  const message = await SupportMessage.create({
    ticketId,
    senderId,
    senderRole,
    body: cleanBody,
  });
  // Slanje poruke ujedno znači da je pošiljalac pročitao nit do sad.
  const patch = { lastMessageAt: now };
  if (senderRole === "ADMIN") patch.adminLastReadAt = now;
  else patch.userLastReadAt = now;
  // Nova poruka na zatvorenom tiketu ga ponovo otvara.
  if (ticket.status === "ZATVOREN") patch.status = "OTVOREN";
  await ticket.update(patch);

  return { message: serializeMessage(message), ticketOwnerId: ticket.userId };
}

async function markRead({ ticketId, role }) {
  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  const now = new Date();
  await ticket.update(
    role === "ADMIN" ? { adminLastReadAt: now } : { userLastReadAt: now },
  );
  return ticket;
}

async function setStatus({ ticketId, status }) {
  if (status !== "OTVOREN" && status !== "ZATVOREN") {
    throw new Error("INVALID_STATUS");
  }
  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  await ticket.update({ status });
  return loadTicketFull(ticketId);
}

async function listUserTickets(userId) {
  const tickets = await SupportTicket.findAll({
    where: { userId },
    include: [
      { model: SupportMessage, as: "messages" },
      { model: User, as: "user", attributes: ["id", "firstName", "lastName", "email"] },
    ],
    order: [
      ["lastMessageAt", "DESC"],
      [{ model: SupportMessage, as: "messages" }, "createdAt", "ASC"],
    ],
  });
  return tickets.map((t) => serializeTicket(t, "USER"));
}

async function listAdminTickets({ status } = {}) {
  const where = {};
  if (status === "OTVOREN" || status === "ZATVOREN") where.status = status;
  const tickets = await SupportTicket.findAll({
    where,
    include: [
      { model: SupportMessage, as: "messages" },
      { model: User, as: "user", attributes: ["id", "firstName", "lastName", "email"] },
    ],
    order: [
      ["lastMessageAt", "DESC"],
      [{ model: SupportMessage, as: "messages" }, "createdAt", "ASC"],
    ],
  });
  return tickets.map((t) => serializeTicket(t, "ADMIN"));
}

// Ukupan broj nepročitanih za stranu (za badge). Za ADMIN: kroz sve tikete;
// za USER: samo njegovi tiketi.
async function totalUnread({ role, userId }) {
  const where = {};
  if (role !== "ADMIN") where.userId = userId;
  const tickets = await SupportTicket.findAll({
    where,
    include: [{ model: SupportMessage, as: "messages" }],
  });
  return tickets.reduce((sum, t) => sum + unreadCountFor(t, role), 0);
}

async function getMessages(ticketId) {
  const messages = await SupportMessage.findAll({
    where: { ticketId },
    order: [["createdAt", "ASC"]],
  });
  return messages.map(serializeMessage);
}

async function getTicket(ticketId) {
  return SupportTicket.findByPk(ticketId);
}

module.exports = {
  serializeMessage,
  serializeTicket,
  loadTicketFull,
  hasAccess,
  createTicket,
  addMessage,
  markRead,
  setStatus,
  listUserTickets,
  listAdminTickets,
  totalUnread,
  getMessages,
  getTicket,
  Op,
};
