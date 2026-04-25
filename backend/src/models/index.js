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
  }
);

// ─── USER ────────────────────────────────────────────────────────────────────
const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    googleId: { type: DataTypes.STRING(255), unique: true, allowNull: true },
    email: { type: DataTypes.STRING(255), unique: true, allowNull: true },
    password: { type: DataTypes.STRING(255), allowNull: true },
    firstName: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
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
  { tableName: "users", timestamps: true }
);

// ─── SUBSCRIPTION ────────────────────────────────────────────────────────────
const Subscription = sequelize.define(
  "Subscription",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "subscriptions", timestamps: true }
);

// ─── ORGANIZATION ─────────────────────────────────────────────────────────────
const Organization = sequelize.define(
  "Organization",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    taxNumber: { type: DataTypes.STRING(100), unique: true, allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: {
      type: DataTypes.ENUM("COMPANY", "BUSINESS"),
      defaultValue: "COMPANY",
    },
    activityCode: { type: DataTypes.STRING(20), allowNull: true },
    activityName: { type: DataTypes.STRING(255), allowNull: true },
    isClientOrg: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: "organizations", timestamps: true }
);

// ─── WORKER ──────────────────────────────────────────────────────────────────
const Worker = sequelize.define(
  "Worker",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    firstName: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    jmbg: { type: DataTypes.STRING(500), allowNull: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    role: {
      type: DataTypes.ENUM("VLASNIK", "RADNIK"),
      defaultValue: "RADNIK",
    },
    idCardNumber: { type: DataTypes.STRING(9), allowNull: true },
  },
  { tableName: "workers", timestamps: true }
);

// ─── ORGANIZATION MEMBER ──────────────────────────────────────────────────────
const OrganizationMember = sequelize.define(
  "OrganizationMember",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    role: {
      type: DataTypes.ENUM("OWNER", "ADMIN", "MEMBER"),
      defaultValue: "MEMBER",
    },
    joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "organization_members", timestamps: false }
);

// ─── CLIENT ──────────────────────────────────────────────────────────────────
const Client = sequelize.define(
  "Client",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
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
    jmbg: { type: DataTypes.STRING(500), allowNull: true },
    taxNumber: { type: DataTypes.STRING(100), allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    amortizacijaOnly: { type: DataTypes.BOOLEAN, defaultValue: false },
    idCardNumber: { type: DataTypes.STRING(9), allowNull: true },
  },
  { tableName: "clients", timestamps: true }
);

// ─── FORM ─────────────────────────────────────────────────────────────────────
const Form = sequelize.define(
  "Form",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    type: {
      type: DataTypes.ENUM("GPD", "SPR", "ZO3", "UGOVOR", "PLDI", "AMS"),
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
    clientId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    updatedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    pdfUrl: { type: DataTypes.STRING(500), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "forms", timestamps: true }
);

// ─── FORM VERSION ─────────────────────────────────────────────────────────────
const FormVersion = sequelize.define(
  "FormVersion",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    formId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    versionNumber: { type: DataTypes.INTEGER, allowNull: false },
    data: { type: DataTypes.TEXT("long"), allowNull: false },
    pdfUrl: { type: DataTypes.STRING(500), allowNull: true },
  },
  { tableName: "form_versions", timestamps: true, updatedAt: false }
);

// ─── FORM ATTACHMENT ──────────────────────────────────────────────────────────
const FormAttachment = sequelize.define(
  "FormAttachment",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    formId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    fileName: { type: DataTypes.STRING(255), allowNull: false },
    fileUrl: { type: DataTypes.STRING(500), allowNull: false },
    mimeType: { type: DataTypes.STRING(100), allowNull: true },
  },
  { tableName: "form_attachments", timestamps: true, updatedAt: false }
);

// ─── ASSOCIATIONS ─────────────────────────────────────────────────────────────
User.hasOne(Subscription, { foreignKey: "userId", as: "subscription" });
Subscription.belongsTo(User, { foreignKey: "userId" });

Organization.hasMany(Worker, { foreignKey: "organizationId", as: "workers" });
Worker.belongsTo(Organization, { foreignKey: "organizationId" });

Organization.hasMany(OrganizationMember, { foreignKey: "organizationId", as: "members" });
OrganizationMember.belongsTo(Organization, { foreignKey: "organizationId", as: "organization" });

User.hasMany(OrganizationMember, { foreignKey: "userId" });
OrganizationMember.belongsTo(User, { foreignKey: "userId", as: "user" });

Organization.hasMany(Client, { foreignKey: "organizationId" });
Client.belongsTo(Organization, { foreignKey: "organizationId" });

User.hasMany(Client, { foreignKey: "createdById", as: "createdClients" });
Client.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

Organization.hasMany(Form, { foreignKey: "organizationId", as: "forms" });
Form.belongsTo(Organization, { foreignKey: "organizationId", as: "organization" });

Client.hasMany(Form, { foreignKey: "clientId" });
Form.belongsTo(Client, { foreignKey: "clientId", as: "client" });

User.hasMany(Form, { foreignKey: "createdById", as: "createdForms" });
Form.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

Form.hasMany(FormVersion, { foreignKey: "formId", as: "versions" });
FormVersion.belongsTo(Form, { foreignKey: "formId" });

Form.hasMany(FormAttachment, { foreignKey: "formId", as: "attachments" });
FormAttachment.belongsTo(Form, { foreignKey: "formId" });

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
};
