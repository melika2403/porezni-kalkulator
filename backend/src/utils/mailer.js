const nodemailer = require("nodemailer");

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail(to, resetUrl) {
  const transporter = createTransporter();
  const displayName = process.env.SMTP_FROM || "Porezni Kalkulator";
  const from = `"${displayName}" <${process.env.SMTP_USER}>`;

  console.log(`Slanje emaila za reset lozinke na ${to}...`);

  await transporter.sendMail({
    from,
    to,
    subject: "Reset lozinke — Porezni Kalkulator",
    text: `Primili ste zahtjev za resetovanje lozinke.\n\nKliknite na sljedeći link da resetujete lozinku (link važi 1 sat):\n${resetUrl}\n\nAko niste tražili reset lozinke, ignorišite ovaj email.`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Reset lozinke</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
          Primili ste zahtjev za resetovanje lozinke vašeg naloga na <strong>Porezni Kalkulator</strong>.
          Link važi <strong>1 sat</strong>.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #3a5c42; color: #fff; text-decoration: none;
                  padding: 13px 28px; border-radius: 8px; font-size: 15px; font-weight: 500; margin-bottom: 28px;">
          Resetuj lozinku
        </a>
        <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Ako niste tražili reset lozinke, ignorišite ovaj email — vaš nalog ostaje siguran.<br/>
          Link za reset: <a href="${resetUrl}" style="color: #3a5c42;">${resetUrl}</a>
        </p>
      </div>
    `,
  });
}

async function sendContactEmail({ ime, email, poruka }) {
  const transporter = createTransporter();

  const displayName = process.env.SMTP_FROM || "Porezni Kalkulator";
  const from = `"${displayName}" <${process.env.SMTP_USER}>`;
  const to = process.env.CONTACT_TO || "info@poreznikalkulator.ba";

  await transporter.sendMail({
    from,
    to,
    replyTo: email,
    subject: `Kontakt forma — poruka od ${ime}`,
    text: `Ime: ${ime}\nEmail: ${email}\n\nPoruka:\n${poruka}`,
  });
}

module.exports = { sendPasswordResetEmail, sendContactEmail };
