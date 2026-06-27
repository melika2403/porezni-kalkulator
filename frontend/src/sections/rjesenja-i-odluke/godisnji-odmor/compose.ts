import { zaglavljeOf } from "../shared/parts";
import type { RjesenjeComposed } from "../shared/composed";
import {
  formatDdMm,
  formatDdMmYyyy,
  racunajRadneDane,
} from "../shared/format";

export type GoNacin = "cjelosti" | "dva_dijela" | "period";

export interface GodisnjiOdmorInput {
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
  ukupnoDana: number;
  zakonskiOsnovDana: number;
  nacin: GoNacin;
  cjelostiOdIso: string;
  cjelostiDoIso: string;
  prviDioDana: number;
  prviDioOdIso: string;
  prviDioDoIso: string;
  drugiDioRokIso: string;
  ukljuciObrazlozenje: boolean;
  ukljuciPouku: boolean;
  rokPrigovora: number;
  potpisnik: string;
}

export function composeGo(input: GodisnjiOdmorInput): RjesenjeComposed {
  const radnik = input.zenski ? "radnici" : "radniku";

  // U period modu broj dana se računa iz raspona, pa i uvod koristi taj broj
  // (da uvod i stavka prikazuju isti broj dana).
  const periodDana =
    racunajRadneDane(input.cjelostiOdIso, input.cjelostiDoIso) ||
    input.ukupnoDana;
  const ukupnoDana =
    input.nacin === "period" ? periodDana : input.ukupnoDana;

  const uvod =
    `${input.imeRadnikaDativ}, ${radnik} na radnom mjestu ${input.radnoMjesto}, ` +
    `(u daljnjem tekstu: Radnik) utvrđuje se pravo na godišnji odmor za ${input.godina} godinu, ` +
    `u trajanju od ukupno ${ukupnoDana} radnih dana, prema sljedećim osnovama i kriterijima:`;

  const stavke: string[] = [];
  stavke.push(
    `zakonski osnov ${input.zakonskiOsnovDana} radnih dana (za maloljetnog radnika 24 radna dana)`,
  );

  if (input.nacin === "dva_dijela") {
    stavke.push(
      `radnik će godišnji odmor koristiti u dva dijela, prvi dio u trajanju od ${input.prviDioDana} radnih dana`,
    );
    stavke.push(
      `Radnik će koristiti prvi dio godišnjeg odmora od ${formatDdMm(input.prviDioOdIso)} do ${formatDdMmYyyy(input.prviDioDoIso)}`,
    );
    stavke.push(
      `Drugi dio godišnjeg odmora radnik će iskoristiti do ${formatDdMmYyyy(input.drugiDioRokIso)} godine u skladu sa čl. 50. stav (2), uz prethodne konsultacije sa poslodavcem i planom korištenja godišnjih odmora.`,
    );
  } else if (input.nacin === "period") {
    stavke.push(
      `radnik će godišnji odmor koristiti u periodu od ${periodDana} radnih dana, odnosno od ${formatDdMmYyyy(input.cjelostiOdIso)} do ${formatDdMmYyyy(input.cjelostiDoIso)}`,
    );
  } else {
    stavke.push(
      `radnik će godišnji odmor koristiti u cjelosti, od ${formatDdMmYyyy(input.cjelostiOdIso)} do ${formatDdMmYyyy(input.cjelostiDoIso)}`,
    );
  }

  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu čl. 52. stav (2) i 112. Zakona o radu („Sl. novine FBiH“, broj 26/16 i 89/18), donosi se:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "RJEŠENJE O KORIŠTENJU GODIŠNJEG ODMORA",
    uvod,
    stavke,
    paragrafi: [
      "Za vrijeme korištenja godišnjeg odmora radnik ima pravo na naknadu plaće u skladu sa članom 52. stav (3) Zakona o radu.",
    ],
    obrazlozenje: input.ukljuciObrazlozenje
      ? "Raspored korištenja godišnjeg odmora utvrđen je u skladu sa Planom korištenja godišnjih odmora iz člana 52. stav (1) Zakona o radu, koji je donesen uz prethodnu konsultaciju sa radnicima ili njihovim predstavnicima u skladu sa zakonom, uzimajući u obzir potrebe posla, kao i opravdane razloge radnika."
      : undefined,
    pouka: input.ukljuciPouku
      ? `Protiv ovog rješenja može se uložiti pismeni prigovor poslodavcu, u roku ${input.rokPrigovora} dana od dana dostavljanja ovog rješenja.`
      : undefined,
    potpisnik: input.potpisnik,
  };
}
