// Zipovanje spiska za banku u .xlsx (pizzip, isti pristup kao docx šabloni).
// Sadržaj tabele gradi spisakBanke.ts (bez importa, radi backend testova).
import PizZip from "pizzip";
import { xlsxDijelovi, type SpisakTabela } from "./spisakBanke";

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function napraviXlsxBlob(tabela: SpisakTabela): Blob {
  const zip = new PizZip();
  const dijelovi = xlsxDijelovi(tabela);
  for (const [putanja, sadrzaj] of Object.entries(dijelovi)) {
    zip.file(putanja, sadrzaj);
  }
  return zip.generate({ type: "blob", mimeType: XLSX_MIME });
}
