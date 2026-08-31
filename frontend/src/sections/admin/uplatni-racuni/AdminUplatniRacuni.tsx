"use client";

// Admin šifarnik uplatnih računa javnih prihoda: pregled svih 38 slotova
// (kantonalni, federalni, Budžet RS, obrtničke komore), izmjena broja uz
// obavezan izvor (Službene novine FBiH), dupli unos i blokirajuću mod 97
// validaciju, akcija "provjereno bez izmjene" i historija (audit log).
// Izmjena odmah važi za sve uplatnice i izvoze, bez deploya.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import Modal from "src/components/Modal/Modal";
import DateInput from "src/components/DateInput/DateInput";
import {
  getAdminUplatniRacuni,
  izmijeniUplatniRacun,
  potvrdiProvjeruRacuna,
  getUplatniRacunLog,
  provjeriBrojRacuna,
  formatirajRacun,
  type UplatniRacunRed,
} from "src/api/adminUplatniRacuni";
import { unwrap } from "src/api/auth";
import styles from "./uplatniRacuni.module.css";

const GRUPA_LABEL: Record<string, string> = {
  federalni: "Federalni i fondovi",
  kanton: "Kantonalni",
  rs: "Republika Srpska",
  komora: "Obrtničke komore",
};

const GRUPA_RED: Record<string, number> = { federalni: 0, kanton: 1, rs: 2, komora: 3 };

function formatDatum(iso: string | null | undefined): string {
  if (!iso) return "–";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}.` : "–";
}

/** Provjera starija od ~6 mjeseci (ili nikad): vizuelno upozorenje. */
function provjeraZastarjela(iso: string | null): boolean {
  if (!iso) return true;
  const t = new Date(String(iso).slice(0, 10)).getTime();
  return Number.isFinite(t) ? Date.now() - t > 183 * 24 * 3600 * 1000 : true;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
}

export default function AdminUplatniRacuni() {
  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <Sadrzaj />
    </RoleGuard>
  );
}

function Sadrzaj() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [grupa, setGrupa] = useState<string>("sve");
  const [izmjena, setIzmjena] = useState<UplatniRacunRed | null>(null);
  const [provjera, setProvjera] = useState<UplatniRacunRed | null>(null);
  const [historija, setHistorija] = useState<UplatniRacunRed | null>(null);

  const lista = useQuery({
    queryKey: ["admin-uplatni-racuni"],
    queryFn: () => unwrap(getAdminUplatniRacuni()),
  });

  const provjeraMut = useMutation({
    mutationFn: (kljuc: string) => unwrap(potvrdiProvjeruRacuna(kljuc)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-uplatni-racuni"] });
    },
  });

  const redovi = useMemo(() => {
    const sve = lista.data?.racuni ?? [];
    const nq = normalize(q.trim());
    return sve
      .filter((r) => (grupa === "sve" ? true : r.grupa === grupa))
      .filter((r) => {
        if (!nq) return true;
        const hay = `${r.korisnik} ${r.racun} ${r.racunPrikaz} ${r.banka ?? ""} ${r.kanton ?? ""} ${r.vrstaPrihoda ?? ""}`;
        return normalize(hay).includes(nq);
      })
      .slice()
      .sort((a, b) => {
        const g = (GRUPA_RED[a.grupa] ?? 9) - (GRUPA_RED[b.grupa] ?? 9);
        if (g !== 0) return g;
        return a.kljuc.localeCompare(b.kljuc);
      });
  }, [lista.data, q, grupa]);

  const meta = lista.data?.meta ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Uplatni računi</h1>
          <p className={styles.meta}>
            Šifarnik računa javnih prihoda na koje idu sve uplatnice koje aplikacija
            generiše (obračun plata, izvoz za e-bankarstvo, štampa naloga, AMS, GPD,
            ugovor o djelu, ČOK/ONŠ) i stranica /javni-prihodi. Izmjena važi odmah,
            bez deploya.
          </p>
        </div>
      </div>
      {meta?.datum ? (
        <p className={styles.uskladjenost}>
          Podaci usklađeni sa: {meta.izvor || "službenim šifarnikom"}, na dan{" "}
          {formatDatum(meta.datum)}
        </p>
      ) : null}

      <div className={styles.filtersRow}>
        <input
          className={styles.searchInput}
          placeholder="Traži: korisnik, broj računa, banka, kanton…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className={styles.grupaTabs}>
          {["sve", "federalni", "kanton", "rs", "komora"].map((g) => (
            <button
              key={g}
              type="button"
              className={grupa === g ? styles.grupaTabActive : styles.grupaTab}
              onClick={() => setGrupa(g)}
            >
              {g === "sve" ? "Svi" : GRUPA_LABEL[g]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableWrap}>
        {lista.isLoading ? (
          <div className={styles.empty}>Učitavanje…</div>
        ) : lista.isError ? (
          <div className={styles.empty}>Greška pri učitavanju šifarnika.</div>
        ) : redovi.length === 0 ? (
          <div className={styles.empty}>Nema računa za zadati filter.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Korisnik prihoda</th>
                <th>Broj računa</th>
                <th>Važi od</th>
                <th>Izvor izmjene</th>
                <th>Provjereno</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {redovi.map((r) => (
                <tr key={r.kljuc}>
                  <td>
                    <div className={styles.korisnik}>
                      {r.korisnik}
                      {r.kanton ? <span className={styles.kantonChip}>{r.kanton}</span> : null}
                    </div>
                    {r.vrstaPrihoda ? (
                      <div className={styles.vrstaPrihoda}>{r.vrstaPrihoda}</div>
                    ) : null}
                  </td>
                  <td>
                    <div className={styles.racunMono}>{r.racunPrikaz}</div>
                    {r.banka ? <div className={styles.banka}>{r.banka}</div> : null}
                  </td>
                  <td className={styles.datumCell}>{formatDatum(r.vaziOd)}</td>
                  <td className={styles.izvorCell}>{r.izvor || "–"}</td>
                  <td
                    className={
                      provjeraZastarjela(r.datumProvjere)
                        ? `${styles.datumCell} ${styles.datumStar}`
                        : styles.datumCell
                    }
                    title={
                      provjeraZastarjela(r.datumProvjere)
                        ? "Provjera starija od 6 mjeseci (ili je nije bilo)"
                        : undefined
                    }
                  >
                    {formatDatum(r.datumProvjere)}
                  </td>
                  <td>
                    <div className={styles.actionStack}>
                      <button
                        type="button"
                        className={styles.btnSmall}
                        onClick={() => setHistorija(r)}
                      >
                        Historija
                      </button>
                      <button
                        type="button"
                        className={styles.btnSmall}
                        disabled={provjeraMut.isPending}
                        onClick={() => setProvjera(r)}
                      >
                        Provjereno
                      </button>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={() => setIzmjena(r)}
                      >
                        Izmijeni
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {izmjena ? (
        <IzmjenaModal
          red={izmjena}
          onClose={() => setIzmjena(null)}
          onSaved={() => {
            setIzmjena(null);
            void qc.invalidateQueries({ queryKey: ["admin-uplatni-racuni"] });
          }}
        />
      ) : null}

      {historija ? (
        <HistorijaModal red={historija} onClose={() => setHistorija(null)} />
      ) : null}

      <Modal
        kind="confirm"
        open={Boolean(provjera)}
        title="Provjereno, bez izmjene"
        message={
          provjera
            ? `Upisati današnji datum kao datum zadnje provjere za "${provjera.korisnik}" (${provjera.racunPrikaz})? Broj računa se ne mijenja.`
            : ""
        }
        confirmLabel="Upiši provjeru"
        onConfirm={() => {
          if (provjera) provjeraMut.mutate(provjera.kljuc);
          setProvjera(null);
        }}
        onClose={() => setProvjera(null)}
      />
    </div>
  );
}

// ── Modal: izmjena broja računa ─────────────────────────────────────────────
function IzmjenaModal({
  red,
  onClose,
  onSaved,
}: {
  red: UplatniRacunRed;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [racun, setRacun] = useState("");
  const [potvrda, setPotvrda] = useState("");
  const [banka, setBanka] = useState(red.banka ?? "");
  const [vaziOd, setVaziOd] = useState("");
  const [izvor, setIzvor] = useState("");
  const [pokusano, setPokusano] = useState(false);
  // backdrop drag-guard: zatvori samo ako su i mousedown i mouseup na pozadini
  const [misDoljeNaPozadini, setMisDoljeNaPozadini] = useState(false);

  const mut = useMutation({
    mutationFn: () =>
      unwrap(
        izmijeniUplatniRacun(red.kljuc, {
          racun,
          racunPotvrda: potvrda,
          banka: banka.trim() || undefined,
          vaziOd: vaziOd || null,
          izvor: izvor.trim(),
        }),
      ),
    onSuccess: async () => {
      // odmah primijeni novo stanje i na živi šifarnik u ovom tabu
      const { osvjeziUplatneRacune } = await import("src/data/uplatniRacuniLive");
      void osvjeziUplatneRacune(true);
      onSaved();
    },
  });

  const greskaRacun = provjeriBrojRacuna(racun);
  const greskaPotvrda =
    racun.replace(/\D+/g, "") === potvrda.replace(/\D+/g, "")
      ? null
      : "Broj i potvrda se ne poklapaju.";
  const greskaIzvor = izvor.trim() ? null : "Izvor izmjene je obavezan.";
  const validno = !greskaRacun && !greskaPotvrda && !greskaIzvor;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => setMisDoljeNaPozadini(e.target === e.currentTarget)}
      onMouseUp={(e) => {
        if (misDoljeNaPozadini && e.target === e.currentTarget) onClose();
        setMisDoljeNaPozadini(false);
      }}
    >
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>Izmjena računa</h2>
        <p className={styles.modalSub}>
          {red.korisnik}
          {red.kanton ? ` · ${red.kanton}` : ""}
        </p>

        <div className={styles.formGrid}>
          <div>
            <span className={styles.fieldLabel}>Trenutni broj</span>
            <div className={styles.trenutniRacun}>
              {red.racunPrikaz}
              {red.banka ? ` · ${red.banka}` : ""}
            </div>
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="novi-racun">
              Novi broj računa (16 cifara)
            </label>
            <input
              id="novi-racun"
              className={styles.inputFull}
              inputMode="numeric"
              placeholder="16 cifara, sa ili bez crtica"
              value={racun}
              onChange={(e) => setRacun(e.target.value)}
            />
            {pokusano && greskaRacun ? (
              <div className={styles.fieldError}>{greskaRacun}</div>
            ) : racun && !greskaRacun ? (
              <div className={styles.fieldHint}>{formatirajRacun(racun)} ✓</div>
            ) : (
              <div className={styles.fieldHint}>
                Kontrola: 16 cifara, modulo 97 mora dati ostatak 1.
              </div>
            )}
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="potvrda-racuna">
              Potvrda broja (unesi ponovo)
            </label>
            <input
              id="potvrda-racuna"
              className={styles.inputFull}
              inputMode="numeric"
              value={potvrda}
              onChange={(e) => setPotvrda(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              placeholder="ponovi novi broj, bez kopiranja"
            />
            {pokusano && greskaPotvrda ? (
              <div className={styles.fieldError}>{greskaPotvrda}</div>
            ) : null}
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="banka-racuna">
              Banka (automatski iz prefiksa, može se ispraviti)
            </label>
            <input
              id="banka-racuna"
              className={styles.inputFull}
              value={banka}
              onChange={(e) => setBanka(e.target.value)}
              placeholder="ostavi prazno za automatski naziv"
            />
          </div>

          <div>
            <span className={styles.fieldLabel}>Važi od (neobavezno)</span>
            <DateInput className={styles.input} value={vaziOd} onValueChange={setVaziOd} />
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="izvor-izmjene">
              Izvor izmjene (obavezno)
            </label>
            <input
              id="izvor-izmjene"
              className={styles.inputFull}
              value={izvor}
              onChange={(e) => setIzvor(e.target.value)}
              placeholder="npr. Sl. novine FBiH 5/24, tačka 12.1.2"
            />
            {pokusano && greskaIzvor ? (
              <div className={styles.fieldError}>{greskaIzvor}</div>
            ) : (
              <div className={styles.fieldHint}>
                Broj Službenih novina FBiH i tačka pravilnika; bez ovoga se izmjena
                ne može snimiti.
              </div>
            )}
          </div>
        </div>

        {mut.isError ? (
          <div className={styles.serverError}>{(mut.error as Error).message}</div>
        ) : null}

        <div className={styles.modalActions}>
          <button type="button" className={styles.btnSmall} onClick={onClose}>
            Odustani
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={mut.isPending}
            onClick={() => {
              setPokusano(true);
              if (validno) mut.mutate();
            }}
          >
            {mut.isPending ? "Snimam…" : "Snimi izmjenu"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: historija (audit log) ────────────────────────────────────────────
function HistorijaModal({
  red,
  onClose,
}: {
  red: UplatniRacunRed;
  onClose: () => void;
}) {
  const [misDoljeNaPozadini, setMisDoljeNaPozadini] = useState(false);
  const log = useQuery({
    queryKey: ["uplatni-racun-log", red.kljuc],
    queryFn: () => unwrap(getUplatniRacunLog(red.kljuc)),
  });

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => setMisDoljeNaPozadini(e.target === e.currentTarget)}
      onMouseUp={(e) => {
        if (misDoljeNaPozadini && e.target === e.currentTarget) onClose();
        setMisDoljeNaPozadini(false);
      }}
    >
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>Historija izmjena</h2>
        <p className={styles.modalSub}>
          {red.korisnik} · trenutno {red.racunPrikaz}
        </p>

        {log.isLoading ? (
          <div className={styles.empty}>Učitavanje…</div>
        ) : log.isError ? (
          <div className={styles.empty}>Greška pri čitanju historije.</div>
        ) : (log.data ?? []).length === 0 ? (
          <div className={styles.empty}>
            Nema zabilježenih izmjena ni provjera za ovaj račun.
          </div>
        ) : (
          <div className={styles.logList}>
            {(log.data ?? []).map((l) => (
              <div key={l.id} className={styles.logRed}>
                <div className={styles.logAkcija}>
                  {l.akcija === "izmjena" ? "Izmjena broja" : "Provjereno, bez izmjene"}
                  {" · "}
                  {formatDatum(l.createdAt)}
                  {l.userEmail ? ` · ${l.userEmail}` : ""}
                </div>
                <div className={styles.logDetalj}>
                  {l.akcija === "izmjena" ? (
                    <span className={styles.logStrelica}>
                      {l.stariRacun || "–"} → {l.noviRacun || "–"}
                    </span>
                  ) : (
                    <span className={styles.logStrelica}>{l.noviRacun || "–"}</span>
                  )}
                  {l.izvor ? ` · izvor: ${l.izvor}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.modalActions}>
          <button type="button" className={styles.btnSmall} onClick={onClose}>
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
}
