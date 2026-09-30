require("dotenv").config();

const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { sequelize, Organization, Worker, ActivityLog } = require("./models/index");
const { decryptJmbg } = require("./utils/encryptJmbg");
const {
  formatAccountDashed,
} = require("./services/bankStatements/bankCodes");
const KD_BIH_NAMES = require("./data/kdBihNames.json");
const authRoutes = require("./routes/authRoutes");
const uplatniRacuniRoutes = require("./routes/uplatniRacuniRoutes");
const twoFactorRoutes = require("./routes/twoFactorRoutes");
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
const preparedInvoicesRoutes = require("./routes/preparedInvoicesRoutes");
const invoiceItemTemplatesRoutes = require("./routes/invoiceItemTemplatesRoutes");
const amsIsplatiociRoutes = require("./routes/amsIsplatiociRoutes");
const freelancerRoutes = require("./routes/freelancerRoutes");
const vijestiRoutes = require("./routes/vijestiRoutes");
const raspraveRoutes = require("./routes/raspraveRoutes");
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
const pdvRoutes = require("./routes/pdvRoutes");
const publicStatsRoutes = require("./routes/publicStatsRoutes");
const prebijanjaRoutes = require("./routes/prebijanjaRoutes");
const supportRoutes = require("./routes/supportRoutes");
const announcementsRoutes = require("./routes/announcementsRoutes");
const { initSocket } = require("./socket");
const {
  startNotificationScheduler,
} = require("./services/notificationScheduler");
const kalkulacijeRoutes = require("./routes/kalkulacijeRoutes");
const lagerRoutes = require("./routes/lagerRoutes");
const blagajnaRoutes = require("./routes/blagajnaRoutes");
const putniNaloziRoutes = require("./routes/putniNaloziRoutes");
const pkOfficeRoutes = require("./routes/pkOfficeRoutes");
const reklameRoutes = require("./routes/reklameRoutes");

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
// veći limit zbog grupnih uvoza (šifarnik artikala/partnera zna imati
// desetine hiljada stavki poslanih kao JSON)
app.use(express.json({ limit: "25mb" }));
app.use(cookieParser());

// ── static za uploadane fajlove (logo organizacije, kasnije i drugi) ─────────
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR));

app.use("/api/auth", authRoutes);
app.use("/api/uplatni-racuni", uplatniRacuniRoutes);
app.use("/api/2fa", twoFactorRoutes);
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
app.use("/api/prepared-invoices", preparedInvoicesRoutes);
app.use("/api/invoice-item-templates", invoiceItemTemplatesRoutes);
app.use("/api/ams/isplatioci", amsIsplatiociRoutes);
app.use("/api/freelancer", freelancerRoutes);
app.use("/api/vijesti", vijestiRoutes);
app.use("/api/rasprave", raspraveRoutes);
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
app.use("/api/pdv", pdvRoutes);
app.use("/api/public", publicStatsRoutes);
app.use("/api/prebijanja", prebijanjaRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/kalkulacije", kalkulacijeRoutes);
app.use("/api/lager", lagerRoutes);
app.use("/api/blagajna", blagajnaRoutes);
app.use("/api/putni-nalozi", putniNaloziRoutes);
app.use("/api/pk-office", pkOfficeRoutes);
app.use("/api/reklame", reklameRoutes);

// Zadnji u nizu: greške koje nisu prošle kroz kontroler. Bez ovoga multer
// greške (prevelika datoteka, pogrešan tip slike) izlaze kao Express 500 sa
// HTML tijelom, pa ih klijent ne može razlikovati ni prikazati korisniku.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const kod = err?.code === "LIMIT_FILE_SIZE" ? "LIMIT_FILE_SIZE" : err?.message;
  const poznat = [
    "LIMIT_FILE_SIZE",
    "INVALID_IMAGE_TYPE",
    "INVALID_DOC_TYPE",
  ].includes(kod);
  if (poznat) return res.status(400).json({ ok: false, error: kod });

  console.error("Neuhvaćena greška:", req.method, req.originalUrl, err);
  return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
});

// Idempotent column additions (za polja koja su dodana naknadno; sync({alter:false}) ih ne dodaje).
async function ensureColumns() {
  const checks = [
    {
      table: "organizations",
      column: "logoUrl",
      ddl: "ALTER TABLE organizations ADD COLUMN logoUrl VARCHAR(500) NULL",
    },
    {
      // zadnja izabrana banka za izvoz naloga u e-bankarstvo (po organizaciji)
      table: "organizations",
      column: "bankExportBank",
      ddl: "ALTER TABLE organizations ADD COLUMN bankExportBank VARCHAR(20) NULL",
    },
    {
      // mjesto teksta na naslovnoj vijesti (kaskada vodeća → izdvojeno → obično)
      table: "vijesti_clanci",
      column: "pozicija",
      ddl: "ALTER TABLE vijesti_clanci ADD COLUMN pozicija ENUM('VODECA','IZDVOJENO','OBICNO') NOT NULL DEFAULT 'OBICNO'",
    },
    {
      // Potpis ispod komentara: korisničko ime umjesto punog imena.
      // Bez UNIQUE jer je users na MySQL limitu od 64 indeksa (stari duplikati
      // od sync alter:true); zauzetost provjerava kontroler.
      table: "users",
      column: "javnoIme",
      ddl: "ALTER TABLE users ADD COLUMN javnoIme VARCHAR(40) NULL",
    },
    {
      table: "users",
      column: "koristiPunoIme",
      ddl: "ALTER TABLE users ADD COLUMN koristiPunoIme TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "users",
      column: "komentariBlokiran",
      ddl: "ALTER TABLE users ADD COLUMN komentariBlokiran TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      // slika profila uz komentare
      table: "users",
      column: "avatarUrl",
      ddl: "ALTER TABLE users ADD COLUMN avatarUrl VARCHAR(500) NULL",
    },
    {
      // koliko je puta tekst podijeljen (dugme Podijeli)
      table: "vijesti_clanci",
      column: "brojDijeljenja",
      ddl: "ALTER TABLE vijesti_clanci ADD COLUMN brojDijeljenja INT UNSIGNED NOT NULL DEFAULT 0",
    },
    {
      // odgovori na teme rasprava idu kroz isti sistem komentara
      table: "vijesti_komentari",
      column: "temaId",
      ddl: "ALTER TABLE vijesti_komentari ADD COLUMN temaId INT UNSIGNED NULL, ADD INDEX vijesti_kom_tema (temaId, status)",
    },
    {
      // naučeno pravilo pamti i partnera, ne samo kategoriju: sljedeći izvod
      // istom dobavljaču sam veže karticu partnera
      table: "bank_match_rules",
      column: "partnerId",
      ddl: "ALTER TABLE bank_match_rules ADD COLUMN partnerId INT UNSIGNED NULL",
    },
    {
      // potpisnik na ispisu kalkulacije ("Kalkulaciju uradio"); po obrtu
      table: "organizations",
      column: "kalkulacijePotpisnik",
      ddl: "ALTER TABLE organizations ADD COLUMN kalkulacijePotpisnik VARCHAR(120) NULL",
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
      table: "organizations",
      column: "pdvObveznikOd",
      // ulazak u sistem PDV-a usred godine; null = obveznik oduvijek
      ddl: "ALTER TABLE organizations ADD COLUMN pdvObveznikOd DATE NULL",
    },
    {
      table: "organizations",
      column: "pdvObveznikDo",
      // izlazak iz sistema PDV-a; null = nije izašao
      ddl: "ALTER TABLE organizations ADD COLUMN pdvObveznikDo DATE NULL",
    },
    {
      table: "organizations",
      column: "bankAccounts",
      ddl: "ALTER TABLE organizations ADD COLUMN bankAccounts JSON NULL",
    },
    {
      table: "organizations",
      column: "partnerSuggestionHides",
      // skriveni prijedlozi partnera ("nije partner"), lista {account, name}
      ddl: "ALTER TABLE organizations ADD COLUMN partnerSuggestionHides JSON NULL",
    },
    {
      table: "organizations",
      column: "kprPazarIzKp",
      // KPR prihod od pazara iz KP-1042 umjesto pologa sa izvoda
      ddl: "ALTER TABLE organizations ADD COLUMN kprPazarIzKp TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "organizations",
      column: "blagajnickiMaksimum",
      // blagajnički maksimum internom odlukom (Uredba, Sl. nov. FBiH 48/15 i 82/15)
      ddl: "ALTER TABLE organizations ADD COLUMN blagajnickiMaksimum DECIMAL(12,2) NULL",
    },
    {
      table: "popisi",
      column: "pocetnoStanje",
      // popis nastao uvozom početnog stanja lagera (poseban TKM opis)
      ddl: "ALTER TABLE popisi ADD COLUMN pocetnoStanje TINYINT(1) NOT NULL DEFAULT 0",
    },
    // ─── notifikacije: postavke po članu obrta i po korisniku ────────────────
    {
      table: "organization_members",
      column: "notifPrefs",
      ddl: "ALTER TABLE organization_members ADD COLUMN notifPrefs JSON NULL",
    },
    {
      table: "users",
      column: "notifPrefs",
      ddl: "ALTER TABLE users ADD COLUMN notifPrefs JSON NULL",
    },
    // ─── putni nalozi: vlastito vozilo + evidencija isplate ──────────────────
    {
      table: "putni_nalozi",
      column: "predjeniKm",
      ddl: "ALTER TABLE putni_nalozi ADD COLUMN predjeniKm DECIMAL(10,2) NULL",
    },
    {
      table: "putni_nalozi",
      column: "kmStopa",
      ddl: "ALTER TABLE putni_nalozi ADD COLUMN kmStopa DECIMAL(6,3) NULL",
    },
    {
      table: "putni_nalozi",
      column: "isplacenoDatum",
      ddl: "ALTER TABLE putni_nalozi ADD COLUMN isplacenoDatum DATE NULL",
    },
    {
      table: "putni_nalozi",
      column: "blagajnaNalogId",
      ddl: "ALTER TABLE putni_nalozi ADD COLUMN blagajnaNalogId INT UNSIGNED NULL",
    },
    // ─── PDV evidencije (KUF/KIF) ─────────────────────────────────────────────
    {
      table: "ulazni_racuni",
      column: "vrstaNabavke",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN vrstaNabavke VARCHAR(20) NOT NULL DEFAULT 'DOMACA'",
    },
    {
      table: "ulazni_racuni",
      column: "pdvNeodbitan",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN pdvNeodbitan TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "ulazni_racuni",
      column: "pdvNeodbitniIznos",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN pdvNeodbitniIznos DECIMAL(12,2) NOT NULL DEFAULT 0",
      // naslijeđeni sve-ili-ništa checkbox → cijeli PDV postaje neodbitni iznos
      backfill:
        "UPDATE ulazni_racuni SET pdvNeodbitniIznos = COALESCE(pdvIznos, 0) WHERE pdvNeodbitan = 1",
    },
    {
      table: "ulazni_racuni",
      column: "datumPrijema",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN datumPrijema DATE NULL",
      // KUF ide po periodu prijema; za postojeća knjiženja = datum računa
      backfill:
        "UPDATE ulazni_racuni SET datumPrijema = datumRacuna WHERE datumPrijema IS NULL",
    },
    {
      table: "ulazni_racuni",
      column: "tipDokumenta",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN tipDokumenta VARCHAR(2) NOT NULL DEFAULT '01'",
    },
    {
      table: "ulazni_racuni",
      column: "vrstaDokumenta",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN vrstaDokumenta VARCHAR(20) NOT NULL DEFAULT 'REDOVNA'",
    },
    {
      table: "ulazni_racuni",
      column: "jciBroj",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN jciBroj VARCHAR(30) NULL",
    },
    {
      table: "ulazni_racuni",
      column: "jciDatum",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN jciDatum DATE NULL",
    },
    {
      table: "ulazni_racuni",
      column: "pausalnaNaknada",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN pausalnaNaknada DECIMAL(12,2) NOT NULL DEFAULT 0",
    },
    {
      table: "ulazni_racuni",
      column: "kpEntitet",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN kpEntitet VARCHAR(10) NULL",
    },
    {
      table: "ulazni_racuni",
      column: "kpIznos",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN kpIznos DECIMAL(12,2) NOT NULL DEFAULT 0",
    },
    {
      table: "ulazni_racuni",
      column: "samoEvidencija",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN samoEvidencija TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "artikli",
      column: "tip",
      ddl: "ALTER TABLE artikli ADD COLUMN tip VARCHAR(10) NOT NULL DEFAULT 'ROBA'",
    },
    // PK Office slotovi po Office paketu + Office trial
    {
      table: "organizations",
      column: "pkOfficeEnabled",
      ddl: "ALTER TABLE organizations ADD COLUMN pkOfficeEnabled TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "organizations",
      column: "pkOfficeActivatedAt",
      ddl: "ALTER TABLE organizations ADD COLUMN pkOfficeActivatedAt DATETIME NULL",
    },
    {
      table: "organizations",
      column: "pkOfficeDisabledAt",
      ddl: "ALTER TABLE organizations ADD COLUMN pkOfficeDisabledAt DATETIME NULL",
    },
    {
      table: "users",
      column: "pkOfficeTrialEndsAt",
      ddl: "ALTER TABLE users ADD COLUMN pkOfficeTrialEndsAt DATETIME NULL",
    },
    {
      table: "users",
      column: "pkOfficeTrialPlan",
      ddl: "ALTER TABLE users ADD COLUMN pkOfficeTrialPlan VARCHAR(20) NULL",
    },
    {
      table: "users",
      column: "freelancerTrialEndsAt",
      ddl: "ALTER TABLE users ADD COLUMN freelancerTrialEndsAt DATETIME NULL",
    },
    // PK Freelancer: lični odbitak iz porezne kartice (koeficijent x 300 KM x
    // broj mjeseci), povlači se u red 18 obrasca GPD-1051
    {
      table: "users",
      column: "freelancerKoeficijent",
      ddl: "ALTER TABLE users ADD COLUMN freelancerKoeficijent DECIMAL(4,2) NULL",
    },
    {
      table: "users",
      column: "freelancerOdbitakMjeseci",
      ddl: "ALTER TABLE users ADD COLUMN freelancerOdbitakMjeseci INT NULL",
    },
    // PK Freelancer: kanton i općina prebivališta za uplatnice (predpopuna)
    {
      table: "users",
      column: "freelancerKanton",
      ddl: "ALTER TABLE users ADD COLUMN freelancerKanton VARCHAR(10) NULL",
    },
    {
      table: "users",
      column: "freelancerOpcina",
      ddl: "ALTER TABLE users ADD COLUMN freelancerOpcina VARCHAR(10) NULL",
    },
    // PK Office Solo: režim "vodim sam sebi" i moduli iz upitnika, po obrtu
    {
      table: "organizations",
      column: "soloMode",
      ddl: "ALTER TABLE organizations ADD COLUMN soloMode TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "organizations",
      column: "soloModuli",
      ddl: "ALTER TABLE organizations ADD COLUMN soloModuli JSON NULL",
    },
    // jezik fakture (bs / en / bs-en) i automatsko fakturisanje šablona
    {
      table: "invoices",
      column: "jezik",
      ddl: "ALTER TABLE invoices ADD COLUMN jezik VARCHAR(5) NOT NULL DEFAULT 'bs'",
    },
    {
      table: "prepared_invoices",
      column: "autoDan",
      ddl: "ALTER TABLE prepared_invoices ADD COLUMN autoDan TINYINT UNSIGNED NULL",
    },
    {
      table: "prepared_invoices",
      column: "autoEmail",
      ddl: "ALTER TABLE prepared_invoices ADD COLUMN autoEmail TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "prepared_invoices",
      column: "jezik",
      ddl: "ALTER TABLE prepared_invoices ADD COLUMN jezik VARCHAR(5) NOT NULL DEFAULT 'bs'",
    },
    {
      table: "invoices",
      column: "vrstaIsporuke",
      ddl: "ALTER TABLE invoices ADD COLUMN vrstaIsporuke VARCHAR(20) NOT NULL DEFAULT 'OPOREZIVA'",
    },
    {
      table: "invoices",
      column: "kifTipDokumenta",
      ddl: "ALTER TABLE invoices ADD COLUMN kifTipDokumenta VARCHAR(2) NULL",
    },
    {
      table: "invoices",
      column: "kifVrstaFakture",
      ddl: "ALTER TABLE invoices ADD COLUMN kifVrstaFakture VARCHAR(30) NULL",
    },
    {
      table: "invoices",
      column: "kifVrstaDokumenta",
      ddl: "ALTER TABLE invoices ADD COLUMN kifVrstaDokumenta VARCHAR(20) NULL",
    },
    {
      table: "invoices",
      column: "kifKpEntitet",
      ddl: "ALTER TABLE invoices ADD COLUMN kifKpEntitet VARCHAR(10) NULL",
    },
    {
      table: "invoices",
      column: "kifKpIznos",
      ddl: "ALTER TABLE invoices ADD COLUMN kifKpIznos DECIMAL(12,2) NULL",
    },
    {
      table: "invoices",
      column: "kifJciBroj",
      ddl: "ALTER TABLE invoices ADD COLUMN kifJciBroj VARCHAR(30) NULL",
    },
    {
      table: "invoices",
      column: "kifJciDatum",
      ddl: "ALTER TABLE invoices ADD COLUMN kifJciDatum DATE NULL",
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
    // ─── Avansne fakture, storno avansnih i knjižne obavijesti ───────────────
    {
      table: "invoices",
      column: "docType",
      ddl: "ALTER TABLE invoices ADD COLUMN docType VARCHAR(20) NOT NULL DEFAULT 'STANDARD'",
    },
    {
      table: "invoices",
      column: "linkedInvoiceId",
      ddl: "ALTER TABLE invoices ADD COLUMN linkedInvoiceId INT UNSIGNED NULL",
    },
    {
      table: "users",
      column: "trialUsedAt",
      ddl: "ALTER TABLE users ADD COLUMN trialUsedAt DATETIME NULL",
    },
    {
      table: "users",
      column: "wantsTrial",
      ddl: "ALTER TABLE users ADD COLUMN wantsTrial TINYINT(1) NOT NULL DEFAULT 0",
    },
    {
      table: "users",
      column: "wantsOfficeTrial",
      ddl: "ALTER TABLE users ADD COLUMN wantsOfficeTrial TINYINT(1) NOT NULL DEFAULT 0",
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
    // Ručno zatvaranje stavki na kartici partnera (veze Z1, Z2...).
    {
      table: "bank_transactions",
      column: "zatvaranjeId",
      ddl: "ALTER TABLE bank_transactions ADD COLUMN zatvaranjeId INT UNSIGNED NULL",
    },
    {
      table: "ulazni_racuni",
      column: "zatvaranjeId",
      ddl: "ALTER TABLE ulazni_racuni ADD COLUMN zatvaranjeId INT UNSIGNED NULL",
    },
    {
      table: "invoices",
      column: "zatvaranjeId",
      ddl: "ALTER TABLE invoices ADD COLUMN zatvaranjeId INT UNSIGNED NULL",
    },
    {
      table: "partner_opening_balances",
      column: "zatvaranjeKupacId",
      ddl: "ALTER TABLE partner_opening_balances ADD COLUMN zatvaranjeKupacId INT UNSIGNED NULL",
    },
    {
      table: "partner_opening_balances",
      column: "zatvaranjeDobId",
      ddl: "ALTER TABLE partner_opening_balances ADD COLUMN zatvaranjeDobId INT UNSIGNED NULL",
    },
    {
      table: "partner_zatvaranja",
      column: "datum",
      ddl: "ALTER TABLE partner_zatvaranja ADD COLUMN datum DATE NULL",
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
    // Naziv na platnom listiću po profilu: NULL = "PLATNI LISTIĆ",
    // "PLATNA_LISTA" za klijente koji traže taj naziv.
    {
      table: "users",
      column: "payslipNaziv",
      ddl: "ALTER TABLE users ADD COLUMN payslipNaziv VARCHAR(20) NULL",
    },
    // Memorandum klijenta (slika zaglavlja) za platne liste, po organizaciji.
    {
      table: "organizations",
      column: "memorandumUrl",
      ddl: "ALTER TABLE organizations ADD COLUMN memorandumUrl VARCHAR(500) NULL",
    },
    // Poseban dogovor za PK Office: individualni limit obrta koji ima
    // prednost nad limitom paketa (npr. 100 obrta po cijeni OFFICE_50).
    // NULL = važi limit paketa; upisuje ga admin u listi pretplata.
    {
      table: "users",
      column: "officeMaxObrta",
      ddl: "ALTER TABLE users ADD COLUMN officeMaxObrta INT NULL",
    },
    // Dodatni podaci matične evidencije o radniku (JSON, uređuje se u evidenciji).
    {
      table: "workers",
      column: "evidencijaPodaci",
      ddl: "ALTER TABLE workers ADD COLUMN evidencijaPodaci JSON NULL",
    },
    // Podaci za obrazac PK-1001 (izdržavani članovi za poreznu karticu).
    {
      table: "workers",
      column: "poreznaKarticaPodaci",
      ddl: "ALTER TABLE workers ADD COLUMN poreznaKarticaPodaci JSON NULL",
    },
    // Trajne obustave na platu radnika (rate kredita i sl.): lista
    // { naziv, iznos, aktivna }. Umanjuju samo "za isplatu", ne neto.
    {
      table: "workers",
      column: "obustave",
      ddl: "ALTER TABLE workers ADD COLUMN obustave JSON NULL",
    },
    // Snapshot obustava na mjesečnom obračunu: zbir + stavke za platnu listu.
    {
      table: "payrolls",
      column: "obustave",
      ddl: "ALTER TABLE payrolls ADD COLUMN obustave DECIMAL(12,2) NOT NULL DEFAULT 0",
    },
    {
      table: "payrolls",
      column: "obustaveStavke",
      ddl: "ALTER TABLE payrolls ADD COLUMN obustaveStavke JSON NULL",
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
      // jednokratna migracija podataka uz novu kolonu
      if (c.backfill) await sequelize.query(c.backfill);
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

// Idempotentno proširenje invoice_counters.type ENUM-a: serije za avansne
// fakture (A-) i knjižne obavijesti (KO-) pored postojećih INVOICE/PROFORMA.
async function ensureInvoiceCounterSeriesEnum() {
  const [tblRows] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_counters'",
  );
  if (!Number(tblRows?.[0]?.cnt || 0)) return;

  const [colRows] = await sequelize.query(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_counters' AND COLUMN_NAME = 'type'",
  );
  const colType = String(colRows?.[0]?.COLUMN_TYPE || "");
  if (colType.includes("'AVANS'") && colType.includes("'KO'")) return;

  console.log("Proširujem invoice_counters.type ENUM (AVANS, KO)...");
  await sequelize.query(
    "ALTER TABLE invoice_counters MODIFY COLUMN type ENUM('INVOICE','PROFORMA','AVANS','KO') NOT NULL DEFAULT 'INVOICE'",
  );
}

// VIEWER rola člana organizacije (read-only pristup, npr. vlasnik obrta koji
// samo gleda knjige kod knjigovođe). Aditivno širenje enum-a, bez backfilla
// (postojeće vrijednosti OWNER/ADMIN/MEMBER ostaju u novoj listi).
async function ensureMemberRoleEnum() {
  const [tblRows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organization_members'`,
  );
  if (!Number(tblRows?.[0]?.cnt || 0)) return;
  const [colRows] = await sequelize.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organization_members' AND COLUMN_NAME = 'role'`,
  );
  const colType = String(colRows?.[0]?.COLUMN_TYPE || "");
  if (!colType || colType.includes("'VIEWER'")) return;
  console.log("Proširujem organization_members.role ENUM (VIEWER)...");
  await sequelize.query(
    "ALTER TABLE organization_members MODIFY COLUMN role ENUM('OWNER','ADMIN','MEMBER','VIEWER') DEFAULT 'MEMBER'",
  );
}

// PROMOTER rola (oglašivač, banka partner). Aditivno širenje users.role
// ENUM-a: sync ne mijenja postojeću definiciju kolone.
async function ensureUserRoleEnum() {
  const [colRows] = await sequelize.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`,
  );
  const colType = String(colRows?.[0]?.COLUMN_TYPE || "");
  if (!colType || colType.includes("'PROMOTER'")) return;
  console.log("Proširujem users.role ENUM (PROMOTER)...");
  await sequelize.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('USER','PRO','BUSINESS','ADMIN','PROMOTER') DEFAULT 'USER'",
  );
}

// PK Office paketi: proširi plan ENUM na subscriptions i predracuni
// (sync ne mijenja postojeće ENUM definicije). PAŽNJA: subscriptions.plan
// je legacy LOWERCASE ('free','pro','business'), predracuni.plan UPPERCASE.
async function ensureOfficePlanEnums() {
  const targets = [
    // marker = vrijednost koja postoji SAMO u najnovijem ENUM-u (inače bi se
    // proširenje preskočilo na bazama koje već imaju office vrijednosti).
    // 1.9.2026: dodan 'freelancer' / 'FREELANCER' (PK Freelancer paket).
    // 2.9.2026: dodan 'office_1' / 'OFFICE_1' (PK Office Solo, 1 obrt).
    {
      table: "subscriptions",
      marker: "'office_1'",
      // subscriptions.plan je dodan kao nullable (ensureColumns), a postojeći
      // redovi (npr. admin upsert samo sa datumima) imaju NULL. MODIFY ... NOT
      // NULL bi na strict MySQL-u pukao na NULL vrijednostima (i srušio startup),
      // a na non-strict ih pretvorio u '' umjesto DEFAULT-a. Zato backfill prije.
      backfill:
        "UPDATE subscriptions SET plan = 'free' WHERE plan IS NULL OR plan = ''",
      ddl: "ALTER TABLE subscriptions MODIFY COLUMN plan ENUM('free','pro','business','office_1','office_2','office_10','office_25','office_50','freelancer') NOT NULL DEFAULT 'free'",
    },
    {
      table: "predracuni",
      marker: "'OFFICE_1'",
      ddl: "ALTER TABLE predracuni MODIFY COLUMN plan ENUM('PRO','BUSINESS','OFFICE_1','OFFICE_2','OFFICE_10','OFFICE_25','OFFICE_50','FREELANCER') NOT NULL",
    },
  ];
  for (const t of targets) {
    const [tblRows] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t.table}'`,
    );
    if (!Number(tblRows?.[0]?.cnt || 0)) continue;
    const [colRows] = await sequelize.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t.table}' AND COLUMN_NAME = 'plan'`,
    );
    const colType = String(colRows?.[0]?.COLUMN_TYPE || "");
    if (!colType || colType.includes(t.marker)) continue;
    console.log(`Proširujem ${t.table}.plan ENUM (OFFICE paketi)...`);
    // Očisti NULL/'' vrijednosti prije MODIFY ... NOT NULL da migracija ne pukne.
    if (t.backfill) await sequelize.query(t.backfill);
    await sequelize.query(t.ddl);
  }
}

// POPRAVKA (25.07.2026.): plaćene pretplate su godinama upisivane sa
// plan = 'free'. Admin panel šalje plan "PRO"/"BUSINESS" velikim slovima, a
// kolona je ENUM sa malim slovima, pa je MySQL upisivao praznu vrijednost koju
// je ensureOfficePlanEnums poslije prevodio u 'free'. Kad se pretplata kreira
// samo datumima (bez plana), takođe ostaje default 'free'. Zbog toga se prava
// pretplata nije razlikovala od "besplatnog" reda.
//
// Ovdje se samo poravnava plan sa rolom. isActive se NE dira: šta je aktivno
// odlučuje admin, a mašinsko paljenje/gašenje pretplata je već jednom napravilo
// štetu. Forever redovi (endDate +100 godina) se preskaču jer nisu pretplata.
async function ensureSubPlanFromRole() {
  const [tblRows] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions'",
  );
  if (!Number(tblRows?.[0]?.cnt || 0)) return;
  const [res] = await sequelize.query(
    `UPDATE subscriptions s
        JOIN users u ON u.id = s.userId
        SET s.plan = CASE u.role WHEN 'BUSINESS' THEN 'business' ELSE 'pro' END
      WHERE (s.plan = 'free' OR s.plan = '')
        AND u.role IN ('PRO', 'BUSINESS')
        AND s.isActive = 1
        AND s.endDate < DATE_ADD(CURDATE(), INTERVAL 50 YEAR)`,
  );
  const changed = res?.affectedRows ?? 0;
  if (changed > 0) {
    console.log(`Plan pretplate poravnat sa rolom: ${changed}`);
  }
}

// Indeks na temaId. U ensureColumns ide zajedno sa kolonom, ali samo na bazi
// gdje tabela već postoji; na svježoj bazi kolonu napravi sync, provjera
// kolone prođe i indeks nikad ne nastane. Zato i ovdje, gdje se gleda indeks.
async function ensureKomentarTemaIndex() {
  const [t] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vijesti_komentari'",
  );
  if (!Number(t?.[0]?.cnt || 0)) return;
  const [i] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vijesti_komentari' AND INDEX_NAME = 'vijesti_kom_tema'",
  );
  if (Number(i?.[0]?.cnt || 0)) return;
  try {
    console.log("vijesti_komentari: pravim indeks vijesti_kom_tema...");
    await sequelize.query(
      "CREATE INDEX `vijesti_kom_tema` ON `vijesti_komentari` (`temaId`, `status`)",
    );
  } catch (e) {
    console.warn(`Indeks vijesti_kom_tema nije kreiran: ${e.message}`);
  }
}

// Komentar sada pripada ili članku ili temi rasprave, pa clanakId mora
// dozvoliti NULL (kreiran je kao NOT NULL dok su postojali samo članci).
async function ensureKomentarClanakNullable() {
  const [t] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vijesti_komentari'",
  );
  if (!Number(t?.[0]?.cnt || 0)) return;
  const [c] = await sequelize.query(
    "SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vijesti_komentari' AND COLUMN_NAME = 'clanakId'",
  );
  if (c?.[0]?.IS_NULLABLE === "NO") {
    console.log("vijesti_komentari.clanakId postaje NULL-abilan (rasprave)...");
    await sequelize.query(
      "ALTER TABLE vijesti_komentari MODIFY COLUMN clanakId INT UNSIGNED NULL",
    );
  }
}

// Pretraga vijesti i vodiča. Bez ovog indeksa je LIKE '%pojam%' po LONGTEXT
// koloni pun scan tabele na svaku pretragu. FULLTEXT ne ide kroz model jer
// Sequelize sync ne pravi fulltext indekse.
async function ensureVijestiFulltext() {
  const [t] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vijesti_clanci'",
  );
  if (!Number(t?.[0]?.cnt || 0)) return;
  const [i] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vijesti_clanci' AND INDEX_NAME = 'vijesti_clanci_pretraga'",
  );
  if (Number(i?.[0]?.cnt || 0)) return;
  try {
    console.log("vijesti_clanci: pravim FULLTEXT indeks za pretragu...");
    await sequelize.query(
      "CREATE FULLTEXT INDEX `vijesti_clanci_pretraga` ON `vijesti_clanci` (`naslov`, `sazetak`, `sadrzajTekst`)",
    );
  } catch (e) {
    // pretraga radi i bez indeksa (pada na LIKE), pa ovo ne smije rušiti start
    console.warn(`FULLTEXT indeks nije kreiran: ${e.message}`);
  }
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

// Idempotentno proširenje forms.type ENUM-a: ČOK (članarina obrtničkoj
// komori) i ONŠ (naknade za šume) na /app/obrasci.
async function ensureFormTypeEnum() {
  const [tblRows] = await sequelize.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forms'",
  );
  if (!Number(tblRows?.[0]?.cnt || 0)) return;

  const [colRows] = await sequelize.query(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'forms' AND COLUMN_NAME = 'type'",
  );
  const colType = String(colRows?.[0]?.COLUMN_TYPE || "");
  if (["COK", "ONS"].every((v) => colType.includes(`'${v}'`))) return;

  console.log("Proširujem forms.type ENUM (COK, ONS)...");
  await sequelize.query(
    "ALTER TABLE forms MODIFY COLUMN type ENUM('GPD','SPR','ZO3','UGOVOR','UOD','PLDI','AMS','SIH','JS3100','COK','ONS') NOT NULL",
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

// Backfill: obrti kreirani na marketing dijelu unesu samo PDV broj (pdvNumber)
// ali ne i isPdvObveznik flag (marketing forma nema toggle), pa ih PK Office
// nije prepoznavao kao PDV obveznike (default flag = false). Jednom označi sve
// org-e s upisanim PDV brojem kao obveznike. Datumi pdvObveznikOd/Do se ne
// diraju (ostaju null → obveznik za cijelu godinu). Idempotentno: brza kapija
// preskoči kad više nema takvih redova.
async function ensurePdvObveznikFromPdvNumber() {
  const [pending] = await sequelize.query(
    `SELECT 1 FROM organizations
     WHERE isPdvObveznik = 0 AND pdvNumber IS NOT NULL AND pdvNumber != ''
     LIMIT 1`,
  );
  if (!pending || pending.length === 0) return;

  const [res] = await sequelize.query(
    `UPDATE organizations SET isPdvObveznik = 1
     WHERE isPdvObveznik = 0 AND pdvNumber IS NOT NULL AND pdvNumber != ''`,
  );
  const n = res?.affectedRows ?? 0;
  if (n > 0) {
    console.log(`Označeno ${n} obrta kao PDV obveznike (iz upisanog PDV broja).`);
  }
}

// Backfill: računi sa VEĆ učitanih izvoda u organizations.bankAccounts.
// Auto-upis novog računa u profil radi tek od uvođenja liste računa; ovo
// jednom pokupi račune sa ranijih izvoda. Idempotentno: kad je lista već
// popunjena i nema novih računa, ništa se ne piše.
// Backfill istorije PK Office aktivnosti u dnevnik (ActivityLog): backend
// bilježenje OFFICE_* akcija je uvedeno naknadno, pa se postojeći izvodi,
// ulazni računi i kalkulacije jednom upišu retroaktivno (sa ORIGINALNIM
// createdAt), da admin Aktivnost pokaže i prošlo korištenje. Jednokratno:
// marker red OFFICE_BACKFILL (sakriven) sprječava ponavljanje.
async function ensureOfficeActivityBackfill() {
  const [marker] = await sequelize.query(
    "SELECT 1 FROM activity_logs WHERE action = 'OFFICE_BACKFILL' LIMIT 1",
  );
  if (marker && marker.length > 0) return;

  const now = new Date();
  const rows = [];

  // učitani i ručni izvodi (interni "izvodi" se preskaču: prebijanja,
  // amortizacija, početno stanje)
  const [statements] = await sequelize.query(
    `SELECT id, organizationId, uploadedById, bankId, bankName,
            statementNumber, createdAt
     FROM bank_statements
     WHERE bankId NOT IN ('kompenzacija','cesija','amortizacija','pocetno')`,
  );
  for (const s of statements) {
    rows.push({
      userId: s.uploadedById ?? null,
      action: s.bankId === "manual" ? "OFFICE_IZVOD_RUCNI" : "OFFICE_IZVOD_UCITAN",
      label:
        [s.bankName, s.statementNumber && `br. ${s.statementNumber}`]
          .filter(Boolean)
          .join(" ") || null,
      organizationId: s.organizationId,
      createdAt: s.createdAt,
      updatedAt: s.createdAt,
    });
  }

  // ulazni računi (bez onih koje su napravile kalkulacije, one imaju svoj red)
  const [racuni] = await sequelize.query(
    `SELECT r.id, r.organizationId, r.brojRacuna, r.createdAt, p.name AS partnerName
     FROM ulazni_racuni r
     LEFT JOIN partners p ON p.id = r.partnerId
     WHERE NOT EXISTS (
       SELECT 1 FROM kalkulacije k WHERE k.ulazniRacunId = r.id
     )`,
  );
  for (const r of racuni) {
    rows.push({
      userId: null,
      action: "OFFICE_ULAZNI_RACUN",
      label: [r.partnerName, r.brojRacuna].filter(Boolean).join(" · ") || null,
      organizationId: r.organizationId,
      createdAt: r.createdAt,
      updatedAt: r.createdAt,
    });
  }

  const [kalkulacije] = await sequelize.query(
    "SELECT id, organizationId, broj, godina, createdAt FROM kalkulacije",
  );
  for (const k of kalkulacije) {
    rows.push({
      userId: null,
      action: "OFFICE_KALKULACIJA",
      label: `KLC ${k.broj}/${String(k.godina).slice(-2)}`,
      organizationId: k.organizationId,
      createdAt: k.createdAt,
      updatedAt: k.createdAt,
    });
  }

  // zapisi + marker u JEDNOJ transakciji: ako padne, ništa se ne upiše pa
  // se sljedeći start čisto ponovi (bez markera nema djelimičnog dupliranja)
  await sequelize.transaction(async (t) => {
    if (rows.length > 0) {
      await ActivityLog.bulkCreate(rows, { transaction: t });
    }
    // marker: sakriven red da se backfill ne ponavlja (hiddenAt ga skriva
    // iz admin liste, OFFICE_ prefiks iz javne brojke)
    await ActivityLog.create(
      {
        userId: null,
        action: "OFFICE_BACKFILL",
        label: `backfill istorije PK Office (${rows.length} zapisa)`,
        organizationId: null,
        hiddenAt: now,
      },
      { transaction: t },
    );
  });
  console.log(`PK Office aktivnost: backfill ${rows.length} istorijskih zapisa.`);
}

// Backfill v2: istorija za akcije dodane poslije prvog backfilla (blagajna,
// putni nalozi, popisi, prebijanja). Vlastiti marker jer je v1 već izvršen.
async function ensureOfficeActivityBackfillV2() {
  const [marker] = await sequelize.query(
    "SELECT 1 FROM activity_logs WHERE action = 'OFFICE_BACKFILL_V2' LIMIT 1",
  );
  if (marker && marker.length > 0) return;

  const rows = [];

  const [blagajna] = await sequelize.query(
    "SELECT organizationId, tip, broj, godina, createdAt FROM blagajna_nalozi",
  );
  for (const n of blagajna) {
    rows.push({
      userId: null,
      action: "OFFICE_BLAGAJNA_NALOG",
      label: `${n.tip === "NAPLATA" ? "Naplata" : "Isplata"} br. ${n.broj}/${n.godina}`,
      organizationId: n.organizationId,
      createdAt: n.createdAt,
      updatedAt: n.createdAt,
    });
  }

  const [putni] = await sequelize.query(
    "SELECT organizationId, broj, godina, createdAt FROM putni_nalozi",
  );
  for (const n of putni) {
    rows.push({
      userId: null,
      action: "OFFICE_PUTNI_NALOG",
      label: `Putni nalog br. ${n.broj}/${n.godina}`,
      organizationId: n.organizationId,
      createdAt: n.createdAt,
      updatedAt: n.createdAt,
    });
  }

  const [popisi] = await sequelize.query(
    "SELECT organizationId, broj, godina, createdAt FROM popisi WHERE status = 'PROKNJIZEN'",
  );
  for (const p of popisi) {
    rows.push({
      userId: null,
      action: "OFFICE_POPIS",
      label: `Popis ${p.broj}/${p.godina}`,
      organizationId: p.organizationId,
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    });
  }

  const [prebijanja] = await sequelize.query(
    "SELECT organizationId, type, broj, createdAt FROM prebijanja",
  );
  for (const p of prebijanja) {
    rows.push({
      userId: null,
      action: "OFFICE_PREBIJANJE",
      label: `${p.type === "CESIJA" ? "Cesija" : "Kompenzacija"} ${p.broj}`,
      organizationId: p.organizationId,
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    });
  }

  // zapisi + marker u jednoj transakciji (vidi v1: sprječava djelimično
  // dupliranje ako padne između bulkCreate i markera)
  await sequelize.transaction(async (t) => {
    if (rows.length > 0) {
      await ActivityLog.bulkCreate(rows, { transaction: t });
    }
    await ActivityLog.create(
      {
        userId: null,
        action: "OFFICE_BACKFILL_V2",
        label: `backfill istorije PK Office v2 (${rows.length} zapisa)`,
        organizationId: null,
        hiddenAt: new Date(),
      },
      { transaction: t },
    );
  });
  console.log(`PK Office aktivnost: backfill v2, ${rows.length} zapisa.`);
}

async function ensureOrgBankAccountsBackfill() {
  // Brza kapija: ima li uopšte org-e koje treba backfill-ati (bankAccounts
  // prazan, a postoji izvod sa računom)? Nakon prvog prolaza ovo je prazno pa
  // preskačemo skupi DISTINCT scan i update petlju na svakom startu.
  const [pending] = await sequelize.query(
    `SELECT 1 FROM organizations o
     WHERE o.bankAccounts IS NULL
       AND EXISTS (
         SELECT 1 FROM bank_statements s
         WHERE s.organizationId = o.id AND s.account IS NOT NULL AND s.account != ''
       )
     LIMIT 1`,
  );
  if (!pending || pending.length === 0) return;

  const [rows] = await sequelize.query(
    "SELECT DISTINCT organizationId, account FROM bank_statements WHERE account IS NOT NULL AND account != ''",
  );
  const byOrg = new Map();
  for (const r of rows) {
    const digits = String(r.account || "").replace(/\D+/g, "");
    if (digits.length < 8) continue;
    if (!byOrg.has(r.organizationId)) byOrg.set(r.organizationId, []);
    const arr = byOrg.get(r.organizationId);
    if (!arr.includes(digits)) arr.push(digits);
  }
  if (byOrg.size === 0) return;

  const orgs = await Organization.findAll({
    where: { id: [...byOrg.keys()] },
    attributes: ["id", "bankAccount", "bankAccounts"],
  });
  let updated = 0;
  for (const org of orgs) {
    let list = org.bankAccounts;
    if (typeof list === "string") {
      try {
        list = JSON.parse(list);
      } catch {
        list = null;
      }
    }
    if (!Array.isArray(list)) list = [];
    const existing = list
      .map((a) => String(a || "").replace(/\D+/g, ""))
      .filter(Boolean);
    const mainDigits = String(org.bankAccount || "").replace(/\D+/g, "");
    // glavni iz profila je uvijek prvi u listi
    const next = existing.length === 0 && mainDigits ? [mainDigits] : [...existing];
    for (const acc of byOrg.get(org.id) || []) {
      if (!next.includes(acc)) next.push(acc);
    }
    if (next.length === 0 || next.length === existing.length) continue;
    await org.update({
      bankAccounts: next,
      bankAccount:
        org.bankAccount || (next[0] ? formatAccountDashed(next[0]) : null),
    });
    updated += 1;
  }
  if (updated) {
    console.log(
      `Backfill žiro računa sa izvoda u profil za ${updated} organizacija.`,
    );
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
    // In-app obavijesti: title/body nose nazive obrta i tekst na bosanskom
    // ("...još nije preuzet"), pa latin1 tabela obara INSERT u dnevnom jobu.
    "user_notifications",
    // Inbox: admin obavijesti (title/body) i live chat podrške (subject/body) —
    // sve slobodan tekst koji korisnik i admin kucaju na bosanskom.
    "announcements",
    "support_tickets",
    "support_messages",
  ];
  for (const t of tables) {
    // Neuspjela konverzija jedne tabele NE smije oboriti start backenda: ova
    // funkcija je u .then() lancu čiji .catch() radi process.exit(1).
    try {
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
    } catch (e) {
      console.warn(`Konverzija ${t} -> utf8mb4 nije uspjela: ${e.message}`);
    }
  }
}

// Idempotentno dodavanje unique indeksa na POSTOJEĆE tabele (sync({alter:false})
// ne dira postojeće tabele). Ako već postoji ili ako postoje duplikati u
// testnim podacima, samo upozori, ne ruši start.
async function ensureUniqueIndex(table, indexName, columns) {
  const [tblRows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}'`,
  );
  if (!Number(tblRows?.[0]?.cnt || 0)) return; // tabelu će sync tek napraviti (sa indeksom)

  const [idxRows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND INDEX_NAME = '${indexName}'`,
  );
  if (Number(idxRows?.[0]?.cnt || 0)) return; // već postoji

  const cols = columns.map((c) => `\`${c}\``).join(", ");
  try {
    await sequelize.query(
      `CREATE UNIQUE INDEX \`${indexName}\` ON \`${table}\` (${cols})`,
    );
  } catch (e) {
    console.warn(
      `Unique index ${indexName} nije kreiran (vjerovatno postoje duplikati u testnim podacima): ${e.message}`,
    );
  }
}

// Sync database tables and start server
sequelize
  .authenticate()
  .then(() => ensureInvoiceCounterTypeColumn())
  .then(() => sequelize.sync({ alter: false }))
  .then(() => ensureColumns())
  .then(() => ensureOrgBankAccountsBackfill())
  .then(() => ensureOfficeActivityBackfill())
  .then(() => ensureOfficeActivityBackfillV2())
  .then(() => ensureInvoiceCounterSeriesEnum())
  .then(() => ensureOfficePlanEnums())
  .then(() => ensureKomentarClanakNullable())
  .then(() => ensureKomentarTemaIndex())
  .then(() => ensureVijestiFulltext())
  .then(() => ensureSubPlanFromRole())
  .then(() => ensureMemberRoleEnum())
  .then(() => ensureUserRoleEnum())
  .then(() => ensurePayrollDocTypeEnum())
  .then(() => ensureWorkerDocTypeEnum())
  .then(() => ensureFormTypeEnum())
  .then(() => ensureActivityNamesFresh())
  .then(() => ensurePdvObveznikFromPdvNumber())
  .then(() => ensureOwnerSpolFromJmbg())
  .then(() => ensureUtf8Mb4())
  .then(() =>
    ensureUniqueIndex("prebijanja", "prebijanja_org_broj", [
      "organizationId",
      "broj",
    ]),
  )
  .then(() =>
    ensureUniqueIndex("bank_statements", "bank_statements_org_num_date_acc", [
      "organizationId",
      "statementNumber",
      "statementDate",
      "account",
    ]),
  )
  .then(() =>
    ensureUniqueIndex("artikli", "artikli_org_sifra", [
      "organizationId",
      "sifra",
    ]),
  )
  .then(() =>
    ensureUniqueIndex("kalkulacije", "kalkulacije_org_god_broj", [
      "organizationId",
      "godina",
      "broj",
    ]),
  )
  .then(() =>
    ensureUniqueIndex("popisi", "popisi_org_god_broj", [
      "organizationId",
      "godina",
      "broj",
    ]),
  )
  .then(() =>
    ensureUniqueIndex("nivelacije", "nivelacije_org_god_broj", [
      "organizationId",
      "godina",
      "broj",
    ]),
  )
  .then(() =>
    ensureUniqueIndex("razduzenja", "razduzenja_org_tip_god_broj", [
      "organizationId",
      "tip",
      "godina",
      "broj",
    ]),
  )
  .then(() =>
    ensureUniqueIndex("tkm_pocetna_stanja", "tkm_pocetno_org_godina", [
      "organizationId",
      "godina",
    ]),
  )
  .then(() =>
    ensureUniqueIndex("blagajna_nalozi", "blagajna_org_tip_god_broj", [
      "organizationId",
      "tip",
      "godina",
      "broj",
    ]),
  )
  .then(() =>
    ensureUniqueIndex("putni_nalozi", "putni_org_god_broj", [
      "organizationId",
      "godina",
      "broj",
    ]),
  )
  // Uplatni računi javnih prihoda: seed nedostajućih slotova + učitavanje u keš.
  .then(() => require("./services/racuniService").init())
  .then(() => {
    console.log("Database synced successfully");
    // http.Server je potreban da bi Socket.IO (live chat podrška) mogao dijeliti
    // isti port sa Express aplikacijom.
    const server = http.createServer(app);
    initSocket(server);
    // dnevne notifikacije (rokovi, plate, digest...): jednom dnevno u 08h
    startNotificationScheduler();
    server.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
    process.exit(1);
  });
