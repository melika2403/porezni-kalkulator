"use client";
import { useMemo, useState } from "react";
import styles from "./ams.module.css";
import { fillAmsTemplate, type AmsData } from "./fillAms";
import { fillUplatnice, KANTONI, type KantonKey } from "./fillUplatnica";
import DateInput from "src/components/DateInput/DateInput";

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
  n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

const EMPTY_ROW = { iznosDohotka: 0, zdravstveno: 0, osnovica: 0, porez: 0, porezniKredit: 0, razlika: 0 };

const KANTON_KEYS = Object.keys(KANTONI) as KantonKey[];

const formatZiroRacun = (raw: string): string => {
  const d = raw.replace(/\D/g, "").slice(0, 16);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 14), d.slice(14, 16)].filter(Boolean);
  return parts.join("-");
};

const downloadPdf = (bytes: Uint8Array, filename: string) => {
  const ab = bytes.buffer instanceof ArrayBuffer
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
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
  // Dio 1
  const [imeIPrezime, setImeIPrezime] = useState("");
  const [jmbg, setJmbg] = useState("");
  const [adresa, setAdresa] = useState("");
  const [datumIsplate, setDatumIsplate] = useState("");
  const [periodMjesec, setPeriodMjesec] = useState("");
  const [periodGodina, setPeriodGodina] = useState("");

  // Dio 2
  const [naziv, setNaziv] = useState("");
  const [adresaIsplatioca, setAdresaIsplatioca] = useState("");
  const [drzava, setDrzava] = useState("");

  // Dio 3
  const [iznosUplate, setIznosUplate] = useState("");
  const [odbitakPct, setOdbitakPct] = useState("20");
  const [porezniKredit, setPorezniKredit] = useState("");

  // Dio 4
  const [datum, setDatum] = useState(() => getTodayIso());
  const [loading, setLoading] = useState(false);

  // Dio 5 — Uplatnice
  const [kanton, setKanton] = useState<KantonKey | "">("");
  const [opcina, setOpcina] = useState("");
  const [ziroRacun, setZiroRacun] = useState("");
  const [loadingUpl, setLoadingUpl] = useState(false);

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
    return { rashodi, iznosDohotka, zdravstveno, zdravstvenoKanton, zdravstvenoFbih, osnovica, porez, kredit, razlika };
  }, [iznosUplate, odbitakPct, porezniKredit]);

  const kantonData = kanton ? KANTONI[kanton] : null;
  const opcinaData = kantonData?.opcine.find((o) => o.kod === opcina) ?? null;

  /* ── Export AMS ── */
  const handleExport = async () => {
    setLoading(true);
    try {
      const row1 = {
        iznosDohotka: computed.iznosDohotka,
        zdravstveno: computed.zdravstveno,
        osnovica: computed.osnovica,
        porez: computed.porez,
        porezniKredit: computed.kredit,
        razlika: computed.razlika,
      };
      const data: AmsData = {
        imeIPrezime, jmbg, adresa, datumIsplate,
        periodMjesec, periodGodina,
        naziv, adresaIsplatioca, drzava,
        rows: [row1, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW],
        ukupnoZdravstveno: computed.zdravstveno,
        ukupnoOsnovica: computed.osnovica,
        ukupnoPorez: computed.porez,
        ukupnoPorezniKredit: computed.kredit,
        ukupnoRazlika: computed.razlika,
        datum: isoToDisplay(datum),
      };
      const bytes = await fillAmsTemplate(data);
      downloadPdf(bytes, `AMS-1035_${periodMjesec || "XX"}_20${periodGodina || "XX"}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  /* ── Export Uplatnice ── */
  const handleExportUplatnice = async () => {
    if (!kanton || !opcina || !opcinaData) return;
    setLoadingUpl(true);
    try {
      const bytes = await fillUplatnice({
        imeIPrezime,
        adresa,
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
      downloadPdf(bytes, `Uplatnice_${periodMjesec || "XX"}_${periodGodina || "XXXX"}.pdf`);
    } finally {
      setLoadingUpl(false);
    }
  };

  const hasAmount = num(iznosUplate) > 0;
  const canDownloadUpl = kanton !== "" && opcina !== "" && hasAmount && periodMjesec !== "" && periodGodina.length === 4;

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <p className={styles.label}>Obrazac AMS-1035</p>
        <h1 className={styles.h1}>
          Akontacija poreza po odbitku na <em>druge samostalne djelatnosti na prihod iz inostranstva</em>
        </h1>
        <p className={styles.subtitle}>
          Popunite podatke i preuzmite popunjeni obrazac u PDF formatu.
        </p>
      </div>

      {/* Dio 1 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 1 — Podaci o <em>primaocu</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>1) Ime i prezime</label>
            <input className={styles.fieldInput} placeholder="Ime i prezime primaoca"
              value={imeIPrezime} onChange={(e) => setImeIPrezime(e.target.value)} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>2) JMBG</label>
            <input className={styles.fieldInput} inputMode="numeric" maxLength={13}
              placeholder="0000000000000" value={jmbg}
              onChange={(e) => setJmbg(e.target.value.replace(/\D/g, "").slice(0, 13))} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>4) Datum isplate</label>
            <DateInput className={styles.fieldInput} value={datumIsplate} onValueChange={setDatumIsplate} />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>3) Adresa</label>
            <input className={styles.fieldInput} placeholder="Ulica, broj, grad"
              value={adresa} onChange={(e) => setAdresa(e.target.value)} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>5) Period — Mjesec</label>
            <select className={styles.fieldInput} value={periodMjesec}
              onChange={(e) => setPeriodMjesec(e.target.value)}>
              <option value="">— Odaberite mjesec —</option>
              <option value="01">Januar</option>
              <option value="02">Februar</option>
              <option value="03">Mart</option>
              <option value="04">April</option>
              <option value="05">Maj</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Avgust</option>
              <option value="09">Septembar</option>
              <option value="10">Oktobar</option>
              <option value="11">Novembar</option>
              <option value="12">Decembar</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>5) Period — Godina</label>
            <input className={styles.fieldInput} inputMode="numeric" maxLength={4}
              placeholder="2026" value={periodGodina}
              onChange={(e) => setPeriodGodina(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </div>
        </div>
      </section>

      {/* Dio 2 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 2 — Podaci o <em>isplatiocu</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>6) Naziv</label>
            <input className={styles.fieldInput} placeholder="Naziv isplatioca"
              value={naziv} onChange={(e) => setNaziv(e.target.value)} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>7) Adresa</label>
            <input className={styles.fieldInput} placeholder="Adresa isplatioca"
              value={adresaIsplatioca} onChange={(e) => setAdresaIsplatioca(e.target.value)} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>8) Država</label>
            <input className={styles.fieldInput} placeholder="npr. Hrvatska"
              value={drzava} onChange={(e) => setDrzava(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Dio 3 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 3 — Podaci o <em>prihodima, porezu i doprinosima</em>
        </h2>

        <div className={styles.sredstvaGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>9) Iznos dohotka (KM)</label>
            <input className={styles.fieldInput} inputMode="decimal" placeholder="0,00"
              value={iznosUplate}
              onChange={(e) => setIznosUplate(fmtInput(e.target.value))} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Odbitak (rashodi)</label>
            <div className={styles.pctWrap}>
              <input className={`${styles.fieldInput} ${styles.pctInput}`}
                inputMode="numeric" maxLength={3} placeholder="20"
                value={odbitakPct}
                onChange={(e) => setOdbitakPct(e.target.value.replace(/\D/g, "").slice(0, 3))} />
              <span className={styles.pctSuffix}>%</span>
            </div>
            <p className={styles.hint}>
              Pravo na priznavanje rashoda u iznosu od 20%
              (30% ukoliko se radi o autorskim naknadama)
            </p>
          </div>
        </div>

        {hasAmount && (
          <div className={styles.breakdown}>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Normirani rashodi ({odbitakPct}%)</span>
              <span className={styles.breakdownValue}>− {fmt(computed.rashodi)} KM</span>
            </div>
            <div className={`${styles.breakdownRow} ${styles.breakdownBold}`}>
              <span className={styles.breakdownLabel}>9) Iznos dohotka (osnova za obračun)</span>
              <span className={styles.breakdownValue}>{fmt(computed.iznosDohotka)} KM</span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>10) Zdravstveno osiguranje (× 0,04)</span>
              <span className={styles.breakdownValue}>{fmt(computed.zdravstveno)} KM</span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>11) Osnovica za porez (9 − 10)</span>
              <span className={styles.breakdownValue}>{fmt(computed.osnovica)} KM</span>
            </div>
            <div className={`${styles.breakdownRow} ${styles.breakdownBold}`}>
              <span className={styles.breakdownLabel}>12) Iznos poreza (× 0,1)</span>
              <span className={styles.breakdownValue}>{fmt(computed.porez)} KM</span>
            </div>
          </div>
        )}

        <div className={styles.kreditRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>13) Porezni kredit plaćen u inostranstvu (KM)</label>
            <input className={styles.fieldInput} inputMode="decimal" placeholder="0,00"
              value={porezniKredit}
              onChange={(e) => setPorezniKredit(fmtInput(e.target.value))} />
          </div>
          {hasAmount && (
            <div className={styles.razlikaBox}>
              <span className={styles.razlikaLabel}>14) Razlika poreza za uplatu</span>
              <span className={`${styles.razlikaValue} ${computed.razlika > 0 ? styles.taxDue : styles.refund}`}>
                {fmt(computed.razlika)} KM
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Dio 4 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 4 — <em>Izjava</em>
        </h2>
        <p className={styles.izjavaText}>
          Upoznat sam sa sankcijama propisanim Zakonom o Poreznoj upravi i izjavljujem da su podaci
          navedeni u ovoj prijavi, uključujući sve priloge tačni, potpuni i jasni.
        </p>
        <div className={styles.dateField}>
          <span className={styles.dateLabel}>Datum:</span>
          <DateInput className={styles.fieldInput} value={datum} onValueChange={setDatum} />
        </div>
      </section>

      {/* Export AMS */}
      <div className={styles.actions}>
        <button className={styles.exportBtn} onClick={handleExport} disabled={loading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
          </svg>
          {loading ? "Generisanje..." : "Preuzmi AMS-1035 PDF"}
        </button>
      </div>

      {/* Dio 5 — Uplatnice */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 5 — <em>Uplatnice</em>
        </h2>
        <p className={styles.izjavaText}>
          Odaberite kanton i općinu te preuzmite tri popunjene uplatnice: doprinos za zdravstveno osiguranje
          kantonalnom zavodu (89,8%), doprinos Zavodu zdravstvenog osiguranja i reosiguranja FBiH (10,2%)
          i porez na dohodak kantonalnom budžetu.
        </p>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Kanton</label>
            <select className={styles.fieldInput} value={kanton}
              onChange={(e) => { setKanton(e.target.value as KantonKey | ""); setOpcina(""); }}>
              <option value="">— Odaberite kanton —</option>
              {KANTON_KEYS.map((k) => (
                <option key={k} value={k}>{KANTONI[k].ime}</option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Općina</label>
            <select className={styles.fieldInput} value={opcina}
              onChange={(e) => setOpcina(e.target.value)}
              disabled={!kanton}>
              <option value="">— Odaberite općinu —</option>
              {kantonData?.opcine.map((o) => (
                <option key={o.kod} value={o.kod}>{o.ime}</option>
              ))}
            </select>
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>Žiro račun pošiljatelja</label>
            <input className={styles.fieldInput} inputMode="numeric"
              placeholder="338-000-12345678-90"
              value={ziroRacun}
              onChange={(e) => setZiroRacun(formatZiroRacun(e.target.value))} />
            <p className={styles.hint}>
              Ukoliko plaćate preko žiro računa, unesite vaš žiro račun. Ako plaćate u gotovini, ostavite prazno.
            </p>
          </div>
        </div>

        <div className={styles.uplUplatnicaInfo}>
          <div className={styles.uplCard}>
            <span className={styles.uplCardNum}>1</span>
            <div>
              <div className={styles.uplCardTitle}>Zdravstveno osiguranje — kanton</div>
              <div className={styles.uplCardSub}>
                {kantonData ? `${kantonData.zoRacun} · ${kantonData.ime}` : "Odaberite kanton"}
              </div>
            </div>
            {hasAmount && <span className={styles.uplCardIznos}>{fmt(computed.zdravstvenoKanton)} KM</span>}
          </div>
          <div className={styles.uplCard}>
            <span className={styles.uplCardNum}>2</span>
            <div>
              <div className={styles.uplCardTitle}>Zdravstveno osiguranje — FBiH</div>
              <div className={styles.uplCardSub}>102-050-00000640-18 · ZZO FBiH</div>
            </div>
            {hasAmount && <span className={styles.uplCardIznos}>{fmt(computed.zdravstvenoFbih)} KM</span>}
          </div>
          <div className={styles.uplCard}>
            <span className={styles.uplCardNum}>3</span>
            <div>
              <div className={styles.uplCardTitle}>Porez na dohodak — kantonalni budžet</div>
              <div className={styles.uplCardSub}>
                {kantonData ? `${kantonData.budzet} · Budžet ${kantonData.genitiv}` : "Odaberite kanton"}
              </div>
            </div>
            {hasAmount && (
              <span className={`${styles.uplCardIznos} ${computed.razlika > 0 ? styles.taxDue : styles.refund}`}>
                {fmt(computed.razlika)} KM
              </span>
            )}
          </div>
        </div>

        <div className={styles.printNapomena}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            <strong>Napomena za štampanje:</strong> Pri štampanju uplatnica u PDF pregledaču, pod opcijom skaliranja odaberite <strong>Fit to Paper</strong> ili <strong>Fit to Printable Area</strong> kako bi uplatnica bila ispravno skalirana na stranici.
          </span>
        </div>

        <div className={styles.actions} style={{ marginTop: "1.5rem" }}>
          <button className={styles.exportBtn} onClick={handleExportUplatnice}
            disabled={loadingUpl || !canDownloadUpl}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
            </svg>
            {loadingUpl ? "Generisanje..." : "Preuzmi 3 uplatnice (PDF)"}
          </button>
        </div>
      </section>

      <p className={styles.dataNapomena}>
        Porezni kalkulator ne zadržava popunjene podatke ni u kojem obliku. Nakon spremanja PDF dokumenta uvijek provjerite tačnost podataka.
      </p>
    </main>
  );
}
