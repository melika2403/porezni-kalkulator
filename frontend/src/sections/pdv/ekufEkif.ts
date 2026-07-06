// e-KUF / e-KIF CSV export za UINO e-portal (elektronske evidencije).
// Format dekodiran iz stvarnih fajlova koje generiše korisnikov stari program:
// UTF-8 sa BOM, separator ";", decimalna TAČKA, datumi ISO (YYYY-MM-DD).
// Red tip 1 = zaglavlje, tip 2 = stavka, tip 3 = totali + broj stavki.
// Ime fajla: PDVBROJ_GGMM_1_ZZ.csv (e-KUF) odnosno _2_ZZ.csv (e-KIF);
// ZZ = redni broj podnošenja u periodu (mi šaljemo 01, prva predaja).
// Redni brojevi stavki TEKU KROZ GODINU (ne resetuju se svaki mjesec).
import type { Invoice } from "src/api/invoices";
import type { UlazniRacun } from "src/api/partners";
import { deriveKifDefaults } from "./pdvObracun";

export type EknjigaOrg = {
  pdvBroj: string;
  /** FBIH | RS | BD, treba deriveKifDefaults heuristici za KP */
  jurisdiction: string | null;
};

export type EknjigaResult = {
  csv: string;
  filename: string;
  /** neprazno = export blokiran, prikazati korisniku šta ispraviti */
  errors: string[];
};

const onlyDigits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");
const num = (v: string | number | null | undefined) => Number(v) || 0;
/** iznos sa decimalnom tačkom, 2 decimale (negativan za KO/storno) */
const amt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
/** tekstualna polja ne smiju sadržavati separator ni novi red */
const txt = (s: string | null | undefined) =>
  (s ?? "").replace(/[;\r\n]/g, " ").trim();

/** period u obliku GGMM, npr. maj 2026 = "2605" */
function periodYYMM(month: number, year: number) {
  return `${String(year).slice(2)}${String(month).padStart(2, "0")}`;
}

function headerRow(pdvBroj: string, month: number, year: number, knjiga: 1 | 2) {
  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const datum = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;
  const vrijeme = `${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`;
  return `1;${pdvBroj};${periodYYMM(month, year)};${knjiga};01;${datum};${vrijeme}`;
}

/**
 * e-KUF: stavka ima 20 polja.
 * 2;period;redniBroj;tipDok;brojDok;datumDok;datumPrijema;naziv;sjedište;
 * pdvBroj(12, prazno za neobveznike);JIB(13, vodeća 4);
 * osnovica bez PDV;ukupno sa PDV;osnovica uvoza;ukupni PDV;odbitni PDV;
 * neodbitni PDV;nabavke od poljoprivrednika;paušalna naknada;odbitna paušalna
 */
export function buildEkufCsv(opts: {
  rows: UlazniRacun[];
  org: EknjigaOrg;
  month: number;
  year: number;
  /** redni broj prve stavke perioda (numeracija teče kroz godinu) */
  startBroj: number;
}): EknjigaResult {
  const { rows, org, month, year, startBroj } = opts;
  const errors: string[] = [];
  const orgPdv = onlyDigits(org.pdvBroj);
  if (orgPdv.length !== 12) {
    errors.push(
      "PDV broj organizacije mora imati 12 cifara (postavke obrta). Bez njega se e-KUF ne može predati.",
    );
  }
  const period = periodYYMM(month, year);
  const lines: string[] = [headerRow(orgPdv, month, year, 1)];
  // zbirevi za red tipa 3 (istih 9 kolona iznosa kao u stavci)
  const sums = [0, 0, 0, 0, 0, 0, 0, 0, 0];

  rows.forEach((r, i) => {
    const redni = String(startBroj + i).padStart(6, "0");
    const naziv = txt(r.partner?.name) || `stavka ${i + 1}`;
    const pdvBrojP = onlyDigits(r.partner?.pdvBroj);
    // JIB je 13 cifara sa vodećom 4; ako nije upisan, izvodi se iz PDV broja
    const jibP = onlyDigits(r.partner?.jib) || (pdvBrojP ? `4${pdvBrojP}` : "");
    if (pdvBrojP && pdvBrojP.length !== 12) {
      errors.push(
        `KUF ${redni} (${naziv}): PDV broj dobavljača "${r.partner?.pdvBroj}" nema 12 cifara. Ispravite ga na kartici partnera.`,
      );
    }
    if (jibP.length !== 13) {
      errors.push(
        `KUF ${redni} (${naziv}): JIB dobavljača nedostaje ili nema 13 cifara. Upišite ga na kartici partnera.`,
      );
    }

    const pdv = num(r.pdvIznos);
    const ukupno = num(r.iznos);
    // iznos je mjerodavan; boolean pokriva knjiženja prije migracije
    const neodbitniUnos = Math.min(
      num(r.pdvNeodbitniIznos) || (r.pdvNeodbitan ? pdv : 0),
      pdv,
    );
    // PDV na čekanju: odbitak još ne teče, cijeli PDV ide u neodbitnu kolonu
    const cekanje = r.vrstaDokumenta === "PDV_NA_CEKANJU";
    const odbitni = cekanje ? 0 : pdv - neodbitniUnos;
    const neodbitni = cekanje ? pdv : neodbitniUnos;
    if (odbitni > 0 && pdvBrojP.length !== 12) {
      errors.push(
        `KUF ${redni} (${naziv}): odbija se ulazni PDV, a dobavljač nema ispravan PDV broj (12 cifara).`,
      );
    }
    // samo-PDV knjiženja (uvozni PDV po JCI) imaju ukupno 0: osnovica je 0
    const osnovica = Math.max(ukupno - pdv, 0);
    const uvoz = r.vrstaNabavke === "UVOZ";
    const polj = r.vrstaNabavke === "OD_NEOBVEZNIKA";
    if (uvoz && !txt(r.jciBroj)) {
      errors.push(
        `KUF ${redni} (${naziv}): uvoz bez broja JCI. Upišite JCI u knjiženju računa.`,
      );
    }
    const pausal = polj ? num(r.pausalnaNaknada) : 0;
    // knjižna obavijest i storno avansa se predaju kao negativne stavke
    const sign =
      r.vrstaDokumenta === "KNJIZNA_OBAVIJEST" ||
      r.vrstaDokumenta === "STORNO_AVANSNE"
        ? -1
        : 1;
    const iznosi = [
      uvoz || polj ? 0 : osnovica, // 12: osnovica domaćih nabavki bez PDV
      ukupno, //                      13: ukupan iznos sa PDV
      uvoz ? osnovica : 0, //         14: osnovica uvoza (JCI)
      pdv, //                         15: ukupni ulazni PDV
      odbitni, //                     16: PDV koji se može odbiti
      neodbitni, //                   17: PDV koji se ne može odbiti
      polj ? ukupno : 0, //           18: nabavke od poljoprivrednika
      pausal, //                      19: paušalna naknada (5%)
      pausal, //                      20: odbitna paušalna naknada
    ].map((n) => n * sign);
    iznosi.forEach((n, k) => (sums[k] += n));

    // za uvoz se umjesto broja fakture predaje broj JCI (i datum JCI)
    const brojDok = uvoz && txt(r.jciBroj) ? txt(r.jciBroj) : txt(r.brojRacuna);
    const datumDok = uvoz && r.jciDatum ? r.jciDatum : r.datumRacuna;
    lines.push(
      [
        "2",
        period,
        redni,
        r.tipDokumenta ?? "01",
        brojDok,
        datumDok,
        r.datumPrijema ?? r.datumRacuna,
        naziv,
        txt(r.partner?.city),
        pdvBrojP,
        jibP,
        ...iznosi.map(amt),
      ].join(";"),
    );
  });

  lines.push(["3", ...sums.map(amt), String(rows.length)].join(";"));
  return {
    csv: `${lines.join("\r\n")}\r\n`,
    filename: `${orgPdv}_${period}_1_01.csv`,
    errors,
  };
}

/**
 * e-KIF: stavka ima 21 polje.
 * 2;period;redniBroj;tipDok;brojDok(JCI za tip 04);datum;naziv kupca;sjedište;
 * pdvBroj(12);JIB(13);ukupno sa PDV;interna faktura (vanposlovne svrhe);
 * izvoz;ostale isporuke koje ne podliježu PDV-u;osnovica;PDV;0;0;0;0;0
 */
export function buildEkifCsv(opts: {
  rows: Invoice[];
  org: EknjigaOrg;
  month: number;
  year: number;
  startBroj: number;
}): EknjigaResult {
  const { rows, org, month, year, startBroj } = opts;
  const errors: string[] = [];
  const orgPdv = onlyDigits(org.pdvBroj);
  if (orgPdv.length !== 12) {
    errors.push(
      "PDV broj organizacije mora imati 12 cifara (postavke obrta). Bez njega se e-KIF ne može predati.",
    );
  }
  const period = periodYYMM(month, year);
  const lines: string[] = [headerRow(orgPdv, month, year, 2)];
  const sums = Array(11).fill(0) as number[];

  rows.forEach((inv, i) => {
    const redni = String(startBroj + i).padStart(6, "0");
    const kif = deriveKifDefaults(inv, org.jurisdiction);
    const tip = kif.tipDokumenta;
    // za izvoznu fakturu (tip 04) se predaje broj i datum JCI
    const jci = txt(inv.kifJciBroj);
    if (tip === "04" && !jci) {
      errors.push(
        `KIF ${redni} (${inv.fullNumber}): izvozna faktura bez broja JCI. Upišite ga kroz "Knjiženje u KIF" na redu fakture.`,
      );
    }
    const brojDok = tip === "04" && jci ? jci : txt(inv.fullNumber);
    const datumDok = tip === "04" && inv.kifJciDatum ? inv.kifJciDatum : inv.issueDate;

    // strani kupci nemaju PDV broj/JIB, polja ostaju prazna (kao u primjeru);
    // upisuju se samo formalno ispravni brojevi
    const pdvBrojK = onlyDigits(inv.buyerVatNumber);
    const pdvOk = pdvBrojK.length === 12 ? pdvBrojK : "";
    const jibRaw = onlyDigits(inv.buyerIdNumber);
    const jibK =
      jibRaw.length === 13 ? jibRaw : pdvOk ? `4${pdvOk}` : "";

    const gross = num(inv.grossTotal);
    const net = num(inv.netTotal);
    const vat = num(inv.vatTotal);
    const izvoz = tip === "04" || inv.vrstaIsporuke === "IZVOZ";
    const neoporezovano =
      !izvoz &&
      (inv.vrstaIsporuke === "OSLOBODJENA" ||
        kif.vrstaFakture === "OSTALO_NEOPOREZOVANO" ||
        (kif.vrstaFakture === "INOSTRANI_KUPAC" && vat === 0));
    const sign =
      kif.vrstaDokumenta === "KNJIZNA_OBAVIJEST" ||
      kif.vrstaDokumenta === "STORNO_AVANSNE"
        ? -1
        : 1;
    const iznosi = [
      gross, //                                            11: ukupan iznos
      kif.vrstaFakture === "VANPOSLOVNE_SVRHE" ? gross : 0, // 12: interna faktura
      izvoz ? net : 0, //                                  13: izvozne isporuke
      neoporezovano ? net : 0, //                          14: ostale neoporezive
      izvoz || neoporezovano ? 0 : net, //                 15: osnovica
      izvoz || neoporezovano ? 0 : vat, //                 16: PDV
      0, 0, 0, 0, 0,
    ].map((n) => n * sign);
    iznosi.forEach((n, k) => (sums[k] += n));

    lines.push(
      [
        "2",
        period,
        redni,
        tip,
        brojDok,
        datumDok,
        txt(inv.buyerName),
        txt(inv.buyerCity),
        pdvOk,
        jibK,
        ...iznosi.map(amt),
      ].join(";"),
    );
  });

  lines.push(["3", ...sums.map(amt), String(rows.length)].join(";"));
  return {
    csv: `${lines.join("\r\n")}\r\n`,
    filename: `${orgPdv}_${period}_2_01.csv`,
    errors,
  };
}

/** preuzimanje kao UTF-8 sa BOM (UINO portal tako očekuje) */
export function downloadCsv(csv: string, filename: string) {
  const bom = String.fromCharCode(0xfeff);
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
