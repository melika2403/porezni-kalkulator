import type { RjesenjeComposed } from "../shared/composed";
import { formatDdMmYyyy } from "../shared/format";
import { zaglavljeOf, radnikDativ } from "../shared/parts";

export interface PlacenoOdsustvoInput {
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
  ukljuciObrazlozenje: boolean;
  ukljuciPouku: boolean;
  rokPrigovora: number;
  potpisnik: string;
}

export function composePlacenoOdsustvo(
  input: PlacenoOdsustvoInput,
): RjesenjeComposed {
  const radnik = radnikDativ(input.zenski);

  const stavke: string[] = [
    `${radnik} ${input.imeRadnikaDativ}, na radnom mjestu ${input.radnoMjesto}, odobrava se plaćeno odsustvo u trajanju od ${input.brojDana} radnih dana, u periodu od ${formatDdMmYyyy(input.odIso)} do ${formatDdMmYyyy(input.doIso)}.`,
    `Plaćeno odsustvo odobrava se zbog: ${input.razlog}.`,
  ];

  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu čl. 53. Zakona o radu („Sl. novine FBiH“, broj 26/16 i 89/18), donosi se:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "RJEŠENJE O PLAĆENOM ODSUSTVU",
    stavke,
    paragrafi: [
      "Za vrijeme plaćenog odsustva radnik ima pravo na naknadu plaće u visini kao da je radio.",
    ],
    obrazlozenje: input.ukljuciObrazlozenje
      ? "Plaćeno odsustvo odobreno je u skladu sa članom 53. Zakona o radu, na osnovu zahtjeva radnika i priložene dokumentacije, a u okviru zakonskog limita od sedam radnih dana u kalendarskoj godini."
      : undefined,
    pouka: input.ukljuciPouku
      ? `Protiv ovog rješenja može se uložiti pismeni prigovor poslodavcu, u roku ${input.rokPrigovora} dana od dana dostavljanja ovog rješenja.`
      : undefined,
    potpisnik: input.potpisnik,
  };
}
