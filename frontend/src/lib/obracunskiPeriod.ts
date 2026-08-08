// Default mjesec za obračunske preglede (obračun plata, pregled organizacija,
// dashboard kartica plata). Do 15. u mjesecu (uključivo) u praksi se još
// obračunavaju i isplaćuju plate PRETHODNOG mjeseca, pa se on otvara kao
// default; od 16. se otvara tekući mjesec. Korisnik naravno može ručno
// promijeniti mjesec, ovo je samo početni izbor.
export function defaultObracunPeriod(now: Date = new Date()): {
  year: number;
  month: number;
} {
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  if (now.getDate() <= 15) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return { year, month };
}
