import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import {
  applyDocxXmlTransform,
  compactPaperSpacing,
  compactStylesSpacing,
  removeSignatureTableBorders,
  shiftSignatureColumnsRight,
} from "./docxPostProcess";

export interface OtkazTemplateData {
  naslov2: string;
  // Fraza za preambulu "Na osnovu __ Zakona o radu FBiH..."
  // Npr. "člana 96. stav (1) tačka a)" — bez tačke na kraju.
  pravna_osnova: string;
  naziv_firme: string;
  adresa_poslodavca: string;
  jib_poslodavca: string;
  ime_poslodavca: string;
  datum_odluke: string;
  broj_ugovora: string;
  datum_ugovora: string;
  ime_radnika: string;
  jmbg_radnika: string;
  adresa_radnika: string;
  nacin_prestanka: string;
  datum_prestanka: string;
  razlog_otkaza: string;
}

export async function fillOtkazDocx(data: OtkazTemplateData): Promise<Blob> {
  const res = await fetch("/templates/Otkaz_ugovora_template.docx");
  const buf = await res.arrayBuffer();

  const zip = new PizZip(buf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });

  doc.render(data);

  // Post-process NAKON render-a:
  //   1) Skini border-e sa signature tabele (samo linija, bez kutije).
  //   2) Pomjeri desni signature stupac dalje udesno (iznad Datum reda).
  //   3) Smanji margine i prazne paragrafe u document.xml.
  //   4) Smanji default line spacing u styles.xml — bez ovoga paragrafi bez
  //      eksplicitnog <w:spacing> nasljeđuju Word default 1.15 i odluka i
  //      dalje ide na 2 stranice.
  const zipOut = doc.getZip();
  applyDocxXmlTransform(zipOut, (xml) =>
    compactPaperSpacing(
      shiftSignatureColumnsRight(removeSignatureTableBorders(xml)),
    ),
  );
  applyDocxXmlTransform(zipOut, compactStylesSpacing, "word/styles.xml");

  return doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
