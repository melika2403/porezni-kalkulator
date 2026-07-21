"use client";

// Poruke i obavijesti: automatska upozorenja o isteku pretplate (računata iz
// subscription.endDate) + obavijesti koje admin objavi za korisnike. Otvaranjem
// taba nepročitane obavijesti se označe pročitanim.
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  IconMessageCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconCircleCheck,
  IconBell,
} from "@tabler/icons-react";
import {
  getMyNotifications,
  markNotificationsRead,
  type Announcement,
  type SubscriptionNotice,
  type SystemNotification,
} from "src/api/announcements";
// formatDate umjesto toLocaleDateString: browser bez bs locale podataka pada
// na root locale i ispiše "2026-07-11" umjesto DD.MM.GGGG.
import { formatDate } from "src/lib/format";

// Boja i ikona callouta po tipu obavijesti.
const TYPE_STYLES: Record<
  Announcement["type"],
  { border: string; icon: React.ReactNode }
> = {
  INFO: { border: "border-l-info", icon: <IconInfoCircle size={18} className="text-info" /> },
  WARNING: {
    border: "border-l-warning",
    icon: <IconAlertTriangle size={18} className="text-warning" />,
  },
  SUCCESS: {
    border: "border-l-success",
    icon: <IconCircleCheck size={18} className="text-success" />,
  },
};

function SubscriptionCallout({ sub }: { sub: SubscriptionNotice }) {
  if (!sub || sub.state === "OK") return null;

  let text = "";
  if (sub.state === "EXPIRING") {
    const d = sub.daysLeft;
    const suffix = d === 1 ? "dan" : d < 5 ? "dana" : "dana";
    text = `Vaša pretplata ističe za ${d} ${suffix} (${formatDate(sub.endDate)}).`;
  } else if (sub.state === "TODAY") {
    text = "Vaša pretplata ističe danas.";
  } else {
    text = `Vaša pretplata je istekla (${formatDate(sub.endDate)}).`;
  }

  const danger = sub.state === "EXPIRED";
  const wrap = danger
    ? "border-danger/40 bg-danger-bg"
    : "border-warning/40 bg-warning-bg";
  const iconColor = danger ? "text-danger" : "text-warning";

  return (
    <div
      className={`rounded-xl border ${wrap} px-4 py-3.5 flex items-start gap-3`}
    >
      <IconAlertTriangle size={20} className={`${iconColor} mt-0.5 shrink-0`} />
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-text-primary">
          {danger ? "Pretplata istekla" : "Pretplata uskoro ističe"}
        </div>
        <p className="text-[13px] leading-6 text-text-secondary mt-0.5">
          {text} Obnovite je da zadržite pristup svim funkcijama.
        </p>
        <Link
          href="/app/pretplata"
          className="inline-block mt-2 text-[13px] font-medium text-brand-700 hover:text-brand-600 underline underline-offset-2"
        >
          Obnovi pretplatu
        </Link>
      </div>
    </div>
  );
}

export function PorukeTab({ onMarkedRead }: { onMarkedRead?: () => void }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sistemske, setSistemske] = useState<SystemNotification[]>([]);
  const [sub, setSub] = useState<SubscriptionNotice>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    getMyNotifications().then((res) => {
      if (!alive) return;
      if (res.ok) {
        setAnnouncements(res.data.announcements);
        setSistemske(res.data.sistemske ?? []);
        setSub(res.data.subscription);
        // Označi pročitanim ako ima nepročitanih, pa lokalno očisti badge.
        if (res.data.unread > 0) {
          markNotificationsRead().then(() => {
            if (!alive) return;
            setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
            setSistemske((prev) => prev.map((n) => ({ ...n, read: true })));
            onMarkedRead?.();
            // badge na sidebaru čita ovaj keš
            queryClient.invalidateQueries({
              queryKey: ["notifications-unread"],
            });
          });
        }
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [onMarkedRead, queryClient]);

  const hasContent =
    announcements.length > 0 ||
    sistemske.length > 0 ||
    (sub && sub.state !== "OK");

  if (loading) {
    return (
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-6 py-10 text-center text-[13.5px] text-text-tertiary">
        Učitavanje...
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-10 py-14 text-center">
        <span className="inline-flex w-14 h-14 rounded-full bg-brand-100 text-brand-700 items-center justify-center mb-4">
          <IconMessageCircle size={26} />
        </span>
        <div className="font-serif-display text-[22px] leading-tight text-text-primary">
          Nema novih obavijesti
        </div>
        <p className="text-[13.5px] leading-6 text-text-tertiary mt-2 max-w-md mx-auto">
          Ovdje stižu napomene tima i upozorenja o rokovima i pretplati.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SubscriptionCallout sub={sub} />

      {/* sistemske notifikacije (rokovi, izvodi, plate...): klik vodi na
          odgovarajuću stranicu */}
      {sistemske.map((n) => {
        const inner = (
          <>
            <div className="flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-lg bg-brand-100 text-brand-700 items-center justify-center shrink-0">
                <IconBell size={15} />
              </span>
              <span className="text-[14px] font-medium text-text-primary flex-1 min-w-0">
                {n.title}
              </span>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
              )}
              <span className="text-[11.5px] text-text-tertiary shrink-0">
                {formatDate(n.createdAt)}
              </span>
            </div>
            {n.body && (
              <p className="text-[13px] leading-6 text-text-secondary mt-1.5 whitespace-pre-wrap">
                {n.body}
              </p>
            )}
          </>
        );
        const cls =
          "rounded-xl border border-cream-300 border-l-[3px] border-l-brand-600 bg-cream-100 px-4 py-3.5 block";
        return n.link ? (
          <Link
            key={`s-${n.id}`}
            href={n.link}
            className={`${cls} hover:bg-cream-50 transition-colors`}
          >
            {inner}
          </Link>
        ) : (
          <div key={`s-${n.id}`} className={cls}>
            {inner}
          </div>
        );
      })}

      {announcements.map((a) => {
        const s = TYPE_STYLES[a.type] || TYPE_STYLES.INFO;
        return (
          <div
            key={a.id}
            className={`rounded-xl border border-cream-300 border-l-[3px] ${s.border} bg-cream-100 px-4 py-3.5`}
          >
            <div className="flex items-center gap-2">
              {s.icon}
              <span className="text-[14px] font-medium text-text-primary flex-1 min-w-0">
                {a.title}
              </span>
              {!a.read && (
                <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
              )}
              <span className="text-[11.5px] text-text-tertiary shrink-0">
                {formatDate(a.publishedAt)}
              </span>
            </div>
            <p className="text-[13px] leading-6 text-text-secondary mt-1.5 whitespace-pre-wrap">
              {a.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}
