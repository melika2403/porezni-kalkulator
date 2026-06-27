// Generički oblik dokumenta (rješenje/odluka). Svaki compose vraća ovo, a
// zajednički PDF/DOCX renderer ga iscrtava. Tako svi dokumenti dijele izgled.

export interface RjesenjeComposed {
  /** Linije zaglavlja firme (naziv, adresa, grad). */
  zaglavlje: string[];
  /** "Na osnovu čl. ... Zakona o radu ..., donosi se:" */
  pravniOsnov: string;
  brojAkta: string;
  /** "U Sarajevu, dana 05.06.2025." */
  mjestoDatum: string;
  /** Naslov dokumenta (uppercase). */
  naslov: string;
  /** Uvodni pasus (npr. kome se utvrđuje pravo). */
  uvod?: string;
  /** Stavke/tačke (prikazane kao lista sa crticom). */
  stavke?: string[];
  /** Pasusi nakon stavki (npr. naknada plaće, napomena). */
  paragrafi?: string[];
  obrazlozenje?: string;
  /** Tekst pouke o pravnom lijeku (bez prefiksa). */
  pouka?: string;
  /** Linije "Dostaviti:". Default: imenovanom radniku / računovodstvu / arhivi. */
  dostaviti?: string[];
  potpisnik: string;
  /** Ako je postavljeno, potpisni blok ima DVIJE kolone: lijevo radnik (ovo
   *  ime), desno poslodavac. Za aneks ugovora gdje obje strane potpisuju. */
  potpisRadnik?: string;
}
