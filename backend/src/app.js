require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { sequelize } = require("./models/index");
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
const profileRoutes = require("./routes/profileRoutes");

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
app.use("/api/profile", profileRoutes);

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
    {
      table: "organizations",
      column: "jurisdiction",
      ddl: "ALTER TABLE organizations ADD COLUMN jurisdiction ENUM('FBIH','RS','BD') NULL",
    },
    {
      table: "organizations",
      column: "isPdvObveznik",
      ddl: "ALTER TABLE organizations ADD COLUMN isPdvObveznik TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "subscriptions",
      column: "plan",
      ddl: "ALTER TABLE subscriptions ADD COLUMN plan ENUM('free','pro','business') NOT NULL DEFAULT 'free'",
    },
    {
      table: "subscriptions",
      column: "status",
      ddl: "ALTER TABLE subscriptions ADD COLUMN status ENUM('active','cancelled','expired','past_due','trialing') NOT NULL DEFAULT 'active'",
    },
    {
      table: "subscriptions",
      column: "billingCycle",
      ddl: "ALTER TABLE subscriptions ADD COLUMN billingCycle ENUM('monthly','yearly') NULL",
    },
    {
      table: "subscriptions",
      column: "cancelAtPeriodEnd",
      ddl: "ALTER TABLE subscriptions ADD COLUMN cancelAtPeriodEnd TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "subscriptions",
      column: "cancelledAt",
      ddl: "ALTER TABLE subscriptions ADD COLUMN cancelledAt DATETIME NULL",
    },
    {
      table: "subscriptions",
      column: "externalSubscriptionId",
      ddl: "ALTER TABLE subscriptions ADD COLUMN externalSubscriptionId VARCHAR(255) NULL",
    },
    {
      table: "user_preferences",
      column: "commandPaletteEnabled",
      ddl: "ALTER TABLE user_preferences ADD COLUMN commandPaletteEnabled TINYINT(1) NOT NULL DEFAULT 0",
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

  console.log("Razdvajam numeraciju faktura/predračuna — brišem postojeće zapise (testni podaci).");
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

// Ensure utf8mb4 charset za tabele koje su možda kreirane sa default DB charsetom
// koji ne podržava bosanske znakove (ć, š, đ, ž, č).
async function ensureUtf8Mb4() {
  const tables = [
    "invoices",
    "invoice_items",
    "invoice_counters",
    "payrolls",
    "payroll_documents",
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
