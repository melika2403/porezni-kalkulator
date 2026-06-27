import type { RjesenjeComposed } from "../shared/composed";
import { formatDdMmYyyy } from "../shared/format";
import { zaglavljeOf, radnikDativ } from "../shared/parts";

// ── Odluka o korištenju službenog vozila u privatne svrhe ───────────────────
// Prati feature "korist u naravi" (vozilo): poslodavac odlukom imenuje vozilo i
// osobu, i utvrđuje metodu vrijednosti koristi. Korist diže osnovicu za
// doprinose/porez, ne umanjuje neto.
export interface OdlukaVoziloInput {
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
  opisVozila: string;
  metoda: "nabavna_1posto" | "lizing_20posto" | "stvarni_km";
  datumPrimjeneIso: string;
}

const METODA_FRAZA: Record<OdlukaVoziloInput["metoda"], string> = {
  nabavna_1posto:
    "u visini 1% nabavne vrijednosti vozila (sa PDV-om) za svaki mjesec korištenja",
  lizing_20posto:
    "u visini 20% mjesečne rate operativnog lizinga, odnosno dugotrajnog najma (sa PDV-om)",
  stvarni_km:
    "prema stvarnom obimu pređenih kilometara u privatne svrhe (uz vođenje evidencije)",
};

export function composeOdlukaVozilo(input: OdlukaVoziloInput): RjesenjeComposed {
  const radnik = radnikDativ(input.zenski);
  const vozilo = input.opisVozila.trim() || "službenog vozila poslodavca";
  const stavke: string[] = [
    `${radnik} ${input.imeRadnikaDativ}, na radnom mjestu ${input.radnoMjesto}, odobrava se korištenje službenog vozila ${vozilo} i u privatne svrhe.`,
    `Vrijednost koristi u naravi po osnovu korištenja vozila iz tačke 1. utvrđuje se ${METODA_FRAZA[input.metoda]}, te ulazi u osnovicu za obračun doprinosa i poreza na dohodak.`,
    "Korist u naravi se ne isplaćuje u novcu i ne umanjuje neto plaću radnika.",
  ];

  const stupa = input.datumPrimjeneIso
    ? `dana ${formatDdMmYyyy(input.datumPrimjeneIso)}`
    : "danom donošenja";

  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu čl. 10. Zakona o porezu na dohodak („Sl. novine FBiH“, broj 10/08, 9/10, 44/11, 7/13 i 65/13) i čl. 17. Pravilnika o primjeni Zakona o porezu na dohodak, poslodavac donosi:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "ODLUKA O KORIŠTENJU SLUŽBENOG VOZILA",
    stavke,
    paragrafi: [`Ova odluka stupa na snagu ${stupa}.`],
    dostaviti: ["računovodstvu", "imenovanom radniku", "arhivi"],
    potpisnik: input.potpisnik,
  };
}

// ── Odluka o promjeni plaće ─────────────────────────────────────────────────
// Po zakonu promjena plaće se formalizuje aneksom ugovora; ova odluka je interni
// akt kojim poslodavac utvrđuje novu plaću (vidi i composeAneks).
export interface OdlukaPlataInput {
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
  staraPlata: string;
  novaPlata: string;
  neto: boolean; // true = neto, false = bruto
  datumPrimjeneIso: string;
  razlog: string;
}

export function composeOdlukaPromjenaPlate(
  input: OdlukaPlataInput,
): RjesenjeComposed {
  const radnik = radnikDativ(input.zenski);
  const tip = input.neto ? "neto" : "bruto";
  const odKada = input.datumPrimjeneIso
    ? `počev od ${formatDdMmYyyy(input.datumPrimjeneIso)}`
    : "počev od narednog obračunskog perioda";
  const stavke: string[] = [
    `${radnik} ${input.imeRadnikaDativ}, na radnom mjestu ${input.radnoMjesto}, utvrđuje se ${tip} plaća u iznosu od ${input.novaPlata} KM, ${odKada}.`,
  ];
  if (input.staraPlata.trim()) {
    stavke.push(
      `Dosadašnja ${tip} plaća radnika iznosila je ${input.staraPlata} KM.`,
    );
  }
  if (input.razlog.trim()) {
    stavke.push(`Promjena plaće vrši se zbog: ${input.razlog.trim()}.`);
  }
  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu čl. 24. i čl. 72. Zakona o radu („Sl. novine FBiH“, broj 26/16 i 89/18) i Pravilnika o radu, poslodavac donosi:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "ODLUKA O PROMJENI PLAĆE",
    stavke,
    paragrafi: [
      "Na osnovu ove odluke sa radnikom će se zaključiti aneks ugovora o radu kojim se utvrđuje nova plaća.",
    ],
    dostaviti: ["imenovanom radniku", "računovodstvu", "arhivi"],
    potpisnik: input.potpisnik,
  };
}

// ── Pismeno upozorenje pred otkaz (čl. 96. ZoR) ─────────────────────────────
export interface UpozorenjeInput {
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
  povredaOpis: string;
  datumPovredeIso: string;
  rokIspravka: number;
}

export function composeUpozorenjeOtkaz(
  input: UpozorenjeInput,
): RjesenjeComposed {
  const radnik = radnikDativ(input.zenski);
  const kada = input.datumPovredeIso
    ? ` učinjene dana ${formatDdMmYyyy(input.datumPovredeIso)}`
    : "";
  const stavke: string[] = [
    `${radnik} ${input.imeRadnikaDativ}, na radnom mjestu ${input.radnoMjesto}, izriče se pismeno upozorenje zbog povrede radne obaveze${kada}.`,
    `Utvrđena povreda radne obaveze: ${input.povredaOpis.trim() || "(opis povrede)"}.`,
  ];
  if (input.rokIspravka > 0) {
    stavke.push(
      `Radnik se upozorava da u roku od ${input.rokIspravka} dana uredno izvršava radne obaveze i otkloni utvrđene nedostatke.`,
    );
  }
  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu čl. 96. Zakona o radu („Sl. novine FBiH“, broj 26/16 i 89/18), poslodavac izdaje:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "PISMENO UPOZORENJE PRED OTKAZ UGOVORA O RADU",
    stavke,
    paragrafi: [
      "Ukoliko radnik nastavi sa kršenjem radnih obaveza, poslodavac može otkazati ugovor o radu u skladu sa članom 96. Zakona o radu.",
    ],
    dostaviti: ["imenovanom radniku", "u personalni dosije radnika", "arhivi"],
    potpisnik: input.potpisnik,
  };
}

// ── Aneks ugovora o radu (dva potpisa) ──────────────────────────────────────
// Obje strane potpisuju (potpisRadnik postavljen).
export interface AneksInput {
  nazivFirme: string;
  adresaFirme: string;
  gradFirme: string;
  brojAkta: string;
  mjesto: string;
  datumDonosenjaIso: string;
  imeRadnika: string; // nominativ (ide i u potpis radnika)
  radnoMjesto: string;
  potpisnik: string;
  brojUgovora: string;
  datumUgovoraIso: string;
  staMijenja: string;
  novaSadrzina: string;
  datumPrimjeneIso: string;
}

export function composeAneks(input: AneksInput): RjesenjeComposed {
  const ugovor = `Ugovor o radu${input.brojUgovora.trim() ? ` broj ${input.brojUgovora.trim()}` : ""}${
    input.datumUgovoraIso ? ` od ${formatDdMmYyyy(input.datumUgovoraIso)}` : ""
  }`;
  const stupa = input.datumPrimjeneIso
    ? `dana ${formatDdMmYyyy(input.datumPrimjeneIso)}`
    : "danom potpisivanja";
  const stavke: string[] = [
    `Mijenja se ${input.staMijenja.trim() || "(navesti odredbu, npr. član 5.)"} ${ugovora(ugovor)}, tako da glasi:`,
    `„${input.novaSadrzina.trim() || "(nova sadržina odredbe)"}“`,
    "Ostale odredbe Ugovora o radu ostaju neizmijenjene i na snazi.",
    `Ovaj aneks stupa na snagu ${stupa} i čini sastavni dio Ugovora o radu.`,
  ];
  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      "Na osnovu čl. 24. Zakona o radu („Sl. novine FBiH“, broj 26/16 i 89/18), poslodavac i radnik zaključuju:",
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "ANEKS UGOVORA O RADU",
    uvod: `Ugovorne strane: poslodavac ${input.nazivFirme} i radnik ${input.imeRadnika}, na radnom mjestu ${input.radnoMjesto}, zaključuju ovaj aneks na ${ugovor}.`,
    stavke,
    dostaviti: ["radniku", "u personalni dosije radnika", "arhivi"],
    potpisnik: input.potpisnik,
    potpisRadnik: input.imeRadnika,
  };
}

// Pomoćni genitiv "Ugovora o radu ..." iz nominativa "Ugovor o radu ...".
function ugovora(nominativ: string): string {
  return nominativ.replace(/^Ugovor o radu/, "Ugovora o radu");
}
