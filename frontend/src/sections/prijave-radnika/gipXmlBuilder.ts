// ─────────────────────────────────────────────────────────────────────────────
//  Shared builder za GIP-1022 XML — godišnji izvještaj. GIP treba sve mjesece
//  godine za sve radnike org-e, pa builder interno fetch-uje 12 mjeseci
//  payrolla paralelno (Promise.all). Za razliku od MIP-a koji je per-mjesec.
// ─────────────────────────────────────────────────────────────────────────────

import { getWorkers, type Organization } from "src/api/profile";
import { trackEvent } from "src/api/activity";
import { listPayrolls, type Payroll } from "src/api/payroll";
import {
  generateGip1022Xml,
  type Gip1022XmlData,
  type Gip1022XmlObrazac,
  type Gip1022XmlRow,
} from "./gip1022Xml";

export type GipBuildInput = {
  orgId: number;
  year: number;
  organization: Pick<
    Organization,
    "name" | "taxNumber" | "address" | "city" | "type"
  >;
};

export type GipBuildResult = {
  ok: true;
  xml: string;
  filename: string;
};

export type GipBuildError = {
  ok: false;
  error: string;
};

// Fetch-aj sve podatke i sklopi GIP XML. Vraća strukturisan rezultat.
export async function buildGip1022Xml(
  input: GipBuildInput,
): Promise<GipBuildResult | GipBuildError> {
  // statistika generisanja (admin Aktivnost); best-effort, ne blokira
  trackEvent("GIP_GENERATE", "GIP-1022 XML");

  const { orgId, year, organization } = input;

  // Fetch svih radnika org-a + sve 12 mjeseci payrolla paralelno.
  const [workersResp, ...monthsResp] = await Promise.all([
    getWorkers(orgId),
    ...Array.from({ length: 12 }, (_, i) => listPayrolls(orgId, year, i + 1)),
  ]);
  if (!workersResp.ok) {
    return { ok: false, error: workersResp.error || "Greška pri učitavanju radnika" };
  }
  const allWorkers = workersResp.data;

  // Grupiši payroll-e po radniku.
  const byWorker = new Map<number, Payroll[]>();
  for (let m = 0; m < 12; m++) {
    const r = monthsResp[m];
    if (!r.ok) continue;
    for (const p of r.data) {
      if (!byWorker.has(p.workerId)) byWorker.set(p.workerId, []);
      byWorker.get(p.workerId)!.push(p);
    }
  }
  for (const arr of byWorker.values()) arr.sort((a, b) => a.month - b.month);

  // Datum uplate: koristi stvarni paymentDate iz payroll-a (ono što user unese
  // u "Datum isplate"), a fallback je posljednji dan mjeseca ako nije postavljen.
  const lastDayIso = (y: number, m: number) => {
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  };

  const isObrt = organization.type === "BUSINESS";
  const obrasci: Gip1022XmlObrazac[] = [];

  for (const w of allWorkers) {
    if (isObrt && w.role === "VLASNIK") continue; // vlasnik obrta ide u 2002, ne GIP
    const payrolls = byWorker.get(w.id);
    if (!payrolls || payrolls.length === 0) continue;
    if (!payrolls.some((p) => Number(p.gross) > 0)) continue;

    const rows: Gip1022XmlRow[] = payrolls
      .filter((p) => Number(p.gross) > 0)
      .map((p) => {
        const bruto = Number(p.gross) || 0;
        const koristi = 0;
        const ukupanPrihod = bruto + koristi;
        const empPio = Number(p.empPio) || 0;
        const empZdr = Number(p.empZdravstvo) || 0;
        const empNezap = Number(p.empNezaposlenost) || 0;
        const empUkupno = empPio + empZdr + empNezap;
        const placaBezDopr = ukupanPrihod - empUkupno;
        const faktor = Number(p.taxCoefficient ?? 1);
        const iznosOdbitka = Number(p.deduction) || faktor * 300;
        const osnovicaPoreza = Math.max(0, placaBezDopr - iznosOdbitka);
        const iznosPoreza = Number(p.incomeTax) || osnovicaPoreza * 0.1;
        const neto = Number(p.net) || 0;
        return {
          mjesec: p.month,
          isplataZaMjesec: `${p.month}/${year}`,
          vrstaIsplate: "1",
          iznosNovac: ukupanPrihod,
          iznosStvari: 0,
          bruto,
          pio: empPio,
          zdr: empZdr,
          nezap: empNezap,
          ukupniDopr: empUkupno,
          placaBezDopr,
          faktor,
          iznosOdbitka,
          osnovicaPoreza,
          iznosPoreza,
          neto,
          datumUplate:
            (p.paymentDate ? String(p.paymentDate).slice(0, 10) : "") ||
            lastDayIso(year, p.month),
        };
      });

    if (rows.length === 0) continue;

    const sum = (key: keyof Omit<Gip1022XmlRow, "mjesec" | "isplataZaMjesec" | "vrstaIsplate" | "datumUplate" | "faktor">) =>
      rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);

    const adresaPrebivalista = [w.address, w.city].filter(Boolean).join(", ");
    obrasci.push({
      naziv: organization.name || "",
      adresaSjedista: [organization.address, organization.city]
        .filter(Boolean)
        .join(", "),
      jmbZaposlenika: w.jmbg || "",
      imeIPrezime: `${w.lastName} ${w.firstName}`.trim().toUpperCase(),
      adresaPrebivalista,
      poreznaGodina: year,
      rows,
      ukupno: {
        iznosNovac: sum("iznosNovac"),
        iznosStvari: 0,
        bruto: sum("bruto"),
        pio: sum("pio"),
        zdr: sum("zdr"),
        nezap: sum("nezap"),
        ukupniDopr: sum("ukupniDopr"),
        placaBezDopr: sum("placaBezDopr"),
        iznosOdbitka: sum("iznosOdbitka"),
        osnovicaPoreza: sum("osnovicaPoreza"),
        iznosPoreza: sum("iznosPoreza"),
        neto: sum("neto"),
      },
    });
  }

  if (obrasci.length === 0) {
    return { ok: false, error: "Nema obračunatih plata radnika za odabranu godinu" };
  }

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const xmlData: Gip1022XmlData = {
    jibPoslodavca: (organization.taxNumber || "").replace(/\D/g, ""),
    nazivPoslodavca: organization.name || "",
    brojZahtjeva: 1,
    datumPodnosenja: todayIso,
    obrasci,
  };

  const xml = generateGip1022Xml(xmlData);
  const jib = xmlData.jibPoslodavca || "GIP";
  const filename = `${jib}_1022_${year}.xml`;
  return { ok: true, xml, filename };
}
