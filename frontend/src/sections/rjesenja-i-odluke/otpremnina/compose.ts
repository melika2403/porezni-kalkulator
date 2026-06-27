import type { RjesenjeComposed } from "../shared/composed";
import { formatDdMmYyyy } from "../shared/format";
import { zaglavljeOf, radnikDativ } from "../shared/parts";

// ── Odluka o isplati otpremnine (čl. 111. ZoR) ──────────────────────────────
export interface OtpremninaInput {
  nazivFirme: string;
  adresaFirme: string;
  gradFirme: string;
  brojAkta: string;
  mjesto: string;
  datumDonosenjaIso: string;
  imeRadnikaDativ: string;
  radnoMjesto: string;
  zenski: boolean;
  potpisnik: string;
  iznos: string;
  osnov: string; // npr. "odlaska u penziju", "poslovno uvjetovanog otkaza"
  godineStaza: string; // npr. "12 godina i 3 mjeseca" (opciono)
  isplataNacin: string;
  napomenaPorez: boolean;
}

export function composeOdlukaOtpremnina(
  input: OtpremninaInput,
): RjesenjeComposed {
  const radnik = radnikDativ(input.zenski);
  const osnov = input.osnov.trim() || "prestanka radnog odnosa";
  const staz = input.godineStaza.trim()
    ? `, uz ostvaren radni staž kod poslodavca u trajanju od ${input.godineStaza.trim()}`
    : "";
  const stavke: string[] = [
    `${radnik} ${input.imeRadnikaDativ}, na radnom mjestu ${input.radnoMjesto}, isplatit će se otpremnina u iznosu od ${input.iznos} KM.`,
    `Pravo na otpremninu ostvaruje se po osnovu ${osnov}${staz}.`,
    `Otpremnina će biti isplaćena ${input.isplataNacin.trim() || "jednokratno, na transakcijski račun radnika"}.`,
  ];
  const paragrafi: string[] = [];
  if (input.napomenaPorez) {
    paragrafi.push(
      "Otpremnina je neoporeziva do iznosa propisanog poreznim propisima FBiH; na iznos iznad propisanog obračunava se porez na dohodak.",
    );
  }
  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu čl. 111. Zakona o radu („Sl. novine FBiH“, broj 26/16 i 89/18) i Pravilnika o radu, poslodavac donosi:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "ODLUKA O ISPLATI OTPREMNINE",
    stavke,
    paragrafi: paragrafi.length ? paragrafi : undefined,
    dostaviti: ["imenovanom radniku", "računovodstvu", "arhivi"],
    potpisnik: input.potpisnik,
  };
}
