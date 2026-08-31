"use client";

// Obrazac ČOK (članarina obrtničkoj komori): osnovica NIJE promet nego
// osnovica za obračun doprinosa vlasnika (r.br. 10 obrasca 2002) x broj
// mjeseci, stopa 0,50%. Default se vuče iz vlasnikovih obračuna doprinosa,
// fallback je režimska osnovica; sve editabilno. Spremanje + PDF.
import { useState } from "react";
import { useUplatniRacuni } from "src/data/uplatniRacuniLive";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import {
  getOrganization,
  getWorkers,
  type Organization,
} from "src/api/profile";
import { listWorkerPayrolls } from "src/api/payroll";
import { getDocument, saveDocument } from "src/api/documents";
import { getOsnovica } from "src/utils/obrtniciFbih";
import { formatBAM } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import { buildCokPdf, type CokData } from "./cokPdf";
import {
  COK_VRSTA_PRIHODA,
  KANTON_OPTIONS,
  KOMORA_RACUNI,
  POREZNI_UREDI,
  kantonGenitiv,
  kantonZaGrad,
  komoraNaziv,
  type KantonKey,
} from "./kantonalni";

const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Spremljeni podaci obrasca (CokData + meta za prikaz na stranici). */
export type CokSaved = CokData & { kanton: KantonKey | null };

function triggerDownload(bytes: Uint8Array, filename: string) {
  const buf: ArrayBuffer =
    bytes.buffer instanceof ArrayBuffer
      ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      : Uint8Array.from(bytes).buffer;
  const url = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CokModal({
  orgId,
  year,
  savedFormId,
  onClose,
}: {
  orgId: number;
  year: number;
  /** id spremljenog ČOK obrasca za godinu: modal nastavlja od njega
   *  (upis uplate ne kreće od nule) */
  savedFormId?: number | null;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ["cok-prefill", orgId, year, savedFormId ?? 0],
    queryFn: async () => {
      const [orgRes, workersRes, savedRes] = await Promise.all([
        getOrganization(orgId),
        getWorkers(orgId),
        savedFormId ? getDocument<CokSaved>(savedFormId) : null,
      ]);
      if (!orgRes.ok) throw new Error(orgRes.error);
      const vlasnik = workersRes.ok
        ? (workersRes.data.find((w) => w.role === "VLASNIK") ?? null)
        : null;
      // stvarni vlasnikovi obračuni doprinosa (2002): najtačnija osnovica
      let mjesecna = 0;
      let mjeseci = 0;
      if (vlasnik) {
        const pRes = await listWorkerPayrolls(orgId, year, vlasnik.id);
        if (pRes.ok && pRes.data.length > 0) {
          mjeseci = pRes.data.length;
          // najčešći mjesečni bruto (pro-rate mjeseci ne kvare tipičan iznos)
          const counts = new Map<number, number>();
          for (const p of pRes.data) {
            counts.set(p.gross, (counts.get(p.gross) ?? 0) + 1);
          }
          mjesecna = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        }
      }
      if (!mjesecna) {
        // fallback: režimska osnovica za godinu
        try {
          if (orgRes.data.taxRegime) {
            mjesecna = getOsnovica(
              year,
              orgRes.data.taxRegime,
              orgRes.data.taxCategory ?? undefined,
            );
          }
        } catch {
          mjesecna = 0;
        }
      }
      return {
        org: orgRes.data,
        obrtnik: vlasnik
          ? `${vlasnik.firstName} ${vlasnik.lastName}`.trim()
          : "",
        mjesecna,
        mjeseci: mjeseci || 12,
        saved: savedRes?.ok ? (savedRes.data.data ?? null) : null,
      };
    },
  });

  return q.data ? (
    <CokModalBody
      orgId={orgId}
      year={year}
      org={q.data.org}
      obrtnikDefault={q.data.obrtnik}
      mjesecnaDefault={q.data.mjesecna}
      mjeseciDefault={q.data.mjeseci}
      saved={q.data.saved}
      onClose={onClose}
    />
  ) : (
    <Modal open onClose={onClose} title={`Obrazac ČOK za ${year}.`}>
      <p className="text-[13px] text-text-tertiary">
        {q.isError
          ? "Podaci se ne mogu učitati. Pokušajte ponovo."
          : "Povlačim osnovicu doprinosa vlasnika..."}
      </p>
    </Modal>
  );
}

function CokModalBody({
  orgId,
  year,
  org,
  obrtnikDefault,
  mjesecnaDefault,
  mjeseciDefault,
  saved,
  onClose,
}: {
  orgId: number;
  year: number;
  org: Organization;
  obrtnikDefault: string;
  mjesecnaDefault: number;
  mjeseciDefault: number;
  /** prethodno spremljen obračun: nastavlja se od njegovih vrijednosti */
  saved: CokSaved | null;
  onClose: () => void;
}) {
  // Živi uplatni računi (komora/kantonalni budžet iz admin šifarnika)
  useUplatniRacuni();
  const qc = useQueryClient();
  const ownerName =
    obrtnikDefault ||
    org.owner?.name ||
    [org.owner?.firstName, org.owner?.lastName].filter(Boolean).join(" ") ||
    "";

  const [kanton, setKanton] = useState<KantonKey | null>(
    saved?.kanton ?? kantonZaGrad(org.city),
  );
  const [ispostava, setIspostava] = useState(
    saved?.ispostava || (org.city ?? ""),
  );
  const [obrtnik, setObrtnik] = useState(saved?.obrtnik || ownerName);
  const [mjesecnaS, setMjesecnaS] = useState(
    saved
      ? formatKm(saved.mjesecnaOsnovica)
      : mjesecnaDefault > 0
        ? formatKm(mjesecnaDefault)
        : "",
  );
  const [mjeseciS, setMjeseciS] = useState(
    saved ? String(saved.mjeseci) : String(mjeseciDefault),
  );
  const [stopaS, setStopaS] = useState(
    saved ? formatKm(saved.stopa) : "0,50",
  );
  const [uplacenoS, setUplacenoS] = useState(
    saved && saved.uplaceno > 0 ? formatKm(saved.uplaceno) : "",
  );
  const [clanUdruzenja, setClanUdruzenja] = useState(
    saved?.clanUdruzenja ?? false,
  );
  const [nazivUdruzenja, setNazivUdruzenja] = useState(
    saved?.nazivUdruzenja ?? "",
  );
  const [spremljeno, setSpremljeno] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mjesecna = parseKm(mjesecnaS) ?? 0;
  const mjeseci = Math.max(0, Math.min(12, Number(mjeseciS) || 0));
  const ukupno = r2(mjesecna * mjeseci);
  const stopa = parseKm(stopaS) ?? 0;
  const clanarina = r2((ukupno * stopa) / 100);
  const uplaceno = parseKm(uplacenoS) ?? 0;
  const razlika = r2(clanarina - uplaceno);

  function buildData(): CokSaved {
    const danas = new Date();
    const dd = String(danas.getDate()).padStart(2, "0");
    const mm = String(danas.getMonth() + 1).padStart(2, "0");
    return {
      godina: year,
      uredGrad: kanton ? POREZNI_UREDI[kanton] : "",
      kantonGenitiv: kanton ? kantonGenitiv(kanton) : "",
      ispostava: ispostava.trim(),
      jib: (org.taxNumber ?? "").replace(/\D/g, ""),
      obrtnik: obrtnik.trim(),
      nazivObrta: org.name,
      sjediste: [org.address, org.city].filter(Boolean).join(", "),
      clanUdruzenja,
      nazivUdruzenja: nazivUdruzenja.trim(),
      mjesecnaOsnovica: mjesecna,
      mjeseci,
      ukupno,
      stopa,
      clanarina,
      uplaceno,
      razlika,
      datum: `${dd}.${mm}.${danas.getFullYear()}.`,
      kanton,
    };
  }

  const saveMut = useMutation({
    mutationFn: async (withPdf: boolean) => {
      setError(null);
      if (!kanton) throw new Error("izaberite kanton");
      const data = buildData();
      if (withPdf) {
        const bytes = await buildCokPdf(data);
        triggerDownload(bytes, `COK_${year}_${org.name}.pdf`);
      }
      const res = await saveDocument({
        type: "COK",
        year,
        title: `ČOK za ${year}. (${org.name})`,
        data,
        organizationId: orgId,
      });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      setSpremljeno(true);
      qc.invalidateQueries({ queryKey: ["obrasci-forms"] });
    },
    onError: (e: Error) =>
      setError(`Greška pri spremanju (${e.message}). Pokušajte ponovo.`),
  });

  const komoraRacun = kanton ? (KOMORA_RACUNI[kanton] ?? null) : null;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Obrazac ČOK (članarina komori) za ${year}.`}
      maxWidthClass="max-w-[720px]"
    >
      <div className="space-y-4">
        <p className="text-[12.5px] text-text-tertiary leading-5">
          Godišnji pregled članarine obrtničkoj komori kantona. Osnovica je
          osnovica za obračun doprinosa vlasnika (r.br. 10 obrasca 2002) x
          broj mjeseci; povučena je iz obračuna doprinosa, sve se može
          ispraviti.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Kanton (ured i komora)</label>
            <PkSelect
              ariaLabel="Kanton"
              value={kanton ?? ""}
              onChange={(v) => setKanton((v as KantonKey) || null)}
              options={[
                { value: "", label: "Izaberi kanton" },
                ...KANTON_OPTIONS,
              ]}
              wrapStyle={{ width: "100%" }}
            />
          </div>
          <div>
            <label className={labelCls}>Ispostava</label>
            <input
              value={ispostava}
              onChange={(e) => setIspostava(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Obrtnik (prezime i ime)</label>
            <input
              value={obrtnik}
              onChange={(e) => setObrtnik(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label
              className={labelCls}
              title="Osnovica za obračun doprinosa vlasnika (r.br. 10 obrasca 2002)"
            >
              Mjesečna osnovica
            </label>
            <PkAmountInput
              value={mjesecnaS}
              onChange={setMjesecnaS}
              ariaLabel="Mjesečna osnovica"
              className="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Broj mjeseci</label>
            <input
              value={mjeseciS}
              onChange={(e) =>
                setMjeseciS(e.target.value.replace(/\D/g, "").slice(0, 2))
              }
              inputMode="numeric"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Stopa (%)</label>
            <PkAmountInput
              value={stopaS}
              onChange={setStopaS}
              ariaLabel="Stopa članarine"
              className="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Uplaćeno u periodu</label>
            <PkAmountInput
              value={uplacenoS}
              onChange={setUplacenoS}
              placeholder="0,00"
              ariaLabel="Uplaćeno"
              className="bg-cream-50"
            />
          </div>
          <div className="col-span-2 flex items-end pb-1">
            <label className="flex items-center gap-2 text-[12.5px] text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={clanUdruzenja}
                onChange={(e) => setClanUdruzenja(e.target.checked)}
                className="accent-brand-600"
              />
              Obrtnik je član strukovnog/općeg udruženja
            </label>
          </div>
          {clanUdruzenja && (
            <div className="col-span-2">
              <label className={labelCls}>Naziv udruženja</label>
              <input
                value={nazivUdruzenja}
                onChange={(e) => setNazivUdruzenja(e.target.value)}
                className={inputCls}
              />
            </div>
          )}
        </div>

        {/* obračun */}
        <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 flex flex-wrap items-end gap-x-8 gap-y-2">
          <div>
            <div className={labelCls}>Osnovica ukupno</div>
            <div className="text-[15px] tabular-nums text-text-primary">
              {formatKm(mjesecna)} x {mjeseci} = {formatBAM(ukupno)}
            </div>
          </div>
          <div>
            <div className={labelCls}>Članarina ({formatKm(stopa)}%)</div>
            <div className="text-[15px] font-semibold tabular-nums text-text-primary">
              {formatBAM(clanarina)}
            </div>
          </div>
          <div>
            <div className={labelCls}>Za uplatu</div>
            <div
              className={`text-[15px] font-semibold tabular-nums ${razlika > 0 ? "text-accent-500" : "text-success"}`}
            >
              {formatBAM(razlika)}
            </div>
          </div>
        </div>

        {/* podaci za uplatu (račun komore ako je poznat) */}
        <div className="rounded-lg bg-info-bg text-info text-[12.5px] leading-5 px-3 py-2.5">
          <span className="font-semibold">Podaci za uplatu: </span>
          {kanton ? (
            komoraRacun ? (
              <span>
                {komoraNaziv(kanton)}, račun <strong>{komoraRacun}</strong>,
                vrsta prihoda <strong>{COK_VRSTA_PRIHODA}</strong>. Članarina
                se plaća kvartalno (28.02., 31.05., 31.08., 30.11.).
              </span>
            ) : (
              <span>
                {komoraNaziv(kanton)}, vrsta prihoda{" "}
                <strong>{COK_VRSTA_PRIHODA}</strong>. Žiro račun komore ovog
                kantona još nemamo: dostavite ga pa ćemo ga dodati.
              </span>
            )
          ) : (
            <span>Izaberite kanton.</span>
          )}
        </div>

        {error && <p className="text-[12.5px] text-accent-500">{error}</p>}
        <div className="flex flex-wrap justify-end items-center gap-2">
          {spremljeno && (
            <span className="mr-auto text-[12.5px] text-success font-medium">
              Spremljeno na profil
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Zatvori
          </button>
          <button
            type="button"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate(false)}
            className="px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            Spremi
          </button>
          <button
            type="button"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saveMut.isPending ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Spremi i preuzmi PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}
