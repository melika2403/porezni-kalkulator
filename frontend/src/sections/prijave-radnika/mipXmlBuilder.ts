// ─────────────────────────────────────────────────────────────────────────────
//  JEDINI builder za MIP-1023 XML: koriste ga obračun plata (ObracunPlata),
//  PK Office obračuni i pregled /organizacije. Ranije je ObracunPlata imao
//  svoju kopiju koja je za d.o.o. uključivala direktora, a ova nije, pa je MIP
//  sa pregleda organizacija izlazio bez direktora (ispravljeno 16.9.2026).
//
//  Logika je čista funkcija nad (workers, payrolls, organization, year, month).
//  Sve API-pozive radi caller; builder samo prima podatke i vraća XML+filename.
// ─────────────────────────────────────────────────────────────────────────────

import { kantonForOpcina } from "src/data/uplatni-racuni";
import { trackEvent } from "src/api/activity";
import type { Organization, Worker } from "src/api/profile";
import type { Payroll } from "src/api/payroll";
import {
  generateMip1023Xml,
  type Mip1023XmlData,
  type Mip1023XmlWorker,
} from "./mip1023Xml";

export type MipOrganization = Pick<
  Organization,
  "id" | "name" | "taxNumber" | "activityCode" | "city" | "type"
>;

export type MipBuildInput = {
  workers: Worker[]; // svi radnici org-e (ko ulazi u MIP bira ulaziUMip)
  payrolls: Payroll[]; // svi payroll-i za year/month
  organization: MipOrganization;
  year: number;
  month: number;
  paymentDate?: string; // YYYY-MM-DD; default zadnji dan mjeseca
};

/**
 * Ko ulazi u MIP, isto pravilo kao lista "radnici" na obračunu plata:
 * radnici (RADNIK) uvijek; vlasnik OBRTA nikad (on ide na Obrazac 2002);
 * vlasnik-direktor d.o.o. ulazi ako ima datum prijave (prijava = zaposlen u
 * toj firmi; bez prijave nije zaposlenik i backend mu briše prijavaDate).
 */
export function ulaziUMip(org: Pick<Organization, "type">, w: Worker): boolean {
  if (w.role === "RADNIK") return true;
  return org.type === "COMPANY" && w.role === "VLASNIK" && !!w.prijavaDate;
}

export type MipBuildResult = {
  ok: true;
  xml: string;
  filename: string;
  data: Mip1023XmlData;
};

export type MipBuildError = {
  ok: false;
  error: string;
};

// Sklopi MIP-1023 XML iz raw payroll snapshot-a. Vraća ok+xml+filename ili
// strukturisan error sa razlogom (no-payrolls, org-incomplete itd.).
export function buildMip1023Xml(input: MipBuildInput): MipBuildResult | MipBuildError {
  const { workers, payrolls, organization, year, month } = input;

  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  const lastDay = new Date(year, month, 0).getDate();
  const paymentDate =
    input.paymentDate || `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;

  // Spoji payroll snapshot sa radnikom, zadrži samo one koji ulaze u MIP
  // (ulaziUMip) i imaju stvaran obračun (gross > 0).
  const workerById = new Map<number, Worker>();
  for (const w of workers) workerById.set(w.id, w);
  const radniciPayrolls = payrolls
    .map((p) => ({ p, w: workerById.get(p.workerId) }))
    .filter(
      (x): x is { p: Payroll; w: Worker } =>
        !!x.w && ulaziUMip(organization, x.w) && (Number(x.p.gross) || 0) > 0,
    )
    .sort((a, b) => {
      const aDate = a.w.prijavaDate || a.w.startDate || "9999-12-31";
      const bDate = b.w.prijavaDate || b.w.startDate || "9999-12-31";
      return aDate.localeCompare(bDate);
    });

  if (radniciPayrolls.length === 0) {
    return { ok: false, error: "Nema obračunatih plata radnika za taj mjesec" };
  }

  const xmlWorkers: Mip1023XmlWorker[] = radniciPayrolls.map(({ w, p }) => {
    // p.gross je UKUPNA osnovica (plata + korist u naravi). Za MIP se bruto
    // (plata u novcu) i korist prikazuju odvojeno: BrutoPlaca = plata, Koristi =
    // bruto korist, UkupanPrihod = zbir (= p.gross).
    const koristi = Number(p.koristBruto) || 0;
    const bruto = +((Number(p.gross) || 0) - koristi).toFixed(2);
    const ukupanPrihod = +(bruto + koristi).toFixed(2);
    const empPio = Number(p.empPio) || 0;
    const empZdr = Number(p.empZdravstvo) || 0;
    const empNezap = Number(p.empNezaposlenost) || 0;
    const empUkupno = empPio + empZdr + empNezap;
    const prihodUmanjen = ukupanPrihod - empUkupno;
    const faktor = Number(p.taxCoefficient ?? 1);
    const iznosOdbitka = Number(p.deduction) || faktor * 300;
    const osnovicaPoreza = Math.max(0, prihodUmanjen - iznosOdbitka);
    const iznosPoreza = Number(p.incomeTax) || osnovicaPoreza * 0.1;
    const radniSati = p.workedMinutes
      ? Math.round((p.workedMinutes / 60) * 100) / 100
      : 168;
    const bolovanjeSati = (p.sickDays || 0) * 8;
    // RS radnik nema FBiH prebivalište: šifra općine ide sjedište poslodavca.
    const opcinaKod =
      w.prebivalisteEntitet === "RS"
        ? kantonForOpcina(organization.city || "")?.opcinaKod || ""
        : kantonForOpcina(w.city || "")?.opcinaKod || "";
    return {
      vrstaIsplate: "1",
      jmb: w.jmbg || "",
      imePrezime: `${w.lastName} ${w.firstName}`.trim().toUpperCase(),
      datumIsplate: paymentDate,
      radniSati,
      radniSatiBolovanje: bolovanjeSati,
      bruto,
      koristi,
      ukupanPrihod,
      pio: empPio,
      zo: empZdr,
      nezap: empNezap,
      doprinosi: empUkupno,
      prihodUmanjen,
      faktor,
      iznosOdbitka,
      osnovicaPoreza,
      iznosPoreza,
      radniSatiUT: 0,
      stepenUvecanja: 0,
      sifraRadnogMjestaUT: "000000",
      doprinosiPioMioZaUT: 0,
      beneficiraniStaz: false,
      opcinaPrebivalista: opcinaKod,
    };
  });

  const totals = {
    gross: radniciPayrolls.reduce((a, x) => a + (Number(x.p.gross) || 0), 0),
    empContrib: radniciPayrolls.reduce(
      (a, x) => a + (Number(x.p.empTotal) || 0),
      0,
    ),
    licniOdbitak: radniciPayrolls.reduce(
      (a, x) => a + (Number(x.p.deduction) || 0),
      0,
    ),
    tax: radniciPayrolls.reduce(
      (a, x) => a + (Number(x.p.incomeTax) || 0),
      0,
    ),
    erpPio: radniciPayrolls.reduce(
      (a, x) => a + (Number(x.p.erpPio) || 0),
      0,
    ),
    erpZdr: radniciPayrolls.reduce(
      (a, x) => a + (Number(x.p.erpZdravstvo) || 0),
      0,
    ),
    erpNezap: radniciPayrolls.reduce(
      (a, x) => a + (Number(x.p.erpNezaposlenost) || 0),
      0,
    ),
  };

  const periodOd = `${yyyy}-${mm}-01`;
  const periodDo = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const xmlData: Mip1023XmlData = {
    jibPoslodavca: (organization.taxNumber || "").replace(/\D/g, ""),
    nazivPoslodavca: organization.name || "",
    brojZahtjeva: 1,
    datumPodnosenja: todayIso,
    sifraDjelatnosti: organization.activityCode || "",
    periodOd,
    periodDo,
    workers: xmlWorkers,
    zbirno: {
      pio: totals.erpPio,
      zo: totals.erpZdr,
      nezap: totals.erpNezap,
      dodatniDoprinosiZo: 0,
      prihod: totals.gross,
      doprinosi: totals.empContrib,
      licniOdbici: totals.licniOdbitak,
      porez: totals.tax,
    },
  };

  const xml = generateMip1023Xml(xmlData);
  const jib = xmlData.jibPoslodavca || "MIP";
  const filename = `${jib}_${mm}${yyyy}.xml`;
  // Statistika generisanja (admin Aktivnost) TEK kad je XML stvarno sklopljen:
  // neuspio pokušaj se ne smije brojati, jer podsjetnik "MIP još nije preuzet"
  // na profilu gleda broj ovih događaja u mjesecu. Best-effort, ne blokira.
  trackEvent("MIP_GENERATE", "MIP-1023 XML", organization.id);
  return { ok: true, xml, filename, data: xmlData };
}

// Helper za browser download — kreira blob i triggers click.
export function downloadMipXmlBlob(xml: string, filename: string) {
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
