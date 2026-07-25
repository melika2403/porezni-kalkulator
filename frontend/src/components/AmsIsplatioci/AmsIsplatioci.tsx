"use client";

/* Adresar isplatilaca za AMS-1035 (Dio 2). AMS se predaje mjesečno, najčešće
   istom stranom isplatiocu, pa se podaci snime jednom i biraju klikom.

   Zapisi su vezani SAMO za korisnika, nemaju veze sa organizacijama ni
   klijentima, i dostupni su svakom prijavljenom korisniku bez pretplate.
   Snimanje i ažuriranje su uvijek na klik: baza se ne mijenja u pozadini dok
   korisnik kuca po formi. */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "src/components/Modal/Modal";
import { me, unwrap } from "src/api/auth";
import {
  listIsplatioci,
  createIsplatilac,
  updateIsplatilac,
  deleteIsplatilac,
  MAX_ISPLATILACA,
  type AmsIsplatilac,
} from "src/api/amsIsplatioci";
import styles from "./AmsIsplatioci.module.css";

export type IsplatilacFill = {
  naziv: string;
  adresa: string;
  grad: string;
  drzava: string;
};

type Props = {
  /** Trenutne vrijednosti iz Dio 2, za snimanje. */
  current: IsplatilacFill;
  /** Popuna forme iz snimljenog isplatioca. */
  onFill: (data: IsplatilacFill) => void;
};

const QUERY_KEY = ["ams-isplatioci"];

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" />
    </svg>
  );
}

function opis(i: AmsIsplatilac): string {
  return [i.grad, i.drzava].filter(Boolean).join(", ");
}

export default function AmsIsplatioci({ current, onFill }: Props) {
  const queryClient = useQueryClient();
  const [greska, setGreska] = useState<string | null>(null);
  const [aktivniId, setAktivniId] = useState<number | null>(null);
  // isplatilac koji čeka potvrdu brisanja (naš modal, ne browserski confirm)
  const [zaBrisanje, setZaBrisanje] = useState<AmsIsplatilac | null>(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });
  const prijavljen = !!user;

  const { data: isplatioci = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => unwrap(listIsplatioci()),
    enabled: prijavljen,
    retry: false,
  });

  const naziv = current.naziv.trim();
  // Isti naziv znači izmjenu postojećeg zapisa, ne duplikat. Ažuriranje je
  // svjesna radnja korisnika (dugme promijeni tekst), nikad tiho.
  const postojeci = isplatioci.find(
    (i) => i.naziv.trim().toLowerCase() === naziv.toLowerCase(),
  );
  const popunjeno = isplatioci.length >= MAX_ISPLATILACA;

  const snimi = useMutation({
    mutationFn: async () => {
      const payload = {
        naziv,
        adresa: current.adresa.trim() || null,
        grad: current.grad.trim() || null,
        drzava: current.drzava.trim() || null,
      };
      const res = postojeci
        ? await updateIsplatilac(postojeci.id, payload)
        : await createIsplatilac(payload);
      if (!res.ok) throw new Error(res.error || "GRESKA");
      return res.data;
    },
    onSuccess: async (data) => {
      setGreska(null);
      if (data?.id) setAktivniId(data.id);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (e: Error) => {
      setGreska(
        e.message === "LIMIT_REACHED"
          ? `Sačuvano je ${MAX_ISPLATILACA} od ${MAX_ISPLATILACA} isplatilaca, obrišite jednog da dodate novog.`
          : "Snimanje nije uspjelo, pokušajte ponovo.",
      );
    },
  });

  const obrisi = useMutation({
    mutationFn: async (id: number) => {
      const res = await deleteIsplatilac(id);
      if (!res.ok) throw new Error(res.error || "GRESKA");
      return id;
    },
    onSuccess: async (id) => {
      setGreska(null);
      setZaBrisanje(null);
      setAktivniId((prev) => (prev === id ? null : prev));
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: () => {
      setZaBrisanje(null);
      setGreska("Brisanje nije uspjelo, pokušajte ponovo.");
    },
  });

  // Dok se ne zna ko je korisnik ne treperi pogrešna poruka.
  if (userLoading) return null;

  if (!prijavljen) {
    return (
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.title}>Sačuvajte isplatioca</span>
        </div>
        <p className={styles.text}>
          AMS se predaje svaki mjesec, obično istom isplatiocu. Uz besplatnu
          registraciju podatke unosite jednom, a poslije ih birate klikom:
        </p>
        <ul className={styles.benefits}>
          <li>
            <span className={styles.tick}>✓</span>
            <span>
              Do {MAX_ISPLATILACA} isplatilaca sačuvanih na vašem nalogu
            </span>
          </li>
          <li>
            <span className={styles.tick}>✓</span>
            <span>
              Vaši lični podaci (Dio 1) se popunjavaju sami iz profila
            </span>
          </li>
        </ul>
        <a
          href={`/registracija?next=${encodeURIComponent("/ams")}`}
          className={styles.guestBtn}
        >
          Registruj se besplatno →
        </a>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>Moji isplatioci</span>
        <span className={styles.count}>
          {isplatioci.length}/{MAX_ISPLATILACA}
        </span>
      </div>

      {isplatioci.length === 0 ? (
        <p className={styles.text}>
          Popunite podatke o isplatiocu pa ih sačuvajte, sljedeći mjesec ih
          birate jednim klikom.
        </p>
      ) : (
        <ul className={styles.list}>
          {isplatioci.map((i) => (
            <li
              key={i.id}
              className={`${styles.row} ${aktivniId === i.id ? styles.rowActive : ""}`}
            >
              <button
                type="button"
                className={styles.pick}
                onClick={() => {
                  setAktivniId(i.id);
                  setGreska(null);
                  onFill({
                    naziv: i.naziv,
                    adresa: i.adresa ?? "",
                    grad: i.grad ?? "",
                    drzava: i.drzava ?? "",
                  });
                }}
              >
                <span className={styles.pickName}>{i.naziv}</span>
                {opis(i) && <span className={styles.pickMeta}>{opis(i)}</span>}
              </button>
              <button
                type="button"
                className={styles.del}
                title="Obriši isplatioca"
                aria-label={`Obriši ${i.naziv}`}
                disabled={obrisi.isPending}
                onClick={() => setZaBrisanje(i)}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className={styles.saveBtn}
        disabled={!naziv || snimi.isPending || (popunjeno && !postojeci)}
        onClick={() => snimi.mutate()}
      >
        {snimi.isPending
          ? "Snimam..."
          : postojeci
            ? "Ažuriraj sačuvanog"
            : "Sačuvaj isplatioca"}
      </button>

      {greska && <p className={styles.error}>{greska}</p>}
      {!greska && !naziv && (
        <p className={styles.note}>
          Prvo popunite naziv isplatioca, pa ga možete sačuvati.
        </p>
      )}
      {!greska && naziv && postojeci && (
        <p className={styles.note}>
          Isplatilac pod ovim nazivom je već sačuvan, dugme ga ažurira
          trenutnim podacima iz forme.
        </p>
      )}
      {!greska && naziv && !postojeci && popunjeno && (
        <p className={styles.note}>
          Sačuvano je {MAX_ISPLATILACA} od {MAX_ISPLATILACA}, obrišite jednog da
          dodate novog.
        </p>
      )}

      <Modal
        kind="confirm"
        open={!!zaBrisanje}
        variant="danger"
        title="Brisanje isplatioca"
        message={
          zaBrisanje
            ? `Obrisati sačuvanog isplatioca "${zaBrisanje.naziv}"? Podaci u formi ostaju, briše se samo zapis iz adresara.`
            : ""
        }
        confirmLabel="Obriši"
        cancelLabel="Odustani"
        onConfirm={() => {
          // modal nema busy stanje, pa dvoklik na "Obriši" spriječimo ovdje
          // (drugi zahtjev bi vratio 404 i prikazao grešku nad uspjehom)
          if (zaBrisanje && !obrisi.isPending) obrisi.mutate(zaBrisanje.id);
        }}
        onClose={() => setZaBrisanje(null)}
      />
    </div>
  );
}
