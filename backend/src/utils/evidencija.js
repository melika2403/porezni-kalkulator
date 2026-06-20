// ──────────────────────────────────────────────────────────────────────────────
//  Matična evidencija o radniku (Pravilnik Sl. novine FBiH 92/16, čl. 3).
//  Spaja podatke sa radnika (Worker) + izvedene (datum rođenja iz JMBG-a) +
//  dodatne ručno unesene/podrazumijevane (worker.evidencijaPodaci JSON).
//  Vraća 24 stavke za prikaz/PDF, i listu editabilnih polja za formu.
// ──────────────────────────────────────────────────────────────────────────────

const STRUCNA_SPREMA = [
  "DR, Doktor nauka",
  "MR, Magistar",
  "VSS, Visoka stručna sprema",
  "VŠS, Viša stručna sprema",
  "SSS, Srednja stručna sprema",
  "Niža",
  "VKV, Visokokvalifikovani",
  "KV, Kvalifikovani",
  "PK, Polukvalifikovani",
  "NK, Nekvalifikovani",
];

function fmtDateIso(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y}.`;
}

// Datum rođenja iz JMBG-a: DDMMYYY (YYY = zadnje 3 cifre godine).
// yyy >= 800 → 18xx/19xx, inače 20xx (JMBG postoji od ~1970, granica je sigurna).
function deriveDobFromJmbg(jmbg) {
  const d = String(jmbg || "").replace(/\D/g, "");
  if (d.length < 7) return "";
  const dd = d.slice(0, 2);
  const mm = d.slice(2, 4);
  const yyy = parseInt(d.slice(4, 7), 10);
  if (Number.isNaN(yyy)) return "";
  const fullYear = yyy >= 800 ? 1000 + yyy : 2000 + yyy;
  const day = parseInt(dd, 10);
  const mon = parseInt(mm, 10);
  if (day < 1 || day > 31 || mon < 1 || mon > 12) return "";
  return `${dd}.${mm}.${fullYear}.`;
}

// Editabilna polja (čuvaju se u worker.evidencijaPodaci). default(worker, org)
// daje podrazumijevanu vrijednost (placeholder) ako korisnik nije ništa upisao.
const EDITABLE_FIELDS = [
  { key: "mjestoRodjenja", label: "Mjesto i općina rođenja" },
  {
    key: "drzavaRodjenja",
    label: "Država rođenja",
    default: () => "Bosna i Hercegovina",
  },
  { key: "drzavljanstvo", label: "Državljanstvo", default: () => "BiH" },
  {
    key: "dozvolaRada",
    label: "Dozvola za boravak i rad (stranac)",
    default: () => "–",
  },
  { key: "strucniIspit", label: "Stručni ispit" },
  { key: "dodatnoObrazovanje", label: "Dodatno obrazovanje" },
  { key: "datumUgovora", label: "Datum ugovora o radu", type: "date" },
  { key: "pripravnickiStaz", label: "Pripravnički staž i ispit" },
  { key: "radUInostranstvu", label: "Rad u inostranstvu" },
  {
    key: "beneficiraniStaz",
    label: "Poslovi sa uvećanim (beneficiranim) stažom",
    default: () => "Ne",
  },
  {
    key: "radnaSposobnost",
    label: "Poslovi sa utvrđivanjem radne sposobnosti",
    default: () => "Ne",
  },
  {
    key: "mjestoRada",
    label: "Mjesto rada",
    default: (w, org) => org?.city || "",
  },
  {
    key: "sedmicnoRadnoVrijeme",
    label: "Sedmično radno vrijeme (sati)",
    default: (w) => (w.contractedHours ? String(w.contractedHours * 5) : "40"),
  },
  { key: "penzijskiStazPrije", label: "Penzijski staž prije zaposlenja" },
  { key: "razdobljaMirovanja", label: "Razdoblja mirovanja radnog odnosa" },
  { key: "razlogPrestanka", label: "Razlog prestanka radnog odnosa" },
];

// Vraća efektivnu vrijednost editabilnog polja (uneseno ILI default).
function effective(field, e, w, org) {
  const v = e[field.key];
  if (v != null && String(v).trim() !== "") return v;
  return field.default ? field.default(w, org) : "";
}

// Lista editabilnih polja za formu. value = RAW uneseno (prazno ako nije),
// placeholder = dinamički default. Tako se default NE zamrzava u bazu: snima se
// samo ono što korisnik stvarno upiše, a default se primjenjuje pri prikazu/PDF.
function editableList(w, org) {
  const e = (w && w.evidencijaPodaci) || {};
  return EDITABLE_FIELDS.map((f) => {
    const raw = e[f.key];
    return {
      key: f.key,
      label: f.label,
      type: f.type || "text",
      value: raw != null && String(raw).trim() !== "" ? String(raw) : "",
      placeholder: f.default ? f.default(w, org) : "",
    };
  });
}

// 24 stavke matične evidencije (za prikaz i PDF).
function resolveEvidencija(w, org) {
  const e = (w && w.evidencijaPodaci) || {};
  const val = (key) => effective(EDITABLE_FIELDS.find((f) => f.key === key), e, w, org);
  const sprema =
    w.strucnaSpremaIdx != null ? STRUCNA_SPREMA[w.strucnaSpremaIdx] || "" : "";
  const dob = deriveDobFromJmbg(w.jmbg);
  const join = (...parts) => parts.filter((p) => p && String(p).trim()).join(", ");

  return [
    { n: 1, label: "Ime i prezime", value: `${w.firstName || ""} ${w.lastName || ""}`.trim() },
    { n: 2, label: "Jedinstveni matični broj (JMBG)", value: w.jmbg || "" },
    { n: 3, label: "Spol", value: w.spol === "Z" ? "Ženski" : w.spol === "M" ? "Muški" : "" },
    { n: 4, label: "Dan, mjesec i godina rođenja", value: dob },
    {
      n: 5,
      label: "Mjesto, općina, država rođenja i državljanstvo",
      value: join(val("mjestoRodjenja"), val("drzavaRodjenja"), "drž. " + val("drzavljanstvo")),
    },
    { n: 6, label: "Prebivalište / boravište", value: join(w.address, w.city) },
    { n: 7, label: "Dozvola za boravak i rad (stranac)", value: val("dozvolaRada") },
    {
      n: 8,
      label: "Školska sprema, stručni ispit, dodatno obrazovanje",
      value: join(sprema, val("strucniIspit"), val("dodatnoObrazovanje")),
    },
    {
      n: 9,
      label: "Broj i datum ugovora o radu",
      value: join(w.contractNumber, val("datumUgovora") ? fmtDateIso(val("datumUgovora")) : ""),
    },
    { n: 10, label: "Dan početka rada", value: fmtDateIso(w.startDate || w.prijavaDate) },
    { n: 11, label: "Poslove radnog mjesta koje radnik obavlja", value: w.position || "" },
    {
      n: 12,
      label: "Radni odnos na određeno / neodređeno vrijeme",
      value:
        w.contractType === "ODREDJENO"
          ? "Određeno vrijeme" + (w.contractEndDate ? `, do ${fmtDateIso(w.contractEndDate)}` : "")
          : w.contractType === "NEODREDJENO"
            ? "Neodređeno vrijeme"
            : "",
    },
    { n: 13, label: "Trajanje probnog rada", value: w.probationMonths ? `${w.probationMonths} mj.` : "–" },
    { n: 14, label: "Pripravnički staž i ispit", value: val("pripravnickiStaz") || "–" },
    { n: 15, label: "Rad u inostranstvu", value: val("radUInostranstvu") || "–" },
    { n: 16, label: "Poslovi sa uvećanim (beneficiranim) stažom", value: val("beneficiraniStaz") },
    { n: 17, label: "Poslovi sa utvrđivanjem radne sposobnosti", value: val("radnaSposobnost") },
    { n: 18, label: "Mjesto rada", value: val("mjestoRada") },
    { n: 19, label: "Sedmično radno vrijeme (sati)", value: val("sedmicnoRadnoVrijeme") },
    {
      n: 20,
      label: "Trajanje rada prije zaposlenja",
      value: w.priorWorkYears ? `${w.priorWorkYears} god.` : "–",
    },
    { n: 21, label: "Penzijski staž prije zaposlenja", value: val("penzijskiStazPrije") || "–" },
    { n: 22, label: "Razdoblja mirovanja radnog odnosa", value: val("razdobljaMirovanja") || "–" },
    { n: 23, label: "Dan prestanka radnog odnosa", value: w.odjavaDate ? fmtDateIso(w.odjavaDate) : "–" },
    {
      n: 24,
      label: "Razlog prestanka radnog odnosa",
      value: val("razlogPrestanka") || (w.odjavaDate ? "" : "–"),
    },
  ];
}

module.exports = {
  STRUCNA_SPREMA,
  EDITABLE_FIELDS,
  deriveDobFromJmbg,
  fmtDateIso,
  editableList,
  resolveEvidencija,
};
