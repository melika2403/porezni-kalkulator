"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconUsers,
  IconStack2,
  IconCash,
  IconRoute,
  IconBuildingWarehouse,
  IconUserCheck,
  IconBriefcase,
} from "@tabler/icons-react";
import { Modal } from "./Modal";
import { usePkOfficeMe, usePkOfficePristup } from "src/hooks/usePkOfficeMe";
import { useUpdateOrganizationSettings } from "src/hooks/useOrganizationSettings";
import { SOLO_MODULI_PRAZNO, setPkOfficeTrialPlan, type SoloModuli } from "src/api/pkOffice";
import { unwrap } from "src/api/auth";
import { getWorkers } from "src/api/profile";
import { listArtikli, listKalkulacije } from "src/api/kalkulacije";
import { getBlagajna } from "src/api/blagajna";
import { listPutniNalozi } from "src/api/putniNalozi";
import { getAmortizacijaYears } from "src/api/amortizacija";

// PK Office Solo upitnik: dva pitanja koja svode meni na ono što obrtnik
// stvarno koristi. Otvara se sam za prvi obrt bez popunjenog upitnika (Solo
// paket ili već uključen Solo režim) i na /app/dashboard?solo=upitnik odmah
// poslije kreiranja obrta; kasnije se mijenja u Postavke > Način rada.
// Odgovori ne mijenjaju obračune, samo koji se ekrani vide.

const MODULI: {
  key: keyof SoloModuli;
  naslov: string;
  opis: string;
  icon: React.ComponentType<{ size?: number }>;
}[] = [
  { key: "radnici", naslov: "Radnici", opis: "Zaposlenici, plate, JS3100 prijave, MIP", icon: IconUsers },
  { key: "roba", naslov: "Roba i maloprodaja", opis: "Kalkulacije, lager lista, popis", icon: IconStack2 },
  { key: "blagajna", naslov: "Blagajna", opis: "Gotovinski nalozi i blagajnički dnevnik", icon: IconCash },
  { key: "putniNalozi", naslov: "Putni nalozi", opis: "Službena putovanja i dnevnice", icon: IconRoute },
  { key: "stalnaSredstva", naslov: "Stalna sredstva", opis: "Oprema, vozila, amortizacija", icon: IconBuildingWarehouse },
];

// Blagajna se čita kroz period; fiksne granice drže ključ upita stabilnim.
const BLAGAJNA_OD = "2000-01-01";
const BLAGAJNA_DO = "2999-12-31";

/**
 * Predoznaka modula iz onoga što obrt VEĆ ima u bazi. Bez nje upitnik kreće
 * sa svime isključenim, pa jedan klik na Sačuvaj izbaci iz menija zaposlenike,
 * blagajnu, robu, putne naloge i stalna sredstva i kad su puni podataka.
 * Zahtjevi idu samo dok je `aktivno` (upitnik otvoren bez ranijih odgovora).
 */
function useModuliIzPodataka(orgId: number | null, aktivno: boolean) {
  const enabled = aktivno && orgId != null;

  // ključevi su isti kao na stranicama koje te liste ionako koriste, pa se
  // rezultat dijeli umjesto da se isto dohvata dva puta
  const radnici = useQuery({
    queryKey: ["pk-workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId as number)),
    enabled,
  });
  const artikli = useQuery({
    queryKey: ["artikli", orgId],
    queryFn: () => unwrap(listArtikli(orgId as number)),
    enabled,
  });
  const kalkulacije = useQuery({
    queryKey: ["kalkulacije", orgId, "sve"],
    queryFn: () => unwrap(listKalkulacije(orgId as number)),
    enabled,
  });
  const blagajna = useQuery({
    queryKey: ["blagajna", orgId, BLAGAJNA_OD, BLAGAJNA_DO],
    queryFn: () => unwrap(getBlagajna(orgId as number, BLAGAJNA_OD, BLAGAJNA_DO)),
    enabled,
  });
  const putni = useQuery({
    queryKey: ["putni-nalozi", orgId, "sve"],
    queryFn: () => unwrap(listPutniNalozi(orgId as number)),
    enabled,
  });
  const stalna = useQuery({
    queryKey: ["amortizacija-godine", orgId],
    queryFn: () => unwrap(getAmortizacijaYears(orgId as number)),
    enabled,
  });

  // upit koji padne ostavlja svoj modul isključen, ali ne blokira upitnik
  const spremno =
    enabled &&
    [radnici, artikli, kalkulacije, blagajna, putni, stalna].every(
      (q) => !q.isPending,
    );

  const moduli = useMemo<SoloModuli>(
    () => ({
      // Vlasnik obrta je uvijek zapis radnika (snapshot iz profila), pa se
      // broje samo stvarni zaposlenici. Inače bi svaki novi Solo obrt dobio
      // modul Radnici upaljen iako obrtnik radi sam.
      radnici: (radnici.data ?? []).some((w) => w.role !== "VLASNIK"),
      roba:
        (artikli.data ?? []).length > 0 || (kalkulacije.data ?? []).length > 0,
      blagajna: (blagajna.data?.nalozi ?? []).length > 0,
      putniNalozi: (putni.data ?? []).length > 0,
      stalnaSredstva: (stalna.data ?? []).length > 0,
    }),
    [radnici.data, artikli.data, kalkulacije.data, blagajna.data, putni.data, stalna.data],
  );

  return { moduli, spremno };
}

export function SoloUpitnik() {
  const { data: me } = usePkOfficeMe();
  const { data: pristup } = usePkOfficePristup();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() || "";
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const update = useUpdateOrganizationSettings(activeOrg?.id ?? 0);

  const [rijesenoZa, setRijesenoZa] = useState<number | null>(null);
  const [vodiSam, setVodiSam] = useState(true);
  const [moduli, setModuli] = useState<SoloModuli>(SOLO_MODULI_PRAZNO);
  const [rucnoMijenjano, setRucnoMijenjano] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);
  const zatvoriTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const forsirano = sp.get("solo") === "upitnik";
  // odgovori još nisu dati (soloModuli je null)
  const bezOdgovora = !!activeOrg && activeOrg.soloModuli == null;
  // korisnik na probi sa tačno jednim vlastitim obrtom: pitanje "ko vodi
  // knjige" mu odmah daje Solo meni ako radi sam, a proba se prebaci na Solo
  const vlastitihObrta = (me?.organizations ?? []).filter((o) => !o.isClientOrg).length;
  const probaJedanObrt =
    !!pristup?.trial && vlastitihObrta === 1 && (me?.organizations ?? []).length === 1;
  // automatski: Solo paket, već uključen Solo režim (npr. admin ga uključio)
  // ili proba sa jednim obrtom
  const automatski =
    bezOdgovora &&
    (pristup?.plan === "office_1" || !!activeOrg?.soloMode || probaJedanObrt);
  // režim obrta mijenjaju samo vlasnik i administrator; ostalima bi snimanje
  // pucalo (404 sa servera) pa bi ostali zaključani iza modala
  const smijeMijenjati =
    activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN";
  // isti uslovi pod kojima AppShell umjesto sadržaja prikazuje upsell ili
  // ekran za prekoračenje: upitnik ne smije iskakati preko njih
  const zakljucano = Boolean(pristup?.enforced && !pristup.hasOffice);
  const prekoLimita = Boolean(
    pristup?.enforced && pristup.hasOffice && pristup.prekoLimita,
  );
  const open =
    !!activeOrg &&
    // klijentski obrt vodi knjigovođa, Solo režim se na njega ne odnosi
    // (vrijedi i za prisilno otvaranje preko ?solo=upitnik)
    !activeOrg.isClientOrg &&
    smijeMijenjati &&
    !zakljucano &&
    !prekoLimita &&
    (forsirano || automatski) &&
    rijesenoZa !== activeOrg.id;

  // predoznaka se dohvata samo kad upitnik zaista ide bez ranijih odgovora
  const trebaPredoznaka = open && bezOdgovora;
  const { moduli: predlozeni, spremno: predoznakaSpremna } = useModuliIzPodataka(
    activeOrg?.id ?? null,
    trebaPredoznaka,
  );

  useEffect(() => {
    if (!activeOrg) return;
    // prvi put (bez odgovora) podrazumijeva se Solo: upitnik se i otvara samo na
    // Solo putanjama (paket Solo, ulaz bez obrta); kasnije odražava trenutni režim
    setVodiSam(activeOrg.soloModuli == null ? true : !!activeOrg.soloMode);
    setModuli({ ...SOLO_MODULI_PRAZNO, ...(activeOrg.soloModuli ?? {}) });
    setRucnoMijenjano(false);
  }, [activeOrg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      if (zatvoriTimer.current) clearTimeout(zatvoriTimer.current);
    },
    [],
  );

  if (!activeOrg) return null;

  // zatvaranje bez upisa: X, Escape, klik na pozadinu i Preskoči samo sklone
  // upitnik za ovu sesiju, odgovori ostaju nepopunjeni
  const zatvori = () => {
    if (zatvoriTimer.current) {
      clearTimeout(zatvoriTimer.current);
      zatvoriTimer.current = null;
    }
    setGreska(null);
    setRijesenoZa(activeOrg.id);
    if (forsirano) router.replace(pathname);
  };

  const snimi = async (soloMode: boolean, m: SoloModuli) => {
    setGreska(null);
    try {
      await update.mutateAsync({ soloMode, soloModuli: m });
      // Na probi odgovor određuje i nivo probe: "vodim sam" jedan obrt je Solo
      // proba, "knjigovođa" vraća opštu (Tim). Ne smije oboriti snimanje.
      if (pristup?.trial && (me?.organizations ?? []).length <= 1) {
        await setPkOfficeTrialPlan(soloMode ? "office_1" : null).catch(() => null);
      }
      await qc.invalidateQueries({ queryKey: ["pk-office"] });
      zatvori();
    } catch (e) {
      // upitnik ne smije zaključati aplikaciju: i kad snimanje padne (pukla
      // mreža, server odbio izmjenu) modal se sam sklanja poslije poruke
      const kod = e instanceof Error && e.message ? ` (${e.message})` : "";
      setGreska(
        `Snimanje nije uspjelo${kod}. Način rada ostaje nepromijenjen, mijenja se u Postavke obrta, Način rada.`,
      );
      zatvoriTimer.current = setTimeout(zatvori, 2500);
    }
  };

  const cekaPredoznaku = trebaPredoznaka && !predoznakaSpremna;
  // Kvačice: dok odgovora nema a korisnik nije ništa dirao vrijedi predoznaka
  // iz podataka obrta; od prve izmjene vrijedi ono što je korisnik označio.
  const prikazaniModuli =
    !rucnoMijenjano && trebaPredoznaka && predoznakaSpremna ? predlozeni : moduli;

  return (
    <Modal
      open={open}
      onClose={zatvori}
      title={`Kako vodite ${activeOrg.name}?`}
      maxWidthClass="max-w-[640px]"
      footer={
        <>
          <button
            type="button"
            onClick={zatvori}
            className="px-4 py-2 rounded-lg border border-cream-300 bg-cream-100 text-[13px] font-medium text-text-secondary hover:bg-cream-200 transition-colors"
          >
            Preskoči
          </button>
          <button
            type="button"
            onClick={() => void snimi(vodiSam, prikazaniModuli)}
            disabled={update.isPending || cekaPredoznaku}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {update.isPending ? "Snimam..." : "Sačuvaj"}
          </button>
        </>
      }
    >
      <p className="text-[13.5px] leading-6 text-text-secondary mb-4">
        Odgovori sužavaju meni na ono što stvarno koristite. Obračuni su isti kao
        u punom PK Office-u, a sve se kasnije mijenja u Postavke obrta, Način rada.
      </p>

      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2">
        Ko vodi knjige?
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
        {[
          { v: true, naslov: "Vodim ih sam", opis: "Solo režim: jednostavan meni i mjesečna lista obaveza", icon: IconUserCheck },
          { v: false, naslov: "Vodi ih knjigovođa", opis: "Puni PK Office meni sa svim modulima", icon: IconBriefcase },
        ].map((o) => {
          const Icon = o.icon;
          const aktivno = vodiSam === o.v;
          return (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setVodiSam(o.v)}
              aria-pressed={aktivno}
              className={[
                "text-left rounded-xl border px-4 py-3 transition-colors",
                aktivno
                  ? "border-brand-600 bg-brand-100"
                  : "border-cream-300 bg-cream-100 hover:bg-cream-200",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-text-primary">
                <Icon size={17} />
                {o.naslov}
              </span>
              <span className="block text-[12px] text-text-tertiary mt-1">{o.opis}</span>
            </button>
          );
        })}
      </div>

      {vodiSam && (
        <>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2">
            Šta koristite u obrtu? (označite samo što treba)
          </div>
          {cekaPredoznaku && (
            <p className="text-[12px] text-text-tertiary mb-2">
              Provjeravamo šta obrt već koristi, pa se kvačice same označe...
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODULI.map((m) => {
              const Icon = m.icon;
              const on = prikazaniModuli[m.key];
              return (
                <label
                  key={m.key}
                  className={[
                    "flex items-start gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors",
                    on ? "border-brand-600 bg-brand-100" : "border-cream-300 bg-cream-100 hover:bg-cream-200",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    className="mt-1 accent-brand-600"
                    checked={on}
                    onChange={(e) => {
                      const cekirano = e.target.checked;
                      setRucnoMijenjano(true);
                      setModuli({ ...prikazaniModuli, [m.key]: cekirano });
                    }}
                  />
                  <span>
                    <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-text-primary">
                      <Icon size={16} />
                      {m.naslov}
                    </span>
                    <span className="block text-[12px] text-text-tertiary mt-0.5">{m.opis}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-[12px] text-text-tertiary mt-3">
            PDV: {activeOrg.isPdvObveznik ? "obveznik, PDV evidencije su u meniju" : "niste obveznik"}.
            Mijenja se u Postavke obrta, Profil obrta.
          </p>
        </>
      )}

      {greska && <p className="text-[12.5px] text-danger mt-3">{greska}</p>}
    </Modal>
  );
}
