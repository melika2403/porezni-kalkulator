"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { listIsplatioci } from "src/api/amsIsplatioci";
import {
  createUplata,
  getKurs,
  getPostavke,
  updateUplata,
  type FreelancerUplata,
  type UplataPayload,
  type UplataStatus,
} from "src/api/freelancer";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import FreelancerTrialCta from "src/components/FreelancerTrialCta/FreelancerTrialCta";
import { KANTONI, type KantonKey } from "src/sections/ams/fillUplatnica";
import { danasIso, EUR_KURS as EUR, fmtDatum, fmtKm, kursGreskaTekst, MJESECI, obracunajAms, STATUS_TEKST, VALUTE } from "./format";
import { tabHref, useOsvjeziEvidenciju } from "./hooks";
import styles from "./freelancer.module.css";

// Ručni unos / izmjena uplate (za uplate od ranije u godini, ili ispravke).
// Obračun računa server; ovdje je isti izračun samo za živi prikaz.
// Za novu uplatu sa punim AMS obrascem i uplatnicama koristi se /ams, ova
// forma sprema podatke iz kojih se AMS i uplatnice mogu ponovo složiti.

const NOVI = "__novi__";

const num = (s: string) => {
  const n = parseFloat(String(s).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const numDec = (s: string) => {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const str = (n: number | null | undefined) =>
  n == null || n === 0 ? "" : String(n).replace(".", ",");

type Props = {
  pocetna?: FreelancerUplata | null;
  onGotovo: () => void;
  onOdustani: () => void;
};

export default function UplataForma({ pocetna, onGotovo, onOdustani }: Props) {
  const osvjezi = useOsvjeziEvidenciju();
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
  const { data: adresar = [] } = useQuery({
    queryKey: ["ams-isplatioci"],
    queryFn: () => unwrap(listIsplatioci()),
  });
  // prebivalište iz postavki: nova uplata kreće sa kantonom i općinom
  const { data: postavke } = useQuery({
    queryKey: ["freelancer-postavke"],
    queryFn: () => unwrap(getPostavke()),
    staleTime: 5 * 60 * 1000,
  });

  const p = pocetna ?? null;
  const [datumPrimitka, setDatumPrimitka] = useState(p?.datumPrimitka ?? danasIso());
  const [periodMjesec, setPeriodMjesec] = useState<number>(
    p?.periodMjesec ?? new Date().getMonth() + 1,
  );
  const [periodGodina, setPeriodGodina] = useState(String(p?.periodGodina ?? new Date().getFullYear()));
  const [isplatilacIzbor, setIsplatilacIzbor] = useState<string>(
    p?.isplatilacId ? String(p.isplatilacId) : NOVI,
  );
  const [isplatilacNaziv, setIsplatilacNaziv] = useState(p?.isplatilacNaziv ?? "");
  const [isplatilacAdresa, setIsplatilacAdresa] = useState(p?.isplatilacAdresa ?? "");
  const [isplatilacGrad, setIsplatilacGrad] = useState(p?.isplatilacGrad ?? "");
  const [isplatilacDrzava, setIsplatilacDrzava] = useState(p?.isplatilacDrzava ?? "");
  const [valuta, setValuta] = useState(p?.valuta ?? "BAM");
  const [iznosValuta, setIznosValuta] = useState(str(p?.valuta === "BAM" ? p?.iznosKm : p?.iznosValuta));
  const [kurs, setKurs] = useState(p && p.valuta !== "BAM" ? String(p.kurs) : "");
  const [kursInfo, setKursInfo] = useState<string | null>(null);
  const [stopaRashoda, setStopaRashoda] = useState<number>(p?.stopaRashoda ?? 20);
  const [porezniKredit, setPorezniKredit] = useState(str(p?.porezniKredit));
  const [kanton, setKanton] = useState<string>(p?.kantonKey ?? "");
  const [opcina, setOpcina] = useState<string>(p?.opcinaKod ?? "");
  useEffect(() => {
    if (p || kanton || !postavke?.kanton) return;
    setKanton(postavke.kanton);
    if (postavke.opcina) setOpcina(postavke.opcina);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postavke]);
  const [status, setStatus] = useState<UplataStatus>(p?.status ?? "OBRACUNATO");
  const [datumPlacanja, setDatumPlacanja] = useState(p?.datumPlacanja ?? "");
  const [datumPredaje, setDatumPredaje] = useState(p?.datumPredaje ?? "");
  const [napomena, setNapomena] = useState(p?.napomena ?? "");
  const [greska, setGreska] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);

  // period prati datum primitka dok korisnik ne dira period ručno
  const [periodRucno, setPeriodRucno] = useState(!!p);
  useEffect(() => {
    if (periodRucno || !/^\d{4}-\d{2}-\d{2}$/.test(datumPrimitka)) return;
    setPeriodMjesec(Number(datumPrimitka.slice(5, 7)));
    setPeriodGodina(datumPrimitka.slice(0, 4));
  }, [datumPrimitka, periodRucno]);

  // EUR je fiksan, BAM nema kurs
  useEffect(() => {
    if (valuta === "EUR") setKurs(String(EUR));
    if (valuta === "BAM") setKurs("");
    setKursInfo(null);
  }, [valuta]);

  const kursBroj = valuta === "BAM" ? 1 : numDec(kurs);
  const iznosKm = useMemo(() => {
    const v = num(iznosValuta);
    if (valuta === "BAM") return v;
    return Math.round(v * kursBroj * 100) / 100;
  }, [iznosValuta, valuta, kursBroj]);
  const obracun = obracunajAms(iznosKm, stopaRashoda, num(porezniKredit));

  const kantonData = kanton ? KANTONI[kanton as KantonKey] : null;

  // kurs važi samo za traženu valutu i datum: ako se promijene dok zahtjev
  // traje, odgovor se odbacuje (inače bi u polje upao kurs druge valute)
  const povuciKurs = useMutation({
    mutationFn: (t: { valuta: string; datum: string }) => unwrap(getKurs(t.valuta, t.datum)),
    onSuccess: (k, t) => {
      if (t.valuta !== valuta || t.datum !== datumPrimitka) return;
      setKurs(String(k.kurs));
      setKursInfo(`${k.izvor}, lista od ${fmtDatum(k.datumListe)}`);
    },
    onError: (e, t) => {
      if (t.valuta !== valuta || t.datum !== datumPrimitka) return;
      setKursInfo(kursGreskaTekst(e, "Kurs nije dostupan, upišite ga ručno."));
    },
  });

  const izaberiIsplatioca = (v: string) => {
    setIsplatilacIzbor(v);
    const i = adresar.find((x) => String(x.id) === v);
    if (i) {
      setIsplatilacNaziv(i.naziv);
      setIsplatilacAdresa(i.adresa ?? "");
      setIsplatilacGrad(i.grad ?? "");
      setIsplatilacDrzava(i.drzava ?? "");
    }
  };

  // Snimak AMS obrasca (sa /ams) vrijedi samo dok su podaci koje nosi isti.
  // Čim se promijeni iznos, datum, period, isplatilac ili obračun, snimak se
  // odbacuje, pa se obrazac ponovo slaže iz reda evidencije. Bez ovoga bi
  // ispravljena uplata i dalje štampala stari AMS PDF sa starim iznosima.
  const snimakVrijedi = () =>
    !!p &&
    p.datumPrimitka === datumPrimitka &&
    p.periodMjesec === periodMjesec &&
    String(p.periodGodina) === String(periodGodina) &&
    (p.isplatilacNaziv ?? "") === isplatilacNaziv &&
    (p.isplatilacAdresa ?? "") === isplatilacAdresa &&
    (p.isplatilacGrad ?? "") === isplatilacGrad &&
    (p.isplatilacDrzava ?? "") === isplatilacDrzava &&
    Number(p.iznosKm) === iznosKm &&
    Number(p.stopaRashoda) === stopaRashoda &&
    Number(p.porezniKredit ?? 0) === num(porezniKredit);

  const spremi = useMutation({
    mutationFn: async () => {
      const payload: UplataPayload = {
        datumPrimitka,
        periodMjesec,
        periodGodina: Number(periodGodina) || null,
        primalacIme: p?.primalacIme ?? [user?.firstName, user?.lastName].filter(Boolean).join(" ") ?? null,
        primalacJmbg: p?.primalacJmbg ?? user?.jmbg ?? null,
        primalacAdresa:
          p?.primalacAdresa ?? [user?.address, user?.city].filter(Boolean).join(", ") ?? null,
        isplatilacId: isplatilacIzbor !== NOVI ? Number(isplatilacIzbor) : null,
        isplatilacNaziv,
        isplatilacAdresa,
        isplatilacGrad,
        isplatilacDrzava,
        valuta,
        iznosValuta: valuta === "BAM" ? iznosKm : num(iznosValuta),
        kurs: valuta === "BAM" ? 1 : kursBroj,
        iznosKm,
        stopaRashoda,
        porezniKredit: num(porezniKredit),
        kantonKey: kanton || null,
        opcinaKod: opcina || null,
        opcinaIme: kantonData?.opcine.find((o) => o.kod === opcina)?.ime ?? null,
        ziroRacun: p?.ziroRacun ?? null,
        status,
        // PREDANO = obrazac predan (bez plaćanja), PLACENO = predano i plaćeno
        datumPredaje: status === "OBRACUNATO" ? null : datumPredaje || danasIso(),
        datumPlacanja: status === "PLACENO" ? datumPlacanja || danasIso() : null,
        napomena: napomena || null,
        // ručni unos nema snimke sa /ams; kod izmjene se snimak obrasca čuva
        // samo ako ga izmjena nije učinila zastarjelim, a uplatnice se uvijek
        // slažu iz reda (kanton i općina se ovdje mogu promijeniti)
        amsPodaci: snimakVrijedi() ? (p?.amsPodaci ?? null) : null,
        uplatnicaPodaci: null,
      };
      const res = p ? await updateUplata(p.id, payload) : await createUplata(payload);
      if (!res.ok) throw new Error(res.error || "GRESKA");
      return res.data;
    },
    onSuccess: () => {
      setGreska(null);
      setLimit(false);
      osvjezi();
      onGotovo();
    },
    onError: (e) => {
      const m = e instanceof Error ? e.message : "";
      if (m === "LIMIT_BESPLATNO") setLimit(true);
      else setGreska(m || "Čuvanje nije uspjelo.");
    },
  });

  const moze =
    /^\d{4}-\d{2}-\d{2}$/.test(datumPrimitka) &&
    isplatilacNaziv.trim().length > 0 &&
    iznosKm > 0 &&
    (valuta === "BAM" || kursBroj > 0);

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>
        <span>{p ? "Izmjena uplate" : "Ručni unos uplate"}</span>
        <span>{p ? `#${p.id}` : "za uplate od ranije ili bez generisanja obrasca"}</span>
      </h2>

      <div className={styles.formGrid3}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Datum primitka</label>
          <DateInput className={styles.input} value={datumPrimitka} onValueChange={setDatumPrimitka} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Period (mjesec)</label>
          <StyledSelect
            value={periodMjesec}
            onChange={(v) => {
              setPeriodRucno(true);
              setPeriodMjesec(Number(v));
            }}
            ariaLabel="Period, mjesec"
            groups={[{ options: MJESECI.map((m, i) => ({ value: i + 1, label: m })) }]}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Period (godina)</label>
          <input
            className={styles.input}
            inputMode="numeric"
            value={periodGodina}
            onChange={(e) => {
              setPeriodRucno(true);
              setPeriodGodina(e.target.value.replace(/\D/g, "").slice(0, 4));
            }}
          />
        </div>
      </div>

      <h3 className={styles.fieldLabel} style={{ margin: "1.1rem 0 0.5rem" }}>Isplatilac (Dio 2)</h3>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Iz adresara</label>
          <StyledSelect
            value={isplatilacIzbor}
            onChange={(v) => izaberiIsplatioca(String(v ?? NOVI))}
            ariaLabel="Isplatilac iz adresara"
            searchable
            groups={[
              {
                options: [
                  { value: NOVI, label: "Upiši isplatioca ručno" },
                  ...adresar.map((i) => ({ value: String(i.id), label: i.naziv })),
                ],
              },
            ]}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Naziv isplatioca *</label>
          <input className={styles.input} value={isplatilacNaziv} onChange={(e) => setIsplatilacNaziv(e.target.value)} placeholder="npr. Upwork Global Inc." />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Adresa</label>
          <input className={styles.input} value={isplatilacAdresa} onChange={(e) => setIsplatilacAdresa(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Grad i država</label>
          <div className={styles.inputRow}>
            <input className={styles.input} value={isplatilacGrad} onChange={(e) => setIsplatilacGrad(e.target.value)} placeholder="Grad" />
            <input className={styles.input} value={isplatilacDrzava} onChange={(e) => setIsplatilacDrzava(e.target.value)} placeholder="Država" />
          </div>
        </div>
      </div>

      <h3 className={styles.fieldLabel} style={{ margin: "1.1rem 0 0.5rem" }}>Iznos i obračun (Dio 3)</h3>
      <div className={styles.formGrid3}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Valuta</label>
          <StyledSelect
            value={valuta}
            onChange={(v) => setValuta(String(v ?? "BAM"))}
            ariaLabel="Valuta"
            groups={[{ options: VALUTE.map((v) => ({ value: v, label: v === "BAM" ? "KM (BAM)" : v })) }]}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>{valuta === "BAM" ? "Iznos (KM) *" : `Iznos (${valuta}) *`}</label>
          <input className={styles.input} inputMode="decimal" placeholder="0,00" value={iznosValuta} onChange={(e) => setIznosValuta(e.target.value)} />
        </div>
        {valuta !== "BAM" && (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Kurs (1 {valuta} = KM)</label>
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                inputMode="decimal"
                value={kurs}
                readOnly={valuta === "EUR"}
                onChange={(e) => setKurs(e.target.value)}
              />
              {valuta !== "EUR" && (
                <button
                  type="button"
                  className={`${styles.btnGhost} ${styles.btnSmall}`}
                  onClick={() => povuciKurs.mutate({ valuta, datum: datumPrimitka })}
                  disabled={povuciKurs.isPending}
                  title="Srednji kurs CBBiH na dan primitka"
                >
                  {povuciKurs.isPending ? "..." : "Kurs CBBiH"}
                </button>
              )}
            </div>
            <span className={styles.hint}>
              {valuta === "EUR" ? "fiksni kurs (currency board)" : kursInfo ?? "srednji kurs CBBiH na dan primitka"}
            </span>
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Normirani rashodi</label>
          <StyledSelect
            value={stopaRashoda}
            onChange={(v) => setStopaRashoda(Number(v) === 30 ? 30 : 20)}
            ariaLabel="Normirani rashodi"
            groups={[{ options: [{ value: 20, label: "20% (standardno)" }, { value: 30, label: "30% (autorske naknade)" }] }]}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Porezni kredit (KM)</label>
          <input className={styles.input} inputMode="decimal" placeholder="0,00" value={porezniKredit} onChange={(e) => setPorezniKredit(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Iznos u KM</label>
          <input className={styles.input} value={iznosKm > 0 ? fmtKm(iznosKm) : ""} readOnly />
        </div>
      </div>

      <div className={styles.obracunBox} style={{ marginTop: "0.9rem" }}>
        <div className={styles.obracunRow}><span>Normirani rashodi ({stopaRashoda}%)</span><strong>{fmtKm(obracun.rashodi)} KM</strong></div>
        <div className={styles.obracunRow}><span>Dohodak</span><strong>{fmtKm(obracun.dohodak)} KM</strong></div>
        <div className={styles.obracunRow}><span>Zdravstveno 4% (kanton {fmtKm(obracun.zdravstvenoKanton)} + FBiH {fmtKm(obracun.zdravstvenoFbih)})</span><strong>{fmtKm(obracun.zdravstveno)} KM</strong></div>
        <div className={styles.obracunRow}><span>Porez 10% (osnovica {fmtKm(obracun.osnovica)})</span><strong>{fmtKm(obracun.razlika)} KM</strong></div>
        <div className={`${styles.obracunRow} ${styles.obracunTotal}`}><span>Neto</span><strong>{fmtKm(obracun.neto)} KM</strong></div>
      </div>

      <h3 className={styles.fieldLabel} style={{ margin: "1.1rem 0 0.5rem" }}>Uplatnice i status</h3>
      <div className={styles.formGrid3}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Kanton prebivališta</label>
          <StyledSelect
            value={kanton || null}
            onChange={(v) => {
              setKanton(String(v ?? ""));
              setOpcina("");
            }}
            placeholder="Izaberi kanton"
            ariaLabel="Kanton"
            groups={[{ options: (Object.keys(KANTONI) as KantonKey[]).map((k) => ({ value: k, label: KANTONI[k].ime })) }]}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Općina</label>
          <StyledSelect
            value={opcina || null}
            onChange={(v) => setOpcina(String(v ?? ""))}
            placeholder={kanton ? "Izaberi općinu" : "Prvo kanton"}
            ariaLabel="Općina"
            disabled={!kanton}
            searchable
            groups={[{ options: (kantonData?.opcine ?? []).map((o) => ({ value: o.kod, label: o.ime })) }]}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Status</label>
          <StyledSelect
            value={status}
            onChange={(v) => setStatus(String(v ?? "OBRACUNATO") as UplataStatus)}
            ariaLabel="Status"
            groups={[{ options: (Object.keys(STATUS_TEKST) as UplataStatus[]).map((s) => ({ value: s, label: STATUS_TEKST[s] })) }]}
          />
        </div>
        {status !== "OBRACUNATO" && (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Datum predaje</label>
            <DateInput className={styles.input} value={datumPredaje} onValueChange={setDatumPredaje} />
          </div>
        )}
        {status === "PLACENO" && (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Datum plaćanja</label>
            <DateInput className={styles.input} value={datumPlacanja} onValueChange={setDatumPlacanja} />
          </div>
        )}
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.fieldLabel}>Napomena</label>
          <textarea className={styles.textarea} value={napomena} onChange={(e) => setNapomena(e.target.value)} placeholder="npr. broj fakture kod klijenta" />
        </div>
      </div>

      {!p && (
        <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
          Podaci o primaocu (Dio 1) se uzimaju iz vašeg profila
          {user ? `: ${[user.firstName, user.lastName].filter(Boolean).join(" ")}${user.jmbg ? `, JMBG ${user.jmbg}` : ""}` : ""}.
          Ako nedostaju, dopunite ih u <a href={tabHref("postavke")}>postavkama</a> prije predaje obrasca.
        </p>
      )}

      {limit && (
        <div className={`${styles.alert} ${styles.alertWarn}`} style={{ marginTop: "1rem" }}>
          Besplatno se čuvaju do 3 uplate godišnje.
          <FreelancerTrialCta variant="inline" what="Evidencija bez ograničenja, podsjetnici, GPD i potvrda o prihodima" />
        </div>
      )}
      {greska && <div className={`${styles.alert} ${styles.alertErr}`} style={{ marginTop: "1rem" }}>{greska}</div>}

      <div className={styles.formActions}>
        <button type="button" className={styles.btnPrimary} onClick={() => spremi.mutate()} disabled={!moze || spremi.isPending}>
          {spremi.isPending ? "Čuvam..." : p ? "Sačuvaj izmjene" : "Sačuvaj uplatu"}
        </button>
        <button type="button" className={styles.btnGhost} onClick={onOdustani}>
          Odustani
        </button>
      </div>
    </div>
  );
}
