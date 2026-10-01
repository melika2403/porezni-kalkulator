"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { preuzmiMjesecniIzvjestaj } from "src/api/partner";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import { porukaGreske } from "./format";
import p from "./portal.module.css";

const MJESECI = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

// zadnjih 12 mjeseci, najnoviji prvi; tekući mjesec ide "do danas"
function zadnjiMjeseci(): { value: string; label: string }[] {
  const sada = new Date();
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(sada.getFullYear(), sada.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({
      value,
      label: `${MJESECI[d.getMonth()]} ${d.getFullYear()}.${i === 0 ? " (do danas)" : ""}`,
    });
  }
  return out;
}

/**
 * Mjesečni PDF izvještaj kampanje: ključne brojke uz poređenje sa prošlim
 * mjesecom, prikazi i klikovi po danu, tabele po poziciji, stranici i
 * kreativi. Za proslijediti upravi; ne šalje se automatski.
 */
export default function MjesecniIzvjestaj() {
  const mjeseci = useMemo(zadnjiMjeseci, []);
  // podrazumijevano prošli (zaključen) mjesec
  const [mjesec, setMjesec] = useState(mjeseci[1].value);
  const preuzmi = useMutation({ mutationFn: () => preuzmiMjesecniIzvjestaj(mjesec) });

  return (
    <section className={`${p.kartica} ${p.izvjestajKartica}`}>
      <div className={p.izvjestajTekst}>
        <h2 className={p.karticaNaslov}>Mjesečni izvještaj (PDF)</h2>
        <p className={p.napomenaTekst}>
          Jedna strana za upravu: prikazi, klikovi, CTR, jedinstveni posjetioci i udio mobitela uz
          poređenje sa prošlim mjesecom, grafikon po danu i rezultati po poziciji, stranici i
          kreativi.
        </p>
        {preuzmi.error && <p className={p.greska}>{porukaGreske(preuzmi.error)}</p>}
      </div>
      <div className={p.akcijeZaglavlja}>
        <StyledSelect
          className={p.select}
          wrapStyle={{ minWidth: 220 }}
          value={mjesec}
          onChange={(v) => setMjesec(String(v))}
          ariaLabel="Mjesec izvještaja"
          groups={[{ options: mjeseci }]}
        />
        <button
          type="button"
          className={p.dugmeZeleno}
          disabled={preuzmi.isPending}
          onClick={() => preuzmi.mutate()}
        >
          {preuzmi.isPending ? "Priprema..." : "Preuzmi PDF"}
        </button>
      </div>
    </section>
  );
}
