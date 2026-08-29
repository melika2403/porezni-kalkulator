"use client";

// Dijeljeni modal za grupni uvoz šifarnika iz Com_Soft fajlova (XML/CSV):
// izbor fajla → parsiranje u browseru → pregled broja stavki → uvoz.
// Duplikati se na backendu preskaču, a ovdje se prikaže šta je preskočeno
// i zašto. Koriste ga šifarnik artikala i poslovni partneri.
import { useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconDownload,
  IconFileUpload,
  IconLoader2,
} from "@tabler/icons-react";
import { Modal } from "./Modal";
import { mnozina } from "src/lib/format";

export type UvozRezultat = {
  dodano: number;
  preskocenoUkupno: number;
  preskoceno: { sifra: string; naziv: string; razlog: string }[];
  /** dodatne info linije (npr. "12 partnera uvezeno bez ID broja") */
  napomene?: string[];
};

/** Stavka pregleda prije upisa (isti obrazac kao uvoz radnika). */
export type PregledStavka = {
  /** šifra ili oznaka reda */
  kljuc: string;
  naziv: string;
  status: "novi" | "preskocen" | "greska";
  razlog?: string;
};

export function UvozSifarnikaModal<T>({
  open,
  onClose,
  title,
  opis,
  parse,
  uvezi,
  sablon,
  pregled,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** šta modal uvozi i odakle, prikazano iznad izbora fajla */
  opis: string;
  parse: (file: File) => Promise<T[]>;
  uvezi: (rows: T[]) => Promise<UvozRezultat>;
  /** opcioni CSV šablon za ručno popunjavanje (dugme "Preuzmi šablon") */
  sablon?: { imeFajla: string; sadrzaj: () => string };
  /** opcioni pregled po redovima prije upisa (novi / preskočen / greška) */
  pregled?: (rows: T[]) => PregledStavka[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<T[] | null>(null);
  const [stavke, setStavke] = useState<PregledStavka[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rezultat, setRezultat] = useState<UvozRezultat | null>(null);

  function reset() {
    setFileName(null);
    setRows(null);
    setStavke(null);
    setError(null);
    setBusy(false);
    setRezultat(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function preuzmiSablon() {
    if (!sablon) return;
    const blob = new Blob([sablon.sadrzaj()], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sablon.imeFajla;
    a.click();
    URL.revokeObjectURL(url);
  }

  function close() {
    reset();
    onClose();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setRezultat(null);
    setRows(null);
    setFileName(file.name);
    setBusy(true);
    try {
      const parsed = await parse(file);
      if (parsed.length === 0) {
        setError("U fajlu nije pronađena nijedna stavka.");
      } else {
        setRows(parsed);
        setStavke(pregled ? pregled(parsed) : null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fajl se ne može pročitati.");
    } finally {
      setBusy(false);
    }
  }

  async function pokreniUvoz() {
    if (!rows || busy) return;
    setBusy(true);
    setError(null);
    try {
      setRezultat(await uvezi(rows));
      setRows(null);
      setStavke(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uvoz nije uspio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title={title} maxWidthClass="max-w-[560px]">
      <div className="space-y-3">
        {!rezultat && (
          <>
            <p className="text-[13px] leading-6 text-text-secondary">{opis}</p>
            {sablon && (
              <button
                type="button"
                onClick={preuzmiSablon}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 bg-cream-100 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors"
              >
                <IconDownload size={14} />
                Preuzmi šablon (CSV)
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xml,.csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border border-dashed border-cream-300 text-[13px] text-text-secondary hover:bg-cream-200 hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {busy && !rows ? (
                <IconLoader2 size={18} className="animate-spin" />
              ) : (
                <IconFileUpload size={18} />
              )}
              {fileName ?? "Odaberi XML ili CSV fajl"}
            </button>
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-[12.5px] text-warning">
            <IconAlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {rows && !rezultat && !stavke && (
          <div className="rounded-lg bg-cream-200 px-3 py-2.5 text-[13px] text-text-primary">
            U fajlu je pronađeno <strong>{rows.length}</strong>{" "}
            {mnozina(rows.length, "stavka", "stavke", "stavki")}. Postojeće
            stavke se ne mijenjaju: sve što već postoji biće preskočeno uz
            obrazloženje.
          </div>
        )}

        {rows && !rezultat && stavke && (
          <div className="space-y-2">
            <div className="rounded-lg bg-cream-200 px-3 py-2.5 text-[13px] text-text-primary">
              U fajlu je <strong>{stavke.length}</strong>{" "}
              {mnozina(stavke.length, "stavka", "stavke", "stavki")}: za uvoz{" "}
              <strong>
                {stavke.filter((s) => s.status === "novi").length}
              </strong>
              , preskočenih{" "}
              <strong>
                {stavke.filter((s) => s.status === "preskocen").length}
              </strong>
              , sa greškom{" "}
              <strong>
                {stavke.filter((s) => s.status === "greska").length}
              </strong>
              . Postojeće stavke se ne mijenjaju.
            </div>
            <ul className="max-h-[280px] overflow-y-auto rounded-lg border border-cream-300 divide-y divide-cream-300">
              {stavke.map((s, i) => (
                <li
                  key={`${s.kljuc}-${i}`}
                  className="flex items-start justify-between gap-3 px-3 py-2 text-[12.5px] leading-5"
                >
                  <span className="text-text-primary min-w-0">
                    <span className="tabular-nums">{s.kljuc} · </span>
                    {s.naziv || "(bez naziva)"}
                    {s.razlog && (
                      <span className="block text-[11.5px] text-text-tertiary">
                        {s.razlog}
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      "shrink-0 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium " +
                      (s.status === "novi"
                        ? "bg-brand-100 text-brand-700"
                        : s.status === "preskocen"
                          ? "bg-cream-200 text-text-tertiary"
                          : "bg-accent-500/10 text-accent-500")
                    }
                  >
                    {s.status === "novi"
                      ? "novi"
                      : s.status === "preskocen"
                        ? "preskočen"
                        : "greška"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {rezultat && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-success-bg px-3 py-2.5 text-[13px] text-success">
              <IconCheck size={15} className="shrink-0 mt-0.5" />
              <span>
                Uvezeno <strong>{rezultat.dodano}</strong>{" "}
                {mnozina(rezultat.dodano, "stavka", "stavke", "stavki")}
                {rezultat.preskocenoUkupno > 0 && (
                  <>
                    , preskočeno <strong>{rezultat.preskocenoUkupno}</strong>
                  </>
                )}
                .
              </span>
            </div>
            {(rezultat.napomene ?? []).map((n) => (
              <div
                key={n}
                className="rounded-lg bg-info-bg px-3 py-2.5 text-[12.5px] text-info"
              >
                {n}
              </div>
            ))}
            {rezultat.preskoceno.length > 0 && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold mb-1.5">
                  Preskočene stavke
                </div>
                <ul className="max-h-[260px] overflow-y-auto rounded-lg border border-cream-300 divide-y divide-cream-300">
                  {rezultat.preskoceno.map((p, i) => (
                    <li
                      key={`${p.sifra}-${i}`}
                      className="px-3 py-2 text-[12.5px] leading-5"
                    >
                      <span className="text-text-primary">
                        {p.sifra && (
                          <span className="tabular-nums">{p.sifra} · </span>
                        )}
                        {p.naziv || "(bez naziva)"}
                      </span>
                      <span className="text-text-tertiary"> : {p.razlog}</span>
                    </li>
                  ))}
                </ul>
                {rezultat.preskocenoUkupno > rezultat.preskoceno.length && (
                  <p className="text-[12px] text-text-tertiary mt-1.5">
                    Prikazano prvih {rezultat.preskoceno.length} od{" "}
                    {rezultat.preskocenoUkupno} preskočenih.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            {rezultat ? "Zatvori" : "Odustani"}
          </button>
          {rows && !rezultat && (() => {
            // Sa pregledom se broje samo novi redovi; bez njega svi iz fajla.
            const brojZaUvoz = stavke
              ? stavke.filter((s) => s.status === "novi").length
              : rows.length;
            return (
              <button
                type="button"
                disabled={busy || brojZaUvoz === 0}
                onClick={pokreniUvoz}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {busy && <IconLoader2 size={15} className="animate-spin" />}
                Uvezi {brojZaUvoz}{" "}
                {mnozina(brojZaUvoz, "stavku", "stavke", "stavki")}
              </button>
            );
          })()}
        </div>
      </div>
    </Modal>
  );
}
