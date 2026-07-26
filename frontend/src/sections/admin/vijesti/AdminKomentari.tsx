"use client";

/* Moderacija komentara: red prijavljenih i sakrivenih, sa odlukama.
   Naknadna moderacija znači da komentar živi dok ga neko ne prijavi; tri
   prijave ga automatski sakriju, a ovdje se donosi konačna odluka. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Modal from "src/components/Modal/Modal";
import {
  adminGetKomentari,
  adminOdlukaKomentar,
  adminBlokadaKorisnika,
  type ModKomentar,
} from "src/api/vijestiKomentari";
import { putanjaClanka } from "src/data/vijesti";
import { formatDate } from "src/lib/format";
import styles from "./adminVijesti.module.css";

export default function AdminKomentari() {
  const [filter, setFilter] = useState<"PRIJAVLJENI" | "SVI">("PRIJAVLJENI");
  const [stavke, setStavke] = useState<ModKomentar[]>([]);
  const [ucitavam, setUcitavam] = useState(true);
  const [greska, setGreska] = useState<string | null>(null);
  const [zaBrisanje, setZaBrisanje] = useState<ModKomentar | null>(null);

  const ucitaj = useCallback(async () => {
    setUcitavam(true);
    const res = await adminGetKomentari(filter);
    // greška se NE smije prikazati kao "nema komentara": to je ranije
    // izgledalo kao da je lista prazna iako zahtjev nije prošao
    if (!res.ok) {
      setGreska("Učitavanje nije uspjelo. Provjerite da li backend radi.");
      setStavke([]);
    } else {
      setGreska(null);
      setStavke(res.data ?? []);
    }
    setUcitavam(false);
  }, [filter]);

  useEffect(() => {
    // poziv ide kroz tajmer, da se setState ne desi u tijelu efekta
    // (pravilo react-hooks/set-state-in-effect)
    const t = setTimeout(() => void ucitaj(), 0);
    return () => clearTimeout(t);
  }, [ucitaj]);

  async function odluka(id: number, o: "SAKRIJ" | "VRATI" | "OBRISI") {
    const res = await adminOdlukaKomentar(id, o);
    if (!res.ok) {
      setGreska("Radnja nije uspjela.");
      return;
    }
    setGreska(null);
    await ucitaj();
  }

  async function blokada(userId: number, blokiran: boolean) {
    const res = await adminBlokadaKorisnika(userId, blokiran);
    if (!res.ok) {
      setGreska("Promjena blokade nije uspjela.");
      return;
    }
    await ucitaj();
  }

  return (
    <div className={styles.wrap}>
      <Link href="/admin/vijesti" className={styles.backLink}>
        &larr; Tekstovi
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Moderacija komentara</h1>
          <p className={styles.subtitle}>
            Komentar se objavljuje odmah, a tri prijave ga automatski sakriju
            dok ne odlučite. Ovdje su prijavljeni i sakriveni komentari.
          </p>
        </div>
      </div>

      <div className={styles.filters}>
        <button
          type="button"
          className={filter === "PRIJAVLJENI" ? styles.btnPrimary : styles.btnGhost}
          onClick={() => setFilter("PRIJAVLJENI")}
        >
          Za pregled
        </button>
        <button
          type="button"
          className={filter === "SVI" ? styles.btnPrimary : styles.btnGhost}
          onClick={() => setFilter("SVI")}
        >
          Svi komentari
        </button>
        {!ucitavam && stavke.length > 0 && (
          <span className={styles.subtitle} style={{ margin: 0 }}>
            {stavke.length} {stavke.length === 1 ? "komentar" : "komentara"}
          </span>
        )}
      </div>

      {greska && <p className={styles.error}>{greska}</p>}

      {ucitavam ? (
        <div className={styles.empty}>Učitavanje...</div>
      ) : stavke.length === 0 ? (
        <div className={styles.empty}>
          {filter === "PRIJAVLJENI"
            ? "Nema prijavljenih komentara. Sve je čisto."
            : "Još nema komentara."}
        </div>
      ) : (
        <div className={styles.modLista}>
          {stavke.map((k) => (
            <div
              key={k.id}
              className={`${styles.modKartica} ${k.status === "SAKRIVEN" ? styles.modKarticaSakrivena : ""}`}
            >
              <div className={styles.modHead}>
                <span className={styles.modAvatar}>
                  {(k.autor.potpis || "?").trim().charAt(0).toUpperCase()}
                </span>
                {k.autor.id != null ? (
                  <Link
                    href={`/vijesti/korisnik/${k.autor.id}`}
                    className={styles.modAutor}
                  >
                    {k.autor.potpis}
                  </Link>
                ) : (
                  <span className={styles.modAutor}>{k.autor.potpis}</span>
                )}
                <span className={styles.modDatum}>
                  {formatDate(k.createdAt)} &middot; {k.glasovi} glasova
                </span>
                <span className={styles.modBedzevi}>
                  {k.status === "SAKRIVEN" && (
                    <span className={`${styles.badge} ${styles.badgeProvjera}`}>
                      Sakriven
                    </span>
                  )}
                  {k.brojPrijava > 0 && (
                    <span className={`${styles.badge} ${styles.badgeProvjera}`}>
                      {k.brojPrijava} {k.brojPrijava === 1 ? "prijava" : "prijave"}
                    </span>
                  )}
                  {k.autor.blokiran && (
                    <span className={`${styles.badge} ${styles.badgeProvjera}`}>
                      Blokiran
                    </span>
                  )}
                </span>
              </div>

              <p className={styles.modTekst}>{k.tekst}</p>

              {k.clanak && (
                <p className={styles.modClanak}>
                  uz tekst
                  <Link
                    href={putanjaClanka(k.clanak.tip, k.clanak.slug)}
                    className={styles.modClanakLink}
                  >
                    {k.clanak.naslov}
                  </Link>
                </p>
              )}
              {k.tema && (
                <p className={styles.modClanak}>
                  u raspravi
                  <Link
                    href={`/rasprave/${k.tema.slug}`}
                    className={styles.modClanakLink}
                  >
                    {k.tema.naslov}
                  </Link>
                </p>
              )}

              <div className={styles.modAkcije}>
                {k.status === "SAKRIVEN" ? (
                  <button
                    type="button"
                    className={`${styles.modBtn} ${styles.modBtnGlavni}`}
                    onClick={() => void odluka(k.id, "VRATI")}
                  >
                    Vrati na sajt
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.modBtn}
                    onClick={() => void odluka(k.id, "SAKRIJ")}
                  >
                    Sakrij
                  </button>
                )}
                <button
                  type="button"
                  className={`${styles.modBtn} ${styles.modBtnOpasan}`}
                  onClick={() => setZaBrisanje(k)}
                >
                  Obriši
                </button>
                {k.autor.id != null && (
                  <button
                    type="button"
                    className={`${styles.modBtn} ${k.autor.blokiran ? "" : styles.modBtnOpasan}`}
                    onClick={() => void blokada(k.autor.id as number, !k.autor.blokiran)}
                  >
                    {k.autor.blokiran ? "Skini blokadu" : "Blokiraj korisnika"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        kind="confirm"
        open={zaBrisanje != null}
        variant="danger"
        title="Brisanje komentara"
        message={`Trajno ukloniti komentar korisnika ${zaBrisanje?.autor.potpis ?? ""}?`}
        confirmLabel="Obriši"
        cancelLabel="Odustani"
        onConfirm={() => {
          const k = zaBrisanje;
          setZaBrisanje(null);
          if (k) void odluka(k.id, "OBRISI");
        }}
        onClose={() => setZaBrisanje(null)}
      />
    </div>
  );
}
