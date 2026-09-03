"use client";

// Izvoz naloga mjeseca u datoteku za e-bankarstvo, iz PK Office obračuna
// plata. Isti server i isti nalozi kao na Poreznom (ObracunPlata), samo u
// PK Office stilu, da knjigovođa ne mora prelaziti na marketing dio.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "./Modal";
import { PkSelect } from "./PkSelect";
import { PkDateInput } from "./PkDateInput";
import {
  bankExport,
  type BankExportPreskocen,
  type BankExportRezultat,
} from "src/api/payroll";
import {
  IZVOZ_BANKE,
  IZVOZ_GRESKE,
  danasIsoLokalno,
  datotekaPadez,
  preuzmiIzvoz,
} from "src/lib/bankExport";
import { isoToDisplay, parseDateInput } from "src/lib/dateInput";
import { formatBAM } from "src/lib/format";

const MJESECI = [
  "januar", "februar", "mart", "april", "maj", "juni",
  "juli", "august", "septembar", "oktobar", "novembar", "decembar",
];

export function IzvozBankaModal({
  open,
  onClose,
  organizationId,
  year,
  month,
  zapamcenaBanka,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: number;
  year: number;
  month: number;
  /** Zadnji izbor banke na organizaciji (server ga pamti po uspjelom izvozu). */
  zapamcenaBanka?: string | null;
}) {
  const [banka, setBanka] = useState<string | null>(() =>
    zapamcenaBanka && IZVOZ_BANKE.some((b) => b.value === zapamcenaBanka)
      ? zapamcenaBanka
      : null,
  );
  // Uvijek današnji datum (odluka vlasnika): datum valute u prošlosti banka
  // odbija, a budući datum isplate zna biti stariji plan.
  const [datum, setDatum] = useState(() => isoToDisplay(danasIsoLokalno()));
  const [rezultat, setRezultat] = useState<BankExportRezultat | null>(null);
  const [preskoceni, setPreskoceni] = useState<BankExportPreskocen[]>([]);
  const qc = useQueryClient();

  const izvoz = useMutation({
    mutationFn: async () => {
      const b = IZVOZ_BANKE.find((x) => x.value === banka);
      if (!b) throw new Error("Izaberite banku.");
      const iso = parseDateInput(datum);
      if (!iso) throw new Error("Upišite datum valute.");
      const r = await bankExport({
        organizationId,
        year,
        month,
        datumValute: iso,
        profil: b.profil,
        banka: b.value,
      });
      if (!r.ok) {
        const pres = (r as { preskoceni?: BankExportPreskocen[] }).preskoceni;
        if (pres?.length) setPreskoceni(pres);
        throw new Error(IZVOZ_GRESKE[r.error] || r.error);
      }
      preuzmiIzvoz(r.data);
      return r.data;
    },
    onMutate: () => {
      setRezultat(null);
      setPreskoceni([]);
    },
    onSuccess: (data) => {
      setRezultat(data);
      setPreskoceni(data.preskoceni);
      // server je uz uspjeh zapamtio banku na obrtu: osvježi podatke obrta da
      // sljedeće otvaranje (npr. poslije promjene mjeseca) ponudi tu banku
      qc.invalidateQueries({ queryKey: ["pk-org", organizationId] });
    },
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!izvoz.isPending) onClose();
      }}
      title="Izvoz naloga za e-bankarstvo"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={izvoz.isPending}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-text-secondary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            Zatvori
          </button>
          <button
            type="button"
            onClick={() => izvoz.mutate()}
            disabled={izvoz.isPending || !banka}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {izvoz.isPending && <IconLoader2 size={15} className="animate-spin" />}
            {izvoz.isPending ? "Generišem..." : "Preuzmi datoteku"}
          </button>
        </>
      }
    >
      <p className="text-[13.5px] leading-6 text-text-secondary mb-4">
        Datoteka sa svim nalozima za {MJESECI[month - 1]} {year}: doprinosi,
        porez i isplate radnicima, isto kao na zbirnim uplatnicama. Uvezite je u
        svoje e-bankarstvo i samo potpišite naloge.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5">
            Banka (e-bankarstvo)
          </label>
          <PkSelect
            value={banka}
            onChange={(v) => setBanka(v == null ? null : String(v))}
            options={IZVOZ_BANKE.map((b) => ({ value: b.value, label: b.label }))}
            placeholder="Izaberite banku"
            ariaLabel="Banka za izvoz naloga"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5">
            Datum valute (datum plaćanja)
          </label>
          <PkDateInput
            value={datum}
            onChange={setDatum}
            ariaLabel="Datum valute"
            className="w-[160px]"
          />
        </div>
      </div>

      {izvoz.isError && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger-bg text-danger px-3.5 py-2.5 text-[13px] leading-5">
          {izvoz.error instanceof Error ? izvoz.error.message : "Greška pri generisanju datoteke."}
        </div>
      )}

      {rezultat && (
        <div className="mt-4 rounded-lg border border-success/30 bg-success-bg text-success px-3.5 py-2.5 text-[13px] leading-5">
          {rezultat.datoteke && rezultat.datoteke.length > 1 ? (
            <>
              Pokrenuto je preuzimanje {rezultat.datoteke.length}{" "}
              {datotekaPadez(rezultat.datoteke.length)} ({rezultat.meta.brojNaloga}{" "}
              naloga, ukupno {formatBAM(rezultat.meta.ukupnoKm)}). Ako preglednik pita za
              dozvolu preuzimanja više datoteka, potvrdite je. Svaku uvezite kao poseban
              paket:
              <ul className="mt-1 pl-4 list-disc">
                {rezultat.datoteke.map((d) => (
                  <li key={d.fileName}>
                    <strong>{d.fileName}</strong>
                    {d.naslov ? `: ${d.naslov}` : ""}, {d.brojNaloga}{" "}
                    {d.brojNaloga === 1 ? "nalog" : "naloga"}, {formatBAM(d.ukupnoKm)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              Datoteka <strong>{rezultat.fileName}</strong> je preuzeta:{" "}
              {rezultat.meta.brojNaloga} naloga, ukupno {formatBAM(rezultat.meta.ukupnoKm)}.
            </>
          )}
        </div>
      )}

      {preskoceni.length > 0 && (
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning-bg text-warning px-3.5 py-2.5 text-[13px] leading-5">
          <strong>Nisu u datoteci ({preskoceni.length}):</strong>
          <ul className="mt-1 mb-1 pl-4 list-disc">
            {preskoceni.map((p, i) => (
              <li key={i}>
                {p.stavka}, {formatBAM(p.iznosKm)}
                {p.radnik ? `, ${p.radnik}` : ""} ({p.razlog})
              </li>
            ))}
          </ul>
          Te iznose platite posebno ili dopunite podatke pa ponovite izvoz.
        </div>
      )}

      <div className="mt-4 rounded-lg bg-cream-50 border border-cream-300 px-3.5 py-3 text-[12.5px] leading-5 text-text-secondary">
        <strong className="text-text-primary">Kako radi</strong>
        <ol className="mt-1 mb-2 pl-4 list-decimal">
          <li>Izaberite banku i datum valute, pa preuzmite datoteku.</li>
          <li>U svom e-bankarstvu izaberite uvoz naloga iz datoteke i učitajte preuzeti fajl.</li>
          <li>Nalozi se pojave pripremljeni, ostaje samo da ih potpišete.</li>
        </ol>
        {banka === "raiffeisen" && (
          <p className="mb-2">
            <strong className="text-text-primary">Raiffeisen:</strong> izvoz se dijeli u više
            datoteka jer se u bankarstvu vrsta i svrha plaćanja biraju za cijeli paket.
            Datoteku <em>doprinosi</em> uvezite kao javne prihode, a ostale kao plaćanja na
            tekući račun sa svrhom: plate 511, topli obrok 518, prevoz 519, regres 110.
          </p>
        )}
        Ako uvoz u vaše bankarstvo ne radi ili vaše banke nema na listi, javite nam se na{" "}
        <a href="mailto:info@poreznikalkulator.ba" className="text-brand-600 font-medium">
          info@poreznikalkulator.ba
        </a>
        .
      </div>
    </Modal>
  );
}
