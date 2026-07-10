"use client";

// Kartica artikla sa lager liste: podaci artikla + tekuće stanje + svi ulazi
// (kalkulacije sa dobavljačem i cijenama) i korekcije iz proknjiženih popisa,
// hronološki sa stanjem nakon svakog događaja. Odavde se artikal i uređuje.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconDownload, IconLoader2, IconPencil } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { ArtikalModal } from "src/sections/kalkulacije/ArtikalModal";
import { useArtikalKartica } from "src/hooks/useLager";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { downloadTablePdf } from "./robaPdf";

const thCls =
  "px-3 py-2 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;

const kol = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 3 });
const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function datumHr(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
}

export function ArtikalKarticaModal({
  orgId,
  artikalId,
  onClose,
}: {
  orgId: number | null;
  /** null = zatvoreno */
  artikalId: number | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useArtikalKartica(orgId, artikalId);
  const [editOpen, setEditOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const a = data?.artikal ?? null;

  const TIP_LABEL: Record<string, string> = {
    KALKULACIJA: "Kalkulacija",
    POPIS: "Popis",
    NIVELACIJA: "Nivelacija",
    POVRAT: "Povrat dobavljaču",
    OTPIS: "Otpis",
  };

  async function preuzmiPdf() {
    if (!data || !a || !fullOrg || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadTablePdf({
        fileName: `Kartica-artikla-${a.sifra}.pdf`,
        org: fullOrg,
        title: "KARTICA ARTIKLA",
        subtitle: `${a.sifra} · ${a.naziv} (${a.jm})`,
        info: [
          `Stanje na lageru: ${kol(data.stanje)} ${a.jm}`,
          ...(a.barkod ? [`Bar kod: ${a.barkod}`] : []),
        ],
        sections: [
          {
            cols: [
              { label: "R.B.", w: 26 },
              { label: "DATUM", w: 56 },
              { label: "DOKUMENT", w: 110 },
              { label: "DOBAVLJAČ / OPIS", w: 160 },
              { label: "MPC", w: 50, right: true },
              { label: "NABAVNA CIJENA", w: 56, right: true },
              { label: "KOLIČINA", w: 56, right: true },
              { label: "STANJE", w: 56, right: true },
            ],
            rows: data.events.map((e, i) => [
              `${i + 1}.`,
              datumHr(e.datum),
              `${TIP_LABEL[e.tip] ?? e.tip} ${e.oznaka}`,
              e.tip === "POPIS" ? "korekcija po popisu" : (e.opis ?? ""),
              km(e.mpc),
              e.nabavnaCijena != null ? km(e.nabavnaCijena) : "",
              `${e.kolicina > 0 ? "+" : ""}${kol(e.kolicina)}`,
              kol(e.stanje),
            ]),
          },
        ],
      });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Modal
      open={artikalId != null}
      onClose={onClose}
      title="Kartica artikla"
      maxWidthClass="max-w-[860px]"
    >
      {isLoading && (
        <p className="inline-flex items-center gap-2 text-[13px] text-text-tertiary">
          <IconLoader2 size={16} className="animate-spin" />
          Učitavanje kartice...
        </p>
      )}
      {data && a && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
                Artikal
              </div>
              <div className="text-[15px] font-medium text-text-primary">
                <span className="tabular-nums text-text-tertiary">
                  {a.sifra}
                </span>{" "}
                {a.naziv}
              </div>
              <div className="text-[12px] text-text-tertiary mt-0.5">
                {a.jm}
                {a.barkod ? ` · bar kod ${a.barkod}` : ""}
                {a.oslobodjenPdv ? " · oslobođen PDV-a" : ""}
                {a.aktivan ? "" : " · neaktivan"}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
                Stanje na lageru
              </div>
              <div
                className={`text-[20px] font-serif-display tabular-nums ${data.stanje < 0 ? "text-accent-500" : "text-brand-700"}`}
              >
                {kol(data.stanje)} {a.jm}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={preuzmiPdf}
                disabled={pdfBusy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
              >
                {pdfBusy ? (
                  <IconLoader2 size={15} className="animate-spin" />
                ) : (
                  <IconDownload size={15} />
                )}
                Preuzmi PDF
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors"
              >
                <IconPencil size={15} />
                Uredi artikal
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-cream-300 bg-cream-50 overflow-x-auto max-h-[46vh] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-cream-50">
                <tr className="border-b border-cream-300">
                  <th className={thCls}>Datum</th>
                  <th className={thCls}>Dokument</th>
                  <th className={thCls}>Dobavljač / opis</th>
                  <th className={`${thCls} text-right`}>MPC</th>
                  <th className={`${thCls} text-right`}>Nabavna</th>
                  <th className={`${thCls} text-right`}>Količina</th>
                  <th className={`${thCls} text-right`}>Stanje</th>
                </tr>
              </thead>
              <tbody>
                {data.events.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-[13px] text-text-tertiary"
                      colSpan={7}
                    >
                      Artikal još nema prometa (nijedna kalkulacija ni popis).
                    </td>
                  </tr>
                )}
                {data.events.map((e, i) => (
                  <tr
                    key={i}
                    className="border-b border-cream-300 last:border-b-0"
                  >
                    <td className={tdCls}>{datumHr(e.datum)}</td>
                    <td className={tdCls}>
                      {e.tip === "KALKULACIJA" ? (
                        <>Kalkulacija {e.oznaka}</>
                      ) : (
                        <span className="text-info font-medium">
                          {e.tip === "POPIS"
                            ? "Popis"
                            : e.tip === "NIVELACIJA"
                              ? "Nivelacija"
                              : e.tip === "POVRAT"
                                ? "Povrat dobavljaču"
                                : "Otpis"}{" "}
                          {e.oznaka}
                        </span>
                      )}
                    </td>
                    <td className={tdCls}>
                      {e.tip === "POPIS"
                        ? "korekcija po popisu"
                        : e.opis || "–"}
                    </td>
                    <td className={tdNum}>{km(e.mpc)}</td>
                    <td className={tdNum}>
                      {e.nabavnaCijena != null ? km(e.nabavnaCijena) : "–"}
                    </td>
                    <td
                      className={`${tdNum} font-medium ${e.kolicina < 0 ? "text-accent-500" : "text-success"}`}
                    >
                      {e.kolicina > 0 ? "+" : ""}
                      {kol(e.kolicina)}
                    </td>
                    <td className={`${tdNum} font-medium`}>{kol(e.stanje)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11.5px] text-text-tertiary">
            Ulazi dolaze iz kalkulacija, korekcije iz proknjiženih popisa.
            Stanje je zbirno za sve cijene artikla; raspored po MPC-u se vidi
            na lager listi.
          </p>
        </div>
      )}

      <ArtikalModal
        open={editOpen}
        orgId={orgId}
        artikal={
          a
            ? {
                id: a.id,
                sifra: a.sifra,
                naziv: a.naziv,
                tip: a.tip ?? "ROBA",
                jm: a.jm,
                barkod: a.barkod,
                oslobodjenPdv: a.oslobodjenPdv,
                aktivan: a.aktivan,
              }
            : null
        }
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          // naziv/šifra se prikazuju i na lager listi i na kartici
          qc.invalidateQueries({ queryKey: ["lager", orgId] });
        }}
      />
    </Modal>
  );
}
