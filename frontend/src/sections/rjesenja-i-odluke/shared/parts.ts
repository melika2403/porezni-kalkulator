// Zajednički gradivni dijelovi za compose funkcije (dijele ih svi dokumenti).

// Zaglavlje firme kao niz nepraznih linija (naziv, adresa, grad).
export function zaglavljeOf(input: {
  nazivFirme: string;
  adresaFirme: string;
  gradFirme: string;
}): string[] {
  return [input.nazivFirme, input.adresaFirme, input.gradFirme].filter(
    (x) => x && x.trim(),
  );
}

// Radnik u dativu prema rodu, za formulacije "...odobrava se / utvrđuje se ...".
export function radnikDativ(zenski: boolean): string {
  return zenski ? "Radnici" : "Radniku";
}
