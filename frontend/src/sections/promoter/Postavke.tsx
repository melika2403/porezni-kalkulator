"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { getMojeReklame, reklamaSlikaUrl } from "src/api/partner";
import { REKLAME_KEY } from "./kljucevi";
import p from "./portal.module.css";

// Podaci naloga i brenda. Brend (naziv, boja, logo) se uzima iz zadnje
// kreative i predlaže se svakoj novoj; mijenja se u samoj kreativi.
export default function Postavke() {
  const { data: korisnik } = useQuery({ queryKey: ["me"], queryFn: () => unwrap(me()) });
  const { data: reklame } = useQuery({
    queryKey: REKLAME_KEY,
    queryFn: () => unwrap(getMojeReklame()),
  });
  const zadnja = reklame?.[0];
  const logo = reklamaSlikaUrl(zadnja?.logoUrl ?? null);

  const red = (k: string, v: React.ReactNode) => (
    <tr>
      <td style={{ color: "var(--pp-muted)", width: 220 }}>{k}</td>
      <td>{v}</td>
    </tr>
  );

  return (
    <>
      <div className={p.zaglavlje}>
        <div>
          <h1 className={p.naslov}>Postavke</h1>
          <p className={p.podnaslov}>Nalog i brend za koji se prikazuju kreative.</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, maxWidth: 820 }}>
        <section className={p.kartica}>
          <h2 className={p.karticaNaslov} style={{ marginBottom: 12 }}>
            Nalog
          </h2>
          <table className={p.tabela}>
            <tbody>
              {red("Ime", `${korisnik?.firstName ?? ""} ${korisnik?.lastName ?? ""}`.trim() || "–")}
              {red("Email", korisnik?.email ?? "–")}
              {red("Uloga", korisnik?.role === "ADMIN" ? "Admin" : "Oglašivač")}
            </tbody>
          </table>
          <p className={p.napomena}>
            Lozinku i dvofaktorsku prijavu mijenjate na <Link href="/profil">profilu</Link>.
          </p>
        </section>

        <section className={p.kartica}>
          <h2 className={p.karticaNaslov} style={{ marginBottom: 12 }}>
            Brend
          </h2>
          {zadnja ? (
            <table className={p.tabela}>
              <tbody>
                {red("Naziv", zadnja.brend)}
                {red(
                  "Boja",
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{ width: 18, height: 18, borderRadius: 4, background: zadnja.boja }}
                      aria-hidden="true"
                    />
                    <code>{zadnja.boja}</code>
                  </span>,
                )}
                {red(
                  "Logo",
                  logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={logo} alt={zadnja.brend} style={{ maxHeight: 32 }} />
                  ) : (
                    "nije učitan (ispisuje se naziv)"
                  ),
                )}
              </tbody>
            </table>
          ) : (
            <p className={p.prazno}>Brend se postavlja pri izradi prve kreative.</p>
          )}
          <p className={p.napomena}>
            Nova kreativa preuzima naziv, boju i logo iz zadnje. Za promjenu ugovora ili pristupa
            javite nam se putem <Link href="/kontakt">kontakt stranice</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
