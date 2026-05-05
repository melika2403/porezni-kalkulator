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
    tls: {
      rejectUnauthorized: false,
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

async function sendVerificationEmail(to, firstName, verifyUrl) {
  const transporter = createTransporter();
  const displayName = process.env.SMTP_FROM || "Porezni Kalkulator";
  const from = `"${displayName}" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: "Potvrdite vašu email adresu — Porezni Kalkulator",
    text: `Zdravo ${firstName},\n\nHvala što ste se registrovali na Porezni Kalkulator.\n\nKliknite na sljedeći link da potvrdite vašu email adresu (link važi 24 sata):\n${verifyUrl}\n\nAko se niste registrovali, ignorišite ovaj email.`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Potvrdite vašu email adresu</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">
          Zdravo <strong>${firstName}</strong>,
        </p>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
          Hvala što ste se registrovali na <strong>Porezni Kalkulator</strong>.
          Kliknite na dugme ispod da potvrdite vašu email adresu. Link važi <strong>24 sata</strong>.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: #3a5c42; color: #fff; text-decoration: none;
                  padding: 13px 28px; border-radius: 8px; font-size: 15px; font-weight: 500; margin-bottom: 28px;">
          Potvrdi email adresu
        </a>
        <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Ako se niste registrovali na Porezni Kalkulator, ignorišite ovaj email.<br/>
          Link: <a href="${verifyUrl}" style="color: #3a5c42;">${verifyUrl}</a>
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

async function sendPredracunEmail({ to, buyerName, fullNumber, plan, gross, pdfBuffer }) {
  const transporter = createTransporter();
  const displayName = process.env.SMTP_FROM || "Porezni Kalkulator";
  const from = `"${displayName}" <${process.env.SMTP_USER}>`;
  const grossStr = Number(gross).toFixed(2).replace(".", ",");

  await transporter.sendMail({
    from,
    to,
    subject: `Predračun br. ${fullNumber} — Porezni Kalkulator`,
    text:
`Poštovani${buyerName ? ` ${buyerName}` : ""},

U prilogu se nalazi predračun br. ${fullNumber} za godišnju pretplatu ${plan} na poreznikalkulator.ba.

Iznos za naplatu: ${grossStr} KM (sa PDV-om).

Nakon evidentiranja uplate, vaš nalog će biti aktiviran.

Hvala vam na povjerenju!
— Porezni Kalkulator`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Predračun br. ${fullNumber}</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
          Poštovani${buyerName ? ` <strong>${buyerName}</strong>` : ""},<br/>
          u prilogu se nalazi predračun za godišnju pretplatu
          <strong>${plan}</strong> na <strong>poreznikalkulator.ba</strong>.
        </p>
        <div style="background:#f5f2eb; border:1px solid #d4cfc4; border-radius:8px; padding:16px 20px; margin: 20px 0;">
          <div style="font-size:12px; color:#7a8a7d; text-transform:uppercase; letter-spacing:.06em;">Iznos za naplatu</div>
          <div style="font-size:28px; font-weight:600; color:#3a5c42; margin-top:4px;">${grossStr} KM</div>
          <div style="font-size:12px; color:#7a8a7d; margin-top:2px;">sa PDV-om (17%)</div>
        </div>
        <p style="color:#666; font-size:14px; line-height:1.6;">
          Nakon evidentiranja uplate, vaš nalog će biti aktiviran.
        </p>
        <p style="color:#999; font-size:12px; margin-top:32px; border-top:1px solid #e5e7eb; padding-top:16px;">
          Hvala vam na povjerenju!<br/>— Porezni Kalkulator
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `Predracun-${fullNumber.replace(/\//g, "-")}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendContactEmail,
  sendPredracunEmail,
};
