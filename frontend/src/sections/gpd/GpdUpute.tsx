import Link from "next/link";
import styles from "./gpdUpute.module.css";

export default function GpdUpute() {
  return (
    <main className={styles.page}>
      <div className={styles.backRow}>
        <Link href="/gpd" className={styles.backLink}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="14" y1="8" x2="2" y2="8" />
            <polyline points="6 4 2 8 6 12" />
          </svg>
          Nazad na GPD obrazac
        </Link>
      </div>

      <div className={styles.header}>
        <p className={styles.label}>Upute</p>
        <h1 className={styles.h1}>
          Kako pravilno popuniti <em>GPD-1051 obrazac</em>
        </h1>
        <p className={styles.subtitle}>
          Godišnja prijava poreza na dohodak sastoji se od pet dijelova. U nastavku su pojašnjenja za svako polje obrasca.
        </p>
      </div>

      {/* Dio 1 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dio 1, Podaci o poreznom obvezniku (redovi 1–7)</h2>
        <p className={styles.text}>
          U ovom dijelu upisujete lične identifikacijske podatke i poreznu godinu za koju podnosite prijavu.
          Obavezno unesite JMB, ime i prezime, adresu stanovanja, te godinu na koju se prijava odnosi.
        </p>
      </section>

      {/* Dio 2 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dio 2, Prijava dohotka (redovi 8–17)</h2>
        <div className={styles.rowList}>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 8</span>
            <div>
              <div className={styles.rowTitle}>Dohodak od nesamostalne djelatnosti</div>
              <p className={styles.rowText}>
                Unesite ukupan iznos iz kolone 11 godišnjeg izvještaja o ukupnim isplaćenim plaćama i
                drugim ličnim primanjima (obrazac GIP-1022). Priložite primjerak izvještaja od svakog
                poslodavca.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 9</span>
            <div>
              <div className={styles.rowTitle}>Dohodak od samostalne djelatnosti</div>
              <p className={styles.rowText}>
                Podatak se preuzima iz SPR specifikacije, red 28, naznačite da li se radi o dobiti ili
                gubitku.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 10</span>
            <div>
              <div className={styles.rowTitle}>Dohodak od poljoprivrede i šumarstva</div>
              <p className={styles.rowText}>
                Popunjava se na isti način, red 28 iz obrasca SPR-1053.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 11</span>
            <div>
              <div className={styles.rowTitle}>Dohodak od iznajmljivanja imovine</div>
              <p className={styles.rowText}>
                Podaci se preuzimaju iz obrasca PRIM-1054, red 18. Iznos odražava prihod nakon
                priznatih rashoda od 30%. Ukoliko ste se opredijelili za paušalne rashode, uz godišnju
                prijavu obavezno priložite ugovor o iznajmljivanju.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 12</span>
            <div>
              <div className={styles.rowTitle}>Dohodak od vremenski ograničenog ustupanja prava</div>
              <p className={styles.rowText}>
                Iznosi od prodaje ili prijenosa autorskih prava (član 21. stav 2.). Uz prijavu priložiti
                ugovor o ustupanju imovinskih prava.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 13</span>
            <div>
              <div className={styles.rowTitle}>Dohodak od drugih samostalnih djelatnosti</div>
              <p className={styles.rowText}>
                Prihodi po ugovorima o djelu, autorske naknade, naknade članovima nadzornih odbora i
                sl. Veza sa obrascima AUG-1031 (kolona 13) i ASD-1032 (kolona 10).
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 14</span>
            <div>
              <div className={styles.rowTitle}>Poslovni gubitak iz ranijih godina</div>
              <p className={styles.rowText}>
                Dozvoljeno je odbiti gubitke iz prethodnih pet godina.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Redovi 15–17</span>
            <div>
              <div className={styles.rowTitle}>Zbirni iznosi</div>
              <p className={styles.rowText}>
                Ovi redovi sabiraju sve izvore dohotka i gubitaka radi utvrđivanja neto dobiti ili
                gubitka za poreznu godinu.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Dio 3 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dio 3, Lični odbitci (redovi 18–21)</h2>
        <div className={styles.rowList}>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 18</span>
            <div>
              <div className={styles.rowTitle}>Lični odbitak</div>
              <p className={styles.rowText}>
                Iznos ličnog odbitka preuzima se s porezne kartice. Unosite ukupan iznos, npr.
                 ako Vam je koeficijent na poreznoj kartici 1, mjesečni odbitak Vam je 300 KM,
                  ukoliko ste bili zaposleni čitavu godinu, onda unosite 3.600 KM. Dakle, uvijek 
                  se unosi broj mjeseci za koje ste imali pravo na odbitak, odnosno broj mjeseci
                  koji ste bili zaposleni.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 19</span>
            <div>
              <div className={styles.rowTitle}>Zdravstveni troškovi</div>
              <p className={styles.rowText}>
                Troškovi liječenja ili nabavke ortopedskih pomagala koji nisu pokriveni zdravstvenim
                osiguranjem.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 20</span>
            <div>
              <div className={styles.rowTitle}>Kamate na stambeni kredit</div>
              <p className={styles.rowText}>
                Plaćene kamate na kredit za kupovinu ili izgradnju stambenog objekta za vlastite
                potrebe.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Dio 4 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dio 4, Obračun poreza (redovi 22–32)</h2>
        <div className={styles.rowList}>

          <div className={styles.row}>
            <span className={styles.rowNum}>Redovi 22–26</span>
            <div>
              <div className={styles.rowTitle}>Prenos iznosa</div>
              <p className={styles.rowText}>
                Iznosi se preuzimaju iz prethodnih dijelova prema uputama na obrascu.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 27</span>
            <div>
              <div className={styles.rowTitle}>Olakšica za zapošljavanje invalida</div>
              <p className={styles.rowText}>
                Smanjenje poreza do 10% po svakom zaposlenom invalidu, a ukupno ne više od 50%.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 28</span>
            <div>
              <div className={styles.rowTitle}>Porez po odbitku</div>
              <p className={styles.rowText}>
                Ovdje uplaćujete porez koji je uplaćen za Vas od strane poslodavca ili isplatioca.
                 (Polje 15 sa GIP-1022 obrasca, polje 14 sa AUG-1031 obrasca.).
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 29</span>
            <div>
              <div className={styles.rowTitle}>Akontacije poreza</div>
              <p className={styles.rowText}>
                Uplaćene akontacije poreza tokom porezne godine.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 30</span>
            <div>
              <div className={styles.rowTitle}>Porez plaćen u inostranstvu</div>
              <p className={styles.rowText}>
                Porezi plaćeni u inostranstvu ili drugom entitetu BiH koji se mogu odbiti na osnovu
                ugovora o izbjegavanju dvostrukog oporezivanja.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 31</span>
            <div>
              <div className={styles.rowTitle}>Razlika, za uplatu ili povrat</div>
              <p className={styles.rowText}>
                Konačni obračun koji pokazuje da li postoji razlika poreza za uplatu, pravo na povrat,
                ili je saldo nula.
              </p>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.rowNum}>Red 32</span>
            <div>
              <div className={styles.rowTitle}>Opcija za povrat</div>
              <p className={styles.rowText}>
                Ukoliko postoji pravo na povrat, označite opciju a) ili b) za način povrata sredstava.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Rok */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Rok za podnošenje i povrat poreza</h2>
        <p className={styles.text}>
          Rok za podnošenje godišnje porezne prijave je <strong>31. mart</strong> naredne porezne godine.
          Ukoliko imate pravo na povrat, povrat se vrši u roku od <strong>90 dana</strong> od podnošenja
          prijave.
        </p>
      </section>

      <div className={styles.backRow} style={{ marginTop: "1rem" }}>
        <Link href="/gpd" className={styles.backLink}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="14" y1="8" x2="2" y2="8" />
            <polyline points="6 4 2 8 6 12" />
          </svg>
          Nazad na GPD obrazac
        </Link>
      </div>
    </main>
  );
}
