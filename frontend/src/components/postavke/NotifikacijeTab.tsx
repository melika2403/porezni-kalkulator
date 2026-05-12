"use client";

import { useState } from "react";

type NotificationKey =
  | "newTransactions"
  | "doprinosiDeadline"
  | "pdvDeadline"
  | "inApp";

const ITEMS: { key: NotificationKey; label: string; description: string }[] = [
  {
    key: "newTransactions",
    label: "Email obavijesti za nove transakcije",
    description: "Šaljemo poruku kada banka dovuče novu transakciju.",
  },
  {
    key: "doprinosiDeadline",
    label: "Email obavijesti za rok plaćanja doprinosa",
    description: "Podsjećamo nekoliko dana prije isteka roka.",
  },
  {
    key: "pdvDeadline",
    label: "Email obavijesti za PDV prijave",
    description: "Pripremamo te za podnošenje obrasca svaki mjesec.",
  },
  {
    key: "inApp",
    label: "In-app obavijesti",
    description: "Prikazujemo obavještenja unutar aplikacije.",
  },
];

const DEFAULTS: Record<NotificationKey, boolean> = {
  newTransactions: true,
  doprinosiDeadline: true,
  pdvDeadline: true,
  inApp: true,
};

export function NotifikacijeTab() {
  const [state, setState] = useState<Record<NotificationKey, boolean>>(DEFAULTS);

  function toggle(key: NotificationKey) {
    setState((s) => ({ ...s, [key]: !s[key] }));
  }

  return (
    <div className="space-y-4">
      <div className="text-[12px] text-text-tertiary bg-info-bg/40 border border-info-bg px-3 py-2 rounded-lg">
        Backend integracija stiže uskoro — sad samo demo.
      </div>
      <div className="bg-cream-100 border border-cream-300 rounded-lg divide-y divide-cream-300">
        {ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between gap-4 px-5 py-4"
          >
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-text-primary">
                {item.label}
              </div>
              <div className="text-[12px] text-text-tertiary mt-0.5">
                {item.description}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state[item.key]}
              onClick={() => toggle(item.key)}
              className={[
                "relative shrink-0 w-10 h-6 rounded-full transition-colors",
                state[item.key] ? "bg-brand-600" : "bg-cream-300",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                  state[item.key] ? "translate-x-[18px]" : "translate-x-0.5",
                ].join(" ")}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
