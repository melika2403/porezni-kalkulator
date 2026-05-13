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
const { trialRouter } = require("./routes/subscriptionsRoutes");
const contactRoutes = require("./routes/contactRoutes");
const citiesRoutes = require("./routes/citiesRoutes");
const predracunRoutes = require("./routes/predracunRoutes");
const karticaMembersRoutes = require("./routes/karticaMembersRoutes");
const invoicesRoutes = require("./routes/invoicesRoutes");
const invoiceItemTemplatesRoutes = require("./routes/invoiceItemTemplatesRoutes");
const workerDocumentsRoutes = require("./routes/workerDocumentsRoutes");

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
app.use("/api/contact", contactRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/predracun", predracunRoutes);
app.use("/api/kartica-members", karticaMembersRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/invoice-item-templates", invoiceItemTemplatesRoutes);
app.use("/api/workers", workerDocumentsRoutes);

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

// Ensure utf8mb4 charset za tabele koje su možda kreirane sa default DB charsetom
// koji ne podržava bosanske znakove (ć, š, đ, ž, č).
async function ensureUtf8Mb4() {
  const tables = ["invoices", "invoice_items", "invoice_counters"];
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
