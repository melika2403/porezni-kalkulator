// Ručno održavano iz PUFBiH dokumenta "Naputak o uplatnim računima" —
// sekcija 12.1.3 Računi budžeta jedinica lokalne samouprave.
// Verzija: najnoviji dokument koji je korisnik dostavio (2025).
// Šifre općina (kod) iz interne DB tabele cities (cross-checked).
//
// Kad se publishuje noviji dokument, samo izmijeni ovaj fajl.

export type OpcinaRacuni = {
  name: string;
  kod: string;
  postalCode: string | null;
  banka: string;
  racuni: string[];
};

export type OpcineKanton = {
  kanton: string;
  kantonNaziv: string;
  opcine: OpcinaRacuni[];
};

export const OPCINE_GROUPS: OpcineKanton[] = [
  {
    kanton: "USK",
    kantonNaziv: "Unsko-sanski kanton",
    opcine: [
      { name: "Bihać", kod: "003", postalCode: "77000", banka: "UniCredit Bank d.d.", racuni: ["338-500-2200163-231"] },
      { name: "Bosanska Krupa", kod: "008", postalCode: "77240", banka: "UniCredit Bank d.d.", racuni: ["338-000-2200041-552"] },
      { name: "Bosanski Petrovac", kod: "011", postalCode: "77250", banka: "Bosna Bank International BH d.d.", racuni: ["141-477-5320009-644"] },
      { name: "Bužim", kod: "124", postalCode: "77245", banka: "Raiffeisen bank d.d. BiH", racuni: ["161-035-0017560-631"] },
      { name: "Cazin", kod: "019", postalCode: "77220", banka: "Bosna Bank International BH d.d.", racuni: ["141-411-0000539-571"] },
      { name: "Ključ", kod: "048", postalCode: "79280", banka: "Sparkasse Bank d.d.", racuni: ["199-044-0002050-484"] },
      { name: "Sanski Most", kod: "076", postalCode: "79260", banka: "UniCredit Bank d.d.", racuni: ["338-540-2200036-917"] },
      { name: "Velika Kladuša", kod: "097", postalCode: "77230", banka: "UniCredit Bank d.d.", racuni: ["338-000-2211423-047"] },
    ],
  },
  {
    kanton: "POS",
    kantonNaziv: "Posavski kanton",
    opcine: [
      { name: "Orašje", kod: "068", postalCode: "76270", banka: "UniCredit Bank d.d.", racuni: ["338-000-2200022-831"] },
      { name: "Odžak", kod: "066", postalCode: "76290", banka: "UniCredit Bank d.d.", racuni: ["338-330-2200332-484"] },
      { name: "Domaljevac-Šamac", kod: "012", postalCode: "76233", banka: "UniCredit Bank d.d.", racuni: ["338-000-2200031-755"] },
    ],
  },
  {
    kanton: "TUZ",
    kantonNaziv: "Tuzlanski kanton",
    opcine: [
      { name: "Banovići", kod: "001", postalCode: "75290", banka: "NLB Banka d.d.", racuni: ["132-130-0296100-059"] },
      { name: "Gračanica", kod: "035", postalCode: "75320", banka: "UniCredit Bank d.d.", racuni: ["338-620-2226941-185"] },
      { name: "Gradačac", kod: "036", postalCode: "76250", banka: "NLB Banka d.d.", racuni: ["132-190-0290000-087"] },
      { name: "Kalesija", kod: "044", postalCode: "75260", banka: "UniCredit Bank d.d.", racuni: ["338-650-2246644-295"] },
      { name: "Kladanj", kod: "047", postalCode: "75280", banka: "NLB Banka d.d.", racuni: ["132-160-0295000-064"] },
      { name: "Čelić", kod: "056", postalCode: "75246", banka: "Sparkasse Bank d.d.", racuni: ["199-050-0006489-589"] },
      { name: "Lukavac", kod: "057", postalCode: "75300", banka: "Nova Banka a.d.", racuni: ["555-500-0052325-157"] },
      { name: "Srebrenik", kod: "085", postalCode: "75350", banka: "NLB Banka d.d.", racuni: ["132-150-0299280-097"] },
      { name: "Tuzla", kod: "094", postalCode: "75000", banka: "NLB Banka d.d.", racuni: ["132-100-0185060-197"] },
      { name: "Živinice", kod: "106", postalCode: "75270", banka: "Sberbank BH d.d.", racuni: ["140-403-0310000-145"] },
      { name: "Doboj-Istok", kod: "128", postalCode: "74207", banka: "NLB Banka d.d.", racuni: ["132-280-0309230-874"] },
      { name: "Sapna", kod: "138", postalCode: "75411", banka: "NLB Banka d.d.", racuni: ["132-290-0309208-559"] },
      { name: "Teočak", kod: "142", postalCode: "75414", banka: "NLB Banka d.d.", racuni: ["132-270-0309269-485"] },
    ],
  },
  {
    kanton: "ZDK",
    kantonNaziv: "Zeničko-dobojski kanton",
    opcine: [
      { name: "Breza", kod: "016", postalCode: "71370", banka: "UniCredit Bank d.d.", racuni: ["338-000-2211633-634"] },
      { name: "Usora", kod: "025", postalCode: "74230", banka: "Privredna banka Sarajevo d.d.", racuni: ["101-161-0071934-527"] },
      { name: "Kakanj", kod: "043", postalCode: "72240", banka: "ASA Banka d.d.", racuni: ["134-020-0000370-849"] },
      { name: "Maglaj", kod: "060", postalCode: "74250", banka: "Sparkasse Bank d.d.", racuni: ["199-046-0003251-634"] },
      { name: "Olovo", kod: "067", postalCode: "71340", banka: "UniCredit Bank d.d.", racuni: ["338-000-2210027-217"] },
      { name: "Tešanj", kod: "090", postalCode: "74260", banka: "Sparkasse Bank d.d.", racuni: ["199-046-0049221-680"] },
      { name: "Vareš", kod: "096", postalCode: "71330", banka: "UniCredit Bank d.d.", racuni: ["338-000-2210017-420"] },
      { name: "Visoko", kod: "098", postalCode: "71300", banka: "Sparkasse Bank d.d.", racuni: ["199-047-0004018-370"] },
      { name: "Zavidovići", kod: "102", postalCode: "72220", banka: "Union banka d.d.", racuni: ["102-032-0000027-070"] },
      { name: "Zenica", kod: "103", postalCode: "72000", banka: "Bosna Bank International BH d.d.", racuni: ["141-355-5320016-107"] },
      { name: "Žepče", kod: "105", postalCode: "72230", banka: "UniCredit Bank d.d.", racuni: ["338-000-2210835-421"] },
      { name: "Doboj-Jug", kod: "132", postalCode: "74203", banka: "UniCredit Bank d.d.", racuni: ["338-000-2211570-196"] },
    ],
  },
  {
    kanton: "BPK",
    kantonNaziv: "Bosansko-podrinjski kanton",
    opcine: [
      { name: "Goražde", kod: "033", postalCode: "73000", banka: "Union banka d.d.", racuni: ["102-840-0000002-222"] },
      { name: "Pale (FBiH)", kod: "136", postalCode: "73334", banka: "Union banka d.d.", racuni: ["102-007-0000018-886"] },
      { name: "Foča (FBiH)", kod: "134", postalCode: "73312", banka: "Privredna banka Sarajevo d.d.", racuni: ["101-140-0000595-742"] },
    ],
  },
  {
    kanton: "SBK",
    kantonNaziv: "Srednjobosanski kanton",
    opcine: [
      { name: "Travnik", kod: "091", postalCode: "72270", banka: "UniCredit Bank d.d.", racuni: ["338-000-2210001-221"] },
      { name: "Novi Travnik", kod: "065", postalCode: "72290", banka: "IntesaSanPaolo Bank d.d. BiH", racuni: ["154-999-5000429-981"] },
      { name: "Bugojno", kod: "017", postalCode: "70230", banka: "Privredna banka Sarajevo d.d.", racuni: ["101-130-0000770-832"] },
      { name: "Vitez", kod: "100", postalCode: "72250", banka: "UniCredit Bank d.d.", racuni: ["338-250-2287501-283"] },
      { name: "Kiseljak", kod: "046", postalCode: "71250", banka: "UniCredit Bank d.d.", racuni: ["338-340-2200045-068"] },
      { name: "Jajce", kod: "042", postalCode: "70101", banka: "Addiko Bank d.d.", racuni: ["306-0250000480-835"] },
      { name: "Donji Vakuf", kod: "026", postalCode: "70220", banka: "Privredna banka Sarajevo d.d.", racuni: ["101-133-0000006-907"] },
      { name: "Gornji Vakuf-Uskoplje", kod: "034", postalCode: "70240", banka: "UniCredit Bank d.d.", racuni: ["338-0002200024-674"] },
      { name: "Kreševo", kod: "051", postalCode: "71260", banka: "Addiko Bank d.d.", racuni: ["306-042-0000007-903"] },
      { name: "Fojnica", kod: "030", postalCode: "71270", banka: "UniCredit Bank d.d.", racuni: ["338-900-2208367-582"] },
      { name: "Busovača", kod: "018", postalCode: "72260", banka: "ASA Banka d.d.", racuni: ["134-040-0000008-350"] },
      { name: "Dobretići", kod: "050", postalCode: "70226", banka: "Addiko Bank d.d.", racuni: ["306-045-0000000-966"] },
    ],
  },
  {
    kanton: "HNK",
    kantonNaziv: "Hercegovačko-neretvanski kanton",
    opcine: [
      { name: "Čapljina", kod: "021", postalCode: "88300", banka: "Addiko Bank d.d.", racuni: ["306-007-0001035-102"] },
      { name: "Čitluk", kod: "023", postalCode: "88260", banka: "UniCredit Bank d.d.", racuni: ["338-000-2200014-877"] },
      { name: "Jablanica", kod: "041", postalCode: "88420", banka: "Privredna banka Sarajevo d.d.", racuni: ["101-151-0073817-981"] },
      { name: "Konjic", kod: "049", postalCode: "88400", banka: "Vakufska banka d.d.", racuni: ["160-460-0346331-506"] },
      { name: "Prozor-Rama", kod: "073", postalCode: "88440", banka: "UniCredit Bank d.d.", racuni: ["338-000-2200013-907"] },
      { name: "Stolac", kod: "086", postalCode: "88360", banka: "UniCredit Bank d.d.", racuni: ["338-000-2200020-018"] },
      { name: "Neum", kod: "107", postalCode: "88390", banka: "UniCredit Bank d.d.", racuni: ["338-000-2200021-958"] },
      { name: "Grad Mostar", kod: "180", postalCode: "88000", banka: "Nova Banka a.d.", racuni: ["555-000-0020190-859"] },
      { name: "Ravno", kod: "207", postalCode: "88370", banka: "UniCredit Bank d.d.", racuni: ["338-000-2200017-593"] },
    ],
  },
  {
    kanton: "ZHK",
    kantonNaziv: "Zapadnohercegovački kanton",
    opcine: [
      { name: "Grude", kod: "037", postalCode: "88340", banka: "UniCredit Bank d.d.", racuni: ["338-000-2210353-622"] },
      { name: "Široki Brijeg", kod: "054", postalCode: "88220", banka: "UniCredit Bank d.d.", racuni: ["338-220-2257147-282"] },
      { name: "Ljubuški", kod: "059", postalCode: "88320", banka: "Raiffeisen Bank d.d. BiH", racuni: ["161-000-0171630-162"] },
      { name: "Posušje", kod: "070", postalCode: "88240", banka: "UniCredit Bank d.d.", racuni: ["338-200-2261584-848"] },
    ],
  },
  {
    kanton: "KS",
    kantonNaziv: "Kanton Sarajevo",
    opcine: [
      { name: "Hadžići", kod: "038", postalCode: "71240", banka: "UniCredit Bank d.d.", racuni: ["338-000-2210025-471"] },
      { name: "Ilijaš", kod: "040", postalCode: "71380", banka: "Vakufska banka d.d.", racuni: ["160-200-0000710-645"] },
      { name: "Centar Sarajevo", kod: "077", postalCode: "71000", banka: "UniCredit Bank d.d.", racuni: ["338-690-2296575-219"] },
      { name: "Ilidža", kod: "078", postalCode: "71210", banka: "UniCredit Bank d.d.", racuni: ["338-000-2210024-598"] },
      { name: "Novo Sarajevo", kod: "079", postalCode: "71000", banka: "Bosna Bank International d.d.", racuni: ["141-196-5320011-288"] },
      { name: "Vogošća", kod: "080", postalCode: "71320", banka: "UniCredit Bank d.d.", racuni: ["338-000-2210016-547"] },
      { name: "Trnovo (FBiH)", kod: "093", postalCode: "71223", banka: "Union banka d.d.", racuni: ["102-839-0000014-396"] },
      { name: "Novi Grad Sarajevo", kod: "108", postalCode: "71000", banka: "UniCredit Bank d.d.", racuni: ["338-000-2210032-552"] },
      { name: "Stari Grad Sarajevo", kod: "109", postalCode: "71000", banka: "Privredna banka Sarajevo d.d.", racuni: ["101-000-0071133-630"] },
      { name: "Grad Sarajevo", kod: "–", postalCode: "71000", banka: "Raiffeisen Bank d.d. BiH", racuni: ["161-000-0017920-082"] },
    ],
  },
  {
    kanton: "K10",
    kantonNaziv: "Kanton 10",
    opcine: [
      { name: "Bosansko Grahovo", kod: "013", postalCode: "80270", banka: "Raiffeisen Bank d.d. BiH", racuni: ["161-020-0070460-025"] },
      { name: "Drvar", kod: "027", postalCode: "80260", banka: "IntesaSanPaolo Bank d.d. BiH", racuni: ["154-999-5000539-591"] },
      { name: "Tomislavgrad", kod: "028", postalCode: "80240", banka: "UniCredit Bank d.d.", racuni: ["338-000-2210604-367"] },
      { name: "Glamoč", kod: "032", postalCode: "80230", banka: "IntesaSanPaolo Bank d.d. BiH", racuni: ["154-999-5000159-351"] },
      { name: "Kupres", kod: "052", postalCode: "80320", banka: "IntesaSanPaolo Bank d.d. BiH", racuni: ["154-999-5000000-562"] },
      { name: "Livno", kod: "055", postalCode: "80101", banka: "Raiffeisen Bank d.d. BiH", racuni: ["161-020-0063110-044"] },
    ],
  },
];
