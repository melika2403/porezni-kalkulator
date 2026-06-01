// ─────────────────────────────────────────────────────────────────────────────
//  Post-processori za docx fajlove koji se generišu kroz docxtemplater.
//
//  Templates su statički Word fajlovi sa `{{placeholder}}` markerima. Sve što
//  ne možemo izraziti kroz placeholder-e (margine, stilovi tabele, dodatni
//  razmaci) rješavamo XML manipulacijom NAKON render-a.
//
//  Funkcije primaju sirovi `document.xml` string i vraćaju modifikovan.
// ─────────────────────────────────────────────────────────────────────────────

// Eksplicitno "nema border-a" za sve strane tabele (top/left/bottom/right + interni).
// Ubacuje se kao prvo dijete u <w:tblPr> i nadjačava bilo koji `TableGrid` stil.
const NO_BORDERS_BLOCK =
  '<w:tblBorders>' +
  '<w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '<w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '<w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '<w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '<w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '<w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '</w:tblBorders>';

// Skida vidljive granice sa signature tabele — Word template ima `TableGrid`
// stil koji crta okvir oko 2 ćelije ("Za Poslodavca" / "Potpis Radnika"),
// što ostavlja "kutiju" oko potpisa. Mi želimo samo linije za potpis (donji
// underscore-ovi koji već postoje), bez boxa.
//
// Koristimo se i u otkazu i u ugovoru o radu — oba template-a koriste isti
// `TableGrid` pristup za potpise.
export function removeSignatureTableBorders(xml: string): string {
  let out = xml;
  // 1) Skini `<w:tblStyle w:val="TableGrid"/>` (sa ili bez razmaka).
  out = out.replace(/<w:tblStyle\s+w:val="TableGrid"\s*\/>/g, "");
  // 2) Eksplicitno ubaci no-borders u svaki preostali <w:tblPr> — pokriva i
  // edge-case kad style nije bio "TableGrid" ali ima inline border.
  out = out.replace(/<w:tblPr>/g, `<w:tblPr>${NO_BORDERS_BLOCK}`);
  return out;
}

// Pomjera DESNI signature stupac dalje udesno tako da "Potpis Radnika" stoji
// iznad right-aligned Datum reda na dnu odluke. Template ima dva 4320-twips
// stupca (jednake širine) — širimo prvi na 6480 (~11,4 cm) i sužavamo drugi
// na 3240 (~5,7 cm), bez promjene ukupne širine tabele (9720 twips). Tako se
// drugi stupac startuje 2160 twips (~3,8 cm) više udesno od originala. Linija
// za potpis (~2640 twips) stane unutar nove širine drugog stupca.
export function shiftSignatureColumnsRight(xml: string): string {
  let out = xml;
  // 1) tblGrid: prvi stupac širi, drugi uži.
  out = out.replace(
    '<w:gridCol w:w="4320"/><w:gridCol w:w="4320"/>',
    '<w:gridCol w:w="6480"/><w:gridCol w:w="3240"/>',
  );
  // 2) Po redu tabele — prvi tc je col1 (širi), drugi tc je col2 (uži).
  // Pratimo redoslijed unutar svake <w:tr> i postavljamo nove širine po poziciji.
  out = out.replace(/<w:tr>[\s\S]*?<\/w:tr>/g, (rowMatch) => {
    let cellIndex = 0;
    return rowMatch.replace(
      /<w:tcW w:type="dxa" w:w="4320"\/>/g,
      () => {
        const isFirstCell = cellIndex === 0;
        cellIndex++;
        return isFirstCell
          ? '<w:tcW w:type="dxa" w:w="6480"/>'
          : '<w:tcW w:type="dxa" w:w="3240"/>';
      },
    );
  });
  return out;
}

// Smanjuje page margine i razmake paragrafa — koristi se SAMO za otkaz koji
// mora stati na jednu stranicu. Ugovor o radu legitimno može imati više
// stranica (više članova) pa ne pozivamo ovu funkciju za njega.
//
// Twips reference: 1 cm ≈ 567 twips. Standardne Word margine = 2.54 cm = 1440.
// Naše smanjene: top/bottom = 720 twips (1.27 cm), left/right = 1134 (2 cm).
export function compactPaperSpacing(xml: string): string {
  let out = xml;
  // Page margine — prepiši cijeli pgMar tag na manje vrijednosti.
  out = out.replace(
    /<w:pgMar\b[^/]*\/>/g,
    '<w:pgMar w:top="720" w:right="1134" w:bottom="720" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>',
  );
  // Paragraph spacing — w:before → 0, w:after → 60. w:line ostaje netaknut
  // (to bi diralo font/visinu reda).
  out = out.replace(/<w:spacing\b[^/>]*\/?>/g, (match) => {
    let m = match;
    m = m.replace(/\sw:before="\d+"/g, ' w:before="0"');
    m = m.replace(/\sw:after="\d+"/g, ' w:after="60"');
    return m;
  });
  // Skini "prazne" paragrafe (`<w:p><w:r><w:br/></w:r></w:p>`) — to su line
  // break-ovi između sekcija koje template ima ali nam tro­še vertikalnu
  // visinu. Nakon ovoga Dostavljeno / potpisi se podižu.
  out = out.replace(/<w:p><w:r><w:br\/><\/w:r><\/w:p>/g, "");
  // Dodaj jedan spacer paragraf prije signature tabele — daje malo praznog
  // prostora između "Dostavljeno" bloka i potpisa. w:after=300 (~5.3 mm)
  // umjereno proširi gap bez vraćanja na 2 stranice.
  out = out.replace(
    /<w:tbl>/,
    '<w:p><w:pPr><w:spacing w:before="0" w:after="300" w:line="240" w:lineRule="auto"/></w:pPr></w:p><w:tbl>',
  );
  return out;
}

// Smanjuje default line/paragraph spacing u styles.xml. Mnogi paragrafi u
// template-u NEMAJU eksplicitno <w:spacing> u document.xml, pa nasljeđuju
// vrijednosti iz `<w:pPrDefault>` (Word default = 1.15 line + 200 twips after).
// Bez ove izmjene compactPaperSpacing u document.xml ne dotiče te paragrafe
// i odluka i dalje ide na 2 stranice.
//
// Postavljamo:
//   • w:line="240" + w:lineRule="auto"  → 1.0 single spacing (čitljivo, ne
//                                          previše zbijeno)
//   • w:after="100"                      → ~1.8 mm razmak ispod paragrafa
//                                          (umjereno, ne tjesno kao 60)
export function compactStylesSpacing(xml: string): string {
  let out = xml;
  // Pattern hvata `<w:spacing ... />` unutar bilo kog stila — uključujući
  // docDefaults i sve named stilove (Normal, Heading, itd.).
  out = out.replace(/<w:spacing\b[^/>]*\/?>/g, (match) => {
    let m = match;
    m = m.replace(/\sw:before="\d+"/g, ' w:before="0"');
    m = m.replace(/\sw:after="\d+"/g, ' w:after="100"');
    m = m.replace(/\sw:line="\d+"/g, ' w:line="240"');
    // lineRule="auto" je već default; ostavi ga ako je već postavljen.
    return m;
  });
  return out;
}

// Helper za read+write document.xml unutar PizZip-a.
// Vraća true ako je XML pronađen i modifikovan.
export function applyDocxXmlTransform(
  zip: { file: (path: string) => { asText: () => string } | null } & {
    file: (path: string, content: string) => void;
  },
  transform: (xml: string) => string,
  xmlPath: string = "word/document.xml",
): boolean {
  const file = zip.file(xmlPath);
  if (!file) return false;
  const xml = file.asText();
  zip.file(xmlPath, transform(xml));
  return true;
}
