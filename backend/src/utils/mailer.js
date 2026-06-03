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

// ── INVOICE MAILER (poseban mailbox: noreply@poreznikalkulator.ba) ──────────
function createInvoiceTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_INVOICE_MAIL,
      pass: process.env.SMTP_INVOICE_MAIL_PW,
    },
    tls: { rejectUnauthorized: false },
  });
}

async function sendInvoiceEmail({ to, replyTo, isProforma, fullNumber, sellerName, buyerName, gross, currency = "BAM", dueDate, pdfBuffer, customMessage }) {
  const transporter = createInvoiceTransporter();
  const fromAddr = process.env.SMTP_INVOICE_MAIL || "noreply@poreznikalkulator.ba";
  const displayName = sellerName || "Porezni Kalkulator";
  const from = `"${displayName}" <${fromAddr}>`;
  const docTitle = isProforma ? "Predračun" : "Faktura";
  const filenameBase = isProforma ? "Predracun" : "Faktura";
  const cur = currency === "EUR" ? "EUR" : "KM";
  const grossStr = Number(gross || 0).toFixed(2).replace(".", ",");
  const due = dueDate ? new Date(dueDate) : null;
  const dueStr = due && !Number.isNaN(due.getTime())
    ? `${String(due.getDate()).padStart(2, "0")}.${String(due.getMonth() + 1).padStart(2, "0")}.${due.getFullYear()}.`
    : null;

  const intro = customMessage && String(customMessage).trim()
    ? String(customMessage).trim()
    : `U prilogu se nalazi ${docTitle.toLowerCase()} br. ${fullNumber}${sellerName ? ` od ${sellerName}` : ""}.`;

  await transporter.sendMail({
    from,
    to,
    replyTo: replyTo || undefined,
    subject: `${docTitle} br. ${fullNumber}${sellerName ? ` — ${sellerName}` : ""}`,
    text:
`Poštovani${buyerName ? ` ${buyerName}` : ""},

${intro}

Iznos za naplatu: ${grossStr} ${cur}${dueStr ? `\nDatum dospijeća: ${dueStr}` : ""}

${replyTo ? `Za sva pitanja odgovorite na ovaj email — odlazi direktno na ${replyTo}.` : ""}

— ${displayName}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">${docTitle} br. ${fullNumber}</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
          Poštovani${buyerName ? ` <strong>${buyerName}</strong>` : ""},<br/>
          ${intro.replace(/\n/g, "<br/>")}
        </p>
        <div style="background:#f5f2eb; border:1px solid #d4cfc4; border-radius:8px; padding:16px 20px; margin: 20px 0;">
          <div style="font-size:12px; color:#7a8a7d; text-transform:uppercase; letter-spacing:.06em;">Iznos za naplatu</div>
          <div style="font-size:28px; font-weight:600; color:#3a5c42; margin-top:4px;">${grossStr} ${cur}</div>
          ${dueStr ? `<div style="font-size:12px; color:#7a8a7d; margin-top:6px;">Dospijeće: <strong>${dueStr}</strong></div>` : ""}
        </div>
        ${replyTo ? `<p style="color:#666; font-size:14px; line-height:1.6;">Za sva pitanja odgovorite na ovaj email — odlazi direktno na <strong>${replyTo}</strong>.</p>` : ""}
        <p style="color:#999; font-size:12px; margin-top:32px; border-top:1px solid #e5e7eb; padding-top:16px;">
          — ${displayName}<br/>
          <span style="color:#bbb;">Poslano preko poreznikalkulator.ba</span>
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `${filenameBase}-${String(fullNumber).replace(/\//g, "-")}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

async function sendWelcomeEmail(to, firstName, trialUrl) {
  const transporter = createTransporter();
  const displayName = process.env.SMTP_FROM || "Porezni Kalkulator";
  const from = `"${displayName}" <${process.env.SMTP_USER}>`;

  const proFeatures = [
    "Šihterica — evidencija radnog vremena za sve radnike + PDF",
    "Generator članskih kartica",
    "Fakture/računi i predračuni za vaše klijente",
    "Dodavanje do 20 klijenata i fizičkih lica",
    "Do 5 radnika po organizaciji",
    "Prijave/odjave radnika, JS3000 obrazac",
    "Obračun plata i doprinosa",
    "Generisanje uplatnica za plate i doprinose",
  ];

  const featuresHtml = proFeatures
    .map(
      (f) =>
        `<li style="margin-bottom:8px; color:#444; font-size:14px; line-height:1.5;">${f}</li>`,
    )
    .join("");
  const featuresText = proFeatures.map((f) => `  • ${f}`).join("\n");

  await transporter.sendMail({
    from,
    to,
    subject: "30 dana PRO besplatno — počnite sa šihtericom",
    text: `Zdravo ${firstName},

Hvala što ste potvrdili email adresu na Porezni Kalkulator.

Aktivirajte 30 dana PRO pretplate BESPLATNO i odmah probajte našu šihtericu — vodite mjesečnu evidenciju radnog vremena za sve radnike i preuzmite popunjeni PDF obrazac prema propisima FBiH.

Aktivirajte ovdje: ${trialUrl}

Šta dobijate uz PRO:
${featuresText}

Bez kartice, bez automatske naplate. Nakon 30 dana automatski se vraćate na besplatan plan.

— Porezni Kalkulator`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #7a8a7d; margin-bottom: 8px;">
          Dobrodošli na Porezni Kalkulator
        </div>
        <h2 style="font-size: 26px; font-weight: 600; margin: 0 0 12px; color: #1a1a1a;">
          30 dana <span style="color:#3a5c42;">PRO</span> besplatno
        </h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Zdravo <strong>${firstName}</strong>, hvala što ste potvrdili email.
        </p>

        <div style="background: linear-gradient(135deg, #f5f2eb 0%, #ebe6d8 100%); border: 1px solid #d4cfc4; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
          <div style="font-size: 13px; font-weight: 600; color: #3a5c42; margin-bottom: 8px;">
            ⭐ NAŠA NAJNOVIJA FUNKCIJA
          </div>
          <div style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">
            Šihterica — evidencija radnog vremena
          </div>
          <p style="color: #555; font-size: 14px; line-height: 1.55; margin: 0;">
            Vodite mjesečnu evidenciju radnog vremena za sve radnike prema propisima FBiH
            i preuzmite popunjeni PDF obrazac jednim klikom.
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${trialUrl}"
             style="display: inline-block; background: #3a5c42; color: #fff; text-decoration: none;
                    padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Aktiviraj 30 dana besplatno →
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 8px;">
          <div style="font-size: 13px; font-weight: 600; color: #3a5c42; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px;">
            Šta dobijate uz PRO
          </div>
          <ul style="padding-left: 20px; margin: 0;">
            ${featuresHtml}
          </ul>
        </div>

        <div style="text-align: center; margin: 28px 0 8px;">
          <a href="${trialUrl}"
             style="display: inline-block; background: #3a5c42; color: #fff; text-decoration: none;
                    padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Aktiviraj 30 dana besplatno →
          </a>
        </div>

        <p style="color: #999; font-size: 12px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
          Bez kartice, bez automatske naplate. Nakon 30 dana automatski se vraćate na besplatan plan.
        </p>
      </div>
    `,
  });
}

// ── POZIV NA BESPLATNI TRIAL (admin → korisnik koji nije aktivirao trial) ────
async function sendTrialInviteEmail(to, firstName, { trialUrl }) {
  const transporter = createTransporter();
  const displayName = process.env.SMTP_FROM || "Porezni Kalkulator";
  const from = `"${displayName}" <${process.env.SMTP_USER}>`;

  const features = [
    "Fakture i predračuni za vaše klijente",
    "Ugovori o djelu sa automatskim obračunom poreza i doprinosa",
    "Šihterica, evidencija radnog vremena uz PDF obrazac",
    "Obračun plata i doprinosa, sa uplatnicama",
  ];
  const featuresHtml = features
    .map(
      (f) =>
        `<li style="margin-bottom:8px; color:#444; font-size:14px; line-height:1.5;">${f}</li>`,
    )
    .join("");
  const featuresText = features.map((f) => `  • ${f}`).join("\n");

  await transporter.sendMail({
    from,
    to,
    subject: "Vaš besplatni mjesec vas i dalje čeka — Porezni Kalkulator",
    text: `Zdravo ${firstName},

Primijetili smo da još niste aktivirali svoj besplatni mjesec (30 dana PRO) na Porezni Kalkulator. Dobra vijest: i dalje vas čeka.

Uz PRO besplatno mjesec dana dobijate:
${featuresText}

Aktivirajte ovdje (bez kartice, bez obaveza):
${trialUrl}

Ako imate bilo kakvo pitanje, slobodno odgovorite na ovaj email, rado pomažemo.

— Porezni Kalkulator`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #7a8a7d; margin-bottom: 8px;">
          Vaš besplatni mjesec
        </div>
        <h2 style="font-size: 24px; font-weight: 600; margin: 0 0 12px;">
          30 dana <span style="color:#3a5c42;">PRO</span> vas i dalje čeka
        </h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
          Zdravo <strong>${firstName}</strong>, primijetili smo da još niste
          aktivirali svoj besplatni mjesec. Evo šta dobijate uz PRO:
        </p>
        <ul style="padding-left: 20px; margin: 0 0 24px;">
          ${featuresHtml}
        </ul>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${trialUrl}"
             style="display: inline-block; background: #3a5c42; color: #fff; text-decoration: none;
                    padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Aktiviraj 30 dana besplatno →
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          Bez kartice, bez obaveza. Ako imate pitanje, samo odgovorite na ovaj
          email, rado pomažemo.
        </p>
        <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Link: <a href="${trialUrl}" style="color: #3a5c42;">${trialUrl}</a>
        </p>
      </div>
    `,
  });
}

// ── PODSJETNIK ZA OBNOVU PRETPLATE ──────────────────────────────────────────
// Poruka se prilagođava stanju: pred istek (daysLeft > 0), ističe danas
// (daysLeft === 0) ili već isteklo (daysLeft < 0).
async function sendSubscriptionReminderEmail(
  to,
  firstName,
  { plan, endDateStr, renewUrl, daysLeft = null, isTrial = false },
) {
  const transporter = createTransporter();
  const displayName = process.env.SMTP_FROM || "Porezni Kalkulator";
  const from = `"${displayName}" <${process.env.SMTP_USER}>`;
  const planStr = plan ? ` ${plan}` : "";

  const expired = typeof daysLeft === "number" && daysLeft < 0;
  const today = typeof daysLeft === "number" && daysLeft === 0;
  const dStr =
    daysLeft === 1 ? "za 1 dan" : daysLeft != null ? `za ${daysLeft} dana` : "uskoro";

  // Naziv onoga što ističe + glagol akcije (trial → aktivirajte, plaćena → obnovite).
  const thing = isTrial ? "Vaš besplatni probni period (trial)" : `Vaša${planStr} pretplata`;
  const thingShort = isTrial ? "Probni period" : "Pretplata";
  const act = isTrial
    ? "Aktivirajte pretplatu da nastavite bez prekida."
    : "Obnovite je da nastavite bez prekida.";
  const ctaLabel = isTrial ? "Aktiviraj pretplatu" : "Generiši novi predračun";
  const renewLine = isTrial
    ? "Da aktivirate pretplatu, odaberite Pro ili Business plan na stranici, ili odgovorite na ovaj email."
    : "Ako želite produžiti pretplatu, odgovorite na ovaj email ili generišite novi predračun na stranici.";

  let subject;
  let heading;
  let lead;
  if (expired) {
    subject = `${thingShort} je istek${isTrial ? "ao" : "la"} — Porezni Kalkulator`;
    heading = `${thingShort} je istek${isTrial ? "ao" : "la"}`;
    lead = `${thing} na Porezni Kalkulator ${isTrial ? "je istekao" : "je istekla"} ${endDateStr}. ${
      isTrial
        ? "Aktivirajte pretplatu da ponovo otključate sve funkcije."
        : "Obnovite je da ponovo otključate sve funkcije."
    }`;
  } else if (today) {
    subject = `${thingShort} ističe danas — Porezni Kalkulator`;
    heading = `${thingShort} ističe danas`;
    lead = `${thing} na Porezni Kalkulator ističe danas (${endDateStr}). ${act}`;
  } else {
    subject = `${thingShort} ističe ${dStr} — Porezni Kalkulator`;
    heading = `${thingShort} ističe ${dStr}`;
    lead = `${thing} na Porezni Kalkulator ističe ${dStr} (${endDateStr}). ${act}`;
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    text: `Zdravo ${firstName},

${lead}

${renewLine}
${renewUrl}

— Porezni Kalkulator`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">${heading}</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">
          Zdravo <strong>${firstName}</strong>,
        </p>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          ${lead}
        </p>
        <a href="${renewUrl}"
           style="display: inline-block; background: #3a5c42; color: #fff; text-decoration: none;
                  padding: 13px 28px; border-radius: 8px; font-size: 15px; font-weight: 500; margin-bottom: 24px;">
          ${ctaLabel}
        </a>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 4px;">
          ${renewLine}
        </p>
        <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Link: <a href="${renewUrl}" style="color: #3a5c42;">${renewUrl}</a>
        </p>
      </div>
    `,
  });
}

// ── PAYSLIP MAILER (preko invoice mailbox-a noreply@) ───────────────────────
async function sendPayslipEmail({
  to,
  workerName,
  organizationName,
  year,
  month,
  netAmount,
  pdfBuffer,
}) {
  const transporter = createInvoiceTransporter();
  const fromAddr = process.env.SMTP_INVOICE_MAIL || "noreply@poreznikalkulator.ba";
  const displayName = organizationName || "Porezni Kalkulator";
  const from = `"${displayName}" <${fromAddr}>`;
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  const periodHr = `${MJESECI[month - 1] || mm}. ${yyyy}.`;
  const netoStr = Number(netAmount || 0).toFixed(2).replace(".", ",");

  await transporter.sendMail({
    from,
    to,
    subject: `Platni listić — ${periodHr} — ${workerName}`,
    text:
`Poštovani${workerName ? ` ${workerName}` : ""},

U prilogu se nalazi platni listić za ${periodHr}${organizationName ? ` od ${organizationName}` : ""}.

Neto za isplatu: ${netoStr} KM

— ${displayName}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Platni listić</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
          Poštovani${workerName ? ` <strong>${workerName}</strong>` : ""},<br/>
          u prilogu se nalazi platni listić za <strong>${periodHr}</strong>${organizationName ? ` od <strong>${organizationName}</strong>` : ""}.
        </p>
        <div style="background:#f5f2eb; border:1px solid #d4cfc4; border-radius:8px; padding:16px 20px; margin: 20px 0;">
          <div style="font-size:12px; color:#7a8a7d; text-transform:uppercase; letter-spacing:.06em;">Neto za isplatu</div>
          <div style="font-size:28px; font-weight:600; color:#3a5c42; margin-top:4px;">${netoStr} KM</div>
        </div>
        <p style="color:#999; font-size:12px; margin-top:32px; border-top:1px solid #e5e7eb; padding-top:16px;">
          — ${displayName}<br/>
          <span style="color:#bbb;">Poslano preko poreznikalkulator.ba</span>
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `Platni-listic-${mm}-${yyyy}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

const MJESECI = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendContactEmail,
  sendPredracunEmail,
  sendInvoiceEmail,
  sendWelcomeEmail,
  sendPayslipEmail,
  sendSubscriptionReminderEmail,
  sendTrialInviteEmail,
};
