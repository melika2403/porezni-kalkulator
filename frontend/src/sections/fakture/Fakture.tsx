"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./fakture.module.css";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import { unwrap } from "src/api/auth";
import Modal from "src/components/Modal/Modal";
import {
  listInvoices,
  patchInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  emailInvoice,
  convertProformaToInvoice,
  type Invoice,
  type InvoiceType,
  type InvoiceStatus,
} from "src/api/invoices";

type Tab = "ALL" | "INVOICE" | "PROFORMA";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Nacrt",
  ISSUED: "Izdana",
  PAID: "Plaćena",
  CANCELLED: "Otkazana",
};

function fmtMoney(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0,00";
  const [int, dec] = n.toFixed(2).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + dec;
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}.`;
}

export default function Fakture() {
  // Faza 3B: pristup imamo ako vlastiti plan je PRO+, ILI smo član bilo koje
  // organizacije čiji je vlasnik PRO+. Backend već vraća uniju u listingu.
  const { hasAccessToTier, isLoading: roleLoading } = useMaxAccessibleTier();
  const isAllowed = hasAccessToTier("PRO");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ALL");
  const qc = useQueryClient();

  // Korisnici bez PRO/BUSINESS nemaju listu — ali mogu da koriste preview formu.
  // Umjesto intermediate "Probaj preview" ekrana, otvori formu direktno.
  useEffect(() => {
    if (!roleLoading && !isAllowed) {
      router.replace("/fakture/nova");
    }
  }, [roleLoading, isAllowed, router]);

  const {
    data: invoices = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invoices", tab],
    queryFn: () =>
      unwrap(
        listInvoices(tab === "ALL" ? undefined : { type: tab as InvoiceType }),
      ),
    enabled: isAllowed,
  });

  const markPaid = useMutation({
    mutationFn: (id: number) => unwrap(patchInvoice(id, { status: "PAID" })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
  const cancel = useMutation({
    mutationFn: (id: number) =>
      unwrap(patchInvoice(id, { status: "CANCELLED" })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => unwrap(deleteInvoice(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
  // ── Modal state ────────────────────────────────────────────────────────
  const [emailFor, setEmailFor] = useState<Invoice | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null);
  const [confirmConvert, setConfirmConvert] = useState<Invoice | null>(null);
  const [resultMsg, setResultMsg] = useState<{
    title: string;
    message: string;
    isError?: boolean;
  } | null>(null);

  const convert = useMutation({
    mutationFn: (id: number) => unwrap(convertProformaToInvoice(id)),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setResultMsg({
        title: "Faktura kreirana",
        message: `Predračun je pretvoren u fakturu ${inv.fullNumber}.`,
      });
    },
    onError: (e: Error) => {
      setResultMsg({
        title: "Greška pri konverziji",
        message: e.message,
        isError: true,
      });
    },
  });

  const sendEmail = useMutation({
    mutationFn: ({ id, to }: { id: number; to: string }) =>
      unwrap(emailInvoice(id, { to })),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setResultMsg({
        title: "Email poslat",
        message: `Faktura je uspješno poslana na ${data.sentTo}.`,
      });
    },
    onError: (e: Error) => {
      setResultMsg({
        title: "Greška pri slanju",
        message: e.message,
        isError: true,
      });
    },
  });

  function validateEmail(v: string): string | null {
    if (!v) return "Unesite email adresu";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      return "Neispravan format email adrese";
    return null;
  }

  const sorted = useMemo(
    () => invoices.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [invoices],
  );

  const convertedMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const inv of invoices) {
      if (inv.convertedFromProformaId)
        m.set(inv.convertedFromProformaId, inv.fullNumber);
      if (inv.type === "PROFORMA" && inv.convertedToFullNumber) {
        m.set(inv.id, inv.convertedToFullNumber);
      }
    }
    return m;
  }, [invoices]);

  if (roleLoading || !isAllowed) {
    // Tokom učitavanja, ili dok redirect-na-formu okine, prikaži minimalni placeholder.
    return (
      <div className={styles.page}>
        <div className={styles.empty}>Učitavanje…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.label}>Fakture</div>
          <h1 className={styles.h1}>
            Fakture i <em>predračuni</em>
          </h1>
          <p className={styles.subtitle}>
            Lista svih izdanih dokumenata. Numeracija po godini, izvoz u PDF.
          </p>
        </div>
        <div>
          <Link
            href="/fakture/nova"
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            + Novi dokument
          </Link>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "ALL" ? styles.tabActive : ""}`}
          onClick={() => setTab("ALL")}
        >
          Sve
        </button>
        <button
          className={`${styles.tab} ${tab === "INVOICE" ? styles.tabActive : ""}`}
          onClick={() => setTab("INVOICE")}
        >
          Fakture
        </button>
        <button
          className={`${styles.tab} ${tab === "PROFORMA" ? styles.tabActive : ""}`}
          onClick={() => setTab("PROFORMA")}
        >
          Predračuni
        </button>
      </div>

      {error && (
        <div className={styles.errorMsg}>
          Greška: {String((error as Error).message)}
        </div>
      )}
      {isLoading && <div className={styles.empty}>Učitavanje…</div>}

      {!isLoading && sorted.length === 0 && (
        <div className={styles.empty}>
          Još nema dokumenata. Kliknite <strong>+ Novi dokument</strong> da
          kreirate prvu fakturu ili predračun.
        </div>
      )}

      {!isLoading && sorted.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Broj</th>
              <th>Tip</th>
              <th>Kupac</th>
              <th>Datum</th>
              <th>Dospijeće</th>
              <th className={styles.numeric}>Iznos</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv: Invoice) => (
              <tr key={inv.id}>
                <td>
                  <strong>{inv.fullNumber}</strong>
                </td>
                <td>{inv.type === "INVOICE" ? "Faktura" : "Predračun"}</td>
                <td>{inv.buyerName}</td>
                <td>{fmtDate(inv.issueDate)}</td>
                <td>{fmtDate(inv.dueDate)}</td>
                <td className={styles.numeric}>
                  {fmtMoney(inv.grossTotal)}{" "}
                  {inv.currency === "EUR" ? "EUR" : "KM"}
                </td>
                <td>
                  <div className={styles.statusCell}>
                    <span
                      className={`${styles.statusBadge} ${styles[`status${inv.status}`]}`}
                    >
                      {STATUS_LABELS[inv.status]}
                    </span>
                    {inv.emailSentAt && (
                      <span
                        className={`${styles.statusBadge} ${styles.statusEMAILED}`}
                        title={`Poslano ${fmtDate(inv.emailSentAt)} na ${inv.emailSentTo || "?"}`}
                      >
                        ✉ Poslano
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className={styles.actionsCell}>
                    <button
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={() =>
                        downloadInvoicePdf(
                          inv.id,
                          `${inv.type === "INVOICE" ? "Faktura" : "Predracun"}-${inv.fullNumber}.pdf`,
                        )
                      }
                    >
                      PDF
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={() => setEmailFor(inv)}
                      disabled={sendEmail.isPending}
                      title="Pošalji PDF na email kupca"
                    >
                      {sendEmail.isPending && sendEmail.variables?.id === inv.id
                        ? "Šaljem…"
                        : "✉ E-mail"}
                    </button>
                    {inv.type === "PROFORMA" &&
                      (convertedMap.has(inv.id) ? (
                        <span
                          className={`${styles.statusBadge} ${styles.statusCONVERTED}`}
                          title={`Pretvoreno u fakturu ${convertedMap.get(inv.id)}`}
                        >
                          ✓ Faktura napravljena
                        </span>
                      ) : (
                        <button
                          className={`${styles.btn} ${styles.btnAccent}`}
                          onClick={() => setConfirmConvert(inv)}
                          disabled={convert.isPending}
                          title="Kreiraj fakturu iz ovog predračuna"
                        >
                          Napravi fakturu
                        </button>
                      ))}
                    {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => markPaid.mutate(inv.id)}
                        disabled={markPaid.isPending}
                      >
                        Plaćeno
                      </button>
                    )}
                    {inv.status !== "CANCELLED" && (
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => setConfirmCancel(inv)}
                        disabled={cancel.isPending}
                      >
                        Otkaži
                      </button>
                    )}
                    <Link
                      href={`/fakture/nova?duplicateFrom=${inv.id}`}
                      className={`${styles.btn} ${styles.btnGhost}`}
                      title="Napravi novi dokument sa istim podacima"
                    >
                      ⧉ Dupliciraj
                    </Link>
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={() => setConfirmDelete(inv)}
                      disabled={remove.isPending}
                    >
                      Obriši
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        kind="prompt"
        open={!!emailFor}
        title={
          emailFor?.emailSentAt
            ? "Ponovo poslati fakturu?"
            : "Pošalji fakturu emailom"
        }
        message={
          emailFor?.emailSentAt
            ? `⚠ Ova faktura je već poslana ${fmtDate(emailFor.emailSentAt)} na ${emailFor.emailSentTo || "—"}. Slanjem opet kupac će dobiti drugi email sa istom fakturom.`
            : "PDF se šalje kao prilog. Odgovori kupca idu direktno na email prodavca (Reply-To)."
        }
        inputType="email"
        inputPlaceholder="kupac@email.com"
        defaultValue={emailFor?.emailSentTo || emailFor?.buyerEmail || ""}
        confirmLabel={emailFor?.emailSentAt ? "Pošalji ponovo" : "Pošalji"}
        validate={validateEmail}
        variant={emailFor?.emailSentAt ? "danger" : "default"}
        onConfirm={(to) => {
          if (emailFor) sendEmail.mutate({ id: emailFor.id, to });
        }}
        onClose={() => setEmailFor(null)}
      />

      <Modal
        kind="confirm"
        open={!!confirmCancel}
        title="Otkazati dokument?"
        message={
          confirmCancel
            ? `Dokument ${confirmCancel.fullNumber} će biti označen kao otkazan.`
            : ""
        }
        confirmLabel="Otkaži dokument"
        cancelLabel="Nazad"
        variant="danger"
        onConfirm={() => {
          if (confirmCancel) cancel.mutate(confirmCancel.id);
        }}
        onClose={() => setConfirmCancel(null)}
      />

      <Modal
        kind="confirm"
        open={!!confirmDelete}
        title="Trajno obrisati dokument?"
        message={
          confirmDelete
            ? `Dokument ${confirmDelete.fullNumber} će biti trajno obrisan. Ovu akciju nije moguće poništiti.`
            : ""
        }
        confirmLabel="Obriši"
        cancelLabel="Nazad"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) remove.mutate(confirmDelete.id);
        }}
        onClose={() => setConfirmDelete(null)}
      />

      <Modal
        kind="confirm"
        open={!!confirmConvert}
        title="Pretvoriti predračun u fakturu?"
        message={
          confirmConvert
            ? `Iz predračuna ${confirmConvert.fullNumber} bit će kreirana nova faktura sa istim stavkama i kupcem. Predračun će biti označen kao realizovan.`
            : ""
        }
        confirmLabel="Pretvori"
        cancelLabel="Nazad"
        onConfirm={() => {
          if (confirmConvert) convert.mutate(confirmConvert.id);
        }}
        onClose={() => setConfirmConvert(null)}
      />

      <Modal
        kind="alert"
        open={!!resultMsg}
        title={resultMsg?.title || ""}
        message={resultMsg?.message}
        variant={resultMsg?.isError ? "danger" : "default"}
        onClose={() => setResultMsg(null)}
      />
    </div>
  );
}
