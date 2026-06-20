"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./js3100.module.css";
import uorStyles from "src/sections/ugovor-o-radu/uor.module.css";
import WorkersSidebar from "src/components/WorkersSidebar/WorkersSidebar";
import {
  createWorker,
  getOrganization,
  getWorkers,
  updateWorker,
  type Worker,
} from "src/api/profile";
import { spolFromJmbg } from "src/utils/jmbg";
import {
  fillJs3100Template,
  type Js3100Data,
  type Js3100Vrsta,
  type Js3100Spol,
} from "src/sections/prijave-radnika/fillJs3100";
import DateInput from "src/components/DateInput/DateInput";
import CitySelect from "src/components/CitySelect/CitySelect";
import { useCityLookup } from "src/hooks/useCities";
import { formatAddress } from "src/utils/formatAddress";
import PersonFillSelect, {
  type FillData,
} from "src/components/PersonFillSelect/PersonFillSelect";
import OrgFillSelect, {
  type OrgFillData,
} from "src/components/PersonFillSelect/OrgFillSelect";
import SaveToProfileButton from "src/components/SaveToProfileButton/SaveToProfileButton";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import { useRole } from "src/hooks/useRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { trackEvent } from "src/api/activity";
import { useLastOrg } from "src/hooks/useLastOrg";

/* ── Helpers ── */
function getTodayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoToDisplay(iso: string) {
  if (!iso || !iso.includes("-")) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

function isoToDDMMYYYY(iso: string) {
  if (!iso || !iso.includes("-")) return { dd: "", mm: "", yyyy: "" };
  const [y, m, d] = iso.split("-");
  return { dd: d, mm: m, yyyy: y };
}

function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Stručna sprema opcije — Drugi dio red 11 i Treći dio red 4 ── */
const STRUCNA_SPREMA = [
  "DR, Doktor nauka",
  "MR, Magistar",
  "VSS, Visoka stručna sprema",
  "VŠS, Viša stručna sprema",
  "SSS, Srednja stručna sprema",
  "Niža",
  "VKV, Visokokvalifikovani",
  "KV, Kvalifikovani",
  "PK, Polukvalifikovani",
  "NK, Nekvalifikovani",
];

/* ── Osnov osiguranja opcije (Check Box2..11) ── */
const OSNOV_OSIGURANJA = [
  "Zaposleni, puno radno vrijeme",
  "Zaposleni, nepuno radno vrijeme",
  "Direktor / član uprave",
  "Vlasnik obrta",
  "Stručno osposobljavanje",
  "Sezonski radnik",
  "Penzioner, povratak na rad",
  "Stranac, radna dozvola",
  "Ostalo 1",
  "Ostalo 2",
];

// Stariji radnici mogu imati spremljen opis sa starim em dash razdvajanjem
// ("Zaposleni [em dash] puno..."); normalizuj na trenutni zarez oblik da se
// poklopi sa OSNOV_OSIGURANJA opcijom, inače bi select ostao prazan.
const EM_DASH = String.fromCharCode(0x2014);
const normalizeOsnovOpis = (s: string) =>
  s.includes(EM_DASH)
    ? s
        .split(EM_DASH)
        .map((x) => x.trim())
        .join(", ")
    : s;

/* ── Component ── */
//
// Access rule: korisnik vidi formu ako ima PRO/BUSINESS pretplatu ILI ako je
// član bilo koje organizacije čiji je vlasnik PRO/BUSINESS — u tom slučaju može
// snimiti JS3100 protiv te org-e (server gate-uje po owner-tier-u te org-e).
//
// Sam PDF export ne ide preko backenda pa ne treba dodatni gate.
export default function Js3100Form() {
  return <Js3100App />;
}

function Js3100App() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const { findByName: findCity } = useCityLookup();
  const searchParams = useSearchParams();
  const { role, hasRole } = useRole();
  const isLoggedIn = !!role;
  const canGenerate = hasRole("PRO", "BUSINESS", "ADMIN");

  const { lastOrgId, loaded: lastOrgLoaded, setLastOrgId } = useLastOrg();

  const urlOrgInit = (() => {
    const v = searchParams.get("org");
    return v ? Number(v) || null : null;
  })();
  const initialWorkerId = (() => {
    const v = searchParams.get("worker");
    return v ? Number(v) || null : null;
  })();
  const initialVrsta: Js3100Vrsta = (() => {
    const v = searchParams.get("vrsta");
    if (v === "PRIJAVA" || v === "PROMJENA" || v === "ODJAVA") return v;
    return "PRIJAVA";
  })();

  /* ── Sidebar state ── */
  // orgId se hidrira u 2 faze: URL → odmah, inače čekamo localStorage hidraciju.
  // Vidi AktivniRadnici / ObracunPlata za isti pattern.
  const [sidebarOrgId, setSidebarOrgIdInternal] = useState<number | null>(
    urlOrgInit,
  );
  const [hydratedOrg, setHydratedOrg] = useState<boolean>(urlOrgInit != null);
  const [sidebarWorkerId, setSidebarWorkerId] = useState<number | null>(
    initialWorkerId,
  );

  // Perzistira odabranu organizaciju u localStorage da Obračun plata / Aktivni
  // radnici otvore istu organizaciju bez ponovnog odabira.
  const setSidebarOrgId = useCallback(
    (id: number | null) => {
      setSidebarOrgIdInternal(id);
      if (id != null) setLastOrgId(id);
    },
    [setLastOrgId],
  );

  // Faza 2 hidracije: usvoji lastOrgId čim localStorage hidrira.
  useEffect(() => {
    if (hydratedOrg) return;
    if (!lastOrgLoaded) return;
    if (lastOrgId != null) setSidebarOrgIdInternal(lastOrgId);
    setHydratedOrg(true);
  }, [hydratedOrg, lastOrgLoaded, lastOrgId]);

  /* ── Vrsta prijave ── */
  const [vrsta, setVrsta] = useState<Js3100Vrsta>(initialVrsta);
  const [datumPrijaveIso, setDatumPrijaveIso] = useState(() => getTodayIso());

  /* ── Prvi dio — Obveznik ── */
  const [employer, setEmployer] = useState({
    jib: "",
    naziv: "",
    adresa: "",
    grad: "",
    telefon: "",
    email: "",
  });

  /* ── Drugi dio — Osiguranik ── */
  const [worker, setWorker] = useState({
    jmbg: "",
    prezime: "",
    ime: "",
    djevojackoPrezime: "",
    datumRodjenjaIso: "",
    spol: "" as Js3100Spol,
    adresa: "",
    grad: "",
    kontaktAdresa: "",
    kontaktGrad: "",
    emailOsiguranika: "",
    strucnaSpremaIdx: null as number | null,
  });

  /* ── Treći dio — Podaci o osiguranju ── */
  const [treci, setTreci] = useState({
    sati: "",
    minuta: "",
    osnovOsiguranjaOpis: "",
    osnovOsiguranjaSifra: "",
    zanimanjeOpis: "",
    zanimanjeSifra: "",
    strucnaSpremaTraziSeIdx: null as number | null,
    datumPromjeneIso: "",
    napomenaPromjene: "",
    osnovUplateOpis: "",
    osnovUplateSifra: "",
    sifraRadnogMjesta: "",
    stepenUvecanja: "",
  });

  /* ── Footer ── */
  const [popunioImeIPrezime, setPopunioImeIPrezime] = useState("");
  const [popunioTelefon, setPopunioTelefon] = useState("");
  const [datumPopunjavanjaIso, setDatumPopunjavanjaIso] = useState(() =>
    getTodayIso(),
  );

  const [loading, setLoading] = useState(false);

  /* ── Sidebar auto-popuna: organizacija ── */
  const orgQuery = useQuery({
    queryKey: ["organization", sidebarOrgId],
    queryFn: () => unwrap(getOrganization(sidebarOrgId!)),
    enabled: isLoggedIn && !!sidebarOrgId,
  });

  /* ── Deep-link: auto-popuna radnika iz URL parametra ── */
  const workersQuery = useQuery({
    queryKey: ["workers", sidebarOrgId],
    queryFn: () => unwrap(getWorkers(sidebarOrgId!)),
    enabled: isLoggedIn && !!sidebarOrgId && !!initialWorkerId,
  });
  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    if (!initialWorkerId) return;
    const w = workersQuery.data?.find((x) => x.id === initialWorkerId);
    if (!w) return;
    deepLinkAppliedRef.current = true;
    handleWorkerPick(w.id, w);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workersQuery.data, initialWorkerId]);

  useEffect(() => {
    const org = orgQuery.data;
    if (!org) return;
    setEmployer((p) => ({
      ...p,
      jib: org.taxNumber ?? p.jib,
      naziv: org.name ?? p.naziv,
      adresa: org.address ?? p.adresa,
      grad: org.city ?? p.grad,
      email: org.email ?? p.email,
      telefon: org.phone ?? p.telefon,
    }));
    if (org.owner) {
      setPopunioImeIPrezime(
        `${org.owner.firstName} ${org.owner.lastName}`.trim(),
      );
    }
  }, [orgQuery.data]);

  /* ── Sidebar auto-popuna: radnik ── */
  const handleWorkerPick = (workerId: number | null, w: Worker | null) => {
    setSidebarWorkerId(workerId);
    if (!w) return;

    // Default vrsta: ako je worker DRAFT/ODJAVLJEN → PRIJAVA, ako je PRIJAVLJEN → ODJAVA
    setVrsta(w.employmentStatus === "PRIJAVLJEN" ? "ODJAVA" : "PRIJAVA");

    // Datum rođenja iz JMBG-a
    let datumRodjenjaIso = "";
    if (w.jmbg && w.jmbg.length === 13) {
      const dd = w.jmbg.slice(0, 2);
      const mm = w.jmbg.slice(2, 4);
      const ggg = parseInt(w.jmbg.slice(4, 7), 10);
      const year = ggg < 800 ? 2000 + ggg : 1000 + ggg;
      datumRodjenjaIso = `${year}-${mm}-${dd}`;
    }

    setWorker({
      jmbg: w.jmbg ?? "",
      prezime: w.lastName,
      ime: w.firstName,
      djevojackoPrezime: "",
      datumRodjenjaIso,
      spol: w.spol ?? (w.jmbg ? (spolFromJmbg(w.jmbg) ?? "") : ""),
      adresa: w.address ?? "",
      grad: w.city ?? "",
      kontaktAdresa: "",
      kontaktGrad: "",
      emailOsiguranika: w.email ?? "",
      strucnaSpremaIdx: w.strucnaSpremaIdx,
    });

    // Prvi dio — datum prijave: pre-fill iz worker.prijavaDate ako postoji
    // (ovo osigurava da generisanje JS3100 PDF-a NE overwrite-uje već unijeti
    // datum sa "danas"). Za PRIJAVA nove osobe → fallback na startDate ili danas.
    const datumPrijaveFromWorker =
      w.prijavaDate?.slice(0, 10) || w.startDate?.slice(0, 10) || getTodayIso();
    setDatumPrijaveIso(datumPrijaveFromWorker);

    // Treći dio — datum promjene
    const datumPromjeneIso =
      w.employmentStatus === "PRIJAVLJEN"
        ? (w.odjavaDate?.slice(0, 10) ??
          w.endDate?.slice(0, 10) ??
          getTodayIso())
        : (w.startDate?.slice(0, 10) ?? getTodayIso());

    setTreci((p) => ({
      ...p,
      sati: p.sati || "08",
      minuta: p.minuta || "00",
      // Osnov osiguranja i zanimanje — prvo iz spremljenih worker polja (prijava
      // ih je zapamtila), pa fallback na default/poziciju. Tako odjava povuče
      // iste podatke kao prijava bez ručnog ponovnog unosa.
      osnovOsiguranjaOpis: normalizeOsnovOpis(
        w.osnovOsiguranjaOpis ||
          p.osnovOsiguranjaOpis ||
          "Zaposleni, puno radno vrijeme",
      ),
      osnovOsiguranjaSifra: w.osnovOsiguranjaSifra || p.osnovOsiguranjaSifra || "01",
      zanimanjeOpis: w.zanimanjeOpis ?? w.position ?? p.zanimanjeOpis,
      zanimanjeSifra: w.zanimanjeSifra ?? p.zanimanjeSifra,
      strucnaSpremaTraziSeIdx: w.strucnaSpremaIdx ?? p.strucnaSpremaTraziSeIdx,
      datumPromjeneIso,
      osnovUplateOpis:
        w.salaryBruto != null
          ? `${w.salaryBruto.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM`
          : p.osnovUplateOpis,
    }));
  };

  /* ── Fill from profile ── */
  const fillEmployer = useCallback((data: OrgFillData) => {
    setEmployer((p) => ({
      ...p,
      jib: data.taxNumber ?? p.jib,
      naziv: data.name ?? p.naziv,
      adresa: data.address ?? p.adresa,
      grad: data.city ?? p.grad,
    }));
  }, []);

  const fillWorker = useCallback((data: FillData) => {
    setWorker((p) => ({
      ...p,
      jmbg: data.jmbg ?? p.jmbg,
      ime: data.firstName ?? p.ime,
      prezime: data.lastName ?? p.prezime,
      adresa: data.address ?? p.adresa,
      grad: data.city ?? p.grad,
    }));
  }, []);

  /* ── Build PDF data ── */
  const buildData = useCallback((): Js3100Data => {
    const rod = isoToDDMMYYYY(worker.datumRodjenjaIso);
    const promjene = isoToDDMMYYYY(treci.datumPromjeneIso);
    const employerCityInfo = findCity(employer.grad);
    const workerCityInfo = findCity(worker.grad);
    const kontaktCityInfo = findCity(worker.kontaktGrad);
    const effectivePostal =
      kontaktCityInfo?.postalCode ?? workerCityInfo?.postalCode ?? "";
    const effectiveCity = worker.kontaktGrad || worker.grad;
    const postanskiMjestoCombined = [effectivePostal, effectiveCity]
      .filter(Boolean)
      .join(" ");

    return {
      vrsta,
      datumPrijave: isoToDisplay(datumPrijaveIso),

      jib: employer.jib,
      sifraOpcine: employerCityInfo?.municipalityCode ?? "",
      naziv: employer.naziv,
      adresa: employer.adresa,
      gradPoste: [employerCityInfo?.postalCode, employer.grad]
        .filter(Boolean)
        .join(" "),
      telefon: employer.telefon,
      email: employer.email,

      jmbg: worker.jmbg,
      prezimeIme: [worker.prezime, worker.ime].filter(Boolean).join(" "),
      djevojackoPrezime: worker.djevojackoPrezime,
      datumRodjenjaDan: rod.dd,
      datumRodjenjaMjesec: rod.mm,
      datumRodjenjaGodina: rod.yyyy,
      spol: worker.spol,
      adresaPrebivalista: formatAddress(
        worker.adresa,
        worker.grad,
        workerCityInfo?.postalCode,
      ),
      sifraOpcineOsiguranika: workerCityInfo?.municipalityCode ?? "",
      postanskiBroj: effectivePostal,
      mjestoPrebivalista: effectiveCity,
      postanskiMjestoCombined,
      kontaktAdresa: worker.kontaktAdresa,
      emailOsiguranika: worker.emailOsiguranika,

      strucnaSpremaIdx: worker.strucnaSpremaIdx,

      // Treći dio
      sati: treci.sati,
      minuta: treci.minuta,
      osnovOsiguranjaOpis: treci.osnovOsiguranjaOpis,
      osnovOsiguranjaSifra: treci.osnovOsiguranjaSifra,
      zanimanjeOpis: treci.zanimanjeOpis,
      zanimanjeSifra: treci.zanimanjeSifra,
      strucnaSpremaTraziSeIdx: treci.strucnaSpremaTraziSeIdx,
      datumPromjeneDan: promjene.dd,
      datumPromjeneMjesec: promjene.mm,
      datumPromjeneGodina: promjene.yyyy,
      napomenaPromjene: treci.napomenaPromjene,
      osnovUplateOpis: treci.osnovUplateOpis,
      osnovUplateSifra: treci.osnovUplateSifra,
      sifraRadnogMjesta: treci.sifraRadnogMjesta,
      stepenUvecanja: treci.stepenUvecanja,

      popunioImeIPrezime,
      popunioTelefon,
      datumPopunjavanja: isoToDisplay(datumPopunjavanjaIso),
    };
  }, [
    vrsta,
    datumPrijaveIso,
    employer,
    worker,
    treci,
    popunioImeIPrezime,
    popunioTelefon,
    datumPopunjavanjaIso,
    findCity,
  ]);

  const queryClient = useQueryClient();
  const [statusOnly, setStatusOnly] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Sinhronizuje employmentStatus + datume radnika u bazi (PRIJAVLJEN/ODJAVLJEN)
  // koristeći datume IZ FORME. Auto-kreira radnika ako nije odabran. Vraća true
  // ako je status promijenjen. Dijeli je "Preuzmi PDF" i "Samo prijavi/odjavi".
  // throwOnError=true → baca grešku (za standalone akciju koja treba feedback);
  // false → best-effort (download ne smije pasti zbog status update-a).
  const syncWorkerStatus = async (throwOnError: boolean): Promise<boolean> => {
    if (!sidebarOrgId || vrsta === "PROMJENA") return false;
    const formPrijavaDate = datumPrijaveIso || getTodayIso();
    const formOdjavaDate = treci.datumPromjeneIso || getTodayIso();
    const payload =
      vrsta === "PRIJAVA"
        ? {
            employmentStatus: "PRIJAVLJEN" as const,
            prijavaDate: formPrijavaDate,
            // Re-prijava: očisti staru odjavu da derivacija statusa
            // (odjavaDate ima prioritet) ne zadrži ODJAVLJEN.
            odjavaDate: null,
            endDate: null,
            // Zapamti JS3100 stabilna polja da ih odjava kasnije prefill-a.
            osnovOsiguranjaOpis: treci.osnovOsiguranjaOpis || null,
            osnovOsiguranjaSifra: treci.osnovOsiguranjaSifra || null,
            zanimanjeOpis: treci.zanimanjeOpis || null,
            zanimanjeSifra: treci.zanimanjeSifra || null,
          }
        : {
            employmentStatus: "ODJAVLJEN" as const,
            odjavaDate: formOdjavaDate,
            endDate: formOdjavaDate,
          };
    try {
      let targetWorkerId = sidebarWorkerId;
      // Ako radnik nije odabran (JS3100 popunjen direktno bez biranja iz
      // sidebar-a), auto-kreiraj ga iz forme pa ga prijavi/odjavi.
      if (!targetWorkerId) {
        const ime = (worker.ime || "").trim();
        const prezime = (worker.prezime || "").trim();
        if (!ime || !prezime) {
          throw new Error(
            "Unesite ime i prezime osiguranika da bi se radnik kreirao.",
          );
        }
        if (!worker.jmbg || worker.jmbg.length !== 13) {
          throw new Error(
            "JMBG osiguranika mora imati 13 cifara da bi se radnik kreirao.",
          );
        }
        const created = await unwrap(
          createWorker(sidebarOrgId, {
            role: "RADNIK",
            firstName: ime,
            lastName: prezime,
            jmbg: worker.jmbg,
            startDate: formPrijavaDate,
            address: worker.adresa?.trim() || undefined,
            email: worker.emailOsiguranika?.trim() || undefined,
            spol: worker.spol || null,
            strucnaSpremaIdx: worker.strucnaSpremaIdx ?? null,
          }),
        );
        targetWorkerId = created.id;
        setSidebarWorkerId(created.id);
      }
      await unwrap(updateWorker(sidebarOrgId, targetWorkerId, payload));
      queryClient.invalidateQueries({ queryKey: ["workers", sidebarOrgId] });
      queryClient.invalidateQueries({ queryKey: ["allMyWorkers"] });
      return true;
    } catch (e) {
      console.warn("Greška pri ažuriranju statusa radnika:", e);
      if (throwOnError) throw e;
      return false;
    }
  };

  const handleExport = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const bytes = await fillJs3100Template(buildData());
      const suffix =
        vrsta === "PRIJAVA"
          ? "Prijava"
          : vrsta === "ODJAVA"
            ? "Odjava"
            : "Promjena";
      const last = worker.prezime || worker.jmbg || "radnik";
      downloadPdf(bytes, `JS3100_${suffix}_${last}.pdf`);
      trackEvent("JS3100_GENERATE", `JS3100 (${suffix})`, sidebarOrgId);

      // Status update je best-effort — download ne smije pasti zbog njega.
      await syncWorkerStatus(false);
    } finally {
      setLoading(false);
    }
  };

  // "Samo prijavi/odjavi radnika" — promijeni status bez generisanja PDF-a
  // (npr. JS3100 već predan elektronski preko ePortala).
  const handleStatusOnly = async () => {
    if (!canGenerate || vrsta === "PROMJENA") return;
    setStatusOnly(true);
    setStatusMsg(null);
    try {
      const ok = await syncWorkerStatus(true);
      if (ok) {
        setStatusMsg(
          vrsta === "PRIJAVA"
            ? "Radnik je označen kao Prijavljen."
            : "Radnik je označen kao Odjavljen.",
        );
      }
    } catch (e) {
      setStatusMsg("Greška: " + (e as Error).message);
    } finally {
      setStatusOnly(false);
    }
  };

  return (
    <div className={uorStyles.pageOuter}>
      <div className={uorStyles.pageLayout}>
        <WorkersSidebar
          selectedOrgId={sidebarOrgId}
          onOrgChange={setSidebarOrgId}
          selectedWorkerId={sidebarWorkerId}
          onWorkerSelect={handleWorkerPick}
          bottomHint="Klik na radnika auto-popunjava JS3100 obrazac (poslodavac + osiguranik + datum)."
          enableQuickAdd
        />
        <div className={`${styles.page} ${uorStyles.pageContent}`}>
          <div className={styles.header}>
            <div className={styles.label}>Obrazac JS3100</div>
            <h1 className={styles.h1}>
              Prijava / Odjava <em>radnika</em>
            </h1>
            <p className={styles.subtitle}>
              Jedinstveni sistem registracije, kontrole i naplate doprinosa, 
              JS3100. Odaberite radnika u sidebar-u za auto-popunu.
            </p>
          </div>

          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              handleExport();
            }}
          >
            {/* ── Vrsta prijave ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Vrsta <em>prijave</em>
              </h2>
              <div className={styles.fieldGrid}>
                <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                  <label className={styles.fieldLabel}>Tip</label>
                  <div style={{ display: "flex", gap: "1.5rem" }}>
                    {(["PRIJAVA", "PROMJENA", "ODJAVA"] as Js3100Vrsta[]).map(
                      (v) => (
                        <label
                          key={v}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="vrsta"
                            value={v}
                            checked={vrsta === v}
                            onChange={() => setVrsta(v)}
                          />
                          {v === "PRIJAVA"
                            ? "Prijava osiguranja"
                            : v === "PROMJENA"
                              ? "Promjena podataka"
                              : "Odjava osiguranja"}
                        </label>
                      ),
                    )}
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Datum prijave</label>
                  <DateInput
                    className={styles.fieldInput}
                    value={datumPrijaveIso}
                    onValueChange={(iso) => {
                      setDatumPrijaveIso(iso);
                      // Za PRIJAVA: "Datum promjene" u trećem dijelu je isto što
                      // i datum prijave — auto-popuni da korisnik ne mora dvaput
                      // unositi.
                      if (vrsta === "PRIJAVA") {
                        setTreci((p) => ({ ...p, datumPromjeneIso: iso }));
                      }
                    }}
                  />
                </div>
              </div>
            </section>

            {/* ── Prvi dio, Obveznik ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Prvi dio, Podaci o <em>obvezniku uplate doprinosa</em>
              </h2>
              <OrgFillSelect onFill={fillEmployer} />
              <div className={styles.fieldGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>1) JIB</label>
                  <input
                    className={styles.fieldInput}
                    value={employer.jib}
                    onChange={(e) =>
                      setEmployer((p) => ({ ...p, jib: e.target.value }))
                    }
                    maxLength={13}
                    placeholder="13 cifara"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>7) Telefon</label>
                  <input
                    className={styles.fieldInput}
                    value={employer.telefon}
                    onChange={(e) =>
                      setEmployer((p) => ({ ...p, telefon: e.target.value }))
                    }
                    placeholder="+387..."
                  />
                </div>
                <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                  <label className={styles.fieldLabel}>
                    2) Naziv obveznika uplate doprinosa
                  </label>
                  <input
                    className={styles.fieldInput}
                    value={employer.naziv}
                    onChange={(e) =>
                      setEmployer((p) => ({ ...p, naziv: e.target.value }))
                    }
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    3) Adresa obveznika
                  </label>
                  <input
                    className={styles.fieldInput}
                    value={employer.adresa}
                    onChange={(e) =>
                      setEmployer((p) => ({ ...p, adresa: e.target.value }))
                    }
                    placeholder="Ulica i broj"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    4) Grad i poštanski broj
                  </label>
                  <CitySelect
                    value={employer.grad}
                    onChange={(v) => setEmployer((p) => ({ ...p, grad: v }))}
                    className={styles.fieldInput}
                  />
                </div>
                <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                  <label className={styles.fieldLabel}>8) Email</label>
                  <input
                    type="email"
                    className={styles.fieldInput}
                    value={employer.email}
                    onChange={(e) =>
                      setEmployer((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
              </div>
            </section>

            {/* ── Drugi dio, Osiguranik ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Drugi dio, Podaci o <em>osiguraniku</em>
              </h2>
              <PersonFillSelect onFill={fillWorker} />
              <div className={styles.fieldGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>JMBG</label>
                  <input
                    className={styles.fieldInput}
                    value={worker.jmbg}
                    onChange={(e) =>
                      setWorker((p) => ({
                        ...p,
                        jmbg: e.target.value.replace(/\D/g, "").slice(0, 13),
                      }))
                    }
                    maxLength={13}
                    placeholder="13 cifara"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Datum rođenja</label>
                  <DateInput
                    className={styles.fieldInput}
                    value={worker.datumRodjenjaIso}
                    onValueChange={(iso) =>
                      setWorker((p) => ({ ...p, datumRodjenjaIso: iso }))
                    }
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Prezime</label>
                  <input
                    className={styles.fieldInput}
                    value={worker.prezime}
                    onChange={(e) =>
                      setWorker((p) => ({ ...p, prezime: e.target.value }))
                    }
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Ime</label>
                  <input
                    className={styles.fieldInput}
                    value={worker.ime}
                    onChange={(e) =>
                      setWorker((p) => ({ ...p, ime: e.target.value }))
                    }
                  />
                </div>
                <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                  <label className={styles.fieldLabel}>
                    Djevojačko prezime
                  </label>
                  <input
                    className={styles.fieldInput}
                    value={worker.djevojackoPrezime}
                    onChange={(e) =>
                      setWorker((p) => ({
                        ...p,
                        djevojackoPrezime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                  <label className={styles.fieldLabel}>Spol</label>
                  <div style={{ display: "flex", gap: "1.5rem" }}>
                    {(["M", "Z"] as Js3100Spol[]).map((s) => (
                      <label
                        key={s}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="spol"
                          value={s}
                          checked={worker.spol === s}
                          onChange={() => setWorker((p) => ({ ...p, spol: s }))}
                        />
                        {s === "M" ? "Muški" : "Ženski"}
                      </label>
                    ))}
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Adresa prebivališta
                  </label>
                  <input
                    className={styles.fieldInput}
                    value={worker.adresa}
                    onChange={(e) =>
                      setWorker((p) => ({ ...p, adresa: e.target.value }))
                    }
                    placeholder="Ulica i broj"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Mjesto / Grad</label>
                  <CitySelect
                    value={worker.grad}
                    onChange={(v) => setWorker((p) => ({ ...p, grad: v }))}
                    className={styles.fieldInput}
                  />
                </div>
                <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                  <p
                    className={styles.fieldLabel}
                    style={{ marginTop: "0.5rem", marginBottom: "-0.25rem" }}
                  >
                    Kontakt adresa, popuniti samo ako se razlikuje od adrese
                    prebivališta
                  </p>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Kontakt adresa, ulica i broj
                  </label>
                  <input
                    className={styles.fieldInput}
                    value={worker.kontaktAdresa}
                    onChange={(e) =>
                      setWorker((p) => ({
                        ...p,
                        kontaktAdresa: e.target.value,
                      }))
                    }
                    placeholder="Ulica i broj"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Kontakt, Mjesto / Grad
                  </label>
                  <CitySelect
                    value={worker.kontaktGrad}
                    onChange={(v) =>
                      setWorker((p) => ({ ...p, kontaktGrad: v }))
                    }
                    className={styles.fieldInput}
                  />
                </div>
                <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                  <label className={styles.fieldLabel}>Email osiguranika</label>
                  <input
                    type="email"
                    className={styles.fieldInput}
                    value={worker.emailOsiguranika}
                    onChange={(e) =>
                      setWorker((p) => ({
                        ...p,
                        emailOsiguranika: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                  <label className={styles.fieldLabel}>Stručna sprema</label>
                  <select
                    className={styles.fieldInput}
                    value={worker.strucnaSpremaIdx ?? ""}
                    onChange={(e) =>
                      setWorker((p) => ({
                        ...p,
                        strucnaSpremaIdx:
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value),
                      }))
                    }
                  >
                    <option value="">– Odaberite –</option>
                    {STRUCNA_SPREMA.map((t, i) => (
                      <option key={i} value={i}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* ── Treći dio, Podaci o osiguranju ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Treći dio, Podaci o <em>osiguranju</em>
              </h2>
              <div className={styles.fieldGrid}>
                {/* Red 1: Dnevno radno vrijeme */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Dnevno radno vrijeme, Sati
                  </label>
                  <input
                    className={styles.fieldInput}
                    inputMode="numeric"
                    value={treci.sati}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        sati: e.target.value.replace(/\D/g, "").slice(0, 2),
                      }))
                    }
                    placeholder="08"
                    maxLength={2}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Dnevno radno vrijeme, Minuta
                  </label>
                  <input
                    className={styles.fieldInput}
                    inputMode="numeric"
                    value={treci.minuta}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        minuta: e.target.value.replace(/\D/g, "").slice(0, 2),
                      }))
                    }
                    placeholder="00"
                    maxLength={2}
                  />
                </div>

                {/* Red 2: Osnov osiguranja */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Osnov osiguranja, Opis
                  </label>
                  <select
                    className={styles.fieldInput}
                    value={treci.osnovOsiguranjaOpis}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        osnovOsiguranjaOpis: e.target.value,
                      }))
                    }
                  >
                    <option value="">– Odaberite –</option>
                    {OSNOV_OSIGURANJA.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Osnov osiguranja, Šifra (2 cifre)
                  </label>
                  <input
                    className={styles.fieldInput}
                    inputMode="numeric"
                    value={treci.osnovOsiguranjaSifra}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        osnovOsiguranjaSifra: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2),
                      }))
                    }
                    maxLength={2}
                  />
                </div>

                {/* Red 3: Zanimanje */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Zanimanje, Opis</label>
                  <input
                    className={styles.fieldInput}
                    value={treci.zanimanjeOpis}
                    onChange={(e) =>
                      setTreci((p) => ({ ...p, zanimanjeOpis: e.target.value }))
                    }
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Zanimanje, Šifra (7 cifara)
                  </label>
                  <input
                    className={styles.fieldInput}
                    inputMode="numeric"
                    value={treci.zanimanjeSifra}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        zanimanjeSifra: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 7),
                      }))
                    }
                    maxLength={7}
                  />
                </div>

                {/* Red 4: Stručna sprema koja se traži */}
                <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                  <label className={styles.fieldLabel}>
                    Stručna sprema koja se traži na radnom mjestu
                  </label>
                  <select
                    className={styles.fieldInput}
                    value={treci.strucnaSpremaTraziSeIdx ?? ""}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        strucnaSpremaTraziSeIdx:
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value),
                      }))
                    }
                  >
                    <option value="">– Odaberite –</option>
                    {STRUCNA_SPREMA.map((t, i) => (
                      <option key={i} value={i}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Red 5: Datum prijave/odjave/promjene */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Datum prijave / odjave / promjene osiguranja
                  </label>
                  <DateInput
                    className={styles.fieldInput}
                    value={treci.datumPromjeneIso}
                    onValueChange={(iso) =>
                      setTreci((p) => ({ ...p, datumPromjeneIso: iso }))
                    }
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Napomena (uz datum)
                  </label>
                  <input
                    className={styles.fieldInput}
                    value={treci.napomenaPromjene}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        napomenaPromjene: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Red 6: Osnov za uplatu doprinosa */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Osnov za uplatu doprinosa, Opis
                  </label>
                  <input
                    className={styles.fieldInput}
                    value={treci.osnovUplateOpis}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        osnovUplateOpis: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Osnov za uplatu doprinosa, Šifra (2 cifre)
                  </label>
                  <input
                    className={styles.fieldInput}
                    inputMode="numeric"
                    value={treci.osnovUplateSifra}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        osnovUplateSifra: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2),
                      }))
                    }
                    maxLength={2}
                  />
                </div>

                {/* Red 7: Staž sa uvećanim trajanjem */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Šifra radnog mjesta (4 cifre)
                  </label>
                  <input
                    className={styles.fieldInput}
                    inputMode="numeric"
                    value={treci.sifraRadnogMjesta}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        sifraRadnogMjesta: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4),
                      }))
                    }
                    maxLength={4}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Stepen uvećanja (X / 12)
                  </label>
                  <input
                    className={styles.fieldInput}
                    inputMode="numeric"
                    value={treci.stepenUvecanja}
                    onChange={(e) =>
                      setTreci((p) => ({
                        ...p,
                        stepenUvecanja: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2),
                      }))
                    }
                    maxLength={2}
                  />
                </div>
              </div>
            </section>

            {/* ── Footer ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Lice koje je <em>popunilo prijavu</em>
              </h2>
              <PersonFillSelect
                onFill={(d) => {
                  const full = [d.firstName, d.lastName]
                    .filter(Boolean)
                    .join(" ");
                  if (full) setPopunioImeIPrezime(full);
                }}
              />
              <div className={styles.fieldGrid}>
                <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                  <label className={styles.fieldLabel}>
                    Ime i prezime lica
                  </label>
                  <input
                    className={styles.fieldInput}
                    value={popunioImeIPrezime}
                    onChange={(e) => setPopunioImeIPrezime(e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Telefonski broj</label>
                  <input
                    className={styles.fieldInput}
                    value={popunioTelefon}
                    onChange={(e) => setPopunioTelefon(e.target.value)}
                    placeholder="+387..."
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Datum popunjavanja
                  </label>
                  <DateInput
                    className={styles.fieldInput}
                    value={datumPopunjavanjaIso}
                    onValueChange={setDatumPopunjavanjaIso}
                  />
                </div>
              </div>
            </section>

            {!canGenerate && (
              <GeneratePaywall tier="PRO" what="Preuzimanje JS3100 obrasca" />
            )}
            <div className={styles.actions}>
              <SaveToProfileButton
                type="JS3100"
                year={
                  parseInt(datumPrijaveIso.slice(0, 4)) ||
                  new Date().getFullYear()
                }
                title={`JS3100 · ${[worker.prezime, worker.ime].filter(Boolean).join(" ") || "radnik"} · ${
                  vrsta === "PRIJAVA"
                    ? "Prijava"
                    : vrsta === "ODJAVA"
                      ? "Odjava"
                      : "Promjena"
                }`}
                buildData={buildData}
                disabled={loading || !worker.prezime || !canGenerate}
              />
              <button
                type="submit"
                className={styles.exportBtn}
                disabled={loading || statusOnly || !canGenerate}
                title={
                  canGenerate
                    ? undefined
                    : "Dostupno uz Pro ili Business pretplatu"
                }
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
                {loading ? "Generisanje..." : "Preuzmi PDF"}
              </button>
              {vrsta !== "PROMJENA" && (
                <button
                  type="button"
                  className={styles.statusOnlyBtn}
                  onClick={handleStatusOnly}
                  disabled={loading || statusOnly || !canGenerate}
                  title={
                    canGenerate
                      ? "Promijeni status radnika u aplikaciji bez generisanja PDF-a (npr. ako je JS3100 već predan elektronski)"
                      : "Dostupno uz Pro ili Business pretplatu"
                  }
                >
                  {statusOnly
                    ? "Spremam..."
                    : vrsta === "PRIJAVA"
                      ? "Samo prijavi radnika"
                      : "Samo odjavi radnika"}
                </button>
              )}
            </div>

            {vrsta !== "PROMJENA" && (
              <p className={styles.statusNote}>
                {vrsta === "PRIJAVA" ? (
                  <>
                    Napomena: preuzimanjem PDF-a (ili klikom na „Samo prijavi
                    radnika") radnik se u aplikaciji označava kao{" "}
                    <strong>Prijavljen</strong> i pojavljuje se u Aktivnim
                    radnicima.
                  </>
                ) : (
                  <>
                    Napomena: preuzimanjem PDF-a (ili klikom na „Samo odjavi
                    radnika") radnik se u aplikaciji označava kao{" "}
                    <strong>Odjavljen</strong>.
                  </>
                )}
              </p>
            )}
            {statusMsg && <p className={styles.statusDone}>{statusMsg}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
