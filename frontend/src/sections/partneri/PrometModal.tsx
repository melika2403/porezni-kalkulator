"use client";

// Izvještaj "Ukupni promet": izbor vrste i perioda (default tekuća godina,
// brzi izbor cijele godine), pa PDF tabela po partneru. Vrste: dobavljači
// (duguje/potražuje/saldo), kupci (isto) ili svi partneri zajedno, gdje je
// partner koji je i kupac i dobavljač u JEDNOM redu sa kolonama "Njihov dug"
// i "Naš dug" (osnova za kompenzacije). Iznosi dolaze sa backenda istom
// logikom kao kartica partnera.
import { useState } from "react";
import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { prometPartnera, type PrometType } from "src/api/partners";
import type { Organization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { isoToDisplay, parseDateInput, todayFormatted } from "src/lib/dateInput";
import { datumHr, downloadTablePdf } from "src/sections/lager/robaPdf";

const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const chipCls =
  "px-3 py-1.5 rounded-full border border-cream-300 text-[12px] font-medium text-text-secondary hover:bg-cream-200 hover:text-text-primary transition-colors";

export function PrometModal({
  open,
  onClose,
  orgId,
  org,
}: {
  open: boolean;
  onClose: () => void;
  orgId: number | null;
  org: Organization | null | undefined;
}) {
  const godina = new Date().getFullYear();
  const [type, setType] = useState<PrometType>("dobavljac");
  // default period: tekuća godina do danas
  const [odS, setOdS] = useState(isoToDisplay(`${godina}-01-01`));
  const [doS, setDoS] = useState(todayFormatted());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cijelaGodina(g: number) {
    setOdS(isoToDisplay(`${g}-01-01`));
    setDoS(isoToDisplay(`${g}-12-31`));
  }

  async function preuzmi() {
    if (orgId == null || !org || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await unwrap(
        prometPartnera(orgId, {
          type,
          from: parseDateInput(odS) ?? undefined,
          to: parseDateInput(doS) ?? undefined,
        }),
      );
      if (data.rows.length === 0) {
        setError("Nema prometa za izabranu vrstu i period.");
        return;
      }
      const period = `za period: ${datumHr(data.from)} - ${datumHr(data.to)}`;
      if (type === "svi") {
        const sume = data.rows.reduce(
          (a, r) => ({
            njihov: a.njihov + (r.njihovDug ?? 0),
            nas: a.nas + (r.nasDug ?? 0),
            razlika: a.razlika + (r.razlika ?? 0),
          }),
          { njihov: 0, nas: 0, razlika: 0 },
        );
        await downloadTablePdf({
          fileName: `Promet-partnera-${data.to}.pdf`,
          org,
          title: "PROMET PARTNERA",
          subtitle: period,
          info: [
            "Njihov dug: fakture kupcu minus njegove uplate. Naš dug: računi dobavljača minus naša plaćanja.",
            "Razlika = njihov dug minus naš dug (osnova za kompenzaciju).",
          ],
          sections: [
            {
              cols: [
                { label: "R.B.", w: 26 },
                { label: "ŠIFRA", w: 44 },
                { label: "NAZIV PARTNERA", w: 220 },
                { label: "NJIHOV DUG", w: 72, right: true },
                { label: "NAŠ DUG", w: 72, right: true },
                { label: "RAZLIKA", w: 72, right: true },
              ],
              rows: data.rows.map((r, i) => [
                `${i + 1}.`,
                r.code != null ? String(r.code).padStart(4, "0") : "",
                r.name,
                km(r.njihovDug ?? 0),
                km(r.nasDug ?? 0),
                km(r.razlika ?? 0),
              ]),
              totals: [
                "",
                "",
                `UKUPNO (${data.rows.length})`,
                km(sume.njihov),
                km(sume.nas),
                km(sume.razlika),
              ],
            },
          ],
        });
      } else {
        const naziv = type === "kupac" ? "kupaca" : "dobavljača";
        const sume = data.rows.reduce(
          (a, r) => ({
            duguje: a.duguje + (r.duguje ?? 0),
            potrazuje: a.potrazuje + (r.potrazuje ?? 0),
            saldo: a.saldo + (r.saldo ?? 0),
          }),
          { duguje: 0, potrazuje: 0, saldo: 0 },
        );
        await downloadTablePdf({
          fileName: `Ukupni-promet-${type === "kupac" ? "kupaca" : "dobavljaca"}-${data.to}.pdf`,
          org,
          title: `UKUPNI PROMET ${naziv.toUpperCase()}`,
          subtitle: period,
          sections: [
            {
              cols: [
                { label: "R.B.", w: 26 },
                { label: "ŠIFRA", w: 44 },
                {
                  label: type === "kupac" ? "NAZIV KUPCA" : "NAZIV DOBAVLJAČA",
                  w: 230,
                },
                { label: "DUGUJE", w: 70, right: true },
                { label: "POTRAŽUJE", w: 70, right: true },
                { label: "SALDO", w: 70, right: true },
              ],
              rows: data.rows.map((r, i) => [
                `${i + 1}.`,
                r.code != null ? String(r.code).padStart(4, "0") : "",
                r.name,
                km(r.duguje ?? 0),
                km(r.potrazuje ?? 0),
                km(r.saldo ?? 0),
              ]),
              totals: [
                "",
                "",
                `UKUPNO (${data.rows.length})`,
                km(sume.duguje),
                km(sume.potrazuje),
                km(sume.saldo),
              ],
            },
          ],
        });
      }
      onClose();
    } catch {
      setError("Greška pri izradi izvještaja, pokušajte ponovo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ukupni promet">
      <div className="space-y-3">
        <p className="text-[13px] leading-6 text-text-secondary">
          PDF pregled prometa po partneru za izabrani period. Kupci: fakture
          duguju, uplate potražuju. Dobavljači: računi potražuju, plaćanja
          duguju. Svi partneri: kupci i dobavljači zajedno, partner koji je
          oboje je u jednom redu sa njihovim i našim dugom.
        </p>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Vrsta
          </div>
          <PkSelect
            ariaLabel="Vrsta prometa"
            value={type}
            onChange={(v) =>
              setType(v === "kupac" || v === "svi" ? v : "dobavljac")
            }
            options={[
              { value: "dobavljac", label: "Dobavljači" },
              { value: "kupac", label: "Kupci" },
              { value: "svi", label: "Svi partneri (njihov i naš dug)" },
            ]}
            wrapStyle={{ minWidth: 260 }}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
              Od datuma
            </div>
            <PkDateInput
              value={odS}
              onChange={setOdS}
              ariaLabel="Period od"
              className="w-[150px]"
            />
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
              Do datuma
            </div>
            <PkDateInput
              value={doS}
              onChange={setDoS}
              ariaLabel="Period do"
              className="w-[150px]"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => cijelaGodina(godina)}
            className={chipCls}
          >
            Cijela {godina}.
          </button>
          <button
            type="button"
            onClick={() => cijelaGodina(godina - 1)}
            className={chipCls}
          >
            Cijela {godina - 1}.
          </button>
          <button
            type="button"
            onClick={() => {
              setOdS("");
              setDoS("");
            }}
            className={chipCls}
            title="Bez perioda: cijeli promet od početka"
          >
            Sve
          </button>
        </div>
        {error && <p className="text-[12.5px] text-accent-500">{error}</p>}
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
            disabled={busy || orgId == null || !org}
            onClick={preuzmi}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Preuzmi PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}
