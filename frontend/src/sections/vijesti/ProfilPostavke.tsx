"use client";

/* Postavke vlastitog profila u sekciji Vijesti: slika, način potpisa i
   korisničko ime. Prikazuje se samo vlasniku profila. */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMojePostavke,
  postaviPotpis,
  postaviAvatar,
  obrisiAvatar,
  type MojePostavke,
} from "src/api/vijestiKomentari";
import { Avatar } from "./Potpis";
import styles from "./vijesti.module.css";

export default function ProfilPostavke({ profilId }: { profilId: number }) {
  const [postavke, setPostavke] = useState<MojePostavke | null>(null);
  const [otvoreno, setOtvoreno] = useState(false);
  const [izbor, setIzbor] = useState<"nadimak" | "puno">("nadimak");
  const [ime, setIme] = useState("");
  const [poruka, setPoruka] = useState<string | null>(null);
  const [greska, setGreska] = useState<string | null>(null);
  const [salje, setSalje] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ucitaj = useCallback(async () => {
    const res = await getMojePostavke();
    if (!res.ok || !res.data) return;
    setPostavke(res.data);
    setIzbor(res.data.koristiPunoIme ? "puno" : "nadimak");
    setIme(res.data.javnoIme || "");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void ucitaj(), 0);
    return () => clearTimeout(t);
  }, [ucitaj]);

  // panel vidi samo vlasnik profila
  if (!postavke || postavke.id !== profilId) return null;

  async function sacuvaj() {
    setGreska(null);
    setPoruka(null);
    setSalje(true);
    const res =
      izbor === "puno"
        ? await postaviPotpis({ koristiPunoIme: true })
        : await postaviPotpis({ javnoIme: ime.trim() });
    setSalje(false);
    if (!res.ok) {
      setGreska(
        res.error === "IME_ZAUZETO"
          ? "To korisničko ime je zauzeto."
          : res.error === "IME_REZERVISANO"
            ? "To ime je rezervisano, jer podsjeća na zvanični nalog."
            : res.error === "PREKRATKO_IME"
              ? "Korisničko ime mora imati bar tri znaka."
              : res.error === "NEDOZVOLJENI_ZNAKOVI"
                ? "Dozvoljena su slova, brojevi, tačka, crtica i donja crta."
                : "Snimanje nije uspjelo.",
      );
      return;
    }
    setPoruka("Sačuvano. Potpis se mijenja i na starim komentarima.");
    await ucitaj();
  }

  async function posaljiSliku(file: File) {
    setGreska(null);
    setPoruka(null);
    const res = await postaviAvatar(file);
    if (!res.ok) {
      setGreska(
        res.error === "INVALID_IMAGE_TYPE"
          ? "Dozvoljeni formati su PNG, JPG i WEBP."
          : res.error === "LIMIT_FILE_SIZE"
            ? "Slika je prevelika, najviše 2 MB."
            : "Slanje slike nije uspjelo.",
      );
      return;
    }
    setPoruka("Slika je postavljena.");
    await ucitaj();
  }

  return (
    <div className={styles.sideBlok} style={{ marginBottom: "1.5rem" }}>
      <div className={styles.komHead} style={{ marginBottom: otvoreno ? "1rem" : 0 }}>
        <h2 className={styles.sideNaslov} style={{ margin: 0 }}>
          Moj profil
        </h2>
        <button
          type="button"
          className={`${styles.railDugme} ${styles.railDugmeMali}`}
          onClick={() => setOtvoreno((v) => !v)}
        >
          {otvoreno ? "Zatvori" : "Uredi profil"}
        </button>
      </div>

      {otvoreno && (
        <div>
          <div className={styles.profilHead} style={{ margin: "0 0 1rem" }}>
            <Avatar
              slika={postavke.avatar}
              sluzbeni={postavke.sluzbeni}
              ime={postavke.potpis}
              velicina={54}
            />
            <div className={styles.actionsRed}>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void posaljiSliku(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className={styles.railDugme}
                onClick={() => fileRef.current?.click()}
              >
                {postavke.avatar ? "Promijeni sliku" : "Dodaj sliku"}
              </button>
              {postavke.avatar && (
                <button
                  type="button"
                  className={`${styles.railDugme} ${styles.railDugmeMali}`}
                  onClick={async () => {
                    await obrisiAvatar();
                    await ucitaj();
                  }}
                >
                  Ukloni sliku
                </button>
              )}
              <span className={styles.railOznaka}>
                Kvadratna slika, do 2 MB.
              </span>
            </div>
          </div>

          <div className={styles.potpisIzbor}>
            <label
              className={`${styles.potpisOpcija} ${izbor === "nadimak" ? styles.potpisOpcijaAktivna : ""}`}
            >
              <input
                type="radio"
                checked={izbor === "nadimak"}
                onChange={() => setIzbor("nadimak")}
              />
              <span style={{ flex: 1 }}>
                <strong>Korisničko ime</strong>
                <input
                  className={styles.komPolje}
                  style={{ minHeight: 0, marginTop: "0.5rem", padding: "0.5rem 0.7rem" }}
                  value={ime}
                  onChange={(e) => setIme(e.target.value)}
                  onFocus={() => setIzbor("nadimak")}
                  placeholder="npr. knjigovodja_ze"
                  maxLength={40}
                />
              </span>
            </label>
            <label
              className={`${styles.potpisOpcija} ${izbor === "puno" ? styles.potpisOpcijaAktivna : ""}`}
            >
              <input
                type="radio"
                checked={izbor === "puno"}
                onChange={() => setIzbor("puno")}
              />
              <span>
                <strong>Ime i prezime sa profila</strong>
                <br />
                Potpisivaćete se kao {postavke.punoIme || "(nema imena na profilu)"}.
              </span>
            </label>
          </div>

          {greska && <p className={styles.komGreska}>{greska}</p>}
          {poruka && !greska && <p className={styles.railOznaka}>{poruka}</p>}

          <button
            type="button"
            className={styles.komSalji}
            onClick={() => void sacuvaj()}
            disabled={salje || (izbor === "nadimak" && ime.trim().length < 3)}
          >
            {salje ? "Snimam..." : "Sačuvaj"}
          </button>
        </div>
      )}
    </div>
  );
}
