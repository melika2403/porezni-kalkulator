import type { RjesenjeComposed } from "../shared/composed";
import { formatDdMmYyyy } from "../shared/format";
import { zaglavljeOf, radnikDativ } from "../shared/parts";

export interface NeplacenoOdsustvoInput {
  nazivFirme: string;
  adresaFirme: string;
  gradFirme: string;
  brojAkta: string;
  mjesto: string;
  datumDonosenjaIso: string;
  imeRadnikaDativ: string;
  radnoMjesto: string;
  zenski: boolean;
  razlog: string;
  brojDana: number;
  odIso: string;
  doIso: string;
  ukljuciPouku: boolean;
  rokPrigovora: number;
  potpisnik: string;
}

export function composeNeplacenoOdsustvo(
  input: NeplacenoOdsustvoInput,
): RjesenjeComposed {
  const radnik = radnikDativ(input.zenski);

  const stavke: string[] = [
    `${radnik} ${input.imeRadnikaDativ}, na radnom mjestu ${input.radnoMjesto}, odobrava se neplaćeno odsustvo u trajanju od ${input.brojDana} dana, u periodu od ${formatDdMmYyyy(input.odIso)} do ${formatDdMmYyyy(input.doIso)}.`,
    `Neplaćeno odsustvo odobrava se zbog: ${input.razlog}.`,
  ];

  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu čl. 54. Zakona o radu („Sl. novine FBiH“, broj 26/16 i 89/18), donosi se:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "RJEŠENJE O NEPLAĆENOM ODSUSTVU",
    stavke,
    paragrafi: [
      "Za vrijeme korištenja neplaćenog odsustva miruju prava i obaveze radnika iz radnog odnosa.",
    ],
    pouka: input.ukljuciPouku
      ? `Protiv ovog rješenja može se uložiti pismeni prigovor poslodavcu, u roku ${input.rokPrigovora} dana od dana dostavljanja ovog rješenja.`
      : undefined,
    potpisnik: input.potpisnik,
  };
}
