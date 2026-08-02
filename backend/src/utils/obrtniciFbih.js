// ──────────────────────────────────────────────────────────────────────────────
//  Osnovice za obračun doprinosa određenih obveznika (vlasnici obrta, slobodna
//  zanimanja, poljoprivrednici, taksisti, trgovci pojedinci) u FBiH.
//
//  IZVOR: Službene novine FBiH br. 100/25 od 31.12.2025.
//  PRAVNI OSNOV: Zakon o porezu na dohodak FBiH (čl. 12, 19, 31) i
//                Zakon o doprinosima FBiH (čl. 6).
//
//  AŽURIRANJE: osnovice se utvrđuju godišnje (kraj decembra za narednu godinu).
//  Kad Vlada FBiH objavi nove osnovice u Sl. novinama, dodati novi ključ u
//  OSNOVICE_OBRTNICI_FBIH sa godinom kao ključem.
// ──────────────────────────────────────────────────────────────────────────────

// Kategorije obveznika koji utvrđuju dohodak na osnovu POSLOVNIH KNJIGA
// (član 19 Zakona o porezu na dohodak FBiH).
const KATEGORIJE_STVARNI_DOHODAK = {
  SLOBODNA_ZANIMANJA: "SLOBODNA_ZANIMANJA",
  OBRT_SRODNE: "OBRT_SRODNE",
  POLJOPRIVREDA_SUMARSTVO: "POLJOPRIVREDA_SUMARSTVO",
  TRGOVAC_POJEDINAC: "TRGOVAC_POJEDINAC",
};

// Kategorije obveznika koji utvrđuju dohodak u PAUŠALNOM IZNOSU
// (član 31 Zakona o porezu na dohodak FBiH).
const KATEGORIJE_PAUSALNI = {
  OBRT_SRODNE: "OBRT_SRODNE",
  ESNAFSKI_ZANATI: "ESNAFSKI_ZANATI",
  POLJOPRIVREDA_SUMARSTVO: "POLJOPRIVREDA_SUMARSTVO",
  TAXI: "TAXI",
  TRGOVAC_POJEDINAC: "TRGOVAC_POJEDINAC",
};

// Režim oporezivanja — bitno za odabir tabele osnovica.
const REZIMI_OPOREZIVANJA = {
  STVARNI_DOHODAK: "STVARNI_DOHODAK", // poslovne knjige (čl. 19)
  PAUSALNI: "PAUSALNI", // paušalni iznos (čl. 31)
  OSTALI: "OSTALI", // čl. 6 t.10 Zakona o doprinosima
};

// Stope doprinosa za vlasnika obrta, ukupno 36% (član 9 Zakona o doprinosima
// FBiH). Obrtnik pokriva i radnički i poslodavčev dio iz vlastite osnovice.
const OBRTNIK_PIO = 0.195; // 17% + 2.5%
const OBRTNIK_ZDR = 0.145; // 12.5% + 2%
const OBRTNIK_NEZAP = 0.02; // 1.5% + 0.5%

// Mjesečne osnovice za obračun doprinosa po godinama.
// Sve vrijednosti u KM.
const OSNOVICE_OBRTNICI_FBIH = {
  2026: {
    source: "Sl. novine FBiH br. 100/25 od 31.12.2025",
    avgBrutoPriorYear: 2464.0, // Prosječna bruto plata FBiH I–IX 2025
    // 1) Stvarni dohodak (poslovne knjige) — čl. 19 Zakona o porezu na dohodak
    stvarniDohodak: {
      SLOBODNA_ZANIMANJA: 2710.0,
      OBRT_SRODNE: 1602.0,
      POLJOPRIVREDA_SUMARSTVO: 715.0,
      TRGOVAC_POJEDINAC: 715.0,
    },
    // 2) Paušalni — čl. 31 Zakona o porezu na dohodak
    pausalni: {
      OBRT_SRODNE: 1355.0,
      ESNAFSKI_ZANATI: 616.0,
      POLJOPRIVREDA_SUMARSTVO: 616.0,
      TAXI: 616.0,
      TRGOVAC_POJEDINAC: 715.0,
    },
    // 3) Ostali obveznici — čl. 6 t.10 Zakona o doprinosima
    ostali: 739.0,
  },
};

// Vrati osnovicu za datu godinu, režim i kategoriju.
// Ako kombinacija ne postoji, baca grešku da spriječi tihu pogrešnu računicu.
function getOsnovica(year, rezim, kategorija) {
  const yearData = OSNOVICE_OBRTNICI_FBIH[year];
  if (!yearData) {
    throw new Error(
      `Osnovice za godinu ${year} nisu definisane. Dodaj u obrtniciFbih.js.`,
    );
  }
  if (rezim === REZIMI_OPOREZIVANJA.OSTALI) {
    return yearData.ostali;
  }
  const tabela =
    rezim === REZIMI_OPOREZIVANJA.STVARNI_DOHODAK
      ? yearData.stvarniDohodak
      : rezim === REZIMI_OPOREZIVANJA.PAUSALNI
        ? yearData.pausalni
        : null;
  if (!tabela) {
    throw new Error(`Nepoznat režim oporezivanja: ${rezim}`);
  }
  const iznos = tabela[kategorija];
  if (iznos == null) {
    throw new Error(
      `Kategorija ${kategorija} ne postoji u režimu ${rezim} za ${year}.`,
    );
  }
  return iznos;
}

module.exports = {
  KATEGORIJE_STVARNI_DOHODAK,
  KATEGORIJE_PAUSALNI,
  REZIMI_OPOREZIVANJA,
  OSNOVICE_OBRTNICI_FBIH,
  OBRTNIK_PIO,
  OBRTNIK_ZDR,
  OBRTNIK_NEZAP,
  getOsnovica,
};
