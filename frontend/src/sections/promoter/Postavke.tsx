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
      <td className={p.postavkeKljuc}>{k}</td>
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

      <div className={p.postavkeMreza}>
        <section className={p.kartica}>
          <h2 className={`${p.karticaNaslov} ${p.karticaNaslovRazmak}`}>Nalog</h2>
          <table className={p.tabela}>
            <tbody>
              {red("Ime", `${korisnik?.firstName ?? ""} ${korisnik?.lastName ?? ""}`.trim() || "–")}
              {red("Email", korisnik?.email ?? "–")}
              {red("Uloga", korisnik?.role === "ADMIN" ? "Admin" : "Oglašivač")}
            </tbody>
          </table>
          <div className={p.napomenaRed}>
            <p className={p.napomenaTekst}>Lozinku i dvofaktorsku prijavu mijenjate na profilu.</p>
            <Link href="/profil" className={p.dugmeMalo}>
              Otvori profil
            </Link>
          </div>
        </section>

        <section className={p.kartica}>
          <h2 className={`${p.karticaNaslov} ${p.karticaNaslovRazmak}`}>Brend</h2>
          {zadnja ? (
            <table className={p.tabela}>
              <tbody>
                {red("Naziv", zadnja.brend)}
                {red(
                  "Boja",
                  <span className={p.bojaPrikaz}>
                    <span
                      className={p.bojaKvadrat}
                      style={{ background: zadnja.boja }}
                      aria-hidden="true"
                    />
                    <code>{zadnja.boja}</code>
                  </span>,
                )}
                {red(
                  "Logo",
                  logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={logo} alt={zadnja.brend} className={p.brendLogo} />
                  ) : (
                    "nije učitan (ispisuje se naziv)"
                  ),
                )}
              </tbody>
            </table>
          ) : (
            <p className={p.prazno}>Brend se postavlja pri izradi prve kreative.</p>
          )}
          <div className={p.napomenaRed}>
            <p className={p.napomenaTekst}>
              Nova kreativa preuzima naziv, boju i logo iz zadnje. Za promjenu ugovora ili pristupa
              javite nam se.
            </p>
            <Link href="/kontakt" className={p.dugmeMalo}>
              Kontakt
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
