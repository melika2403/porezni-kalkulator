// Memorandum organizacije (slika zaglavlja iz Postavki organizacije) za
// rješenja i odluke: isti fajl koji backend štampa na vrhu platne liste
// (payslipPdf.js, organizations.memorandumUrl). Ovdje se PDF i DOCX prave u
// pregledniku, pa se slika povuče sa backenda i ugradi na klijentu.
//
// Tip se određuje po SADRŽAJU (magic bytes), ne po nastavku: PNG nazvan .jpg
// bi inače pukao pri ugradnji. Dimenzije se čitaju iz zaglavlja fajla da bi
// se slika srazmjerno skalirala bez učitavanja u <img>.
import { backendUrl } from "src/api/invoices";

export type Memorandum = {
  bytes: Uint8Array;
  tip: "png" | "jpg";
  width: number;
  height: number;
};

const kes = new Map<string, Promise<Memorandum | null>>();

function dimenzijePng(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 24) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

function dimenzijeJpg(b: Uint8Array): { width: number; height: number } | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    // SOF0..SOF15 osim DHT (C4), JPG (C8) i DAC (CC) nose dimenzije
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
    }
    i += 2 + dv.getUint16(i + 2);
  }
  return null;
}

/**
 * Povuci memorandum organizacije i pripremi ga za ugradnju. Bilo koja greška
 * (nema fajla, nepoznat format, mreža) vraća null, pa dokument nosi obično
 * tekstualno zaglavlje, nikad ne pada. Rezultat se kešira po adresi.
 */
export function ucitajMemorandum(memorandumUrl: string | null | undefined): Promise<Memorandum | null> {
  if (!memorandumUrl) return Promise.resolve(null);
  const postojeci = kes.get(memorandumUrl);
  if (postojeci) return postojeci;
  const p = (async (): Promise<Memorandum | null> => {
    try {
      const res = await fetch(`${backendUrl()}${memorandumUrl}`, { credentials: "include" });
      if (!res.ok) return null;
      const bytes = new Uint8Array(await res.arrayBuffer());
      const jePng =
        bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      const jeJpg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
      if (!jePng && !jeJpg) return null;
      const dim = jePng ? dimenzijePng(bytes) : dimenzijeJpg(bytes);
      if (!dim || !dim.width || !dim.height) return null;
      return { bytes, tip: jePng ? "png" : "jpg", ...dim };
    } catch {
      return null;
    }
  })();
  kes.set(memorandumUrl, p);
  // neuspjeh se ne pamti, sljedeći pokušaj ide ponovo na server
  p.then((m) => {
    if (!m) kes.delete(memorandumUrl);
  });
  return p;
}

/** Opcije rendera dokumenta, dijeljene za PDF i DOCX graditelj. */
export type RjesenjeRenderOpcije = {
  /** Memorandum organizacije: zamjenjuje tekstualno zaglavlje firme na prvoj
   *  strani, kao na platnoj listi. null = obično zaglavlje. */
  memorandum?: Memorandum | null;
};

/** Skaliraj sliku na zadatu širinu, uz gornju granicu visine (centrira se). */
export function uklopiMemorandum(
  m: { width: number; height: number },
  sirina: number,
  maxVisina: number,
): { width: number; height: number } {
  let width = sirina;
  let height = (m.height / m.width) * width;
  if (height > maxVisina) {
    height = maxVisina;
    width = (m.width / m.height) * height;
  }
  return { width, height };
}
