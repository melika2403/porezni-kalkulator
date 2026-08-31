// Mapiranje naloga iz obračuna (JSON sa /api/payroll/nalozi-za-stampu) u
// vrijednosti polja matričnog obrasca (NalogValues za escpNalog.buildPrn).
// Formati (korigovani po Com_Soft referentnom ispisu 12.8.2026. i probnoj
// štampi 13.8.2026.): iznos 999.999.999.999,00; datum DD.MM.GGGG (naš,
// namjerno); period "DD  MM  GG" (dupli razmak, korak kućica); budžetska
// organizacija cifra po kućici ("5 1 0 2 0 0 1"); JIB 13 cifara; računi
// "999 999 99999999 99"; vrsta uplate "0" samo za javne prihode.
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

// Porezni period na obrascu ide u parove kućica; dupli razmak jer je korak
// kućica 4 znaka (kalibrisano po probnoj štampi 13.8.2026.).
const ddmmgg = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? `${iso.slice(8, 10)}  ${iso.slice(5, 7)}  ${iso.slice(2, 4)}`
    : "";

// Budžetska organizacija: kućica po cifri (korak 2 znaka), pa razmak
// između svake cifre.
const razmakniCifre = (s: unknown) => cifre(s).split("").join(" ");

// Račun (16 cifara) u grupe kućica obrasca: "999 999 99999999 99". Isto
// grupisanje 3+3+8+2 kao formatBankAccount (src/lib/bankCodes.ts), samo sa
// razmakom umjesto crtice; ne uvozi se jer je ovaj fajl namjerno bez importa.
const fmtRacun = (s: unknown) => {
  const d = cifre(s).slice(0, 16);
  return d.length === 16
    ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 14)} ${d.slice(14, 16)}`
    : d;
};

// Sadržajne granice polja: max dužine izbrojane sa referentnog Com_Soft ispisa
// (12.8.2026.), sve linije lijevog bloka završavaju na koloni 34. Generator ima
// svoj TVRDI limit (do sljedećeg polja); ovo je uže i mjerodavno za
// sastavljanje vrijednosti.
const GRANICE = {
  uplatio1: 13,
  uplatio2: 30,
  uplatio3: 30,
  svrha1: 22,
  svrha2: 30,
  svrha3: 30,
  primalac1: 20,
  primalac2: 30,
  primalac3: 30,
  mjestoUplate: 14,
};

// Prelije tekst kroz redove zadatih širina, po granicama riječi. Riječ koja ne
// stane ni u prazan red se prelomi, a ostatak nastavlja u sljedećem redu: znak
// iz SREDINE teksta se nikad ne smije izgubiti (naziv firme od 15 slova u redu
// od 13 bi inače bio odštampan pogrešno napisan). Otpada samo višak preko
// zadnjeg reda; nikad se ne dodaje novi red jer bi prelom pomjerio ceo obrazac.
export function podijeliTekst(text: string, granice: number[]): string[] {
  const rijeci = tekst(text).split(/\s+/).filter(Boolean);
  const out = granice.map(() => "");
  let i = 0;
  for (const rijec of rijeci) {
    let r = rijec;
    while (i < granice.length && r) {
      const kandidat = out[i] ? `${out[i]} ${r}` : r;
      if (kandidat.length <= granice[i]) {
        out[i] = kandidat;
        r = "";
      } else if (!out[i] && granice[i] > 0) {
        out[i] = r.slice(0, granice[i]);
        r = r.slice(granice[i]);
        i++;
      } else {
        i++;
      }
    }
    if (i >= granice.length) break;
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
  // Uplatilac je jedan tekst (naziv, adresa, mjesto) koji teče kroz tri reda
  // grupe: prva linija ima samo 13 mjesta pa se naziv po pravilu prelama dalje
  // (isto radi i Com_Soft, labela obrasca je "Ime, adresa, i tel.").
  const [uplatio1, uplatio2, uplatio3] = podijeliTekst(
    [platilac.naziv, platilac.adresa, platilac.mjesto]
      .map(tekst)
      .filter(Boolean)
      .join(", "),
    [GRANICE.uplatio1, GRANICE.uplatio2, GRANICE.uplatio3],
  );
  const [primalac1, primalac2] = podijeliTekst(n.naziv, [
    GRANICE.primalac1,
    GRANICE.primalac2,
  ]);
  return {
    uplatio1,
    uplatio2,
    uplatio3,
    racunPosiljaoca: fmtRacun(platilac.racun),
    svrha1,
    svrha2,
    svrha3,
    racunPrimaoca: fmtRacun(n.racun),
    primalac1,
    primalac2,
    primalac3: tekst(n.mjesto).slice(0, GRANICE.primalac3),
    iznos: fmtIznos(n.iznosKm),
    hitno: "",
    brojObveznika: cifre(n.jib).slice(0, 13),
    // "0" (redovna uplata) za javne prihode, potvrđeno iz Raiffeisen UJ
    // slogova starog programa; za prenose (neto plate...) ostaje prazno
    vrstaUplate: n.tip === "javniPrihod" ? "0" : "",
    mjestoUplate: tekst(platilac.mjesto).slice(0, GRANICE.mjestoUplate),
    datumUplate: ddmmgggg(datumValuteIso),
    periodOd: ddmmgg(n.periodOd),
    periodDo: ddmmgg(n.periodDo),
    vrstaPrihoda: tekst(n.vrstaPrihoda),
    opcina: tekst(n.opcina),
    budzetskaOrg: razmakniCifre(n.budzetskaOrganizacija),
    pozivNaBroj: tekst(n.pozivNaBroj),
  };
}
