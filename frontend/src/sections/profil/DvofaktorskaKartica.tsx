"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuShieldCheck, LuMail, LuSmartphone } from "react-icons/lu";
import styles from "./profil.module.css";
import { Modal } from "src/components/app-shell/Modal";
import type { AuthUser } from "src/api/auth";
import {
  clearTrustedDevices,
  disableTwoFactor,
  regenerateBackupCodes,
  resendSetupCode,
  sendCurrentMethodCode,
  setupConfirm,
  setupStart,
  twoFactorErrorText,
  twoFactorStatus,
  type TwoFactorMethod,
} from "src/api/twoFactor";

function formatDatum(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const NAZIV_METODE: Record<TwoFactorMethod, string> = {
  EMAIL: "Kod na email",
  TOTP: "Aplikacija za kodove",
};

export default function DvofaktorskaKartica({ user }: { user: AuthUser }) {
  const queryClient = useQueryClient();
  const [wizardOtvoren, setWizardOtvoren] = useState(false);
  const [iskljucenjeOtvoreno, setIskljucenjeOtvoreno] = useState(false);
  const [noviKodoviOtvoreni, setNoviKodoviOtvoreni] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["2fa-status"],
    queryFn: async () => {
      const r = await twoFactorStatus();
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const osvjezi = () => {
    queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  const zaboraviUredjajeMutation = useMutation({
    mutationFn: async () => {
      const r = await clearTrustedDevices();
      if (!r.ok) throw new Error(twoFactorErrorText(r.error));
    },
    onSuccess: osvjezi,
  });

  const status = statusQuery.data;
  const ukljucen = !!status?.enabled;

  return (
    <div className={styles.card} style={{ marginTop: "1.5rem" }}>
      <div className={styles.cardHeader}>
        <p className={styles.cardTitle}>Dvofaktorska prijava</p>
        {ukljucen ? (
          <span className={styles.verifiedBadge}>✓ Aktivna</span>
        ) : (
          <span className={styles.unverifiedBadge}>Nije aktivna</span>
        )}
      </div>

      {statusQuery.isLoading && (
        <div className={styles.verifyHint}>Učitavanje…</div>
      )}

      {!statusQuery.isLoading && !ukljucen && (
        <div className={styles.verifyActions}>
          <p className={styles.verifyHint}>
            Uz lozinku se pri prijavi traži i jednokratni kod. I kad neko sazna
            vašu lozinku, bez koda ne može ući u nalog. Ako označite &quot;Zapamti
            me&quot;, kod se na tom uređaju traži samo prvi put.
          </p>
          <button
            className={styles.btnPrimary}
            onClick={() => setWizardOtvoren(true)}
          >
            <LuShieldCheck size={16} style={{ marginRight: 6 }} />
            Uključi dvofaktorsku prijavu
          </button>
        </div>
      )}

      {!statusQuery.isLoading && ukljucen && status && (
        <>
          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Metoda</span>
              <span className={styles.infoValue}>
                {status.method ? NAZIV_METODE[status.method] : "–"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Uključena</span>
              <span className={styles.infoValue}>
                {formatDatum(status.enabledAt)}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Rezervni kodovi</span>
              <span className={styles.infoValue}>
                {status.preostaloRezervnihKodova} preostalo
              </span>
            </div>
            <div className={styles.infoRow} style={{ borderBottom: "none" }}>
              <span className={styles.infoLabel}>Povjereni uređaji</span>
              <span className={styles.infoValue}>
                {status.povjerenihUredjaja === 0
                  ? "Nijedan"
                  : `${status.povjerenihUredjaja} uređaja bez pitanja za kod`}
              </span>
            </div>
          </div>

          {status.preostaloRezervnihKodova <= 2 && (
            <div className={styles.verifyHint} style={{ marginTop: "0.75rem" }}>
              Ostalo vam je malo rezervnih kodova. Generišite novi set dok imate
              pristup nalogu.
            </div>
          )}

          <div className={styles.formActions} style={{ flexWrap: "wrap" }}>
            <button
              className={styles.btnGhost}
              onClick={() => setNoviKodoviOtvoreni(true)}
            >
              Novi rezervni kodovi
            </button>
            <button
              className={styles.btnGhost}
              disabled={
                zaboraviUredjajeMutation.isPending ||
                status.povjerenihUredjaja === 0
              }
              onClick={() => zaboraviUredjajeMutation.mutate()}
            >
              {zaboraviUredjajeMutation.isPending
                ? "Poništavanje…"
                : "Zaboravi povjerene uređaje"}
            </button>
            <button
              className={styles.btnDanger}
              onClick={() => setIskljucenjeOtvoreno(true)}
            >
              Isključi
            </button>
          </div>
        </>
      )}

      {wizardOtvoren && (
        <UkljucivanjeWizard
          user={user}
          onClose={() => setWizardOtvoren(false)}
          onDone={osvjezi}
        />
      )}
      {noviKodoviOtvoreni && (
        <NoviKodoviModal
          user={user}
          onClose={() => setNoviKodoviOtvoreni(false)}
          onDone={osvjezi}
        />
      )}
      {iskljucenjeOtvoreno && (
        <IskljucivanjeModal
          user={user}
          metoda={status?.method ?? "EMAIL"}
          onClose={() => setIskljucenjeOtvoreno(false)}
          onDone={osvjezi}
        />
      )}
    </div>
  );
}

// ─── Wizard uključivanja ─────────────────────────────────────────────────────

type Korak = "lozinka" | "metoda" | "kod" | "kodovi";

function UkljucivanjeWizard({
  user,
  onClose,
  onDone,
}: {
  user: AuthUser;
  onClose: () => void;
  onDone: () => void;
}) {
  // Korisnik bez lokalne lozinke (samo Google) je nema čime potvrditi, pa mu je
  // postojeći session jedini dokaz koji može dati.
  const [korak, setKorak] = useState<Korak>(
    user.hasPassword ? "lozinka" : "metoda",
  );
  const [lozinka, setLozinka] = useState("");
  const [metoda, setMetoda] = useState<TwoFactorMethod>("EMAIL");
  const [kod, setKod] = useState("");
  const [kodovi, setKodovi] = useState<string[]>([]);
  const [sacuvao, setSacuvao] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);
  const [qr, setQr] = useState<{ qrDataUrl?: string; secret?: string } | null>(
    null,
  );
  const [rucniUnos, setRucniUnos] = useState(false);

  const startMutation = useMutation({
    mutationFn: async () => {
      const r = await setupStart(metoda, lozinka);
      if (!r.ok) throw new Error(twoFactorErrorText(r.error));
      return r.data;
    },
    onSuccess: (data) => {
      setGreska(null);
      setQr(
        data.method === "TOTP"
          ? { qrDataUrl: data.qrDataUrl, secret: data.secret }
          : null,
      );
      setKorak("kod");
    },
    onError: (e: Error) => setGreska(e.message),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const r = await setupConfirm(kod.trim());
      if (!r.ok) throw new Error(twoFactorErrorText(r.error));
      return r.data;
    },
    onSuccess: (data) => {
      setGreska(null);
      setKodovi(data.backupCodes);
      setKorak("kodovi");
    },
    onError: (e: Error) => setGreska(e.message),
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const r = await resendSetupCode();
      if (!r.ok) throw new Error(twoFactorErrorText(r.error));
    },
    onSuccess: () => setGreska(null),
    onError: (e: Error) => setGreska(e.message),
  });

  const zatvoriGotovo = () => {
    onDone();
    onClose();
  };

  const naslovi: Record<Korak, string> = {
    lozinka: "Potvrdite lozinku",
    metoda: "Izaberite način potvrde",
    kod: "Unesite kod",
    kodovi: "Sačuvajte rezervne kodove",
  };

  return (
    <Modal
      open
      // Poslije koraka sa kodovima zatvaranje mora osvježiti status, jer je 2FA
      // već uključen na serveru.
      onClose={korak === "kodovi" ? zatvoriGotovo : onClose}
      title={naslovi[korak]}
      maxWidthClass="max-w-[560px]"
    >
      {korak === "lozinka" && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            setGreska(null);
            setKorak("metoda");
          }}
        >
          <p className={styles.verifyHint}>
            Zbog sigurnosti prvo potvrdite da ste to vi.
          </p>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Trenutna lozinka</label>
            <input
              type="password"
              className={styles.input}
              value={lozinka}
              onChange={(e) => setLozinka(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>
              Odustani
            </button>
            <button type="submit" className={styles.btnPrimary}>
              Dalje
            </button>
          </div>
        </form>
      )}

      {korak === "metoda" && (
        <div className={styles.form}>
          <div className={styles.orgTypeRadios}>
            <label
              className={`${styles.orgTypeRadio} ${metoda === "EMAIL" ? styles.orgTypeRadioActive : ""}`}
            >
              <input
                type="radio"
                name="2fa-metoda"
                checked={metoda === "EMAIL"}
                onChange={() => setMetoda("EMAIL")}
              />
              <span className={styles.orgTypeRadioIcon}>
                <LuMail />
              </span>
              <div>
                <div className={styles.orgTypeRadioLabel}>Kod na email</div>
                <div className={styles.orgTypeRadioDesc}>
                  Kod stiže na {user.email ?? "vašu email adresu"}
                </div>
              </div>
            </label>

            <label
              className={`${styles.orgTypeRadio} ${metoda === "TOTP" ? styles.orgTypeRadioActive : ""}`}
            >
              <input
                type="radio"
                name="2fa-metoda"
                checked={metoda === "TOTP"}
                onChange={() => setMetoda("TOTP")}
              />
              <span className={styles.orgTypeRadioIcon}>
                <LuSmartphone />
              </span>
              <div>
                <div className={styles.orgTypeRadioLabel}>
                  Aplikacija za kodove
                </div>
                <div className={styles.orgTypeRadioDesc}>
                  Google Authenticator, Authy, 1Password. Radi i bez interneta.
                </div>
              </div>
            </label>
          </div>

          <p className={styles.verifyHint}>
            Aplikacija je sigurnija: kod nastaje na vašem telefonu, pa ne zavisi
            od pristupa emailu. Email je jednostavniji jer ne traži instalaciju.
          </p>

          {greska && <div className={styles.errorMsg}>{greska}</div>}

          <div className={styles.formActions}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>
              Odustani
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate()}
            >
              {startMutation.isPending
                ? "Priprema…"
                : metoda === "EMAIL"
                  ? "Pošalji kod"
                  : "Dalje"}
            </button>
          </div>
        </div>
      )}

      {korak === "kod" && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            setGreska(null);
            confirmMutation.mutate();
          }}
        >
          {metoda === "EMAIL" ? (
            <p className={styles.verifyHint}>
              Poslali smo šestocifreni kod na {user.email}. Kod važi 10 minuta.
            </p>
          ) : (
            <>
              <p className={styles.verifyHint}>
                Skenirajte kod aplikacijom (Google Authenticator, Authy,
                1Password), pa unesite šestocifreni broj koji vam prikaže.
              </p>
              {qr?.qrDataUrl && (
                <div className={styles.qrBox}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qr.qrDataUrl}
                    alt="QR kod za aplikaciju"
                    width={220}
                    height={220}
                  />
                </div>
              )}
              <button
                type="button"
                className={styles.btnEditInline}
                style={{ alignSelf: "flex-start" }}
                onClick={() => setRucniUnos((v) => !v)}
              >
                {rucniUnos ? "Sakrij ključ" : "Ne mogu skenirati, prikaži ključ"}
              </button>
              {rucniUnos && qr?.secret && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    Ključ za ručni unos
                  </label>
                  <code className={styles.secretBox}>{qr.secret}</code>
                  <p className={styles.verifyHint}>
                    U aplikaciji izaberite unos ključa, tip &quot;vremenski
                    zasnovan&quot; (time based).
                  </p>
                </div>
              )}
            </>
          )}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              {metoda === "EMAIL" ? "Kod iz emaila" : "Kod iz aplikacije"}
            </label>
            <input
              type="text"
              inputMode="numeric"
              className={styles.input}
              value={kod}
              onChange={(e) => setKod(e.target.value)}
              placeholder="123456"
              autoComplete="one-time-code"
              autoFocus
              required
              style={{ letterSpacing: "0.15em" }}
            />
          </div>

          {greska && <div className={styles.errorMsg}>{greska}</div>}

          <div className={styles.formActions}>
            {metoda === "EMAIL" ? (
              <button
                type="button"
                className={styles.btnGhost}
                disabled={resendMutation.isPending}
                onClick={() => resendMutation.mutate()}
              >
                {resendMutation.isPending ? "Slanje…" : "Pošalji novi kod"}
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => {
                  setKod("");
                  setGreska(null);
                  setKorak("metoda");
                }}
              >
                Nazad
              </button>
            )}
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? "Provjera…" : "Potvrdi"}
            </button>
          </div>
        </form>
      )}

      {korak === "kodovi" && (
        <RezervniKodovi
          kodovi={kodovi}
          sacuvao={sacuvao}
          setSacuvao={setSacuvao}
          onClose={zatvoriGotovo}
        />
      )}
    </Modal>
  );
}

// ─── Prikaz rezervnih kodova ─────────────────────────────────────────────────

function RezervniKodovi({
  kodovi,
  sacuvao,
  setSacuvao,
  onClose,
}: {
  kodovi: string[];
  sacuvao: boolean;
  setSacuvao: (v: boolean) => void;
  onClose: () => void;
}) {
  const [kopirano, setKopirano] = useState(false);

  const tekst = kodovi.join("\n");

  const kopiraj = async () => {
    try {
      await navigator.clipboard.writeText(tekst);
      setKopirano(true);
      setTimeout(() => setKopirano(false), 2500);
    } catch {
      setKopirano(false);
    }
  };

  const preuzmi = () => {
    const blob = new Blob(
      [
        "Rezervni kodovi za prijavu, Porezni Kalkulator\n",
        "Svaki kod se može iskoristiti samo jednom.\n\n",
        tekst,
        "\n",
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rezervni-kodovi-porezni-kalkulator.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.form}>
      <p className={styles.verifyHint}>
        Ovi kodovi su jedini način da uđete u nalog ako izgubite pristup emailu.
        Prikazuju se samo sada. Svaki radi jednom.
      </p>

      <div className={styles.backupCodes}>
        {kodovi.map((k) => (
          <code key={k} className={styles.backupCode}>
            {k}
          </code>
        ))}
      </div>

      <div className={styles.formActions} style={{ justifyContent: "flex-start" }}>
        <button type="button" className={styles.btnGhost} onClick={kopiraj}>
          {kopirano ? "Kopirano" : "Kopiraj"}
        </button>
        <button type="button" className={styles.btnGhost} onClick={preuzmi}>
          Preuzmi .txt
        </button>
      </div>

      <label className={styles.ownerToggle}>
        <input
          type="checkbox"
          checked={sacuvao}
          onChange={(e) => setSacuvao(e.target.checked)}
        />
        <span>Sačuvao sam kodove na sigurno mjesto</span>
      </label>

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={!sacuvao}
          onClick={onClose}
        >
          Završi
        </button>
      </div>
    </div>
  );
}

// ─── Novi set rezervnih kodova ───────────────────────────────────────────────

function NoviKodoviModal({
  user,
  onClose,
  onDone,
}: {
  user: AuthUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const [lozinka, setLozinka] = useState("");
  const [kodovi, setKodovi] = useState<string[]>([]);
  const [sacuvao, setSacuvao] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await regenerateBackupCodes(lozinka);
      if (!r.ok) throw new Error(twoFactorErrorText(r.error));
      return r.data;
    },
    onSuccess: (data) => {
      setGreska(null);
      setKodovi(data.backupCodes);
      onDone();
    },
    onError: (e: Error) => setGreska(e.message),
  });

  return (
    <Modal open onClose={onClose} title="Novi rezervni kodovi" maxWidthClass="max-w-[560px]">
      {kodovi.length === 0 ? (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            setGreska(null);
            mutation.mutate();
          }}
        >
          <p className={styles.verifyHint}>
            Novi set poništava sve postojeće rezervne kodove.
          </p>
          {user.hasPassword && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Trenutna lozinka</label>
              <input
                type="password"
                className={styles.input}
                value={lozinka}
                onChange={(e) => setLozinka(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
          )}
          {greska && <div className={styles.errorMsg}>{greska}</div>}
          <div className={styles.formActions}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>
              Odustani
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Generisanje…" : "Generiši nove kodove"}
            </button>
          </div>
        </form>
      ) : (
        <RezervniKodovi
          kodovi={kodovi}
          sacuvao={sacuvao}
          setSacuvao={setSacuvao}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

// ─── Isključivanje ───────────────────────────────────────────────────────────

function IskljucivanjeModal({
  user,
  metoda,
  onClose,
  onDone,
}: {
  user: AuthUser;
  metoda: TwoFactorMethod;
  onClose: () => void;
  onDone: () => void;
}) {
  const [lozinka, setLozinka] = useState("");
  const [kod, setKod] = useState("");
  const [greska, setGreska] = useState<string | null>(null);
  const [kodPoslan, setKodPoslan] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await disableTwoFactor(kod.trim(), lozinka);
      if (!r.ok) throw new Error(twoFactorErrorText(r.error));
    },
    onSuccess: () => {
      onDone();
      onClose();
    },
    onError: (e: Error) => setGreska(e.message),
  });

  const posaljiKodMutation = useMutation({
    mutationFn: async () => {
      const r = await sendCurrentMethodCode();
      if (!r.ok) throw new Error(twoFactorErrorText(r.error));
    },
    onSuccess: () => {
      setKodPoslan(true);
      setGreska(null);
    },
    onError: (e: Error) => setGreska(e.message),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Isključivanje dvofaktorske prijave"
      maxWidthClass="max-w-[560px]"
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          setGreska(null);
          mutation.mutate();
        }}
      >
        <p className={styles.verifyHint}>
          Poslije isključivanja se prijava vrši samo lozinkom. Potrebni su
          {user.hasPassword ? " lozinka i " : " "}važeći kod
          {metoda === "EMAIL"
            ? " iz zadnjeg emaila"
            : " iz aplikacije"}{" "}
          ili rezervni kod.
        </p>
        {user.hasPassword && (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Trenutna lozinka</label>
            <input
              type="password"
              className={styles.input}
              value={lozinka}
              onChange={(e) => setLozinka(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Kod ili rezervni kod</label>
          <input
            type="text"
            className={styles.input}
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            placeholder="123456"
            autoComplete="one-time-code"
            required
          />
          {metoda === "EMAIL" && (
            <button
              type="button"
              className={styles.btnEditInline}
              style={{ marginTop: "0.5rem", alignSelf: "flex-start" }}
              disabled={posaljiKodMutation.isPending}
              onClick={() => posaljiKodMutation.mutate()}
            >
              {posaljiKodMutation.isPending
                ? "Slanje…"
                : kodPoslan
                  ? "Pošalji novi kod na email"
                  : "Pošalji kod na email"}
            </button>
          )}
        </div>
        {greska && <div className={styles.errorMsg}>{greska}</div>}
        <div className={styles.formActions}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Odustani
          </button>
          <button
            type="submit"
            className={styles.btnDanger}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Isključivanje…" : "Isključi 2FA"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
