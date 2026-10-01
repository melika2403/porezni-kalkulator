"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import { getPregledKampanje } from "src/api/partner";
import { POZICIJE, kratkoStranice } from "src/data/partner";
import { fmtBroj, fmtCtr, porukaGreske } from "./format";
import { PREGLED_KEY } from "./kljucevi";
import p from "./portal.module.css";

// Oglasna mjesta na sajtu: šta je koja pozicija, koje kreative je trenutno
// zauzimaju i kako je radila zadnjih 30 dana.
export default function Pozicije() {
  const { data, isLoading, error } = useQuery({
    queryKey: PREGLED_KEY(30),
    queryFn: () => unwrap(getPregledKampanje(30)),
  });
  const reklame = data?.reklame ?? [];

  return (
    <>
      <div className={p.zaglavlje}>
        <div>
          <h1 className={p.naslov}>Pozicije</h1>
          <p className={p.podnaslov}>
            Oglasna mjesta na Poreznom kalkulatoru. Brojke su za zadnjih 30 dana.
          </p>
        </div>
      </div>

      {error && <p className={p.greska}>{porukaGreske(error)}</p>}
      {isLoading && <p className={p.prazno}>Učitavanje...</p>}

      <div className={p.pozicijeMreza}>
        {POZICIJE.map((poz) => {
          const naPoziciji = reklame.filter(
            (r) => r.pozicije.includes(poz.id) && (r.stanje === "UTOKU" || r.stanje === "ZAKAZANA"),
          );
          const redovi = (data?.poPoziciji ?? []).filter((r) => r.pozicija === poz.id);
          const prikazi = redovi.reduce((z, r) => z + r.prikazi, 0);
          const klikovi = redovi.reduce((z, r) => z + r.klikovi, 0);
          return (
            <section key={poz.id} className={p.kartica}>
              <div className={`${p.karticaGlava} ${p.karticaGlavaUska}`}>
                <h2 className={p.karticaNaslov}>{poz.naziv}</h2>
                <span className={p.kpiSub}>
                  {fmtBroj(prikazi)} prikaza · {fmtBroj(klikovi)} klikova · CTR{" "}
                  <span className={`${p.ctr} ${p.ctrTamni}`}>
                    {fmtCtr(prikazi, klikovi)}
                  </span>
                </span>
              </div>
              <p className={`${p.podnaslov} ${p.pozicijaOpis}`}>
                {poz.opis}
              </p>
              {naPoziciji.length === 0 ? (
                <p className={p.napomena}>Trenutno nijedna kreativa nije na ovoj poziciji.</p>
              ) : (
                <div className={p.pozicijaKreative}>
                  {naPoziciji.map((r) => (
                    <Link key={r.id} href={`/partner/kreative/${r.id}`} className={p.dugmeMalo}>
                      {r.naziv}
                      {r.stanje === "ZAKAZANA" ? " (zakazana)" : ""} ·{" "}
                      {r.stranice.map(kratkoStranice).join(", ")}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
