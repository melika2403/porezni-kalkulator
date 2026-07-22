"use client";

// Zbirni obračun uz KPR: INFORMATIVNI pregled poslovanja za period (za
// banku/klijenta, nije zvanični obrazac). Prihodi i rashodi po kategorijama
// iz potvrđenih transakcija (isti izvor kao KPR, neto bez PDV-a za
// obveznike), amortizacija iz PLDI srazmjerno mjesecima perioda, porez na
// dohodak informativno 10% + akontacije sa izvoda.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Modal } from "src/components/app-shell/Modal";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { getKpr, searchBankTransactions } from "src/api/bankStatements";
import { getAmortizacija } from "src/api/amortizacija";
import { calcRow } from "src/sections/amortizacija/Amortizacija";
import { BANK_CATEGORIES } from "src/lib/bankCategories";
import { unwrap } from "src/api/auth";
import { formatBAM } from "src/lib/format";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const datumHr = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
};

const CAT_LABEL = new Map(BANK_CATEGORIES.map((c) => [c.id, c.label]));

type Zbirni = {
  obveznik: { naziv: string; jib: string; adresa: string };
  isPdvObveznik: boolean;
  prihodi: { label: string; iznos: number }[];
  rashodi: { label: string; iznos: number }[];
  ukupnoPrihodi: number;
  ukupnoRashodi: number;
  dobit: number;
  porez: number;
  akontacije: number;
  razlika: number;
};

// mjeseci perioda koji padaju u datu godinu (za srazmjernu amortizaciju)
function mjeseciUGodini(from: string, to: string, year: number): number {
  const start = from.slice(0, 4) === String(year) ? Number(from.slice(5, 7)) : 1;
  const end = to.slice(0, 4) === String(year) ? Number(to.slice(5, 7)) : 12;
  if (to.slice(0, 4) < String(year) || from.slice(0, 4) > String(year)) return 0;
  return Math.max(0, end - start + 1);
}

async function loadZbirni(
  orgId: number,
  from: string,
  to: string,
): Promise<Zbirni> {
  const godine: number[] = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) {
    godine.push(y);
  }
  const [kpr, akontacijeRes, ...amortRes] = await Promise.all([
    unwrap(getKpr(orgId, { from, to })),
    searchBankTransactions(orgId, {
      category: "POREZ_DOHODAK_VLASNIKA",
      status: "CONFIRMED",
      direction: "OUT",
      dateFrom: from,
      dateTo: to,
      limit: 500,
    }),
    ...godine.map((y) => getAmortizacija(String(y), orgId)),
  ]);

  // grupisanje KPR redova po kategoriji: k15 = prihod (neto), k21 = rashod
  const prihodiMap = new Map<string, number>();
  const rashodiMap = new Map<string, number>();
  for (const row of kpr.rows) {
    if (row.k15 > 0) {
      prihodiMap.set(
        row.kategorija,
        r2((prihodiMap.get(row.kategorija) ?? 0) + row.k15),
      );
    }
    if (row.k21 > 0) {
      rashodiMap.set(
        row.kategorija,
        r2((rashodiMap.get(row.kategorija) ?? 0) + row.k21),
      );
    }
  }
  const prihodi = [...prihodiMap.entries()]
    .map(([id, iznos]) => ({ label: CAT_LABEL.get(id) ?? id, iznos }))
    .sort((a, b) => b.iznos - a.iznos);
  const rashodi = [...rashodiMap.entries()]
    .map(([id, iznos]) => ({ label: CAT_LABEL.get(id) ?? id, iznos }))
    .sort((a, b) => b.iznos - a.iznos);

  // amortizacija iz PLDI, srazmjerno mjesecima perioda po godini
  let amort = 0;
  amortRes.forEach((res, i) => {
    if (!res.ok || !res.data?.rows?.length) return;
    const y = godine[i];
    const od = res.data.obveznik?.periodOd || `${y}-01-01`;
    const doo = res.data.obveznik?.periodDo || `${y}-12-31`;
    const godisnja = res.data.rows.reduce(
      (a, row) => a + (calcRow(row, od, doo).iznos ?? 0),
      0,
    );
    amort = r2(amort + (godisnja * mjeseciUGodini(from, to, y)) / 12);
  });
  if (amort > 0) {
    rashodi.push({ label: "Troškovi amortizacije (iz PLDI)", iznos: amort });
  }

  const ukupnoPrihodi = r2(prihodi.reduce((a, p) => a + p.iznos, 0));
  const ukupnoRashodi = r2(rashodi.reduce((a, p) => a + p.iznos, 0));
  const dobit = r2(ukupnoPrihodi - ukupnoRashodi);
  const porez = dobit > 0 ? r2(dobit * 0.1) : 0;
  const akontacije = akontacijeRes.ok
    ? r2(
        (akontacijeRes.data.items ?? []).reduce(
          (a, t) => a + (Number(t.amount) || 0),
          0,
        ),
      )
    : 0;

  return {
    obveznik: kpr.obveznik,
    isPdvObveznik: kpr.isPdvObveznik,
    prihodi,
    rashodi,
    ukupnoPrihodi,
    ukupnoRashodi,
    dobit,
    porez,
    akontacije,
    razlika: r2(porez - akontacije),
  };
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

async function downloadZbirniPdf(z: Zbirni, from: string, to: string) {
  const A4: [number, number] = [595.28, 841.89];
  const M = 46;
  const INK = rgb(0, 0, 0);
  const fontBytes = await fetch("/templates/arial.ttf").then((r) =>
    r.arrayBuffer(),
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  let page = doc.addPage(A4);
  let y = A4[1] - M - 10;

  const text = (t: string, x: number, s: number, bold = false) => {
    page.drawText(t, { x, y, size: s, font, color: INK });
    if (bold) page.drawText(t, { x: x + 0.3, y, size: s, font, color: INK });
  };
  // varijante redova: obični, ukupno (siva traka, veći font) i rezultat
  // (dobit/gubitak, najistaknutiji)
  const red = (
    label: string,
    value: string,
    variant: "normal" | "ukupno" | "rezultat" = "normal",
  ) => {
    if (y < M + 46) {
      page = doc.addPage(A4);
      y = A4[1] - M - 10;
    }
    const istaknut = variant !== "normal";
    const s = variant === "rezultat" ? 11.5 : variant === "ukupno" ? 10.5 : 9;
    if (istaknut) {
      // razmak prije istaknutog reda + siva pozadinska traka
      y -= 4;
      page.drawRectangle({
        x: M,
        y: y - 7,
        width: A4[0] - 2 * M,
        height: s + 11,
        color: rgb(0.92, 0.91, 0.88),
      });
    }
    text(label, M + (istaknut ? 6 : 14), s, istaknut);
    const vw = font.widthOfTextAtSize(value, s);
    text(value, A4[0] - M - (istaknut ? 6 : 0) - vw, s, istaknut);
    y -= 7;
    page.drawLine({
      start: { x: M, y },
      end: { x: A4[0] - M, y },
      thickness: istaknut ? 1.1 : 0.4,
      color: INK,
    });
    y -= istaknut ? 19 : 15;
  };

  text(z.obveznik.naziv, M, 11, true);
  y -= 13;
  if (z.obveznik.adresa) {
    text(z.obveznik.adresa, M, 8.5);
    y -= 11;
  }
  if (z.obveznik.jib) {
    text(`Identifikacijski broj: ${z.obveznik.jib}`, M, 8.5);
    y -= 11;
  }
  text(z.isPdvObveznik ? "PDV obveznik" : "Nije PDV obveznik", M, 8.5);
  y -= 16;

  const title = "ZBIRNI OBRAČUN UZ KNJIGU PRIHODA I RASHODA";
  const tw = font.widthOfTextAtSize(title, 12.5);
  text(title, (A4[0] - tw) / 2, 12.5, true);
  y -= 14;
  const sub = `za period od ${datumHr(from)} do ${datumHr(to)} godine`;
  const sw = font.widthOfTextAtSize(sub, 9);
  text(sub, (A4[0] - sw) / 2, 9);
  y -= 12;
  const nap = "Informativni pregled poslovanja, nije zvanični obrazac.";
  const nw = font.widthOfTextAtSize(nap, 7.5);
  text(nap, (A4[0] - nw) / 2, 7.5);
  y -= 16;
  page.drawLine({
    start: { x: M, y },
    end: { x: A4[0] - M, y },
    thickness: 1,
    color: INK,
  });
  y -= 18;

  for (const p of z.prihodi) red(p.label, km(p.iznos));
  red("UKUPNO PRIHODI", km(z.ukupnoPrihodi), "ukupno");
  for (const p of z.rashodi) red(p.label, km(p.iznos));
  red("UKUPNO RASHODI", km(z.ukupnoRashodi), "ukupno");
  red("DOBIT", z.dobit >= 0 ? km(z.dobit) : "NEMA DOBITI", "rezultat");
  red("GUBITAK", z.dobit < 0 ? km(-z.dobit) : "NEMA GUBITKA", "rezultat");
  red("Osnovica za oporezivanje (informativno)", km(Math.max(z.dobit, 0)));
  red("Porez na dohodak 10% (informativno)", km(z.porez));
  red("Uplaćene akontacije poreza u periodu", km(z.akontacije));
  red(
    z.razlika >= 0 ? "Razlika za uplatu (informativno)" : "Razlika za povrat (informativno)",
    km(Math.abs(z.razlika)),
  );

  y -= 8;
  text(
    "Napomena: porez je informativan (10% na dobit, bez ličnog odbitka i pravila SPR/GPD obrasca).",
    M,
    7.5,
  );
  y -= 30;
  const potpisLabel = "Poreski obveznik:";
  const pw = font.widthOfTextAtSize(potpisLabel, 9);
  text(potpisLabel, A4[0] - M - 200 + (200 - pw) / 2, 9);
  y -= 26;
  page.drawLine({
    start: { x: A4[0] - M - 200, y },
    end: { x: A4[0] - M, y },
    thickness: 0.7,
    color: INK,
  });
  let naz = z.obveznik.naziv;
  while (naz.length > 1 && font.widthOfTextAtSize(naz, 8) > 200) {
    naz = naz.slice(0, -1);
  }
  page.drawText(naz, {
    x: A4[0] - M - 200 + (200 - font.widthOfTextAtSize(naz, 8)) / 2,
    y: y - 11,
    size: 8,
    font,
    color: INK,
  });

  const bytes = await doc.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Zbirni-obracun-${from}-${to}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── modal ───────────────────────────────────────────────────────────────────

export function ZbirniObracunModal({
  orgId,
  open,
  onClose,
}: {
  orgId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const godina = new Date().getFullYear();
  const [odS, setOdS] = useState(`01.01.${godina}.`);
  const [doS, setDoS] = useState(todayFormatted());
  const from = parseDateInput(odS);
  const to = parseDateInput(doS);
  const [pdfBusy, setPdfBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["zbirni-obracun", orgId, from, to],
    queryFn: () => loadZbirni(orgId as number, from as string, to as string),
    enabled: open && orgId != null && from != null && to != null && from <= to,
  });

  async function pdf() {
    if (!data || !from || !to || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadZbirniPdf(data, from, to);
    } finally {
      setPdfBusy(false);
    }
  }

  const rowCls =
    "flex items-center justify-between gap-3 px-3 py-1.5 border-b border-cream-300 last:border-b-0 text-[12.5px]";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Zbirni obračun (pregled poslovanja)"
      maxWidthClass="max-w-[640px]"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
              Od datuma
            </div>
            <PkDateInput
              value={odS}
              onChange={setOdS}
              ariaLabel="Period od"
              className="w-[150px]"
              inputClassName="bg-cream-50"
            />
          </div>
          <div>
            <div className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
              Do datuma
            </div>
            <PkDateInput
              value={doS}
              onChange={setDoS}
              ariaLabel="Period do"
              className="w-[150px]"
              inputClassName="bg-cream-50"
            />
          </div>
          <button
            type="button"
            onClick={pdf}
            disabled={!data || pdfBusy}
            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pdfBusy ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Preuzmi PDF
          </button>
        </div>

        {isLoading && (
          <p className="inline-flex items-center gap-2 text-[13px] text-text-tertiary">
            <IconLoader2 size={16} className="animate-spin" />
            Računam pregled...
          </p>
        )}

        {data && (
          <div className="rounded-xl border border-cream-300 bg-cream-50 max-h-[52vh] overflow-y-auto">
            {data.prihodi.map((p, i) => (
              <div key={`p-${i}`} className={rowCls}>
                <span className="text-text-primary">{p.label}</span>
                <span className="tabular-nums">{formatBAM(p.iznos)}</span>
              </div>
            ))}
            <div className={`${rowCls} font-semibold bg-cream-200/60`}>
              <span>UKUPNO PRIHODI</span>
              <span className="tabular-nums">
                {formatBAM(data.ukupnoPrihodi)}
              </span>
            </div>
            {data.rashodi.map((p, i) => (
              <div key={`r-${i}`} className={rowCls}>
                <span className="text-text-primary">{p.label}</span>
                <span className="tabular-nums">{formatBAM(p.iznos)}</span>
              </div>
            ))}
            <div className={`${rowCls} font-semibold bg-cream-200/60`}>
              <span>UKUPNO RASHODI</span>
              <span className="tabular-nums">
                {formatBAM(data.ukupnoRashodi)}
              </span>
            </div>
            <div className={`${rowCls} font-semibold`}>
              <span>{data.dobit >= 0 ? "DOBIT" : "GUBITAK"}</span>
              <span
                className={`tabular-nums ${data.dobit >= 0 ? "text-brand-700" : "text-accent-500"}`}
              >
                {formatBAM(Math.abs(data.dobit))}
              </span>
            </div>
            <div className={rowCls}>
              <span>Porez na dohodak 10% (informativno)</span>
              <span className="tabular-nums">{formatBAM(data.porez)}</span>
            </div>
            <div className={rowCls}>
              <span>Uplaćene akontacije poreza u periodu</span>
              <span className="tabular-nums">
                {formatBAM(data.akontacije)}
              </span>
            </div>
            <div className={rowCls}>
              <span>
                {data.razlika >= 0
                  ? "Razlika za uplatu (informativno)"
                  : "Razlika za povrat (informativno)"}
              </span>
              <span className="tabular-nums">
                {formatBAM(Math.abs(data.razlika))}
              </span>
            </div>
          </div>
        )}

        <p className="text-[11.5px] text-text-tertiary">
          Informativni pregled za banku/klijenta, nije zvanični obrazac.
          Iznosi su iz potvrđenih transakcija (kao KPR
          {data?.isPdvObveznik ? ", bez PDV-a" : ""}), amortizacija iz PLDI
          srazmjerno periodu, a porez je gruba procjena (bez ličnog odbitka;
          pravi obračun radi SPR/GPD).
        </p>
      </div>
    </Modal>
  );
}
