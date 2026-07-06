"use client";

// Dijeljena potvrda brisanja radnika (app + marketing stranice).
// Pravila: vlasnik se ne briše (backend guard, ovdje se akcija i ne nudi);
// direktor d.o.o.-a se ne briše dok se ne odredi zamjena (backend vraća
// DIREKTOR_SE_NE_BRISE); za PRIJAVLJENOG radnika ide veliko upozorenje,
// za odjavljenog/draft standardna potvrda.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { deleteWorker, type Worker } from "src/api/profile";
import { unwrap } from "src/api/auth";

const ERROR_LABELS: Record<string, string> = {
  VLASNIK_SE_NE_BRISE:
    "Vlasnik se ne može obrisati: organizacija ne može postojati bez vlasnika. Promjena vlasnika ide kroz postavke organizacije.",
  DIREKTOR_SE_NE_BRISE:
    "Ovaj radnik je označen kao direktor / potpisnik. Prvo u pregledu organizacije odaberite drugog direktora, pa ga onda obrišite.",
  RADNIK_IMA_OBRACUNE:
    "Radnik ima obračune plata pa se ne može obrisati: podaci moraju ostati za GIP i godišnje izvještaje. Umjesto brisanja upišite mu datum odjave.",
};

export function DeleteWorkerModal({
  orgId,
  worker,
  onClose,
}: {
  orgId: number;
  /** null = zatvoreno */
  worker: Worker | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: (id: number) => unwrap(deleteWorker(orgId, id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-workers", orgId] });
      onClose();
    },
  });

  const prijavljen = worker?.employmentStatus === "PRIJAVLJEN";
  const errorMsg = del.isError
    ? (ERROR_LABELS[(del.error as Error).message] ??
      "Greška pri brisanju, pokušajte ponovo.")
    : null;

  return (
    <Modal
      open={worker != null}
      onClose={onClose}
      title="Obriši radnika"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Odustani
          </button>
          <button
            type="button"
            disabled={del.isPending}
            onClick={() => worker && del.mutate(worker.id)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {del.isPending && <IconLoader2 size={15} className="animate-spin" />}
            {prijavljen ? "Svejedno obriši" : "Obriši"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {prijavljen && (
          <div className="flex gap-2.5 items-start px-3.5 py-3 rounded-lg bg-danger-bg border border-danger/30">
            <IconAlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
            <div className="text-[13px] leading-5 text-danger">
              <strong>
                Radnik je PRIJAVLJEN kod PIO/ZZO.
              </strong>{" "}
              Brisanjem nestaje iz evidencije radnika. Ako je radnik prestao
              raditi, ispravan postupak je odjava (JS3100 + datum odjave), ne
              brisanje.
            </div>
          </div>
        )}
        <p className="text-[13px] leading-6 text-text-secondary">
          Obrisati radnika{" "}
          <strong className="text-text-primary">
            {worker?.firstName} {worker?.lastName}
          </strong>
          ? Brisanje je trajno i moguće je samo za radnike bez obračuna plata
          (obračuni se čuvaju za GIP i godišnje izvještaje).
          {!prijavljen &&
            " Za radnika koji je prestao raditi obično je ispravnije upisati datum odjave nego ga brisati."}
        </p>
        {errorMsg && (
          <p className="text-[12.5px] leading-5 text-accent-500">{errorMsg}</p>
        )}
      </div>
    </Modal>
  );
}
