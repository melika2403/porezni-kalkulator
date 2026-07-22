"use client";

// Šifarnik artikala: pretraga, dodavanje, uređivanje. Artikal korišten na
// kalkulacijama se ne briše (snapshot integritet), umjesto toga se deaktivira
// pa nestaje iz izbora na novim kalkulacijama.
import { useMemo, useState } from "react";
import {
  IconDownload,
  IconFileUpload,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "src/components/app-shell/Modal";
import { UvozSifarnikaModal } from "src/components/app-shell/UvozSifarnikaModal";
import {
  useArtikli,
  useDeleteArtikal,
  useUpdateArtikal,
} from "src/hooks/useKalkulacije";
import { uvozArtikala, type Artikal } from "src/api/kalkulacije";
import { getLager } from "src/api/lager";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatKm } from "src/lib/amountInput";
import { downloadTablePdf } from "src/sections/lager/robaPdf";
import { ArtikalKarticaModal } from "src/sections/lager/ArtikalKarticaModal";
import { parseArtikliFile } from "src/lib/comsoftUvoz";
import { ArtikalModal } from "./ArtikalModal";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";

export function ArtikliTab({ orgId }: { orgId: number | null }) {
  const { data: artikli, isLoading } = useArtikli(orgId);
  const deleteM = useDeleteArtikal(orgId);
  const updateM = useUpdateArtikal(orgId);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<Artikal | null>(null);
  const [brisi, setBrisi] = useState<Artikal | null>(null);
  // artikal je u upotrebi pa se ne može obrisati: ponudi deaktivaciju
  const [uUpotrebi, setUUpotrebi] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [uvozOpen, setUvozOpen] = useState(false);
  const [sakrijNeaktivne, setSakrijNeaktivne] = useState(false);
  // klik na red otvara karticu artikla (promet + stanje, kao na lageru)
  const [karticaId, setKarticaId] = useState<number | null>(null);
  const qc = useQueryClient();

  // stanje i MPC sa lager liste (roba po artiklu može imati više MPC redova)
  const { data: lager } = useQuery({
    queryKey: ["lager", orgId],
    queryFn: () => unwrap(getLager(orgId as number)),
    enabled: orgId != null,
  });
  const lagerByArtikal = useMemo(() => {
    const m = new Map<number, { stanje: number; mpc: number[] }>();
    for (const r of lager?.rows ?? []) {
      const cur = m.get(r.artikalId) ?? { stanje: 0, mpc: [] };
      cur.stanje += r.kolicina;
      if (r.kolicina > 0 && !cur.mpc.includes(r.mpc)) cur.mpc.push(r.mpc);
      m.set(r.artikalId, cur);
    }
    return m;
  }, [lager]);

  // puni podaci obrta za zaglavlje PDF-a (isti cache key kao na lageru)
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let all = artikli ?? [];
    if (sakrijNeaktivne) all = all.filter((a) => a.aktivan);
    if (!q) return all;
    return all.filter(
      (a) =>
        a.naziv.toLowerCase().includes(q) ||
        a.sifra.toLowerCase().includes(q) ||
        (a.barkod ?? "").toLowerCase().includes(q),
    );
  }, [artikli, search, sakrijNeaktivne]);

  // CSV izvoz šifarnika (Excel: BOM + ";"), prati aktivnu pretragu/filter
  function izvozCsv() {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      "Šifra", "Naziv", "Vrsta", "J/M", "Bar kod", "PDV", "Status",
      "Stanje (lager)", "MPC (lager)",
    ];
    const lines = rows.map((a) => {
      const lg = lagerByArtikal.get(a.id);
      return [
        a.sifra,
        a.naziv,
        a.tip === "USLUGA" ? "usluga" : "roba",
        a.jm,
        a.barkod ?? "",
        a.oslobodjenPdv ? "oslobođen" : "17%",
        a.aktivan ? "aktivan" : "neaktivan",
        lg ? String(lg.stanje).replace(".", ",") : "0",
        lg ? lg.mpc.map((m) => formatKm(m)).join(" / ") : "",
      ];
    });
    const csv =
      "\uFEFF" +
      [header, ...lines].map((r) => r.map(esc).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Sifarnik-artikala-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function potvrdiBrisanje() {
    if (!brisi) return;
    try {
      await deleteM.mutateAsync(brisi.id);
      setBrisi(null);
      setUUpotrebi(false);
    } catch (e) {
      if (e instanceof Error && e.message === "ARTIKAL_U_UPOTREBI") {
        setUUpotrebi(true);
      } else {
        setBrisi(null);
      }
    }
  }

  async function deaktiviraj() {
    if (!brisi) return;
    await updateM.mutateAsync({ id: brisi.id, payload: { aktivan: false } });
    setBrisi(null);
    setUUpotrebi(false);
  }

  // ispis prati aktivnu pretragu, kao i na lager listi
  async function preuzmiPdf() {
    if (!fullOrg || rows.length === 0 || pdfBusy) return;
    setPdfBusy(true);
    try {
      const danas = new Date();
      const dd = String(danas.getDate()).padStart(2, "0");
      const mm = String(danas.getMonth() + 1).padStart(2, "0");
      const info = search.trim() ? [`Pretraga: "${search.trim()}"`] : [];
      await downloadTablePdf({
        fileName: `Sifarnik-artikala-${danas.getFullYear()}-${mm}-${dd}.pdf`,
        org: fullOrg,
        title: "ŠIFARNIK ARTIKALA",
        subtitle: `na dan ${dd}.${mm}.${danas.getFullYear()}. godine`,
        info,
        sections: [
          {
            cols: [
              { label: "R.B.", w: 26 },
              { label: "ŠIFRA", w: 44 },
              { label: "NAZIV ARTIKLA", w: 205 },
              { label: "VRSTA", w: 42 },
              { label: "JED. MJERE", w: 44 },
              { label: "BAR KOD", w: 76 },
              { label: "PDV", w: 48 },
              { label: "STATUS", w: 52 },
            ],
            rows: rows.map((a, i) => [
              `${i + 1}.`,
              a.sifra,
              a.naziv,
              a.tip === "USLUGA" ? "usluga" : "roba",
              a.jm,
              a.barkod || "",
              a.oslobodjenPdv ? "oslobođen" : "17%",
              a.aktivan ? "aktivan" : "neaktivan",
            ]),
            totals: [
              "",
              "",
              `Ukupno ${rows.length} artikala`,
              "",
              "",
              "",
              "",
              "",
            ],
          },
        ],
      });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži po nazivu, šifri ili bar kodu"
          className="w-full max-w-[340px] rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
        />
        <label className="flex items-center gap-2 text-[12.5px] text-text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={sakrijNeaktivne}
            onChange={(e) => setSakrijNeaktivne(e.target.checked)}
            className="w-4 h-4 accent-[#3a5c42]"
          />
          Sakrij neaktivne
        </label>
        <button
          type="button"
          onClick={() => setUvozOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cream-300 text-[13px] font-medium text-text-primary hover:bg-cream-200 transition-colors"
        >
          <IconFileUpload size={15} />
          Uvoz
        </button>
        <button
          type="button"
          onClick={izvozCsv}
          disabled={rows.length === 0}
          title="Izvoz šifarnika u CSV (Excel), sa stanjem i MPC sa lagera"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cream-300 text-[13px] font-medium text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
        >
          <IconDownload size={15} />
          Izvoz (CSV)
        </button>
        <button
          type="button"
          onClick={preuzmiPdf}
          disabled={pdfBusy || rows.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cream-300 text-[13px] font-medium text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
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
          onClick={() => {
            setEdit(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <IconPlus size={15} />
          Novi artikal
        </button>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={thCls}>Šifra</th>
              <th className={thCls}>Naziv</th>
              <th className={thCls}>J/M</th>
              <th className={thCls}>Bar kod</th>
              <th className={thCls}>PDV</th>
              <th className={`${thCls} text-right`} title="Sa lager liste">
                Stanje
              </th>
              <th className={`${thCls} text-right`} title="MPC sa lager liste">
                MPC
              </th>
              <th className={thCls}>Status</th>
              <th className={`${thCls} text-right`}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={9}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={9}
                >
                  {search
                    ? "Nema artikala za traženi pojam."
                    : "Još nema artikala. Dodajte prvi artikal ili ga unesite direktno pri izradi kalkulacije."}
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr
                key={a.id}
                onClick={() => setKarticaId(a.id)}
                title="Otvori karticu artikla (promet i stanje)"
                className={`border-b border-cream-300 last:border-b-0 cursor-pointer hover:bg-cream-50/80 transition-colors ${a.aktivan ? "" : "opacity-55"}`}
              >
                <td className={`${tdCls} tabular-nums`}>{a.sifra}</td>
                <td className={tdCls}>
                  {a.naziv}
                  {a.tip === "USLUGA" && (
                    <span className="ml-1.5 inline-block px-2 py-0.5 rounded-[20px] bg-info-bg text-info text-[11px] font-medium">
                      usluga
                    </span>
                  )}
                </td>
                <td className={tdCls}>{a.jm}</td>
                <td className={`${tdCls} tabular-nums`}>{a.barkod || "–"}</td>
                <td className={tdCls}>
                  {a.oslobodjenPdv ? (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-info-bg text-info text-[11px] font-medium">
                      oslobođen
                    </span>
                  ) : (
                    "17%"
                  )}
                </td>
                <td className={`${tdCls} text-right tabular-nums`}>
                  {a.tip === "USLUGA"
                    ? "–"
                    : (lagerByArtikal.get(a.id)?.stanje ?? 0).toLocaleString(
                        "de-DE",
                        { maximumFractionDigits: 3 },
                      )}
                </td>
                <td className={`${tdCls} text-right tabular-nums`}>
                  {(() => {
                    const mpc = lagerByArtikal.get(a.id)?.mpc ?? [];
                    return mpc.length > 0
                      ? mpc.map((m) => formatKm(m)).join(" / ")
                      : "–";
                  })()}
                </td>
                <td className={tdCls}>
                  {a.aktivan ? (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-success-bg text-success text-[11px] font-medium">
                      aktivan
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateM.mutate({
                          id: a.id,
                          payload: { aktivan: true },
                        });
                      }}
                      className="inline-block px-2 py-0.5 rounded-[20px] bg-cream-200 text-text-secondary text-[11px] font-medium hover:bg-cream-300 transition-colors"
                      title="Klik za ponovnu aktivaciju"
                    >
                      neaktivan · aktiviraj
                    </button>
                  )}
                </td>
                <td className={`${tdCls} text-right`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEdit(a);
                      setModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                    title="Uredi"
                  >
                    <IconPencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUUpotrebi(false);
                      setBrisi(a);
                    }}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
                    title="Obriši"
                  >
                    <IconTrash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ArtikalModal
        open={modalOpen}
        orgId={orgId}
        artikal={edit}
        onClose={() => setModalOpen(false)}
      />

      {/* kartica artikla: promet i stanje, ista kao na lageru */}
      <ArtikalKarticaModal
        orgId={orgId}
        artikalId={karticaId}
        onClose={() => setKarticaId(null)}
      />

      <UvozSifarnikaModal
        open={uvozOpen}
        onClose={() => setUvozOpen(false)}
        title="Uvoz artikala"
        opis="Uvoz šifarnika artikala iz drugih programa (XML ili CSV fajl). Artikli čija šifra već postoji se preskaču i ništa im se ne mijenja."
        parse={parseArtikliFile}
        uvezi={async (parsed) => {
          const r = await unwrap(uvozArtikala(orgId as number, parsed));
          qc.invalidateQueries({ queryKey: ["artikli", orgId] });
          return r;
        }}
      />

      <Modal
        open={brisi != null}
        onClose={() => setBrisi(null)}
        title="Brisanje artikla"
      >
        {brisi && (
          <div className="space-y-3">
            {uUpotrebi ? (
              <p className="text-[13px] text-text-primary">
                Artikal <strong>{brisi.naziv}</strong> je korišten na
                kalkulacijama pa se ne može obrisati. Možete ga deaktivirati:
                ostaje na starim kalkulacijama, ali se više ne nudi pri unosu.
              </p>
            ) : (
              <p className="text-[13px] text-text-primary">
                Obrisati artikal <strong>{brisi.naziv}</strong> (šifra{" "}
                {brisi.sifra})?
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setBrisi(null)}
                className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
              >
                Odustani
              </button>
              {uUpotrebi ? (
                <button
                  type="button"
                  disabled={updateM.isPending}
                  onClick={deaktiviraj}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Deaktiviraj
                </button>
              ) : (
                <button
                  type="button"
                  disabled={deleteM.isPending}
                  onClick={potvrdiBrisanje}
                  className="px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Obriši
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
