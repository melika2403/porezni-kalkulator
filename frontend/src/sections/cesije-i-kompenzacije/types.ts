// Tipovi podataka za generatore cesije i kompenzacije.

export interface CesijaData {
  mjesto: string;
  datum: string; // već formatiran za prikaz (dd.mm.yyyy.)
  // Cedent (ustupalac)
  cedentNaziv: string;
  cedentId: string; // JIB / ID
  cedentZastupnik: string; // opcionalno "kojeg zastupa ..."
  // Cesionar (primalac)
  cesionarNaziv: string;
  cesionarId: string;
  cesionarZastupnik: string;
  // Cesus (platilac / dužnik)
  cesusNaziv: string;
  cesusId: string;
  cesusZastupnik: string;
  // Iznos razdvojen: broj ("3.884,40 KM") + slovima ("Tri hiljade ...")
  iznosBroj: string;
  iznosSlovima: string;
  sud: string; // nadležni sud (grad)
  brojPrimjeraka: string; // npr. "3 (tri)"
}

export interface KompStavka {
  opis: string; // broj računa / osnov
  iznos: number;
}

export interface KompenzacijaData {
  broj: string; // broj dokumenta, npr. "001-000165"
  datum: string; // dd.mm.yyyy.
  // Dužnik
  duznikNaziv: string;
  duznikAdresa: string;
  duznikId: string; // ID broj
  duznikPdv: string; // PDV broj
  duznikSifra: string; // interna šifra (opcionalno)
  // Povjerilac / vjerovnik
  povjeriocNaziv: string;
  povjeriocAdresa: string;
  povjeriocId: string;
  povjeriocPdv: string;
  povjeriocSifra: string;
  // Stavke obaveza
  duznikStavke: KompStavka[];
  povjeriocStavke: KompStavka[];
}
