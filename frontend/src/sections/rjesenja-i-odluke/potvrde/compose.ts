import type { RjesenjeComposed } from "../shared/composed";
import { formatDdMmYyyy } from "../shared/format";
import { zaglavljeOf } from "../shared/parts";

// Potvrde imaju jednostavniju formu od rješenja/odluka: nema pravnih stavki ni
// "Dostaviti:" (prosljeđuje se prazna lista). Tijelo je u paragrafima.
export interface PotvrdaCommon {
  nazivFirme: string;
  adresaFirme: string;
  gradFirme: string;
  brojAkta: string;
  mjesto: string;
  datumDonosenjaIso: string;
  imeRadnika: string; // nominativ (npr. "Ime Prezime")
  jmbg: string;
  radnoMjesto: string;
  svrha: string; // za potrebe ... (npr. kreditnog zaduženja kod banke)
  potpisnik: string;
}

function basePotvrda(
  input: PotvrdaCommon,
  naslov: string,
  paragrafi: string[],
): RjesenjeComposed {
  const svrha = input.svrha.trim();
  const svrhaRecenica = svrha
    ? `Potvrda se izdaje na lični zahtjev radnika, radi ${svrha}, i u druge svrhe se ne može koristiti.`
    : "Potvrda se izdaje na lični zahtjev radnika i u druge svrhe se ne može koristiti.";
  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu službene evidencije o zaposlenim radnicima, poslodavac izdaje:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov,
    paragrafi: [...paragrafi, svrhaRecenica],
    dostaviti: [], // potvrda nema "Dostaviti:" blok
    potpisnik: input.potpisnik,
  };
}

// ── Potvrda o zaposlenju ────────────────────────────────────────────────────
export interface PotvrdaZaposlenjeInput extends PotvrdaCommon {
  datumZaposlenjaIso: string;
  neodredjeno: boolean;
}

export function composePotvrdaZaposlenje(
  input: PotvrdaZaposlenjeInput,
): RjesenjeComposed {
  const jmbg = input.jmbg.trim() ? ` (JMBG: ${input.jmbg.trim()})` : "";
  const vrsta = input.neodredjeno
    ? "na neodređeno vrijeme"
    : "na određeno vrijeme";
  const od = input.datumZaposlenjaIso
    ? `, počev od ${formatDdMmYyyy(input.datumZaposlenjaIso)} godine`
    : "";
  return basePotvrda(input, "POTVRDA O ZAPOSLENJU", [
    `Potvrđuje se da je ${input.imeRadnika}${jmbg}, u radnom odnosu kod poslodavca ${input.nazivFirme}, na radnom mjestu ${input.radnoMjesto}, ${vrsta}${od}.`,
  ]);
}

// ── Potvrda o visini primanja ───────────────────────────────────────────────
export interface PotvrdaPlataInput extends PotvrdaCommon {
  period: string; // npr. "mart, april i maj 2026."
  iznos: string; // prosječna mjesečna neto plaća
  bezZabrane: boolean;
}

export function composePotvrdaPlata(input: PotvrdaPlataInput): RjesenjeComposed {
  const period = input.period.trim() ? ` (${input.period.trim()})` : "";
  const paras = [
    `Potvrđuje se da je ${input.imeRadnika}, u radnom odnosu kod poslodavca ${input.nazivFirme}, na radnom mjestu ${input.radnoMjesto}.`,
    `Radnik je u posljednja tri mjeseca${period} ostvario prosječnu mjesečnu neto plaću u iznosu od ${input.iznos} KM.`,
  ];
  if (input.bezZabrane) {
    paras.push(
      "Na plaću radnika trenutno nema administrativnih zabrana niti drugih obustava.",
    );
  }
  return basePotvrda(input, "POTVRDA O VISINI PRIMANJA", paras);
}

// ── Potvrda o radnom stažu ──────────────────────────────────────────────────
export interface PotvrdaStazInput extends PotvrdaCommon {
  odIso: string;
  doIso: string;
  staz: string; // npr. "3 godine i 5 mjeseci"
}

export function composePotvrdaStaz(input: PotvrdaStazInput): RjesenjeComposed {
  const period = input.odIso
    ? ` (od ${formatDdMmYyyy(input.odIso)}${input.doIso ? ` do ${formatDdMmYyyy(input.doIso)}` : ""})`
    : "";
  const staz = input.staz.trim() ? ` u trajanju od ${input.staz.trim()}` : "";
  return basePotvrda(input, "POTVRDA O RADNOM STAŽU", [
    `Potvrđuje se da ${input.imeRadnika} ima ostvaren radni staž kod poslodavca ${input.nazivFirme}${staz}${period}, na radnom mjestu ${input.radnoMjesto}.`,
  ]);
}
