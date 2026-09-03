"use client";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { createUplata, getKurs, getPostavke, updateUplata } from "src/api/freelancer";
import { EUR_KURS, fmtDatum, kursGreskaTekst, VALUTE } from "src/sections/freelancer/format";
import FreelancerTrialCta, {
  FREELANCER_QUERY_KEY,
  useFreelancerPristup,
} from "src/components/FreelancerTrialCta/FreelancerTrialCta";
import { useUplatniRacuni } from "src/data/uplatniRacuniLive";
import styles from "./ams.module.css";
import { fillAmsTemplate, type AmsData } from "./fillAms";
import {
  fillUplatnice,
  KANTONI,
  FBIH_ZO_RACUN,
  type KantonKey,
} from "./fillUplatnica";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import CitySelect from "src/components/CitySelect/CitySelect";
import { useCityLookup } from "src/hooks/useCities";
import { formatAddress } from "src/utils/formatAddress";
import PersonFillSelect, {
  type FillData,
} from "src/components/PersonFillSelect/PersonFillSelect";
import AmsIsplatioci, {
  type IsplatilacFill,
} from "src/components/AmsIsplatioci/AmsIsplatioci";
import SaveToProfileButton from "src/components/SaveToProfileButton/SaveToProfileButton";
import PkFreelancerPromo from "src/components/PkFreelancerPromo/PkFreelancerPromo";
import { trackEvent } from "src/api/activity";

/* ── Helpers ── */

const num = (v: string) => {
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const fmtInput = (raw: string): string => {
  const stripped = raw.replace(/\./g, "");
  const commaIdx = stripped.indexOf(",");
  const intPart =
    commaIdx >= 0
      ? stripped.slice(0, commaIdx).replace(/\D/g, "")
      : stripped.replace(/\D/g, "");
  const decPart = commaIdx >= 0 ? stripped.slice(commaIdx) : "";
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + decPart;
};

const fmt = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const r2 = (n: number) => Math.round(n * 100) / 100;

const getTodayIso = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

const isoToDisplay = (iso: string): string => {
  if (!iso || !iso.includes("-")) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
};

const EMPTY_ROW = {
  iznosDohotka: 0,
  zdravstveno: 0,
  osnovica: 0,
  porez: 0,
  porezniKredit: 0,
  razlika: 0,
};

const KANTON_KEYS = Object.keys(KANTONI) as KantonKey[];

const formatZiroRacun = (raw: string): string => {
  const d = raw.replace(/\D/g, "").slice(0, 16);
  const parts = [
    d.slice(0, 3),
    d.slice(3, 6),
    d.slice(6, 14),
    d.slice(14, 16),
  ].filter(Boolean);
  return parts.join("-");
};

const downloadPdf = (bytes: Uint8Array, filename: string) => {
  const ab =
    bytes.buffer instanceof ArrayBuffer
      ? bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        )
      : Uint8Array.from(bytes).buffer;
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* ── Component ── */

export default function AmsForm() {
  // Živi uplatni računi: povuci trenutno stanje šifarnika (admin izmjene)
  useUplatniRacuni();
  const { findByName: findCity } = useCityLookup();
  // Dio 1
  const [imeIPrezime, setImeIPrezime] = useState("");
  const [jmbg, setJmbg] = useState("");
  const [adresa, setAdresa] = useState("");
  const [grad, setGrad] = useState("");
  // AMS se predaje u roku od 5 dana od isplate, pa je period skoro uvijek
  // tekući mjesec, a datum isplate današnji. Sve ostaje ručno izmjenjivo.
  const [datumIsplate, setDatumIsplate] = useState(() => getTodayIso());
  const [periodMjesec, setPeriodMjesec] = useState(() =>
    String(new Date().getMonth() + 1).padStart(2, "0"),
  );
  const [periodGodina, setPeriodGodina] = useState(() =>
    String(new Date().getFullYear()),
  );

  // Dio 2
  const [naziv, setNaziv] = useState("");
  const [adresaIsplatioca, setAdresaIsplatioca] = useState("");
  const [gradIsplatioca, setGradIsplatioca] = useState("");
  const [drzava, setDrzava] = useState("");

  // Dio 3
  const [iznosUplate, setIznosUplate] = useState("");
  // Iznos u stranoj valuti, kao u ručnom unosu PK Freelancera: EUR je fiksan
  // (currency board) i preračunava se dok kucaš; ostale valute idu po srednjem
  // kursu CBBiH na datum isplate, koji se povuče na klik. Kurs vrijedi samo
  // za taj par valuta + datum.
  const [valuta, setValuta] = useState("EUR");
  const [iznosValutaInput, setIznosValutaInput] = useState("");
  const [kursCbbh, setKursCbbh] = useState<{
    kurs: number;
    datumListe: string;
    izvor: string;
  } | null>(null);
  const [kursGreska, setKursGreska] = useState<string | null>(null);
  const [odbitakPct, setOdbitakPct] = useState("20");
  const [porezniKredit, setPorezniKredit] = useState("");

  const uKm = (iznos: number, kurs: number) =>
    fmtInput(String(r2(iznos * kurs)).replace(".", ","));
  // promjena valute ili datuma poništava kurs; KM izveden iz tog kursa se
  // briše da ne ostane iznos koji više ne odgovara
  const ponistiKurs = () => {
    if (kursCbbh && num(iznosValutaInput) > 0) setIznosUplate("");
    setKursCbbh(null);
    setKursGreska(null);
  };
  const promijeniValutu = (v: string) => {
    ponistiKurs();
    setValuta(v);
    const iznos = num(iznosValutaInput);
    if (iznos > 0) setIznosUplate(v === "EUR" ? uKm(iznos, EUR_KURS) : "");
  };
  const promijeniDatumIsplate = (v: string) => {
    setDatumIsplate(v);
    if (valuta !== "EUR") ponistiKurs();
  };
  // Kurs vrijedi samo za par valuta + datum sa kojim je zatražen. Ako korisnik
  // promijeni valutu ili datum dok zahtjev traje, odgovor se odbacuje, inače bi
  // se iznos preračunao po kursu druge valute.
  const povuciKurs = useMutation({
    mutationFn: (t: { valuta: string; datum: string }) => unwrap(getKurs(t.valuta, t.datum)),
    onSuccess: (k, t) => {
      if (t.valuta !== valuta || t.datum !== datumIsplate) return;
      setKursCbbh(k);
      setKursGreska(null);
      const iznos = num(iznosValutaInput);
      if (iznos > 0) setIznosUplate(uKm(iznos, k.kurs));
    },
    onError: (e, t) => {
      if (t.valuta !== valuta || t.datum !== datumIsplate) return;
      setKursGreska(
        kursGreskaTekst(e, "Kurs CBBiH za taj datum nije dostupan, upišite iznos u KM ručno."),
      );
    },
  });
  const iznosStrano = num(iznosValutaInput);
  const kursValute = valuta === "EUR" ? EUR_KURS : (kursCbbh?.kurs ?? 0);
  const trebaPreracun = valuta !== "EUR" && iznosStrano > 0 && !kursCbbh;

  // Dio 4
  const [datum, setDatum] = useState(() => getTodayIso());
  const [loading, setLoading] = useState(false);
  // PK Freelancer poziv se pokaže tek kad je obrazac generisan: tad je
  // korisnik upravo uradio posao koji bi mu asistent pamtio
  // PK Freelancer evidencija: preuzimanje obrasca ili uplatnica prijavljenom
  // korisniku samo upiše uplatu (nema posebnog klika). Jedan obrazac = jedan
  // zapis: ponovno preuzimanje poslije ispravke AŽURIRA isti zapis (sacuvanaId),
  // ne pravi duplikat. isplatilacId = veza na adresar ako je isplatilac biran.
  // sacuvanaId stoji u ref-u, ne u stanju: dva brza klika (obrazac pa uplatnice)
  // idu kroz isti red (upisRed), pa drugi upis vidi id koji je prvi dobio.
  const [isplatilacId, setIsplatilacId] = useState<number | null>(null);
  const sacuvanaIdRef = useRef<number | null>(null);
  const upisRed = useRef<Promise<void>>(Promise.resolve());
  // pretplatnik (ili proba) uz preuzimanje dobija i prečicu u svoju evidenciju
  const { hasAccess: frlPristup } = useFreelancerPristup();
  const [evidencija, setEvidencija] = useState<{
    stanje: "idle" | "saved" | "limit" | "error";
    azurirano?: boolean;
    poruka?: string;
  }>({ stanje: "idle" });

  // Dio 5 — Uplatnice
  const [kanton, setKanton] = useState<KantonKey | "">("");
  const [opcina, setOpcina] = useState("");
  const [ziroRacun, setZiroRacun] = useState("");
  const [loadingUpl, setLoadingUpl] = useState(false);

  const [sourceClientId, setSourceClientId] = useState<number | null>(null);
  const [sourceOrgId, setSourceOrgId] = useState<number | null>(null);

  /* ── Fill from profile/client ── */

  const fillPersonal = useCallback((data: FillData) => {
    if (data.jmbg) setJmbg(data.jmbg);
    const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
    if (name) setImeIPrezime(name);
    if (data.address) setAdresa(data.address);
    if (data.city) setGrad(data.city);
    if (data.sourceClientId !== undefined)
      setSourceClientId(data.sourceClientId);
    if (data.sourceWorkerOrgId !== undefined)
      setSourceOrgId(data.sourceWorkerOrgId);
  }, []);

  // Popuna iz snimljenog isplatioca: prepisuje sva četiri polja, i praznim
  // vrijednostima, da odabir uvijek da tačno ono što je snimljeno.
  const fillIsplatilac = useCallback((data: IsplatilacFill) => {
    setNaziv(data.naziv);
    setAdresaIsplatioca(data.adresa);
    setGradIsplatioca(data.grad);
    setDrzava(data.drzava);
    setIsplatilacId(data.id ?? null);
  }, []);

  /* ── Computed ── */
  const computed = useMemo(() => {
    const bruto = num(iznosUplate);
    const pct = Math.min(Math.max(num(odbitakPct), 0), 100);
    const rashodi = r2(bruto * (pct / 100));
    const iznosDohotka = r2(bruto - rashodi);
    const zdravstveno = r2(iznosDohotka * 0.04);
    const osnovica = r2(iznosDohotka - zdravstveno);
    const porez = r2(osnovica * 0.1);
    const kredit = num(porezniKredit);
    const razlika = r2(porez - kredit);
    const zdravstvenoKanton = r2(zdravstveno * 0.898);
    const zdravstvenoFbih = r2(zdravstveno * 0.102);
    return {
      pct,
      rashodi,
      iznosDohotka,
      zdravstveno,
      zdravstvenoKanton,
      zdravstvenoFbih,
      osnovica,
      porez,
      kredit,
      razlika,
    };
  }, [iznosUplate, odbitakPct, porezniKredit]);

  const kantonData = kanton ? KANTONI[kanton] : null;
  const opcinaData = kantonData?.opcine.find((o) => o.kod === opcina) ?? null;

  /* ── Build AMS data ── */
  const buildAmsData = useCallback((): AmsData => {
    const row1 = {
      iznosDohotka: computed.iznosDohotka,
      zdravstveno: computed.zdravstveno,
      osnovica: computed.osnovica,
      porez: computed.porez,
      porezniKredit: computed.kredit,
      razlika: computed.razlika,
    };
    return {
      imeIPrezime,
      jmbg,
      adresa: formatAddress(adresa, grad, findCity(grad)?.postalCode),
      datumIsplate,
      periodMjesec,
      periodGodina,
      naziv,
      adresaIsplatioca: formatAddress(adresaIsplatioca, gradIsplatioca, findCity(gradIsplatioca)?.postalCode),
      drzava,
      rows: [row1, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW],
      ukupnoZdravstveno: computed.zdravstveno,
      ukupnoOsnovica: computed.osnovica,
      ukupnoPorez: computed.porez,
      ukupnoPorezniKredit: computed.kredit,
      ukupnoRazlika: computed.razlika,
      datum: isoToDisplay(datum),
    };
  }, [
    imeIPrezime,
    jmbg,
    adresa,
    grad,
    datumIsplate,
    periodMjesec,
    periodGodina,
    naziv,
    adresaIsplatioca,
    gradIsplatioca,
    drzava,
    computed,
    datum,
    findCity,
  ]);

  /* ── Export AMS ── */
  const handleExport = async () => {
    setLoading(true);
    try {
      const bytes = await fillAmsTemplate(buildAmsData());
      // godina u nazivu je 4-cifarna kakva je i u polju; raniji "20" + polje
      // je davao "202026" čim korisnik upiše punu godinu
      downloadPdf(
        bytes,
        `AMS-1035_${periodMjesec || "XX"}_${parsedYear ?? "XXXX"}.pdf`,
      );
      trackEvent("AMS_GENERATE", "AMS-1035");
      // PK Freelancer: preuzet obrazac = upisana uplata (poslije preuzimanja,
      // da greška upisa nikad ne zaustavi PDF)
      upisiAkoTreba();
    } finally {
      setLoading(false);
    }
  };

  /* ── Parsed period for save ── */
  const parsedYear = (() => {
    const raw = periodGodina;
    if (/^\d{4}$/.test(raw)) return parseInt(raw);
    if (/^\d{2}$/.test(raw)) return 2000 + parseInt(raw);
    return null;
  })();
  const parsedMonth = /^\d{1,2}$/.test(periodMjesec)
    ? parseInt(periodMjesec)
    : null;

  /* ── PK Freelancer: sačuvaj ovu uplatu u evidenciju ── */
  const qc = useQueryClient();
  // null = gost, undefined = još se učitava
  const { data: prijavljeni } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
  // Prebivalište iz postavki PK Freelancera: kanton i općina se predpopune
  // dok su polja prazna, korisnik ih i dalje može promijeniti za ovu uplatu.
  const { data: frlPostavke } = useQuery({
    queryKey: ["freelancer-postavke"],
    queryFn: () => unwrap(getPostavke()),
    enabled: !!prijavljeni,
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (!frlPostavke?.kanton || kanton) return;
    if (!(frlPostavke.kanton in KANTONI)) return;
    setKanton(frlPostavke.kanton as KantonKey);
    if (frlPostavke.opcina) setOpcina(frlPostavke.opcina);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frlPostavke]);
  // Pretplatnik PK Freelancera (ili proba): Dio 1 se popuni iz profila čim se
  // obrazac otvori, dok su polja prazna. "Popuni podatke" i dalje radi za
  // popunu iz klijenta ili radnika, i prepisuje ovo.
  useEffect(() => {
    if (!frlPristup || !prijavljeni) return;
    if (imeIPrezime || jmbg || adresa || grad) return;
    fillPersonal({
      jmbg: prijavljeni.jmbg,
      firstName: prijavljeni.firstName,
      lastName: prijavljeni.lastName,
      address: prijavljeni.address,
      city: prijavljeni.city,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frlPristup, prijavljeni]);
  const adresaPrimaoca = formatAddress(adresa, grad, findCity(grad)?.postalCode);
  const buildUplataPayload = () => {
    // u valuti se evidentira samo kad je kurs poznat (EUR fiksni, ostale sa
    // CBBiH liste); inače je to iznos unesen direktno u KM. Server provjerava
    // da se iznosKm slaže sa iznosValuta x kurs.
    const uValuti = iznosStrano > 0 && kursValute > 0;
    return {
      datumPrimitka: datumIsplate,
      periodMjesec: parsedMonth,
      periodGodina: parsedYear,
      primalacIme: imeIPrezime,
      primalacJmbg: jmbg,
      primalacAdresa: adresaPrimaoca,
      isplatilacId,
      isplatilacNaziv: naziv,
      isplatilacAdresa: adresaIsplatioca,
      isplatilacGrad: gradIsplatioca,
      isplatilacDrzava: drzava,
      valuta: uValuti ? valuta : "BAM",
      iznosValuta: uValuti ? iznosStrano : num(iznosUplate),
      kurs: uValuti ? kursValute : 1,
      iznosKm: num(iznosUplate),
      // stvarno unesena stopa (server je ograničava na 0 do 100), da evidencija
      // i GPD računaju po istoj stopi po kojoj je obrazac predan
      stopaRashoda: computed.pct,
      porezniKredit: num(porezniKredit),
      kantonKey: kanton || null,
      opcinaKod: opcina || null,
      opcinaIme: opcinaData?.ime ?? null,
      ziroRacun: ziroRacun || null,
      // snimci iz kojih se isti PDF-ovi kasnije ponovo generišu
      amsPodaci: buildAmsData(),
      uplatnicaPodaci:
        kanton && opcina && opcinaData
          ? {
              imeIPrezime,
              adresa: adresaPrimaoca,
              jmbg,
              periodMjesec,
              periodGodina,
              zdravstvenoKanton: computed.zdravstvenoKanton,
              zdravstvenoFbih: computed.zdravstvenoFbih,
              porez: computed.razlika,
              kantonKey: kanton,
              opcinaKod: opcina,
              opcinaIme: opcinaData.ime,
              datum,
              ziroRacun: ziroRacun || undefined,
            }
          : null,
    };
  };
  // upis ima smisla tek kad obrazac ima iznos i isplatioca (prazan obrazac se
  // smije preuzeti, ali se ne evidentira)
  const mozeUpisati =
    num(iznosUplate) > 0 && naziv.trim().length > 0 && parsedYear !== null;
  // Obrazac i uplatnice zovu isti upis. Umjesto preskakanja kad je upis "u
  // toku" (što je pravilo duplikat ili gubilo kanton i općinu), upisi se nižu:
  // drugi sačeka prvi i onda dopuni isti zapis.
  const upisiAkoTreba = () => {
    if (!prijavljeni || !mozeUpisati) return;
    const payload = buildUplataPayload();
    upisRed.current = upisRed.current
      .catch(() => undefined)
      .then(async () => {
        const id = sacuvanaIdRef.current;
        const res = id
          ? await updateUplata(id, payload)
          : await createUplata(payload);
        if (!res.ok) {
          const msg = res.error || "";
          setEvidencija(
            msg === "LIMIT_BESPLATNO"
              ? { stanje: "limit" }
              : {
                  stanje: "error",
                  poruka: msg || "Upis u evidenciju nije uspio.",
                },
          );
          return;
        }
        sacuvanaIdRef.current = res.data.id;
        setEvidencija({ stanje: "saved", azurirano: id !== null });
        if (id === null) trackEvent("FREELANCER_UPLATA_SACUVANA", "ams");
        qc.invalidateQueries({ queryKey: FREELANCER_QUERY_KEY });
      });
  };
  // izmjena poslije upisa sklanja poruku; sljedeće preuzimanje ažurira isti zapis
  useEffect(() => {
    setEvidencija({ stanje: "idle" });
  }, [iznosUplate, naziv, datumIsplate]);
  // Ispravka iznosa ili sitnih podataka ažurira isti zapis, ali drugi
  // isplatilac ili drugi datum isplate su NOVA uplata: veza na zapis se kida
  // da sljedeće preuzimanje ne prepiše prvu uplatu podacima druge.
  useEffect(() => {
    sacuvanaIdRef.current = null;
  }, [naziv, isplatilacId, datumIsplate]);

  /* ── Export Uplatnice ── */
  const handleExportUplatnice = async () => {
    if (!kanton || !opcina || !opcinaData) return;
    setLoadingUpl(true);
    try {
      const bytes = await fillUplatnice({
        imeIPrezime,
        adresa: formatAddress(adresa, grad, findCity(grad)?.postalCode),
        jmbg,
        periodMjesec,
        periodGodina,
        zdravstvenoKanton: computed.zdravstvenoKanton,
        zdravstvenoFbih: computed.zdravstvenoFbih,
        porez: computed.razlika,
        kantonKey: kanton,
        opcinaKod: opcina,
        opcinaIme: opcinaData.ime,
        datum,
        ziroRacun: ziroRacun || undefined,
      });
      downloadPdf(
        bytes,
        `Uplatnice_${periodMjesec || "XX"}_${periodGodina || "XXXX"}.pdf`,
      );
      // i uplatnice upisuju/ažuriraju isti zapis (donose kanton i općinu)
      upisiAkoTreba();
    } finally {
      setLoadingUpl(false);
    }
  };

  const hasAmount = num(iznosUplate) > 0;
  const canDownloadUpl =
    kanton !== "" &&
    opcina !== "" &&
    hasAmount &&
    periodMjesec !== "" &&
    periodGodina.length === 4;

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <p className={styles.label}>Obrazac AMS-1035</p>
        <h1 className={styles.h1}>
          AMS-1035 obrazac, akontacija poreza po odbitku na <em>druge samostalne djelatnosti</em>
        </h1>
        <p className={styles.subtitle}>
          Kako popuniti AMS-1035 obrazac? Brz i jednostavan AMS-1035 generator, 
          u par koraka popunite obrazac za akontaciju poreza po odbitku na druge
          samostalne djelatnosti i prihod iz inostranstva. Kad kreirate obrazac
          dobijete i automatski popunjene uplatnice spremne za banku ili
          elektronsko plaćanje, besplatno i bez registracije.
        </p>
      </div>

      {/* Dvije kolone od 1200px: obrazac + bočna PK Freelancer kartica */}
      <div className={styles.layout}>
      <div className={styles.glavno}>
      {/* Dio 1 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 1, Podaci o <em>primaocu</em>
        </h2>
        <PersonFillSelect onFill={fillPersonal} />
        <div className={styles.fieldGrid}>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>1) Ime i prezime</label>
            <input
              className={styles.fieldInput}
              placeholder="Ime i prezime primaoca"
              value={imeIPrezime}
              onChange={(e) => setImeIPrezime(e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>2) JMBG</label>
            <input
              className={styles.fieldInput}
              inputMode="numeric"
              maxLength={13}
              placeholder="0000000000000"
              value={jmbg}
              onChange={(e) =>
                setJmbg(e.target.value.replace(/\D/g, "").slice(0, 13))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>4) Datum isplate</label>
            <DateInput
              className={styles.fieldInput}
              value={datumIsplate}
              onValueChange={promijeniDatumIsplate}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>3) Adresa</label>
            <input
              className={styles.fieldInput}
              placeholder="Ulica i broj"
              value={adresa}
              onChange={(e) => setAdresa(e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Grad</label>
            <CitySelect
              value={grad}
              onChange={setGrad}
              className={styles.fieldInput}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>5) Period, Mjesec</label>
            <StyledSelect
              ariaLabel="5) Period, Mjesec"
              wrapStyle={{ width: "100%" }}
              value={periodMjesec}
              onChange={(v) => setPeriodMjesec(String(v ?? ""))}
              groups={[
                {
                  options: [
                    { value: "", label: "– Odaberite mjesec –" },
                    { value: "01", label: "Januar" },
                    { value: "02", label: "Februar" },
                    { value: "03", label: "Mart" },
                    { value: "04", label: "April" },
                    { value: "05", label: "Maj" },
                    { value: "06", label: "Juni" },
                    { value: "07", label: "Juli" },
                    { value: "08", label: "August" },
                    { value: "09", label: "Septembar" },
                    { value: "10", label: "Oktobar" },
                    { value: "11", label: "Novembar" },
                    { value: "12", label: "Decembar" },
                  ],
                },
              ]}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>5) Period, Godina</label>
            <input
              className={styles.fieldInput}
              inputMode="numeric"
              maxLength={4}
              placeholder="2026"
              value={periodGodina}
              onChange={(e) =>
                setPeriodGodina(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
            />
          </div>
        </div>
      </section>

      {/* Dio 2 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 2, Podaci o <em>isplatiocu</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>6) Naziv</label>
            <input
              className={styles.fieldInput}
              placeholder="Naziv isplatioca"
              value={naziv}
              onChange={(e) => setNaziv(e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>7) Adresa</label>
            <input
              className={styles.fieldInput}
              placeholder="Ulica i broj"
              value={adresaIsplatioca}
              onChange={(e) => setAdresaIsplatioca(e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Grad isplatioca</label>
            <CitySelect
              value={gradIsplatioca}
              onChange={setGradIsplatioca}
              className={styles.fieldInput}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>8) Država</label>
            <input
              className={styles.fieldInput}
              placeholder="npr. Hrvatska"
              value={drzava}
              onChange={(e) => setDrzava(e.target.value)}
            />
          </div>
          {/* Adresar isplatilaca stoji u praznoj ćeliji uz Državu: isti
              isplatilac se ponavlja svaki mjesec, pa se snimi jednom. */}
          <AmsIsplatioci
            current={{
              naziv,
              adresa: adresaIsplatioca,
              grad: gradIsplatioca,
              drzava,
            }}
            onFill={fillIsplatilac}
          />
        </div>
      </section>

      {/* Dio 3 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 3, Podaci o <em>prihodima, porezu i doprinosima</em>
        </h2>

        <div className={styles.sredstvaGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>9) Iznos dohotka (KM)</label>
            <input
              className={styles.fieldInput}
              inputMode="decimal"
              placeholder="0,00"
              value={iznosUplate}
              onChange={(e) => {
                setIznosUplate(fmtInput(e.target.value));
                // ručno upisan KM više nije preračun iz valute
                setIznosValutaInput("");
                setKursGreska(null);
              }}
            />
            <div className={styles.eurRow}>
              <span className={styles.eurLabel}>ili unesi u valuti</span>
              <div className={styles.valutaWrap}>
                <StyledSelect
                  value={valuta}
                  onChange={(v) => promijeniValutu(String(v ?? "EUR"))}
                  ariaLabel="Valuta"
                  className={styles.valutaSelect}
                  groups={[
                    {
                      options: VALUTE.filter((v) => v !== "BAM").map((v) => ({
                        value: v,
                        label: v,
                      })),
                    },
                  ]}
                />
              </div>
              <input
                className={styles.eurInput}
                inputMode="decimal"
                placeholder={`0,00 ${valuta}`}
                aria-label={`Iznos u ${valuta}`}
                value={iznosValutaInput}
                onChange={(e) => {
                  const raw = fmtInput(e.target.value);
                  setIznosValutaInput(raw);
                  const iznos = num(raw);
                  // EUR i valuta sa povučenim kursom se preračunavaju dok
                  // kucaš; bez kursa KM čeka klik na preračun
                  if (kursValute > 0) setIznosUplate(iznos > 0 ? uKm(iznos, kursValute) : "");
                }}
              />
              {valuta === "EUR" ? (
                <span className={styles.eurRate}>1 € = 1,95583 KM</span>
              ) : trebaPreracun ? (
                <button
                  type="button"
                  className={styles.kursBtn}
                  onClick={() => povuciKurs.mutate({ valuta, datum: datumIsplate })}
                  disabled={povuciKurs.isPending}
                  title="Srednji kurs CBBiH na datum isplate"
                >
                  {povuciKurs.isPending ? "Povlačim kurs..." : "Preračunaj po kursu CBBiH"}
                </button>
              ) : null}
            </div>
            {kursCbbh && valuta !== "EUR" && iznosStrano > 0 && (
              <div className={styles.hint}>
                {fmt(iznosStrano)} {valuta} ×{" "}
                {kursCbbh.kurs.toLocaleString("de-DE", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 6,
                })}{" "}
                = {fmt(r2(iznosStrano * kursCbbh.kurs))} KM, srednji kurs CBBiH, lista od{" "}
                {fmtDatum(kursCbbh.datumListe)}
              </div>
            )}
            {/* bez preračuna obrazac nema iznos: promjena valute ili datuma
                poništi kurs, pa korisnik mora znati zašto je polje prazno */}
            {trebaPreracun && !povuciKurs.isPending && (
              <div className={styles.kursNapomena}>
                Iznos u KM se upiše tek kad preračunate po kursu za datum isplate.
              </div>
            )}
            {kursGreska && <div className={styles.kursGreska}>{kursGreska}</div>}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Odbitak (rashodi)</label>
            <div className={styles.pctWrap}>
              <input
                className={`${styles.fieldInput} ${styles.pctInput}`}
                inputMode="numeric"
                maxLength={3}
                placeholder="20"
                value={odbitakPct}
                onChange={(e) =>
                  setOdbitakPct(e.target.value.replace(/\D/g, "").slice(0, 3))
                }
              />
              <span className={styles.pctSuffix}>%</span>
            </div>
            <p className={styles.hint}>
              Pravo na priznavanje rashoda u iznosu od 20% (30% ukoliko se radi
              o autorskim naknadama)
            </p>
          </div>
        </div>

        {hasAmount && (
          <div className={styles.breakdown}>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>
                Normirani rashodi ({odbitakPct}%)
              </span>
              <span className={styles.breakdownValue}>
                − {fmt(computed.rashodi)} KM
              </span>
            </div>
            <div className={`${styles.breakdownRow} ${styles.breakdownBold}`}>
              <span className={styles.breakdownLabel}>
                9) Iznos dohotka (osnova za obračun)
              </span>
              <span className={styles.breakdownValue}>
                {fmt(computed.iznosDohotka)} KM
              </span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>
                10) Zdravstveno osiguranje (× 0,04)
              </span>
              <span className={styles.breakdownValue}>
                {fmt(computed.zdravstveno)} KM
              </span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>
                11) Osnovica za porez (9 − 10)
              </span>
              <span className={styles.breakdownValue}>
                {fmt(computed.osnovica)} KM
              </span>
            </div>
            <div className={`${styles.breakdownRow} ${styles.breakdownBold}`}>
              <span className={styles.breakdownLabel}>
                12) Iznos poreza (× 0,1)
              </span>
              <span className={styles.breakdownValue}>
                {fmt(computed.porez)} KM
              </span>
            </div>
          </div>
        )}

        <div className={styles.kreditRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              13) Porezni kredit plaćen u inostranstvu (KM)
            </label>
            <input
              className={styles.fieldInput}
              inputMode="decimal"
              placeholder="0,00"
              value={porezniKredit}
              onChange={(e) => setPorezniKredit(fmtInput(e.target.value))}
            />
          </div>
          {hasAmount && (
            <div className={styles.razlikaBox}>
              <span className={styles.razlikaLabel}>
                14) Razlika poreza za uplatu
              </span>
              <span
                className={`${styles.razlikaValue} ${computed.razlika > 0 ? styles.taxDue : styles.refund}`}
              >
                {fmt(computed.razlika)} KM
              </span>
            </div>
          )}
        </div>

        {hasAmount && (
          <div className={styles.netSummary}>
            <div className={styles.netTitle}>Pregled isplate</div>
            <div className={styles.netRow}>
              <span className={styles.netLabel}>
                Primljeno na račun (bruto)
              </span>
              <span className={styles.netValue}>
                {fmt(num(iznosUplate))} KM
              </span>
            </div>
            <div className={styles.netRow}>
              <span className={styles.netLabel}>
                − Zdravstveno osiguranje (4%)
              </span>
              <span className={styles.netValue}>
                − {fmt(computed.zdravstveno)} KM
              </span>
            </div>
            <div className={styles.netRow}>
              <span className={styles.netLabel}>− Porez za uplatu</span>
              <span className={styles.netValue}>
                − {fmt(computed.razlika)} KM
              </span>
            </div>
            <div className={`${styles.netRow} ${styles.netSumRow}`}>
              <span className={styles.netLabel}>= Ukupni troškovi</span>
              <span className={styles.netDeduct}>
                − {fmt(r2(computed.zdravstveno + computed.razlika))} KM
              </span>
            </div>
            <div className={`${styles.netRow} ${styles.netFinalRow}`}>
              <span className={styles.netFinalLabel}>Čisti prihod</span>
              <span className={styles.netFinal}>
                {fmt(
                  r2(
                    num(iznosUplate) - computed.zdravstveno - computed.razlika,
                  ),
                )}{" "}
                KM
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Dio 4 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 4, <em>Izjava</em>
        </h2>
        <p className={styles.izjavaText}>
          Upoznat sam sa sankcijama propisanim Zakonom o Poreznoj upravi i
          izjavljujem da su podaci navedeni u ovoj prijavi, uključujući sve
          priloge tačni, potpuni i jasni.
        </p>
        <div className={styles.dateField}>
          <span className={styles.dateLabel}>Datum:</span>
          <DateInput
            className={styles.fieldInput}
            value={datum}
            onValueChange={setDatum}
          />
        </div>
      </section>

      {/* Export AMS */}
      <div className={styles.actions}>
        <SaveToProfileButton
          type="AMS"
          year={parsedYear}
          month={parsedMonth}
          title={`AMS-1035 · ${imeIPrezime} · ${parsedMonth ?? "?"}/${parsedYear ?? "?"}`}
          buildData={buildAmsData}
          disabled={parsedYear === null}
          defaultOrganizationId={sourceOrgId}
          defaultClientId={sourceClientId}
        />
        <button
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={loading}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
          </svg>
          {loading ? "Generisanje..." : "Preuzmi AMS-1035 PDF"}
        </button>
        {frlPristup && (
          <Link href="/freelancer?tab=uplate" className={styles.freelancerBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
            </svg>
            Uđi u PK Freelancer
          </Link>
        )}
      </div>

      {prijavljeni && evidencija.stanje === "saved" && (
        <div className={styles.evidBox} role="status">
          {evidencija.azurirano
            ? "Zapis u PK Freelancer evidenciji je ažuriran prema ovom obrascu."
            : "Uplata je upisana u PK Freelancer evidenciju: AMS i uplatnice možete ponovo preuzeti, a rok za predaju i GPD prate se automatski."}{" "}
          <Link href="/freelancer?tab=uplate">Otvori evidenciju</Link>
        </div>
      )}
      {prijavljeni && evidencija.stanje === "limit" && (
        <div className={styles.evidBoxWarn}>
          Obrazac je preuzet, ali nije upisan u evidenciju: besplatno se čuvaju
          do 3 uplate godišnje. Za više uplata, podsjetnike i GPD iz evidencije
          treba PK Freelancer.
          <FreelancerTrialCta
            variant="inline"
            what="Evidencija bez ograničenja, podsjetnici na rok, GPD i potvrda o prihodima"
          />
        </div>
      )}
      {prijavljeni && evidencija.stanje === "error" && (
        <div className={styles.evidBoxWarn}>
          Obrazac je preuzet, ali upis u evidenciju nije uspio: {evidencija.poruka}
        </div>
      )}
      {prijavljeni === null && (
        <p className={styles.evidHint}>
          Uz besplatnu registraciju svaki preuzeti obrazac se sam upisuje u{" "}
          <Link href="/registracija?next=/ams">PK Freelancer evidenciju</Link>, pa
          AMS i uplatnice preuzimate ponovo i pratite rok za predaju.
        </p>
      )}
      {/* Kompaktne trake poslije generisanja više nema: bočna kartica sada na
          uskim ekranima stoji odmah ispod naslova, pa bi traka bila ista
          reklama drugi put na istom ekranu. */}

      {/* Dio 5, Uplatnice */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 5, <em>Uplatnice</em>
        </h2>
        <p className={styles.izjavaText}>
          Odaberite kanton i općinu te preuzmite tri popunjene uplatnice:
          doprinos za zdravstveno osiguranje kantonalnom zavodu (89,8%),
          doprinos Zavodu zdravstvenog osiguranja i reosiguranja FBiH (10,2%) i
          porez na dohodak kantonalnom budžetu.
        </p>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Kanton</label>
            <StyledSelect
              ariaLabel="Kanton"
              placeholder="– Odaberite kanton –"
              value={kanton || null}
              onChange={(v) => {
                setKanton(String(v) as KantonKey);
                setOpcina("");
              }}
              groups={[
                {
                  options: KANTON_KEYS.map((k) => ({
                    value: k,
                    label: KANTONI[k].ime,
                  })),
                },
              ]}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Općina</label>
            <StyledSelect
              ariaLabel="Općina"
              placeholder="– Odaberite općinu –"
              searchable
              searchPlaceholder="Pretraži općinu..."
              disabled={!kanton}
              value={opcina || null}
              onChange={(v) => setOpcina(String(v))}
              groups={[
                {
                  options: (kantonData?.opcine ?? []).map((o) => ({
                    value: o.kod,
                    label: o.ime,
                  })),
                },
              ]}
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>Žiro račun pošiljatelja</label>
            <input
              className={styles.fieldInput}
              inputMode="numeric"
              placeholder="338-000-12345678-90"
              value={ziroRacun}
              onChange={(e) => setZiroRacun(formatZiroRacun(e.target.value))}
            />
            <p className={styles.hint}>
              Ukoliko plaćate preko žiro računa, unesite vaš žiro račun. Ako
              plaćate u gotovini, ostavite prazno.
            </p>
          </div>
        </div>

        <div className={styles.uplUplatnicaInfo}>
          <div className={styles.uplCard}>
            <span className={styles.uplCardNum}>1</span>
            <div>
              <div className={styles.uplCardTitle}>
                Zdravstveno osiguranje, kanton
              </div>
              <div className={styles.uplCardSub}>
                {kantonData
                  ? `${kantonData.zoRacun} · ${kantonData.ime}`
                  : "Odaberite kanton"}
              </div>
            </div>
            {hasAmount && (
              <span className={styles.uplCardIznos}>
                {fmt(computed.zdravstvenoKanton)} KM
              </span>
            )}
          </div>
          <div className={styles.uplCard}>
            <span className={styles.uplCardNum}>2</span>
            <div>
              <div className={styles.uplCardTitle}>
                Zdravstveno osiguranje, FBiH
              </div>
              <div className={styles.uplCardSub}>
                {FBIH_ZO_RACUN} · ZZO FBiH
              </div>
            </div>
            {hasAmount && (
              <span className={styles.uplCardIznos}>
                {fmt(computed.zdravstvenoFbih)} KM
              </span>
            )}
          </div>
          <div className={styles.uplCard}>
            <span className={styles.uplCardNum}>3</span>
            <div>
              <div className={styles.uplCardTitle}>
                Porez na dohodak, kantonalni budžet
              </div>
              <div className={styles.uplCardSub}>
                {kantonData
                  ? `${kantonData.budzet} · Budžet ${kantonData.genitiv}`
                  : "Odaberite kanton"}
              </div>
            </div>
            {hasAmount && (
              <span
                className={`${styles.uplCardIznos} ${computed.razlika > 0 ? styles.taxDue : styles.refund}`}
              >
                {fmt(computed.razlika)} KM
              </span>
            )}
          </div>
        </div>

        <div className={styles.actions} style={{ marginTop: "1.5rem" }}>
          <button
            className={styles.exportBtn}
            onClick={handleExportUplatnice}
            disabled={loadingUpl || !canDownloadUpl}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
            </svg>
            {loadingUpl ? "Generisanje..." : "Preuzmi 3 uplatnice (PDF)"}
          </button>
        </div>
      </section>

      {/* Napomena o podacima: gostu je obrazac stvarno bez traga, prijavljenom
          se preuzeta uplata upisuje u njegovu PK Freelancer evidenciju. */}
      {prijavljeni ? (
        <p className={styles.dataNapomena}>
          Preuzimanjem obrasca ili uplatnica ova uplata se upisuje u vašu PK
          Freelancer evidenciju, da AMS i uplatnice možete preuzeti ponovo i da
          se prati rok za predaju. Zapis vidite i brišete u{" "}
          <Link href="/freelancer?tab=uplate">evidenciji uplata</Link>. Nakon
          spremanja PDF dokumenta uvijek provjerite tačnost podataka.
        </p>
      ) : (
        <p className={styles.dataNapomena}>
          Porezni kalkulator ne zadržava popunjene podatke ni u kojem obliku.
          Nakon spremanja PDF dokumenta uvijek provjerite tačnost podataka.
        </p>
      )}

      {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta je AMS-1035 <em>obrazac</em>?
        </h2>
        <p>
          <strong>AMS-1035</strong> je obrazac kojim se prijavljuje{" "}
          <em>akontacija poreza po odbitku na druge samostalne djelatnosti</em>,{" "}
          porez koji se obračunava i uplaćuje na prihode fizičkih lica iz
          inostranstva. Riječ je o prihodima od freelance rada, honorara,
          konsultantskih usluga, autorskih naknada i sličnih primanja gdje
          isplatilac nije na teritoriji Bosne i Hercegovine.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Obavezni su ga podnijeti svi rezidenti FBiH koji primaju prihode iz
          inostranstva, bilo da su freelanceri, konsultanti, predavači, autori
          ili drugi izvođači koji rade za naručioce van BiH (Upwork, Fiverr,
          direktni klijenti, evropski poslodavci, itd.).
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Stope doprinosa i poreza na <em>drugi samostalni prihod</em>
        </h2>
        <p>
          Na drugi samostalni prihod (prihod iz inostranstva koji se prijavljuje
          obrascem AMS-1035) u FBiH obračunava se{" "}
          <strong>doprinos za zdravstveno osiguranje 4%</strong> i{" "}
          <strong>porez na dohodak 10%</strong>, uz{" "}
          <strong>normirane rashode 20%</strong> (30% za autorske naknade) koji
          umanjuju osnovicu.
        </p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.8 }}>
          <li>
            <strong>Normirani rashodi, 20%</strong> od bruto prihoda (30% za
            autorske naknade); umanjuju poreznu osnovicu.
          </li>
          <li>
            <strong>Doprinos za zdravstveno osiguranje, 4%</strong> na osnovicu
            (drugi samostalni prihod), bez obzira na to da li ste već zdravstveno
            osigurani po osnovu radnog odnosa.
          </li>
          <li>
            <strong>Porez na dohodak, 10%</strong> na osnovicu nakon
            umanjenja za normirane rashode i doprinose.
          </li>
          <li>
            <strong>Porezni kredit</strong>, porez već plaćen u inostranstvu na
            isti prihod odbija se od obaveze u FBiH (sporazumi o izbjegavanju
            dvostrukog oporezivanja).
          </li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          Kalkulator iznad automatski primjenjuje ove stope i izračunava
          osnovicu, doprinos, porez i konačnu obavezu, te popunjava AMS-1035 i
          uplatnice.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Kako popuniti AMS-1035 u <em>3 koraka</em>
        </h2>
        <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Unesite lične podatke i podatke o isplati</strong>, ime,
            prezime, JMB, adresa, datum primitka i bruto iznos sa konverzijom u
            KM po važećem kursu CBBiH na dan primitka. Datum isplate i period
            (mjesec i godina) su već popunjeni na današnji dan i tekući mjesec,
            pa ih mijenjate samo ako se isplata odnosi na raniji period.
          </li>
          <li>
            <strong>Sistem obračunava poreznu osnovicu i obavezu</strong>, 
            normirani rashodi 20% (ili 30% za autorske naknade), zdravstveno
            osiguranje 4%, porez na dohodak 10%. Ako ste već platili porez u
            inostranstvu, unesite ga u polje poreznog kredita.
          </li>
          <li>
            <strong>Preuzmite popunjen AMS-1035 PDF i uplatnice</strong> spremne
            za predaju u nadležnoj poreznoj ispostavi i uplatu u banci.
          </li>
        </ol>
        <p style={{ marginTop: "0.85rem" }}>
          Pošto se obrazac predaje svaki mjesec, uz besplatnu registraciju
          možete sačuvati do 5 isplatilaca (Dio 2) i sljedeći put ih popuniti
          jednim klikom, a vaši lični podaci u Dijelu 1 se popunjavaju iz
          profila. Sve popunjeno ostaje izmjenjivo prije preuzimanja.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Rok za predaju <em>AMS-1035</em>
        </h2>
        <p>
          Obrazac se predaje <strong>u roku od 5 (pet) dana od dana primitka
          dohotka</strong>. Npr. ako ste novac primili 10. u mjesecu, obrazac
          ste dužni predati najkasnije do 15. istog mjeseca u nadležnoj ispostavi
          Porezne uprave FBiH prema mjestu prebivališta fizičkog lica.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Predaja se može izvršiti <strong>elektronski</strong> putem ePortala
          PU FBiH (ako posjedujete kvalifikovani digitalni certifikat) ili{" "}
          <strong>fizički</strong>, obrazac u 2 primjerka uz pripadajuće
          uplatnice se nosi u poreznu ispostavu, gdje šalter potvrđuje prijem
          i daje pečat.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Normirani rashodi, porez i <em>doprinosi</em>
        </h2>
        <p>
          Pri obračunu AMS-1035 obaveze, iz bruto iznosa odbija se sljedeće:
        </p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Normirani rashodi 20%</strong> od bruto iznosa (paušalno
            priznat odbitak). Za <strong>autorske naknade</strong> (književna,
            muzička, filmska, likovna ostvarenja) stopa je <strong>30%</strong>.
          </li>
          <li>
            <strong>Doprinos za zdravstveno osiguranje 4%</strong>, plaća se
            na svaki dohodak od samostalne djelatnosti, bez obzira na to da li
            ste već zdravstveno osigurani po osnovu radnog odnosa. Split: 89,8%
            kantonalni / 10,2% federalni.
          </li>
          <li>
            <strong>Porez na dohodak 10%</strong>, obračunava se na poreznu
            osnovicu (bruto − normirani rashodi − doprinos zdravstvenog).
          </li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          Ako ste već platili porez u zemlji isplate (npr. SAD, Njemačka, UK),
          imate pravo na <strong>porezni kredit</strong> na osnovu sporazuma o
          izbjegavanju dvostrukog oporezivanja. Taj iznos se odbija od obaveze
          u BiH.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Povezani <em>alati</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          <li>
            <a href="/gpd" style={{ color: "var(--sage)", fontWeight: 600 }}>
              GPD-1051, godišnja prijava poreza na dohodak
            </a>,{" "}
            svi prihodi prijavljeni kroz AMS-1035 ulaze u godišnju prijavu.
          </li>
          <li>
            <a href="/preracun-neto-bruto" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Preračun neto/bruto plate
            </a>,{" "}
            provjera obračunatih poreza i doprinosa za radnike.
          </li>
          <li>
            <a href="/javni-prihodi" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Uplatni računi javnih prihoda
            </a>,{" "}
            svi računi i šifre za uplate poreza i doprinosa.
          </li>
        </ul>
      </section>

      <section className={styles.faqSection}>
        <h2 className={styles.faqTitle}>Često postavljena pitanja</h2>
        <div className={styles.faqList}>
          {[
            {
              q: "Ko je obavezan podnositi AMS-1035 obrazac?",
              a: "AMS-1035 obrazac obavezno podnosi svaka fizička osoba rezident FBiH koja prima prihode od obavljanja djelatnosti iz inostranstva, npr. freelance rad, honorari, konsultantske usluge i slično, a isplatilac nije na teritoriji Bosne i Hercegovine.",
            },
            {
              q: "Koji je rok za predaju AMS-1035 obrasca?",
              a: "Obrazac se predaje u roku od 5 (pet) dana od dana primitka dohotka. Dakle, ako ste novac primili 10. u mjesecu, obrazac ste dužni predati do 15. istog mjeseca u nadležnu ispostavu Porezne uprave FBiH prema mjestu prebivališta fizičkog lica.",
            },
            {
              q: "Kolika je stopa rashoda, 20% ili 30%?",
              a: "Standardna stopa normiranih rashoda iznosi 20% od bruto iznosa. Stopa od 30% primjenjuje se isključivo na autorske naknade (npr. književna, muzička, filmska ili likovna ostvarenja). Ukoliko niste sigurni, konzultirajte nadležnog poreznog savjetnika.",
            },
            {
              q: "Šta je porezni kredit i kada ga koristim?",
              a: "Porezni kredit je iznos poreza koji ste već platili u inostranstvu na isti prihod. Na osnovu međunarodnih sporazuma o izbjegavanju dvostrukog oporezivanja, taj iznos možete odbititi od obaveze u FBiH. Unesite tačan iznos u polje 13, razlika za uplatu u BiH biće smanjena.",
            },
            {
              q: "Da li moram platiti zdravstveno osiguranje čak i kad već imam zaposlenje?",
              a: "Da. Doprinos za zdravstveno osiguranje po stopi od 4% plaća se na svaki dohodak od samostalne djelatnosti, bez obzira na to da li ste već zdravstveno osigurani po osnovu radnog odnosa. Taj doprinos se dijeli između kantonalnog zavoda (89,8%) i Federalnog zavoda za zdravstveno osiguranje (10,2%).",
            },
            {
              q: "Kako da znam koji kanton i općinu da odaberem za uplatnice?",
              a: "Odaberite kanton i općinu prema svom trenutnom mjestu stanovanja (adresa prijavljenog boravišta), a ne prema lokaciji isplatioca. Svaki kanton ima vlastiti žiro račun za zdravstveno osiguranje i kantonalni budžet za porez na dohodak.",
            },
            {
              q: "Moram li svaki mjesec ponovo kucati iste podatke?",
              a: "Ne. Datum isplate i period (mjesec i godina) su unaprijed popunjeni na današnji dan i tekući mjesec, pa ih mijenjate samo ako se isplata odnosi na raniji period. Uz besplatnu registraciju možete sačuvati do 5 isplatilaca u Dijelu 2 obrasca i sljedeći put ih popuniti jednim klikom, a lični podaci u Dijelu 1 se popunjavaju sami iz profila. Isplatioci se čuvaju na vašem nalogu, ne na uređaju, pa su dostupni i sa mobitela i sa drugog računara. Snimanje i izmjena idu isključivo na vaš klik.",
            },
            {
              q: "Može li se AMS-1035 podnijeti elektronski?",
              a: "Da, ukoliko posjedujete kvalifikovani digitalni certifikat. Ukoliko to nemate, obrazac štampate u 2 primjerka i zajedno s uplatnicama nosite u najbližu poreznu ispostavu. Na šalteru će vam potvrditi prijem obrasca i dati pečat, a jedan primjerak zadržavaju, dok drugi ostaje vama kao potvrda o predaji.",
            },
          ].map(({ q, a }, i) => (
            <FaqItem key={i} question={q} answer={a} />
          ))}
        </div>
      </section>
      </div>
      <aside className={styles.bocno} aria-label="PK Freelancer">
        <PkFreelancerPromo izvor="ams-sidebar" />
      </aside>
      </div>
    </main>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button className={styles.faqQ} onClick={() => setOpen((o) => !o)}>
        <span>{question}</span>
        <svg
          className={`${styles.faqChevron} ${open ? styles.faqChevronOpen : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className={styles.faqA}>{answer}</div>}
    </div>
  );
}
