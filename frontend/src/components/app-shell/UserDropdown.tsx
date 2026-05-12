"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconCreditCard,
  IconLogout,
  IconMoon,
  IconSun,
  IconUser,
} from "@tabler/icons-react";
import { logout } from "src/api/auth";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";

function getMarketingUrl() {
  if (typeof window === "undefined") return "";
  const isProd = window.location.hostname.endsWith("poreznikalkulator.ba");
  if (isProd) return "https://poreznikalkulator.ba";
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//localhost${port}`;
}

export function UserDropdown() {
  const { data } = usePkOfficeMe();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      qc.clear();
      const marketing = getMarketingUrl();
      if (marketing) {
        window.location.href = marketing;
      } else {
        router.push("/prijava");
      }
    },
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const user = data;
  if (!user) {
    return <div className="w-9 h-9" aria-hidden />;
  }

  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`${user.firstName} ${user.lastName}`}
        className="w-12 h-12 rounded-full bg-brand-100 hover:bg-brand-100/80 text-brand-700 flex items-center justify-center text-[15px] font-semibold transition-colors"
      >
        {initials || <IconUser size={22} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-56 bg-cream-100 border border-cream-300 rounded-lg shadow-[0_8px_28px_-8px_rgba(15,26,18,0.18)] overflow-hidden">
          <div className="px-4 py-3 border-b border-cream-300">
            <div className="text-[13px] font-medium text-text-primary truncate">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-[11.5px] text-text-tertiary truncate mt-0.5">
              {user.email}
            </div>
          </div>
          <div className="py-1">
            <a
              href={`${getMarketingUrl()}/profil`}
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] hover:bg-cream-200 text-text-primary transition-colors"
            >
              <IconUser size={16} className="text-text-secondary" />
              Moj profil
            </a>
            <Link
              href="/app/pretplata"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] hover:bg-cream-200 text-text-primary transition-colors"
            >
              <IconCreditCard size={16} className="text-text-secondary" />
              Pretplata
            </Link>
            <button
              type="button"
              onClick={() => {
                setTheme(isDark ? "light" : "dark");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] hover:bg-cream-200 text-text-primary text-left transition-colors"
            >
              {isDark ? (
                <IconSun size={16} className="text-text-secondary" />
              ) : (
                <IconMoon size={16} className="text-text-secondary" />
              )}
              {isDark ? "Svijetla tema" : "Tamna tema"}
            </button>
          </div>
          <div className="border-t border-cream-300 py-1">
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] hover:bg-danger-bg text-danger text-left disabled:opacity-50 transition-colors"
            >
              <IconLogout size={16} />
              {logoutMutation.isPending ? "Odjavljivanje..." : "Odjavi se"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
