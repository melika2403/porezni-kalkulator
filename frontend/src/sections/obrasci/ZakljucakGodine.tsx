"use client";

// Zaključak godine: checklist zakonskih koraka na kraju poslovne godine.
// Statusi se izvode iz knjiga (popis, PLDI registar, spremljeni obrasci),
// a knjiženje godišnje amortizacije u KPR se pokreće odavde (interni izvod
// AM-YYYY na 31.12., kategorija AMORTIZACIJA → KPR kolona 19).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconInfoCircle,
  IconLoader2,
} from "@tabler/icons-react";
import { unwrap } from "src/api/auth";
import { listPopisi } from "src/api/lager";
import {
  getAmortizacija,
  getAmortKnjizenje,
  knjiziAmortizaciju,
} from "src/api/amortizacija";
import { getKpr } from "src/api/bankStatements";
import { listUlazniRacuni } from "src/api/partners";
import { listInvoices } from "src/api/invoices";
import { calcRow } from "src/sections/amortizacija/Amortizacija";
import { formatBAM } from "src/lib/format";

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000";

type Status = "done" | "todo" | "info";

function StatusIkona({ status }: { status: Status }) {
  if (status === "done") {
    return <IconCircleCheck size={19} className="text-success shrink-0" />;
  }
  if (status === "info") {
    return <IconInfoCircle size={19} className="text-info shrink-0" />;
  }
  return <IconCircleDashed size={19} className="text-warning shrink-0" />;
}

function Korak({
  status,
  naslov,
  opis,
  akcija,
}: {
  status: Status;
  naslov: string;
  opis: string;
  akcija?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-cream-200 last:border-0">
      <span className="mt-0.5">
        <StatusIkona status={status} />
      </span>
      <div className="flex-1 min-w-0">
        <div
          className={`text-[13px] font-medium ${
            status === "done" ? "text-text-tertiary" : "text-text-primary"
          }`}
        >
          {naslov}
        </div>
        <div className="text-[12px] text-text-tertiary mt-0.5">{opis}</div>
      </div>
      {akcija && <div className="shrink-0">{akcija}</div>}
    </div>
  );
}

const linkCls =
  "inline-flex items-center px-3 py-1.5 rounded-lg border border-cream-300 text-[12.5px] font-medium text-text-secondary hover:bg-cream-200 transition-colors";

export function ZakljucakGodine({
  orgId,
  orgName,
  year,
  sprSaved,
  gpdSaved,
  cokSaved,
  onsSaved,
}: {
  orgId: number;
  orgName: string;
  year: number;
  sprSaved: boolean;
  gpdSaved: boolean;
  cokSaved: boolean;
  onsSaved: boolean;
}) {
  const qc = useQueryClient();
  const [greska, setGreska] = useState<string | null>(null);
  const [arhivaBusy, setArhivaBusy] = useState(false);

  // Godišnja arhiva knjiga (ZIP): KPR-1041 + KUF + KIF za cijelu godinu.
  // PDF-ovi se grade client-side istim builderima kao na svojim stranicama.
  async function preuzmiArhivu() {
    setGreska(null);
    setArhivaBusy(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;

      // KPR-1041
      const kprRes = await getKpr(orgId, { from, to });
      if (kprRes.ok && kprRes.data) {
        const { fillKpr1041 } = await import("src/sections/kpr/fillKpr1041");
        const bytes = await fillKpr1041(kprRes.data);
        zip.file(`KPR-1041-${year}.pdf`, bytes);
      }

      // KUF (po datumu prijema) + KIF (izdane/naplaćene po datumu izdavanja)
      const { buildKufPdfBytes, buildKifPdfBytes } = await import(
        "src/sections/pdv/knjigaPdf"
      );
      const racuniRes = await listUlazniRacuni(orgId);
      const kufRows = (racuniRes.ok ? racuniRes.data : [])
        .filter((r) =>
          String(r.datumPrijema ?? r.datumRacuna ?? "").startsWith(
            String(year),
          ),
        )
        .sort((a, b) => {
          const da = a.datumPrijema ?? a.datumRacuna;
          const db = b.datumPrijema ?? b.datumRacuna;
          return String(da).localeCompare(String(db)) || a.id - b.id;
        });
      if (kufRows.length) {
        const kuf = await buildKufPdfBytes(kufRows, orgName, 1, year, 12);
        zip.file(kuf.fileName, kuf.bytes);
      }
      const invRes = await listInvoices({
        organizationId: orgId,
        type: "INVOICE",
      });
      const kifRows = (invRes.ok ? invRes.data : [])
        .filter(
          (i) =>
            (i.status === "ISSUED" || i.status === "PAID") &&
            String(i.issueDate ?? "").startsWith(String(year)),
        )
        .sort(
          (a, b) => a.issueDate.localeCompare(b.issueDate) || a.id - b.id,
        );
      if (kifRows.length) {
        const kif = await buildKifPdfBytes(kifRows, orgName, 1, year, 12);
        zip.file(kif.fileName, kif.bytes);
      }

      if (Object.keys(zip.files).length === 0) {
        setGreska(`Nema podataka za arhivu ${year}. godine.`);
        return;
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Arhiva-${orgName.replace(/[^\w\d-]+/g, "_")}-${year}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setGreska("Priprema arhive nije uspjela, pokušajte ponovo.");
    } finally {
      setArhivaBusy(false);
    }
  }

  // popis robe u godini (maloprodaja)
  const popisiQ = useQuery({
    queryKey: ["popisi", orgId],
    queryFn: () => unwrap(listPopisi(orgId)),
  });
  const imaPopisa = (popisiQ.data ?? []).length > 0;
  const popisGodine = (popisiQ.data ?? []).some(
    (p) => p.godina === year && p.status === "PROKNJIZEN" && !p.pocetnoStanje,
  );

  // PLDI registar + godišnji iznos amortizacije (ista logika kao obrazac)
  const pldiQ = useQuery({
    queryKey: ["amortizacija", orgId, year],
    queryFn: () => unwrap(getAmortizacija(String(year), orgId)),
  });
  // period obračuna: ručni period sa obrasca (obrt otvoren/zatvoren u toku
  // godine) ili cijela godina; knjiženje ide na kraj perioda
  const manual = pldiQ.data?.obveznik?.manualPeriod;
  const amortDoISO =
    manual && pldiQ.data?.obveznik.periodDo
      ? pldiQ.data.obveznik.periodDo
      : `${year}-12-31`;
  const amortIznos = useMemo(() => {
    const data = pldiQ.data;
    if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
      return null;
    }
    const od =
      manual && data.obveznik.periodOd
        ? data.obveznik.periodOd
        : `${year}-01-01`;
    let suma = 0;
    for (const row of data.rows) {
      const r = calcRow(row, od, amortDoISO);
      if (r.iznos != null) suma += r.iznos;
    }
    return Math.round(suma * 100) / 100;
  }, [pldiQ.data, year, manual, amortDoISO]);

  // knjiženje amortizacije u KPR
  const knjizenjeQ = useQuery({
    queryKey: ["amort-knjizenje", orgId, year],
    queryFn: () => unwrap(getAmortKnjizenje(orgId, year)),
  });
  const knjizeno = knjizenjeQ.data?.knjizeno === true;

  const knjiziM = useMutation({
    mutationFn: () =>
      unwrap(
        knjiziAmortizaciju({
          organizationId: orgId,
          godina: year,
          iznos: amortIznos ?? 0,
          // kraj perioda obračuna (obrt zatvoren u toku godine ne knjiži
          // na 31.12. nego na svoj kraj perioda)
          datum: amortDoISO,
        }),
      ),
    onSuccess: () => {
      setGreska(null);
      qc.invalidateQueries({ queryKey: ["amort-knjizenje", orgId, year] });
      qc.invalidateQueries({ queryKey: ["kpr", orgId] });
      qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "VEC_KNJIZENO") {
        qc.invalidateQueries({ queryKey: ["amort-knjizenje", orgId, year] });
        return;
      }
      setGreska("Knjiženje amortizacije nije uspjelo, pokušajte ponovo.");
    },
  });

  const rokSljedeca = year + 1;

  return (
    <section className="mt-6 rounded-xl bg-cream-100 border border-cream-300 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif-display text-[19px] text-text-primary">
            Zaključak godine {year}.
          </h2>
          <p className="text-[12.5px] text-text-tertiary mb-2">
            Zakonski koraci na kraju poslovne godine; status se izvodi iz
            knjiga.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void preuzmiArhivu()}
          disabled={arhivaBusy}
          title={`ZIP sa knjigama godine: KPR-1041, KUF i KIF za ${year}. (za arhivu ili inspekciju)`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 text-[12.5px] font-medium text-text-secondary hover:bg-cream-200 transition-colors disabled:opacity-50"
        >
          {arhivaBusy && <IconLoader2 size={14} className="animate-spin" />}
          {arhivaBusy ? "Pripremam arhivu..." : "Arhiva godine (ZIP)"}
        </button>
      </div>

      <Korak
        status={popisGodine ? "done" : imaPopisa ? "todo" : "info"}
        naslov={`Popis robe na 31.12.${year}.`}
        opis={
          popisGodine
            ? "Popis za godinu je proknjižen."
            : "Obavezan za maloprodaju: popisom se roba razdužuje i utvrđuje manjak/višak."
        }
        akcija={
          <Link href="/app/lager?tab=popisi" className={linkCls}>
            Otvori popise
          </Link>
        }
      />

      <Korak
        status={
          amortIznos != null && amortIznos > 0
            ? "done"
            : pldiQ.data
              ? "todo"
              : "info"
        }
        naslov="Obračun amortizacije (PLDI registar)"
        opis={
          amortIznos != null && amortIznos > 0
            ? `Godišnja amortizacija: ${formatBAM(amortIznos)}.`
            : pldiQ.data
              ? "Registar postoji, ali obračun daje 0: provjerite stope i vrijednosti."
              : "Ako obrt ima opremu/vozila, vodi se registar stalnih sredstava."
        }
        akcija={
          <Link href="/app/stalna-sredstva" className={linkCls}>
            Otvori registar
          </Link>
        }
      />

      <Korak
        status={knjizeno ? "done" : amortIznos && amortIznos > 0 ? "todo" : "info"}
        naslov="Amortizacija proknjižena u KPR"
        opis={
          knjizeno
            ? `Proknjiženo${knjizenjeQ.data?.iznos != null ? ` ${formatBAM(knjizenjeQ.data.iznos)}` : ""} (interni izvod AM-${year}).`
            : `Amortizacija perioda ide u KPR ostale rashode na kraj perioda (${amortDoISO.split("-").reverse().join(".")}.) kao nenovčani rashod.`
        }
        akcija={
          !knjizeno && amortIznos != null && amortIznos > 0 ? (
            <button
              type="button"
              onClick={() => knjiziM.mutate()}
              disabled={knjiziM.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {knjiziM.isPending && (
                <IconLoader2 size={14} className="animate-spin" />
              )}
              Proknjiži {formatBAM(amortIznos)}
            </button>
          ) : undefined
        }
      />

      <Korak
        status="info"
        naslov={`GIP-1022 za ${year}.`}
        opis={`Godišnji izvještaj o isplaćenim plaćama: predaja do 31.01.${rokSljedeca}.`}
        akcija={
          <a
            href={`${MARKETING_URL}/prijave-radnika?tab=obracun`}
            className={linkCls}
          >
            Otvori obračun plata
          </a>
        }
      />

      <Korak
        status={sprSaved ? "done" : "todo"}
        naslov={`SPR-1053 za ${year}.`}
        opis={`Specifikacija uz godišnju prijavu, iz KPR-a: predaja do 31.03.${rokSljedeca}. Kartica je iznad na ovoj stranici.`}
      />

      <Korak
        status={gpdSaved ? "done" : "todo"}
        naslov={`GPD-1051 za ${year}.`}
        opis={`Godišnja prijava dohotka: predaja do 31.03.${rokSljedeca}. Priprema se iz spremljenog SPR-a.`}
      />

      <Korak
        status={cokSaved && onsSaved ? "done" : cokSaved || onsSaved ? "todo" : "info"}
        naslov="ČOK i ONŠ (kantonalne naknade)"
        opis={
          cokSaved && onsSaved
            ? "Oba obračuna su spremljena."
            : "Članarina komori i naknada za šume: pripremite po potrebi (kartice iznad)."
        }
      />

      {greska && (
        <p className="text-[12.5px] text-accent-500 mt-2">{greska}</p>
      )}
    </section>
  );
}
