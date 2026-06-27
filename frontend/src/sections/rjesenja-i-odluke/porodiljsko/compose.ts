import type { RjesenjeComposed } from "../shared/composed";
import { formatDdMmYyyy } from "../shared/format";
import { zaglavljeOf, radnikDativ } from "../shared/parts";

// ── Rješenje o porodiljskom odsustvu (čl. 62. ZoR FBiH) ─────────────────────
// Porodiljsko odsustvo traje do godinu dana neprekidno. Naknada plaće se
// ostvaruje po kantonalnim propisima o socijalnoj zaštiti.
export interface PorodiljskoInput {
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
  odIso: string;
  doIso: string;
  datumPorodaIso: string;
  ukljuciObrazlozenje: boolean;
  ukljuciPouku: boolean;
  rokPrigovora: number;
}

export function composeRjesenjePorodiljsko(
  input: PorodiljskoInput,
): RjesenjeComposed {
  // Porodiljsko po prirodi koristi radnica; zadržavamo rod radi dosljednosti.
  const radnica = radnikDativ(input.zenski);
  const period =
    input.odIso && input.doIso
      ? ` u periodu od ${formatDdMmYyyy(input.odIso)} do ${formatDdMmYyyy(input.doIso)}`
      : input.odIso
        ? `, počev od ${formatDdMmYyyy(input.odIso)}`
        : "";
  const stavke: string[] = [
    `${radnica} ${input.imeRadnikaDativ}, na radnom mjestu ${input.radnoMjesto}, odobrava se porodiljsko odsustvo${period}.`,
  ];
  if (input.datumPorodaIso) {
    stavke.push(`Datum porođaja: ${formatDdMmYyyy(input.datumPorodaIso)}.`);
  }
  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu čl. 62. Zakona o radu („Sl. novine FBiH“, broj 26/16 i 89/18), donosi se:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "RJEŠENJE O PORODILJSKOM ODSUSTVU",
    stavke,
    paragrafi: [
      "Za vrijeme porodiljskog odsustva radnica ostvaruje pravo na naknadu plaće u skladu sa propisima o socijalnoj zaštiti i kantonalnim propisima.",
    ],
    obrazlozenje: input.ukljuciObrazlozenje
      ? "Porodiljsko odsustvo odobreno je u skladu sa članom 62. Zakona o radu, na osnovu zahtjeva radnice i priložene medicinske dokumentacije."
      : undefined,
    pouka: input.ukljuciPouku
      ? `Protiv ovog rješenja može se uložiti pismeni prigovor poslodavcu, u roku ${input.rokPrigovora} dana od dana dostavljanja ovog rješenja.`
      : undefined,
    potpisnik: input.potpisnik,
  };
}
