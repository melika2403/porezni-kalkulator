"use client";

/* Sva obavještenja na vlastitom profilu (vidljivo samo vlasniku).
   Otvaranje bloka označava sve pročitanim. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  getObavjestenja,
  procitajObavjestenja,
  type Obavjestenje,
} from "src/api/vijestiKomentari";
import { Avatar } from "./Potpis";
import { relativnoVrijeme } from "src/lib/vijestiServer";
import styles from "./vijesti.module.css";

function opis(o: Obavjestenje): string {
  const ko = o.akter?.potpis ?? "Korisnik";
  switch (o.tip) {
    case "ODGOVOR_KOMENTAR":
      return `Novi odgovor na vaš komentar (${ko})`;
    case "ODGOVOR_TEMA":
      return `Novi odgovor u vašoj temi (${ko})`;
    case "GLAS_PLUS":
      return o.brojac === 1
        ? `${ko} smatra vaš komentar korisnim`
        : `${o.brojac} korisnika smatra vaš komentar korisnim`;
    case "GLAS_MINUS":
      return o.brojac === 1
        ? `${ko} je dao minus vašem komentaru`
        : `${o.brojac} korisnika je dalo minus vašem komentaru`;
    case "RJESENJE":
      return "Vaš odgovor je označen kao rješenje";
    default:
      return "Obavještenje";
  }
}

export default function MojaObavjestenja({ profilId }: { profilId: number }) {
  const [ucitano, setUcitano] = useState(false);
  const queryClient = useQueryClient();

  const { data: korisnik } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });
  const mojProfil = !!korisnik && korisnik.id === profilId;

  const { data: obavjestenja = [] } = useQuery({
    queryKey: ["vijesti-obavjestenja"],
    queryFn: () => unwrap(getObavjestenja()).catch(() => []),
    enabled: mojProfil,
    retry: false,
  });

  // dolazak na vlastiti profil gasi značku (kroz tajmer, da setState ne
  // padne u tijelo efekta, pravilo react-hooks/set-state-in-effect)
  useEffect(() => {
    if (!mojProfil || ucitano) return;
    const t = setTimeout(() => {
      setUcitano(true);
      void procitajObavjestenja().then(() => {
        void queryClient.invalidateQueries({
          queryKey: ["vijesti-obavjestenja-broj"],
        });
      });
    }, 0);
    return () => clearTimeout(t);
  }, [mojProfil, ucitano, queryClient]);

  if (!mojProfil) return null;

  return (
    <div
      id="obavjestenja"
      className={styles.sideBlok}
      style={{ marginBottom: "1.5rem" }}
    >
      <h2 className={styles.sideNaslov}>Obavještenja</h2>
      {obavjestenja.length === 0 ? (
        <p className={styles.profilPanelPrazno}>
          Još nema obavještenja. Stižu kad neko odgovori na vaš komentar ili
          temu, ili glasa o vašem komentaru.
        </p>
      ) : (
        <ul className={styles.profilPanelLista}>
          {obavjestenja.map((o) => (
            <li key={o.id}>
              <Link href={o.link} className={styles.profilPanelItem}>
                <Avatar
                  slika={o.akter?.avatar ?? null}
                  sluzbeni={o.akter?.sluzbeni}
                  ime={o.akter?.potpis || "?"}
                  velicina={28}
                />
                <span className={styles.profilPanelTekst}>
                  <span className={styles.profilPanelOpis}>
                    {opis(o)}
                    {!o.procitano && (
                      <span
                        className={styles.profilZnacka}
                        style={{ position: "static", marginLeft: 6 }}
                      >
                        novo
                      </span>
                    )}
                  </span>
                  {o.izvod && (
                    <span className={styles.profilPanelNaslov}>{o.izvod}</span>
                  )}
                  {o.naslov && (
                    <span className={styles.profilPanelNaslov}>{o.naslov}</span>
                  )}
                  <span className={styles.profilPanelVrijeme}>
                    {relativnoVrijeme(o.vrijeme)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
