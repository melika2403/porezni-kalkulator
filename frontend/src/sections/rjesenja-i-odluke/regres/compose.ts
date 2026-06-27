import type { RjesenjeComposed } from "../shared/composed";
import { formatDdMmYyyy } from "../shared/format";
import { zaglavljeOf, radnikDativ } from "../shared/parts";

export interface RegresInput {
  nazivFirme: string;
  adresaFirme: string;
  gradFirme: string;
  brojAkta: string;
  mjesto: string;
  datumDonosenjaIso: string;
  imeRadnikaDativ: string;
  radnoMjesto: string;
  zenski: boolean;
  godina: string;
  iznos: string;
  interniAkt: string;
  isplataNacin: string;
  racun: string;
  ukljuciNapomenuPorez: boolean;
  potpisnik: string;
}

export function composeRegres(input: RegresInput): RjesenjeComposed {
  const radnik = radnikDativ(input.zenski);
  const interni = input.interniAkt.trim() || "Pravilnika o radu";

  const stavke: string[] = [
    `${radnik} ${input.imeRadnikaDativ}, na radnom mjestu ${input.radnoMjesto}, odobrava se isplata regresa za godišnji odmor za ${input.godina} godinu u iznosu od ${input.iznos} KM.`,
    `Regres iz tačke 1. ove odluke isplatit će se ${input.isplataNacin}${
      input.racun.trim()
        ? ` na transakcijski račun radnika broj ${input.racun.trim()}`
        : ""
    }.`,
  ];

  const paragrafi: string[] = [];
  if (input.ukljuciNapomenuPorez) {
    paragrafi.push(
      "Isplaćeni iznos regresa je neoporeziv do 50% prosječne neto plaće isplaćene u Federaciji BiH u posljednja tri mjeseca prije isplate, u skladu sa poreznim propisima.",
    );
  }

  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov: `Na osnovu čl. 112. Zakona o radu („Sl. novine FBiH“, broj 26/16 i 89/18), ${interni} i čl. 20. Pravilnika o primjeni Zakona o porezu na dohodak, donosi se:`,
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "ODLUKA O ISPLATI REGRESA ZA GODIŠNJI ODMOR",
    stavke,
    paragrafi,
    dostaviti: ["računovodstvu", "imenovanom radniku", "arhivi"],
    potpisnik: input.potpisnik,
  };
}
