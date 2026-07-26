"use client";

/* Lista tema na /rasprave sa živom pretragom i sortiranjem.

   Server otvori stranicu sa podrazumijevanom listom (SEO, prvi prikaz), a
   ovdje se ta lista mijenja bez osvježavanja: kucanje traži po naslovu i
   tekstu tema (kratka pauza pa upit na server, uz trenutno sužavanje već
   učitanih rezultata), a padajući izbor mijenja redoslijed. Filteri vrste i
   oblasti ostaju linkovi iznad, oni idu kroz adresu stranice. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTeme, type Tema, type TemaSort, type TemaVrsta } from "src/api/rasprave";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import { TemaRed } from "./TemaRed";
import styles from "./vijesti.module.css";

const SORTIRANJA: { value: TemaSort; label: string }[] = [
  { value: "aktivnost", label: "Najaktivnije" },
  { value: "najnovije", label: "Najnovije" },
  { value: "najstarije", label: "Najstarije" },
  { value: "popularne", label: "Najpopularnije" },
  { value: "odgovori", label: "Najviše odgovora" },
];

const LIMIT = 20;

/** Brojevi stranica za prikaz: svi kad ih je malo, inače 1 ... oko aktivne ... zadnja. */
function straniceZaPrikaz(aktivna: number, ukupno: number): (number | "...")[] {
  if (ukupno <= 7) return Array.from({ length: ukupno }, (_, i) => i + 1);
  const oko = [aktivna - 1, aktivna, aktivna + 1].filter(
    (n) => n > 1 && n < ukupno,
  );
  const lista: (number | "...")[] = [1];
  if (oko[0] && oko[0] > 2) lista.push("...");
  lista.push(...oko);
  if (oko.length > 0 && (oko[oko.length - 1] as number) < ukupno - 1) {
    lista.push("...");
  }
  lista.push(ukupno);
  return lista;
}

/** 1 tema, 2 teme, 5 tema. */
function rijecTema(n: number): string {
  const jedinica = n % 10;
  const desetica = n % 100;
  if (jedinica === 1 && desetica !== 11) return "tema";
  if (jedinica >= 2 && jedinica <= 4 && (desetica < 12 || desetica > 14)) {
    return "teme";
  }
  return "tema";
}

export default function RaspraveLista({
  pocetne,
  ukupno,
  vrsta,
  rubrika,
  filter,
}: {
  pocetne: Tema[];
  ukupno: number;
  vrsta?: TemaVrsta;
  rubrika?: string;
  filter?: "rijesene";
}) {
  const [unos, setUnos] = useState("");
  const [pojam, setPojam] = useState("");
  const [sort, setSort] = useState<TemaSort>("aktivnost");
  const [stranica, setStranica] = useState(1);
  const poljeRef = useRef<HTMLInputElement>(null);
  const vrhListeRef = useRef<HTMLDivElement>(null);

  // kucanje ne šalje upit na svako slovo, nego kad se kucanje kratko zaustavi
  useEffect(() => {
    const t = setTimeout(() => setPojam(unos.trim()), 250);
    return () => clearTimeout(t);
  }, [unos]);

  // promjena pretrage, sortiranja ili filtera vraća na prvu stranicu
  // (prilagodba stanja tokom rendera, bez efekta)
  const kljucUpita = `${vrsta ?? ""}|${rubrika ?? ""}|${filter ?? ""}|${pojam}|${sort}`;
  const [prosliKljuc, setProsliKljuc] = useState(kljucUpita);
  if (kljucUpita !== prosliKljuc) {
    setProsliKljuc(kljucUpita);
    setStranica(1);
  }

  const podrazumijevano = pojam === "" && sort === "aktivnost" && stranica === 1;

  const { data, isFetching, isPlaceholderData } = useQuery({
    queryKey: [
      "rasprave-lista",
      vrsta ?? "",
      rubrika ?? "",
      filter ?? "",
      pojam,
      sort,
      stranica,
    ],
    queryFn: async () => {
      const res = await getTeme({
        vrsta,
        rubrika,
        filter,
        q: pojam || undefined,
        sort,
        page: stranica,
        limit: LIMIT,
      });
      return res.ok && res.data
        ? { items: res.data.items, total: res.data.total }
        : { items: [] as Tema[], total: 0 };
    },
    initialData: podrazumijevano ? { items: pocetne, total: ukupno } : undefined,
    staleTime: 30000,
    placeholderData: (prev) => prev,
    retry: false,
  });

  const teme = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? teme.length;
  const ukupnoStranica = Math.max(1, Math.ceil(total / LIMIT));

  function naStranicu(n: number) {
    setStranica(n);
    // nova strana kreće od vrha liste, ne od dna gdje je bila paginacija
    vrhListeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // dok upit za novi pojam još nije otišao (debounce) ili dok se još prikazuju
  // podaci prethodnog upita (placeholder), lista se sužava lokalno: rezultat se
  // vidi već pri prvom slovu i stara puna lista ne bljesne usred kucanja
  const cekaUpit = unos.trim() !== pojam;
  const prikaz = useMemo(() => {
    const t = unos.trim().toLowerCase();
    if (!t || (!cekaUpit && !isPlaceholderData)) return teme;
    return teme.filter((x) => x.naslov.toLowerCase().includes(t));
  }, [teme, unos, cekaUpit, isPlaceholderData]);

  // u pretrazi se broj pogodaka prikazuje iz servera (total), a dok traje
  // lokalno sužavanje iz onoga što se trenutno vidi
  const brojPogodaka =
    cekaUpit || isPlaceholderData ? prikaz.length : total;

  return (
    <>
      {/* sidro za povratak na vrh liste pri promjeni stranice; navbar je
          fiksan pa scroll mora stati malo ispod njega */}
      <div ref={vrhListeRef} style={{ scrollMarginTop: 80 }} />
      <div className={styles.raspraveAlati}>
        <div className={styles.raspraveTrazi}>
          <svg
            className={styles.raspraveTraziIkona}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={poljeRef}
            className={styles.raspraveTraziPolje}
            value={unos}
            onChange={(e) => setUnos(e.target.value)}
            placeholder="Pretraži teme"
            aria-label="Pretraži rasprave"
            type="search"
          />
          {unos && (
            <button
              type="button"
              className={styles.raspraveTraziBrisi}
              onClick={() => {
                setUnos("");
                poljeRef.current?.focus();
              }}
              aria-label="Očisti pretragu"
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.raspraveSort}>
          <span className={styles.filterOznaka}>Sortiraj:</span>
          <StyledSelect
            ariaLabel="Sortiranje tema"
            wrapStyle={{ minWidth: 170, flex: 1, maxWidth: 260 }}
            value={sort}
            onChange={(v) => setSort((v as TemaSort) || "aktivnost")}
            groups={[{ options: SORTIRANJA }]}
          />
        </div>
      </div>

      <p className={styles.raspraveBrojac}>
        {unos.trim()
          ? `${brojPogodaka} ${rijecTema(brojPogodaka)} za "${unos.trim()}"`
          : `${total} ${rijecTema(total)} ukupno`}
        {isFetching && <span className={styles.raspraveTrazim}> tražim...</span>}
      </p>

      {prikaz.length === 0 ? (
        <p className={styles.prazno}>
          {unos.trim()
            ? `Nema tema koje odgovaraju pojmu "${unos.trim()}".`
            : "Nema tema po ovom filteru. Otvorite prvu: dugme Otvori novu temu je gore."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {prikaz.map((t) => (
            <TemaRed key={t.id} t={t} />
          ))}
        </div>
      )}

      {ukupnoStranica > 1 && (
        <nav className={styles.paginacija} aria-label="Stranice tema">
          <button
            type="button"
            className={styles.paginacijaDugme}
            onClick={() => naStranicu(stranica - 1)}
            disabled={stranica <= 1}
            aria-label="Prethodna stranica"
          >
            &larr;
          </button>
          {straniceZaPrikaz(stranica, ukupnoStranica).map((s, i) =>
            s === "..." ? (
              <span key={`t-${i}`} className={styles.paginacijaTri}>
                ...
              </span>
            ) : (
              <button
                key={s}
                type="button"
                className={`${styles.paginacijaDugme} ${
                  s === stranica ? styles.paginacijaAktivna : ""
                }`}
                onClick={() => naStranicu(s)}
                aria-current={s === stranica ? "page" : undefined}
              >
                {s}
              </button>
            ),
          )}
          <button
            type="button"
            className={styles.paginacijaDugme}
            onClick={() => naStranicu(stranica + 1)}
            disabled={stranica >= ukupnoStranica}
            aria-label="Sljedeća stranica"
          >
            &rarr;
          </button>
        </nav>
      )}
    </>
  );
}
