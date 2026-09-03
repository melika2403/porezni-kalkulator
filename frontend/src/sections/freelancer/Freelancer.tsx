"use client";

import Link from "next/link";
import { useRole } from "src/hooks/useRole";
import FreelancerTrialCta, {
  FREELANCER_PRETPLATA_URL,
  useFreelancerPristup,
} from "src/components/FreelancerTrialCta/FreelancerTrialCta";
import { FREELANCER_CIJENA_KM } from "src/api/freelancer";
import FreelancerLanding from "./FreelancerLanding";
import FreelancerPregled from "./FreelancerPregled";
import FreelancerUplate from "./FreelancerUplate";
import FreelancerIsplatioci from "./FreelancerIsplatioci";
import FreelancerGodisnji from "./FreelancerGodisnji";
import FreelancerPostavke from "./FreelancerPostavke";
import FreelancerUputstvo from "./FreelancerUputstvo";
import FreelancerKalendar from "./FreelancerKalendar";
import SoloReklama from "./SoloReklama";
import { TABOVI, tabHref, useGodina, useTab } from "./hooks";
import { fmtDatum, isoDan } from "./format";
import styles from "./freelancer.module.css";

// /freelancer: gostu SEO landing, prijavljenom evidencija (tabovi iz TABOVI u
// hooks.ts: pregled, uplate, isplatioci, godišnji, kalendar, postavke, uputstvo). Besplatni
// nivo radi bez paketa (do 3 uplate godišnje, 5 isplatilaca); paket/proba se
// nude u traci iznad tabova, nikad kao zid.

/** Bočna ponuda PK Office Sola: samo registrovan korisnik bez paketa i probe. */
function SoloBocno() {
  const { pristup, hasAccess } = useFreelancerPristup();
  if (!pristup || hasAccess) return null;
  return (
    <aside className={styles.bocnoSolo} aria-label="PK Office Solo">
      <SoloReklama kompaktno izvor="freelancer-sidebar" />
    </aside>
  );
}

/**
 * Ispod pregleda, dok traje proba: do kada vrijedi i dugme za predračun, da
 * korisnik ne mora tražiti gdje se paket naručuje.
 */
function ProbaKartica() {
  const { pristup } = useFreelancerPristup();
  // Kartica prati SAMU probu, ne izvor pristupa: ko uz Freelancer probu ima i
  // Office probu dobija pristup "kroz paket", ali njegova Freelancer proba
  // svejedno teče i ističe, pa mu to treba pisati.
  if (!pristup || !pristup.proba.aktivna || !pristup.proba.endsAt) return null;
  if (pristup.izvor === "freelancer" || pristup.izvor === "admin") return null;
  // Ko PLAĆA paket (Office, Pro, Business) Freelancer već ima uključen, pa mu
  // se ne nudi kupovina samo zato što mu je ostala zaostala proba.
  if (pristup.plan) return null;
  const kraj = isoDan(pristup.proba.endsAt);
  const danas = new Date();
  danas.setHours(0, 0, 0, 0);
  const dana = Math.max(
    0,
    Math.round((new Date(`${kraj}T00:00:00`).getTime() - danas.getTime()) / 86400000),
  );
  return (
    <div className={styles.probaKartica}>
      <div>
        <strong>
          PK Freelancer proba ističe {fmtDatum(kraj)}
          {dana === 0 ? ", danas." : `, još ${dana} ${dana === 1 ? "dan" : "dana"}.`}
        </strong>
        <span>
          Da evidencija, podsjetnici na rokove, GPD iz evidencije i arhiva nastave bez
          prekida: {FREELANCER_CIJENA_KM} KM godišnje sa PDV-om, plaćanje po predračunu,
          bez kartice. Sve što ste unijeli ostaje na svom mjestu.
        </span>
      </div>
      <Link href={FREELANCER_PRETPLATA_URL} className={styles.probaDugme}>
        Zatraži predračun
      </Link>
    </div>
  );
}

function PristupTraka() {
  const { pristup, hasAccess } = useFreelancerPristup();
  if (!pristup) return null;
  if (!hasAccess) {
    const b = pristup.besplatno;
    return (
      <FreelancerTrialCta
        what={`Besplatno: do ${b.maxUplataGodisnje} sačuvane uplate godišnje i ${b.maxIsplatilaca} isplatilaca (ove godine ${pristup.brojUplataOveGodine}/${b.maxUplataGodisnje}). Paket skida ograničenja i otključava podsjetnike, GPD iz evidencije, potvrdu o prihodima i priloge.`}
      />
    );
  }
  let tekst: React.ReactNode;
  if (pristup.izvor === "proba") {
    tekst = (
      <>
        <strong>PK Freelancer proba</strong> traje do {fmtDatum(pristup.proba.endsAt)} Sve
        funkcije su otključane.
      </>
    );
  } else if (pristup.izvor === "freelancer") {
    tekst = (
      <>
        <strong>PK Freelancer paket</strong> aktivan
        {pristup.endDate ? <> do {fmtDatum(pristup.endDate)}</> : null}.
      </>
    );
  } else if (pristup.izvor === "admin") {
    tekst = <strong>Administratorski pristup.</strong>;
  } else {
    tekst = (
      <>
        <strong>Uključeno u vaš paket</strong>
        {pristup.plan ? <> ({pristup.plan.toUpperCase().replace("_", " ")})</> : null}.
      </>
    );
  }
  return (
    <div className={styles.statusTraka}>
      <span>{tekst}</span>
      <Link href={tabHref("postavke")}>Postavke i paket</Link>
    </div>
  );
}

export default function Freelancer() {
  const { role, isLoading } = useRole();
  const tab = useTab();
  const [godina] = useGodina();

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.empty}>Učitavanje...</div>
      </main>
    );
  }
  if (!role) return <FreelancerLanding />;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>PK Freelancer</p>
        <h1 className={styles.h1}>
          Evidencija <em>honorara iz inostranstva</em>
        </h1>
        <p className={styles.subtitle}>
          Svaka uplata na jednom mjestu: AMS-1035 i uplatnice iz evidencije, rok za
          predaju, GPD-1051 na kraju godine i pregled prihoda kad zatreba banci.
        </p>
      </div>

      <PristupTraka />

      <nav className={styles.tabs} role="tablist" aria-label="PK Freelancer">
        {TABOVI.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key, godina)}
            scroll={false}
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "pregled" && (
        <>
          <FreelancerPregled />
          <ProbaKartica />
        </>
      )}
      {/* Ponuda PK Office Sola stoji IZVAN okvira stranice, desno, kao bočna
          kartica uz AMS obrazac: ne sužava sadržaj. Vidi je samo registrovan
          korisnik bez ijednog paketa i bez aktivne probe; gost je vidi na
          landingu, pretplatnicima i probama ne treba. */}
      {tab === "pregled" && <SoloBocno />}
      {tab === "uplate" && <FreelancerUplate />}
      {tab === "isplatioci" && <FreelancerIsplatioci />}
      {tab === "godisnji" && <FreelancerGodisnji />}
      {tab === "kalendar" && <FreelancerKalendar />}
      {tab === "postavke" && <FreelancerPostavke />}
      {tab === "uputstvo" && <FreelancerUputstvo />}
    </main>
  );
}
