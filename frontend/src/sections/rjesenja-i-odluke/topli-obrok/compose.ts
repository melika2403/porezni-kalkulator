import type { RjesenjeComposed } from "../shared/composed";
import { formatDdMmYyyy } from "../shared/format";
import { zaglavljeOf, radnikDativ } from "../shared/parts";

// ── Odluka o pravu na topli obrok ───────────────────────────────────────────
// Poslodavac utvrđuje pravo i dnevni iznos naknade za ishranu. Veže se na
// obračun (topli obrok po šihterici). Neoporezivo do propisanog dnevnog iznosa.
export interface TopliObrokInput {
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
  dnevniIznos: string;
  datumPrimjeneIso: string;
  napomenaPorez: boolean;
}

export function composeOdlukaTopliObrok(
  input: TopliObrokInput,
): RjesenjeComposed {
  const radnik = radnikDativ(input.zenski);
  const stupa = input.datumPrimjeneIso
    ? `dana ${formatDdMmYyyy(input.datumPrimjeneIso)}`
    : "danom donošenja";
  const stavke: string[] = [
    `${radnik} ${input.imeRadnikaDativ}, na radnom mjestu ${input.radnoMjesto}, utvrđuje se pravo na naknadu za ishranu u toku rada (topli obrok) u iznosu od ${input.dnevniIznos} KM po danu prisustva na radu.`,
    "Naknada za topli obrok obračunava se za dane provedene na radu i isplaćuje uz mjesečnu plaću.",
    `Ova odluka stupa na snagu ${stupa}.`,
  ];
  const paragrafi: string[] = [];
  if (input.napomenaPorez) {
    paragrafi.push(
      "Naknada za topli obrok je neoporeziva do iznosa propisanog poreznim propisima FBiH; na iznos iznad propisanog obračunava se porez na dohodak.",
    );
  }
  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu čl. 8. Zakona o porezu na dohodak i Pravilnika o radu, poslodavac donosi:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "ODLUKA O PRAVU NA TOPLI OBROK",
    stavke,
    paragrafi: paragrafi.length ? paragrafi : undefined,
    dostaviti: ["imenovanom radniku", "računovodstvu", "arhivi"],
    potpisnik: input.potpisnik,
  };
}
