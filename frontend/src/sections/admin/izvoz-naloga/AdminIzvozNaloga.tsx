"use client";

// Admin test harness: izvoz platnih naloga u e-bankarstvo (Faza 0, Korak 1).
// Server strana je ADMIN-only (requireRole u API rutama); ovaj ekran je samo
// pogodnost za testiranje. Formatter je trenutno STUB: struktura datoteke
// (336 + CRLF + 0x1A) je stvarna, sadržaj polja NIJE za banku.
// Spec: docs/faza0-tkdis-izvoz-halcom.md

import { useEffect, useMemo, useState } from "react";
import StyledSelect from "@/src/components/StyledSelect/StyledSelect";
import DateInput from "@/src/components/DateInput/DateInput";
import {
  generisiIzvoz,
  getIzvozObracuni,
  getIzvozOrganizacije,
  type BankProfil,
  type IzvozObracun,
  type IzvozOrg,
  type IzvozRezultat,
  type Transliteracija,
} from "src/api/adminPaymentExport";
import styles from "./izvozNaloga.module.css";

const MJESECI = [
  "januar", "februar", "mart", "april", "maj", "juni",
  "juli", "august", "septembar", "oktobar", "novembar", "decembar",
];

// Default transliteracija po profilu banke; korisnik je može pregaziti
// radi brzog testiranja (zato je poseban izbor na ekranu). ELBA je uvijek
// cp1250, izbor je tada zaključan.
const DEFAULT_TRANSLIT: Record<BankProfil, Transliteracija> = {
  halcom: "yuscii",
  unicredit: "cp1250",
  elba: "cp1250",
  raiffeisen: "cp852",
};

// Transliteracija se ručno mijenja samo kod TKDIS profila (test); ELBA je
// uvijek cp1250, Raiffeisen uvijek cp852.
const TRANSLIT_ZAKLJUCAN: Record<BankProfil, boolean> = {
  halcom: false,
  unicredit: false,
  elba: true,
  raiffeisen: true,
};

function danasIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Lenjir pozicija nad pregledom: red sa brojevima (svakih 20) i red sa
// crticama ("----+----1----+----2..."), oba tačno rowLen znakova.
function buildRuler(len: number): { brojevi: string; crtice: string } {
  let crtice = "";
  for (let p = 1; p <= len; p++) {
    if (p % 10 === 0) crtice += String((p / 10) % 10);
    else if (p % 5 === 0) crtice += "+";
    else crtice += "-";
  }
  const brojevi = new Array<string>(len).fill(" ");
  for (let p = 20; p <= len; p += 20) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) brojevi[p - s.length + i] = s[i];
  }
  return { brojevi: brojevi.join(""), crtice };
}

function downloadBase64(fileName: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminIzvozNaloga() {
  const [orgs, setOrgs] = useState<IzvozOrg[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [obracuni, setObracuni] = useState<IzvozObracun[]>([]);
  const [obracunKey, setObracunKey] = useState<string | null>(null);
  const [datumValute, setDatumValute] = useState(danasIso());
  const [profil, setProfil] = useState<BankProfil>("halcom");
  const [translit, setTranslit] = useState<Transliteracija>("yuscii");
  // ista opcija kao na obračunu: kantonalni doprinosi na jedan nalog po
  // kantonu, šifra opštine prati sjedište organizacije
  const [combineKantonal, setCombineKantonal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rezultat, setRezultat] = useState<IzvozRezultat | null>(null);

  useEffect(() => {
    void getIzvozOrganizacije().then((r) => {
      if (r.ok) setOrgs(r.data);
      else setError(`Učitavanje organizacija nije uspjelo: ${r.error}`);
    });
  }, []);

  // Promjena firme: povuci njene obračune, resetuj izbor mjeseca i rezultat.
  useEffect(() => {
    setObracuni([]);
    setObracunKey(null);
    setRezultat(null);
    if (orgId == null) return;
    void getIzvozObracuni(orgId).then((r) => {
      if (r.ok) {
        setObracuni(r.data);
        if (r.data.length > 0) {
          setObracunKey(`${r.data[0].year}-${r.data[0].month}`);
        }
      } else {
        setError(`Učitavanje obračuna nije uspjelo: ${r.error}`);
      }
    });
  }, [orgId]);

  // Promjena profila banke povlači njen default encoding (može se pregaziti).
  const promijeniProfil = (p: BankProfil) => {
    setProfil(p);
    setTranslit(DEFAULT_TRANSLIT[p]);
  };

  const izabrani = obracuni.find((o) => `${o.year}-${o.month}` === obracunKey);
  const datumUProslosti = datumValute !== "" && datumValute < danasIso();

  const generisi = async () => {
    if (orgId == null || !izabrani || !datumValute) return;
    setBusy(true);
    setError(null);
    try {
      const r = await generisiIzvoz({
        orgId,
        year: izabrani.year,
        month: izabrani.month,
        datumValute,
        profil,
        transliteracija: translit,
        combineKantonal,
      });
      if (!r.ok) {
        setError(
          r.error === "NEMA_OBRACUNA"
            ? "Izabrani mjesec nema nijedan obračun."
            : `Generisanje nije uspjelo: ${r.error}`,
        );
        setRezultat(null);
        return;
      }
      setRezultat(r.data);
    } finally {
      setBusy(false);
    }
  };

  const ruler = useMemo(
    () => buildRuler(rezultat?.meta.rowLen ?? 336),
    [rezultat?.meta.rowLen],
  );

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.title}>Izvoz naloga u e-bankarstvo</h1>
        <p className={styles.subtitle}>
          Izvoz platnih naloga iz obračuna: TKDIS (Halcom / UniCredit), ELBA
          (BBI / ASA / Sparkasse) i Raiffeisen RBBHnet (samo javni prihodi,
          kao stari program). Nalozi su identični mjesečnim uplatnicama:
          zbirni doprinosi i porezi + neto i neoporezive isplate po radniku.
          Prije prve stvarne upotrebe uraditi probni uvoz u banku (nalozi
          moraju sletjeti među pripremljene i čekati potpis).
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Firma</span>
            <StyledSelect
              value={orgId}
              onChange={(v) => setOrgId(v == null ? null : Number(v))}
              searchable
              placeholder="Izaberite firmu..."
              ariaLabel="Firma"
              wrapStyle={{ width: 320 }}
              groups={[
                {
                  options: orgs.map((o) => ({
                    value: o.id,
                    label: `${o.name}${o.city ? `, ${o.city}` : ""}`,
                  })),
                },
              ]}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Obračun</span>
            <StyledSelect
              value={obracunKey}
              onChange={(v) => setObracunKey(v == null ? null : String(v))}
              placeholder={orgId == null ? "Prvo firma" : "Izaberite mjesec..."}
              ariaLabel="Obračun"
              disabled={orgId == null || obracuni.length === 0}
              wrapStyle={{ width: 250 }}
              groups={[
                {
                  options: obracuni.map((o) => ({
                    value: `${o.year}-${o.month}`,
                    label: `${MJESECI[o.month - 1]} ${o.year}. (${o.obracunato}/${o.ukupno} obračunato)`,
                  })),
                },
              ]}
            />
          </div>

          <div className={`${styles.field} ${styles.dateField}`}>
            <span className={styles.fieldLabel}>Datum valute</span>
            <DateInput
              value={datumValute}
              onValueChange={setDatumValute}
              className={styles.dateInput}
              title="Datum izvršenja naloga (datum isplate)"
            />
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Profil banke</span>
            <StyledSelect
              value={profil}
              onChange={(v) => promijeniProfil((v as BankProfil) || "halcom")}
              ariaLabel="Profil banke"
              wrapStyle={{ width: 170 }}
              groups={[
                {
                  options: [
                    { value: "halcom", label: "Halcom" },
                    { value: "unicredit", label: "UniCredit e-ba" },
                    { value: "elba", label: "ELBA (BBI / ASA / Sparkasse)" },
                    { value: "raiffeisen", label: "Raiffeisen RBBHnet" },
                  ],
                },
              ]}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Transliteracija</span>
            <StyledSelect
              value={translit}
              onChange={(v) => setTranslit((v as Transliteracija) || "yuscii")}
              ariaLabel="Transliteracija"
              disabled={TRANSLIT_ZAKLJUCAN[profil]}
              fitPanel
              wrapStyle={{ width: 230 }}
              groups={[
                {
                  options: [
                    { value: "yuscii", label: "YUSCII, za Halcom (Ž→@, Š→[, Ć→])" },
                    { value: "cp1250", label: "Windows-1250, za UniCredit i ELBA-u" },
                    { value: "cp852", label: "CP852, za Raiffeisen" },
                  ],
                },
              ]}
            />
          </div>

          <button
            type="button"
            className={styles.btnPrimary}
            disabled={busy || orgId == null || !izabrani || !datumValute}
            onClick={() => void generisi()}
          >
            {busy ? "Generišem..." : "Generiši datoteku"}
          </button>
        </div>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={combineKantonal}
            onChange={(e) => setCombineKantonal(e.target.checked)}
            className={styles.checkbox}
          />
          Objedini kantonalne doprinose (zdravstvo i nezaposlenost na jedan
          nalog po kantonu, šifra opštine prati sjedište; porez na dohodak
          ostaje po opštini radnika)
        </label>
        <p className={styles.hint}>
          Transliteracija je način zapisa naših slova (Č, Ć, Ž, Š, Đ) u
          datoteci: Halcom traži YUSCII (slova se pišu kao @ [ ] ^ \), a
          UniCredit Windows-1250 (prava slova). Postavlja se sama po izboru
          profila banke, mijenjaj je samo za testiranje.
        </p>
      </div>

      {datumUProslosti && (
        <div className={styles.warn}>
          Datum valute je u prošlosti. UniCredit pri uvozu traži datum od danas
          pa nadalje; Halcom prihvata i starije datume.
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {rezultat && (
        <div className={styles.card}>
          <div className={styles.metaRow}>
            {rezultat.meta.stub && (
              <span className={styles.stubBadge}>STUB, nije za banku</span>
            )}
            <span>
              Datoteka: <span className={styles.metaStrong}>{rezultat.fileName}</span>
            </span>
            <span>
              Naloga:{" "}
              <span className={styles.metaStrong}>{rezultat.meta.brojNaloga}</span>
              , ukupno{" "}
              <span className={styles.metaStrong}>
                {rezultat.meta.ukupnoKm.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                KM
              </span>
            </span>
            <span>
              {rezultat.meta.brojRedova} redova
              {rezultat.meta.rowLen != null
                ? ` x ${rezultat.meta.rowLen} znakova`
                : ""}
              , {rezultat.meta.ukupnoBajta} bajta
            </span>
            {rezultat.meta.format === "tkdis" && (
              <span>EOF 0x1A: {rezultat.meta.eof1a ? "da" : "ne"}</span>
            )}
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => downloadBase64(rezultat.fileName, rezultat.base64)}
            >
              Preuzmi datoteku
            </button>
          </div>

          {rezultat.preskoceni.length > 0 && (
            <div className={styles.warn} style={{ marginBottom: "0.75rem" }}>
              Preskočene isplate (nisu u datoteci):{" "}
              {rezultat.preskoceni
                .map(
                  (s) =>
                    `${s.stavka} ${s.iznosKm.toLocaleString("de-DE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} KM${s.radnik ? `, ${s.radnik}` : ""} (${s.razlog})`,
                )
                .join("; ")}
            </div>
          )}

          <div className={styles.previewScroll}>
            <div className={styles.previewInner}>
              {rezultat.meta.rowLen != null && (
                <>
                  <div className={styles.rulerLine}>
                    <span className={styles.rowNum}> </span>
                    {ruler.brojevi}
                  </div>
                  <div className={styles.rulerLine}>
                    <span className={styles.rowNum}> </span>
                    {ruler.crtice}
                  </div>
                </>
              )}
              {rezultat.rows.map((row, i) => (
                <div key={i} className={styles.fileRow}>
                  <span className={styles.rowNum}>{i + 1}</span>
                  {row}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
