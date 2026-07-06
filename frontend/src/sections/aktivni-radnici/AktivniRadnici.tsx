"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  IconBuilding,
  IconFileText,
  IconClipboardList,
  IconId,
  IconPencil,
  IconTrash,
  IconUserOff,
} from "@tabler/icons-react";
import {
  getClientOrganizations,
  getOrganizations,
  getWorkers,
  type Worker,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import { useRole } from "src/hooks/useRole";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import { useLastOrg } from "src/hooks/useLastOrg";
import PreviewRegisterGate from "src/components/PreviewRegisterGate/PreviewRegisterGate";
import RadniciTabBar from "src/components/RadniciTabBar/RadniciTabBar";
import OrgSelect from "src/components/OrgSelect/OrgSelect";
import { WorkerModal } from "src/sections/zaposlenici/WorkerModal";
import { WorkersTable } from "src/sections/zaposlenici/WorkersTable";
import { DeleteWorkerModal } from "src/sections/zaposlenici/DeleteWorkerModal";
import styles from "./aktivniRadnici.module.css";
// PK Office tokeni + utility klase za .pk-scope blokove (tabela + modali).
import "src/styles/pk-embed.css";

type Filter = "svi" | "prijavljeni" | "draft" | "odjavljeni";

function fmtPlata(n: number | null): string {
  if (n == null) return "–";
  return (
    n.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " KM"
  );
}

// Prikaz plate u listi: neto se prepisuje kako jeste; ako je radniku osnovica
// bruto, prikaže se bruto sa malom oznakom. Vlasnik obrta nema platu (doprinosi
// po režimu, Obrazac 2002) pa ide poseban marker.
function PlataCell({ w, isObrt }: { w: Worker; isObrt: boolean }) {
  if (w.role === "VLASNIK" && isObrt) {
    return (
      <span
        className={styles.muted}
        style={{ fontSize: 12 }}
        title="Vlasnik obrta nema platu, plaća doprinose po režimu oporezivanja (Obrazac 2002)"
      >
        Obrtnik · doprinosi
      </span>
    );
  }
  let amount: number | null = null;
  let isBruto = false;
  if (w.salaryType === "BRUTO") {
    amount = w.salaryBruto;
    isBruto = true;
  } else if (w.salaryNeto != null) {
    amount = w.salaryNeto;
  } else if (w.salaryBruto != null) {
    amount = w.salaryBruto;
    isBruto = true;
  }
  if (amount == null) return <>–</>;
  return (
    <span>
      {fmtPlata(amount)}
      {isBruto && (
        <span
          style={{
            marginLeft: 6,
            padding: "1px 6px",
            background: "rgba(58, 92, 66, 0.12)",
            color: "var(--sage)",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          bruto
        </span>
      )}
    </span>
  );
}

export default function AktivniRadnici() {
  const { role } = useRole();
  const { hasAccessToTier } = useMaxAccessibleTier();
  const isLoggedIn = role !== null;
  // Worker create + klijent-org listing — dostupno ako vlastiti plan ili bilo
  // koja moja org ima PRO+ vlasnika.
  const canCreateWorker = hasAccessToTier("PRO");
  const canSeeClients = hasAccessToTier("PRO");

  const searchParams = useSearchParams();
  const { lastOrgId, loaded: lastOrgLoaded, setLastOrgId } = useLastOrg();

  const urlOrg = (() => {
    const v = searchParams.get("org");
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  // orgId se hidrira u dvije faze:
  //   1) Ako URL ima ?org=X → inicijaliziramo odmah.
  //   2) Inače pričekamo da `useLastOrg` pročita localStorage (loaded=true),
  //      pa usvojimo lastOrgId ili pokrenemo auto-select fallback.
  // Bez ovog gatinga, auto-select bi pregazio upamćenu klijentsku org
  // prvom vlastitom org-om (jer lastOrgId je null na prvom renderu).
  const [orgId, setOrgId] = useState<number | null>(urlOrg);
  const [hydrated, setHydrated] = useState<boolean>(urlOrg != null);
  const [filter, setFilter] = useState<Filter>("svi");
  // PK Office modal forme: null = zatvoreno; { worker: null } = novi radnik.
  const [workerModal, setWorkerModal] = useState<{
    worker: Worker | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null);
  const router = useRouter();

  const orgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
    enabled: isLoggedIn,
  });
  const clientOrgsQuery = useQuery({
    queryKey: ["clientOrganizations"],
    queryFn: () => unwrap(getClientOrganizations()),
    enabled: isLoggedIn && canSeeClients,
  });

  // Faza 2: usvoji lastOrgId čim localStorage hidrira (samo ako URL nije postavio).
  useEffect(() => {
    if (hydrated) return;
    if (!lastOrgLoaded) return;
    if (lastOrgId != null) setOrgId(lastOrgId);
    setHydrated(true);
  }, [hydrated, lastOrgLoaded, lastOrgId]);

  // Auto-select first available org (own first, then client) — tek POSLIJE
  // hidracije, da ne pregazimo upamćenu org dok je localStorage još null.
  useEffect(() => {
    if (!hydrated) return;
    if (orgId != null) return;
    const own = orgsQuery.data ?? [];
    const clients = clientOrgsQuery.data ?? [];
    if (own.length > 0 && own[0]) setOrgId(own[0].id);
    else if (clients.length > 0 && clients[0]) setOrgId(clients[0].id);
  }, [hydrated, orgId, orgsQuery.data, clientOrgsQuery.data]);

  // Perzistira odabranu organizaciju u localStorage tako da JS3100, Obračun
  // plata i Ugovor o radu otvore istu organizaciju.
  useEffect(() => {
    if (orgId != null) setLastOrgId(orgId);
  }, [orgId, setLastOrgId]);

  const workersQuery = useQuery({
    queryKey: ["workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId!)),
    enabled: !!orgId,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });


  const allWorkers = workersQuery.data ?? [];
  const selectedOrg =
    [...(orgsQuery.data ?? []), ...(clientOrgsQuery.data ?? [])].find(
      (o) => o.id === orgId,
    ) ?? null;
  const isObrt = selectedOrg?.type === "BUSINESS";
  const isOwnOrg = (orgsQuery.data ?? []).some((o) => o.id === orgId);
  // U vlastitim organizacijama vlasnik se prikazuje kao radnik samo tamo gdje je
  // prijavljen (zaposlenje je na jednom mjestu). Skriva DRAFT/odjavljene
  // vlasnike-"ghostove" iz org gdje korisnik nije prijavljen.
  const visibleWorkers = isOwnOrg
    ? allWorkers.filter(
        (w) => !(w.role === "VLASNIK" && w.employmentStatus !== "PRIJAVLJEN"),
      )
    : allWorkers;
  // Uključi i RADNIK i VLASNIK (vlasnici se prepoznaju po roli i imaju badge).
  // Sort:
  //   1) Odjavljeni uvijek na dno (bez obzira kad su prijavljeni)
  //   2) Po datumu prijave ASC (najstariji prijavljen radnik gore)
  //   3) Po datumu kreiranja ASC (tiebreak)
  const radnici = [...visibleWorkers].sort((a, b) => {
    const aOff = a.employmentStatus === "ODJAVLJEN" ? 1 : 0;
    const bOff = b.employmentStatus === "ODJAVLJEN" ? 1 : 0;
    if (aOff !== bOff) return aOff - bOff;
    const aDate = a.prijavaDate || "9999-12-31";
    const bDate = b.prijavaDate || "9999-12-31";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });

  const filtered = radnici.filter((w) => {
    if (filter === "svi") return true;
    if (filter === "prijavljeni") return w.employmentStatus === "PRIJAVLJEN";
    if (filter === "draft") return w.employmentStatus === "DRAFT";
    if (filter === "odjavljeni") return w.employmentStatus === "ODJAVLJEN";
    return true;
  });

  const counts = {
    svi: radnici.length,
    prijavljeni: radnici.filter((w) => w.employmentStatus === "PRIJAVLJEN").length,
    draft: radnici.filter((w) => w.employmentStatus === "DRAFT").length,
    odjavljeni: radnici.filter((w) => w.employmentStatus === "ODJAVLJEN").length,
  };

  if (!isLoggedIn) {
    // Zadrži tab-bar i u preview (neulogovanom) stanju da korisnik može preći
    // na druge funkcije (Obračun plata, Ugovori...) bez vraćanja na početnu.
    return (
      <>
        <RadniciTabBar />
        <PreviewRegisterGate
          pageLabel="Radnici"
          pageTitle={<>Aktivni <em>radnici</em></>}
          pageSubtitle="Centralni pregled radnika i vlasnika obrta sa statusom prijave kod PIO/ZZO, ugovornim podacima i brzim akcijama."
          featureName="aktivnih radnika"
          previewDesc="dodavati radnike i vlasnike, vidjeti njihov status, ugovore i historiju dokumenata"
          proUnlocks="Generisanje JS3100 prijave/odjave i ugovora o radu"
        />
      </>
    );
  }

  return (
    <>
    <RadniciTabBar />
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Radnici</p>
        <h1 className={styles.h1}>
          Aktivni <em>radnici</em>
        </h1>
        <p className={styles.subtitle}>
          Pregled svih radnika sa statusom prijave kod PIO/ZZO, ugovornim podacima
          i brzim akcijama za generisanje ugovora ili otkaza.
        </p>
      </div>

      {/* Org selector + Quick add */}
      <div className={styles.controlsBar}>
        <label className={styles.orgPicker}>
          <span>Organizacija</span>
          <OrgSelect
            value={orgId}
            onChange={(v) => setOrgId(v)}
            style={{ fontSize: "1rem", padding: "0.7rem 0.95rem" }}
          />
        </label>
        {orgId && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              flexWrap: "wrap",
            }}
          >
            {/* Pregled organizacije: kartica sa radnicima + pristup korisnicima */}
            <Link
              href={`/organizacija/${orgId}`}
              className={styles.backLink}
              style={{ marginBottom: 0 }}
              title="Podaci organizacije, radnici i pristup korisnicima"
            >
              <IconBuilding size={15} />
              Pregled organizacije
            </Link>
            {canCreateWorker ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setWorkerModal({ worker: null })}
              >
                + Novi radnik
              </button>
            ) : (
              <Link href="/pretplate" className={styles.upgradeChip}>
                🔒 Dodavanje radnika uz Pro pretplatu →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Filter chips */}
      {orgId && (
        <div className={styles.filterChips}>
          {(["svi", "prijavljeni", "draft", "odjavljeni"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.chip} ${filter === f ? styles.chipActive : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "svi" ? "Svi" : f.charAt(0).toUpperCase() + f.slice(1)}{" "}
              <span className={styles.chipCount}>{counts[f]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Workers table */}
      {orgId && (
        <div className={styles.tableWrap}>
          {workersQuery.isLoading ? (
            <div className={styles.empty}>Učitavam radnike…</div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              {radnici.length === 0
                ? canCreateWorker
                  ? "Nema dodanih radnika. Koristi '+ Novi radnik' da dodaš prvog."
                  : "Nema dodanih radnika. Dodavanje radnika dostupno uz Pro pretplatu."
                : "Nijedan radnik ne odgovara filteru."}
            </div>
          ) : (
            <div className="pk-scope">
              <WorkersTable
                workers={filtered}
                plataCell={(w) => <PlataCell w={w} isObrt={isObrt} />}
                onRowClick={(w) => router.push(`/aktivni-radnici/${w.id}`)}
                actionsFor={(w) => ({
                  primary: [
                    {
                      key: "ugovor",
                      label: "Ugovor",
                      title: "Generiši ugovor o radu, auto-popuna podataka",
                      icon: <IconFileText size={14} />,
                      href: `/ugovor-o-radu?org=${orgId}&worker=${w.id}&tab=ugovor`,
                    },
                    ...(canCreateWorker
                      ? [
                          {
                            key: "uredi",
                            label: "Uredi",
                            icon: <IconPencil size={14} />,
                            onClick: () => setWorkerModal({ worker: w }),
                          },
                        ]
                      : []),
                  ],
                  menu: [
                    {
                      kind: "item" as const,
                      key: "js3100",
                      label: "JS3100",
                      sub:
                        w.employmentStatus === "PRIJAVLJEN"
                          ? "odjava, auto-popuna"
                          : "prijava, auto-popuna",
                      icon: <IconClipboardList size={14} />,
                      href: `/prijave-radnika?org=${orgId}&worker=${w.id}&vrsta=${
                        w.employmentStatus === "PRIJAVLJEN" ? "ODJAVA" : "PRIJAVA"
                      }`,
                    },
                    ...(w.employmentStatus === "PRIJAVLJEN"
                      ? [
                          {
                            kind: "item" as const,
                            key: "otkaz",
                            label: "Otkaz",
                            sub: "generiši otkaz, auto-popuna",
                            icon: <IconUserOff size={14} />,
                            href: `/ugovor-o-radu?org=${orgId}&worker=${w.id}&tab=otkaz`,
                          },
                        ]
                      : []),
                    {
                      kind: "item" as const,
                      key: "karton",
                      label: "Karton radnika",
                      sub: "dokumenti i podaci",
                      icon: <IconId size={14} />,
                      href: `/aktivni-radnici/${w.id}`,
                    },
                    // Vlasnik se ne briše, akcija se i ne nudi.
                    ...(canCreateWorker && w.role !== "VLASNIK"
                      ? [
                          {
                            kind: "item" as const,
                            key: "obrisi",
                            label: "Obriši radnika",
                            sub: "trajno, uz potvrdu",
                            icon: <IconTrash size={14} />,
                            onClick: () => setDeleteTarget(w),
                          },
                        ]
                      : []),
                  ],
                })}
              />
            </div>
          )}
        </div>
      )}

      {/* PK Office modali (puna forma radnika + potvrda brisanja) */}
      {workerModal != null && orgId && (
        <div className="pk-scope">
          <WorkerModal
            key={workerModal.worker?.id ?? "new"}
            orgId={orgId}
            orgType={selectedOrg?.type ?? null}
            worker={workerModal.worker}
            onClose={() => setWorkerModal(null)}
          />
        </div>
      )}
      {orgId && (
        <DeleteWorkerModal
          orgId={orgId}
          worker={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </main>
    </>
  );
}
