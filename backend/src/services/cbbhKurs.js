// Kursna lista Centralne banke BiH (srednji kurs) po datumu.
//
// Javni JSON: https://www.cbbh.ba/CurrencyExchange/GetJson?date=YYYY-MM-DD
// Odgovor: { CurrencyExchangeItems: [{ AlphaCode, Units, Buy, Middle, Sell,
// ... }], Date, ... }. Za dane bez liste (vikend) CBBiH vraća zadnju
// objavljenu, pa datumListe čitamo iz odgovora, ne iz zahtjeva. EUR je fiksan
// (currency board) i ne ide na mrežu. Liste se keširaju u procesu: prošli
// datumi zauvijek (nepromjenjivi), današnja 6 sati, a neuspjeh kratko (5 min)
// da pad CBBiH ne drži zahtjev po nekoliko pokušaja puta timeout.
const CBBH_URL = "https://www.cbbh.ba/CurrencyExchange/GetJson?date=";
const FIKSNI = { BAM: 1, EUR: 1.95583 };
const TTL_DANAS_MS = 6 * 60 * 60 * 1000;
const TTL_NEUSPJEH_MS = 5 * 60 * 1000;
const MAX_UNAZAD_DANA = 3;
const TIMEOUT_MS = 4000;
// Ruta za kurs je javna (AMS generator), pa keš mora imati granicu: bez nje
// bi prolazak kroz sve datume od 2015. napunio memoriju (jedna lista je oko
// 3,8 KB, a datuma ima preko 4.000). 500 lista je oko 2 MB, a pravi korisnici
// ionako traže mali broj datuma koji se ponavljaju.
const MAX_KES = 500;

const kes = new Map(); // datum zahtjeva -> { items, datumListe, t }

/** Upis uz granicu: Map pamti redoslijed, pa ispada najstariji upis. */
function upisiUKes(datum, zapis) {
  if (!kes.has(datum) && kes.size >= MAX_KES) {
    const najstariji = kes.keys().next().value;
    if (najstariji !== undefined) kes.delete(najstariji);
  }
  kes.set(datum, zapis);
}

function danasIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pomjeriDan(iso, dana) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dana)).toISOString().slice(0, 10);
}

/** Srednji kurs za 1 jedinicu valute iz CBBiH stavki, ili null. */
function izvuciKurs(items, valuta) {
  const v = String(valuta || "").toUpperCase();
  const it = (Array.isArray(items) ? items : []).find(
    (i) => String(i?.AlphaCode || "").toUpperCase() === v,
  );
  if (!it) return null;
  const units = Number(it.Units) || 1;
  const middle = Number(String(it.Middle ?? "").replace(",", "."));
  if (!(middle > 0)) return null;
  return Math.round((middle / units) * 1e6) / 1e6;
}

/** Neuspjeh pamtimo nakratko, da svaki zahtjev ne ponavlja mrtvu mrežu. */
function zapamtiNeuspjeh(datum) {
  upisiUKes(datum, { items: null, datumListe: null, t: Date.now() });
  return null;
}

function izKesa(datum) {
  const c = kes.get(datum);
  if (!c) return undefined;
  const staro = Date.now() - c.t;
  if (!c.items) return staro < TTL_NEUSPJEH_MS ? null : undefined;
  if (datum !== danasIso() || staro < TTL_DANAS_MS) return c;
  return undefined;
}

async function listaZaDatum(datum) {
  const c = izKesa(datum);
  if (c !== undefined) return c;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(CBBH_URL + datum, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return zapamtiNeuspjeh(datum);
    const json = await res.json();
    const items = Array.isArray(json?.CurrencyExchangeItems)
      ? json.CurrencyExchangeItems
      : null;
    if (!items) return zapamtiNeuspjeh(datum);
    const datumListe = String(json?.Date || datum).slice(0, 10);
    const zapis = { items, datumListe, t: Date.now() };
    upisiUKes(datum, zapis);
    return zapis;
  } catch {
    return zapamtiNeuspjeh(datum);
  } finally {
    clearTimeout(t);
  }
}

/**
 * Kurs valute na dan (ili najbliži raniji dan sa listom).
 * @returns {Promise<{valuta:string,kurs:number,datumListe:string,izvor:string}|null>}
 */
async function kursNaDan(valuta, datumIso) {
  const v = String(valuta || "").toUpperCase();
  if (FIKSNI[v] != null) {
    return {
      valuta: v,
      kurs: FIKSNI[v],
      datumListe: datumIso,
      izvor: v === "BAM" ? "domaća valuta" : "fiksni kurs (currency board)",
    };
  }
  for (let i = 0; i <= MAX_UNAZAD_DANA; i++) {
    const d = pomjeriDan(datumIso, -i);
    const lista = await listaZaDatum(d);
    if (!lista) continue;
    const kurs = izvuciKurs(lista.items, v);
    if (kurs) {
      return { valuta: v, kurs, datumListe: lista.datumListe, izvor: "CBBiH srednji kurs" };
    }
  }
  return null;
}

module.exports = { kursNaDan, izvuciKurs, FIKSNI };
