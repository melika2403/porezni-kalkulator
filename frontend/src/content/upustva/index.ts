// Registry uputstava: slug (segment rute u /app) → sadržaj uputstva.
// HelpButton dobije slug uz naslov stranice i otvori odgovarajuće uputstvo.
// Nova tema = novi fajl + jedan red ovdje.

import type { Upustvo } from "./types";
import { dashboard } from "./dashboard";
import { inbox } from "./inbox";
import { bankovniIzvodi } from "./bankovni-izvodi";
import { transakcije } from "./transakcije";
import { fakture } from "./fakture";
import { blagajna } from "./blagajna";
import { partneri } from "./partneri";
import { kpr } from "./kpr";
import { pdv } from "./pdv";
import { obrasci } from "./obrasci";
import { stalnaSredstva } from "./stalna-sredstva";
import { kalkulacije } from "./kalkulacije";
import { lager } from "./lager";
import { zaposlenici } from "./zaposlenici";
import { obracuniPlata } from "./obracuni-plata";
import { putniNalozi } from "./putni-nalozi";
import { soloPocetna } from "./solo-pocetna";
import { soloPrviMjesec } from "./solo-prvi-mjesec";
import { soloKrajGodine } from "./solo-kraj-godine";
import { soloRjecnik } from "./solo-rjecnik";

export const UPUSTVA: Record<string, Upustvo> = {
  // PK Office Solo ("vodim sam sebi"): vodiči korak po korak sa naslovnice
  "solo-pocetna": soloPocetna,
  "solo-prvi-mjesec": soloPrviMjesec,
  "solo-kraj-godine": soloKrajGodine,
  "solo-rjecnik": soloRjecnik,
  dashboard,
  inbox,
  "bankovni-izvodi": bankovniIzvodi,
  transakcije,
  fakture,
  blagajna,
  partneri,
  kpr,
  pdv,
  obrasci,
  "stalna-sredstva": stalnaSredstva,
  kalkulacije,
  lager,
  zaposlenici,
  "obracuni-plata": obracuniPlata,
  "putni-nalozi": putniNalozi,
};

export function upustvoZaSlug(slug: string | null): Upustvo | null {
  if (!slug) return null;
  return UPUSTVA[slug] ?? null;
}

export type { Upustvo } from "./types";
