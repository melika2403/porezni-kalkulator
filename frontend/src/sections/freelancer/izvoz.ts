// Izvoz evidencije: Excel tabela uplata i godišnja arhiva (ZIP sa svim
// obrascima, uplatnicama, prilozima, pregledom prihoda i Excel tabelom).
// Sve se pravi u pregledniku iz podataka koje tabovi ionako dohvataju.
import {
  listPrilozi,
  prilogUrl,
  potvrdaUrl,
  type FreelancerUplata,
} from "src/api/freelancer";
import { unwrap } from "src/api/auth";
import { fmtDatum, STATUS_TEKST } from "./format";
import { amsBytes, uplatniceBytes } from "./pdf";

const d = (iso: string | null | undefined) => (iso ? fmtDatum(iso) : "");
const period = (u: FreelancerUplata) =>
  `${String(u.periodMjesec).padStart(2, "0")}/${u.periodGodina}`;

/** Red tabele: sve kolone koje evidencija vodi, redoslijedom kao na ekranu. */
function red(u: FreelancerUplata) {
  return {
    Primljeno: d(u.datumPrimitka),
    Period: period(u),
    Isplatilac: u.isplatilacNaziv,
    Adresa: u.isplatilacAdresa ?? "",
    Grad: u.isplatilacGrad ?? "",
    Država: u.isplatilacDrzava ?? "",
    Valuta: u.valuta,
    "Iznos u valuti": Number(u.iznosValuta),
    Kurs: Number(u.kurs),
    "Iznos (KM)": Number(u.iznosKm),
    "Rashodi (%)": Number(u.stopaRashoda),
    "Rashodi (KM)": Number(u.rashodi),
    Dohodak: Number(u.dohodak),
    Zdravstveno: Number(u.zdravstveno),
    Osnovica: Number(u.osnovica),
    Porez: Number(u.porez),
    "Porezni kredit": Number(u.porezniKredit),
    "Porez za uplatu": Number(u.razlika),
    Neto: Number(u.neto),
    Status: STATUS_TEKST[u.status],
    "Datum predaje": d(u.datumPredaje),
    "Datum plaćanja": d(u.datumPlacanja),
    "Rok predaje": d(u.rokPredaje),
    Napomena: u.napomena ?? "",
  };
}

const ZBIR_KOLONE = [
  "Iznos (KM)",
  "Rashodi (KM)",
  "Dohodak",
  "Zdravstveno",
  "Osnovica",
  "Porez",
  "Porezni kredit",
  "Porez za uplatu",
  "Neto",
] as const;

/** Excel tabela uplata (jedan list) sa redom zbira na dnu. */
export async function uplateUXlsx(items: FreelancerUplata[], godina: number) {
  const XLSX = await import("xlsx");
  const redovi = items.map(red);
  const zbir: Record<string, string | number> = { Primljeno: `Ukupno ${godina}.` };
  for (const k of ZBIR_KOLONE) {
    zbir[k] = Math.round(redovi.reduce((s, r) => s + (Number(r[k]) || 0), 0) * 100) / 100;
  }
  const ws = XLSX.utils.json_to_sheet(redovi.length ? [...redovi, zbir] : [zbir]);
  // širine kolona da se naslovi ne sijeku
  ws["!cols"] = Object.keys(redovi[0] ?? zbir).map((k) => ({
    wch: Math.max(12, Math.min(40, k.length + 2)),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Uplate ${godina}`);
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}

export function preuzmiBajtove(bytes: Uint8Array, ime: string, mime: string) {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ime;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const sigurnoIme = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "uplata";

async function dohvatiBajtove(url: string) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/**
 * Godišnja arhiva: ZIP sa pregledom prihoda, Excel tabelom i po folderu za
 * svaku uplatu (AMS obrazac, uplatnice, prilozi). Vraća bajtove ZIP-a.
 * `naKorak` javlja napredak da dugme može pisati šta se pakuje.
 */
export async function godisnjaArhiva(
  uplate: FreelancerUplata[],
  godina: number,
  naKorak?: (tekst: string) => void,
) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const korijen = `PK-Freelancer-${godina}`;
  const propusteno: string[] = [];

  naKorak?.("Pregled prihoda");
  try {
    zip.file(`${korijen}/Pregled-prihoda-${godina}.pdf`, await dohvatiBajtove(potvrdaUrl(godina)));
  } catch {
    propusteno.push("pregled prihoda (PDF)");
  }

  naKorak?.("Excel tabela");
  zip.file(`${korijen}/Uplate-${godina}.xlsx`, await uplateUXlsx(uplate, godina));

  for (let i = 0; i < uplate.length; i++) {
    const u = uplate[i];
    naKorak?.(`Uplata ${i + 1} od ${uplate.length}`);
    const folder = `${korijen}/Uplate/${String(u.periodMjesec).padStart(2, "0")}_${sigurnoIme(u.isplatilacNaziv)}_${u.id}`;
    try {
      zip.file(`${folder}/AMS-1035.pdf`, await amsBytes(u));
    } catch {
      propusteno.push(`AMS obrazac za ${u.isplatilacNaziv}`);
    }
    try {
      const upl = await uplatniceBytes(u);
      if (upl) zip.file(`${folder}/Uplatnice.pdf`, upl);
    } catch {
      propusteno.push(`uplatnice za ${u.isplatilacNaziv}`);
    }
    if (u.brojPriloga > 0) {
      try {
        const prilozi = await unwrap(listPrilozi(u.id));
        for (const p of prilozi) {
          try {
            zip.file(`${folder}/Prilozi/${sigurnoIme(p.originalName)}`, await dohvatiBajtove(prilogUrl(p.id)));
          } catch {
            propusteno.push(`prilog ${p.originalName}`);
          }
        }
      } catch {
        propusteno.push(`prilozi za ${u.isplatilacNaziv}`);
      }
    }
  }

  naKorak?.("Pakovanje");
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return { bytes, propusteno, ime: `${korijen}.zip` };
}
