"use client";

/* Avatar prijavljenog korisnika u traci sekcije Vijesti, sa značkom broja
   nepročitanih obavještenja i padajućim panelom (zadnja obavještenja, link na
   profil). Neprijavljenom stoji ikonica osobe koja vodi na prijavu. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  getMojePostavke,
  getObavjestenja,
  getBrojObavjestenja,
  procitajObavjestenja,
  ukloniObavjestenje,
  type Obavjestenje,
} from "src/api/vijestiKomentari";
import { Avatar } from "./Potpis";
import PotpisModal from "./PotpisModal";
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

export default function ProfilDugme() {
  const [otvoren, setOtvoren] = useState(false);
  // korisnik bez izabranog potpisa još nema profil u Vijestima: umjesto
  // panela (i linka na profil koji bi vratio 404) prvo bira korisničko ime
  const [trebaPotpis, setTrebaPotpis] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: korisnik, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  const { data: postavke } = useQuery({
    queryKey: ["vijesti-moje-postavke"],
    queryFn: () => unwrap(getMojePostavke()).catch(() => null),
    enabled: !!korisnik,
    retry: false,
  });

  const { data: brojPodaci } = useQuery({
    queryKey: ["vijesti-obavjestenja-broj"],
    queryFn: () => unwrap(getBrojObavjestenja()).catch(() => null),
    enabled: !!korisnik,
    retry: false,
    refetchInterval: 120000,
  });
  const neprocitano = brojPodaci?.neprocitano ?? 0;

  const { data: obavjestenja = [] } = useQuery({
    queryKey: ["vijesti-obavjestenja"],
    queryFn: () => unwrap(getObavjestenja()).catch(() => []),
    enabled: !!korisnik && otvoren,
    retry: false,
  });

  // U panelu se pokazuju nepročitana obavještenja i ona mlađa od sat vremena:
  // kad ih korisnik jednom vidi (otvaranje panela ih čita), sat kasnije se
  // sama sklone. Trenutak se hvata kroz efekat (react-hooks/purity).
  const [sada, setSada] = useState(0);
  useEffect(() => {
    if (!otvoren) return;
    const t = setTimeout(() => setSada(Date.now()), 0);
    return () => clearTimeout(t);
  }, [otvoren]);
  const vidljiva = sada
    ? obavjestenja.filter(
        (o) => !o.procitano || sada - new Date(o.vrijeme).getTime() < 3600 * 1000,
      )
    : obavjestenja;

  async function ukloni(id: number) {
    await ukloniObavjestenje(id);
    await queryClient.invalidateQueries({ queryKey: ["vijesti-obavjestenja"] });
    await queryClient.invalidateQueries({
      queryKey: ["vijesti-obavjestenja-broj"],
    });
  }

  // otvaranje panela označava sve pročitanim, značka se gasi
  useEffect(() => {
    if (!otvoren || neprocitano === 0) return;
    void procitajObavjestenja().then(() => {
      void queryClient.invalidateQueries({
        queryKey: ["vijesti-obavjestenja-broj"],
      });
    });
  }, [otvoren, neprocitano, queryClient]);

  useEffect(() => {
    if (!otvoren) return;
    function vani(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOtvoren(false);
      }
    }
    document.addEventListener("mousedown", vani);
    return () => document.removeEventListener("mousedown", vani);
  }, [otvoren]);

  // panel se zatvara pri promjeni stranice (tajmer zbog pravila
  // react-hooks/set-state-in-effect)
  useEffect(() => {
    const t = setTimeout(() => setOtvoren(false), 0);
    return () => clearTimeout(t);
  }, [pathname]);

  if (isLoading) return null;

  if (!korisnik) {
    return (
      <Link
        href={`/prijava?next=${encodeURIComponent(pathname || "/vijesti")}`}
        className={styles.profilDugme}
        title="Prijavite se"
        aria-label="Prijavite se"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      </Link>
    );
  }

  return (
    <div ref={wrapRef} className={styles.profilWrap}>
      <button
        type="button"
        className={styles.profilDugme}
        onClick={() => {
          // bez potpisa nema profila: prvo izbor korisničkog imena
          if (postavke && !postavke.izabran) {
            setOtvoren(false);
            setTrebaPotpis(true);
            return;
          }
          setOtvoren((v) => !v);
        }}
        aria-label="Profil i obavještenja"
      >
        <Avatar
          slika={postavke?.avatar ?? null}
          sluzbeni={postavke?.sluzbeni}
          ime={postavke?.potpis || korisnik.firstName || "?"}
          velicina={30}
        />
        {neprocitano > 0 && (
          <span className={styles.profilZnacka}>
            {neprocitano > 9 ? "9+" : neprocitano}
          </span>
        )}
      </button>

      {otvoren && (
        <div className={styles.profilPanel}>
          <div className={styles.profilPanelHead}>
            <span className={styles.sideNaslov} style={{ margin: 0 }}>
              Obavještenja
            </span>
            <Link
              href={`/vijesti/korisnik/${korisnik.id}`}
              className={`${styles.railDugme} ${styles.railDugmeMali}`}
            >
              Moj profil &rarr;
            </Link>
          </div>

          {vidljiva.length === 0 ? (
            <p className={styles.profilPanelPrazno}>
              Još nema obavještenja. Stižu kad neko odgovori na vaš komentar
              ili temu, ili glasa o vašem komentaru.
            </p>
          ) : (
            <ul className={styles.profilPanelLista}>
              {vidljiva.slice(0, 6).map((o) => (
                <li key={o.id} className={styles.obavijestRed}>
                  <Link href={o.link} className={styles.profilPanelItem}>
                    <Avatar
                      slika={o.akter?.avatar ?? null}
                      sluzbeni={o.akter?.sluzbeni}
                      ime={o.akter?.potpis || "?"}
                      velicina={28}
                    />
                    <span className={styles.profilPanelTekst}>
                      <span className={styles.profilPanelOpis}>{opis(o)}</span>
                      {o.naslov && (
                        <span className={styles.profilPanelNaslov}>
                          {o.naslov}
                        </span>
                      )}
                      <span className={styles.profilPanelVrijeme}>
                        {relativnoVrijeme(o.vrijeme)}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    className={styles.obavijestX}
                    onClick={() => void ukloni(o.id)}
                    aria-label="Ukloni obavještenje"
                    title="Ukloni"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/vijesti/korisnik/${korisnik.id}#obavjestenja`}
            className={styles.raspraveBlokSve}
            style={{ marginTop: "0.75rem" }}
          >
            Sva obavještenja &rarr;
          </Link>
        </div>
      )}

      {/* izbor potpisa otvara profil čim je gotov */}
      {trebaPotpis && (
        <PotpisModal
          punoIme={`${korisnik.firstName ?? ""} ${korisnik.lastName ?? ""}`.trim()}
          onOdustani={() => setTrebaPotpis(false)}
          potvrdiTekst="Sačuvaj i otvori profil"
          onGotovo={async () => {
            setTrebaPotpis(false);
            await queryClient.invalidateQueries({
              queryKey: ["vijesti-moje-postavke"],
            });
            router.push(`/vijesti/korisnik/${korisnik.id}`);
          }}
        />
      )}
    </div>
  );
}
