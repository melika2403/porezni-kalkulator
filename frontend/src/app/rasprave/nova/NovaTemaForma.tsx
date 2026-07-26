"use client";

/* Otvaranje nove teme. Prijavljen korisnik bez izabranog potpisa prvo prolazi
   kroz isti izbor potpisa kao kod komentara, pa se tema odmah objavi. */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { kreirajTemu, type TemaVrsta } from "src/api/rasprave";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import PotpisModal from "src/sections/vijesti/PotpisModal";
import { RUBRIKE } from "src/data/vijesti";
import styles from "src/sections/vijesti/vijesti.module.css";

const MAX_TEKST = 10000;

function greskaTekst(kod: string): string {
  switch (kod) {
    case "KRATAK_NASLOV":
      return "Naslov mora imati bar deset znakova, napišite konkretno pitanje.";
    case "KRATAK_TEKST":
      return "Opišite situaciju u bar par rečenica.";
    case "PREVISE_LINKOVA":
      return "Previše linkova u tekstu.";
    case "PREVISE":
      return "Dostigli ste ograničenje broja novih tema po satu.";
    case "BLOKIRAN":
      return "Vaš nalog trenutno ne može objavljivati.";
    default:
      return "Objava nije uspjela, pokušajte ponovo.";
  }
}

export default function NovaTemaForma() {
  const router = useRouter();
  const [naslov, setNaslov] = useState("");
  const [tekst, setTekst] = useState("");
  const [vrsta, setVrsta] = useState<TemaVrsta>("PITANJE");
  const [rubrika, setRubrika] = useState("");
  const [greska, setGreska] = useState<string | null>(null);
  const [salje, setSalje] = useState(false);
  const [trebaPotpis, setTrebaPotpis] = useState(false);

  const { data: korisnik, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  // ista pravila kao na serveru (naslov 10+, tekst 20+ znakova), samo se ovdje
  // razlog vidi umjesto da dugme ćuti sivo
  const nedostajeNaslov = 10 - naslov.trim().length;
  const nedostajeTekst = 20 - tekst.trim().length;
  const nedostaje =
    nedostajeNaslov > 0
      ? `Naslov: još najmanje ${nedostajeNaslov} ${nedostajeNaslov === 1 ? "znak" : nedostajeNaslov < 5 ? "znaka" : "znakova"}`
      : nedostajeTekst > 0
        ? `Tekst: još najmanje ${nedostajeTekst} ${nedostajeTekst === 1 ? "znak" : nedostajeTekst < 5 ? "znaka" : "znakova"}`
        : null;

  if (!isLoading && !korisnik) {
    return (
      <p className={styles.komPrijava}>
        Teme otvaraju prijavljeni korisnici.{" "}
        <Link
          href={`/prijava?next=${encodeURIComponent("/rasprave/nova")}`}
          className={styles.komPrijavaLink}
        >
          Prijavite se
        </Link>{" "}
        ili{" "}
        <Link
          href={`/registracija?next=${encodeURIComponent("/rasprave/nova")}`}
          className={styles.komPrijavaLink}
        >
          napravite besplatan nalog
        </Link>
        .
      </p>
    );
  }

  async function objavi() {
    setGreska(null);
    setSalje(true);
    const res = await kreirajTemu({
      naslov: naslov.trim(),
      tekst: tekst.trim(),
      vrsta,
      rubrika: rubrika || null,
    });
    setSalje(false);
    if (!res.ok) {
      if (res.error === "POTPIS_NIJE_IZABRAN") {
        setTrebaPotpis(true);
        return;
      }
      setGreska(greskaTekst(res.error || ""));
      return;
    }
    router.push(`/rasprave/${res.data?.slug}`);
  }

  return (
    <div className={styles.temaForma}>
      <div>
        <label className={styles.temaLabel} htmlFor="tema-naslov">
          Naslov
        </label>
        <input
          id="tema-naslov"
          className={styles.temaInput}
          value={naslov}
          onChange={(e) => setNaslov(e.target.value)}
          placeholder="npr. Kako knjižite naknadu za bolovanje preko 42 dana?"
          maxLength={255}
        />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ minWidth: 180 }}>
          <label className={styles.temaLabel}>Vrsta</label>
          <StyledSelect
            ariaLabel="Vrsta teme"
            wrapStyle={{ width: "100%" }}
            value={vrsta}
            onChange={(v) => setVrsta((v as TemaVrsta) || "PITANJE")}
            groups={[
              {
                options: [
                  { value: "PITANJE", label: "Pitanje, tražim odgovor" },
                  { value: "RASPRAVA", label: "Rasprava, razmjena iskustava" },
                ],
              },
            ]}
          />
        </div>
        <div style={{ minWidth: 200 }}>
          <label className={styles.temaLabel}>Oblast (opciono)</label>
          <StyledSelect
            ariaLabel="Oblast teme"
            wrapStyle={{ width: "100%" }}
            value={rubrika}
            onChange={(v) => setRubrika(String(v ?? ""))}
            groups={[
              {
                options: [
                  { value: "", label: "Bez oblasti" },
                  ...RUBRIKE.filter((r) => r.id !== "vodici").map((r) => ({
                    value: r.id,
                    label: r.naziv,
                  })),
                ],
              },
            ]}
          />
        </div>
      </div>

      <div>
        <label className={styles.temaLabel} htmlFor="tema-tekst">
          Tekst
        </label>
        <textarea
          id="tema-tekst"
          className={styles.komPolje}
          style={{ minHeight: 180 }}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Opišite situaciju: šta se desilo, koji je propis ili obrazac u pitanju, šta ste već pokušali. Što konkretnije, to bolji odgovori."
          maxLength={MAX_TEKST}
        />
        <span className={styles.komBrojac}>
          {tekst.length}/{MAX_TEKST}
        </span>
      </div>

      <p className={styles.temaNapomena}>
        Tema je javna, kao i vaš potpis. Odgovori korisnika nisu službeni
        savjet Poreznog Kalkulatora. Bez ličnih podataka klijenata (JMBG,
        imena, iznosi koji nekoga otkrivaju).
      </p>

      {greska && <p className={styles.komGreska}>{greska}</p>}

      <div className={styles.komFormaRed}>
        <Link href="/rasprave" className={styles.komPrijavaBtn}>
          Odustani
        </Link>
        <div style={{ display: "grid", gap: "0.3rem", justifyItems: "end" }}>
          <button
            type="button"
            className={styles.komSalji}
            onClick={() => void objavi()}
            disabled={salje || !!nedostaje}
          >
            {salje ? "Objavljujem..." : "Objavi temu"}
          </button>
          {/* dugme se ne smije samo sivo zaključati: kaže se i zašto */}
          {nedostaje && <span className={styles.komBrojac}>{nedostaje}</span>}
        </div>
      </div>

      {trebaPotpis && korisnik && (
        <PotpisModal
          punoIme={`${korisnik.firstName ?? ""} ${korisnik.lastName ?? ""}`.trim()}
          onOdustani={() => setTrebaPotpis(false)}
          onGotovo={async () => {
            setTrebaPotpis(false);
            await objavi();
          }}
        />
      )}
    </div>
  );
}
