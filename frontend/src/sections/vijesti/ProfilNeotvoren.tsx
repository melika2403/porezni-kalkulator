"use client";

/* Profil koji još ne postoji. Vlasniku naloga se nudi izbor korisničkog imena
   (profil se otvara tek kad se izabere potpis), a za tuđi ili nepostojeći id
   stoji obična poruka umjesto sirovog 404. */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { getMojePostavke } from "src/api/vijestiKomentari";
import PotpisModal from "./PotpisModal";
import styles from "./vijesti.module.css";

export default function ProfilNeotvoren({ profilId }: { profilId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [trebaPotpis, setTrebaPotpis] = useState(false);

  const { data: korisnik, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });
  const { data: postavke } = useQuery({
    queryKey: ["vijesti-moje-postavke"],
    queryFn: () => unwrap(getMojePostavke()).catch(() => null),
    enabled: !!korisnik,
    retry: false,
  });

  const mojNalog = !!korisnik && korisnik.id === profilId;
  const bezPotpisa = mojNalog && postavke != null && !postavke.izabran;

  if (isLoading) return null;

  return (
    <div className={styles.sideBlok} style={{ marginTop: "2rem" }}>
      {bezPotpisa ? (
        <>
          <h1 className={styles.profilIme} style={{ fontSize: "1.4rem" }}>
            Još nemate profil u Vijestima
          </h1>
          <p className={styles.vodiciTekst} style={{ margin: "0.5rem 0 1rem" }}>
            Profil se otvara kad izaberete kako ćete se potpisivati ispod
            komentara i tema. Potpis se poslije može promijeniti.
          </p>
          <button
            type="button"
            className={styles.railDugme}
            onClick={() => setTrebaPotpis(true)}
          >
            Izaberi korisničko ime
          </button>
        </>
      ) : (
        <>
          <h1 className={styles.profilIme} style={{ fontSize: "1.4rem" }}>
            Profil nije pronađen
          </h1>
          <p className={styles.vodiciTekst} style={{ margin: "0.5rem 0 1rem" }}>
            Ovaj korisnik još nema profil u Vijestima, ili je adresa pogrešna.
          </p>
          <Link href="/vijesti" className={styles.railDugme}>
            Nazad na vijesti
          </Link>
        </>
      )}

      {trebaPotpis && korisnik && (
        <PotpisModal
          punoIme={`${korisnik.firstName ?? ""} ${korisnik.lastName ?? ""}`.trim()}
          onOdustani={() => setTrebaPotpis(false)}
          potvrdiTekst="Sačuvaj i otvori profil"
          onGotovo={async () => {
            setTrebaPotpis(false);
            await queryClient.invalidateQueries({
              queryKey: ["vijesti-moje-postavke"],
            });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
