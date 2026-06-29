require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { sequelize, Organization, Worker } = require("./models/index");
const { decryptJmbg } = require("./utils/encryptJmbg");
const KD_BIH_NAMES = require("./data/kdBihNames.json");
const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");
const organizationsRoutes = require("./routes/organizationsRoutes");
const formsRoutes = require("./routes/formsRoutes");
const clientsRoutes = require("./routes/clientsRoutes");
const amortizacijaRoutes = require("./routes/amortizacijaRoutes");
const sihtericaRoutes = require("./routes/sihtericaRoutes");
const documentsRoutes = require("./routes/documentsRoutes");
const subscriptionsRoutes = require("./routes/subscriptionsRoutes");
const { trialRouter, currentRouter: subscriptionCurrentRouter } = require("./routes/subscriptionsRoutes");
const contactRoutes = require("./routes/contactRoutes");
const citiesRoutes = require("./routes/citiesRoutes");
const predracunRoutes = require("./routes/predracunRoutes");
const karticaMembersRoutes = require("./routes/karticaMembersRoutes");
const invoicesRoutes = require("./routes/invoicesRoutes");
const invoiceItemTemplatesRoutes = require("./routes/invoiceItemTemplatesRoutes");
const workerDocumentsRoutes = require("./routes/workerDocumentsRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const payrollDocumentsRoutes = require("./routes/payrollDocumentsRoutes");
const financeRoutes = require("./routes/financeRoutes");
const activityRoutes = require("./routes/activityRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const meRoutes = require("./routes/meRoutes");
const profileRoutes = require("./routes/profileRoutes");
const bankStatementsRoutes = require("./routes/bankStatementsRoutes");
const partnersRoutes = require("./routes/partnersRoutes");

const app = express();

const port = Number(process.env.PORT) || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// ── static za uploadane fajlove (logo organizacije, kasnije i drugi) ─────────
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/organizations", organizationsRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/amortizacija", amortizacijaRoutes);
app.use("/api/sihterica", sihtericaRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/users", subscriptionsRoutes);
app.use("/api/subscriptions", trialRouter);
app.use("/api/subscription", subscriptionCurrentRouter);
app.use("/api/contact", contactRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/predracun", predracunRoutes);
app.use("/api/kartica-members", karticaMembersRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/invoice-item-templates", invoiceItemTemplatesRoutes);
app.use("/api/workers", workerDocumentsRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/payroll-documents", payrollDocumentsRoutes);
app.use("/api/admin/finance", financeRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/admin", adminDashboardRoutes);
app.use("/api/me", meRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/bank-statements", bankStatementsRoutes);
app.use("/api/partners", partnersRoutes);

// Idempotent column additions (za polja koja su dodana naknadno; sync({alter:false}) ih ne dodaje).
async function ensureColumns() {
  const checks = [
    {
      table: "organizations",
      column: "logoUrl",
      ddl: "ALTER TABLE organizations ADD COLUMN logoUrl VARCHAR(500) NULL",
    },
    {
      table: "invoices",
      column: "currency",
      ddl: "ALTER TABLE invoices ADD COLUMN currency ENUM('BAM','EUR') NOT NULL DEFAULT 'BAM'",
    },
    {
      table: "organizations",
      column: "pdvNumber",
      ddl: "ALTER TABLE organizations ADD COLUMN pdvNumber VARCHAR(20) NULL",
    },
    {
      table: "invoices",
      column: "emailSentAt",
      ddl: "ALTER TABLE invoices ADD COLUMN emailSentAt DATETIME NULL",
    },
    {
      table: "invoices",
      column: "emailSentTo",
      ddl: "ALTER TABLE invoices ADD COLUMN emailSentTo VARCHAR(255) NULL",
    },
    {
      table: "invoices",
      column: "convertedFromProformaId",
      ddl: "ALTER TABLE invoices ADD COLUMN convertedFromProformaId INT UNSIGNED NULL",
    },
    {
      table: "users",
      column: "trialUsedAt",
      ddl: "ALTER TABLE users ADD COLUMN trialUsedAt DATETIME NULL",
    },
    // ─── Korist u naravi (službeno vozilo) ────────────────────────────────────
    {
      table: "workers",
      column: "koristVoziloAktivna",
      ddl: "ALTER TABLE workers ADD COLUMN koristVoziloAktivna TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "workers",
      column: "koristVoziloMetoda",
      ddl: "ALTER TABLE workers ADD COLUMN koristVoziloMetoda VARCHAR(20) NULL",
    },
    {
      table: "workers",
      column: "koristVoziloVrijednost",
      ddl: "ALTER TABLE workers ADD COLUMN koristVoziloVrijednost DECIMAL(12,2) NULL",
    },
    {
      table: "workers",
      column: "koristVoziloSaPdv",
      ddl: "ALTER TABLE workers ADD COLUMN koristVoziloSaPdv TINYINT(1) NOT NULL DEFAULT 1",
    },
    {
      table: "workers",
      column: "koristVoziloOpis",
      ddl: "ALTER TABLE workers ADD COLUMN koristVoziloOpis VARCHAR(255) NULL",
    },
    {
      table: "payrolls",
      column: "koristNetValue",
      ddl: "ALTER TABLE payrolls ADD COLUMN koristNetValue DECIMAL(12,2) NOT NULL DEFAULT 0",
    },
    {
      table: "payrolls",
      column: "koristBruto",
      ddl: "ALTER TABLE payrolls ADD COLUMN koristBruto DECIMAL(12,2) NOT NULL DEFAULT 0",
    },
    // ─── Workers: employment / ugovor o radu podaci ───────────────────────────
    {
      table: "workers",
      column: "position",
      ddl: "ALTER TABLE workers ADD COLUMN position VARCHAR(120) NULL",
    },
    {
      table: "workers",
      column: "salaryBruto",
      ddl: "ALTER TABLE workers ADD COLUMN salaryBruto DECIMAL(10,2) NULL",
    },
    {
      table: "workers",
      column: "salaryNeto",
      ddl: "ALTER TABLE workers ADD COLUMN salaryNeto DECIMAL(10,2) NULL",
    },
    {
      table: "workers",
      column: "contractType",
      ddl: "ALTER TABLE workers ADD COLUMN contractType ENUM('NEODREDJENO','ODREDJENO') NULL",
    },
    {
      table: "workers",
      column: "contractEndDate",
      ddl: "ALTER TABLE workers ADD COLUMN contractEndDate DATE NULL",
    },
    {
      table: "workers",
      column: "probationMonths",
      ddl: "ALTER TABLE workers ADD COLUMN probationMonths TINYINT UNSIGNED NULL",
    },
    {
      table: "workers",
      column: "noticePeriod",
      ddl: "ALTER TABLE workers ADD COLUMN noticePeriod VARCHAR(50) NULL",
    },
    {
      table: "workers",
      column: "contractNumber",
      ddl: "ALTER TABLE workers ADD COLUMN contractNumber VARCHAR(50) NULL",
    },
    {
      table: "workers",
      column: "employmentStatus",
      ddl: "ALTER TABLE workers ADD COLUMN employmentStatus ENUM('DRAFT','PRIJAVLJEN','ODJAVLJEN') NOT NULL DEFAULT 'DRAFT'",
    },
    {
      table: "workers",
      column: "prijavaDate",
      ddl: "ALTER TABLE workers ADD COLUMN prijavaDate DATE NULL",
    },
    {
      table: "workers",
      column: "odjavaDate",
      ddl: "ALTER TABLE workers ADD COLUMN odjavaDate DATE NULL",
    },
    {
      table: "workers",
      column: "spol",
      ddl: "ALTER TABLE workers ADD COLUMN spol ENUM('M','Z') NULL",
    },
    {
      table: "workers",
      column: "strucnaSpremaIdx",
      ddl: "ALTER TABLE workers ADD COLUMN strucnaSpremaIdx TINYINT UNSIGNED NULL",
    },
    {
      table: "workers",
      column: "taxCoefficient",
      ddl: "ALTER TABLE workers ADD COLUMN taxCoefficient DECIMAL(4,2) NOT NULL DEFAULT 1.00",
    },
    {
      table: "organizations",
      column: "payrollAccounts",
      ddl: "ALTER TABLE organizations ADD COLUMN payrollAccounts JSON NULL",
    },
    {
      table: "workers",
      column: "minuliRadRate",
      ddl: "ALTER TABLE workers ADD COLUMN minuliRadRate DECIMAL(5,2) NOT NULL DEFAULT 0.40",
    },
    {
      table: "workers",
      column: "firstEmploymentDate",
      ddl: "ALTER TABLE workers ADD COLUMN firstEmploymentDate DATE NULL",
    },
    {
      table: "workers",
      column: "priorWorkYears",
      ddl: "ALTER TABLE workers ADD COLUMN priorWorkYears DECIMAL(5,2) NULL",
    },
    {
      table: "payrolls",
      column: "grossBase",
      ddl: "ALTER TABLE payrolls ADD COLUMN grossBase DECIMAL(12,2) NULL",
    },
    {
      table: "payrolls",
      column: "proRateFactor",
      ddl: "ALTER TABLE payrolls ADD COLUMN proRateFactor DECIMAL(5,4) NULL",
    },
    {
      table: "payrolls",
      column: "imported",
      ddl: "ALTER TABLE payrolls ADD COLUMN imported TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "payrolls",
      column: "vacationDays",
      ddl: "ALTER TABLE payrolls ADD COLUMN vacationDays INT NULL DEFAULT 0",
    },
    {
      table: "payrolls",
      column: "minuliRadRate",
      ddl: "ALTER TABLE payrolls ADD COLUMN minuliRadRate DECIMAL(5,2) NULL DEFAULT 0",
    },
    {
      table: "payrolls",
      column: "minuliRadYears",
      ddl: "ALTER TABLE payrolls ADD COLUMN minuliRadYears INT NULL DEFAULT 0",
    },
    {
      table: "payrolls",
      column: "minuliRadAmount",
      ddl: "ALTER TABLE payrolls ADD COLUMN minuliRadAmount DECIMAL(12,2) NULL DEFAULT 0",
    },
    // Stope uvećanja po radniku (default minimumi po Zakonu o radu FBiH)
    {
      table: "workers",
      column: "overtimeRate",
      ddl: "ALTER TABLE workers ADD COLUMN overtimeRate DECIMAL(5,2) NOT NULL DEFAULT 25.00",
    },
    {
      table: "workers",
      column: "nightRate",
      ddl: "ALTER TABLE workers ADD COLUMN nightRate DECIMAL(5,2) NOT NULL DEFAULT 25.00",
    },
    {
      table: "workers",
      column: "sundayRate",
      ddl: "ALTER TABLE workers ADD COLUMN sundayRate DECIMAL(5,2) NOT NULL DEFAULT 20.00",
    },
    {
      table: "workers",
      column: "holidayRate",
      ddl: "ALTER TABLE workers ADD COLUMN holidayRate DECIMAL(5,2) NOT NULL DEFAULT 50.00",
    },
    // Snapshot stope + iznosi uvećanja na Payroll
    {
      table: "payrolls",
      column: "overtimeRate",
      ddl: "ALTER TABLE payrolls ADD COLUMN overtimeRate DECIMAL(5,2) NULL DEFAULT 25.00",
    },
    {
      table: "payrolls",
      column: "nightRate",
      ddl: "ALTER TABLE payrolls ADD COLUMN nightRate DECIMAL(5,2) NULL DEFAULT 25.00",
    },
    {
      table: "payrolls",
      column: "sundayRate",
      ddl: "ALTER TABLE payrolls ADD COLUMN sundayRate DECIMAL(5,2) NULL DEFAULT 20.00",
    },
    {
      table: "payrolls",
      column: "holidayRate",
      ddl: "ALTER TABLE payrolls ADD COLUMN holidayRate DECIMAL(5,2) NULL DEFAULT 50.00",
    },
    {
      table: "payrolls",
      column: "overtimeAmount",
      ddl: "ALTER TABLE payrolls ADD COLUMN overtimeAmount DECIMAL(12,2) NULL DEFAULT 0",
    },
    {
      table: "payrolls",
      column: "nightAmount",
      ddl: "ALTER TABLE payrolls ADD COLUMN nightAmount DECIMAL(12,2) NULL DEFAULT 0",
    },
    {
      table: "payrolls",
      column: "sundayAmount",
      ddl: "ALTER TABLE payrolls ADD COLUMN sundayAmount DECIMAL(12,2) NULL DEFAULT 0",
    },
    {
      table: "payrolls",
      column: "holidayAmount",
      ddl: "ALTER TABLE payrolls ADD COLUMN holidayAmount DECIMAL(12,2) NULL DEFAULT 0",
    },
    // Sticky defaults za naknade po radniku (regres se NE pamti)
    {
      table: "workers",
      column: "defaultMealAllowance",
      ddl: "ALTER TABLE workers ADD COLUMN defaultMealAllowance DECIMAL(10,2) NOT NULL DEFAULT 0",
    },
    {
      table: "workers",
      column: "defaultTravelExpense",
      ddl: "ALTER TABLE workers ADD COLUMN defaultTravelExpense DECIMAL(10,2) NOT NULL DEFAULT 0",
    },
    {
      table: "workers",
      column: "contractedHours",
      ddl: "ALTER TABLE workers ADD COLUMN contractedHours TINYINT UNSIGNED NOT NULL DEFAULT 8",
    },
    // Režim oporezivanja i kategorija djelatnosti za obrt-vlasnika
    {
      table: "organizations",
      column: "taxRegime",
      ddl: "ALTER TABLE organizations ADD COLUMN taxRegime VARCHAR(30) NULL",
    },
    {
      table: "organizations",
      column: "taxCategory",
      ddl: "ALTER TABLE organizations ADD COLUMN taxCategory VARCHAR(50) NULL",
    },
    // Tip plate — per-worker + org-level default. Vidi Worker model za semantiku.
    {
      table: "workers",
      column: "salaryType",
      ddl: "ALTER TABLE workers ADD COLUMN salaryType VARCHAR(20) NOT NULL DEFAULT 'NETO_ISPLATA'",
    },
    {
      table: "organizations",
      column: "defaultSalaryType",
      ddl: "ALTER TABLE organizations ADD COLUMN defaultSalaryType VARCHAR(20) NOT NULL DEFAULT 'NETO_ISPLATA'",
    },
    // Datum stvarne isplate plate — perzistira po (org, year, month) tako da
    // se ne resetuje kad korisnik promijeni tab i vrati se. Svi payroll-i u
    // mjesecu drže isti datum (sinhronizovani batch update).
    {
      table: "payrolls",
      column: "paymentDate",
      ddl: "ALTER TABLE payrolls ADD COLUMN paymentDate DATE NULL",
    },
    // Kad je MIP-1023 XML za (org, year, month) zadnji put preuzet.
    {
      table: "payrolls",
      column: "mipDownloadedAt",
      ddl: "ALTER TABLE payrolls ADD COLUMN mipDownloadedAt DATETIME NULL",
    },
    // Veza stavke izvoda sa fakturom (auto-match naplate).
    {
      table: "bank_transactions",
      column: "invoiceId",
      ddl: "ALTER TABLE bank_transactions ADD COLUMN invoiceId INT UNSIGNED NULL",
    },
    // Veza stavke izvoda sa poslovnim partnerom (po žiro računu).
    {
      table: "bank_transactions",
      column: "partnerId",
      ddl: "ALTER TABLE bank_transactions ADD COLUMN partnerId INT UNSIGNED NULL",
    },
    // Veza isplate sa ulaznim računom koji je zatvorila (auto-knjiženje).
    {
      table: "bank_transactions",
      column: "ulazniRacunId",
      ddl: "ALTER TABLE bank_transactions ADD COLUMN ulazniRacunId INT UNSIGNED NULL",
    },
    // Šifra partnera (redni broj unutar organizacije).
    {
      table: "partners",
      column: "code",
      ddl: "ALTER TABLE partners ADD COLUMN code INT UNSIGNED NULL",
    },
    // Predračun: ciklus naplate + period pretplate.
    {
      table: "predracuni",
      column: "billingCycle",
      ddl: "ALTER TABLE predracuni ADD COLUMN billingCycle ENUM('monthly','yearly') NOT NULL DEFAULT 'yearly'",
    },
    {
      table: "predracuni",
      column: "periodStart",
      ddl: "ALTER TABLE predracuni ADD COLUMN periodStart DATE NULL",
    },
    {
      table: "predracuni",
      column: "periodEnd",
      ddl: "ALTER TABLE predracuni ADD COLUMN periodEnd DATE NULL",
    },
    // Subscription: plan + ciklus naplate (model ih sad čita; vidi models/index).
    {
      table: "subscriptions",
      column: "plan",
      ddl: "ALTER TABLE subscriptions ADD COLUMN plan ENUM('PRO','BUSINESS') NULL",
    },
    {
      table: "subscriptions",
      column: "billingCycle",
      ddl: "ALTER TABLE subscriptions ADD COLUMN billingCycle ENUM('monthly','yearly') NULL",
    },
    {
      table: "subscriptions",
      column: "reminderSentAt",
      ddl: "ALTER TABLE subscriptions ADD COLUMN reminderSentAt DATETIME NULL",
    },
    {
      table: "subscriptions",
      column: "isTrial",
      ddl: "ALTER TABLE subscriptions ADD COLUMN isTrial TINYINT(1) NOT NULL DEFAULT 0",
    },
    // JS3100 stabilna polja na radniku — prefill prijave i odjave.
    {
      table: "workers",
      column: "osnovOsiguranjaOpis",
      ddl: "ALTER TABLE workers ADD COLUMN osnovOsiguranjaOpis VARCHAR(120) NULL",
    },
    {
      table: "workers",
      column: "osnovOsiguranjaSifra",
      ddl: "ALTER TABLE workers ADD COLUMN osnovOsiguranjaSifra VARCHAR(20) NULL",
    },
    {
      table: "workers",
      column: "zanimanjeOpis",
      ddl: "ALTER TABLE workers ADD COLUMN zanimanjeOpis VARCHAR(120) NULL",
    },
    {
      table: "workers",
      column: "zanimanjeSifra",
      ddl: "ALTER TABLE workers ADD COLUMN zanimanjeSifra VARCHAR(20) NULL",
    },
    // UTM atribucija — odakle je korisnik došao u trenutku registracije.
    // Capture jednom (prva posjeta), perzistira na User-u za "registracije po izvoru".
    {
      table: "users",
      column: "utmSource",
      ddl: "ALTER TABLE users ADD COLUMN utmSource VARCHAR(80) NULL",
    },
    {
      table: "users",
      column: "utmCampaign",
      ddl: "ALTER TABLE users ADD COLUMN utmCampaign VARCHAR(120) NULL",
    },
    // Kategorija troška — za breakdown i CAC (marketing spend / novi plaćeni).
    {
      table: "company_expenses",
      column: "category",
      ddl: "ALTER TABLE company_expenses ADD COLUMN category VARCHAR(40) NOT NULL DEFAULT 'OSTALO'",
    },
    {
      table: "activity_logs",
      column: "organizationId",
      ddl: "ALTER TABLE activity_logs ADD COLUMN organizationId INT UNSIGNED NULL",
    },
    // Dnevna stopa toplog obroka: na nivou firme + override po radniku.
    // Obračun množi stopu sa brojem radnih dana iz šihterice.
    {
      table: "organizations",
      column: "mealAllowancePerDay",
      ddl: "ALTER TABLE organizations ADD COLUMN mealAllowancePerDay DECIMAL(10,2) NULL",
    },
    {
      table: "workers",
      column: "mealAllowancePerDay",
      ddl: "ALTER TABLE workers ADD COLUMN mealAllowancePerDay DECIMAL(10,2) NULL",
    },
    {
      table: "workers",
      column: "travelAllowancePerMonth",
      ddl: "ALTER TABLE workers ADD COLUMN travelAllowancePerMonth DECIMAL(10,2) NULL",
    },
    // Entitet prebivališta radnika (FBIH/RS) + šifra opštine za RS uplatnice.
    {
      table: "workers",
      column: "prebivalisteEntitet",
      ddl: "ALTER TABLE workers ADD COLUMN prebivalisteEntitet VARCHAR(10) NOT NULL DEFAULT 'FBIH'",
    },
    {
      table: "workers",
      column: "opcinaKod",
      ddl: "ALTER TABLE workers ADD COLUMN opcinaKod VARCHAR(10) NULL",
    },
    // Admin "sklanjanje" aktivnosti iz pregleda (soft-hide, reverzibilno).
    {
      table: "activity_logs",
      column: "hiddenAt",
      ddl: "ALTER TABLE activity_logs ADD COLUMN hiddenAt DATETIME NULL",
    },
    // Model vlasništva/direktora (d.o.o.). DEFAULT-ovi automatski stavljaju
    // SVE postojeće organizacije na "opciju 1" (vlasnik = prijavljen direktor),
    // što je tačno tekuće ponašanje — bez backfill UPDATE-a, ništa se ne dira.
    {
      table: "organizations",
      column: "ownerType",
      ddl: "ALTER TABLE organizations ADD COLUMN ownerType VARCHAR(20) NOT NULL DEFAULT 'fizicko_domace'",
    },
    {
      table: "organizations",
      column: "ownerIsDirector",
      ddl: "ALTER TABLE organizations ADD COLUMN ownerIsDirector TINYINT(1) NOT NULL DEFAULT 1",
    },
    {
      table: "organizations",
      column: "directorEngagement",
      ddl: "ALTER TABLE organizations ADD COLUMN directorEngagement VARCHAR(20) NOT NULL DEFAULT 'ugovor_o_radu'",
    },
    {
      table: "organizations",
      column: "directorWorkerId",
      ddl: "ALTER TABLE organizations ADD COLUMN directorWorkerId INT UNSIGNED NULL",
    },
    {
      table: "organizations",
      column: "ownerInfo",
      ddl: "ALTER TABLE organizations ADD COLUMN ownerInfo JSON NULL",
    },
    // Izmjene konta za nalog za knjiženje (na nivou korisnika/agencije).
    {
      table: "users",
      column: "postingAccounts",
      ddl: "ALTER TABLE users ADD COLUMN postingAccounts JSON NULL",
    },
    // Agencijska opcija: objedini kantonalne uplatnice po kantonu (op. = sjedište).
    {
      table: "users",
      column: "combineKantonalUplatnice",
      ddl: "ALTER TABLE users ADD COLUMN combineKantonalUplatnice TINYINT(1) NOT NULL DEFAULT 0",
    },
    // Dodatni podaci matične evidencije o radniku (JSON, uređuje se u evidenciji).
    {
      table: "workers",
      column: "evidencijaPodaci",
      ddl: "ALTER TABLE workers ADD COLUMN evidencijaPodaci JSON NULL",
    },
  ];
  for (const c of checks) {
    const [rows] = await sequelize.query(
      "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      { replacements: [c.table, c.column] },
    );
    const exists = Number(rows?.[0]?.cnt || 0) > 0;
    if (!exists) {
      console.log(`Adding column ${c.table}.${c.column}...`);
      await sequelize.query(c.ddl);
    }
  }

  // PLDI migracija: prevezivanje starih amortizacija formi sa clientId →
  // organizationId. Stari model je vezao PLDI za PersonClient entitet; sada
  // PLDI pripada direktno Organizaciji (preko clients.organizationId mapiranja).
  // Ovo se izvršava jednom (where organizationId IS NULL AND clientId IS NOT NULL).
  try {
    const [migrationCheck] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM forms
       WHERE type = 'PLDI' AND organizationId IS NULL AND clientId IS NOT NULL`,
    );
    const toMigrate = Number(migrationCheck?.[0]?.cnt || 0);
    if (toMigrate > 0) {
      console.log(`Migrating ${toMigrate} PLDI forms from clientId → organizationId...`);
      await sequelize.query(
        `UPDATE forms f
         INNER JOIN clients c ON c.id = f.clientId
         SET f.organizationId = c.organizationId
         WHERE f.type = 'PLDI'
           AND f.organizationId IS NULL
           AND f.clientId IS NOT NULL
           AND c.organizationId IS NOT NULL`,
      );
      console.log("PLDI migracija završena.");
    }
  } catch (e) {
    console.warn("PLDI migracija nije uspjela:", e?.message || e);
  }

  // Konverzija ENUM → VARCHAR za organizations.taxRegime (rana verzija je
  // koristila ENUM, ali to pravi Sequelize sync edge case-ove i greške
  // "Data truncated"). Pokrećemo MODIFY samo ako je tip jos uvijek ENUM.
  try {
    const [trRows] = await sequelize.query(
      "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'taxRegime'",
    );
    const dt = (trRows?.[0]?.DATA_TYPE || "").toLowerCase();
    if (dt === "enum") {
      console.log("Converting organizations.taxRegime from ENUM to VARCHAR(30)...");
      await sequelize.query(
        "ALTER TABLE organizations MODIFY COLUMN taxRegime VARCHAR(30) NULL",
      );
    }
  } catch (e) {
    console.warn("taxRegime ENUM→VARCHAR conversion failed:", e?.message || e);
  }

  // Cleanup: stari parseNum u ObracunPlata.tsx je brisao sve tačke iz inputa
  // pa je "1.5" → 15, "0.4" → 4 itd. Snimanje pojedinačnog obračuna je upisivalo
  // 10x veće brojeve u workers.taxCoefficient / minuliRadRate i u snapshot
  // payrolls.minuliRadRate. Legitimne vrijednosti su:
  //   • taxCoefficient: 0–4 (osnovni odbitak ×1 + izdržavani)
  //   • minuliRadRate: 0–0.6 (% po godini staža, zakon FBiH)
  // Vrijednosti iznad ovih sigurno su rezultat bug-a → dijelimo sa 10.
  try {
    const [taxCoefRes] = await sequelize.query(
      "UPDATE workers SET taxCoefficient = taxCoefficient / 10 WHERE taxCoefficient >= 5 AND taxCoefficient <= 50",
    );
    const taxCoefFixed = taxCoefRes?.affectedRows ?? 0;
    if (taxCoefFixed > 0) {
      console.log(`Popravljeno ${taxCoefFixed} workers.taxCoefficient vrijednosti (parseNum bug).`);
    }

    const [minuliWorkersRes] = await sequelize.query(
      "UPDATE workers SET minuliRadRate = minuliRadRate / 10 WHERE minuliRadRate >= 1 AND minuliRadRate <= 20",
    );
    const minuliWorkersFixed = minuliWorkersRes?.affectedRows ?? 0;
    if (minuliWorkersFixed > 0) {
      console.log(`Popravljeno ${minuliWorkersFixed} workers.minuliRadRate vrijednosti (parseNum bug).`);
    }

    const [minuliPayrollsRes] = await sequelize.query(
      "UPDATE payrolls SET minuliRadRate = minuliRadRate / 10 WHERE minuliRadRate >= 1 AND minuliRadRate <= 20",
    );
    const minuliPayrollsFixed = minuliPayrollsRes?.affectedRows ?? 0;
    if (minuliPayrollsFixed > 0) {
      console.log(`Popravljeno ${minuliPayrollsFixed} payrolls.minuliRadRate snapshot vrijednosti (parseNum bug).`);
    }
  } catch (e) {
    console.warn("parseNum cleanup migracija nije uspjela:", e?.message || e);
  }

  // Cleanup: empTotal/erpTotal su prije popravke računali "round(sum, 2)"
  // umjesto "sum of round(component, 2)". To je dalo 1 fening razliku između
  // empTotal i (empPio + empZdr + empNezap) na ~50% obračuna, što je rušilo
  // PUFBiH validaciju ("zbir svih kol.15"). Sad usklađujemo postojeće redove:
  //   • empTotal := round(empPio + empZdr + empNezap, 2)
  //   • erpTotal := round(erpPio + erpZdr + erpNezap, 2)
  // Pa onda net/taxBase/incomeTax/totalCost preraćunamo kako bi i platne liste
  // i uplatnice bile konzistentne. Idempotentno: drugi put neće biti nekonzistentnih.
  try {
    const [empTotalRes] = await sequelize.query(
      `UPDATE payrolls
         SET empTotal = ROUND(empPio + empZdravstvo + empNezaposlenost, 2)
       WHERE empTotal <> ROUND(empPio + empZdravstvo + empNezaposlenost, 2)`,
    );
    const empTotalFixed = empTotalRes?.affectedRows ?? 0;
    if (empTotalFixed > 0) {
      console.log(`Usklađeno ${empTotalFixed} payrolls.empTotal redova (PUFBiH round-then-sum convention).`);
    }

    const [erpTotalRes] = await sequelize.query(
      `UPDATE payrolls
         SET erpTotal = ROUND(erpPio + erpZdravstvo + erpNezaposlenost, 2)
       WHERE erpTotal <> ROUND(erpPio + erpZdravstvo + erpNezaposlenost, 2)`,
    );
    const erpTotalFixed = erpTotalRes?.affectedRows ?? 0;
    if (erpTotalFixed > 0) {
      console.log(`Usklađeno ${erpTotalFixed} payrolls.erpTotal redova.`);
    }

    // Re-derive: taxBase, incomeTax, net iz konzistentnog empTotal.
    // taxBase = max(gross - empTotal - deduction, 0). 10% porez. Net = gross - empTotal - incomeTax.
    // totalCost = gross + erpTotal + vodna + nesrece + meal + regres + travel
    // VAŽNO: isključi redove sa koristi u naravi. Kod njih je net SAMO iz plate,
    // a empTotal/incomeTax/gross uključuju i korist, pa formula net = gross -
    // empTotal - incomeTax NE važi. Ti redovi su novi (post-fix) i ne trebaju
    // ovaj legacy fening-cleanup.
    const [netRes] = await sequelize.query(
      `UPDATE payrolls
         SET taxBase = GREATEST(ROUND(gross - empTotal - deduction, 2), 0),
             incomeTax = ROUND(GREATEST(gross - empTotal - deduction, 0) * 0.10, 2),
             net = ROUND(gross - empTotal - ROUND(GREATEST(gross - empTotal - deduction, 0) * 0.10, 2), 2)
       WHERE empTotal IS NOT NULL AND gross IS NOT NULL
         AND (koristBruto IS NULL OR koristBruto = 0)`,
    );
    const netFixed = netRes?.affectedRows ?? 0;
    if (netFixed > 0) {
      console.log(`Re-derivovano ${netFixed} payrolls.taxBase/incomeTax/net redova.`);
    }
  } catch (e) {
    console.warn("empTotal/erpTotal usklađivanje nije uspjelo:", e?.message || e);
  }
}

// Mora se izvršiti PRIJE sequelize.sync(): sync će na postojećoj tabeli
// pokušati dodati novi unique index (userId, year, type) iako kolona `type`
// još ne postoji, što baca grešku 1072.
async function ensureInvoiceCounterTypeColumn() {
  // tabela mora postojati — ako ne postoji, sync će je tek napraviti sa novim schemom
  const [tblRows] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_counters'",
  );
  if (!Number(tblRows?.[0]?.cnt || 0)) return;

  const [colRows] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_counters' AND COLUMN_NAME = 'type'",
  );
  if (Number(colRows?.[0]?.cnt || 0)) return;

  console.log("Razdvajam numeraciju faktura/predračuna, brišem postojeće zapise (testni podaci).");
  await sequelize.query("DELETE FROM invoice_items");
  await sequelize.query("DELETE FROM invoices");
  await sequelize.query("DELETE FROM invoice_counters");

  // skini sve unique indekse osim PRIMARY (stari `(userId, year)`)
  const [idxRows] = await sequelize.query(
    "SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_counters' AND NON_UNIQUE = 0 AND INDEX_NAME != 'PRIMARY'",
  );
  for (const r of idxRows || []) {
    try {
      await sequelize.query(`ALTER TABLE invoice_counters DROP INDEX \`${r.INDEX_NAME}\``);
    } catch (e) { console.warn("drop index skip:", e.message); }
  }
  await sequelize.query(
    "ALTER TABLE invoice_counters ADD COLUMN type ENUM('INVOICE','PROFORMA') NOT NULL DEFAULT 'INVOICE'",
  );
}

// Idempotent ENUM proširenja — sync ne mijenja postojeće ENUM definicije.
async function ensurePayrollDocTypeEnum() {
  const [tblRows] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payroll_documents'",
  );
  if (!Number(tblRows?.[0]?.cnt || 0)) return;

  const [colRows] = await sequelize.query(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payroll_documents' AND COLUMN_NAME = 'type'",
  );
  const colType = String(colRows?.[0]?.COLUMN_TYPE || "");
  const required = [
    "UPLATNICA_INVALIDI",
    "UPLATNICA_ZDR_FED",
    "UPLATNICA_NEZAP_KANT",
  ];
  if (required.every((v) => colType.includes(v))) return;

  console.log("Proširujem payroll_documents.type ENUM...");
  await sequelize.query(
    "ALTER TABLE payroll_documents MODIFY COLUMN type ENUM('PLATNA_LISTA','UPLATNICA_NETO','UPLATNICA_PIO','UPLATNICA_ZDR','UPLATNICA_ZDR_FED','UPLATNICA_NEZAP','UPLATNICA_NEZAP_KANT','UPLATNICA_POREZ','UPLATNICA_VODNA','UPLATNICA_NESRECE','UPLATNICA_INVALIDI') NOT NULL",
  );
}

// Idempotentno proširenje worker_documents.type ENUM-a (kadrovska rješenja/odluke).
async function ensureWorkerDocTypeEnum() {
  const [tblRows] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'worker_documents'",
  );
  if (!Number(tblRows?.[0]?.cnt || 0)) return;

  const [colRows] = await sequelize.query(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'worker_documents' AND COLUMN_NAME = 'type'",
  );
  const colType = String(colRows?.[0]?.COLUMN_TYPE || "");
  const required = [
    "RJESENJE_GO",
    "RJESENJE_GO_SRAZMJERNI",
    "ODLUKA_REGRES",
    "ODLUKA_PRIGODNA_NAGRADA",
    "RJESENJE_PLACENO_ODSUSTVO",
    "RJESENJE_NEPLACENO_ODSUSTVO",
    "POTVRDA_ZAPOSLENJE",
    "POTVRDA_PLATA",
    "POTVRDA_STAZ",
    "ODLUKA_VOZILO",
    "ANEKS_UGOVORA",
    "ODLUKA_PROMJENA_PLATE",
    "UPOZORENJE_OTKAZ",
    "RJESENJE_PORODILJSKO",
    "ODLUKA_OTPREMNINA",
    "ODLUKA_TOPLI_OBROK",
  ];
  // Provjeri svaki kao zaseban token (npr. RJESENJE_GO je substring od
  // RJESENJE_GO_SRAZMJERNI) , tražimo navodnike oko vrijednosti.
  if (required.every((v) => colType.includes(`'${v}'`))) return;

  console.log("Proširujem worker_documents.type ENUM...");
  await sequelize.query(
    "ALTER TABLE worker_documents MODIFY COLUMN type ENUM('UGOVOR','OTKAZ','JS3100_PRIJAVA','JS3100_ODJAVA','RJESENJE_GO','RJESENJE_GO_SRAZMJERNI','ODLUKA_REGRES','ODLUKA_PRIGODNA_NAGRADA','RJESENJE_PLACENO_ODSUSTVO','RJESENJE_NEPLACENO_ODSUSTVO','POTVRDA_ZAPOSLENJE','POTVRDA_PLATA','POTVRDA_STAZ','ODLUKA_VOZILO','ANEKS_UGOVORA','ODLUKA_PROMJENA_PLATE','UPOZORENJE_OTKAZ','RJESENJE_PORODILJSKO','ODLUKA_OTPREMNINA','ODLUKA_TOPLI_OBROK') NOT NULL",
  );
}

// Idempotentni backfill spola vlasnika (VLASNIK Worker) iz JMBG-a, da ga payroll
// prepozna automatski (kao kod radnika). Cifre 10-12 < 500 = M, >= 500 = Z.
// Samo za one bez spola; nakon prvog prolaza nema šta ažurirati.
async function ensureOwnerSpolFromJmbg() {
  const owners = await Worker.findAll({
    where: { role: "VLASNIK", spol: null },
    attributes: ["id", "jmbg", "spol"],
  });
  let updated = 0;
  for (const w of owners) {
    if (!w.jmbg) continue;
    let plain;
    try {
      plain = decryptJmbg(w.jmbg);
    } catch {
      continue;
    }
    const j = String(plain || "").replace(/\D/g, "");
    if (j.length < 12) continue;
    const nnn = parseInt(j.slice(9, 12), 10);
    if (!Number.isFinite(nnn)) continue;
    await w.update({ spol: nnn >= 500 ? "Z" : "M" });
    updated += 1;
  }
  if (updated) {
    console.log(`Postavljen spol za ${updated} vlasnika iz JMBG-a.`);
  }
}

// Idempotentno osvježavanje naziva djelatnosti na zvanične (KD BiH iz PUFBiH
// PDF-a). Šifra (activityCode) je referenca i NE mijenja se, samo se upisani
// activityName uskladi sa zvaničnim nazivom za tu šifru. Pokreće se na startu;
// nakon prvog prolaza nema neslaganja pa samo pročita i ne mijenja ništa.
async function ensureActivityNamesFresh() {
  const orgs = await Organization.findAll({
    attributes: ["id", "activityCode", "activityName"],
  });
  let updated = 0;
  for (const o of orgs) {
    const code = String(o.activityCode || "").trim();
    if (!code) continue;
    const official = KD_BIH_NAMES[code];
    if (official && o.activityName !== official) {
      await o.update({ activityName: official });
      updated += 1;
    }
  }
  if (updated) {
    console.log(`Osvježeno ${updated} naziva djelatnosti na zvanične (KD BiH).`);
  }
}

// Ensure utf8mb4 charset za tabele koje su možda kreirane sa default DB charsetom
// koji ne podržava bosanske znakove (ć, š, đ, ž, č).
async function ensureUtf8Mb4() {
  const tables = [
    "invoices",
    "invoice_items",
    "invoice_counters",
    "payrolls",
    "payroll_documents",
    // Predračun tabele — buyerName i ostala polja sadrže bosanske znakove (ć,š…).
    "predracuni",
    "predracun_counters",
  ];
  for (const t of tables) {
    const [rows] = await sequelize.query(
      `SELECT CCSA.character_set_name AS cs
       FROM information_schema.TABLES T
       JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA
         ON CCSA.collation_name = T.table_collation
       WHERE T.table_schema = DATABASE() AND T.table_name = ?`,
      { replacements: [t] },
    );
    const cs = rows?.[0]?.cs;
    if (cs && cs !== "utf8mb4") {
      console.log(`Konvertujem ${t} -> utf8mb4 (bilo: ${cs})...`);
      await sequelize.query(
        `ALTER TABLE \`${t}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    }
  }
}

// Sync database tables and start server
sequelize
  .authenticate()
  .then(() => ensureInvoiceCounterTypeColumn())
  .then(() => sequelize.sync({ alter: false }))
  .then(() => ensureColumns())
  .then(() => ensurePayrollDocTypeEnum())
  .then(() => ensureWorkerDocTypeEnum())
  .then(() => ensureActivityNamesFresh())
  .then(() => ensureOwnerSpolFromJmbg())
  .then(() => ensureUtf8Mb4())
  .then(() => {
    console.log("Database synced successfully");
    app.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
    process.exit(1);
  });
