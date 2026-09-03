// Ponovno generisanje AMS-1035 i uplatnica iz reda evidencije.
// Ako uplata ima snimke sa /ams (amsPodaci/uplatnicaPodaci) koriste se oni,
// pa je PDF identičan prvobitnom. Za ručno unesene uplate podaci se slažu iz
// reda (obračun je server već snimio).
import { fillAmsTemplate, type AmsData } from "src/sections/ams/fillAms";
import {
  fillUplatnice,
  KANTONI,
  type KantonKey,
  type UplatnicaData,
} from "src/sections/ams/fillUplatnica";
import type { FreelancerUplata } from "src/api/freelancer";
import { danasIso, fmtDatum } from "./format";

const EMPTY_ROW = {
  iznosDohotka: 0,
  zdravstveno: 0,
  osnovica: 0,
  porez: 0,
  porezniKredit: 0,
  razlika: 0,
};

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isplatilacAdresa(u: FreelancerUplata) {
  return [u.isplatilacAdresa, u.isplatilacGrad].filter(Boolean).join(", ");
}

export function amsDataIz(u: FreelancerUplata): AmsData {
  if (u.amsPodaci && typeof u.amsPodaci === "object" && "rows" in u.amsPodaci) {
    return u.amsPodaci as unknown as AmsData;
  }
  const row1 = {
    iznosDohotka: u.dohodak,
    zdravstveno: u.zdravstveno,
    osnovica: u.osnovica,
    porez: u.porez,
    porezniKredit: u.porezniKredit,
    razlika: u.razlika,
  };
  return {
    imeIPrezime: u.primalacIme ?? "",
    jmbg: u.primalacJmbg ?? "",
    adresa: u.primalacAdresa ?? "",
    datumIsplate: u.datumPrimitka,
    periodMjesec: String(u.periodMjesec).padStart(2, "0"),
    periodGodina: String(u.periodGodina),
    naziv: u.isplatilacNaziv,
    adresaIsplatioca: isplatilacAdresa(u),
    drzava: u.isplatilacDrzava ?? "",
    rows: [row1, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW],
    ukupnoZdravstveno: u.zdravstveno,
    ukupnoOsnovica: u.osnovica,
    ukupnoPorez: u.porez,
    ukupnoPorezniKredit: u.porezniKredit,
    ukupnoRazlika: u.razlika,
    datum: fmtDatum(danasIso()),
  };
}

/** null kad uplata nema kanton/općinu (uplatnice se ne mogu složiti). */
export function uplatnicaDataIz(u: FreelancerUplata): UplatnicaData | null {
  if (
    u.uplatnicaPodaci &&
    typeof u.uplatnicaPodaci === "object" &&
    "kantonKey" in u.uplatnicaPodaci
  ) {
    return u.uplatnicaPodaci as unknown as UplatnicaData;
  }
  const kk = u.kantonKey as KantonKey | null;
  if (!kk || !(kk in KANTONI) || !u.opcinaKod) return null;
  const opcina = KANTONI[kk].opcine.find((o) => o.kod === u.opcinaKod);
  if (!opcina) return null;
  return {
    imeIPrezime: u.primalacIme ?? "",
    adresa: u.primalacAdresa ?? "",
    jmbg: u.primalacJmbg ?? "",
    periodMjesec: String(u.periodMjesec).padStart(2, "0"),
    periodGodina: String(u.periodGodina),
    zdravstvenoKanton: u.zdravstvenoKanton,
    zdravstvenoFbih: u.zdravstvenoFbih,
    porez: u.razlika,
    kantonKey: kk,
    opcinaKod: u.opcinaKod,
    opcinaIme: u.opcinaIme ?? opcina.ime,
    datum: danasIso(),
    ziroRacun: u.ziroRacun ?? undefined,
  };
}

export const amsImeFajla = (u: FreelancerUplata) =>
  `AMS-1035_${String(u.periodMjesec).padStart(2, "0")}_${u.periodGodina}_${u.id}.pdf`;
export const uplatniceImeFajla = (u: FreelancerUplata) =>
  `Uplatnice_${String(u.periodMjesec).padStart(2, "0")}_${u.periodGodina}_${u.id}.pdf`;

/** Bajtovi AMS obrasca (za preuzimanje i za godišnju arhivu). */
export function amsBytes(u: FreelancerUplata) {
  return fillAmsTemplate(amsDataIz(u));
}

/** Bajtovi uplatnica, null kad uplata nema kanton i općinu. */
export async function uplatniceBytes(u: FreelancerUplata) {
  const data = uplatnicaDataIz(u);
  if (!data) return null;
  return fillUplatnice(data);
}

export async function preuzmiAms(u: FreelancerUplata) {
  downloadPdf(await amsBytes(u), amsImeFajla(u));
}

export async function preuzmiUplatnice(u: FreelancerUplata) {
  const bytes = await uplatniceBytes(u);
  if (!bytes) return false;
  downloadPdf(bytes, uplatniceImeFajla(u));
  return true;
}
