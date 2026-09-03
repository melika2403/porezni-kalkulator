// Izvoz naloga za e-bankarstvo: šifarnik banaka i poruke, dijeljeno između
// obračuna na Poreznom (ObracunPlata) i obračuna u PK Office-u, da se lista
// banaka i tekstovi grešaka održavaju na jednom mjestu.
import type { BankExportProfil, BankExportRezultat } from "src/api/payroll";

/** Banke koje korisnik prepoznaje po imenu, interno mapirane na format
 *  datoteke (profil). BBI, ASA, Sparkasse, Intesa, ProCredit i PBS dijele
 *  ELBA platformu; Halcom (Hal E-Bank / Personal) koriste klijenti više banaka. */
export const IZVOZ_BANKE: {
  value: string;
  label: string;
  profil: BankExportProfil;
}[] = [
  { value: "halcom", label: "Halcom (Hal E-Bank, više banaka)", profil: "halcom" },
  { value: "raiffeisen", label: "Raiffeisen banka (RBBHnet)", profil: "raiffeisen" },
  { value: "unicredit", label: "UniCredit banka (e-ba)", profil: "unicredit" },
  { value: "bbi", label: "BBI banka (eBBI)", profil: "elba" },
  { value: "asa", label: "ASA banka (ELBA)", profil: "elba" },
  { value: "sparkasse", label: "Sparkasse banka (ELBA)", profil: "elba" },
  { value: "intesa", label: "Intesa Sanpaolo banka (ELBA)", profil: "elba" },
  { value: "procredit", label: "ProCredit Bank (ELBA)", profil: "elba" },
  { value: "pbs", label: "Privredna banka Sarajevo (ELBA)", profil: "elba" },
  { value: "mf", label: "MF banka (Web Banking)", profil: "mfbanka" },
];

export const IZVOZ_GRESKE: Record<string, string> = {
  NEMA_OBRACUNA: "Za ovaj mjesec nema obračuna plata.",
  NEMA_NALOGA:
    "Nijedan nalog nije mogao ući u datoteku (pogledajte preskočene stavke).",
  FORBIDDEN: "Nemate pristup ovoj organizaciji.",
  FORBIDDEN_PLAN: "Potrebna je aktivna Pro ili Office pretplata.",
  INVALID_DATUM_VALUTE: "Datum valute nije ispravan kalendarski datum.",
  SERVER_ERROR: "Greška na serveru, pokušajte ponovo.",
  NETWORK_ERROR: "Greška u konekciji, pokušajte ponovo.",
};

/** 1 datoteka, 2 do 4 datoteke, 5 i više datoteka. */
export function datotekaPadez(n: number): string {
  return n % 10 >= 1 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
    ? "datoteke"
    : "datoteka";
}

function preuzmiBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Pokreće preuzimanje SVIH datoteka izvoza. Prvo dekodira sve (neispravan
 * base64 završi kao greška prije ijednog preuzimanja), pa ih preuzima sa
 * razmakom: preglednici odbace niz brzih uzastopnih preuzimanja (Safari zadrži
 * samo zadnje), pa bi dio Raiffeisen paketa tiho izostao.
 */
export function preuzmiIzvoz(data: BankExportRezultat) {
  const datoteke = data.datoteke?.length
    ? data.datoteke
    : [{ fileName: data.fileName, base64: data.base64 }];
  const blobovi = datoteke.map((d) => ({
    fileName: d.fileName,
    blob: new Blob([Uint8Array.from(atob(d.base64), (c) => c.charCodeAt(0))], {
      type: "text/plain",
    }),
  }));
  blobovi.forEach((b, i) => {
    if (i === 0) preuzmiBlob(b.blob, b.fileName);
    else setTimeout(() => preuzmiBlob(b.blob, b.fileName), i * 400);
  });
}

/** Današnji datum kao YYYY-MM-DD po lokalnom kalendaru (bez UTC pomaka). */
export function danasIsoLokalno() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
