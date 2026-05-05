import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export interface UodTemplateData {
  brojUgovora: string;
  datumFormatted: string;
  mjestoZakljucenja: string;
  naruciIme: string;
  naruciAdresa: string;
  naruciId: string;
  izvrIme: string;
  izvrAdresa: string;
  izvrJmbg: string;
  izvrZiro: string;
  predmet: string;
  rok: string;
  netoFmt: string;
  iznosSlovima: string;
  nadlezniSud: string;
}

export async function fillUodDocx(data: UodTemplateData): Promise<Blob> {
  const res = await fetch("/templates/ugovor-o-djelu.docx");
  const buf = await res.arrayBuffer();

  const zip = new PizZip(buf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  doc.render(data);

  const out = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return out;
}
