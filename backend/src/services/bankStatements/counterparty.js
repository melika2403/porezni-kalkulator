// Izvlačenje naziva i žiro računa protivstrane iz slobodnog opisa transakcije.
//
// Banke naziv i račun primaoca često ne daju kao zasebne kolone, nego ih
// utrpaju u opis. Bez njih ne radi ni vezanje na karticu partnera ni učenje
// pravila (pravilo se ključa po računu ili nazivu protivstrane), pa se ovo
// zove kao dopuna nakon parsiranja svake banke.
//
// Dva viđena oblika (oba se u opisu razdvajaju kosom crtom):
//   A  "PLACANJE RACUNA / SD BIRO JAPIC / 1982012020082604"   račun je zadnji
//   B  "DOPRINOS PIO/ FOND PIO 1020500000106698 /4364783...-0-712112-..."
//      (račun je na kraju srednjeg segmenta, iza njega ide poziv na broj)
//
// Pravilo je namjerno strogo: ako oblik nije prepoznat, vraća se prazno i
// ostaje kako je bilo. Bolje ništa nego pogrešan partner na kartici.

// Žiro računi u BiH su 16 cifara. Duži/kraći nizovi su poziv na broj,
// broj naloga, JIB i slično, pa se ne uzimaju.
const RACUN = /^\d{16}$/;
const RACUN_NA_KRAJU = /^(.*?)[\s,.:-]*(\d{16})$/;

// Segmenti koji nose broj naloga ili poziv na broj, a ne naziv primaoca.
const NIJE_NAZIV =
  /PROVIZIJ|NAKNAD|NALOG|POZIV\s+NA\s+BROJ|BROJEM|REALIZACIJ|KAMAT|SALDO|PRENOS\s+SREDSTAVA/i;

/** Naziv bez viška interpunkcije i praznina; prazan string → null. */
function ocistiNaziv(raw) {
  const naziv = String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.:;/-]+|[\s,.:;/-]+$/g, "")
    .trim()
    .slice(0, 255);
  if (naziv.length < 3) return null;
  // mora imati slovo: čisti brojevi i šifre nisu naziv
  if (!/\p{L}/u.test(naziv)) return null;
  if (NIJE_NAZIV.test(naziv)) return null;
  return naziv;
}

/**
 * @param {string} description opis transakcije sa izvoda
 * @returns {{name: string|null, account: string|null}}
 */
function extractCounterparty(description) {
  const prazno = { name: null, account: null };
  const tekst = String(description || "").replace(/\s+/g, " ").trim();
  if (!tekst) return prazno;

  const segmenti = tekst
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  // jedan segment znači da opis nema strukturu "svrha / primalac / račun"
  if (segmenti.length < 2) return prazno;

  // A: zadnji segment je čist račun, naziv je segment prije njega
  const zadnji = segmenti[segmenti.length - 1];
  if (RACUN.test(zadnji)) {
    return { name: ocistiNaziv(segmenti[segmenti.length - 2]), account: zadnji };
  }

  // B: neki segment (osim prvog, tamo je svrha) završava računom
  for (let i = 1; i < segmenti.length; i += 1) {
    const m = segmenti[i].match(RACUN_NA_KRAJU);
    if (!m) continue;
    const naziv = ocistiNaziv(m[1]);
    if (!naziv) continue;
    return { name: naziv, account: m[2] };
  }

  return prazno;
}

/**
 * Dopuni transakcije u rezultatu parsiranja. Postojeće vrijednosti parsera se
 * NIKAD ne prepisuju, popunjavaju se samo prazna polja.
 * @param {Array<{description?:string, counterpartyName?:string, counterpartyAccount?:string}>} transactions
 */
function dopuniProtivstranu(transactions) {
  if (!Array.isArray(transactions)) return;
  for (const tx of transactions) {
    if (tx.counterpartyName && tx.counterpartyAccount) continue;
    const { name, account } = extractCounterparty(tx.description);
    if (!tx.counterpartyName && name) tx.counterpartyName = name;
    if (!tx.counterpartyAccount && account) tx.counterpartyAccount = account;
  }
}

module.exports = { extractCounterparty, dopuniProtivstranu };
