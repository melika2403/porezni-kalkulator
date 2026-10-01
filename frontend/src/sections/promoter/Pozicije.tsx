"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import { getPregledKampanje } from "src/api/reklame";
import { POZICIJE, kratkoStranice } from "src/data/reklame";
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

      <div style={{ display: "grid", gap: 16 }}>
        {POZICIJE.map((poz) => {
          const naPoziciji = reklame.filter(
            (r) => r.pozicije.includes(poz.id) && (r.stanje === "UTOKU" || r.stanje === "ZAKAZANA"),
          );
          const redovi = (data?.poPoziciji ?? []).filter((r) => r.pozicija === poz.id);
          const prikazi = redovi.reduce((z, r) => z + r.prikazi, 0);
          const klikovi = redovi.reduce((z, r) => z + r.klikovi, 0);
          return (
            <section key={poz.id} className={p.kartica}>
              <div className={p.karticaGlava} style={{ marginBottom: 8 }}>
                <h2 className={p.karticaNaslov}>{poz.naziv}</h2>
                <span className={p.kpiSub}>
                  {fmtBroj(prikazi)} prikaza · {fmtBroj(klikovi)} klikova · CTR{" "}
                  <span className={p.ctr} style={{ color: "var(--pp-crvena-tamna)" }}>
                    {fmtCtr(prikazi, klikovi)}
                  </span>
                </span>
              </div>
              <p className={p.podnaslov} style={{ marginTop: 0, fontSize: 14 }}>
                {poz.opis}
              </p>
              <p className={p.napomena}>
                {naPoziciji.length === 0 ? (
                  "Trenutno nijedna kreativa nije na ovoj poziciji."
                ) : (
                  <>
                    Kreative:{" "}
                    {naPoziciji.map((r, i) => (
                      <span key={r.id}>
                        {i > 0 && ", "}
                        <Link href={`/promoter/kreative/${r.id}`}>{r.naziv}</Link>
                        {r.stanje === "ZAKAZANA" ? " (zakazana)" : ""} ·{" "}
                        {r.stranice.map(kratkoStranice).join(", ")}
                      </span>
                    ))}
                  </>
                )}
              </p>
            </section>
          );
        })}
      </div>
    </>
  );
}
