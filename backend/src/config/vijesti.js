// Rubrike i tipovi redakcijskog sadržaja. Držimo ih u kodu (a ne u tabeli) jer
// se mijenjaju rijetko, a ovako su jedan izvor istine za backend i frontend.
// Frontend ogledalo: frontend/src/data/vijesti.ts (isti id-evi).

const RUBRIKE = [
  { id: "propisi", naziv: "Propisi i izmjene" },
  { id: "porezi", naziv: "Porezi i doprinosi" },
  { id: "plate", naziv: "Plate i radnici" },
  { id: "pdv", naziv: "PDV" },
  { id: "obrti", naziv: "Obrti i knjige" },
  { id: "vodici", naziv: "Vodiči" },
];

const RUBRIKA_IDS = RUBRIKE.map((r) => r.id);

const TIPOVI = ["VIJEST", "VODIC"];
const STATUSI = ["NACRT", "ZAKAZAN", "OBJAVLJEN", "ARHIVIRAN"];

// Minimalna dužina teksta prije objave (riječi). Vijest smije biti kratka,
// vodič ne: kratak vodič ne rangira i ne odgovori na pitanje do kraja.
const MIN_RIJECI = { VIJEST: 300, VODIC: 1200 };

// Granice SEO polja, iste one koje editor pokazuje kao semafor.
const SEO_LIMITI = {
  naslovMin: 50,
  naslovMax: 60,
  opisMin: 140,
  opisMax: 160,
};

// Sažetak je jedno pravilo na tri mjesta: brojač u editoru, semafor prije
// objave i sječenje na serveru. Zato stoji ovdje, a ne kao tri broja u kodu.
const SAZETAK_LIMITI = { min: 80, max: 300 };

module.exports = {
  RUBRIKE,
  RUBRIKA_IDS,
  TIPOVI,
  STATUSI,
  MIN_RIJECI,
  SEO_LIMITI,
  SAZETAK_LIMITI,
};
