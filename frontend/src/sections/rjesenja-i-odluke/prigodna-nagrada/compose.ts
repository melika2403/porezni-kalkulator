import type { RjesenjeComposed } from "../shared/composed";
import { formatDdMmYyyy } from "../shared/format";
import { zaglavljeOf, radnikDativ } from "../shared/parts";

export interface PrigodnaNagradaInput {
  nazivFirme: string;
  adresaFirme: string;
  gradFirme: string;
  brojAkta: string;
  mjesto: string;
  datumDonosenjaIso: string;
  imeRadnikaDativ: string;
  radnoMjesto: string;
  zenski: boolean;
  povod: string;
  iznos: string;
  interniAkt: string;
  isplataNacin: string;
  ukljuciNapomenuPorez: boolean;
  potpisnik: string;
}

export function composePrigodnaNagrada(
  input: PrigodnaNagradaInput,
): RjesenjeComposed {
  const radnik = radnikDativ(input.zenski);
  const interni = input.interniAkt.trim() || "Pravilnika o radu";

  const stavke: string[] = [
    `${radnik} ${input.imeRadnikaDativ}, na radnom mjestu ${input.radnoMjesto}, odobrava se isplata prigodne nagrade povodom ${input.povod} u iznosu od ${input.iznos} KM.`,
    `Nagrada iz tačke 1. ove odluke isplatit će se ${input.isplataNacin}.`,
  ];

  const paragrafi: string[] = [];
  if (input.ukljuciNapomenuPorez) {
    paragrafi.push(
      "Prigodna nagrada je neoporeziva do 30% prosječne neto plaće isplaćene u Federaciji BiH, u skladu sa poreznim propisima.",
    );
  }

  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov: `Na osnovu čl. 112. Zakona o radu („Sl. novine FBiH“, broj 26/16 i 89/18), ${interni} i Pravilnika o primjeni Zakona o porezu na dohodak, donosi se:`,
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "ODLUKA O ISPLATI PRIGODNE NAGRADE",
    stavke,
    paragrafi,
    dostaviti: ["računovodstvu", "imenovanom radniku", "arhivi"],
    potpisnik: input.potpisnik,
  };
}
