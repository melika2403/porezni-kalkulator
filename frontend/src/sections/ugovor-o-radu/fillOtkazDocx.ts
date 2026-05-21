import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export interface OtkazTemplateData {
  naslov2: string;
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

  return doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
