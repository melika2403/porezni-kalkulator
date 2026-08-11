// Poštanski brojevi gradova/općina BiH za mjesto platioca u Raiffeisen SM
// zaglavlju (Com_Soft piše "77220 CAZIN", potvrđeno u originalnim datotekama
// koje novo RBBHnet online bankarstvo prima). Lookup je po nazivu grada,
// neosjetljiv na velika/mala slova i kvačice. Grad koji nije u šifarniku
// prolazi BEZ poštanskog broja (staro ponašanje), pa se šifarnik slobodno
// dopunjava kad iskoči novi grad.
const PTT_PO_GRADU = {
  // Unsko-sanski kanton
  BIHAC: "77000",
  CAZIN: "77220",
  "VELIKA KLADUSA": "77230",
  BUZIM: "77245",
  "BOSANSKA KRUPA": "77240",
  "BOSANSKI PETROVAC": "77250",
  "SANSKI MOST": "79260",
  KLJUC: "79280",
  // Posavski kanton
  ORASJE: "76270",
  ODZAK: "76290",
  "DOMALJEVAC": "76233",
  // Tuzlanski kanton
  TUZLA: "75000",
  LUKAVAC: "75300",
  GRACANICA: "75320",
  GRADACAC: "76250",
  SREBRENIK: "75350",
  ZIVINICE: "75270",
  BANOVICI: "75290",
  KLADANJ: "75280",
  KALESIJA: "75260",
  SAPNA: "75411",
  TEOCAK: "75414",
  CELIC: "75246",
  "DOBOJ ISTOK": "74207",
  // Zeničko-dobojski kanton
  ZENICA: "72000",
  KAKANJ: "72240",
  VISOKO: "71300",
  BREZA: "71370",
  VARES: "71330",
  OLOVO: "71340",
  ZEPCE: "72230",
  ZAVIDOVICI: "72220",
  MAGLAJ: "74250",
  TESANJ: "74260",
  USORA: "74230",
  "DOBOJ JUG": "74203",
  // Bosansko-podrinjski kanton
  GORAZDE: "73000",
  // Srednjobosanski kanton
  TRAVNIK: "72270",
  "NOVI TRAVNIK": "72290",
  VITEZ: "72250",
  BUSOVACA: "72260",
  FOJNICA: "71270",
  KISELJAK: "71250",
  KRESEVO: "71260",
  "GORNJI VAKUF": "70240",
  "GORNJI VAKUF-USKOPLJE": "70240",
  BUGOJNO: "70230",
  "DONJI VAKUF": "70220",
  JAJCE: "70101",
  "DOBRETICI": "70225",
  // Hercegovačko-neretvanski kanton
  MOSTAR: "88000",
  KONJIC: "88400",
  JABLANICA: "88420",
  CITLUK: "88260",
  CAPLJINA: "88300",
  STOLAC: "88360",
  NEUM: "88390",
  RAVNO: "88370",
  PROZOR: "88440",
  "PROZOR-RAMA": "88440",
  // Zapadnohercegovački kanton
  "SIROKI BRIJEG": "88220",
  LJUBUSKI: "88320",
  GRUDE: "88340",
  POSUSJE: "88240",
  // Kanton Sarajevo
  SARAJEVO: "71000",
  ILIDZA: "71210",
  VOGOSCA: "71320",
  ILIJAS: "71380",
  HADZICI: "71240",
  // Kanton 10
  LIVNO: "80101",
  TOMISLAVGRAD: "80240",
  KUPRES: "80320",
  GLAMOC: "80230",
  DRVAR: "80260",
  "BOSANSKO GRAHOVO": "80270",
  // RS i Brčko (za RS radnike / firme)
  "BANJA LUKA": "78000",
  BIJELJINA: "76300",
  BRCKO: "76100",
  PRIJEDOR: "79101",
  DOBOJ: "74000",
  ZVORNIK: "75400",
  TREBINJE: "89101",
  GRADISKA: "78400",
  DERVENTA: "74400",
  MODRICA: "74480",
  SAMAC: "76230",
  // "NOVI GRAD" NAMJERNO izostavljen: dvosmislen je (RS grad 79220 vs
  // sarajevska općina 71000), pa takav grad prolazi bez PTT-a (fallback).
  "MRKONJIC GRAD": "70260",
};

// Normalizacija naziva grada za lookup: velika slova, bez kvačica, jedan razmak.
function normalizujGrad(grad) {
  return String(grad || "")
    .toUpperCase()
    .replace(/Č|Ć/g, "C")
    .replace(/Š/g, "S")
    .replace(/Ž/g, "Z")
    .replace(/Đ/g, "DJ")
    .replace(/\s+/g, " ")
    .trim();
}

// Poštanski broj za grad, ili null ako nije u šifarniku.
function pttZaGrad(grad) {
  return PTT_PO_GRADU[normalizujGrad(grad)] || null;
}

module.exports = { pttZaGrad, normalizujGrad };
