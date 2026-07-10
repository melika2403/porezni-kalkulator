// Obračun stavke kalkulacije za živi prikaz na frontend-u. MORA ostati
// usklađen sa backend obračunom (backend/src/controllers/kalkulacijeController.js,
// computeStavka): backend je autoritativan i snima snapshot pri spremanju.
export const PDV_STOPA = 17;

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const r5 = (n: number) => Math.round((n + Number.EPSILON) * 1e5) / 1e5;

export type StavkaInput = {
  kolicina: number;
  /** fakturna cijena po j/m (za PDV obveznika bez PDV-a, inače sa PDV-om) */
  cijena: number;
  rabatPct: number;
  zavisniTrosakPct: number;
  mpc: number;
};

export type StavkaObracun = {
  pdvStopa: number;
  iznos: number;
  rabatIznos: number;
  fakturnaVrijednost: number;
  zavisniTrosak: number;
  nabavniIznos: number;
  nabavnaCijena: number;
  marzaPct: number;
  marzaIznos: number;
  vrijednostBezPdv: number;
  pdvIznos: number;
  ulazniPdvIznos: number;
  maloprodajniIznos: number;
};

export type ObracunCtx = {
  /** obrt je PDV obveznik (MPC sadrži 17%, ulazni PDV se odbija) */
  orgObveznik: boolean;
  /** račun dobavljača bez PDV-a (nema ulaznog odbitka) */
  bezPdvRacun: boolean;
  /** artikal oslobođen PDV-a */
  oslobodjenPdv: boolean;
};

export function computeStavka(
  input: StavkaInput,
  ctx: ObracunCtx,
): StavkaObracun {
  const imaPdv = ctx.orgObveznik && !ctx.oslobodjenPdv;
  const pdvStopa = imaPdv ? PDV_STOPA : 0;

  const iznos = r2(input.kolicina * input.cijena);
  const rabatIznos = r2((iznos * input.rabatPct) / 100);
  const fakturnaVrijednost = r2(iznos - rabatIznos);
  const zavisniTrosak = r2(
    (fakturnaVrijednost * input.zavisniTrosakPct) / 100,
  );
  const nabavniIznos = r2(fakturnaVrijednost + zavisniTrosak);
  const nabavnaCijena =
    input.kolicina > 0 ? r5(nabavniIznos / input.kolicina) : 0;

  const maloprodajniIznos = r2(input.kolicina * input.mpc);
  const vrijednostBezPdv =
    pdvStopa > 0
      ? r2(maloprodajniIznos / (1 + pdvStopa / 100))
      : maloprodajniIznos;
  const pdvIznos = r2(maloprodajniIznos - vrijednostBezPdv);
  const marzaIznos = r2(vrijednostBezPdv - nabavniIznos);
  const marzaPct =
    nabavniIznos > 0 ? Math.round((marzaIznos / nabavniIznos) * 1e6) / 1e4 : 0;

  const ulazniPdvIznos =
    imaPdv && !ctx.bezPdvRacun
      ? r2((fakturnaVrijednost * PDV_STOPA) / 100)
      : 0;

  return {
    pdvStopa,
    iznos,
    rabatIznos,
    fakturnaVrijednost,
    zavisniTrosak,
    nabavniIznos,
    nabavnaCijena,
    marzaPct,
    marzaIznos,
    vrijednostBezPdv,
    pdvIznos,
    ulazniPdvIznos,
    maloprodajniIznos,
  };
}

/** MPC iz zadate marže (%) na nabavnu cijenu, zaokružen na 2 decimale. */
export function mpcIzMarze(
  nabavnaCijena: number,
  marzaPct: number,
  pdvStopa: number,
): number {
  const bezPdv = nabavnaCijena * (1 + marzaPct / 100);
  return r2(bezPdv * (1 + pdvStopa / 100));
}

/** Marža (%) izvedena iz MPC-a (obrnuto od mpcIzMarze), za prikaz u unosu. */
export function marzaIzMpc(
  nabavnaCijena: number,
  mpc: number,
  pdvStopa: number,
): number {
  if (nabavnaCijena <= 0) return 0;
  const bezPdv = mpc / (1 + pdvStopa / 100);
  return Math.round((bezPdv / nabavnaCijena - 1) * 1e6) / 1e4;
}
