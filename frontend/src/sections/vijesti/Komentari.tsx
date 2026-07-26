"use client";

/* Komentari ispod teksta: pišu prijavljeni, čitaju svi.
   Odgovori idu jedan nivo duboko, glasovi su plus i minus (jedan po korisniku),
   a komentari redakcije nose naš znak i plavu kvačicu. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  getKomentari,
  dodajKomentar,
  izmijeniKomentar,
  obrisiKomentar,
  glasajKomentar,
  prijaviKomentar,
  adminObrisiSveKorisnika,
  type Komentar,
} from "src/api/vijestiKomentari";
import Modal from "src/components/Modal/Modal";
import PotpisModal from "./PotpisModal";
import { Avatar, Kvacica } from "./Potpis";
import { objaviBrojKomentara } from "./BrojKomentara";
import { relativnoVrijeme } from "src/lib/vijestiServer";
import styles from "./vijesti.module.css";

const MAX = 3000;

function GreskaTekst(kod: string): string {
  switch (kod) {
    case "BLOKIRAN":
      return "Vaš nalog trenutno ne može komentarisati.";
    case "PREKRATAK":
      return "Komentar je prekratak.";
    case "PREVISE_LINKOVA":
      return "Previše linkova u komentaru.";
    case "PREBRZO":
      return "Sačekajte malo prije sljedećeg komentara.";
    case "PREVISE":
      return "Dostigli ste ograničenje broja komentara po satu.";
    case "ISTEKLO_VRIJEME":
      return "Komentar se može mijenjati samo prvih 15 minuta.";
    case "VLASTITI_KOMENTAR":
      return "Ne možete glasati za vlastiti komentar.";
    default:
      return "Radnja nije uspjela, pokušajte ponovo.";
  }
}

type PrihvatanjeProps = {
  /** vrsta teme je PITANJE, pa se odgovor moze oznaciti kao rjesenje */
  aktivno: boolean;
  prihvaceniId: number | null;
  mogu: boolean;
  onPrihvati: (komentarId: number) => void;
};

export default function Komentari({
  slug,
  izvor = "clanak",
  zakljucano = false,
  prihvatanje,
}: {
  slug: string;
  izvor?: "clanak" | "tema";
  zakljucano?: boolean;
  prihvatanje?: PrihvatanjeProps;
}) {
  const [sort, setSort] = useState<"novi" | "korisni">("novi");
  const [komentari, setKomentari] = useState<Komentar[]>([]);
  const [ukupno, setUkupno] = useState(0);
  // koliko je stranica komentara učitano; "Prikaži još" dodaje sljedeću, a
  // svako osvježenje (nov komentar, glas, brisanje) učita svih onoliko koliko
  // je čitalac već otvorio, da mu se lista ne skupi pod rukama
  const [stranica, setStranica] = useState(1);
  const [imaJos, setImaJos] = useState(false);
  const [ucitavaJos, setUcitavaJos] = useState(false);
  const [tekst, setTekst] = useState("");
  const [odgovorNa, setOdgovorNa] = useState<number | null>(null);
  const [odgovorTekst, setOdgovorTekst] = useState("");
  const [izmjenaId, setIzmjenaId] = useState<number | null>(null);
  const [izmjenaTekst, setIzmjenaTekst] = useState("");
  const [greska, setGreska] = useState<string | null>(null);
  const [salje, setSalje] = useState(false);
  const [trebaPotpis, setTrebaPotpis] = useState(false);
  const [cekaSlanje, setCekaSlanje] = useState<{ tekst: string; roditeljId?: number } | null>(null);
  const [zaBrisanje, setZaBrisanje] = useState<number | null>(null);
  const [sveOdKorisnika, setSveOdKorisnika] = useState<{
    id: number;
    potpis: string;
  } | null>(null);

  const { data: korisnik } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });
  const prijavljen = !!korisnik;

  const ucitaj = useCallback(async () => {
    const stranice = await Promise.all(
      Array.from({ length: stranica }, (_, i) => getKomentari(slug, sort, izvor, i + 1)),
    );
    const zadnja = stranice[stranice.length - 1];
    setUcitavaJos(false);
    if (!zadnja?.ok || !zadnja.data) return;
    setKomentari(stranice.flatMap((s) => (s.ok && s.data ? s.data.komentari : [])));
    setUkupno(zadnja.data.ukupno);
    setImaJos(zadnja.data.imaJos);
    // brojač u lijevoj traci prati stvarno stanje, ne keširanu stranicu
    objaviBrojKomentara(slug, zadnja.data.ukupno);
  }, [slug, sort, izvor, stranica]);

  useEffect(() => {
    // poziv kroz tajmer, da setState ne padne u tijelo efekta
    const t = setTimeout(() => void ucitaj(), 0);
    return () => clearTimeout(t);
  }, [ucitaj]);

  // promjena redoslijeda vraća listu na prvu stranicu
  function postaviSort(novi: "novi" | "korisni") {
    setSort(novi);
    setStranica(1);
  }

  async function posalji(sadrzaj: string, roditeljId?: number) {
    const t = sadrzaj.trim();
    if (t.length < 3) return;
    setGreska(null);
    setSalje(true);
    const res = await dodajKomentar(slug, { tekst: t, roditeljId }, izvor);
    setSalje(false);
    if (!res.ok) {
      if (res.error === "POTPIS_NIJE_IZABRAN") {
        // prvi komentar: prvo izbor potpisa, pa se slanje nastavi
        setCekaSlanje({ tekst: t, roditeljId });
        setTrebaPotpis(true);
        return;
      }
      setGreska(GreskaTekst(res.error || ""));
      return;
    }
    if (roditeljId) {
      // odgovor ide pod svoj korijen, a on je na ekranu, pa osvježenje stiže
      setOdgovorNa(null);
      setOdgovorTekst("");
      await ucitaj();
      return;
    }
    setTekst("");
    // Novi komentar je hronološki zadnji, dakle na zadnjoj stranici. Zato se
    // dodaje na kraj već prikazane liste umjesto da se lista ponovo učita:
    // inače bi na tekstu sa više stranica autor svoj komentar tražio.
    if (res.data) {
      const novi = res.data;
      setKomentari((prethodni) => [...prethodni, novi]);
      setUkupno(ukupno + 1);
      objaviBrojKomentara(slug, ukupno + 1);
      return;
    }
    await ucitaj();
  }

  async function glasaj(k: Komentar, vrijednost: 1 | -1) {
    if (!prijavljen) return;
    const novi = k.mojGlas === vrijednost ? 0 : vrijednost;
    const res = await glasajKomentar(k.id, novi as 1 | -1 | 0);
    if (!res.ok) {
      setGreska(GreskaTekst(res.error || ""));
      return;
    }
    await ucitaj();
  }

  async function prijavi(id: number) {
    const res = await prijaviKomentar(id);
    setGreska(
      res.ok
        ? res.data?.vecPrijavljen
          ? "Već ste prijavili ovaj komentar."
          : "Hvala, komentar je prijavljen i pregledaćemo ga."
        : GreskaTekst(res.error || ""),
    );
    await ucitaj();
  }

  // NAMJERNO obična funkcija, ne komponenta: komponenta definisana unutar
  // druge komponente dobija novi identitet pri svakom renderu, pa React
  // ponovo montira cijelo podstablo i polje za unos gubi fokus poslije
  // svakog otkucanog znaka.
  function jedan(k: Komentar, dubina = 0) {
    const uIzmjeni = izmjenaId === k.id;
    const jeRjesenje = prihvatanje?.aktivno && prihvatanje.prihvaceniId === k.id;
    return (
      <li
        key={k.id}
        className={`${styles.komItem} ${jeRjesenje ? styles.komRjesenje : ""}`}
      >
        <Avatar
          slika={k.autor.avatar}
          sluzbeni={k.autor.sluzbeni}
          ime={k.autor.potpis}
          velicina={34}
        />
        <div className={styles.komTijelo}>
          <div className={styles.komAutor}>
            {k.autor.id ? (
              <Link href={`/vijesti/korisnik/${k.autor.id}`} className={styles.komIme}>
                {k.autor.potpis}
                {k.autor.sluzbeni && <Kvacica velicina={14} />}
              </Link>
            ) : (
              <span className={styles.komIme}>{k.autor.potpis}</span>
            )}
            {k.autor.sluzbeni && (
              <span className={styles.komOznakaRedakcija}>Redakcija</span>
            )}
            {jeRjesenje && (
              <span className={styles.komOznakaRjesenje}>✓ Rješenje</span>
            )}
            <span className={styles.komVrijeme}>
              {relativnoVrijeme(k.createdAt)}
              {k.izmijenjen ? ", izmijenjen" : ""}
            </span>
          </div>

          {k.sakriven ? (
            <p className={`${styles.komTekst} ${styles.komSakriven}`}>
              Komentar je sakriven zbog prijava i čeka pregled.
            </p>
          ) : uIzmjeni ? (
            <div>
              <textarea
                className={styles.komPolje}
                value={izmjenaTekst}
                onChange={(e) => setIzmjenaTekst(e.target.value)}
                maxLength={MAX}
              />
              <div className={styles.komFormaRed}>
                <button
                  type="button"
                  className={styles.komAkcija}
                  onClick={() => setIzmjenaId(null)}
                >
                  Odustani
                </button>
                <button
                  type="button"
                  className={styles.komSalji}
                  onClick={async () => {
                    const res = await izmijeniKomentar(k.id, izmjenaTekst.trim());
                    if (!res.ok) {
                      setGreska(GreskaTekst(res.error || ""));
                      return;
                    }
                    setIzmjenaId(null);
                    await ucitaj();
                  }}
                >
                  Sačuvaj
                </button>
              </div>
            </div>
          ) : (
            <p className={styles.komTekst}>{k.tekst}</p>
          )}

          {!k.sakriven && !uIzmjeni && (
            <div className={styles.komAkcije}>
              <span className={styles.komGlasovi}>
                <button
                  type="button"
                  className={`${styles.komGlas} ${k.mojGlas === 1 ? styles.komGlasAktivanPlus : ""}`}
                  onClick={() => void glasaj(k, 1)}
                  disabled={!prijavljen}
                  aria-label="Korisno"
                  title={prijavljen ? "Korisno" : "Prijavite se da glasate"}
                >
                  +
                </button>
                <span className={styles.komZbir}>{k.glasovi}</span>
                <button
                  type="button"
                  className={`${styles.komGlas} ${k.mojGlas === -1 ? styles.komGlasAktivanMinus : ""}`}
                  onClick={() => void glasaj(k, -1)}
                  disabled={!prijavljen}
                  aria-label="Nije korisno"
                  title={prijavljen ? "Nije korisno" : "Prijavite se da glasate"}
                >
                  &minus;
                </button>
              </span>

              {prijavljen && dubina === 0 && !zakljucano && (
                <button
                  type="button"
                  className={styles.komAkcija}
                  onClick={() => {
                    setOdgovorNa(odgovorNa === k.id ? null : k.id);
                    setOdgovorTekst("");
                  }}
                >
                  Odgovori
                </button>
              )}
              {prihvatanje?.aktivno && prihvatanje.mogu && dubina === 0 && (
                <button
                  type="button"
                  className={styles.komAkcija}
                  onClick={() => prihvatanje.onPrihvati(k.id)}
                >
                  {jeRjesenje ? "Poništi rješenje" : "Označi kao rješenje"}
                </button>
              )}
              {k.mogu.izmjena && (
                <button
                  type="button"
                  className={styles.komAkcija}
                  onClick={() => {
                    setIzmjenaId(k.id);
                    setIzmjenaTekst(k.tekst || "");
                  }}
                >
                  Izmijeni
                </button>
              )}
              {k.mogu.brisanje && (
                <button
                  type="button"
                  className={styles.komAkcija}
                  onClick={() => setZaBrisanje(k.id)}
                >
                  Obriši
                </button>
              )}
              {prijavljen && !k.mogu.brisanje && (
                <button
                  type="button"
                  className={styles.komAkcija}
                  onClick={() => void prijavi(k.id)}
                >
                  Prijavi
                </button>
              )}
              {/* admin moderira sa same stranice, bez odlaska u admin panel */}
              {k.mogu.moderacija && k.autor.id != null && (
                <button
                  type="button"
                  className={styles.komAkcija}
                  onClick={() => setSveOdKorisnika({ id: k.autor.id as number, potpis: k.autor.potpis })}
                  title="Obriši sve komentare ovog korisnika ispod ovog teksta"
                >
                  Obriši sve od korisnika
                </button>
              )}
            </div>
          )}

          {odgovorNa === k.id && (
            <div style={{ marginTop: "0.75rem" }}>
              <textarea
                className={styles.komPolje}
                value={odgovorTekst}
                onChange={(e) => setOdgovorTekst(e.target.value)}
                placeholder={`Odgovor korisniku ${k.autor.potpis}`}
                maxLength={MAX}
              />
              <div className={styles.komFormaRed}>
                <span className={styles.komBrojac}>
                  {odgovorTekst.length}/{MAX}
                </span>
                <button
                  type="button"
                  className={styles.komSalji}
                  onClick={() => void posalji(odgovorTekst, k.id)}
                  disabled={salje || odgovorTekst.trim().length < 3}
                >
                  Odgovori
                </button>
              </div>
            </div>
          )}

          {k.odgovori && k.odgovori.length > 0 && (
            <ul className={styles.komOdgovori}>
              {k.odgovori.map((o) => jedan(o, 1))}
            </ul>
          )}
        </div>
      </li>
    );
  }

  return (
    <section className={styles.komentari} id="komentari">
      <div className={styles.komHead}>
        <h2 className={styles.komNaslov}>
          {izvor === "tema" ? "Odgovori" : "Komentari"} {ukupno > 0 ? `(${ukupno})` : ""}
        </h2>
        {ukupno > 1 && (
          <div className={styles.komSort}>
            <button
              type="button"
              className={`${styles.komSortBtn} ${sort === "novi" ? styles.komSortAktivan : ""}`}
              onClick={() => postaviSort("novi")}
            >
              Najnoviji
            </button>
            <button
              type="button"
              className={`${styles.komSortBtn} ${sort === "korisni" ? styles.komSortAktivan : ""}`}
              onClick={() => postaviSort("korisni")}
            >
              Najkorisniji
            </button>
          </div>
        )}
      </div>

      {zakljucano ? (
        <p className={styles.komPrijava}>
          Tema je zaključana, novi odgovori se ne primaju.
        </p>
      ) : prijavljen ? (
        <div className={styles.komForma}>
          <textarea
            className={styles.komPolje}
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            placeholder="Napišite komentar. Ako dijelite iskustvo iz prakse, navedite i propis ili iznos, tako je najkorisnije."
            maxLength={MAX}
          />
          <div className={styles.komFormaRed}>
            <span className={styles.komBrojac}>
              {tekst.length}/{MAX}
            </span>
            <button
              type="button"
              className={styles.komSalji}
              onClick={() => void posalji(tekst)}
              disabled={salje || tekst.trim().length < 3}
            >
              {salje ? "Šaljem..." : "Objavi komentar"}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.komPrijava}>
          <span>
            {izvor === "tema"
              ? "Odgovori su otvoreni za prijavljene korisnike."
              : "Komentari su otvoreni za prijavljene korisnike."}
          </span>
          <span className={styles.komPrijavaDugmad}>
            <Link href="/prijava" className={styles.komPrijavaBtn}>
              Prijavi se
            </Link>
            <Link
              href="/registracija"
              className={`${styles.komPrijavaBtn} ${styles.komPrijavaBtnPuni}`}
            >
              Registruj se besplatno
            </Link>
          </span>
        </div>
      )}

      {greska && <p className={styles.komGreska}>{greska}</p>}

      {komentari.length === 0 ? (
        <p className={styles.komVrijeme}>
          {izvor === "tema"
            ? "Još nema odgovora. Budite prvi koji će pomoći."
            : "Još nema komentara. Budite prvi, pitanje je takođe komentar."}
        </p>
      ) : (
        <>
          <ul className={styles.komLista}>{komentari.map((k) => jedan(k))}</ul>
          {imaJos && (
            <div className={styles.komFormaRed}>
              <button
                type="button"
                className={styles.komSalji}
                disabled={ucitavaJos}
                onClick={() => {
                  setUcitavaJos(true);
                  setStranica((s) => s + 1);
                }}
              >
                {ucitavaJos ? "Učitavam..." : "Prikaži još komentara"}
              </button>
            </div>
          )}
        </>
      )}

      {trebaPotpis && (
        <PotpisModal
          punoIme={`${korisnik?.firstName ?? ""} ${korisnik?.lastName ?? ""}`.trim()}
          onOdustani={() => {
            setTrebaPotpis(false);
            setCekaSlanje(null);
          }}
          onGotovo={async () => {
            setTrebaPotpis(false);
            const cekano = cekaSlanje;
            setCekaSlanje(null);
            if (cekano) await posalji(cekano.tekst, cekano.roditeljId);
          }}
        />
      )}

      <Modal
        kind="confirm"
        open={sveOdKorisnika != null}
        variant="danger"
        title="Brisanje svih komentara korisnika"
        message={`Obrisati sve komentare korisnika ${sveOdKorisnika?.potpis ?? ""} ispod ovog teksta?`}
        confirmLabel="Obriši sve"
        cancelLabel="Odustani"
        onConfirm={() => {
          const k = sveOdKorisnika;
          setSveOdKorisnika(null);
          if (!k) return;
          void adminObrisiSveKorisnika(slug, k.id).then(async (res) => {
            if (!res.ok) setGreska(GreskaTekst(res.error || ""));
            await ucitaj();
          });
        }}
        onClose={() => setSveOdKorisnika(null)}
      />

      <Modal
        kind="confirm"
        open={zaBrisanje != null}
        variant="danger"
        title="Brisanje komentara"
        message="Obrisati vaš komentar? Ova radnja se ne može poništiti."
        confirmLabel="Obriši"
        cancelLabel="Odustani"
        onConfirm={() => {
          const id = zaBrisanje;
          setZaBrisanje(null);
          if (id == null) return;
          void obrisiKomentar(id).then(async (res) => {
            if (!res.ok) setGreska(GreskaTekst(res.error || ""));
            await ucitaj();
          });
        }}
        onClose={() => setZaBrisanje(null)}
      />

      {/* najprirodniji trenutak za ulaz u Rasprave: čovjek je već u modu
          komentarisanja, samo mu pitanje nije vezano za ovaj tekst */}
      {izvor === "clanak" && (
        <div className={styles.komPrijava} style={{ marginTop: "1.5rem" }}>
          <span>
            Imate pitanje koje nije vezano za ovaj tekst? Razmijenite iskustva
            sa drugim knjigovođama i obrtnicima.
          </span>
          <Link
            href="/rasprave"
            className={`${styles.komPrijavaBtn} ${styles.komPrijavaBtnPuni}`}
          >
            Otvori temu u Raspravama &rarr;
          </Link>
        </div>
      )}
    </section>
  );
}
