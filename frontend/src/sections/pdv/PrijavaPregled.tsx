"use client";

// Pregled PDV prijave na ekranu (raspored prati zvanični Obrazac P PDV):
// sve vrijednosti su obračunate iz KUF/KIF za izabrani mjesec, read-only.
// Ispod pregleda je dugme za preuzimanje pomoćnog PDF-a.
import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { fmtIznos, lastDayOfPeriod, type PdvPrijava } from "./pdvObracun";

function FieldRow({
  broj,
  label,
  value,
  bold = false,
}: {
  broj: string;
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 py-[7px] border-b border-cream-300/50 last:border-0">
      <span className="inline-flex items-center justify-center w-[30px] h-[22px] rounded border border-cream-300 bg-cream-50 text-[11.5px] font-semibold text-text-secondary shrink-0">
        {broj}
      </span>
      <span className="flex-1 text-[12.5px] leading-4 text-text-secondary">
        {label}
      </span>
      <span
        className={[
          "text-[13px] tabular-nums whitespace-nowrap",
          bold ? "font-semibold text-text-primary" : "text-text-primary",
        ].join(" ")}
      >
        {fmtIznos(value)}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-cream-100 border border-cream-300 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-cream-300 text-[11px] uppercase tracking-[0.06em] text-text-tertiary font-semibold">
        {title}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

export function PrijavaPregled({
  prijava,
  povrat,
  onPovratChange,
  onDownload,
  exporting,
}: {
  prijava: PdvPrijava;
  povrat: boolean;
  onPovratChange: (v: boolean) => void;
  onDownload: () => void;
  exporting: boolean;
}) {
  const p = prijava;
  const obaveza = p.p71 >= 0;
  return (
    <div className="flex flex-col gap-4">
      {/* Zaglavlje obrasca */}
      <div className="rounded-xl bg-cream-100 border border-cream-300 px-5 py-4 flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
            Poreski obveznik
          </div>
          <div className="text-[13.5px] font-medium text-text-primary">
            {p.org.naziv}
          </div>
          <div className="text-[12px] text-text-tertiary">
            {[p.org.adresa, p.org.mjesto].filter(Boolean).join(", ") || "–"}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
            Identifikacioni broj
          </div>
          <div className="text-[13.5px] font-medium text-text-primary tabular-nums">
            {p.org.pdvBroj || "nije upisan u profil"}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
            Period
          </div>
          <div className="text-[13.5px] font-medium text-text-primary">
            1.{p.month}.{p.year}. do {lastDayOfPeriod(p.month, p.year)}
          </div>
        </div>
      </div>

      {/* I. Isporuke i nabavke */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="I. Izlazi · isporuke bez PDV-a">
          <FieldRow
            broj="11"
            label="Isporuke (uklj. vanposlovne svrhe), osim polja 12 i 13"
            value={p.p11}
          />
          <FieldRow broj="12" label="Vrijednost izvoza" value={p.p12} />
          <FieldRow
            broj="13"
            label="Isporuke oslobođene plaćanja PDV-a"
            value={p.p13}
          />
        </SectionCard>
        <SectionCard title="I. Ulazi · nabavke bez PDV-a">
          <FieldRow
            broj="21"
            label="Sve nabavke, osim polja 22 i 23"
            value={p.p21}
          />
          <FieldRow broj="22" label="Vrijednost uvoza" value={p.p22} />
          <FieldRow
            broj="23"
            label="Nabavke od poljoprivrednika"
            value={p.p23}
          />
        </SectionCard>
      </div>

      {/* II. PDV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="II. Izlazni PDV">
          <FieldRow
            broj="51"
            label="PDV obračunat na izlaze (dobra i usluge)"
            value={p.p51}
            bold
          />
        </SectionCard>
        <SectionCard title="II. Ulazni PDV">
          <FieldRow
            broj="41"
            label="Od registrovanih obveznika, osim polja 42 i 43"
            value={p.p41}
          />
          <FieldRow broj="42" label="PDV na uvoz" value={p.p42} />
          <FieldRow
            broj="43"
            label="Paušalna naknada za poljoprivrednike"
            value={p.p43}
          />
          <FieldRow broj="61" label="Ulazni PDV (ukupno)" value={p.p61} bold />
        </SectionCard>
      </div>

      {/* 71 + 80 */}
      <div className="rounded-xl bg-cream-100 border border-cream-300 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-[34px] h-[26px] rounded border border-cream-300 bg-cream-50 text-[12.5px] font-semibold text-text-secondary">
            71
          </span>
          <div>
            <div className="text-[12px] text-text-tertiary">
              {obaveza
                ? "PDV za uplatu (razlika polja 51 i 61), rok do 10. u mjesecu"
                : "Porezni kredit / povrat (razlika polja 51 i 61)"}
            </div>
            <div
              className={[
                "font-serif-display text-[24px] leading-tight tabular-nums",
                obaveza ? "text-text-primary" : "text-success",
              ].join(" ")}
            >
              {fmtIznos(p.p71)} KM
            </div>
          </div>
        </div>
        <label
          className={[
            "inline-flex items-center gap-2 text-[13px]",
            obaveza
              ? "text-text-tertiary cursor-not-allowed"
              : "text-text-primary cursor-pointer",
          ].join(" ")}
        >
          <input
            type="checkbox"
            checked={povrat}
            disabled={obaveza}
            onChange={(e) => onPovratChange(e.target.checked)}
            className="accent-brand-600 w-4 h-4"
          />
          Zahtjev za povrat (polje 80)
        </label>
      </div>

      {/* III. Krajnja potrošnja */}
      <SectionCard title="III. Krajnja potrošnja · PDV na isporuke licima koja nisu registrovani PDV obveznici">
        <FieldRow broj="32" label="U Federaciji BiH" value={p.kp32} />
        <FieldRow broj="33" label="U Republici Srpskoj" value={p.kp33} />
        <FieldRow broj="34" label="U Brčko distriktu" value={p.kp34} />
      </SectionCard>

      {/* Preuzimanje + napomene */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={exporting}
          onClick={onDownload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {exporting ? (
            <IconLoader2 size={16} className="animate-spin" />
          ) : (
            <IconDownload size={16} />
          )}
          Preuzmi PDV prijavu (PDF)
        </button>
        <span className="text-[12px] text-text-tertiary">
          Vrijednosti sa obrasca unosite na{" "}
          <a
            href="https://e-porezi.uino.gov.ba:4443/Account/LogOn?ReturnUrl=%2f"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 font-medium underline underline-offset-2 hover:opacity-80"
          >
            e-porezi portal UINO
          </a>
          .
          {p.pdvNeodbitni > 0.005 &&
            ` Neodbitni ulazni PDV (nije u 41/61): ${fmtIznos(p.pdvNeodbitni)} KM.`}
        </span>
      </div>
    </div>
  );
}
