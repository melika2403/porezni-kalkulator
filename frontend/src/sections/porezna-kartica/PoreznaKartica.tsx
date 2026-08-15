"use client";

// Obrazac PK-1001: zahtjev za izdavanje porezne kartice (PUFBiH).
// Radnik se bira u sidebaru, Dio 1 i 2 se popune iz kartona radnika i
// organizacije, a izdržavani članovi se unose ovdje i čuvaju na radniku.
// Koeficijenti se računaju sami po pravilima iz zvaničnog uputstva.
// Spec: docs/pk1001-porezna-kartica.md

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "src/sections/ugovor-o-djelu/uod.module.css";
import uorStyles from "src/sections/ugovor-o-radu/uor.module.css";
import pkStyles from "./poreznaKartica.module.css";
// dugme za preuzimanje je isto kao na JS3100 obrascu (zaobljeno, sa ikonom)
import js3Styles from "src/sections/prijave-radnika/js3100.module.css";
import WorkersSidebar from "src/components/WorkersSidebar/WorkersSidebar";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import { unwrap } from "src/api/auth";
import { trackEvent } from "src/api/activity";
import { useRole } from "src/hooks/useRole";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import { useLastOrg } from "src/hooks/useLastOrg";
import {
  getOrganization,
  getWorkers,
  updateWorker,
  type Worker,
} from "src/api/profile";
import { fillPk1001 } from "./fillPk1001";
import {
  izracunaj,
  MAX_REDOVA,
  normalizujPodatke,
  OSNOVNI_ODBITAK_KM,
  prazanClan,
  prazniPodaci,
  type PkClan,
  type PkPodaci,
} from "./pk1001Podaci";

type VrstaZahtjeva = "PRVO" | "IZMJENA" | "PONISTAVANJE";

type GrupaKljuc = "bracniDrug" | "djeca" | "ostali" | "alimentacije" | "invalidnosti";

function todayIso() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function preuzmiPdf(bytes: Uint8Array, ime: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ime;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fmtKoef = (n: number) => n.toFixed(2).replace(".", ",");

// Jedan dio obrasca (bračni drug, djeca, ostali...). MORA biti izvan
// PoreznaKartica: komponenta definisana u tijelu druge komponente se pri
// svakom kucanju stvara iznova, pa React odmontira polje i unos gubi fokus.
function Grupa({
  kljuc,
  naslov,
  opis,
  redovi,
  prikaziPrihod = true,
  prikaziAlimentaciju = false,
  prikaziSrodstvo = false,
  prikaziRedoslijed = false,
  prikaziVrstu = false,
  onIzmijeni,
  onDodaj,
  onUkloni,
  onPomjeri,
}: {
  kljuc: GrupaKljuc;
  naslov: string;
  opis: string;
  redovi: {
    clan: PkClan;
    koeficijent: number;
    upozorenje: string | null;
    uObrascu: boolean;
  }[];
  prikaziPrihod?: boolean;
  prikaziAlimentaciju?: boolean;
  prikaziSrodstvo?: boolean;
  prikaziRedoslijed?: boolean;
  prikaziVrstu?: boolean;
  onIzmijeni: (grupa: GrupaKljuc, i: number, polje: keyof PkClan, v: string) => void;
  onDodaj: (grupa: GrupaKljuc) => void;
  onUkloni: (grupa: GrupaKljuc, i: number) => void;
  onPomjeri: (grupa: GrupaKljuc, i: number, smjer: -1 | 1) => void;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{naslov}</h2>
      <p className={styles.subtitle} style={{ marginTop: "-0.4rem" }}>
        {opis}
      </p>
      {redovi.length === 0 && (
        <p style={{ fontSize: "0.9rem", color: "var(--mid, #6c6862)" }}>
          Nema unesenih stavki.
        </p>
      )}
      {redovi.map((r, i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--border, #d4cfc4)",
            borderRadius: 10,
            padding: "0.8rem",
            marginBottom: "0.7rem",
            background: r.upozorenje ? "var(--warn-bg, #fdf6e3)" : "transparent",
          }}
        >
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>JMB</span>
              <input
                className={styles.input}
                value={r.clan.jmb}
                onChange={(e) =>
                  onIzmijeni(kljuc, i, "jmb", e.target.value.replace(/\D/g, "").slice(0, 13))
                }
                inputMode="numeric"
                placeholder="13 cifara"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Prezime i ime</span>
              <input
                className={styles.input}
                value={r.clan.imePrezime}
                onChange={(e) => onIzmijeni(kljuc, i, "imePrezime", e.target.value)}
              />
            </label>
            {prikaziVrstu && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ko je primalac</span>
                <StyledSelect
                  value={r.clan.vrsta === "SUPRUZNIK" ? "SUPRUZNIK" : "DIJETE"}
                  onChange={(v) =>
                    onIzmijeni(kljuc, i, "vrsta", String(v ?? "DIJETE"))
                  }
                  groups={[
                    {
                      options: [
                        { value: "DIJETE", label: "Dijete" },
                        { value: "SUPRUZNIK", label: "Bivši supružnik" },
                      ],
                    },
                  ]}
                  ariaLabel="Ko je primalac alimentacije"
                />
              </label>
            )}
            {prikaziPrihod && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Vlastiti prihod (KM)</span>
                <input
                  className={styles.input}
                  value={r.clan.vlastitiPrihod}
                  onChange={(e) => onIzmijeni(kljuc, i, "vlastitiPrihod", e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </label>
            )}
            {prikaziAlimentaciju && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Mjesečna alimentacija (KM)</span>
                <input
                  className={styles.input}
                  value={r.clan.iznosAlimentacije}
                  onChange={(e) => onIzmijeni(kljuc, i, "iznosAlimentacije", e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </label>
            )}
            {prikaziSrodstvo && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Srodstvo</span>
                <input
                  className={styles.input}
                  value={r.clan.srodstvo}
                  onChange={(e) => onIzmijeni(kljuc, i, "srodstvo", e.target.value)}
                  placeholder="npr. majka, otac"
                />
              </label>
            )}
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Udio u izdržavanju (%)</span>
              <input
                className={styles.input}
                value={r.clan.udioPosto}
                onChange={(e) =>
                  onIzmijeni(kljuc, i, "udioPosto", e.target.value.replace(/\D/g, "").slice(0, 3))
                }
                inputMode="numeric"
                placeholder="100"
              />
            </label>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Koeficijent</span>
              <div
                style={{
                  padding: "0.6rem 0.75rem",
                  fontWeight: 600,
                  color: "var(--sage, #3a5c42)",
                }}
              >
                {fmtKoef(r.koeficijent)}
              </div>
            </div>
          </div>
          {r.upozorenje && (
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "#8a6d1f" }}>
              {r.upozorenje}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            {prikaziRedoslijed && (
              <>
                <button
                  type="button"
                  className={styles.btnOutline}
                  onClick={() => onPomjeri(kljuc, i, -1)}
                  disabled={i === 0}
                  title="Pomjeri gore (redoslijed određuje koeficijent)"
                >
                  Gore
                </button>
                <button
                  type="button"
                  className={styles.btnOutline}
                  onClick={() => onPomjeri(kljuc, i, 1)}
                  disabled={i === redovi.length - 1}
                  title="Pomjeri dolje"
                >
                  Dolje
                </button>
              </>
            )}
            <button
              type="button"
              className={pkStyles.btnUkloni}
              onClick={() => onUkloni(kljuc, i)}
            >
              Ukloni
            </button>
          </div>
        </div>
      ))}
      {redovi.length < MAX_REDOVA[kljuc] && (
        <button type="button" className={styles.btnOutline} onClick={() => onDodaj(kljuc)}>
          Dodaj
        </button>
      )}
    </section>
  );
}

export default function PoreznaKartica() {
  const { role } = useRole();
  const isLoggedIn = !!role;
  // Ista kapija kao obračun plata: PRO preko vlastite pretplate ili preko
  // organizacije čiji vlasnik ima plan.
  const { hasAccessToTier } = useMaxAccessibleTier();
  const canGenerate = hasAccessToTier("PRO");
  const queryClient = useQueryClient();
  const { lastOrgId, loaded: lastOrgLoaded, setLastOrgId } = useLastOrg();

  const [sidebarOrgId, setSidebarOrgIdInternal] = useState<number | null>(null);
  const [sidebarWorkerId, setSidebarWorkerId] = useState<number | null>(null);
  const [radnik, setRadnik] = useState<Worker | null>(null);

  const setSidebarOrgId = (id: number | null) => {
    setSidebarOrgIdInternal(id);
    if (id) setLastOrgId(id);
  };

  useEffect(() => {
    if (lastOrgLoaded && lastOrgId && sidebarOrgId == null) {
      setSidebarOrgIdInternal(lastOrgId);
    }
  }, [lastOrgLoaded, lastOrgId, sidebarOrgId]);

  const { data: organizacija } = useQuery({
    queryKey: ["organization", sidebarOrgId],
    queryFn: () => unwrap(getOrganization(sidebarOrgId!)),
    enabled: isLoggedIn && !!sidebarOrgId,
  });

  const { data: radnici } = useQuery({
    queryKey: ["workers", sidebarOrgId],
    queryFn: () => unwrap(getWorkers(sidebarOrgId!)),
    enabled: isLoggedIn && !!sidebarOrgId,
  });

  // ── Stanje obrasca ──
  const [vrsta, setVrsta] = useState<VrstaZahtjeva>("PRVO");
  const [prezime, setPrezime] = useState("");
  const [ime, setIme] = useState("");
  const [jmbg, setJmbg] = useState("");
  const [adresa, setAdresa] = useState("");
  const [telefon, setTelefon] = useState("");
  const [zaposlen, setZaposlen] = useState(true);
  const [datumPrimjene, setDatumPrimjene] = useState(todayIso());
  const [datumPodnosenja, setDatumPodnosenja] = useState(todayIso());
  const [podaci, setPodaci] = useState<PkPodaci>(prazniPodaci());

  const [poruka, setPoruka] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );
  const [snimam, setSnimam] = useState(false);
  const [preuzimam, setPreuzimam] = useState(false);
  const snimljenoRef = useRef<string>("");

  // Klik na radnika u sidebaru: popuni Dio 1 i učitaj sačuvane podatke.
  // Nesačuvane izmjene prethodnog radnika se prvo snime, inače bi tiho
  // nestale jednim klikom u listi.
  const izaberiRadnika = (workerId: number | null, w: Worker | null) => {
    const prethodniOrg = sidebarOrgId;
    const prethodniRadnik = sidebarWorkerId;
    const prethodniPodaci = podaci;
    const bilo = snimljenoRef.current;
    if (
      prethodniOrg &&
      prethodniRadnik &&
      prethodniRadnik !== workerId &&
      JSON.stringify(prethodniPodaci) !== bilo
    ) {
      void unwrap(
        updateWorker(prethodniOrg, prethodniRadnik, {
          poreznaKarticaPodaci: prethodniPodaci,
        }),
      )
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["workers", prethodniOrg] });
        })
        .catch(() => {
          setPoruka({
            tone: "err",
            text: "Izmjene prethodnog radnika nisu sačuvane, vratite se na njega i pokušajte ponovo.",
          });
        });
    }
    setSidebarWorkerId(workerId);
    setRadnik(w);
    // Vrsta zahtjeva se odnosi na konkretnog radnika, pa se resetuje sa njim.
    setVrsta("PRVO");
    if (!w) {
      setPodaci(prazniPodaci());
      snimljenoRef.current = JSON.stringify(prazniPodaci());
      return;
    }
    setPrezime(w.lastName ?? "");
    setIme(w.firstName ?? "");
    setJmbg(w.jmbg ?? "");
    setAdresa(w.address ?? "");
    setTelefon(w.phone ?? "");
    setZaposlen(w.employmentStatus !== "ODJAVLJEN");
    const ucitano = normalizujPodatke(w.poreznaKarticaPodaci);
    if (!ucitano.opcina) ucitano.opcina = w.city ?? "";
    setPodaci(ucitano);
    snimljenoRef.current = JSON.stringify(ucitano);
    setPoruka(null);
  };

  // Ako se radnik osvježi sa servera (npr. poslije snimanja), zadrži izbor.
  useEffect(() => {
    if (!radnici || sidebarWorkerId == null) return;
    const svjez = radnici.find((w) => w.id === sidebarWorkerId);
    if (svjez) setRadnik(svjez);
  }, [radnici, sidebarWorkerId]);

  const racun = useMemo(() => izracunaj(podaci), [podaci]);
  const imaIzmjena = JSON.stringify(podaci) !== snimljenoRef.current;

  const koefRadnika = radnik?.taxCoefficient ?? null;
  const koefSeRazlikuje =
    radnik != null && Math.abs((koefRadnika ?? 0) - racun.ukupno) > 0.001;

  // ── Uređivanje grupa ──
  const izmijeni = (grupa: GrupaKljuc, i: number, polje: keyof PkClan, v: string) =>
    setPodaci((p) => ({
      ...p,
      [grupa]: p[grupa].map((c, idx) => (idx === i ? { ...c, [polje]: v } : c)),
    }));
  const dodaj = (grupa: GrupaKljuc) =>
    setPodaci((p) =>
      p[grupa].length >= MAX_REDOVA[grupa]
        ? p
        : { ...p, [grupa]: [...p[grupa], prazanClan()] },
    );
  const ukloni = (grupa: GrupaKljuc, i: number) =>
    setPodaci((p) => ({ ...p, [grupa]: p[grupa].filter((_, idx) => idx !== i) }));
  const pomjeri = (grupa: GrupaKljuc, i: number, smjer: -1 | 1) =>
    setPodaci((p) => {
      const novi = [...p[grupa]];
      const j = i + smjer;
      if (j < 0 || j >= novi.length) return p;
      [novi[i], novi[j]] = [novi[j], novi[i]];
      return { ...p, [grupa]: novi };
    });

  // ── Snimanje podataka na radnika ──
  const snimi = async () => {
    if (!sidebarOrgId || !sidebarWorkerId) return;
    setSnimam(true);
    try {
      await unwrap(
        updateWorker(sidebarOrgId, sidebarWorkerId, {
          poreznaKarticaPodaci: podaci,
        }),
      );
      snimljenoRef.current = JSON.stringify(podaci);
      queryClient.invalidateQueries({ queryKey: ["workers", sidebarOrgId] });
      setPoruka({ tone: "ok", text: "Podaci su sačuvani na radniku." });
    } catch (e) {
      setPoruka({ tone: "err", text: "Greška pri snimanju: " + (e as Error).message });
    } finally {
      setSnimam(false);
    }
  };

  // ── Upis ukupnog koeficijenta u karton radnika ──
  const upisiKoeficijent = async () => {
    if (!sidebarOrgId || !sidebarWorkerId) return;
    setSnimam(true);
    try {
      await unwrap(
        updateWorker(sidebarOrgId, sidebarWorkerId, {
          taxCoefficient: racun.ukupno,
        }),
      );
      queryClient.invalidateQueries({ queryKey: ["workers", sidebarOrgId] });
      setPoruka({
        tone: "ok",
        text: `Koeficijent ${fmtKoef(racun.ukupno)} je upisan na radnika i koristiće se u obračunu plate.`,
      });
    } catch (e) {
      setPoruka({ tone: "err", text: "Greška pri upisu: " + (e as Error).message });
    } finally {
      setSnimam(false);
    }
  };

  // ── Generisanje PDF-a ──
  const preuzmi = async () => {
    if (!canGenerate || preuzimam) return;
    if (!ime.trim() || !prezime.trim()) {
      setPoruka({ tone: "err", text: "Unesite ime i prezime poreznog obveznika." });
      return;
    }
    setPreuzimam(true);
    try {
      const { bytes, upozorenja: pdfUpozorenja } = await fillPk1001({
        vrsta,
        prezime: prezime.trim(),
        ime: ime.trim(),
        imeRoditelja: podaci.imeRoditelja.trim(),
        jmbg,
        adresa: adresa.trim(),
        opcina: podaci.opcina.trim(),
        telefon,
        jibPoslodavca: organizacija?.taxNumber ?? "",
        nazivPoslodavca: organizacija?.name ?? "",
        zaposlen,
        podaci,
        datumPrimjeneIso: datumPrimjene,
        datumPodnosenjaIso: datumPodnosenja,
      });
      const naziv = `${prezime}_${ime}`.replace(/\s+/g, "_");
      preuzmiPdf(bytes, `PK-1001_${naziv || "zahtjev"}.pdf`);
      trackEvent("PK1001_GENERATE", "PK-1001 zahtjev za poreznu karticu", sidebarOrgId);
      // Preuzimanje znači da su podaci gotovi, pa se sami snime na radnika:
      // inače bi ih izgubio ko zaboravi kliknuti Sačuvaj, a upravo se čuvaju
      // zato da se kod sljedeće izmjene ne kucaju ponovo. Best-effort, greška
      // snimanja ne smije poništiti već preuzeti obrazac.
      let dodatak = "";
      if (sidebarOrgId && sidebarWorkerId && imaIzmjena) {
        try {
          await unwrap(
            updateWorker(sidebarOrgId, sidebarWorkerId, {
              poreznaKarticaPodaci: podaci,
            }),
          );
          snimljenoRef.current = JSON.stringify(podaci);
          queryClient.invalidateQueries({ queryKey: ["workers", sidebarOrgId] });
          dodatak = " Uneseni podaci su sačuvani na radniku.";
        } catch {
          dodatak = " Podaci nisu sačuvani na radniku, pokušajte dugmetom Sačuvaj.";
        }
      }
      if (pdfUpozorenja.length > 0) {
        setPoruka({
          tone: "err",
          text: `Obrazac je preuzet, ali provjerite ova polja prije predaje: ${pdfUpozorenja.join(" ")}${dodatak}`,
        });
      } else {
        setPoruka({ tone: "ok", text: `Obrazac PK-1001 je preuzet.${dodatak}` });
      }
    } catch (e) {
      setPoruka({ tone: "err", text: "Greška pri generisanju: " + (e as Error).message });
    } finally {
      setPreuzimam(false);
    }
  };

  return (
    <div className={uorStyles.pageOuter}>
      <div className={uorStyles.pageLayout}>
        <WorkersSidebar
          selectedOrgId={sidebarOrgId}
          onOrgChange={setSidebarOrgId}
          selectedWorkerId={sidebarWorkerId}
          onWorkerSelect={izaberiRadnika}
          bottomHint="Klik na radnika popunjava podatke o obvezniku i učitava ranije unesene izdržavane članove."
        />
        <div className={`${styles.page} ${uorStyles.pageContent}`}>
          <div className={styles.header}>
            <p className={styles.label}>Obrazac PK-1001</p>
            <h1 className={styles.h1}>
              Zahtjev za izdavanje <em>porezne kartice</em>
            </h1>
            <p className={styles.subtitle}>
              Radnik ga podnosi Poreznoj upravi da bi dobio poreznu karticu
              (PK-1002), po kojoj poslodavac primjenjuje lični odbitak. Odaberite
              radnika u sidebaru za auto-popunu.
            </p>
          </div>

          {/* ── Vrsta zahtjeva ── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Vrsta <em>zahtjeva</em>
            </h2>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              {(
                [
                  ["PRVO", "Prvo izdavanje"],
                  ["IZMJENA", "Izmjena"],
                  ["PONISTAVANJE", "Poništavanje"],
                ] as [VrstaZahtjeva, string][]
              ).map(([v, label]) => (
                <label
                  key={v}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}
                >
                  <input
                    type="radio"
                    name="pkVrsta"
                    checked={vrsta === v}
                    onChange={() => setVrsta(v)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className={styles.hint} style={{ marginTop: "0.7rem" }}>
              {vrsta === "IZMJENA"
                ? "Izmjena se podnosi kao potpun zahtjev, ne kao dopuna: upišite sve izdržavane članove koji vrijede SADA, a koga više ne izdržava jednostavno uklonite iz liste. Porezna uprava izdaje novu karticu sa novim koeficijentom, koji vrijedi od datuma izdavanja."
                : vrsta === "PONISTAVANJE"
                  ? "Poništavanje se koristi kad kartica prestaje da važi u cijelosti. Za skidanje jednog izdržavanog člana koristite Izmjenu."
                  : "Prvo izdavanje se podnosi kad radnik još nema poreznu karticu."}
            </p>
          </section>

          {/* ── Dio 1 ── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Dio 1: podaci o <em>poreznom obvezniku</em>
            </h2>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Prezime</span>
                <input
                  className={styles.input}
                  value={prezime}
                  onChange={(e) => setPrezime(e.target.value)}
                  placeholder="npr. Hodžić"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ime</span>
                <input
                  className={styles.input}
                  value={ime}
                  onChange={(e) => setIme(e.target.value)}
                  placeholder="npr. Amina"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ime jednog roditelja</span>
                <input
                  className={styles.input}
                  value={podaci.imeRoditelja}
                  onChange={(e) => setPodaci((p) => ({ ...p, imeRoditelja: e.target.value }))}
                  placeholder="npr. Salih"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>JMB</span>
                <input
                  className={styles.input}
                  value={jmbg}
                  onChange={(e) => setJmbg(e.target.value.replace(/\D/g, "").slice(0, 13))}
                  inputMode="numeric"
                  placeholder="13 cifara"
                />
                <p className={styles.hint}>Datum rođenja na obrascu se izvodi iz JMB-a.</p>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Adresa prebivališta</span>
                <input
                  className={styles.input}
                  value={adresa}
                  onChange={(e) => setAdresa(e.target.value)}
                  placeholder="ulica i broj"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Općina prebivališta</span>
                <input
                  className={styles.input}
                  value={podaci.opcina}
                  onChange={(e) => setPodaci((p) => ({ ...p, opcina: e.target.value }))}
                  placeholder="npr. Cazin"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Telefon</span>
                <input
                  className={styles.input}
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  inputMode="tel"
                  placeholder="npr. 061 123 456"
                />
              </label>
            </div>
          </section>

          {/* ── Dio 2 ── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Dio 2: podaci o <em>poslodavcu</em>
            </h2>
            <div className={pkStyles.poslodavacRed}>
              <div className={pkStyles.poslodavacKartica}>
                <div className={pkStyles.poslodavacNaziv}>
                  {organizacija?.name || "Odaberite organizaciju u listi lijevo"}
                </div>
                <div className={pkStyles.poslodavacJib}>
                  <span className={pkStyles.poslodavacJibLabel}>JIB / JMB</span>
                  {organizacija?.taxNumber || "nije upisan u profilu firme"}
                </div>
                {(organizacija?.address || organizacija?.city) && (
                  <div className={pkStyles.poslodavacAdresa}>
                    {[organizacija?.address, organizacija?.city]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
              </div>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Status obveznika</span>
                <StyledSelect
                  value={zaposlen ? "1" : "0"}
                  onChange={(v) => setZaposlen(String(v ?? "1") === "1")}
                  groups={[
                    {
                      options: [
                        { value: "1", label: "Zaposlen" },
                        { value: "0", label: "Nezaposlen" },
                      ],
                    },
                  ]}
                  ariaLabel="Status obveznika"
                />
                <p className={styles.hint}>
                  Podaci o poslodavcu se povlače iz profila firme i upisuju u Dio
                  2 obrasca.
                </p>
              </label>
            </div>
          </section>

          <Grupa
            kljuc="bracniDrug"
            naslov="Dio 3: izdržavani bračni drug"
            opis={`Koeficijent 0,50. Ako bračni drug ima vlastiti prihod veći od ${OSNOVNI_ODBITAK_KM} KM mjesečno, ne može se navesti kao izdržavani član.`}
            redovi={racun.bracniDrug}
            onIzmijeni={izmijeni}
            onDodaj={dodaj}
            onUkloni={ukloni}
            onPomjeri={pomjeri}
          />

          <Grupa
            kljuc="djeca"
            naslov="Dio 4: izdržavana djeca"
            opis="Unose se od najstarijeg prema najmlađem, jer redoslijed određuje koeficijent: prvo 0,50, drugo 0,70, treće i svako dalje 0,90. Ako oba roditelja izdržavaju dijete, upišite udio u procentima."
            redovi={racun.djeca}
            prikaziRedoslijed
            onIzmijeni={izmijeni}
            onDodaj={dodaj}
            onUkloni={ukloni}
            onPomjeri={pomjeri}
          />

          <Grupa
            kljuc="ostali"
            naslov="Dio 5: ostali izdržavani članovi uže porodice"
            opis="Koeficijent 0,30 po članu, dijeli se po udjelu ako člana izdržava više lica."
            redovi={racun.ostali}
            prikaziSrodstvo
            onIzmijeni={izmijeni}
            onDodaj={dodaj}
            onUkloni={ukloni}
            onPomjeri={pomjeri}
          />

          <Grupa
            kljuc="alimentacije"
            naslov="Dio 6: lica za koja se plaća alimentacija"
            opis="Koeficijent 0,50 za bivšeg supružnika i prvo dijete, 0,70 za drugo, 0,90 za treće i dalje."
            redovi={racun.alimentacije}
            prikaziPrihod={false}
            prikaziAlimentaciju
            prikaziSrodstvo
            prikaziRedoslijed
            prikaziVrstu
            onIzmijeni={izmijeni}
            onDodaj={dodaj}
            onUkloni={ukloni}
            onPomjeri={pomjeri}
          />

          <Grupa
            kljuc="invalidnosti"
            naslov="Dio 7: invalidnost"
            opis="Vlastita invalidnost obveznika ili invalidnost izdržavanog člana, koeficijent 0,30."
            redovi={racun.invalidnosti}
            prikaziPrihod={false}
            prikaziSrodstvo
            onIzmijeni={izmijeni}
            onDodaj={dodaj}
            onUkloni={ukloni}
            onPomjeri={pomjeri}
          />

  {/* ── Dio 8 ── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Dio 8: ukupan <em>koeficijent</em>
            </h2>
            <div
              style={{
                display: "flex",
                gap: "1.2rem",
                alignItems: "baseline",
                flexWrap: "wrap",
                marginBottom: "0.8rem",
              }}
            >
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--sage, #3a5c42)" }}>
                {fmtKoef(racun.ukupno)}
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--mid, #6c6862)" }}>
                osnovni 1,00 + {fmtKoef(racun.zbirDodataka)} iz dijelova 3 do 7, što je{" "}
                {racun.odbitakKm.toLocaleString("de-DE", { minimumFractionDigits: 2 })} KM
                mjesečnog ličnog odbitka.
              </div>
            </div>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Datum od kojeg se primjenjuje</span>
                <DateInput
                  className={styles.input}
                  value={datumPrimjene}
                  onValueChange={setDatumPrimjene}
                />
                <p className={styles.hint}>
                  Lični odbitak vrijedi od datuma izdavanja kartice, ne unazad.
                </p>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Datum podnošenja zahtjeva</span>
                <DateInput
                  className={styles.input}
                  value={datumPodnosenja}
                  onValueChange={setDatumPodnosenja}
                />
              </div>
            </div>

            {radnik && koefSeRazlikuje && (
              <div
                style={{
                  marginTop: "0.9rem",
                  padding: "0.8rem 0.95rem",
                  borderRadius: 8,
                  border: "1px solid var(--warn-border, #f0d9a6)",
                  background: "var(--warn-bg, #fdf6e3)",
                  fontSize: "0.88rem",
                  lineHeight: 1.5,
                }}
              >
                U kartonu radnika je porezni koeficijent{" "}
                <strong>{fmtKoef(koefRadnika ?? 0)}</strong>, a ovaj zahtjev daje{" "}
                <strong>{fmtKoef(racun.ukupno)}</strong>. Obračun plate koristi vrijednost iz
                kartona.
                <div style={{ marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className={styles.btnOutline}
                    onClick={upisiKoeficijent}
                    disabled={snimam}
                  >
                    Upiši {fmtKoef(racun.ukupno)} na radnika
                  </button>
                </div>
              </div>
            )}
          </section>

          {racun.upozorenja.length > 0 && (
            <div
              style={{
                margin: "0 0 1rem",
                padding: "0.8rem 0.95rem",
                borderRadius: 8,
                border: "1px solid var(--warn-border, #f0d9a6)",
                background: "var(--warn-bg, #fdf6e3)",
                fontSize: "0.88rem",
                lineHeight: 1.5,
              }}
            >
              <strong>Provjerite prije predaje:</strong>
              <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem" }}>
                {racun.upozorenja.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          {poruka && (
            <div
              style={{
                margin: "0 0 1rem",
                padding: "0.7rem 0.9rem",
                borderRadius: 8,
                border: `1px solid ${poruka.tone === "ok" ? "#b7d4bd" : "#e2b4ab"}`,
                background: poruka.tone === "ok" ? "#eef6ef" : "#fbeeec",
                color: poruka.tone === "ok" ? "#2d4633" : "#8a2f21",
                fontSize: "0.88rem",
              }}
            >
              {poruka.text}
            </div>
          )}

          {!canGenerate && (
            <GeneratePaywall tier="PRO" what="Preuzimanje obrasca PK-1001" />
          )}

          <div className={`${styles.actions} ${styles.actionsCenter}`}>
            <button
              type="button"
              className={js3Styles.exportBtn}
              onClick={preuzmi}
              disabled={!canGenerate || preuzimam}
              title={canGenerate ? undefined : "Dostupno uz Pro pretplatu"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
              </svg>
              {preuzimam ? "Pripremam…" : "Preuzmi PK-1001"}
            </button>
            {radnik && (
              <button
                type="button"
                className={js3Styles.statusOnlyBtn}
                onClick={snimi}
                disabled={snimam || !imaIzmjena}
                title="Sačuvaj izdržavane članove na radniku za sljedeći put"
              >
                {snimam ? "Snimam…" : imaIzmjena ? "Sačuvaj podatke na radnika" : "Sačuvano"}
              </button>
            )}
          </div>

          {!isLoggedIn && (
            <p style={{ fontSize: "0.9rem", color: "var(--mid, #6c6862)", marginBottom: "2rem" }}>
              Prijavite se da biste birali radnika i čuvali podatke.{" "}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
