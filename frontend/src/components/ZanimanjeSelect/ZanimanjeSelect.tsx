"use client";

// Autocomplete za Klasifikaciju zanimanja FBiH (4.193 zanimanja, KZBiH-08):
// kucanje filtrira po nazivu ili šifri, izbor puni i NAZIV i ŠIFRU (7 cifara
// bez tačke, kako traži JS3100). Ručni unos ostaje moguć (nije strogi mod).
// Koristi se u kartonu radnika (WorkerModal) i na JS3100 obrascu; stil prati
// polje kroz className, pa radi i u marketing i u PK Office temi (kao CitySelect).
//
// Tastatura: strelice gore/dolje pomjeraju označeno zanimanje, Enter bira
// označeno, Escape zatvara listu. Enter dok je lista otvorena NE smije
// pokrenuti formu (JS3100 bi inače generisao obrazac sa praznom šifrom).
//
// Klasifikacija (4.193 zapisa, ~330 KB) se učitava LIJENO, dinamičkim uvozom
// pri prvom fokusu ili prvom kucanju: inače bi ušla u paket svake stranice sa
// kartonom radnika i JS3100, a većina sesija je nikad ne otvori.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filtrirajZanimanja, sifraSaTackom } from "src/lib/zanimanjaSearch";
import type { Zanimanje } from "src/data/zanimanja-fbih";
import styles from "./ZanimanjeSelect.module.css";

// koliko prima kolona workers.zanimanjeOpis (VARCHAR(120))
const MAX_DUZINA = 120;

// Modul-level keš: lista se povuče jednom po sesiji, pa je drugo polje
// (ili ponovno otvaranje modala) ima odmah, bez treptaja "Učitavanje…".
let listaKes: Zanimanje[] | null = null;
let listaUToku: Promise<Zanimanje[]> | null = null;

function ucitajZanimanja(): Promise<Zanimanje[]> {
  if (listaKes) return Promise.resolve(listaKes);
  if (!listaUToku) {
    listaUToku = import("src/data/zanimanja-fbih")
      .then((m) => {
        listaKes = m.ZANIMANJA_FBIH;
        return listaKes;
      })
      .catch((e) => {
        listaUToku = null; // sljedeći fokus pokušava ponovo
        throw e;
      });
  }
  return listaUToku;
}

interface Props {
  /** trenutni naziv zanimanja (tekst polja) */
  value: string;
  /** svaka promjena teksta (ručni unos) */
  onChange: (naziv: string) => void;
  /** izbor sa liste: puni i naziv i šifru odjednom */
  onPick: (z: Zanimanje) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

export default function ZanimanjeSelect({
  value,
  onChange,
  onPick,
  className = "",
  placeholder = "počnite kucati naziv ili šifru…",
  id,
}: Props) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [lista, setLista] = useState<Zanimanje[] | null>(listaKes);
  const [ucitava, setUcitava] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const zivRef = useRef(true);

  useEffect(() => {
    zivRef.current = true;
    return () => {
      zivRef.current = false;
    };
  }, []);

  useEffect(() => {
    setText(value);
  }, [value]);

  /** Prvi fokus ili prvo kucanje povlači klasifikaciju (dinamički uvoz). */
  const osigurajListu = useCallback(() => {
    if (listaKes) {
      setLista(listaKes);
      return;
    }
    setUcitava(true);
    ucitajZanimanja()
      .then((z) => {
        if (!zivRef.current) return;
        setLista(z);
      })
      .catch(() => {})
      .finally(() => {
        if (zivRef.current) setUcitava(false);
      });
  }, []);

  const results = useMemo(
    () => (lista ? filtrirajZanimanja(lista, text, 60) : []),
    [lista, text],
  );

  // nova lista = označen prvi rezultat (Enter uvijek bira ono što se vidi)
  useEffect(() => {
    setActive(0);
  }, [text]);

  // označeno mora ostati u vidljivom dijelu liste pri kretanju strelicama
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (z: Zanimanje) => {
    onPick(z);
    setText(z.naziv);
    setOpen(false);
  };

  const listaOtvorena = open && results.length > 0;
  // panel se vidi i dok se klasifikacija učitava (kratko stanje učitavanja)
  const panelOtvoren = open && (results.length > 0 || (ucitava && !lista));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (!open) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!listaOtvorena) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
          osigurajListu();
        }
        return;
      }
      e.preventDefault();
      const smjer = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + smjer + results.length) % results.length);
      return;
    }
    if (e.key === "Enter") {
      if (!listaOtvorena) return;
      // Enter bira zanimanje i NE šalje formu (JS3100 se generiše dugmetom)
      e.preventDefault();
      const z = results[active] || results[0];
      if (z) select(z);
      return;
    }
    if (e.key === "Tab" && open) setOpen(false);
  };

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <input
        id={id}
        className={className}
        value={text}
        autoComplete="off"
        placeholder={placeholder}
        maxLength={MAX_DUZINA}
        role="combobox"
        aria-expanded={listaOtvorena}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-lista` : undefined}
        aria-activedescendant={
          listaOtvorena && id ? `${id}-opcija-${active}` : undefined
        }
        onFocus={() => {
          setOpen(true);
          osigurajListu();
        }}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          const v = e.target.value.slice(0, MAX_DUZINA);
          setText(v);
          setOpen(true);
          osigurajListu();
          onChange(v);
        }}
      />
      {panelOtvoren && (
        <div
          className={styles.dropdown}
          ref={listRef}
          id={id ? `${id}-lista` : undefined}
          role="listbox"
        >
          {!lista && ucitava && (
            <div className={styles.footerNote}>Učitavanje liste zanimanja…</div>
          )}
          {results.map((z, i) => (
            <button
              key={z.sifra}
              type="button"
              id={id ? `${id}-opcija-${i}` : undefined}
              data-index={i}
              role="option"
              aria-selected={i === active}
              className={`${styles.option} ${i === active ? styles.optionActive : ""}`}
              // onMouseDown umjesto onClick da izbor prođe prije blur-a polja
              onMouseDown={(e) => {
                e.preventDefault();
                select(z);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className={styles.optSifra}>{sifraSaTackom(z.sifra)}</span>
              <span className={styles.optNaziv}>{z.naziv}</span>
            </button>
          ))}
          {results.length >= 60 && (
            <div className={styles.footerNote}>
              Prikazano prvih 60, nastavite kucati da suzite izbor.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
