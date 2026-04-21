const { sendContactEmail } = require("../utils/mailer");

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

async function send(req, res) {
  const { ime, email, poruka } = req.body ?? {};

  if (
    !isNonEmptyString(ime) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(poruka)
  ) {
    return res.status(400).json({ ok: false, error: "Sva polja su obavezna." });
  }

  try {
    await sendContactEmail({
      ime: ime.trim(),
      email: email.trim(),
      poruka: poruka.trim(),
    });
    return res.status(200).json({ ok: true, data: null });
  } catch (e) {
    console.error("contact send error:", e);
    return res.status(500).json({ ok: false, error: "Slanje nije uspjelo." });
  }
}

module.exports = { send };
