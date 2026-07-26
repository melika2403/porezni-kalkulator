"use client";

/* Izbor potpisa prije prvog komentara. Korisnici su se registrovali poslovno,
   punim imenom, pa im to ime NE ide javno bez pitanja: biraju korisničko ime
   ili ime sa profila. Izbor se poslije mijenja u postavkama profila. */

import { useState } from "react";
import { postaviPotpis } from "src/api/vijestiKomentari";
import styles from "./vijesti.module.css";

export default function PotpisModal({
  punoIme,
  onGotovo,
  onOdustani,
}: {
  punoIme: string;
  onGotovo: (potpis: string) => void;
  onOdustani: () => void;
}) {
  const [izbor, setIzbor] = useState<"nadimak" | "puno">("nadimak");
  const [ime, setIme] = useState("");
  const [greska, setGreska] = useState<string | null>(null);
  const [salje, setSalje] = useState(false);

  async function potvrdi() {
    setGreska(null);
    setSalje(true);
    const res =
      izbor === "puno"
        ? await postaviPotpis({ koristiPunoIme: true })
        : await postaviPotpis({ javnoIme: ime.trim() });
    setSalje(false);
    if (!res.ok) {
      setGreska(
        res.error === "IME_ZAUZETO"
          ? "To korisničko ime je zauzeto, izaberi drugo."
          : res.error === "PREKRATKO_IME"
            ? "Korisničko ime mora imati bar tri znaka."
            : res.error === "NEDOZVOLJENI_ZNAKOVI"
              ? "Dozvoljena su slova, brojevi, tačka, crtica i donja crta."
              : "Snimanje nije uspjelo, pokušaj ponovo.",
      );
      return;
    }
    onGotovo(res.data?.potpis || ime.trim());
  }

  return (
    <div className={styles.potpisModal} role="dialog" aria-modal="true">
      <div className={styles.potpisKutija}>
        <h2 className={styles.potpisNaslov}>Kako da vas potpišemo?</h2>
        <p className={styles.potpisTekst}>
          Ovo ime će stajati uz vaše komentare i biće javno vidljivo, zajedno sa
          spiskom vaših komentara. Birate jednom, a poslije možete promijeniti.
        </p>

        <div className={styles.potpisIzbor}>
          <label
            className={`${styles.potpisOpcija} ${izbor === "nadimak" ? styles.potpisOpcijaAktivna : ""}`}
          >
            <input
              type="radio"
              checked={izbor === "nadimak"}
              onChange={() => setIzbor("nadimak")}
            />
            <span>
              <strong>Korisničko ime</strong>
              <br />
              Vaše pravo ime ostaje privatno.
              <br />
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
              Potpisivaćete se kao <strong>{punoIme}</strong>.
            </span>
          </label>
        </div>

        {greska && <p className={styles.komGreska}>{greska}</p>}

        <div className={styles.komFormaRed}>
          <button type="button" className={styles.komAkcija} onClick={onOdustani}>
            Odustani
          </button>
          <button
            type="button"
            className={styles.komSalji}
            onClick={potvrdi}
            disabled={salje || (izbor === "nadimak" && ime.trim().length < 3)}
          >
            {salje ? "Snimam..." : "Potvrdi i objavi"}
          </button>
        </div>
      </div>
    </div>
  );
}
