"use client";

// Postavke notifikacija: org-vezane (svaki član podešava svoje za izabrani
// obrt) + korisničke (podrška, važe za sve obrte). Toggle odmah sprema (PUT),
// uz optimistični prikaz.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotifPrefs,
  putNotifPrefs,
  type NotifPrefs,
  type OrgNotifPrefs,
  type UserNotifPrefs,
} from "src/api/announcements";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { unwrap } from "src/api/auth";

type OrgKey = keyof OrgNotifPrefs;
type UserKey = keyof UserNotifPrefs;

const ORG_ITEMS: { key: OrgKey; label: string; description: string }[] = [
  {
    key: "doprinosiDeadline",
    label: "Rok doprinosa i poreza (email)",
    description:
      "Podsjetnik 7. i 10. u mjesecu, samo ako uplata još nije evidentirana na izvodu.",
  },
  {
    key: "pdvDeadline",
    label: "PDV prijava (email)",
    description:
      "Podsjetnik 7. i 10. u mjesecu za PDV prijavu i uplatu; samo za PDV obveznike.",
  },
  {
    key: "plateReminder",
    label: "Plate i MIP (email)",
    description:
      "5. u mjesecu ako plate za prethodni mjesec nisu obračunate; 12. ako MIP-1023 nije preuzet.",
  },
  {
    key: "godisnjiRokovi",
    label: "Godišnji rokovi (email)",
    description: "GIP-1022 (januar) i godišnja prijava GPD sa SPR-om (mart).",
  },
  {
    key: "digest",
    label: "Sedmični pregled (email)",
    description:
      "Ponedjeljkom: nepovezane transakcije, dospjele fakture, stari izvodi. Šalje se samo kad ima nečega.",
  },
  {
    key: "inApp",
    label: "In-app obavijesti",
    description:
      "Sistemske obavijesti u Inboxu: rokovi, izvod koji je učitao kolega...",
  },
];

const USER_ITEMS: { key: UserKey; label: string; description: string }[] = [
  {
    key: "podrskaEmail",
    label: "Odgovor podrške (email)",
    description:
      "Email kad vam podrška odgovori a niste u aplikaciji. Važi za sve obrte.",
  },
];

function Red({
  label,
  description,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-text-primary">{label}</div>
        <div className="text-[12px] text-text-tertiary mt-0.5">
          {description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        disabled={disabled}
        className={[
          "relative shrink-0 w-10 h-6 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-brand-600" : "bg-cream-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute left-0 top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export function NotifikacijeTab() {
  const qc = useQueryClient();
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const prefsQ = useQuery({
    queryKey: ["notif-prefs", orgId],
    queryFn: () => unwrap(getNotifPrefs(orgId as number)),
    enabled: orgId != null,
  });

  const saveM = useMutation({
    mutationFn: (payload: {
      org?: Partial<OrgNotifPrefs>;
      user?: Partial<UserNotifPrefs>;
    }) =>
      unwrap(putNotifPrefs({ organizationId: orgId as number, ...payload })),
    // optimistično: toggle se odmah vidi, server odgovor ga potvrdi
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["notif-prefs", orgId] });
      const prev = qc.getQueryData<NotifPrefs>(["notif-prefs", orgId]);
      if (prev) {
        qc.setQueryData<NotifPrefs>(["notif-prefs", orgId], {
          org: { ...prev.org, ...(payload.org ?? {}) },
          user: { ...prev.user, ...(payload.user ?? {}) },
        });
      }
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notif-prefs", orgId], ctx.prev);
    },
    onSuccess: (data) => {
      qc.setQueryData(["notif-prefs", orgId], data);
    },
  });

  const prefs = prefsQ.data;
  const busy = orgId == null || prefsQ.isLoading;

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-text-tertiary">
        Postavke važe za vas i obrt{" "}
        <strong className="text-text-primary">{activeOrg?.name ?? ""}</strong>:
        svaki član obrta podešava svoje obavijesti. Emailovi za rokove se šalju
        samo dok obaveza nije izmirena, a sedmični pregled samo kad ima nečega
        za pažnju.
      </p>

      {prefsQ.isError && (
        <div className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-[13px] text-danger">
          Postavke se ne mogu učitati. Osvježite stranicu ili pokušajte
          kasnije.
        </div>
      )}

      <div className="bg-cream-100 border border-cream-300 rounded-lg divide-y divide-cream-300">
        {ORG_ITEMS.map((item) => (
          <Red
            key={item.key}
            label={item.label}
            description={item.description}
            checked={prefs?.org[item.key] ?? true}
            disabled={busy || saveM.isPending}
            onToggle={() =>
              saveM.mutate({
                org: { [item.key]: !(prefs?.org[item.key] ?? true) },
              })
            }
          />
        ))}
      </div>

      <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary pt-1">
        Nalog (važi za sve obrte)
      </div>
      <div className="bg-cream-100 border border-cream-300 rounded-lg divide-y divide-cream-300">
        {USER_ITEMS.map((item) => (
          <Red
            key={item.key}
            label={item.label}
            description={item.description}
            checked={prefs?.user[item.key] ?? true}
            disabled={busy || saveM.isPending}
            onToggle={() =>
              saveM.mutate({
                user: { [item.key]: !(prefs?.user[item.key] ?? true) },
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
