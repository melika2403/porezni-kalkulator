"use client";

// Upsell stranica za korisnike BEZ Office paketa kad je naplata uključena
// (PK_OFFICE_NAPLATA): umjesto app sadržaja, pitch + mini cjenovnik + trial.
// Personalizuje se po broju organizacija (PRO/BUSINESS knjigovođama naglasi
// da su im klijenti već tu i da nema migracije).
import { useState } from "react";
import {
  IconArrowRight,
  IconArrowsExchange,
  IconBell,
  IconBuildingBank,
  IconBriefcase,
  IconCircleCheck,
  IconCoins,
  IconFileInvoice,
  IconFileText,
  IconInbox,
  IconLoader2,
  IconPackage,
  IconReceiptTax,
  IconTransfer,
  IconUsers,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePkOfficeMe, usePkOfficePristup } from "src/hooks/usePkOfficeMe";
import { startPkOfficeTrial } from "src/api/pkOffice";
import { unwrap } from "src/api/auth";
import { OFFICE_PLANS, PLAN_PRICING, formatKm } from "src/data/pricing";
import { MARKETING_URL } from "src/lib/pkOfficeUrl";

const HERO = [
  {
    icon: IconInbox,
    title: "Grupni uvoz izvoda za sve obrte",
    desc: "Ubaci PDF izvode svih obrta odjednom: svaki se sam prepozna po žiro računu i rasporedi na svoj obrt.",
  },
  {
    icon: IconArrowsExchange,
    title: "Automatsko knjiženje",
    desc: "Transakcije se same kategorišu i vežu za partnere; KPR, KUF i KIF se pune sami, ti samo potvrdiš.",
  },
  {
    icon: IconCoins,
    title: "Plate i MIP",
    desc: "Obračuni, listići, uplatnice i MIP-1023 XML na par klikova.",
  },
  {
    icon: IconReceiptTax,
    title: "PDV komplet",
    desc: "KUF/KIF, PDV prijava, e-KUF/e-KIF CSV i D-PDV obrazac.",
  },
];

// Ostatak kataloga (sve je u svakom paketu); iste formulacije kao cjenovnik
const MORE = [
  {
    icon: IconFileText,
    title: "KPR i porezni obrasci",
    desc: "KPR se vodi sam, a SPR, GPD, ČOK i ONŠ se pripreme iz knjiga sa podacima za uplatu.",
  },
  {
    icon: IconFileInvoice,
    title: "Fakture i partneri",
    desc: "Izdavanje faktura, kartice kupaca i dobavljača, kompenzacije i cesije.",
  },
  {
    icon: IconPackage,
    title: "Roba i maloprodaja",
    desc: "Kalkulacije (KCM), lager lista, popis, nivelacije i trgovačka knjiga na malo.",
  },
  {
    icon: IconBuildingBank,
    title: "Blagajna i putni nalozi",
    desc: "Blagajnički nalozi i dnevnik po uredbi, putni nalozi sa dnevnicama.",
  },
  {
    icon: IconUsers,
    title: "Radnici i evidencije",
    desc: "Karton radnika po mjesecima, matična evidencija i spisak radnika u PDF/CSV.",
  },
  {
    icon: IconBriefcase,
    title: "Business funkcije uključene",
    desc: "Ugovori, rješenja, radnici i tim; od paketa Tim neograničeni klijenti.",
  },
  {
    icon: IconTransfer,
    title: "Migracija iz starog programa",
    desc: "Besplatan uvoz artikala, partnera i izvoda, bez ponovnog kucanja šifarnika.",
  },
  {
    icon: IconBell,
    title: "Rokovi i podsjetnici",
    desc: "Automatski podsjetnici za plate, PDV, godišnje obaveze i pretplatu.",
  },
];

export function PkOfficeUpsell() {
  const { data: me } = usePkOfficeMe();
  const { data: pristup } = usePkOfficePristup();
  const qc = useQueryClient();
  const [trialBusy, setTrialBusy] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);

  const orgCount = me?.organizations?.length ?? 0;
  const trialIskoristen = Boolean(pristup?.trialIskoristen);

  async function pokreniTrial() {
    if (trialBusy) return;
    setTrialBusy(true);
    setTrialError(null);
    try {
      await unwrap(startPkOfficeTrial());
      // pristup se mijenja → app se otvara
      await qc.invalidateQueries({ queryKey: ["pk-office", "pristup"] });
    } catch (e) {
      setTrialError(
        e instanceof Error && e.message === "TRIAL_ALREADY_USED"
          ? "Probni period je već iskorišten. Izaberi paket na cjenovniku."
          : "Greška pri aktivaciji probe, pokušaj ponovo.",
      );
      setTrialBusy(false);
    }
  }

  return (
    <div className="px-6 py-10 max-w-[880px] mx-auto">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-[7px] px-[13px] py-1.5 rounded-full bg-accent-500 text-white text-[12px] font-semibold uppercase tracking-[0.06em] mb-4">
          <span className="w-[6px] h-[6px] rounded-full bg-white" />
          PK Office
        </span>
        <h1 className="font-serif-display text-[clamp(1.8rem,3.4vw,2.5rem)] leading-[1.1] text-text-primary mb-3">
          Kompletno knjigovodstvo tvojih obrta.
        </h1>
        <p className="text-[14.5px] leading-6 text-text-secondary max-w-[560px] mx-auto">
          {orgCount > 0 ? (
            <>
              Već vodiš{" "}
              <strong>
                {orgCount} {orgCount === 1 ? "organizaciju" : "organizacija"}
              </strong>{" "}
              na Poreznom Kalkulatoru. Aktiviraj ih u PK Office jednim klikom:
              radnici, fakture i obrasci su već tu, nema nikakve migracije.
            </>
          ) : (
            <>
              Izvodi, knjiženje, plate, PDV, roba i blagajna na jednom mjestu.
              Besplatna migracija podataka iz starog programa.
            </>
          )}
        </p>
      </div>

      {/* CTA: trial ili cjenovnik */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
        {!trialIskoristen && (
          <button
            type="button"
            disabled={trialBusy}
            onClick={pokreniTrial}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {trialBusy ? (
              <IconLoader2 size={17} className="animate-spin" />
            ) : (
              <IconCircleCheck size={17} />
            )}
            Probaj 30 dana besplatno
          </button>
        )}
        <a
          href={`${MARKETING_URL}/pretplate#pk-office`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-cream-300 bg-cream-100 text-text-primary text-[14px] font-semibold hover:bg-cream-200 transition-colors"
        >
          Pogledaj cjenovnik
          <IconArrowRight size={16} />
        </a>
      </div>
      <p className="text-center text-[12px] text-text-tertiary mb-8">
        {trialIskoristen
          ? "Probni period je iskorišten. Paketi kreću od 20 KM mjesečno + PDV."
          : "Bez kartice i bez obaveze. Proba je na nivou paketa Office Tim (do 10 obrta)."}
      </p>
      {trialError && (
        <p className="text-center text-[12.5px] text-accent-500 mb-6">
          {trialError}
        </p>
      )}

      {/* udarne funkcije */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {HERO.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-xl border border-cream-300 bg-cream-100 px-4 py-3.5 transition-colors hover:border-brand-600/30"
            >
              <span className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 inline-flex items-center justify-center shrink-0">
                <Icon size={20} />
              </span>
              <div>
                <div className="text-[13.5px] font-semibold text-text-primary mb-0.5">
                  {f.title}
                </div>
                <p className="text-[12.5px] leading-5 text-text-tertiary">
                  {f.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ostatak kataloga: sve u svakom paketu */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-cream-300" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            I sve ostalo, u svakom paketu
          </span>
          <div className="h-px flex-1 bg-cream-300" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MORE.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="flex items-start gap-3 rounded-xl border border-cream-300 bg-cream-100 px-4 py-3.5 transition-colors hover:border-brand-600/30"
              >
                <span className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 inline-flex items-center justify-center shrink-0">
                  <Icon size={20} />
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold text-text-primary mb-0.5">
                    {f.title}
                  </div>
                  <p className="text-[12.5px] leading-5 text-text-tertiary">
                    {f.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* mini cjenovnik: tamnozelene kartice, iste boje kao na cjenovniku */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {OFFICE_PLANS.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-[#14241b] bg-[#14241b] px-4 py-4 text-center"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#e08a52] mb-0.5">
              {p.naziv}
            </div>
            <div className="text-[11.5px] text-white/70 mb-1.5">
              do {p.maxObrta} obrta
            </div>
            <div className="font-serif-display text-[22px] leading-none text-white">
              {formatKm(PLAN_PRICING[p.id].monthly)} KM
            </div>
            <div className="text-[11px] text-white/55 mt-1">mjesečno + PDV</div>
          </div>
        ))}
      </div>
      <p className="text-center text-[12px] text-text-tertiary">
        Svaki paket uključuje sve PK Office funkcije; paketi Tim i veći i
        kompletan Business bez ograničenja. Godišnje plaćanje: 2 mjeseca
        besplatno.
      </p>
    </div>
  );
}
