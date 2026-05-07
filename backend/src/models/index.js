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
  },
  { tableName: "workers", timestamps: true },
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
        "UGOVOR",
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
Form.belongsTo(Worker, { foreignKey: "workerId", as: "worker" });

User.hasMany(Form, { foreignKey: "createdById", as: "createdForms" });
Form.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

Form.hasMany(FormVersion, { foreignKey: "formId", as: "versions" });
FormVersion.belongsTo(Form, { foreignKey: "formId" });

Form.hasMany(FormAttachment, { foreignKey: "formId", as: "attachments" });
FormAttachment.belongsTo(Form, { foreignKey: "formId" });

User.hasMany(Predracun, { foreignKey: "userId", as: "predracuni" });
Predracun.belongsTo(User, { foreignKey: "userId", as: "user" });
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
};
