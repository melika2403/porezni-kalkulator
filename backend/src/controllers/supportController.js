// Support (live chat) REST kontroler: inicijalni load i historija. Realtime
// slanje/čitanje ide preko socketa (vidi src/socket.js), ali POST rute stoje
// kao fallback i takođe emituju preko socketa da bi obje strane ostale u sync-u.
const support = require("../services/supportService");
const {
  broadcastTicket,
  emitUnreadToUser,
  emitUnreadToAdmins,
} = require("../socket");

function ok(res, data) {
  return res.status(200).json({ ok: true, data });
}
function fail(res, code, error) {
  return res.status(code).json({ ok: false, error });
}

// ── Korisnik ──────────────────────────────────────────────────────────────────

async function listMyTickets(req, res) {
  try {
    const tickets = await support.listUserTickets(req.user.id);
    return ok(res, { tickets });
  } catch (e) {
    return fail(res, 500, e?.message || "ERROR");
  }
}

async function createTicket(req, res) {
  try {
    const full = await support.createTicket({
      userId: req.user.id,
      subject: req.body?.subject,
      body: req.body?.body,
    });
    broadcastTicket(full.id).catch(() => {});
    return ok(res, { ticket: support.serializeTicket(full, "USER") });
  } catch (e) {
    const code = e?.message === "EMPTY_BODY" ? 400 : 500;
    return fail(res, code, e?.message || "ERROR");
  }
}

// ── Zajedničko (korisnik-vlasnik ili admin) ─────────────────────────────────────

async function getMessages(req, res) {
  try {
    const ticketId = Number(req.params.id);
    const ticket = await support.getTicket(ticketId);
    if (!support.hasAccess(ticket, req.user)) return fail(res, 403, "FORBIDDEN");
    const messages = await support.getMessages(ticketId);
    return ok(res, { messages });
  } catch (e) {
    return fail(res, 500, e?.message || "ERROR");
  }
}

async function markRead(req, res) {
  try {
    const ticketId = Number(req.params.id);
    const ticket = await support.getTicket(ticketId);
    if (!support.hasAccess(ticket, req.user)) return fail(res, 403, "FORBIDDEN");
    await support.markRead({ ticketId, role: req.user.role });
    broadcastTicket(ticketId).catch(() => {});
    return ok(res, { id: ticketId });
  } catch (e) {
    return fail(res, 500, e?.message || "ERROR");
  }
}

// ── Admin ───────────────────────────────────────────────────────────────────

async function listAdminTickets(req, res) {
  try {
    const status = req.query.status;
    const tickets = await support.listAdminTickets({ status });
    return ok(res, { tickets });
  } catch (e) {
    return fail(res, 500, e?.message || "ERROR");
  }
}

async function setStatus(req, res) {
  try {
    const ticketId = Number(req.params.id);
    const full = await support.setStatus({
      ticketId,
      status: req.body?.status,
    });
    broadcastTicket(ticketId).catch(() => {});
    return ok(res, { ticket: support.serializeTicket(full, "ADMIN") });
  } catch (e) {
    const code = e?.message === "INVALID_STATUS" ? 400 : 500;
    return fail(res, code, e?.message || "ERROR");
  }
}

module.exports = {
  listMyTickets,
  createTicket,
  getMessages,
  markRead,
  listAdminTickets,
  setStatus,
};
