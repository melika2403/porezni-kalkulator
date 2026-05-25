import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import {
  applyDocxXmlTransform,
  removeSignatureTableBorders,
} from "./docxPostProcess";

export interface UorTemplateData {
  tip_ugovora: string;
  /** Naslov: ako probni_rad_block, ide "UGOVOR O PROBNOM RADU" bez podnaslova. */
  probni_rad_block: boolean;
  /** Cijeli tekst Člana 1 (sastavlja se u kodu, uključuje i probni rad ako je on uključen). */
  clan_1_tekst: string;
  broj_ugovora: string;
  naziv_firme: string;
  grad: string;
  adresa_poslodavca: string;
  jib_poslodavca: string;
  ime_poslodavca: string;
  ime_radnika: string;
  jmbg_radnika: string;
  adresa_radnika: string;
  datum_pocetka_rada: string;
  radno_mjesto: string;
  mjesto_rada: string;
  clan_plate: string;
  otkazni_rok: string;
  datum_ugovora: string;
}

export async function fillUorDocx(data: UorTemplateData): Promise<Blob> {
  const res = await fetch("/templates/Ugovor_o_radu_template_.docx");
  const buf = await res.arrayBuffer();

  const zip = new PizZip(buf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });

  doc.render(data);

  // Skini border-e sa signature tabele — ostavi samo linije za potpis
  // ("Za Poslodavca" / "Radnik"), bez vidljive kutije oko njih. Stranice
  // se ne kompaktiraju jer ugovor o radu može legitimno imati više članova
  // i preliti se preko više stranica.
  applyDocxXmlTransform(doc.getZip(), removeSignatureTableBorders);

  return doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
