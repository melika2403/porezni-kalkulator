import type { RjesenjeComposed } from "../shared/composed";
import { formatDdMmYyyy } from "../shared/format";
import { zaglavljeOf } from "../shared/parts";

// ── Odluka o visini blagajničkog maksimuma ──────────────────────────────────
// Akt FIRME (ne radnika): obavezan za svakog ko drži gotov novac u blagajni.
// Pravni osnov: član 7. stav (2) Uredbe o uslovima i načinu plaćanja gotovim
// novcem ("Službene novine FBiH", br. 72/15 i 82/15): visinu maksimuma
// poslovni subjekt utvrđuje odlukom, na osnovu prosječnih dnevnih isplata iz
// blagajne u prethodnom mjesecu i drugih uslova. Član 8: gotov novac iz
// djelatnosti se uplaćuje na račun istog, a najkasnije narednog radnog dana.
export interface BlagajnickiMaksimumInput {
  nazivFirme: string;
  adresaFirme: string;
  gradFirme: string;
  brojAkta: string;
  mjesto: string;
  datumDonosenjaIso: string;
  potpisnik: string;
  /** iznos maksimuma u KM (npr. "500,00") */
  iznos: string;
  /** opciono: osoba zadužena za blagajnu */
  zaduzeni: string;
  /** opciono: datum od kada se primjenjuje; prazno = danom donošenja */
  datumPrimjeneIso: string;
  /** uključi rečenicu o načinu utvrđivanja visine (prosječne dnevne isplate) */
  ukljuciOsnov: boolean;
  /** uključi odredbu o uplati pazara na račun (najkasnije naredni radni dan) */
  ukljuciPazar: boolean;
}

export function composeOdlukaBlagajnickiMaksimum(
  input: BlagajnickiMaksimumInput,
): RjesenjeComposed {
  const stupa = input.datumPrimjeneIso
    ? `dana ${formatDdMmYyyy(input.datumPrimjeneIso)}`
    : "danom donošenja";
  const stavke: string[] = [
    `Utvrđuje se blagajnički maksimum, najviši iznos gotovog novca koji se može držati u blagajni, u visini od ${input.iznos} KM.`,
  ];
  if (input.ukljuciOsnov) {
    stavke.push(
      "Visina blagajničkog maksimuma utvrđena je na osnovu prosječnih dnevnih isplata iz blagajne u prethodnom mjesecu i drugih uslova od uticaja na potrebu držanja gotovog novca u blagajni.",
    );
  }
  if (input.ukljuciPazar) {
    stavke.push(
      "Gotov novac ostvaren obavljanjem registrovane djelatnosti uplaćuje se na transakcijski račun istog radnog dana, a najkasnije narednog radnog dana. U blagajnički maksimum ne ulazi gotov novac podignut sa računa za dozvoljene namjene, pod uslovom da se isplati istog ili narednog dana od dana podizanja.",
    );
  }
  if (input.zaduzeni.trim()) {
    stavke.push(
      `Za vođenje blagajne i provođenje ove odluke zadužuje se ${input.zaduzeni.trim()}.`,
    );
  }
  stavke.push(`Ova odluka stupa na snagu ${stupa}.`);
  return {
    zaglavlje: zaglavljeOf(input),
    pravniOsnov:
      'Na osnovu člana 7. stav (2) Uredbe o uslovima i načinu plaćanja gotovim novcem ("Službene novine Federacije BiH", br. 72/15 i 82/15), poslodavac donosi:',
    brojAkta: input.brojAkta,
    mjestoDatum: `U ${input.mjesto || "Sarajevu"}, dana ${formatDdMmYyyy(input.datumDonosenjaIso)}`,
    naslov: "ODLUKA O VISINI BLAGAJNIČKOG MAKSIMUMA",
    stavke,
    dostaviti: ["blagajni", "računovodstvu", "arhivi"],
    potpisnik: input.potpisnik,
  };
}
