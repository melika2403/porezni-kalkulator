const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  },
);

// ─── USER ────────────────────────────────────────────────────────────────────
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    googleId: { type: DataTypes.STRING(255), unique: true, allowNull: true },
    email: { type: DataTypes.STRING(255), unique: true, allowNull: true },
    password: { type: DataTypes.STRING(255), allowNull: true },
    firstName: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    role: {
      type: DataTypes.ENUM("USER", "PRO", "BUSINESS", "ADMIN"),
      defaultValue: "USER",
    },
    jmbg: { type: DataTypes.STRING(255), unique: true, allowNull: true },
    passwordResetToken: { type: DataTypes.STRING(255), allowNull: true },
    passwordResetTokenExpiry: { type: DataTypes.DATE, allowNull: true },
    emailVerificationToken: { type: DataTypes.STRING(255), allowNull: true },
    emailVerificationExpiry: { type: DataTypes.DATE, allowNull: true },
    isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    idCardNumber: { type: DataTypes.STRING(9), allowNull: true },
    trialUsedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "users", timestamps: true },
);

// ─── SUBSCRIPTION ────────────────────────────────────────────────────────────
const Subscription = sequelize.define(
  "Subscription",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
    },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "subscriptions", timestamps: true },
);

// ─── ORGANIZATION ─────────────────────────────────────────────────────────────
const Organization = sequelize.define(
  "Organization",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: { type: DataTypes.STRING(255), allowNull: false },
    taxNumber: { type: DataTypes.STRING(100), unique: true, allowNull: true },
    pdvNumber: { type: DataTypes.STRING(20), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: {
      type: DataTypes.ENUM("COMPANY", "BUSINESS"),
      defaultValue: "COMPANY",
    },
    activityCode: { type: DataTypes.STRING(20), allowNull: true },
    activityName: { type: DataTypes.STRING(255), allowNull: true },
    isClientOrg: { type: DataTypes.BOOLEAN, defaultValue: false },
    bankAccount: { type: DataTypes.STRING(25), allowNull: true },
    logoUrl: { type: DataTypes.STRING(500), allowNull: true },
    // Konfiguracija računa primalaca i vrsta prihoda za uplatnice doprinosa/poreza.
    // JSON struktura: { pio: { account, vrstaPrihoda, primalac }, ... }
    // Ako prazno, koristi se default iz utils/uplatnicaPdf.js.
    payrollAccounts: { type: DataTypes.JSON, allowNull: true },
    // Režim oporezivanja vlasnika (relevantno za obrt/BUSINESS):
    //   STVARNI_DOHODAK = poslovne knjige (čl. 19 Zakona o porezu na dohodak)
    //   PAUSALNI         = paušalni iznos (čl. 31)
    //   OSTALI           = ostali obveznici (čl. 6 t.10 Zakona o doprinosima)
    // VARCHAR umjesto ENUM-a — fleksibilnije za buduće vrijednosti i bez
    //                          Sequelize ENUM sync edge case-ova.
    taxRegime: { type: DataTypes.STRING(30), allowNull: true },
    // Kategorija djelatnosti — određuje osnovicu iz obrtniciFbih.js.
    // Vrijednosti zavise od režima (vidi obrtniciFbih.js).
    taxCategory: { type: DataTypes.STRING(50), allowNull: true },
  },
  { tableName: "organizations", timestamps: true },
);

// ─── WORKER ──────────────────────────────────────────────────────────────────
const Worker = sequelize.define(
  "Worker",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    firstName: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    jmbg: { type: DataTypes.STRING(500), allowNull: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    role: {
      type: DataTypes.ENUM("VLASNIK", "RADNIK"),
      defaultValue: "RADNIK",
    },
    idCardNumber: { type: DataTypes.STRING(9), allowNull: true },
    bankAccount: { type: DataTypes.STRING(25), allowNull: true }, // tekući/žiro račun
    defaultStartTime: { type: DataTypes.STRING(5), allowNull: true },
    defaultEndTime: { type: DataTypes.STRING(5), allowNull: true },
    defaultDaysOff: { type: DataTypes.STRING(20), allowNull: true }, // comma-separated weekdays e.g. "0,6"
    defaultPause: { type: DataTypes.STRING(5), allowNull: true }, // pause hours, e.g. "1" or "0.5"
    // ── Employment / ugovor o radu ──
    position: { type: DataTypes.STRING(120), allowNull: true },
    salaryBruto: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    salaryNeto: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    contractType: {
      type: DataTypes.ENUM("NEODREDJENO", "ODREDJENO"),
      allowNull: true,
    },
    contractEndDate: { type: DataTypes.DATEONLY, allowNull: true },
    probationMonths: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    noticePeriod: { type: DataTypes.STRING(50), allowNull: true },
    contractNumber: { type: DataTypes.STRING(50), allowNull: true },
    employmentStatus: {
      type: DataTypes.ENUM("DRAFT", "PRIJAVLJEN", "ODJAVLJEN"),
      defaultValue: "DRAFT",
    },
    prijavaDate: { type: DataTypes.DATEONLY, allowNull: true },
    odjavaDate: { type: DataTypes.DATEONLY, allowNull: true },
    spol: { type: DataTypes.ENUM("M", "Z"), allowNull: true },
    strucnaSpremaIdx: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    // Porezni koeficijent ličnog odbitka (1.0 = 300 KM osnovnog odbitka).
    // User upiše finalni koeficijent (npr. 1.5 = 450 KM ako ima jedno dijete).
    taxCoefficient: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 1.0,
    },
    // Stopa minulog rada (% po godini staža) — npr. 0.40 = 0,4% × bruto × godine.
    // Po kolektivnom ugovoru FBiH obično 0,3–0,6%. Default 0,40%.
    minuliRadRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.40,
    },
    // ── Ukupan radni staž (za minuli rad) ──
    // Minuli rad se računa na UKUPAN radni staž, ne samo na staž u našoj firmi.
    // Dva opciona unosa (user bira jedan):
    //  • firstEmploymentDate — datum prvog zaposljenja IKADA. Pretpostavlja
    //    kontinuirani staž (bez prekida). Ukupan = today - firstEmploymentDate.
    //  • priorWorkYears — staž PRIJE ulaska u našu firmu, u godinama (decimalni
    //    broj, npr. 5.5 = 5 god 6 mj). Koristi se kad ima prekida ili kad
    //    user ne zna tačan datum prvog zaposljenja. Ukupan = today -
    //    prijavaDate + priorWorkYears.
    // Ako je upisano oboje, priorWorkYears ima prednost (tačniji).
    firstEmploymentDate: { type: DataTypes.DATEONLY, allowNull: true },
    priorWorkYears: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    // Stope uvećanja po Zakonu o radu FBiH (čl. 76). Default su zakonski minimumi.
    overtimeRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 25.0 },
    nightRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 25.0 },
    sundayRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 20.0 },
    holidayRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 50.0 },
    // Sticky defaults za naknade — pamte se iz zadnjeg obračuna.
    // Regres se NE pamti (resetuje na 0 svaki mjesec — godišnje ga ima samo jednom).
    defaultMealAllowance: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    defaultTravelExpense: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    // Ugovoreno radno vrijeme (dnevno) — bitno za minimalnu osnovicu doprinosa.
    // Po Zakonu o doprinosima FBiH (čl. 7, izmjene 33/25 od 01.07.2025):
    //  • 8h (puno) → puna min. bruto osnovica
    //  • 5–7h (nepuno > 4h) → puna min. bruto osnovica (NE smanjuje se srazmjerno)
    //  • 1–4h (nepuno ≤ 4h) → srazmjerno, ali ne manje od 50% pune min. osnovice
    contractedHours: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 8 },
  },
  { tableName: "workers", timestamps: true },
);

// ─── PAYROLL ─────────────────────────────────────────────────────────────────
// Mjesečni obračun plate za jednog radnika. Snapshot iznosa u trenutku obračuna —
// imutabilan nakon što pređe u status OBRACUNATO/ISPLACENO.
const Payroll = sequelize.define(
  "Payroll",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    workerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: false },

    // Sati / fond
    workedMinutes: { type: DataTypes.INTEGER, allowNull: true },
    standardMinutes: { type: DataTypes.INTEGER, allowNull: true },
    sickDays: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    vacationDays: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    overtimeHours: { type: DataTypes.DECIMAL(6, 2), allowNull: true, defaultValue: 0 },
    nightHours: { type: DataTypes.DECIMAL(6, 2), allowNull: true, defaultValue: 0 },
    sundayHours: { type: DataTypes.DECIMAL(6, 2), allowNull: true, defaultValue: 0 },
    holidayHours: { type: DataTypes.DECIMAL(6, 2), allowNull: true, defaultValue: 0 },

    // Stope uvećanja (snapshot u trenutku obračuna) + iznosi po kategoriji.
    // Iznos = sati × (grossBase / 174) × (stopa/100); zbir se dodaje na bruto.
    overtimeRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 25.0 },
    nightRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 25.0 },
    sundayRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 20.0 },
    holidayRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 50.0 },
    overtimeAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
    nightAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
    sundayAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
    holidayAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },

    // Bruto / koeficijent (snapshot)
    // gross = efektivni bruto (osnovica + minuli rad) — koristi se za doprinose/porez
    gross: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    // grossBase = bruto osnovica (ono što user upiše, prije dodavanja minulog rada)
    grossBase: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    // Minuli rad (% × godine × osnovica)
    minuliRadRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
    minuliRadYears: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    minuliRadAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
    taxCoefficient: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 1.0 },
    deduction: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    minBaseApplied: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    // Doprinosi iz plate (zaposlenik)
    empPio: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    empZdravstvo: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    empNezaposlenost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    empTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },

    // Porez
    taxBase: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    incomeTax: { type: DataTypes.DECIMAL(12, 2), allowNull: false },

    // Neto
    net: { type: DataTypes.DECIMAL(12, 2), allowNull: false },

    // Doprinosi na platu (poslodavac)
    erpPio: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    erpZdravstvo: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    erpNezaposlenost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    erpTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },

    // Dodatne naknade
    vodnaNaknada: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    naknadaNesrece: { type: DataTypes.DECIMAL(12, 2), allowNull: false },

    // Neoporezivi dodaci (toggle ON/OFF preko iznosa > 0)
    mealAllowance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    vacationBonus: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    travelExpense: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

    // Ukupan trošak poslodavca (gross + erpTotal + vodna + nesrece + dodaci)
    totalCost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },

    // Snapshot bankovnog računa radnika
    bankAccount: { type: DataTypes.STRING(25), allowNull: true },

    status: {
      type: DataTypes.ENUM("DRAFT", "OBRACUNATO", "ISPLACENO"),
      allowNull: false,
      defaultValue: "DRAFT",
    },

    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "payrolls",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      { unique: true, fields: ["workerId", "year", "month"] },
      { fields: ["organizationId", "year", "month"] },
    ],
  },
);

// ─── PAYROLL DOCUMENT ────────────────────────────────────────────────────────
// PDF artefakti generisani iz Payroll snapshot-a: platne liste, uplatnice.
const PayrollDocument = sequelize.define(
  "PayrollDocument",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    payrollId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: {
      type: DataTypes.ENUM(
        "PLATNA_LISTA",
        "UPLATNICA_NETO",
        "UPLATNICA_PIO",
        "UPLATNICA_ZDR",
        "UPLATNICA_ZDR_FED",
        "UPLATNICA_NEZAP",
        "UPLATNICA_NEZAP_KANT",
        "UPLATNICA_POREZ",
        "UPLATNICA_VODNA",
        "UPLATNICA_NESRECE",
        "UPLATNICA_INVALIDI",
      ),
      allowNull: false,
    },
    filename: { type: DataTypes.STRING(255), allowNull: false },
    originalName: { type: DataTypes.STRING(255), allowNull: false },
    mimeType: { type: DataTypes.STRING(120), allowNull: false },
    sizeBytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "payroll_documents",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [{ fields: ["payrollId"] }],
  },
);

// ─── WORKER DOCUMENT ──────────────────────────────────────────────────────────
// Generisani dokumenti vezani za radnika (ugovor o radu, otkaz, JS3100).
const WorkerDocument = sequelize.define(
  "WorkerDocument",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    workerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: {
      // UGOVOR=ugovor o radu, OTKAZ=odluka o prestanku, JS3100_PRIJAVA, JS3100_ODJAVA
      type: DataTypes.ENUM("UGOVOR", "OTKAZ", "JS3100_PRIJAVA", "JS3100_ODJAVA"),
      allowNull: false,
    },
    format: {
      type: DataTypes.ENUM("DOCX", "PDF"),
      allowNull: false,
    },
    /** Broj ugovora/otkaza (referenca, ne unique). */
    number: { type: DataTypes.STRING(64), allowNull: true },
    /** Filename na disku (samo basename, ne path). */
    filename: { type: DataTypes.STRING(255), allowNull: false },
    /** Originalno ime fajla kao bi se prikazalo korisniku pri downloadu. */
    originalName: { type: DataTypes.STRING(255), allowNull: false },
    mimeType: { type: DataTypes.STRING(120), allowNull: false },
    sizeBytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "worker_documents",
    timestamps: true,
    indexes: [{ fields: ["workerId"] }, { fields: ["organizationId"] }],
  },
);

// ─── CONTRACT COUNTER ─────────────────────────────────────────────────────────
// Per-organization, per-year counter za brojeve ugovora o radu (UoR).
const ContractCounter = sequelize.define(
  "ContractCounter",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    lastNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "contract_counters",
    timestamps: true,
    indexes: [{ unique: true, fields: ["organizationId", "year"] }],
  },
);

// ─── ORGANIZATION MEMBER ──────────────────────────────────────────────────────
const OrganizationMember = sequelize.define(
  "OrganizationMember",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    role: {
      type: DataTypes.ENUM("OWNER", "ADMIN", "MEMBER"),
      defaultValue: "MEMBER",
    },
    joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "organization_members", timestamps: false },
);

// ─── CLIENT ──────────────────────────────────────────────────────────────────
const Client = sequelize.define(
  "Client",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    type: {
      type: DataTypes.ENUM("PERSON", "COMPANY"),
      defaultValue: "PERSON",
    },
    firstName: { type: DataTypes.STRING(100), allowNull: true },
    lastName: { type: DataTypes.STRING(100), allowNull: true },
    companyName: { type: DataTypes.STRING(255), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    jmbg: { type: DataTypes.STRING(500), allowNull: true },
    taxNumber: { type: DataTypes.STRING(100), allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    amortizacijaOnly: { type: DataTypes.BOOLEAN, defaultValue: false },
    idCardNumber: { type: DataTypes.STRING(9), allowNull: true },
  },
  { tableName: "clients", timestamps: true },
);

// ─── FORM ─────────────────────────────────────────────────────────────────────
const Form = sequelize.define(
  "Form",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM(
        "GPD",
        "SPR",
        "ZO3",
        "UGOVOR", // ugovor o pozajmici (legacy use)
        "UOD",    // ugovor o djelu (Faza 3)
        "PLDI",
        "AMS",
        "SIH",
        "JS3100",
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("DRAFT", "GENERATED", "SUBMITTED", "ARCHIVED"),
      defaultValue: "DRAFT",
    },
    year: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING(255), allowNull: true },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    workerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    clientId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    updatedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    pdfUrl: { type: DataTypes.STRING(500), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "forms", timestamps: true },
);

// ─── FORM VERSION ─────────────────────────────────────────────────────────────
const FormVersion = sequelize.define(
  "FormVersion",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    formId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    versionNumber: { type: DataTypes.INTEGER, allowNull: false },
    data: { type: DataTypes.TEXT("long"), allowNull: false },
    pdfUrl: { type: DataTypes.STRING(500), allowNull: true },
  },
  { tableName: "form_versions", timestamps: true, updatedAt: false },
);

// ─── FORM ATTACHMENT ──────────────────────────────────────────────────────────
const FormAttachment = sequelize.define(
  "FormAttachment",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    formId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    fileName: { type: DataTypes.STRING(255), allowNull: false },
    fileUrl: { type: DataTypes.STRING(500), allowNull: false },
    mimeType: { type: DataTypes.STRING(100), allowNull: true },
  },
  { tableName: "form_attachments", timestamps: true, updatedAt: false },
);

// ─── KARTICA MEMBER (članovi za generator članskih kartica) ─────────────────
const KarticaMember = sequelize.define(
  "KarticaMember",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    code: { type: DataTypes.STRING(100), allowNull: false },
    clubName: { type: DataTypes.STRING(255), allowNull: true },
    validUntil: { type: DataTypes.DATEONLY, allowNull: true },
  },
  {
    tableName: "kartica_members",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      { fields: ["createdById"] },
      { fields: ["createdById", "organizationId"] },
      { fields: ["createdById", "organizationId", "code"] },
    ],
  },
);

// ─── CITY ─────────────────────────────────────────────────────────────────────
const City = sequelize.define(
  "City",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    municipalityCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
    postalCode: { type: DataTypes.STRING(10), allowNull: true },
    kanton: { type: DataTypes.STRING(10), allowNull: false },
  },
  { tableName: "cities", timestamps: true },
);

// ─── PREDRACUN COUNTER (po godini) ────────────────────────────────────────────
const PredracunCounter = sequelize.define(
  "PredracunCounter",
  {
    year: { type: DataTypes.INTEGER, primaryKey: true },
    lastNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  { tableName: "predracun_counters", timestamps: true },
);

// ─── PREDRACUN ────────────────────────────────────────────────────────────────
const Predracun = sequelize.define(
  "Predracun",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    // broj predračuna kompozitno polje za jednoznačnu pretragu
    year: { type: DataTypes.INTEGER, allowNull: false },
    sequence: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    fullNumber: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    // plan
    plan: { type: DataTypes.ENUM("PRO", "BUSINESS"), allowNull: false },
    // iznosi (KM)
    netAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    vatAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    grossAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    // datumi
    issueDate: { type: DataTypes.DATEONLY, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false },
    // kupac (snapshot u trenutku izdavanja)
    buyerCode: { type: DataTypes.STRING(10), allowNull: true },
    buyerName: { type: DataTypes.STRING(255), allowNull: false },
    buyerAddress: { type: DataTypes.STRING(255), allowNull: true },
    buyerCity: { type: DataTypes.STRING(120), allowNull: true },
    buyerPostalCode: { type: DataTypes.STRING(10), allowNull: true },
    buyerPhone: { type: DataTypes.STRING(50), allowNull: true },
    buyerEmail: { type: DataTypes.STRING(255), allowNull: false },
    buyerIdNumber: { type: DataTypes.STRING(30), allowNull: true },
    buyerVatNumber: { type: DataTypes.STRING(30), allowNull: true },
    // veze (opcionalno — nije obavezno biti ulogovan)
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // status
    status: {
      type: DataTypes.ENUM("ISSUED", "PAID", "CANCELLED"),
      defaultValue: "ISSUED",
    },
  },
  { tableName: "predracuni", timestamps: true },
);

// ─── INVOICE COUNTER (po useru/godini) ────────────────────────────────────────
const InvoiceCounter = sequelize.define(
  "InvoiceCounter",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // Faza 3: brojač se vodi po organizaciji. Postojeći redovi sa userId-em
    // ostaju za legacy fakture (one bez organizationId). Nove fakture uvijek
    // imaju organizationId i koriste org-based counter.
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    year: { type: DataTypes.INTEGER, allowNull: false },
    type: {
      type: DataTypes.ENUM("INVOICE", "PROFORMA"),
      allowNull: false,
      defaultValue: "INVOICE",
    },
    lastNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "invoice_counters",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      // Legacy unique (per-user) i novi unique (per-org). Sequelize tolerira oba.
      { unique: true, fields: ["userId", "year", "type"], name: "uniq_invoice_counter_user_year_type" },
      { unique: true, fields: ["organizationId", "year", "type"], name: "uniq_invoice_counter_org_year_type" },
    ],
  },
);

// ─── INVOICE ──────────────────────────────────────────────────────────────────
const Invoice = sequelize.define(
  "Invoice",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    clientId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },

    type: {
      type: DataTypes.ENUM("INVOICE", "PROFORMA"),
      allowNull: false,
      defaultValue: "INVOICE",
    },
    year: { type: DataTypes.INTEGER, allowNull: false },
    sequence: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    fullNumber: { type: DataTypes.STRING(40), allowNull: false }, // npr. "0001-2026"

    issueDate: { type: DataTypes.DATEONLY, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    paidAt: { type: DataTypes.DATEONLY, allowNull: true },
    emailSentAt: { type: DataTypes.DATE, allowNull: true },
    emailSentTo: { type: DataTypes.STRING(255), allowNull: true },

    applyVat: { type: DataTypes.BOOLEAN, defaultValue: true },

    currency: {
      type: DataTypes.ENUM("BAM", "EUR"),
      defaultValue: "BAM",
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("DRAFT", "ISSUED", "PAID", "CANCELLED"),
      defaultValue: "ISSUED",
    },

    // ── snapshot prodavca (da se ne mijenja kad user kasnije izmijeni profil)
    sellerName: { type: DataTypes.STRING(255), allowNull: false },
    sellerAddress: { type: DataTypes.STRING(255), allowNull: true },
    sellerCity: { type: DataTypes.STRING(120), allowNull: true },
    sellerPhone: { type: DataTypes.STRING(50), allowNull: true },
    sellerEmail: { type: DataTypes.STRING(255), allowNull: true },
    sellerTaxNumber: { type: DataTypes.STRING(30), allowNull: true },
    sellerVatNumber: { type: DataTypes.STRING(30), allowNull: true },
    sellerBankAccount: { type: DataTypes.STRING(50), allowNull: true },
    sellerLogoUrl: { type: DataTypes.STRING(500), allowNull: true },

    // ── snapshot kupca
    buyerName: { type: DataTypes.STRING(255), allowNull: false },
    buyerAddress: { type: DataTypes.STRING(255), allowNull: true },
    buyerCity: { type: DataTypes.STRING(120), allowNull: true },
    buyerPostalCode: { type: DataTypes.STRING(10), allowNull: true },
    buyerPhone: { type: DataTypes.STRING(50), allowNull: true },
    buyerEmail: { type: DataTypes.STRING(255), allowNull: true },
    buyerIdNumber: { type: DataTypes.STRING(30), allowNull: true },
    buyerVatNumber: { type: DataTypes.STRING(30), allowNull: true },

    // ── totali (snapshot, računati iz stavki)
    netTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    discountTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    vatTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    grossTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

    notes: { type: DataTypes.TEXT, allowNull: true },

    convertedFromProformaId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "invoices",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      { fields: ["userId"] },
      { fields: ["userId", "year", "type"] },
      { unique: true, fields: ["userId", "fullNumber", "type"] },
    ],
  },
);

// ─── INVOICE ITEM ─────────────────────────────────────────────────────────────
const InvoiceItem = sequelize.define(
  "InvoiceItem",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    invoiceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ordinal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, // 1, 2, 3...
    name: { type: DataTypes.STRING(500), allowNull: false }, // naziv robe / usluge
    unit: { type: DataTypes.STRING(20), allowNull: true }, // jed. mjere (kom, h, m, ...)
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 1 },
    unitPrice: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 }, // cijena bez PDV
    discountPct: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
    vatPct: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
    // computed snapshot
    netLine: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    discountLine: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    vatLine: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    grossLine: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "invoice_items",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [{ fields: ["invoiceId"] }],
  },
);

// ─── INVOICE ITEM TEMPLATE (per-user "biblioteka stavki") ─────────────────────
const InvoiceItemTemplate = sequelize.define(
  "InvoiceItemTemplate",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(500), allowNull: false },
    unit: { type: DataTypes.STRING(20), allowNull: true, defaultValue: "kom" },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 1 },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    discountPct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    vatPct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 17 },
  },
  {
    tableName: "invoice_item_templates",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [{ fields: ["userId"] }],
  },
);

// ─── ASSOCIATIONS ─────────────────────────────────────────────────────────────
User.hasOne(Subscription, { foreignKey: "userId", as: "subscription" });
Subscription.belongsTo(User, { foreignKey: "userId" });

Organization.hasMany(Worker, { foreignKey: "organizationId", as: "workers" });
Worker.belongsTo(Organization, { foreignKey: "organizationId" });

User.hasMany(Organization, { foreignKey: "createdById", as: "createdOrganizations" });
Organization.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

Organization.hasMany(OrganizationMember, {
  foreignKey: "organizationId",
  as: "members",
});
OrganizationMember.belongsTo(Organization, {
  foreignKey: "organizationId",
  as: "organization",
});

User.hasMany(OrganizationMember, { foreignKey: "userId" });
OrganizationMember.belongsTo(User, { foreignKey: "userId", as: "user" });

Organization.hasMany(Client, { foreignKey: "organizationId" });
Client.belongsTo(Organization, { foreignKey: "organizationId" });

User.hasMany(Client, { foreignKey: "createdById", as: "createdClients" });
Client.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

Organization.hasMany(Form, { foreignKey: "organizationId", as: "forms" });
Form.belongsTo(Organization, {
  foreignKey: "organizationId",
  as: "organization",
});

Client.hasMany(Form, { foreignKey: "clientId" });
Form.belongsTo(Client, { foreignKey: "clientId", as: "client" });

Worker.hasMany(Form, { foreignKey: "workerId", as: "forms" });
Worker.hasMany(WorkerDocument, { foreignKey: "workerId", as: "documents" });
WorkerDocument.belongsTo(Worker, { foreignKey: "workerId" });
Form.belongsTo(Worker, { foreignKey: "workerId", as: "worker" });

User.hasMany(Form, { foreignKey: "createdById", as: "createdForms" });
Form.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

Form.hasMany(FormVersion, { foreignKey: "formId", as: "versions" });
FormVersion.belongsTo(Form, { foreignKey: "formId" });

Form.hasMany(FormAttachment, { foreignKey: "formId", as: "attachments" });
FormAttachment.belongsTo(Form, { foreignKey: "formId" });

User.hasMany(Predracun, { foreignKey: "userId", as: "predracuni" });
Predracun.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(Invoice, { foreignKey: "userId", as: "invoices" });
Invoice.belongsTo(User, { foreignKey: "userId", as: "user" });
Organization.hasMany(Invoice, { foreignKey: "organizationId", as: "invoices" });
Invoice.belongsTo(Organization, { foreignKey: "organizationId", as: "organization" });
Client.hasMany(Invoice, { foreignKey: "clientId", as: "invoices" });
Invoice.belongsTo(Client, { foreignKey: "clientId", as: "client" });
Invoice.hasMany(InvoiceItem, { foreignKey: "invoiceId", as: "items", onDelete: "CASCADE", hooks: true });
InvoiceItem.belongsTo(Invoice, { foreignKey: "invoiceId" });
User.hasMany(InvoiceItemTemplate, {
  foreignKey: "userId",
  as: "invoiceItemTemplates",
});
InvoiceItemTemplate.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(KarticaMember, {
  foreignKey: "createdById",
  as: "karticaMembers",
});
KarticaMember.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

Organization.hasMany(KarticaMember, {
  foreignKey: "organizationId",
  as: "karticaMembers",
});
KarticaMember.belongsTo(Organization, {
  foreignKey: "organizationId",
  as: "organization",
});

// Payroll associations
Organization.hasMany(Payroll, { foreignKey: "organizationId", as: "payrolls" });
Payroll.belongsTo(Organization, { foreignKey: "organizationId", as: "organization" });
Worker.hasMany(Payroll, { foreignKey: "workerId", as: "payrolls" });
Payroll.belongsTo(Worker, { foreignKey: "workerId", as: "worker" });

Payroll.hasMany(PayrollDocument, {
  foreignKey: "payrollId",
  as: "documents",
  onDelete: "CASCADE",
  hooks: true,
});
PayrollDocument.belongsTo(Payroll, { foreignKey: "payrollId", as: "payroll" });

module.exports = {
  sequelize,
  User,
  Subscription,
  Organization,
  Worker,
  OrganizationMember,
  Client,
  Form,
  FormVersion,
  FormAttachment,
  City,
  Predracun,
  PredracunCounter,
  KarticaMember,
  Invoice,
  InvoiceItem,
  InvoiceCounter,
  ContractCounter,
  WorkerDocument,
  InvoiceItemTemplate,
  Payroll,
  PayrollDocument,
};
