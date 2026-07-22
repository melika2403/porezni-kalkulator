// FIFO raspodjela plaćanja na dokumente (računi/fakture) po datumu, najstariji
// prvi. Koristi se za IZVEDENI status naplate (Otvoren / Djelimično / Plaćen)
// bez pamćenja po dokumentu: ukupno potvrđeno plaćeno se rasporedi na otvorene
// dokumente. Ručno označen "plaćen" (gotovina van izvoda) je override i izuzet
// je iz pool-a.

function r2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * @param {Array<{id:number, iznos:number, datum:string, manualPlacen?:boolean, kredit?:boolean}>} docs
 *   kredit = knjižna obavijest / storno (umanjuje dug, ne naplaćuje se)
 * @param {number} pool  ukupno neraspoređeno plaćeno (potvrđene uplate/plaćanja)
 * @returns {Map<number, {placeno:number, preostalo:number, status:string}>}
 */
function allocateFifo(docs, pool) {
  let left = Math.max(0, r2(pool));
  const sorted = [...docs].sort((a, b) => {
    const da = String(a.datum || "");
    const db = String(b.datum || "");
    if (da !== db) return da < db ? -1 : 1;
    return (a.id || 0) - (b.id || 0);
  });
  const out = new Map();
  for (const d of sorted) {
    // krediti (KO/storno) nemaju status naplate; preskoči (ne troše pool)
    if (d.kredit) {
      out.set(d.id, { placeno: 0, preostalo: 0, status: "KREDIT" });
      continue;
    }
    const iznos = r2(d.iznos);
    if (d.manualPlacen) {
      out.set(d.id, { placeno: iznos, preostalo: 0, status: "PLACEN" });
      continue;
    }
    const placeno = Math.min(iznos, left);
    left = r2(left - placeno);
    const preostalo = r2(iznos - placeno);
    const status =
      preostalo <= 0.005 ? "PLACEN" : placeno > 0.005 ? "DJELIMICNO" : "OTVOREN";
    out.set(d.id, { placeno: r2(placeno), preostalo, status });
  }
  return out;
}

module.exports = { allocateFifo, r2 };
