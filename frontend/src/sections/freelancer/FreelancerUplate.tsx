"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  deleteUplata,
  listUplate,
  setUplataStatus,
  type FreelancerUplata,
  type UplataStatus,
} from "src/api/freelancer";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import Modal from "src/components/Modal/Modal";
import DateInput from "src/components/DateInput/DateInput";
import GodinaSelect from "./GodinaSelect";
import UplataForma from "./UplataForma";
import PriloziPanel from "./PriloziPanel";
import { mnozina } from "src/lib/format";
import { fmtDatum, fmtKm, rokInfo, STATUS_TEKST } from "./format";
import { preuzmiAms, preuzmiUplatnice } from "./pdf";
import { useGodina, useOsvjeziEvidenciju } from "./hooks";
import Paginacija, { useStranice } from "./Paginacija";
import { preuzmiBajtove, uplateUXlsx } from "./izvoz";
import styles from "./freelancer.module.css";

const BADGE: Record<UplataStatus, string> = {
  OBRACUNATO: styles.badgeObracunato,
  PLACENO: styles.badgePlaceno,
  PREDANO: styles.badgePredano,
};

// Kolone po kojima se sortira. Redoslijed statusa prati tok posla, da
// "obračunato" (ono što još čeka radnju) bude na vrhu kad se sortira uzlazno.
const STATUS_RED: Record<UplataStatus, number> = {
  OBRACUNATO: 0,
  PREDANO: 1,
  PLACENO: 2,
};
type Kljuc = "datumPrimitka" | "isplatilacNaziv" | "iznosKm" | "zdravstveno" | "razlika" | "neto" | "status";
const NASLOVI: { kljuc: Kljuc; tekst: string; num?: boolean }[] = [
  { kljuc: "datumPrimitka", tekst: "Primljeno" },
  { kljuc: "isplatilacNaziv", tekst: "Isplatilac" },
  { kljuc: "iznosKm", tekst: "Iznos (KM)", num: true },
  { kljuc: "zdravstveno", tekst: "Zdrav.", num: true },
  { kljuc: "razlika", tekst: "Porez", num: true },
  { kljuc: "neto", tekst: "Neto", num: true },
  { kljuc: "status", tekst: "Status i rok" },
];

function vrijednost(u: FreelancerUplata, k: Kljuc): number | string {
  if (k === "status") return STATUS_RED[u.status];
  if (k === "isplatilacNaziv") return (u.isplatilacNaziv || "").toLocaleLowerCase("bs");
  if (k === "datumPrimitka") return u.datumPrimitka || "";
  return Number(u[k] ?? 0);
}

export default function FreelancerUplate() {
  const [godina, setGodina] = useGodina();
  const sp = useSearchParams();
  const osvjezi = useOsvjeziEvidenciju();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["freelancer-uplate", godina],
    queryFn: () => unwrap(listUplate(godina)),
  });
  const sve = useMemo(() => data?.items ?? [], [data]);

  // Pretraga ide po isplatiocu (naziv, grad, država) i po napomeni, jer se
  // isplatilac tako i traži kad ih ima više desetina.
  const [trazi, setTrazi] = useState("");
  const [sort, setSort] = useState<{ kljuc: Kljuc; opadajuce: boolean }>({
    kljuc: "datumPrimitka",
    opadajuce: true,
  });
  const items = useMemo(() => {
    const q = trazi.trim().toLocaleLowerCase("bs");
    const filtrirane = q
      ? sve.filter((u) =>
          [u.isplatilacNaziv, u.isplatilacGrad, u.isplatilacDrzava, u.napomena]
            .filter(Boolean)
            .some((v) => String(v).toLocaleLowerCase("bs").includes(q)),
        )
      : sve;
    const smjer = sort.opadajuce ? -1 : 1;
    return [...filtrirane].sort((a, b) => {
      const va = vrijednost(a, sort.kljuc);
      const vb = vrijednost(b, sort.kljuc);
      let r = 0;
      if (typeof va === "string" || typeof vb === "string") {
        r = String(va).localeCompare(String(vb), "bs");
      } else {
        r = va - vb;
      }
      // stabilan ishod kad su vrijednosti iste (npr. dvije uplate istog dana)
      return (r !== 0 ? r : a.id - b.id) * smjer;
    });
  }, [sve, trazi, sort]);
  // zbir ide preko SVIH filtriranih uplata (ne samo tekuće stranice), da
  // pretraga po isplatiocu odmah daje njegov ukupan promet
  const zbir = useMemo(
    () =>
      items.reduce(
        (z, u) => ({
          iznosKm: z.iznosKm + Number(u.iznosKm || 0),
          zdravstveno: z.zdravstveno + Number(u.zdravstveno || 0),
          razlika: z.razlika + Number(u.razlika || 0),
          neto: z.neto + Number(u.neto || 0),
        }),
        { iznosKm: 0, zdravstveno: 0, razlika: 0, neto: 0 },
      ),
    [items],
  );
  const stranice = useStranice(items);
  const promijeniSort = (kljuc: Kljuc) =>
    setSort((s) =>
      s.kljuc === kljuc
        ? { kljuc, opadajuce: !s.opadajuce }
        : // brojevi i datum kreću od najvećeg, tekst od A
          { kljuc, opadajuce: kljuc !== "isplatilacNaziv" && kljuc !== "status" },
    );

  const [forma, setForma] = useState<{ otvorena: boolean; uplata: FreelancerUplata | null }>({
    otvorena: false,
    uplata: null,
  });
  const [prilozi, setPrilozi] = useState<number | null>(null);
  const [zaBrisanje, setZaBrisanje] = useState<FreelancerUplata | null>(null);
  const [poruka, setPoruka] = useState<string | null>(null);

  // /freelancer?tab=uplate&novo=1 otvara ručni unos odmah
  useEffect(() => {
    if (sp.get("novo") === "1") setForma({ otvorena: true, uplata: null });
  }, [sp]);

  const status = useMutation({
    // datum je opcion: bez njega server uzima današnji, sa njim korisnik
    // ispravlja kad je stvarno predano ili plaćeno
    mutationFn: ({ id, s, datum }: { id: number; s: UplataStatus; datum?: string }) =>
      unwrap(setUplataStatus(id, s, datum)),
    onSuccess: osvjezi,
  });
  const obrisi = useMutation({
    mutationFn: (id: number) => unwrap(deleteUplata(id)),
    onSuccess: () => {
      setZaBrisanje(null);
      setPoruka(null);
      osvjezi();
    },
    // modal se zatvara na potvrdu, pa greška mora biti vidljiva na stranici:
    // bez ovoga red ostane u tabeli, a korisnik misli da je obrisan
    onError: () => {
      setZaBrisanje(null);
      setPoruka("Uplata nije obrisana. Pokušajte ponovo.");
    },
  });

  const ams = async (u: FreelancerUplata) => {
    try {
      await preuzmiAms(u);
    } catch {
      setPoruka("AMS obrazac se nije mogao generisati.");
    }
  };
  const uplatnice = async (u: FreelancerUplata) => {
    try {
      const ok = await preuzmiUplatnice(u);
      if (!ok) setPoruka("Za uplatnice treba kanton i općina prebivališta: dopunite ih kroz Uredi.");
    } catch {
      setPoruka("Uplatnice se nisu mogle generisati.");
    }
  };

  return (
    <>
      <div className={styles.toolbar}>
        <GodinaSelect value={godina} onChange={setGodina} />
        <div className={styles.searchWrap}>
          <input
            type="search"
            className={styles.search}
            value={trazi}
            onChange={(e) => setTrazi(e.target.value)}
            placeholder="Pretraga po isplatiocu"
            aria-label="Pretraga po isplatiocu"
          />
          {trazi.trim() !== "" && (
            <span className={styles.searchBroj}>
              {items.length} od {sve.length}
            </span>
          )}
        </div>
        <button
          type="button"
          className={`${styles.btnGhost} ${styles.btnSmall}`}
          disabled={items.length === 0}
          title="Excel tabela sa svim kolonama, za ono što je trenutno u tabeli (pretraga i redoslijed se poštuju)"
          onClick={async () => {
            try {
              const bytes = await uplateUXlsx(items, godina);
              preuzmiBajtove(
                bytes,
                `PK-Freelancer-uplate-${godina}.xlsx`,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              );
            } catch {
              setPoruka("Excel izvoz nije uspio. Pokušajte ponovo.");
            }
          }}
        >
          Izvoz u Excel
        </button>
        <span className={styles.toolbarSpacer} />
        <Link href="/ams" className={styles.btnPrimary}>
          Nova uplata (AMS generator)
        </Link>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => setForma({ otvorena: true, uplata: null })}
        >
          Ručni unos uplate
        </button>
      </div>

      {forma.otvorena && (
        <UplataForma
          key={forma.uplata?.id ?? "nova"}
          pocetna={forma.uplata}
          onGotovo={() => setForma({ otvorena: false, uplata: null })}
          onOdustani={() => setForma({ otvorena: false, uplata: null })}
        />
      )}

      {poruka && (
        <div className={`${styles.alert} ${styles.alertWarn}`} role="status">
          {poruka}{" "}
          <button type="button" className={`${styles.btnGhost} ${styles.btnSmall}`} onClick={() => setPoruka(null)}>
            U redu
          </button>
        </div>
      )}

      {isLoading && <div className={styles.empty}>Učitavanje uplata...</div>}
      {isError && <div className={`${styles.alert} ${styles.alertErr}`}>Uplate se ne mogu učitati.</div>}

      {data && (
        <div className={styles.tableWrap}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              {sve.length > 0 ? (
                <>
                  Nijedan isplatilac ne odgovara pretrazi{" "}
                  <strong>{trazi.trim()}</strong> u {godina}. godini.{" "}
                  <button
                    type="button"
                    className={`${styles.btnGhost} ${styles.btnSmall}`}
                    onClick={() => setTrazi("")}
                  >
                    Poništi pretragu
                  </button>
                </>
              ) : (
                <>
                  Nema uplata u {godina}. godini. Novu uplatu unesite kroz AMS generator (obrazac +
                  uplatnice + evidencija jednim klikom) ili ručno, za uplate od ranije.
                </>
              )}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  {NASLOVI.map((n) => {
                    const aktivan = sort.kljuc === n.kljuc;
                    return (
                      <th
                        key={n.kljuc}
                        className={n.num ? styles.num : undefined}
                        aria-sort={aktivan ? (sort.opadajuce ? "descending" : "ascending") : "none"}
                      >
                        <button
                          type="button"
                          className={`${styles.thSort} ${aktivan ? styles.thSortAktivan : ""}`}
                          onClick={() => promijeniSort(n.kljuc)}
                          title={`Sortiraj po: ${n.tekst}`}
                          aria-label={`Sortiraj po: ${n.tekst}${
                            aktivan ? (sort.opadajuce ? ", trenutno opadajuće" : ", trenutno rastuće") : ""
                          }`}
                        >
                          {n.tekst}
                          <span aria-hidden="true">{aktivan ? (sort.opadajuce ? "↓" : "↑") : "↕"}</span>
                        </button>
                      </th>
                    );
                  })}
                  <th>Dokumenti</th>
                </tr>
              </thead>
              <tbody>
                {stranice.isjecak.map((u) => {
                  const rok = rokInfo(u.daniDoRoka, u.status);
                  return (
                    <FragmentRed
                      key={u.id}
                      u={u}
                      rok={rok}
                      prilozOtvoren={prilozi === u.id}
                      onPrilozi={() => setPrilozi(prilozi === u.id ? null : u.id)}
                      onStatus={(s, datum) => status.mutate({ id: u.id, s, datum })}
                      onAms={() => ams(u)}
                      onUplatnice={() => uplatnice(u)}
                      onUredi={() => {
                        setForma({ otvorena: true, uplata: u });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      onObrisi={() => setZaBrisanje(u)}
                    />
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>
                    Ukupno{trazi.trim() ? " za pretragu" : ` za ${godina}.`} ({items.length}{" "}
                    {mnozina(items.length, "uplata", "uplate", "uplata")})
                  </td>
                  <td className={styles.num}>{fmtKm(zbir.iznosKm)}</td>
                  <td className={styles.num}>{fmtKm(zbir.zdravstveno)}</td>
                  <td className={styles.num}>{fmtKm(zbir.razlika)}</td>
                  <td className={`${styles.num} ${styles.strong}`}>{fmtKm(zbir.neto)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
          {items.length > 0 && (
            <Paginacija {...stranice} onPromjena={stranice.setStranica} sta="uplata" />
          )}
        </div>
      )}

      <Modal
        kind="confirm"
        variant="danger"
        open={!!zaBrisanje}
        title="Obrisati uplatu iz evidencije?"
        message={
          zaBrisanje
            ? `${zaBrisanje.isplatilacNaziv}, ${fmtKm(zaBrisanje.iznosKm)} KM od ${fmtDatum(zaBrisanje.datumPrimitka)}. Brišu se i prilozi uz uplatu. Već predani AMS obrazac kod Porezne uprave ovo ne mijenja.`
            : ""
        }
        confirmLabel="Obriši"
        cancelLabel="Odustani"
        onConfirm={() => zaBrisanje && !obrisi.isPending && obrisi.mutate(zaBrisanje.id)}
        onClose={() => setZaBrisanje(null)}
      />
    </>
  );
}

function FragmentRed({
  u,
  rok,
  prilozOtvoren,
  onPrilozi,
  onStatus,
  onAms,
  onUplatnice,
  onUredi,
  onObrisi,
}: {
  u: FreelancerUplata;
  rok: ReturnType<typeof rokInfo>;
  prilozOtvoren: boolean;
  onPrilozi: () => void;
  onStatus: (s: UplataStatus, datum?: string) => void;
  onAms: () => void;
  onUplatnice: () => void;
  onUredi: () => void;
  onObrisi: () => void;
}) {
  return (
    <>
      <tr>
        <td data-label="Primljeno">
          {fmtDatum(u.datumPrimitka)}
          <span className={styles.muted} style={{ display: "block" }}>
            period {String(u.periodMjesec).padStart(2, "0")}/{u.periodGodina}
          </span>
        </td>
        <td data-label="Isplatilac">
          <span className={styles.strong}>{u.isplatilacNaziv}</span>
          {u.isplatilacDrzava && (
            <span className={styles.muted} style={{ display: "block" }}>{u.isplatilacDrzava}</span>
          )}
        </td>
        <td data-label="Iznos" className={styles.num}>
          {fmtKm(u.iznosKm)}
          {u.valuta !== "BAM" && (
            <span className={styles.muted} style={{ display: "block" }}>
              {fmtKm(u.iznosValuta)} {u.valuta} × {u.kurs}
            </span>
          )}
        </td>
        <td data-label="Zdravstveno" className={styles.num}>{fmtKm(u.zdravstveno)}</td>
        <td data-label="Porez" className={styles.num}>{fmtKm(u.razlika)}</td>
        {/* čist prihod: bruto minus doprinos minus porez */}
        <td data-label="Neto" className={`${styles.num} ${styles.strong}`}>{fmtKm(u.neto)}</td>
        <td data-label="Status">
          <StyledSelect
            value={u.status}
            onChange={(v) => v && onStatus(String(v) as UplataStatus)}
            ariaLabel="Status uplate"
            wrapStyle={{ minWidth: 135 }}
            groups={[
              {
                options: (Object.keys(STATUS_TEKST) as UplataStatus[]).map((s) => ({
                  value: s,
                  label: STATUS_TEKST[s],
                })),
              },
            ]}
          />
          {/* datum uz status; klik na datum otvara ispravku, jer promjena
              statusa iz izbornika uvijek upiše današnji dan */}
          {u.status !== "OBRACUNATO" && (
            <DatumStatusa
              status={u.status}
              datum={u.status === "PLACENO" ? u.datumPlacanja : u.datumPredaje}
              onSnimi={(iso) => onStatus(u.status, iso)}
            />
          )}
          {rok && (
            <span
              className={`${styles.rok} ${
                rok.ton === "kasni" ? styles.rokKasni : rok.ton === "hitno" ? styles.rokHitno : styles.rokOk
              }`}
            >
              {rok.tekst} ({fmtDatum(u.rokPredaje)})
            </span>
          )}
        </td>
        <td data-label="Dokumenti">
          <div className={styles.rowActions}>
            <button type="button" className={`${styles.btnSecondary} ${styles.btnSmall}`} onClick={onAms}>
              AMS PDF
            </button>
            <button type="button" className={`${styles.btnSecondary} ${styles.btnSmall}`} onClick={onUplatnice}>
              Uplatnice
            </button>
            <button type="button" className={`${styles.btnGhost} ${styles.btnSmall}`} onClick={onPrilozi} aria-expanded={prilozOtvoren}>
              Prilozi ({u.brojPriloga})
            </button>
            <button type="button" className={`${styles.btnGhost} ${styles.btnSmall}`} onClick={onUredi}>
              Uredi
            </button>
            <button type="button" className={`${styles.btnDanger} ${styles.btnSmall}`} onClick={onObrisi}>
              Obriši
            </button>
          </div>
        </td>
      </tr>
      {prilozOtvoren && (
        <tr className={styles.prilogRow}>
          {/* preko SVIH 8 kolona (ranije 7, pa je zadnja kolona zjapila prazna) */}
          <td colSpan={8}>
            <PriloziPanel uplataId={u.id} onZatvori={onPrilozi} />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Datum uz status (predano ili plaćeno) kao mala oznaka; klik otvara unos
 * datuma sa dugmadima. Snima se kroz isti PATCH kao promjena statusa.
 */
function DatumStatusa({
  status,
  datum,
  onSnimi,
}: {
  status: UplataStatus;
  datum: string | null;
  onSnimi: (iso: string) => void;
}) {
  const [uredjuje, setUredjuje] = useState(false);
  const [vrijednost, setVrijednost] = useState(datum ?? "");
  const oznaka = status === "PLACENO" ? "plaćeno" : "predano";
  if (!uredjuje) {
    return (
      <button
        type="button"
        className={`${styles.badge} ${styles.badgeDugme} ${BADGE[status]}`}
        onClick={() => {
          setVrijednost(datum ?? "");
          setUredjuje(true);
        }}
        title="Promijeni datum"
        aria-label={`${oznaka} ${datum ? fmtDatum(datum) : ""}, promijeni datum`}
      >
        {oznaka} {datum ? fmtDatum(datum) : "?"}
        <span aria-hidden="true" className={styles.badgeOlovka}>
          ✎
        </span>
      </button>
    );
  }
  return (
    <div className={styles.datumUredi}>
      <span className={styles.fieldLabel}>Datum {status === "PLACENO" ? "plaćanja" : "predaje"}</span>
      <div className={styles.datumUrediRed}>
        <DateInput
          className={`${styles.input} ${styles.inputDatum}`}
          value={vrijednost}
          onValueChange={setVrijednost}
        />
        <button
          type="button"
          className={`${styles.btnPrimary} ${styles.btnSmall}`}
          disabled={!/^\d{4}-\d{2}-\d{2}$/.test(vrijednost)}
          onClick={() => {
            onSnimi(vrijednost);
            setUredjuje(false);
          }}
        >
          Sačuvaj
        </button>
        <button
          type="button"
          className={`${styles.btnGhost} ${styles.btnSmall}`}
          onClick={() => setUredjuje(false)}
        >
          Odustani
        </button>
      </div>
    </div>
  );
}
