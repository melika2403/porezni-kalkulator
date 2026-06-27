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
    // UTM atribucija — odakle korisnik dolazi (capture pri registraciji).
    utmSource: { type: DataTypes.STRING(80), allowNull: true },
    utmCampaign: { type: DataTypes.STRING(120), allowNull: true },
    // Izmjene konta za nalog za knjiženje (agencijska konvencija). Čuva se SAMO
    // ono što korisnik prepravi u odnosu na default; vrijedi za sve njegove
    // organizacije. Oblik: { <stavka>: { d: "XXX-XXXX", p: "XXX-XXXX" }, ... }.
    postingAccounts: { type: DataTypes.JSON, allowNull: true },
    // Agencijska opcija: kantonalne stavke (zdravstvo, nezaposlenost, porez na
    // dohodak) objediniti u jedan nalog po KANTONU (šifra opštine = sjedište
    // poslodavca), umjesto po opštini radnika. Vrijedi za sve org-e korisnika.
    combineKantonalUplatnice: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
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
    // Plan i ciklus naplate pretplate (za evidenciju i ispravnu rolu).
    plan: { type: DataTypes.ENUM("PRO", "BUSINESS"), allowNull: true },
    billingCycle: { type: DataTypes.ENUM("monthly", "yearly"), allowNull: true },
    // Kad je zadnji put poslan podsjetnik za obnovu (admin akcija).
    reminderSentAt: { type: DataTypes.DATE, allowNull: true },
    // Probni period (trial). Self-service trial ga postavlja automatski; admin
    // ga može ručno označiti (npr. kad ručno da Business na mjesec za probu).
    isTrial: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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
    isPdvObveznik: { type: DataTypes.BOOLEAN, defaultValue: false },
    jurisdiction: {
      type: DataTypes.ENUM("FBIH", "RS", "BD"),
      allowNull: true,
    },
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
    // Default tip plate za nove radnike u ovoj org-i:
    //   BRUTO          — salaryBruto fiksan, neto raste sa stažom (zakonski "čisti" model)
    //   NETO_UGOVOR    — salaryNeto = bazni neto iz ugovora, stvarni neto raste sa stažom
    //   NETO_ISPLATA   — salaryNeto = ciljani take-home, osnovica se prilagođava (90% klijenata na minimalcu)
    // Default 'NETO_ISPLATA' jer back-compat sa postojećim ponašanjem.
    defaultSalaryType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "NETO_ISPLATA",
    },
    // Dnevna stopa toplog obroka za firmu (npr. 16 KM/dan). Obračun je množi
    // sa brojem radnih dana iz šihterice i popuni topli obrok. Pojedini radnik
    // može imati svoju stopu (Worker.mealAllowancePerDay). NULL = bez auto-stope.
    mealAllowancePerDay: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    // ── Model vlasništva / direktora (relevantno za d.o.o./COMPANY) ──────────
    // Razdvaja VLASNIŠTVO od ZAPOSLENJA. Za obrt (BUSINESS) se ignoriše:
    // vlasnik je uvijek obrtnik (Worker VLASNIK, Obrazac 2002).
    // 4 opcije sa forme se mapiraju ovako:
    //   1) vlasnik = prijavljen direktor → ownerIsDirector=true, ugovor_o_radu
    //      (jedina opcija u kojoj vlasnik ima Worker VLASNIK i ide u payroll)
    //   2) vlasnik samo evidencija (firma/više lica) → ownerIsDirector=false,
    //      directorWorkerId = izabrani radnik
    //   3) vlasnik direktor po menadžerskom ugovoru, NIJE prijavljen →
    //      ownerIsDirector=true, menadzerski (bez plate/doprinosa)
    //   4) vlasnik strano lice, NIJE prijavljen → ownerIsDirector=false,
    //      directorWorkerId = izabrani radnik
    ownerType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "fizicko_domace", // fizicko_domace|fizicko_strano|pravno_lice|vise_lica
    },
    ownerIsDirector: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    directorEngagement: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ugovor_o_radu", // ugovor_o_radu|menadzerski
    },
    // Radnik koji je direktor/potpisnik kad vlasnik nije (opcije 2 i 4).
    // NULL kad je vlasnik direktor (opcije 1 i 3).
    directorWorkerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // Evidencija vlasnika kad NIJE radnik (opcije 2/3/4). Za opciju 1 i za
    // obrt je vlasnik Worker VLASNIK pa je ovo NULL. Oblik:
    //   { firstName, lastName, name, jmbg(enc), idDoc, jib, email, phone,
    //     address, city, persons: [{firstName,lastName,jmbg(enc)/idDoc}] }
    ownerInfo: { type: DataTypes.JSON, allowNull: true },
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
    // Tip plate — određuje semantiku salaryBruto/salaryNeto polja:
    //   BRUTO        — salaryBruto je osnovica iz ugovora, neto raste sa stažom
    //   NETO_UGOVOR  — salaryNeto je bazni ugovorni neto (bez minulog rada),
    //                  stvarni neto raste sa stažom
    //   NETO_ISPLATA — salaryNeto je ciljni take-home (sa minulim radom),
    //                  osnovica se prilagođava da matematika izađe
    // Default 'NETO_ISPLATA' jer pokriva 90% slučajeva (radnici na minimalcu).
    salaryType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "NETO_ISPLATA",
    },
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
    // JS3100 "Treći dio" stabilna polja — pamte se da bi se prefill-ala i
    // prijava i odjava (osnov osiguranja i zanimanje se ne mijenjaju između).
    osnovOsiguranjaOpis: { type: DataTypes.STRING(120), allowNull: true },
    osnovOsiguranjaSifra: { type: DataTypes.STRING(20), allowNull: true },
    zanimanjeOpis: { type: DataTypes.STRING(120), allowNull: true },
    zanimanjeSifra: { type: DataTypes.STRING(20), allowNull: true },
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
    // Dnevna stopa toplog obroka za ovog radnika (override organizacijske
    // stope). NULL = koristi se Organization.mealAllowancePerDay. Obračun
    // množi stopu sa brojem radnih dana iz šihterice.
    mealAllowancePerDay: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    // Ugovoreno radno vrijeme (dnevno) — bitno za minimalnu osnovicu doprinosa.
    // Po Zakonu o doprinosima FBiH (čl. 7, izmjene 33/25 od 01.07.2025):
    //  • 8h (puno) → puna min. bruto osnovica
    //  • 5–7h (nepuno > 4h) → puna min. bruto osnovica (NE smanjuje se srazmjerno)
    //  • 1–4h (nepuno ≤ 4h) → srazmjerno, ali ne manje od 50% pune min. osnovice
    contractedHours: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 8 },
    // Entitet prebivališta radnika. 'FBIH' (default) ili 'RS'. Za RS radnika
    // kantonalni dio zdravstva (89,8%) i nezaposlenosti (70%) ide na Budžet RS
    // umjesto na kanton, i generiše se Obrazac 2001-A umjesto 2001.
    prebivalisteEntitet: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "FBIH",
    },
    // Šifra opštine prebivališta (za RS radnika, iz šifarnika opština RS). Ulazi
    // u poziv na broj RS uplatnica. Za FBiH radnika se opcina izvodi iz city.
    opcinaKod: { type: DataTypes.STRING(10), allowNull: true },
    // Dodatni podaci za matičnu evidenciju o radniku (Pravilnik Sl. nov. FBiH
    // 92/16, čl. 3) koji se NE unose kroz edit radnika nego u samom pregledu
    // evidencije: mjesto/država rođenja, državljanstvo, dozvola za rad, stručni
    // ispit, datum ugovora, pripravnički/beneficirani staž, radna sposobnost,
    // razdoblja mirovanja, razlog prestanka, mjesto rada, sedmično radno vrijeme.
    evidencijaPodaci: { type: DataTypes.JSON, allowNull: true },
    // ── Korist u naravi: korištenje službenog vozila u privatne svrhe ──
    // Vezano za konkretno vozilo i osobu iz Odluke poslodavca. Većina radnika
    // nema. Povećava osnovicu za doprinose i porez (ne i neto), čl. 10 Zakona o
    // porezu na dohodak + čl. 17/22 Pravilnika.
    koristVoziloAktivna: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // 'nabavna_1posto' | 'lizing_20posto' | 'stvarni_km'
    koristVoziloMetoda: { type: DataTypes.STRING(20), allowNull: true },
    // Ulazna vrijednost (značenje zavisi od metode: nabavna vrijednost / rata / km).
    koristVoziloVrijednost: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    // Da li je ulazna vrijednost već sa PDV-om (metode 1 i 2 traže sa PDV-om).
    koristVoziloSaPdv: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // Opis vozila (model + tablice) za Odluku i evidenciju.
    koristVoziloOpis: { type: DataTypes.STRING(255), allowNull: true },
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
    // Pro-rate faktor za mid-month prijavu/odjavu (0..1). Pamti korisnikov izbor
    // razmjernog obračuna za taj mjesec (1 = pun obračun, isključen razmjer).
    proRateFactor: { type: DataTypes.DECIMAL(5, 4), allowNull: true },
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

    // ── Korist u naravi (službeno vozilo) — snapshot za ovaj mjesec ──
    // koristNetValue = vrijednost koristi V (neto sa sadržanim porezom, npr. 1%
    // nabavne). koristBruto = V grossovan koeficijentom (osnovica za doprinose).
    // gross uključuje koristBruto; emp*/erp*/incomeTax su zbir plate i koristi;
    // net (keš radniku) je SAMO iz plate. Default 0 = nema koristi (svi stari redovi).
    koristNetValue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    koristBruto: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

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

    // Uvezeni obračun: plata iz ranijeg programa, unesena ručno samo da bi GIP
    // bio kompletan (klijent prešao na nas u toku godine). Ne nudi se za
    // ponovno generisanje 2001/MIP/uplatnica. Pravi obračun (calculate) ga
    // resetuje na false i preuzima mjesec.
    imported: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    // Datum stvarne isplate plate. Postavlja ga user u "Mjesečni dokumenti"
    // tabu; svi payroll-i u istom (org, year, month) drže isti datum (sinhroni
    // batch update kad user mijenja u UI). Ulazi u MIP-1023 XML i platne liste.
    paymentDate: { type: DataTypes.DATEONLY, allowNull: true },

    // Kad je MIP-1023 XML za (org, year, month) zadnji put preuzet. Batch
    // update na sve payroll-e mjeseca, isti pattern kao paymentDate. XML se
    // generiše client-side pa frontend javlja preuzimanje posebnim pozivom.
    mipDownloadedAt: { type: DataTypes.DATE, allowNull: true },

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
      // UGOVOR=ugovor o radu, OTKAZ=odluka o prestanku, JS3100_PRIJAVA, JS3100_ODJAVA,
      // RJESENJE_GO=godišnji odmor (puni), RJESENJE_GO_SRAZMJERNI=srazmjerni dio,
      // ODLUKA_REGRES, ODLUKA_PRIGODNA_NAGRADA=poklon povodom praznika,
      // RJESENJE_PLACENO_ODSUSTVO, RJESENJE_NEPLACENO_ODSUSTVO
      type: DataTypes.ENUM(
        "UGOVOR",
        "OTKAZ",
        "JS3100_PRIJAVA",
        "JS3100_ODJAVA",
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
      ),
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
        "UOD", // ugovor o djelu (Faza 3)
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
    // ciklus naplate i period pretplate koji predračun pokriva
    billingCycle: {
      type: DataTypes.ENUM("monthly", "yearly"),
      allowNull: false,
      defaultValue: "yearly",
    },
    periodStart: { type: DataTypes.DATEONLY, allowNull: true },
    periodEnd: { type: DataTypes.DATEONLY, allowNull: true },
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

// ─── USER PREFERENCE (PK Office: aktivna org + UI postavke) ──────────────────
const UserPreference = sequelize.define(
  "UserPreference",
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
    activeOrganizationId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    theme: {
      type: DataTypes.ENUM("light", "dark", "system"),
      defaultValue: "system",
    },
    commandPaletteEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: "user_preferences", timestamps: true },
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

// ─── CLIENT PAYMENT ───────────────────────────────────────────────────────────
// Mjesečna uplata klijenta (registrovanog korisnika) — admin finansije.
// Jedan red po (userId, year, month). Ako je isAnnual=true, taj jedan unos
// pokriva cijelu godinu (klijent se za ostale mjesece te godine vodi kao plaćen).
const ClientPayment = sequelize.define(
  "ClientPayment",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: false }, // 1–12
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // KM
    isAnnual: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    note: { type: DataTypes.STRING(255), allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "client_payments",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      { unique: true, fields: ["userId", "year", "month"] },
      { fields: ["year"] },
    ],
  },
);

// ─── COMPANY EXPENSE ──────────────────────────────────────────────────────────
// Trošak/ulaganje firme (npr. oglasi) — admin finansije. Sve u KM.
const CompanyExpense = sequelize.define(
  "CompanyExpense",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // KM
    description: { type: DataTypes.STRING(255), allowNull: false },
    // Kategorija troška. MARKETING se koristi za CAC obračun.
    category: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "OSTALO" },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "company_expenses",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [{ fields: ["date"] }],
  },
);

// Ostali prihodi (gotovina i sl.) — prihod koji NIJE vezan za korisnika/pretplatu.
// Ulazi u ukupan prihod i profit, evidentira se odvojeno od ClientPayment.
const OtherIncome = sequelize.define(
  "OtherIncome",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // KM
    description: { type: DataTypes.STRING(255), allowNull: false },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "other_incomes",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [{ fields: ["date"] }],
  },
);

// Dnevnik aktivnosti — bilježi generisanje dokumenata. userId=null = neregistrovan.
// action = mašinski kod (npr. "AMS_GENERATE"); label = čitljiv naziv za prikaz.
const ActivityLog = sequelize.define(
  "ActivityLog",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    action: { type: DataTypes.STRING(60), allowNull: false },
    label: { type: DataTypes.STRING(160), allowNull: true },
    // Za koju organizaciju je akcija (in-app alati: plate, šihterica, JS3100,
    // ugovori). Javni alati (AMS/SPR/GPD…) nemaju org → NULL.
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // Admin može skloniti stavku iz pregleda (npr. test šum) bez brisanja
    // zapisa. NULL = vidljivo; datum = sakriveno (reverzibilno).
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "activity_logs",
    timestamps: true,
    updatedAt: false,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [{ fields: ["action"] }, { fields: ["userId"] }, { fields: ["createdAt"] }],
  },
);

// ─── BANK STATEMENTS (PK Office: bankovni izvodi) ────────────────────────────
// Jedan upload PDF izvoda = jedan BankStatement + N BankTransaction redova.
// Izvod se snima tek kad parsiranje prođe validaciju salda.
const BankStatement = sequelize.define(
  "BankStatement",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    uploadedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // id parser modula (unicredit, raiffeisen, kib, sparkasse, asseco)
    bankId: { type: DataTypes.STRING(30), allowNull: false },
    bankName: { type: DataTypes.STRING(100), allowNull: true },
    account: { type: DataTypes.STRING(34), allowNull: true },
    statementNumber: { type: DataTypes.STRING(20), allowNull: true },
    statementDate: { type: DataTypes.DATEONLY, allowNull: true },
    currency: { type: DataTypes.STRING(3), allowNull: true },
    openingBalance: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    closingBalance: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    fileName: { type: DataTypes.STRING(255), allowNull: true },
    // upozorenja iz parsera (npr. "datum transakcije = datum izvoda")
    warnings: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "bank_statements",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [{ fields: ["organizationId", "statementDate"] }],
  },
);

const BankTransaction = sequelize.define(
  "BankTransaction",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    statementId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    reference: { type: DataTypes.STRING(100), allowNull: true },
    counterpartyName: { type: DataTypes.STRING(255), allowNull: true },
    counterpartyAccount: { type: DataTypes.STRING(34), allowNull: true },
    // amount je uvijek pozitivan; smjer nosi direction
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    direction: { type: DataTypes.ENUM("IN", "OUT"), allowNull: false },
    balanceAfter: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    // Faza 1: UNMATCHED → korisnik potvrdi/ignoriše. Matching engine (fakture,
    // javni prihodi, naučena pravila) dolazi u Fazi 2 i radi nad ovim statusom.
    status: {
      type: DataTypes.ENUM("UNMATCHED", "CONFIRMED", "IGNORED"),
      allowNull: false,
      defaultValue: "UNMATCHED",
    },
    // privremena kategorija kao string dok Faza 2 ne uvede Category model
    category: { type: DataTypes.STRING(60), allowNull: true },
    // povezana faktura (auto-match priliva ili ručni izbor); potvrda
    // stavke označava fakturu naplaćenom
    invoiceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // poslovni partner (vezan automatski po žiro računu partnera)
    partnerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // ulazni račun koji je ova isplata zatvorila (auto-knjiženje)
    ulazniRacunId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "bank_transactions",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      { fields: ["organizationId", "date"] },
      { fields: ["organizationId", "status"] },
      { fields: ["statementId"] },
    ],
  },
);

// Naučena pravila kategorizacije po organizaciji: kad korisnik potvrdi
// stavku sa kategorijom, zapamti (protivračun ili naziv) → kategorija,
// pa sljedeći upload iste protivstrane dolazi sa prijedlogom.
const BankMatchRule = sequelize.define(
  "BankMatchRule",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    // ACCOUNT = normalizovan protivračun (samo cifre), NAME = normalizovan naziv
    matchType: { type: DataTypes.ENUM("ACCOUNT", "NAME"), allowNull: false },
    matchValue: { type: DataTypes.STRING(255), allowNull: false },
    direction: { type: DataTypes.ENUM("IN", "OUT"), allowNull: false },
    category: { type: DataTypes.STRING(60), allowNull: false },
    timesConfirmed: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "bank_match_rules",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      {
        // MySQL limit za naziv identifikatora je 64 znaka — auto-generisano
        // ime iz kolona bi bilo predugačko, pa eksplicitno kratko ime
        name: "uq_bank_match_rule",
        unique: true,
        fields: ["organizationId", "matchType", "matchValue", "direction"],
      },
    ],
  },
);

// Poslovni partneri obrta (kupci i dobavljači). Auto-popunjavaju se iz
// faktura i bankovnih izvoda, a korisnik ih dopunjava punim podacima
// (JIB, adresa) — osnova za kartice partnera i kasnije KUF/KIF.
const Partner = sequelize.define(
  "Partner",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    // šifra partnera: redni broj unutar organizacije (prikaz npr. "0003")
    code: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    // JIB/ID broj (13 cifara) i PDV broj (12); opciono dok korisnik ne unese
    jib: { type: DataTypes.STRING(20), allowNull: true },
    pdvBroj: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(120), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(64), allowNull: true },
    // žiro računi partnera, niz normalizovanih brojeva (samo cifre);
    // po njima se transakcije sa izvoda automatski vežu za partnera
    accounts: { type: DataTypes.JSON, allowNull: true },
    isKupac: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isDobavljac: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "partners",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [{ fields: ["organizationId"] }],
  },
);

// Ulazni računi (fakture dobavljača). Knjiže se na partnera; plaćanje na
// izvodu ih automatski zatvara. Polja pokrivaju i buduće KUF potrebe
// (broj, datum, dobavljač preko partnera, iznos, PDV).
const UlazniRacun = sequelize.define(
  "UlazniRacun",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    partnerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    // broj fakture kako ga je dobavljač izdao
    brojRacuna: { type: DataTypes.STRING(100), allowNull: false },
    datumRacuna: { type: DataTypes.DATEONLY, allowNull: false },
    rokPlacanja: { type: DataTypes.DATEONLY, allowNull: true },
    // ukupan iznos sa PDV-om; pdvIznos opciono (dobavljač PDV obveznik)
    iznos: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    pdvIznos: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    status: {
      type: DataTypes.ENUM("OTVOREN", "PLACEN"),
      allowNull: false,
      defaultValue: "OTVOREN",
    },
    paidAt: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "ulazni_racuni",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    indexes: [
      { fields: ["organizationId", "status"] },
      { fields: ["partnerId"] },
    ],
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

User.hasMany(ClientPayment, { foreignKey: "userId", as: "clientPayments" });
ClientPayment.belongsTo(User, { foreignKey: "userId", as: "user" });

ActivityLog.belongsTo(User, { foreignKey: "userId", as: "user" });
ActivityLog.belongsTo(Organization, { foreignKey: "organizationId", as: "organization" });

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

// Bank statements associations
Organization.hasMany(BankStatement, {
  foreignKey: "organizationId",
  as: "bankStatements",
});
BankStatement.belongsTo(Organization, {
  foreignKey: "organizationId",
  as: "organization",
});
BankStatement.hasMany(BankTransaction, {
  foreignKey: "statementId",
  as: "transactions",
  onDelete: "CASCADE",
  hooks: true,
});
BankTransaction.belongsTo(BankStatement, {
  foreignKey: "statementId",
  as: "statement",
});
Organization.hasMany(BankTransaction, {
  foreignKey: "organizationId",
  as: "bankTransactions",
});
BankTransaction.belongsTo(Organization, {
  foreignKey: "organizationId",
  as: "organization",
});
Invoice.hasMany(BankTransaction, {
  foreignKey: "invoiceId",
  as: "bankTransactions",
});
BankTransaction.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice" });

Organization.hasMany(Partner, { foreignKey: "organizationId", as: "partners" });
Partner.belongsTo(Organization, { foreignKey: "organizationId" });
Partner.hasMany(BankTransaction, {
  foreignKey: "partnerId",
  as: "bankTransactions",
});
BankTransaction.belongsTo(Partner, { foreignKey: "partnerId", as: "partner" });

Partner.hasMany(UlazniRacun, { foreignKey: "partnerId", as: "ulazniRacuni" });
UlazniRacun.belongsTo(Partner, { foreignKey: "partnerId", as: "partner" });
UlazniRacun.hasMany(BankTransaction, {
  foreignKey: "ulazniRacunId",
  as: "bankTransactions",
});
BankTransaction.belongsTo(UlazniRacun, {
  foreignKey: "ulazniRacunId",
  as: "ulazniRacun",
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
  Invoice,
  InvoiceItem,
  InvoiceCounter,
  ContractCounter,
  WorkerDocument,
  InvoiceItemTemplate,
  Payroll,
  PayrollDocument,
  ClientPayment,
  CompanyExpense,
  OtherIncome,
  ActivityLog,
  UserPreference,
  BankStatement,
  BankTransaction,
  BankMatchRule,
  Partner,
  UlazniRacun,
};
