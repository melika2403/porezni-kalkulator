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
    subject: "Reset lozinke, Porezni Kalkulator",
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
          Ako niste tražili reset lozinke, ignorišite ovaj email, vaš nalog ostaje siguran.<br/>
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
    subject: "Potvrdite vašu email adresu, Porezni Kalkulator",
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
    subject: `Kontakt forma, poruka od ${ime}`,
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
    subject: `Predračun br. ${fullNumber}, Porezni Kalkulator`,
    text:
`Poštovani${buyerName ? ` ${buyerName}` : ""},

U prilogu se nalazi predračun br. ${fullNumber} za godišnju pretplatu ${plan} na poreznikalkulator.ba.

Iznos za naplatu: ${grossStr} KM (sa PDV-om).

Nakon evidentiranja uplate, vaš nalog će biti aktiviran.

Hvala vam na povjerenju!
, Porezni Kalkulator`,
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
          Hvala vam na povjerenju!<br/>, Porezni Kalkulator
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
    subject: `${docTitle} br. ${fullNumber}${sellerName ? `, ${sellerName}` : ""}`,
    text:
`Poštovani${buyerName ? ` ${buyerName}` : ""},

${intro}

Iznos za naplatu: ${grossStr} ${cur}${dueStr ? `\nDatum dospijeća: ${dueStr}` : ""}

${replyTo ? `Za sva pitanja odgovorite na ovaj email, odlazi direktno na ${replyTo}.` : ""}

, ${displayName}`,
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
        ${replyTo ? `<p style="color:#666; font-size:14px; line-height:1.6;">Za sva pitanja odgovorite na ovaj email, odlazi direktno na <strong>${replyTo}</strong>.</p>` : ""}
        <p style="color:#999; font-size:12px; margin-top:32px; border-top:1px solid #e5e7eb; padding-top:16px;">
          , ${displayName}<br/>
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

// ── Dijeljeni dijelovi PK Office mailova (welcome + trial reminder) ─────────
// Email-safe inline stilovi (bez slika i webfontova). Paleta: cream #f5f2eb,
// sage #3a5c42, tamnozelena hero sekcija #1e2b21 sa terakota #c8622a CTA
// (ista kombinacija kao "Paketi" sekcija na sajtu).

const OFFICE_MODULI = [
  ["Bankovni izvodi se knjiže sami", "učitate PDF izvod, KPR uvijek ažuran"],
  ["Fakture i partneri", "KIF, kartice kupaca, IOS i opomene"],
  ["PDV evidencije", "KUF/KIF, PDV prijava i D-PDV izvoz"],
  ["Roba i maloprodaja", "kalkulacije, lager lista i popis"],
  ["Plate i radnici", "MIP-1023, 2001/2002, šihterica, JS3100"],
  ["Blagajna i putni nalozi", "dnevnik blagajne, dnevnice"],
  ["Godišnje obaveze", "SPR, GPD, amortizacija, zaključak godine"],
  ["Pregled poslovanja", "dashboard sa stanjem i rokovima obrta"],
];

const BUSINESS_BONUS = [
  "Obračun plata bez limita broja radnika",
  "MIP-1023 i GIP-1022 izvještaji",
  "Šihterica sa PDF obrascem",
  "Fakture, predračuni i svi ugovori",
  "Rješenja i odluke (godišnji odmor, regres, odsustva)",
  "Neograničen broj klijenata",
];

// tamnozelena PK Office kartica sa terakota CTA (HTML)
function officeHeroHtml(trialUrl, moduli) {
  const rows = moduli
    .map(
      ([b, d]) =>
        `<tr><td style="padding:4px 0; font-size:13.5px; line-height:1.5; color:#e8e4d8;">` +
        `<span style="color:#e07b3f; font-weight:700;">&#10003;&nbsp;</span>` +
        `<strong style="color:#ffffff;">${b}</strong>, ${d}</td></tr>`,
    )
    .join("");
  return `
        <div style="background:#1e2b21; border-radius:14px; padding:26px 24px; margin:24px 0;">
          <div style="text-align:center; margin-bottom:6px;">
            <span style="display:inline-block; background:#c8622a; color:#ffffff; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; border-radius:100px; padding:4px 14px;">&#9679;&nbsp;PK Office &middot; novo</span>
          </div>
          <div style="text-align:center; font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:#ffffff; margin:10px 0 6px;">
            Kompletno vođenje obrta na jednom mjestu
          </div>
          <p style="text-align:center; color:#c9c4b4; font-size:13.5px; line-height:1.6; margin:0 0 16px;">
            Aplikacija za obrte u FBiH: knjige, PDV, plate, roba i fakture,
            sve povezano i spremno za poreznu upravu.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px;">${rows}</table>
          <div style="text-align:center;">
            <a href="${trialUrl}"
               style="display:inline-block; background:#c8622a; color:#ffffff; text-decoration:none; padding:14px 30px; border-radius:10px; font-size:15px; font-weight:700;">
              Isprobaj 30 dana besplatno &rarr;
            </a>
            <div style="color:#c9c4b4; font-size:12px; margin-top:10px;">
              Bez kartice i bez obaveze. Besplatna migracija podataka iz starog programa.
            </div>
          </div>
        </div>`;
}

// omotač maila: cream pozadina + bijela kartica + footer
function officeMailWrap(innerHtml, footerNote) {
  return `
      <div style="background:#f5f2eb; padding:28px 12px; font-family:'DM Sans', Arial, sans-serif;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #d4cfc4; border-radius:14px; padding:32px 28px; color:#0f1a12;">
          ${innerHtml}
          <p style="color:#999; font-size:12px; line-height:1.6; margin:26px 0 0; border-top:1px solid #e8e4dc; padding-top:16px; text-align:center;">
            ${footerNote}
          </p>
        </div>
      </div>`;
}

// ── WELCOME EMAIL (poslije potvrde emaila) ──────────────────────────────────
async function sendWelcomeEmail(to, firstName, trialUrl) {
  const transporter = createTransporter();
  const displayName = process.env.SMTP_FROM || "Porezni Kalkulator";
  const from = `"${displayName}" <${process.env.SMTP_USER}>`;

  const bonusHtml = BUSINESS_BONUS.map(
    (f) =>
      `<li style="margin-bottom:7px; color:#444; font-size:13.5px; line-height:1.5;">${f}</li>`,
  ).join("");
  const moduliText = OFFICE_MODULI.map(([b, d]) => `  • ${b}, ${d}`).join("\n");
  const bonusText = BUSINESS_BONUS.map((f) => `  • ${f}`).join("\n");

  await transporter.sendMail({
    from,
    to,
    subject: "30 dana besplatno: PK Office + sve Business funkcije",
    text: `Zdravo ${firstName},

Hvala što ste potvrdili email adresu na Porezni Kalkulator.

Aktivirajte 30 dana BESPLATNO i probajte PK Office, našu novu aplikaciju za kompletno vođenje obrta u FBiH:
${moduliText}

Uz probni period dobijate i SVE Business funkcije na Poreznom Kalkulatoru:
${bonusText}

Aktivirajte ovdje (klik odmah aktivira probu):
${trialUrl}

Bez kartice, bez automatske naplate. Nakon 30 dana vraćate se na besplatan plan.

Porezni Kalkulator`,
    html: officeMailWrap(
      `
          <div style="font-size:11px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#7a8a7d; margin-bottom:8px;">
            Dobrodošli na Porezni Kalkulator
          </div>
          <h2 style="font-family:Georgia, 'Times New Roman', serif; font-size:26px; font-weight:400; margin:0 0 10px; color:#0f1a12;">
            30 dana <span style="color:#3a5c42;">svega</span>, besplatno
          </h2>
          <p style="color:#555; font-size:14.5px; line-height:1.65; margin:0;">
            Zdravo <strong>${firstName}</strong>, hvala što ste potvrdili email.
            Jednim klikom ispod aktivirate probni period koji otključava sve
            što platforma nudi.
          </p>
          ${officeHeroHtml(trialUrl, OFFICE_MODULI)}
          <div style="font-size:12px; font-weight:700; color:#3a5c42; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px;">
            Uz probu dobijate i sve Business funkcije
          </div>
          <ul style="padding-left:20px; margin:0 0 20px;">
            ${bonusHtml}
          </ul>
          <div style="text-align:center; margin:6px 0 4px;">
            <a href="${trialUrl}"
               style="display:inline-block; background:#3a5c42; color:#ffffff; text-decoration:none; padding:12px 26px; border-radius:10px; font-size:14px; font-weight:600;">
              Aktiviraj 30 dana besplatno &rarr;
            </a>
          </div>`,
      "Bez kartice, bez automatske naplate. Nakon 30 dana automatski se vraćate na besplatan plan.",
    ),
  });
}

// ── POZIV NA BESPLATNI TRIAL (admin → korisnik koji nije aktivirao trial) ────
async function sendTrialInviteEmail(to, firstName, { trialUrl }) {
  const transporter = createTransporter();
  const displayName = process.env.SMTP_FROM || "Porezni Kalkulator";
  const from = `"${displayName}" <${process.env.SMTP_USER}>`;

  // kraća lista: tri najjače funkcije, ostalo pokriva hero kartica
  const killer = [
    ["Bankovni izvod se knjiži sam", "učitate PDF, KPR se popuni"],
    ["Plate u dva klika", "MIP-1023, platne liste i uplatnice iz istog obračuna"],
    ["PDV prijava iz knjiga", "KUF/KIF i D-PDV spremni za UINO"],
  ];
  const moduliText = killer.map(([b, d]) => `  • ${b}, ${d}`).join("\n");

  await transporter.sendMail({
    from,
    to,
    subject: "Vaših 30 dana besplatno još čeka: PK Office + Business",
    text: `Zdravo ${firstName},

Primijetili smo da još niste aktivirali svojih 30 dana besplatno. Dobra vijest: i dalje vas čekaju, a u međuvremenu smo objavili PK Office, kompletno vođenje obrta na jednom mjestu:
${moduliText}

Uz probu dobijate i sve Business funkcije (obračun plata bez limita, fakture, ugovori, rješenja...).

Aktivirajte ovdje (klik odmah aktivira probu, bez kartice):
${trialUrl}

Ako imate bilo kakvo pitanje, slobodno odgovorite na ovaj email, rado pomažemo.

Porezni Kalkulator`,
    html: officeMailWrap(
      `
          <div style="font-size:11px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#7a8a7d; margin-bottom:8px;">
            Vaš besplatni mjesec
          </div>
          <h2 style="font-family:Georgia, 'Times New Roman', serif; font-size:25px; font-weight:400; margin:0 0 10px; color:#0f1a12;">
            30 dana besplatno vas <span style="color:#3a5c42;">i dalje čeka</span>
          </h2>
          <p style="color:#555; font-size:14.5px; line-height:1.65; margin:0;">
            Zdravo <strong>${firstName}</strong>, još niste aktivirali probni
            period. U međuvremenu smo objavili i <strong>PK Office</strong>,
            aplikaciju za kompletno vođenje obrta, i ulazi u istu probu.
          </p>
          ${officeHeroHtml(trialUrl, killer)}
          <p style="color:#555; font-size:13.5px; line-height:1.65; margin:0 0 4px;">
            Uz probu dobijate i <strong>sve Business funkcije</strong>: obračun
            plata bez limita radnika, fakture i predračune, sve ugovore i
            rješenja, neograničen broj klijenata. Ako imate pitanje, samo
            odgovorite na ovaj email, rado pomažemo.
          </p>`,
      "Bez kartice, bez obaveza. Klik na dugme odmah aktivira probni period na vašem računu.",
    ),
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
    subject = `${thingShort} je istek${isTrial ? "ao" : "la"}, Porezni Kalkulator`;
    heading = `${thingShort} je istek${isTrial ? "ao" : "la"}`;
    lead = `${thing} na Porezni Kalkulator ${isTrial ? "je istekao" : "je istekla"} ${endDateStr}. ${
      isTrial
        ? "Aktivirajte pretplatu da ponovo otključate sve funkcije."
        : "Obnovite je da ponovo otključate sve funkcije."
    }`;
  } else if (today) {
    subject = `${thingShort} ističe danas, Porezni Kalkulator`;
    heading = `${thingShort} ističe danas`;
    lead = `${thing} na Porezni Kalkulator ističe danas (${endDateStr}). ${act}`;
  } else {
    subject = `${thingShort} ističe ${dStr}, Porezni Kalkulator`;
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

, Porezni Kalkulator`,
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
    subject: `Platni listić, ${periodHr}, ${workerName}`,
    text:
`Poštovani${workerName ? ` ${workerName}` : ""},

U prilogu se nalazi platni listić za ${periodHr}${organizationName ? ` od ${organizationName}` : ""}.

Neto za isplatu: ${netoStr} KM

, ${displayName}`,
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
          , ${displayName}<br/>
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

// Svi platni listići mjeseca u JEDNOM PDF-u na jednu adresu (npr. email
// firme: oni odštampaju i uruče radnicima ručno, bez slanja svakom radniku).
async function sendPayslipsBundleEmail({
  to,
  organizationName,
  year,
  month,
  count,
  pdfBuffer,
}) {
  const transporter = createInvoiceTransporter();
  const fromAddr = process.env.SMTP_INVOICE_MAIL || "noreply@poreznikalkulator.ba";
  const displayName = organizationName || "Porezni Kalkulator";
  const from = `"${displayName}" <${fromAddr}>`;
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  const periodHr = `${MJESECI[month - 1] || mm}. ${yyyy}.`;
  const brojStr = `${count} ${count === 1 ? "platni listić" : count < 5 ? "platna listića" : "platnih listića"}`;

  await transporter.sendMail({
    from,
    to,
    subject: `Platni listići, ${periodHr}${organizationName ? `, ${organizationName}` : ""}`,
    text:
`Poštovani,

U prilogu je ${brojStr} za ${periodHr}${organizationName ? ` (${organizationName})` : ""}, u jednom PDF dokumentu.

Dokument je namijenjen za štampu i uručenje radnicima.

, ${displayName}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Platni listići</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
          Poštovani,<br/>
          u prilogu je <strong>${brojStr}</strong> za <strong>${periodHr}</strong>${organizationName ? ` (<strong>${organizationName}</strong>)` : ""}, u jednom PDF dokumentu.
        </p>
        <div style="background:#f5f2eb; border:1px solid #d4cfc4; border-radius:8px; padding:14px 20px; margin: 20px 0; color:#3a5c42; font-size:14px;">
          Dokument je namijenjen za štampu i uručenje radnicima.
        </div>
        <p style="color:#999; font-size:12px; margin-top:32px; border-top:1px solid #e5e7eb; padding-top:16px;">
          , ${displayName}<br/>
          <span style="color:#bbb;">Poslano preko poreznikalkulator.ba</span>
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `Platni-listici-${mm}-${yyyy}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

// Kartica prometa partnera (PK Office): šalje PDF kartice kupcu/dobavljaču.
async function sendKarticaEmail({
  to,
  partnerName,
  orgName,
  type,
  periodLabel,
  pdfBuffer,
  filename,
}) {
  const transporter = createInvoiceTransporter();
  const fromAddr =
    process.env.SMTP_INVOICE_MAIL || "noreply@poreznikalkulator.ba";
  const displayName = orgName || "Porezni Kalkulator";
  const docTitle = type === "kupac" ? "Kartica kupca" : "Kartica dobavljača";

  await transporter.sendMail({
    from: `"${displayName}" <${fromAddr}>`,
    to,
    subject: `${docTitle} za period ${periodLabel} - ${displayName}`,
    text: `Poštovani${partnerName ? ` ${partnerName}` : ""},

U prilogu se nalazi ${docTitle.toLowerCase()} za period ${periodLabel} od ${displayName}.

Srdačan pozdrav,
${displayName}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${docTitle}</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6;">
          Poštovani${partnerName ? ` <strong>${partnerName}</strong>` : ""},<br/>
          u prilogu se nalazi ${docTitle.toLowerCase()} za period ${periodLabel} od <strong>${displayName}</strong>.
        </p>
        <p style="color: #999; font-size: 13px; margin-top: 28px;">
          Poslano putem <a href="https://poreznikalkulator.ba" style="color:#3a5c42;">poreznikalkulator.ba</a>
        </p>
      </div>`,
    attachments: [{ filename, content: pdfBuffer }],
  });
}

// IOS (izvod otvorenih stavki) partneru: usaglašavanje potraživanja i
// obaveza, sa molbom za ovjeru i povrat primjerka u roku od 8 dana.
async function sendIosEmail({
  to,
  partnerName,
  orgName,
  naDanLabel,
  pdfBuffer,
  filename,
}) {
  const transporter = createInvoiceTransporter();
  const fromAddr =
    process.env.SMTP_INVOICE_MAIL || "noreply@poreznikalkulator.ba";
  const displayName = orgName || "Porezni Kalkulator";

  await transporter.sendMail({
    from: `"${displayName}" <${fromAddr}>`,
    to,
    subject: `Izvod otvorenih stavki (IOS) na dan ${naDanLabel} - ${displayName}`,
    text: `Poštovani${partnerName ? ` ${partnerName}` : ""},

u prilogu se nalazi izvod otvorenih stavki (IOS) na dan ${naDanLabel} od ${displayName}, radi usaglašavanja međusobnih potraživanja i obaveza.

Molimo da provjerite iskazano stanje i jedan ovjeren primjerak vratite u roku od 8 dana od dana prijema, ili nam u istom roku dostavite primjedbe.

Srdačan pozdrav,
${displayName}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Izvod otvorenih stavki (IOS)</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6;">
          Poštovani${partnerName ? ` <strong>${partnerName}</strong>` : ""},<br/>
          u prilogu se nalazi izvod otvorenih stavki na dan <strong>${naDanLabel}</strong> od <strong>${displayName}</strong>, radi usaglašavanja međusobnih potraživanja i obaveza.
        </p>
        <p style="color: #666; font-size: 15px; line-height: 1.6;">
          Molimo da provjerite iskazano stanje i jedan ovjeren primjerak vratite u roku od 8 dana od dana prijema, ili nam u istom roku dostavite primjedbe.
        </p>
        <p style="color: #999; font-size: 13px; margin-top: 28px;">
          Poslano putem <a href="https://poreznikalkulator.ba" style="color:#3a5c42;">poreznikalkulator.ba</a>
        </p>
      </div>`,
    attachments: [{ filename, content: pdfBuffer }],
  });
}

// Opomena kupcu za dospjele neplaćene račune (PDF u prilogu). Ton prati
// nivo: 1 = ljubazna opomena, 2 = pred utuženje.
async function sendOpomenaEmail({
  to,
  partnerName,
  orgName,
  nivo,
  dug,
  pdfBuffer,
  filename,
}) {
  const transporter = createInvoiceTransporter();
  const fromAddr =
    process.env.SMTP_INVOICE_MAIL || "noreply@poreznikalkulator.ba";
  const displayName = orgName || "Porezni Kalkulator";
  const naslov = nivo === 2 ? "Opomena pred utuženje" : "Opomena";
  const dugStr = Number(dug || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  await transporter.sendMail({
    from: `"${displayName}" <${fromAddr}>`,
    to,
    subject: `${naslov} za dospjele obaveze - ${displayName}`,
    text: `Poštovani${partnerName ? ` ${partnerName}` : ""},

u prilogu se nalazi ${naslov.toLowerCase()} za dospjele neizmirene obaveze u ukupnom iznosu od ${dugStr} KM prema ${displayName}.

Molimo da obaveze izmirite u roku navedenom u opomeni. Ako ste ih u međuvremenu izmirili, smatrajte ovu poruku bespredmetnom.

Srdačan pozdrav,
${displayName}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${naslov}</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6;">
          Poštovani${partnerName ? ` <strong>${partnerName}</strong>` : ""},<br/>
          u prilogu se nalazi ${naslov.toLowerCase()} za dospjele neizmirene obaveze u ukupnom iznosu od <strong>${dugStr} KM</strong> prema <strong>${displayName}</strong>.
        </p>
        <p style="color: #666; font-size: 15px; line-height: 1.6;">
          Molimo da obaveze izmirite u roku navedenom u opomeni. Ako ste ih u
          međuvremenu izmirili, smatrajte ovu poruku bespredmetnom.
        </p>
        <p style="color: #999; font-size: 13px; margin-top: 28px;">
          Poslano putem <a href="https://poreznikalkulator.ba" style="color:#3a5c42;">poreznikalkulator.ba</a>
        </p>
      </div>`,
    attachments: [{ filename, content: pdfBuffer }],
  });
}

// Generički šablon za sistemske notifikacije (rokovi plaćanja, sedmični
// pregled, plate, podrška...): naslov + uvod + lista stavki + CTA dugme.
// Footer uvijek vodi na postavke notifikacija (naš "unsubscribe").
async function sendNotifikacijaEmail({
  to,
  subject,
  title,
  intro,
  lines = [],
  ctaUrl,
  ctaLabel,
}) {
  const transporter = createInvoiceTransporter();
  const fromAddr =
    process.env.SMTP_INVOICE_MAIL || "noreply@poreznikalkulator.ba";
  const frontend =
    process.env.FRONTEND_URL || "https://www.poreznikalkulator.ba";
  const settingsUrl = `${frontend}/app/postavke?tab=notifikacije`;

  const textLines = lines.map((l) => `- ${l}`).join("\n");
  await transporter.sendMail({
    from: `"Porezni Kalkulator" <${fromAddr}>`,
    to,
    subject,
    text: `${title}

${intro || ""}
${textLines ? `\n${textLines}\n` : ""}
${ctaUrl ? `${ctaLabel || "Otvori"}: ${ctaUrl}\n` : ""}
Podešavanja obavijesti: ${settingsUrl}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${title}</h2>
        ${
          intro
            ? `<p style="color: #666; font-size: 15px; line-height: 1.6;">${intro}</p>`
            : ""
        }
        ${
          lines.length
            ? `<ul style="color: #1a1a1a; font-size: 14.5px; line-height: 1.7; padding-left: 20px; margin: 12px 0;">${lines
                .map((l) => `<li>${l}</li>`)
                .join("")}</ul>`
            : ""
        }
        ${
          ctaUrl
            ? `<p style="margin: 24px 0;"><a href="${ctaUrl}" style="background:#3a5c42;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">${
                ctaLabel || "Otvori"
              }</a></p>`
            : ""
        }
        <p style="color: #999; font-size: 12.5px; margin-top: 28px; line-height: 1.6;">
          Ovu poruku šalje <a href="https://poreznikalkulator.ba" style="color:#3a5c42;">poreznikalkulator.ba</a>.
          Koje obavijesti primate podešavate na
          <a href="${settingsUrl}" style="color:#3a5c42;">postavkama notifikacija</a>.
        </p>
      </div>`,
  });
}

// Jednokratni kod za dvofaktorsku prijavu. Kod ide i u tekstualnu verziju jer
// ga korisnici često čitaju iz notifikacije na telefonu.
async function send2faCodeEmail(to, firstName, code, { svrha = "prijava" } = {}) {
  const transporter = createTransporter();
  const displayName = process.env.SMTP_FROM || "Porezni Kalkulator";
  const from = `"${displayName}" <${process.env.SMTP_USER}>`;

  const naslov =
    svrha === "aktivacija"
      ? "Kod za uključivanje dvofaktorske prijave"
      : "Kod za prijavu";
  const uvod =
    svrha === "aktivacija"
      ? "Unesite ovaj kod da potvrdite email kao drugi faktor prijave."
      : "Unesite ovaj kod da završite prijavu na svoj nalog.";
  const upozorenje =
    svrha === "aktivacija"
      ? "Ako niste vi tražili uključivanje dvofaktorske prijave, ignorišite ovaj email i promijenite lozinku."
      : "Ako se niste vi prijavljivali, neko zna vašu lozinku. Odmah je promijenite.";

  await transporter.sendMail({
    from,
    to,
    subject: `${naslov}, Porezni Kalkulator`,
    text: `Zdravo ${firstName || ""},\n\n${uvod}\n\nKod: ${code}\n\nKod važi 10 minuta.\n\n${upozorenje}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
        <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">${naslov}</h2>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Zdravo <strong>${firstName || "korisniče"}</strong>, ${uvod}
        </p>
        <div style="display: inline-block; background: #f5f2eb; border: 1px solid #d4cfc4; border-radius: 10px;
                    padding: 16px 28px; font-size: 30px; font-weight: 600; letter-spacing: 8px; color: #0f1a12;">
          ${code}
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
          Kod važi <strong>10 minuta</strong> i može se iskoristiti samo jednom.
        </p>
        <p style="color: #999; font-size: 13px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          ${upozorenje}
        </p>
      </div>
    `,
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  send2faCodeEmail,
  sendContactEmail,
  sendPredracunEmail,
  sendInvoiceEmail,
  sendWelcomeEmail,
  sendPayslipEmail,
  sendPayslipsBundleEmail,
  sendSubscriptionReminderEmail,
  sendTrialInviteEmail,
  sendKarticaEmail,
  sendIosEmail,
  sendOpomenaEmail,
  sendNotifikacijaEmail,
};
