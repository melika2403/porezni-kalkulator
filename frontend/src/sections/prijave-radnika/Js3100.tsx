"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./js3100.module.css";
import uorStyles from "src/sections/ugovor-o-radu/uor.module.css";
import WorkersSidebar from "src/components/WorkersSidebar/WorkersSidebar";
import {
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
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import PreviewRegisterGate from "src/components/PreviewRegisterGate/PreviewRegisterGate";
import { useRole } from "src/hooks/useRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
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
  "DR — Doktor nauka",
  "MR — Magistar",
  "VSS — Visoka stručna sprema",
  "VŠS — Viša stručna sprema",
  "SSS — Srednja stručna sprema",
  "Niža",
  "VKV — Visokokvalifikovani",
  "KV — Kvalifikovani",
  "PK — Polukvalifikovani",
  "NK — Nekvalifikovani",
];

/* ── Osnov osiguranja opcije (Check Box2..11) ── */
const OSNOV_OSIGURANJA = [
  "Zaposleni — puno radno vrijeme",
  "Zaposleni — nepuno radno vrijeme",
  "Direktor / član uprave",
  "Vlasnik obrta",
  "Stručno osposobljavanje",
  "Sezonski radnik",
  "Penzioner — povratak na rad",
  "Stranac — radna dozvola",
  "Ostalo 1",
  "Ostalo 2",
];

/* ── Component ── */
export default function Js3100Form() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });
  if (isLoading) {
    return <div className={styles.page} />;
  }
  if (!user) {
    return <UpgradeGate />;
  }
  return <Js3100App />;
}

function UpgradeGate() {
  return (
    <PreviewRegisterGate
      pageLabel="Obrazac JS3100"
      pageTitle={<>Prijava / Odjava <em>radnika</em></>}
      pageSubtitle="Jedinstveni sistem registracije, kontrole i naplate doprinosa — JS3100."
      featureName="JS3100 obrasca i obračuna plata"
      previewDesc="unositi podatke, dodavati radnike i vidjeti kompletan obračun"
      proUnlocks="Preuzimanje PDF-a i uplatnica"
    />
  );
}

function Js3100App() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const { findByName: findCity } = useCityLookup();
  const searchParams = useSearchParams();
  const { hasRole } = useRole();
  const canGenerate = hasRole("PRO", "BUSINESS", "ADMIN");

  const { lastOrgId, setLastOrgId } = useLastOrg();

  const initialOrgId = (() => {
    const v = searchParams.get("org");
    const fromUrl = v ? Number(v) || null : null;
    return fromUrl ?? lastOrgId ?? null;
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
  const [sidebarOrgId, setSidebarOrgIdInternal] = useState<number | null>(initialOrgId);
  const [sidebarWorkerId, setSidebarWorkerId] = useState<number | null>(initialWorkerId);

  // Perzistira odabranu organizaciju u localStorage da Obračun plata / Aktivni
  // radnici otvore istu organizaciju bez ponovnog odabira.
  const setSidebarOrgId = useCallback(
    (id: number | null) => {
      setSidebarOrgIdInternal(id);
      if (id != null) setLastOrgId(id);
    },
    [setLastOrgId],
  );

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
    enabled: !!sidebarOrgId,
  });

  /* ── Deep-link: auto-popuna radnika iz URL parametra ── */
  const workersQuery = useQuery({
    queryKey: ["workers", sidebarOrgId],
    queryFn: () => unwrap(getWorkers(sidebarOrgId!)),
    enabled: !!sidebarOrgId && !!initialWorkerId,
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
        ? w.odjavaDate?.slice(0, 10) ?? w.endDate?.slice(0, 10) ?? getTodayIso()
        : w.startDate?.slice(0, 10) ?? getTodayIso();

    setTreci((p) => ({
      ...p,
      sati: p.sati || "08",
      minuta: p.minuta || "00",
      osnovOsiguranjaOpis: p.osnovOsiguranjaOpis || "Zaposleni — puno radno vrijeme",
      osnovOsiguranjaSifra: p.osnovOsiguranjaSifra || "01",
      zanimanjeOpis: w.position ?? p.zanimanjeOpis,
      strucnaSpremaTraziSeIdx: w.strucnaSpremaIdx ?? p.strucnaSpremaTraziSeIdx,
      datumPromjeneIso,
      osnovUplateOpis: w.salaryBruto != null
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
  const handleExport = async () => {
    if (!canGenerate) return;
    setLoading(true);
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

      // Sinhroniziraj employmentStatus + datume radnika u bazi (PRIJAVLJEN/ODJAVLJEN)
      // koristeći datume IZ FORME (ono što je user odabrao), ne uvijek "danas".
      // Ovo osigurava da 2001/2002 obrasci kasnije koriste iste datume kao i JS3100.
      if (sidebarOrgId && sidebarWorkerId && vrsta !== "PROMJENA") {
        const formPrijavaDate = datumPrijaveIso || getTodayIso();
        const formOdjavaDate = treci.datumPromjeneIso || getTodayIso();
        const payload =
          vrsta === "PRIJAVA"
            ? {
                employmentStatus: "PRIJAVLJEN" as const,
                prijavaDate: formPrijavaDate,
              }
            : {
                employmentStatus: "ODJAVLJEN" as const,
                odjavaDate: formOdjavaDate,
                endDate: formOdjavaDate,
              };
        try {
          await unwrap(updateWorker(sidebarOrgId, sidebarWorkerId, payload));
          queryClient.invalidateQueries({ queryKey: ["workers", sidebarOrgId] });
          queryClient.invalidateQueries({ queryKey: ["allMyWorkers"] });
        } catch (e) {
          // Ne prekidaj download — status update je best-effort.
          console.warn("Greška pri ažuriranju statusa radnika:", e);
        }
      }
    } finally {
      setLoading(false);
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
              Jedinstveni sistem registracije, kontrole i naplate doprinosa —
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
                onValueChange={setDatumPrijaveIso}
              />
            </div>
          </div>
        </section>

        {/* ── Prvi dio — Obveznik ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Prvi dio — Podaci o <em>obvezniku uplate doprinosa</em>
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
              <label className={styles.fieldLabel}>3) Adresa obveznika</label>
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

        {/* ── Drugi dio — Osiguranik ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Drugi dio — Podaci o <em>osiguraniku</em>
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
              <label className={styles.fieldLabel}>Djevojačko prezime</label>
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
              <label className={styles.fieldLabel}>Adresa prebivališta</label>
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
                Kontakt adresa — popuniti samo ako se razlikuje od adrese
                prebivališta
              </p>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Kontakt adresa — ulica i broj
              </label>
              <input
                className={styles.fieldInput}
                value={worker.kontaktAdresa}
                onChange={(e) =>
                  setWorker((p) => ({ ...p, kontaktAdresa: e.target.value }))
                }
                placeholder="Ulica i broj"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Kontakt — Mjesto / Grad
              </label>
              <CitySelect
                value={worker.kontaktGrad}
                onChange={(v) => setWorker((p) => ({ ...p, kontaktGrad: v }))}
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
                  setWorker((p) => ({ ...p, emailOsiguranika: e.target.value }))
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
                      e.target.value === "" ? null : parseInt(e.target.value),
                  }))
                }
              >
                <option value="">— Odaberite —</option>
                {STRUCNA_SPREMA.map((t, i) => (
                  <option key={i} value={i}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── Treći dio — Podaci o osiguranju ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Treći dio — Podaci o <em>osiguranju</em>
          </h2>
          <div className={styles.fieldGrid}>
            {/* Red 1: Dnevno radno vrijeme */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Dnevno radno vrijeme — Sati
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
                Dnevno radno vrijeme — Minuta
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
                Osnov osiguranja — Opis
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
                <option value="">— Odaberite —</option>
                {OSNOV_OSIGURANJA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Osnov osiguranja — Šifra (2 cifre)
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
              <label className={styles.fieldLabel}>Zanimanje — Opis</label>
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
                Zanimanje — Šifra (7 cifara)
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
                      e.target.value === "" ? null : parseInt(e.target.value),
                  }))
                }
              >
                <option value="">— Odaberite —</option>
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
              <label className={styles.fieldLabel}>Napomena (uz datum)</label>
              <input
                className={styles.fieldInput}
                value={treci.napomenaPromjene}
                onChange={(e) =>
                  setTreci((p) => ({ ...p, napomenaPromjene: e.target.value }))
                }
              />
            </div>

            {/* Red 6: Osnov za uplatu doprinosa */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Osnov za uplatu doprinosa — Opis
              </label>
              <input
                className={styles.fieldInput}
                value={treci.osnovUplateOpis}
                onChange={(e) =>
                  setTreci((p) => ({ ...p, osnovUplateOpis: e.target.value }))
                }
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Osnov za uplatu doprinosa — Šifra (2 cifre)
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
              const full = [d.firstName, d.lastName].filter(Boolean).join(" ");
              if (full) setPopunioImeIPrezime(full);
            }}
          />
          <div className={styles.fieldGrid}>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>Ime i prezime lica</label>
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
              <label className={styles.fieldLabel}>Datum popunjavanja</label>
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
              parseInt(datumPrijaveIso.slice(0, 4)) || new Date().getFullYear()
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
            disabled={loading || !canGenerate}
            title={canGenerate ? undefined : "Dostupno uz Pro ili Business pretplatu"}
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
        </div>
      </form>
        </div>
      </div>
    </div>
  );
}
