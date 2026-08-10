// Mapiranje naloga iz obračuna (JSON sa /api/admin/izvoz-naloga/nalozi) u
// vrijednosti polja matričnog obrasca (NalogValues za escpNalog.buildPrn).
// Formati po Faza 0 dokumentu: iznos 999.999.999.999,00; datum DD.MM.GGGG;
// period DDMMGG; JIB 13 cifara; računi samo cifre (16).
// Bez importa (osim type-only): backend testovi učitavaju direktno kroz Node.
import type { NalogValues } from "./escpNalog";

export type StampaNalogUlaz = {
  tip: string;
  naziv: string;
  mjesto: string;
  racun: string;
  svrha: string;
  iznosKm: number;
  jib: string;
  vrstaPrihoda: string;
  opcina: string;
  budzetskaOrganizacija: string;
  pozivNaBroj: string;
  /** ISO YYYY-MM-DD ili prazno */
  periodOd: string;
  periodDo: string;
};

export type StampaPlatilacUlaz = {
  racun: string;
  naziv: string;
  adresa: string;
  mjesto: string;
};

const cifre = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const tekst = (s: unknown) => String(s ?? "").trim();

const fmtIznos = (n: number) =>
  (Number(n) || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ddmmgggg = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`
    : "";

const ddmmgg = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(2, 4)}`
    : "";

// Sadržajne granice polja iz Faza 0 (fizičke kućice pred-štampanog obrasca).
// Generator ima svoj TVRDI limit (do sljedećeg polja); ovo je uže i mjerodavno
// za sastavljanje vrijednosti.
const GRANICE = {
  uplatio1: 20,
  uplatio2: 25,
  uplatio3: 25,
  svrha1: 30,
  svrha2: 40,
  svrha3: 28,
  primalac1: 30,
  primalac2: 28,
  primalac3: 28,
  mjestoUplate: 14,
};

// Prelije tekst kroz redove zadatih širina, po granicama riječi; riječ duža od
// cijelog reda se tvrdo reže. Višak preko zadnjeg reda otpada (nikad novi red,
// prelom bi pomjerio linije obrasca).
export function podijeliTekst(text: string, granice: number[]): string[] {
  const rijeci = tekst(text).split(/\s+/).filter(Boolean);
  const out = granice.map(() => "");
  let i = 0;
  for (const r of rijeci) {
    let smjesteno = false;
    while (i < granice.length && !smjesteno) {
      const kandidat = out[i] ? `${out[i]} ${r}` : r;
      if (kandidat.length <= granice[i]) {
        out[i] = kandidat;
        smjesteno = true;
      } else if (!out[i] && r.length > granice[i]) {
        out[i] = r.slice(0, granice[i]);
        smjesteno = true;
      } else {
        i++;
      }
    }
    if (i >= granice.length && !smjesteno) break;
  }
  return out;
}

export function nalogUVrijednosti(
  n: StampaNalogUlaz,
  platilac: StampaPlatilacUlaz,
  datumValuteIso: string,
): NalogValues {
  const [svrha1, svrha2, svrha3] = podijeliTekst(n.svrha, [
    GRANICE.svrha1,
    GRANICE.svrha2,
    GRANICE.svrha3,
  ]);
  const [primalac1, primalac2] = podijeliTekst(n.naziv, [
    GRANICE.primalac1,
    GRANICE.primalac2,
  ]);
  return {
    uplatio1: tekst(platilac.naziv).slice(0, GRANICE.uplatio1),
    uplatio2: tekst(platilac.adresa).slice(0, GRANICE.uplatio2),
    uplatio3: tekst(platilac.mjesto).slice(0, GRANICE.uplatio3),
    racunPosiljaoca: cifre(platilac.racun).slice(0, 16),
    svrha1,
    svrha2,
    svrha3,
    racunPrimaoca: cifre(n.racun).slice(0, 16),
    primalac1,
    primalac2,
    primalac3: tekst(n.mjesto).slice(0, GRANICE.primalac3),
    iznos: fmtIznos(n.iznosKm),
    hitno: "",
    brojObveznika: cifre(n.jib).slice(0, 13),
    // vrsta uplate ne postoji u data modelu naloga: ostaje prazno dok se ne
    // potvrdi vrijednost sa stvarnog naloga (spec: ne izmišljati)
    vrstaUplate: "",
    mjestoUplate: tekst(platilac.mjesto).slice(0, GRANICE.mjestoUplate),
    datumUplate: ddmmgggg(datumValuteIso),
    periodOd: ddmmgg(n.periodOd),
    periodDo: ddmmgg(n.periodDo),
    vrstaPrihoda: tekst(n.vrstaPrihoda),
    opcina: tekst(n.opcina),
    budzetskaOrg: tekst(n.budzetskaOrganizacija),
    pozivNaBroj: tekst(n.pozivNaBroj),
  };
}
