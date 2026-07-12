"use client";

// Uvoz početnog stanja lagera iz drugog programa (CSV): parsira se u
// browseru, pregled prije slanja, backend kreira DRAFT popis (pocetnoStanje)
// SAMO sa uvezenim redovima. Korisnik popis pregleda na tabu Popis i
// proknjiži ga: tek tada količine ulaze u lager i TKM.
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconFileUpload,
  IconLoader2,
} from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { useArtikli } from "src/hooks/useKalkulacije";
import { parseLagerFile, type UvozLagerRed } from "src/lib/comsoftUvoz";
import {
  uvozPocetnogStanja,
  type UvozLagerResult,
  type UvozLagerStavka,
} from "src/api/lager";
import { unwrap } from "src/api/auth";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";

const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
const thCls =
  "px-2.5 py-1.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-2.5 py-1.5 text-[12px] text-text-primary whitespace-nowrap";

const kol = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 3 });
const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PREVIEW_MAX = 50;

export function UvozPocetnogStanjaModal({
  orgId,
  onClose,
}: {
  orgId: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: artikli } = useArtikli(orgId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [datumS, setDatumS] = useState(todayFormatted());
  const [napomena, setNapomena] = useState("");
  const [fajlNaziv, setFajlNaziv] = useState<string | null>(null);
  const [redovi, setRedovi] = useState<UvozLagerRed[] | null>(null);
  const [greska, setGreska] = useState<string | null>(null);
  const [rezultat, setRezultat] = useState<UvozLagerResult | null>(null);

  const artikalBySifra = useMemo(
    () =>
      new Map((artikli ?? []).map((a) => [a.sifra.toLowerCase(), a])),
    [artikli],
  );

  // pregled prije slanja: šta će se uvesti, šta preskočiti i zašto
  const pregled = useMemo(() => {
    if (!redovi) return null;
    const valjani: (UvozLagerRed & { naziv: string })[] = [];
    const problemi: { sifra: string; razlog: string }[] = [];
    for (const r of redovi) {
      if (!r.sifra) {
        problemi.push({ sifra: "(prazno)", razlog: "nema šifru" });
        continue;
      }
      const a = artikalBySifra.get(r.sifra.toLowerCase());
      if (!a) {
        problemi.push({ sifra: r.sifra, razlog: "nema u šifarniku artikala" });
        continue;
      }
      if (a.tip === "USLUGA") {
        problemi.push({ sifra: r.sifra, razlog: "usluga (nema zalihe)" });
        continue;
      }
      if (!Number.isFinite(r.kolicina) || r.kolicina <= 0) {
        problemi.push({ sifra: r.sifra, razlog: "neispravna količina" });
        continue;
      }
      if (!Number.isFinite(r.mpc) || r.mpc <= 0) {
        problemi.push({ sifra: r.sifra, razlog: "neispravna MPC" });
        continue;
      }
      valjani.push({ ...r, naziv: a.naziv });
    }
    return { valjani, problemi };
  }, [redovi, artikalBySifra]);

  const uvozM = useMutation({
    mutationFn: (payload: {
      datum: string;
      napomena?: string;
      stavke: UvozLagerStavka[];
    }) => unwrap(uvozPocetnogStanja(orgId, payload)),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["popisi", orgId] });
      qc.invalidateQueries({ queryKey: ["lager", orgId] });
      setRezultat(data);
    },
    onError: () =>
      setGreska("Greška pri uvozu, pokušajte ponovo."),
  });

  async function izaberiFajl(f: File | undefined) {
    setGreska(null);
    setRedovi(null);
    setFajlNaziv(null);
    if (!f) return;
    try {
      const parsed = await parseLagerFile(f);
      setRedovi(parsed);
      setFajlNaziv(f.name);
    } catch (e) {
      setGreska(
        e instanceof Error ? e.message : "Fajl se ne može pročitati.",
      );
    }
  }

  function posalji() {
    setGreska(null);
    const datum = parseDateInput(datumS);
    if (!datum) return setGreska("Unesite ispravan datum početnog stanja.");
    if (!pregled || pregled.valjani.length === 0) {
      return setGreska("Nema ispravnih redova za uvoz.");
    }
    uvozM.mutate({
      datum,
      napomena: napomena.trim() || undefined,
      stavke: pregled.valjani.map((r) => ({
        sifra: r.sifra,
        kolicina: r.kolicina,
        mpc: r.mpc,
        nabavnaCijena: r.nabavnaCijena,
      })),
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Uvoz početnog stanja lagera"
      maxWidthClass="max-w-[760px]"
    >
      {rezultat ? (
        <div className="space-y-4">
          <p className="text-[13px] text-text-primary leading-6">
            Kreiran je popis početnog stanja{" "}
            <strong>{rezultat.popis.oznaka}</strong> sa{" "}
            <strong>{rezultat.dodano}</strong> stavki (status: u izradi).
            {rezultat.spojeno > 0 &&
              ` ${rezultat.spojeno} duplih redova (ista šifra i MPC) je sabrano.`}{" "}
            Količine još NISU na lageru: otvorite popis, pregledajte stavke i
            kliknite &quot;Proknjiži&quot;.
          </p>
          {rezultat.preskocenoUkupno > 0 && (
            <div className="rounded-lg bg-warning-bg text-warning text-[12px] leading-5 px-3 py-2">
              Preskočeno {rezultat.preskocenoUkupno} redova:{" "}
              {rezultat.preskoceno
                .slice(0, 10)
                .map((p) => `${p.sifra} (${p.razlog})`)
                .join(", ")}
              {rezultat.preskocenoUkupno > 10 && "..."}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Zatvori
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push("/app/lager?tab=popis");
              }}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Otvori popise
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[12.5px] text-text-tertiary leading-5">
            CSV fajl sa zaglavljem i kolonama <strong>Šifra</strong>,{" "}
            <strong>Količina</strong> i <strong>MPC</strong> (opciono Nabavna
            cijena); podržan je i izvoz lager liste iz drugog programa. Uvoz kreira
            popis početnog stanja koji se pregleda i proknjiži na tabu Popis,
            pa lager i TKM kreću od stvarnog stanja. Artikli se prepoznaju po
            šifri: nedostajuće prvo uvezite u šifarnik (Kalkulacije, tab
            Artikli, dugme Uvoz).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Datum početnog stanja</label>
              <PkDateInput
                value={datumS}
                onChange={setDatumS}
                ariaLabel="Datum početnog stanja"
                className="w-full"
                inputClassName="bg-cream-50"
              />
            </div>
            <div>
              <label className={labelCls}>Napomena (opciono)</label>
              <input
                value={napomena}
                onChange={(e) => setNapomena(e.target.value)}
                placeholder="npr. stanje iz prethodnog programa"
                className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => void izaberiFajl(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
            >
              <IconFileUpload size={15} />
              Izaberi fajl
            </button>
            <span className="text-[12.5px] text-text-tertiary">
              {fajlNaziv ?? "Nije izabran fajl."}
            </span>
          </div>

          {pregled && (
            <>
              <p className="text-[12.5px] text-text-primary">
                Za uvoz spremno <strong>{pregled.valjani.length}</strong>{" "}
                redova
                {pregled.problemi.length > 0 && (
                  <>
                    , preskočiće se{" "}
                    <strong>{pregled.problemi.length}</strong>
                  </>
                )}
                .
              </p>
              {pregled.valjani.length > 0 && (
                <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-auto max-h-56">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-cream-300">
                        <th className={thCls}>Šifra</th>
                        <th className={thCls}>Naziv</th>
                        <th className={`${thCls} text-right`}>Količina</th>
                        <th className={`${thCls} text-right`}>MPC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pregled.valjani.slice(0, PREVIEW_MAX).map((r, i) => (
                        <tr
                          key={`${r.sifra}-${r.mpc}-${i}`}
                          className="border-b border-cream-300 last:border-b-0"
                        >
                          <td className={`${tdCls} tabular-nums`}>
                            {r.sifra}
                          </td>
                          <td className={tdCls}>{r.naziv}</td>
                          <td className={`${tdCls} text-right tabular-nums`}>
                            {kol(r.kolicina)}
                          </td>
                          <td className={`${tdCls} text-right tabular-nums`}>
                            {km(r.mpc)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pregled.valjani.length > PREVIEW_MAX && (
                    <p className="text-[11.5px] text-text-tertiary px-3 py-2">
                      ... i još {pregled.valjani.length - PREVIEW_MAX} redova.
                    </p>
                  )}
                </div>
              )}
              {pregled.problemi.length > 0 && (
                <div className="rounded-lg bg-warning-bg text-warning text-[12px] leading-5 px-3 py-2 max-h-28 overflow-auto">
                  Preskočiće se:{" "}
                  {pregled.problemi
                    .slice(0, 30)
                    .map((p) => `${p.sifra} (${p.razlog})`)
                    .join(", ")}
                  {pregled.problemi.length > 30 &&
                    ` ... i još ${pregled.problemi.length - 30}.`}
                </div>
              )}
            </>
          )}

          <div className="rounded-lg bg-warning-bg text-warning text-[12px] leading-5 px-3 py-2 flex items-start gap-2">
            <IconAlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              Proknjižen popis početnog stanja zadužuje i TKM. Ako ste za istu
              godinu već ručno unijeli početno stanje TKM-a (vrijednosno, na
              tabu TKM), uklonite ga prije proknjižavanja da se ne dupla.
            </span>
          </div>

          {greska && (
            <p className="text-[12.5px] text-accent-500">{greska}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={
                uvozM.isPending || !pregled || pregled.valjani.length === 0
              }
              onClick={posalji}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {uvozM.isPending && (
                <IconLoader2 size={15} className="animate-spin" />
              )}
              Kreiraj popis početnog stanja
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
