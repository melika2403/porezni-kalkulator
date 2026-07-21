"use client";

// D-PDV (Dodatak uz PDV prijavu): ručni unos stavki po periodu, čuva se u
// bazi po (org, godina, mjesec). Struktura stavki prati zvanični obrazac:
// isporuke/izlazi (10 stavki) i nabavke/ulazi (9 stavki + zalihe), sa
// kolonama "Bez PDV-a" i "PDV" tamo gdje obrazac to traži.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCircleCheck,
  IconDownload,
  IconLoader2,
  IconSparkles,
} from "@tabler/icons-react";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { formatKm, parseKm } from "src/lib/amountInput";
import { getPdvDodatak, upsertPdvDodatak, type PdvDodatak } from "src/api/pdv";
import { getLager } from "src/api/lager";
import { unwrap } from "src/api/auth";
import { downloadDpdvXls } from "./dpdvExcel";

export type DPdvOrgInfo = {
  naziv: string;
  pdvBroj: string;
  adresa: string;
  telefon: string;
  mjesto: string;
  odgovornoLice: string;
};

type Stavka = { key: string; label: string; bez: boolean; pdv: boolean };

const IZLAZI: Stavka[] = [
  { key: "iz1", label: "1. Prima van BiH", bez: true, pdv: false },
  { key: "iz2", label: "2. EUFOR/NATO", bez: true, pdv: false },
  { key: "iz3", label: "3. IPA fondovi", bez: true, pdv: false },
  { key: "iz4", label: "4. Povezane sa uvozom", bez: true, pdv: false },
  { key: "iz5", label: "5. Nije promet", bez: true, pdv: false },
  { key: "iz6", label: "6. Nepokretna imovina", bez: true, pdv: true },
  { key: "iz7", label: "7. Sjedište van BiH", bez: false, pdv: true },
  { key: "iz8", label: "8. SL-2 obrazac", bez: true, pdv: true },
  { key: "iz9", label: "9. Izdate KO kupca", bez: true, pdv: true },
  { key: "iz10", label: "10. Posebna shema", bez: false, pdv: true },
];

const ULAZI: Stavka[] = [
  { key: "ul1", label: "1. Nije promet", bez: true, pdv: false },
  { key: "ul2", label: "2. Nepokretna imovina", bez: true, pdv: true },
  { key: "ul3", label: "3. Oprema u BiH", bez: true, pdv: true },
  { key: "ul4", label: "4. Oprema uvoz", bez: true, pdv: true },
  { key: "ul5", label: "5. Proporcionalni odbitak", bez: true, pdv: true },
  { key: "ul6", label: "6. Usluge od inostranih lica", bez: true, pdv: true },
  { key: "ul7", label: "7. Posebna shema", bez: false, pdv: true },
  { key: "ul8", label: "8. Primljene KO", bez: true, pdv: true },
  { key: "ul9", label: "9. Ispravka odbitka", bez: false, pdv: true },
];

const ZALIHE_KEY = "zalihe_bez";

type Values = Record<string, string>;
type SetValue = (key: string, v: string) => void;

// Ćelije i paneli su na nivou modula (stabilan tip komponente) da se input
// ne remontira na svaki karakter (gubio bi fokus).
function AmountCell({
  k,
  values,
  onSet,
}: {
  k: string;
  values: Values;
  onSet: SetValue;
}) {
  return (
    <PkAmountInput
      value={values[k] ?? ""}
      onChange={(v) => onSet(k, v)}
      ariaLabel={k}
      className="bg-cream-50 text-right"
    />
  );
}

function Panel({
  title,
  stavke,
  zalihe = false,
  values,
  onSet,
}: {
  title: string;
  stavke: Stavka[];
  zalihe?: boolean;
  values: Values;
  onSet: SetValue;
}) {
  return (
    <div className="rounded-xl bg-cream-100 border border-cream-300 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-cream-300 text-[11px] uppercase tracking-[0.06em] text-text-tertiary font-semibold">
        {title}
      </div>
      <div className="px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_110px_110px] gap-x-2.5 gap-y-2 items-center">
          <span />
          <span className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary text-right">
            Bez PDV-a
          </span>
          <span className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary text-right">
            PDV
          </span>
          {stavke.map((s) => (
            <FragmentRow key={s.key} s={s} values={values} onSet={onSet} />
          ))}
          {zalihe && (
            <>
              <span className="text-[12.5px] text-text-secondary">
                Iznos zaliha bez PDV-a
              </span>
              <AmountCell k={ZALIHE_KEY} values={values} onSet={onSet} />
              <span />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  s,
  values,
  onSet,
}: {
  s: Stavka;
  values: Values;
  onSet: SetValue;
}) {
  return (
    <>
      <span className="text-[12.5px] text-text-secondary">{s.label}</span>
      {s.bez ? <AmountCell k={`${s.key}_bez`} values={values} onSet={onSet} /> : <span />}
      {s.pdv ? <AmountCell k={`${s.key}_pdv`} values={values} onSet={onSet} /> : <span />}
    </>
  );
}

export function DPdvForm({
  orgId,
  month,
  year,
  defaultDjelatnost,
  djelatnostNaziv,
  org,
  prijedlog,
}: {
  orgId: number | null;
  month: number;
  year: number;
  /** šifra pretežne djelatnosti iz profila obrta (default) */
  defaultDjelatnost: string;
  djelatnostNaziv: string;
  /** podaci obrta za zaglavlje zvaničnog obrasca */
  org: DPdvOrgInfo | null;
  /** predpopuna izvedena iz KUF/KIF za mjesec (KO, usluge iz inostranstva...) */
  prijedlog?: Record<string, number>;
}) {
  const { data, isSuccess } = useQuery({
    queryKey: ["pdv-dodatak", orgId, year, month],
    queryFn: () => unwrap(getPdvDodatak(orgId as number, year, month)),
    enabled: orgId != null,
  });

  if (orgId == null || !isSuccess) {
    return (
      <div className="rounded-xl bg-cream-100 border border-cream-300 px-4 py-12 text-center text-text-tertiary text-[13px]">
        Učitavanje...
      </div>
    );
  }
  return (
    <DPdvFormInner
      // remount po periodu: forma se čisto seeduje iz učitanog unosa
      key={`${orgId}:${year}:${month}`}
      orgId={orgId}
      month={month}
      year={year}
      initial={data ?? null}
      defaultDjelatnost={defaultDjelatnost}
      djelatnostNaziv={djelatnostNaziv}
      org={org}
      prijedlog={prijedlog}
    />
  );
}

function DPdvFormInner({
  orgId,
  month,
  year,
  initial,
  defaultDjelatnost,
  djelatnostNaziv,
  org,
  prijedlog,
}: {
  orgId: number;
  month: number;
  year: number;
  initial: PdvDodatak | null;
  defaultDjelatnost: string;
  djelatnostNaziv: string;
  org: DPdvOrgInfo | null;
  prijedlog?: Record<string, number>;
}) {
  const qc = useQueryClient();
  const [djelatnost, setDjelatnost] = useState(
    initial?.preteznaDjelatnost ?? defaultDjelatnost,
  );
  const [values, setValues] = useState<Values>(() => {
    const v: Values = {};
    for (const [key, num] of Object.entries(initial?.fields ?? {})) {
      if (Number.isFinite(num) && num !== 0) v[key] = formatKm(num);
    }
    return v;
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  function collectFields(): Record<string, number> {
    const fields: Record<string, number> = {};
    for (const [key, s] of Object.entries(values)) {
      const n = parseKm(s);
      if (n != null && n !== 0) fields[key] = n;
    }
    return fields;
  }

  const save = useMutation({
    mutationFn: () =>
      unwrap(
        upsertPdvDodatak(orgId, {
          year,
          month,
          preteznaDjelatnost: djelatnost.trim() || null,
          fields: collectFields(),
        }),
      ),
    onSuccess: () => {
      setSavedAt(Date.now());
      setError(null);
      qc.invalidateQueries({ queryKey: ["pdv-dodatak", orgId, year, month] });
    },
    onError: () => setError("Greška pri snimanju, pokušajte ponovo."),
  });

  function set(key: string, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
    setSavedAt(null);
  }

  // Predpopuna iz knjiga: KO izdate/primljene, usluge iz inostranstva,
  // posebna šema (iz KUF/KIF za mjesec) + zalihe bez PDV-a sa lager liste
  // na zadnji dan mjeseca (MPC / 1,17). Popunjeno se pregleda pa snima.
  const [predlazem, setPredlazem] = useState(false);
  const [prijedlogInfo, setPrijedlogInfo] = useState<string | null>(null);
  async function predloziIzKnjiga() {
    if (predlazem) return;
    setPredlazem(true);
    setPrijedlogInfo(null);
    try {
      const nova: Values = {};
      for (const [k, v] of Object.entries(prijedlog ?? {})) {
        if (v > 0) nova[k] = formatKm(v);
      }
      // zalihe: lager na zadnji dan mjeseca, MPC vrijednost bez 17% PDV-a
      const zadnjiDan = `${year}-${String(month).padStart(2, "0")}-${String(
        new Date(year, month, 0).getDate(),
      ).padStart(2, "0")}`;
      const lager = await getLager(orgId, zadnjiDan);
      if (lager.ok) {
        const mpcUkupno = lager.data.rows.reduce(
          (s, r) => s + (Number(r.vrijednost) || 0),
          0,
        );
        const bezPdv = Math.round((mpcUkupno / 1.17) * 100) / 100;
        if (bezPdv > 0) nova[ZALIHE_KEY] = formatKm(bezPdv);
      }
      const brojPolja = Object.keys(nova).length;
      if (brojPolja === 0) {
        setPrijedlogInfo(
          "Nema stavki za predložiti iz knjiga za ovaj mjesec.",
        );
        return;
      }
      setValues((s) => ({ ...s, ...nova }));
      setSavedAt(null);
      setPrijedlogInfo(
        `Popunjeno ${brojPolja} ${brojPolja === 1 ? "polje" : "polja"} iz knjiga${
          nova[ZALIHE_KEY] ? " (zalihe: lager bez 17% PDV-a)" : ""
        }. Pregledajte pa sačuvajte.`,
      );
    } finally {
      setPredlazem(false);
    }
  }

  // Preuzimanje popunjenog zvaničnog obrasca: prvo snimi unos, pa generiše
  // .xls iz predloška (preuzimanje ne blokira ako snimanje zakaže).
  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      await save.mutateAsync().catch(() => {});
      await downloadDpdvXls({
        naziv: org?.naziv ?? "",
        pdvBroj: org?.pdvBroj ?? "",
        adresa: org?.adresa ?? "",
        telefon: org?.telefon ?? "",
        mjesto: org?.mjesto ?? "",
        odgovornoLice: org?.odgovornoLice ?? "",
        // polje 6 = djelatnost riječima, polje 7 = šifra iz forme
        djelatnostNaziv,
        preteznaDjelatnost: djelatnost.trim(),
        month,
        year,
        fields: collectFields(),
      });
    } catch {
      setError("Greška pri generisanju obrasca, pokušajte ponovo.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-cream-100 border border-cream-300 px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Pretežna djelatnost
          </div>
          <div className="flex items-center gap-2">
            <input
              value={djelatnost}
              onChange={(e) => {
                setDjelatnost(e.target.value);
                setSavedAt(null);
              }}
              placeholder="npr. 49.41"
              className="w-[90px] rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
            />
            {djelatnost === defaultDjelatnost && djelatnostNaziv && (
              <span className="text-[12.5px] text-text-tertiary">
                {djelatnostNaziv}
              </span>
            )}
          </div>
        </div>
        <span className="text-[12.5px] text-text-tertiary ml-auto">
          period {String(month).padStart(2, "0")}/{year}. · unos se čuva po
          mjesecu
        </span>
        <button
          type="button"
          onClick={predloziIzKnjiga}
          disabled={predlazem}
          title="Popuni polja koja se daju izvesti: izdate/primljene knjižne obavijesti, usluge iz inostranstva (tip 05), posebna šema (tip 08) i zalihe sa lager liste (bez 17% PDV-a)"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
        >
          {predlazem ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : (
            <IconSparkles size={14} />
          )}
          Predloži iz knjiga
        </button>
        {prijedlogInfo && (
          <span className="w-full text-[12px] text-text-tertiary">
            {prijedlogInfo}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel
          title="Isporuke i PDV obračunat na izlaze"
          stavke={IZLAZI}
          values={values}
          onSet={set}
        />
        <Panel
          title="Nabavke i PDV obračunat na ulaze"
          stavke={ULAZI}
          zalihe
          values={values}
          onSet={set}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={save.isPending || downloading}
          onClick={() => save.mutate()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {save.isPending && <IconLoader2 size={16} className="animate-spin" />}
          Sačuvaj D-PDV
        </button>
        <button
          type="button"
          disabled={save.isPending || downloading}
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cream-300 bg-cream-100 text-text-primary text-[13px] font-medium hover:bg-cream-200 transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <IconLoader2 size={16} className="animate-spin" />
          ) : (
            <IconDownload size={16} />
          )}
          Preuzmi obrazac (.xls)
        </button>
        {savedAt && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-success">
            <IconCircleCheck size={15} /> Snimljeno
          </span>
        )}
        {error && (
          <span className="text-[12.5px] text-accent-500">{error}</span>
        )}
        <span className="text-[12px] text-text-tertiary">
          Preuzeti obrazac je zvanični UINO .xls, provjerite ga u Excelu pa
          pošaljite na e-mail nadležnog regionalnog centra.
        </span>
      </div>
    </div>
  );
}
