"use client";

/* Klijentski dio stranice teme: tekst teme (sa izmjenom), odgovori kroz
   postojeću komponentu komentara, prihvatanje najboljeg odgovora (autor teme
   ili admin) i admin radnje. */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  prihvatiOdgovor,
  adminRadnjaTema,
  izmijeniTekstTeme,
  type Tema,
} from "src/api/rasprave";
import Komentari from "./Komentari";
import Modal from "src/components/Modal/Modal";
import styles from "./vijesti.module.css";

// koliko dugo autor smije mijenjati svoj tekst; server provjerava isto
const IZMJENA_MINUTA = 15;

function greskaIzmjene(kod: string): string {
  switch (kod) {
    case "ISTEKLO_VRIJEME":
      return `Prošlo je ${IZMJENA_MINUTA} minuta od objave, izmjena više nije moguća.`;
    case "KRATAK_TEKST":
      return "Tekst mora imati bar 20 znakova.";
    case "PREVISE_LINKOVA":
      return "Najviše 3 linka u tekstu.";
    case "BLOKIRAN":
      return "Pisanje vam je trenutno onemogućeno.";
    default:
      return "Izmjena nije uspjela.";
  }
}

export default function TemaKlijent({ tema }: { tema: Tema }) {
  const router = useRouter();
  const [prihvaceniId, setPrihvaceniId] = useState(tema.prihvaceniOdgovorId);
  const [greska, setGreska] = useState<string | null>(null);
  const [brisanje, setBrisanje] = useState(false);
  // tekst teme živi ovdje da se izmjena vidi odmah, bez čekanja refresh-a
  const [tekst, setTekst] = useState(tema.tekst || "");
  const [uredjivanje, setUredjivanje] = useState(false);
  const [noviTekst, setNoviTekst] = useState("");
  const [snimamTekst, setSnimamTekst] = useState(false);
  const [greskaTeksta, setGreskaTeksta] = useState<string | null>(null);

  const { data: korisnik } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });
  const jeAdmin = korisnik?.role === "ADMIN";
  const moguPrihvatiti =
    !!korisnik && (korisnik.id === tema.autor.id || jeAdmin);
  // admin uređuje svaki tekst bilo kad, autor svoj u prvih 15 minuta; sat se
  // vodi kroz efekat (pravilo react-hooks/purity), pa se dugme samo ugasi
  // kad rok istekne
  const rokAutora =
    new Date(tema.createdAt).getTime() + IZMJENA_MINUTA * 60 * 1000;
  const [autorURoku, setAutorURoku] = useState(false);
  useEffect(() => {
    const provjeri = () => setAutorURoku(Date.now() <= rokAutora);
    const t = setTimeout(provjeri, 0);
    const interval = setInterval(provjeri, 30000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [rokAutora]);
  const moguUrediti =
    jeAdmin || (!!korisnik && korisnik.id === tema.autor.id && autorURoku);

  async function sacuvajTekst() {
    const t = noviTekst.trim();
    setGreskaTeksta(null);
    setSnimamTekst(true);
    const res = await izmijeniTekstTeme(tema.slug, t);
    setSnimamTekst(false);
    if (!res.ok) {
      setGreskaTeksta(greskaIzmjene(res.error || ""));
      return;
    }
    setTekst(t);
    setUredjivanje(false);
    // server komponenta (meta opis) neka povuče svježe stanje
    router.refresh();
  }

  async function prihvati(komentarId: number) {
    const res = await prihvatiOdgovor(tema.slug, komentarId);
    if (!res.ok) {
      setGreska("Označavanje rješenja nije uspjelo.");
      return;
    }
    setGreska(null);
    setPrihvaceniId(res.data?.prihvaceniOdgovorId ?? null);
  }

  async function radnja(
    r: "PRIKVACI" | "OTKVACI" | "ZAKLJUCAJ" | "OTKLJUCAJ" | "OBRISI",
  ) {
    const res = await adminRadnjaTema(tema.slug, r);
    if (!res.ok) {
      setGreska("Radnja nije uspjela.");
      return;
    }
    if (r === "OBRISI") {
      router.push("/rasprave");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {/* tekst teme: čist unos korisnika, prelomi se čuvaju */}
      {uredjivanje ? (
        <div style={{ marginTop: "1.5rem" }}>
          <textarea
            className={styles.komPolje}
            style={{ minHeight: 180 }}
            value={noviTekst}
            onChange={(e) => setNoviTekst(e.target.value)}
            maxLength={10000}
            aria-label="Tekst teme"
          />
          {greskaTeksta && <p className={styles.komGreska}>{greskaTeksta}</p>}
          <div className={styles.komFormaRed}>
            <button
              type="button"
              className={`${styles.railDugme} ${styles.railDugmeMali}`}
              onClick={() => {
                setUredjivanje(false);
                setGreskaTeksta(null);
              }}
            >
              Odustani
            </button>
            <button
              type="button"
              className={styles.komSalji}
              onClick={() => void sacuvajTekst()}
              disabled={snimamTekst || noviTekst.trim().length < 20}
            >
              {snimamTekst ? "Snimam..." : "Sačuvaj izmjenu"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.temaTekst}>{tekst}</p>
          {moguUrediti && (
            <div style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                className={`${styles.railDugme} ${styles.railDugmeMali}`}
                onClick={() => {
                  setNoviTekst(tekst);
                  setGreskaTeksta(null);
                  setUredjivanje(true);
                }}
                title={
                  jeAdmin
                    ? "Admin može urediti svaki tekst"
                    : `Svoj tekst možete urediti do ${IZMJENA_MINUTA} minuta od objave`
                }
              >
                Uredi tekst
              </button>
            </div>
          )}
        </>
      )}

      <p className={styles.temaNapomena} style={{ marginTop: "1.5rem" }}>
        Odgovori korisnika su razmjena iskustava, ne službeni savjet. Odgovor
        redakcije prepoznajete po oznaci i kvačici.
      </p>

      {jeAdmin && (
        <div className={styles.komAkcije} style={{ margin: "1rem 0 0" }}>
          <button
            type="button"
            className={styles.komAkcija}
            onClick={() => void radnja(tema.prikvacena ? "OTKVACI" : "PRIKVACI")}
          >
            {tema.prikvacena ? "Otkvači sa vrha" : "Prikvači na vrh"}
          </button>
          <button
            type="button"
            className={styles.komAkcija}
            onClick={() => void radnja(tema.zakljucana ? "OTKLJUCAJ" : "ZAKLJUCAJ")}
          >
            {tema.zakljucana ? "Otključaj temu" : "Zaključaj temu"}
          </button>
          <button
            type="button"
            className={styles.komAkcija}
            style={{ color: "#b0432a" }}
            onClick={() => setBrisanje(true)}
          >
            Obriši temu
          </button>
        </div>
      )}
      {greska && <p className={styles.komGreska}>{greska}</p>}

      <Komentari
        slug={tema.slug}
        izvor="tema"
        zakljucano={tema.zakljucana}
        prihvatanje={{
          aktivno: tema.vrsta === "PITANJE",
          prihvaceniId,
          mogu: moguPrihvatiti,
          onPrihvati: (id) => void prihvati(id),
        }}
      />

      <Modal
        kind="confirm"
        open={brisanje}
        variant="danger"
        title="Brisanje teme"
        message={`Obrisati temu "${tema.naslov}" sa svim odgovorima?`}
        confirmLabel="Obriši"
        cancelLabel="Odustani"
        onConfirm={() => {
          setBrisanje(false);
          void radnja("OBRISI");
        }}
        onClose={() => setBrisanje(false)}
      />
    </div>
  );
}
