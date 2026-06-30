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
  IconChevronDown,
} from "@tabler/icons-react";
import { logout } from "src/api/auth";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";

function getMarketingUrl() {
  if (typeof window === "undefined") return "";
  const isProd = window.location.hostname.endsWith("poreznikalkulator.ba");
  if (isProd) return "https://www.poreznikalkulator.ba";
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
        className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-3xl hover:bg-[rgba(15,26,18,0.05)] transition-colors"
      >
        <span className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">
          {initials || <IconUser size={20} />}
        </span>
        <span className="text-[13.5px] font-medium text-text-primary leading-none max-[600px]:hidden">
          {user.firstName} {user.lastName}
        </span>
        <IconChevronDown
          size={16}
          className={`text-text-tertiary shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2.5 z-30 w-[270px] bg-cream-100 border border-cream-300 rounded-xl shadow-[0_12px_34px_-10px_rgba(15,26,18,0.24)] overflow-hidden p-2">
          <div className="flex items-center gap-3 px-2.5 py-2.5 mb-1">
            <span className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-[14px] font-semibold shrink-0">
              {initials || <IconUser size={20} />}
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-text-primary truncate">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-[12px] text-text-tertiary truncate mt-0.5">
                {user.email}
              </div>
            </div>
          </div>
          <div className="border-t border-cream-300 pt-1.5 flex flex-col gap-0.5">
            <a
              href={`${getMarketingUrl()}/profil`}
              className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-[13.5px] hover:bg-cream-200 text-text-primary transition-colors"
            >
              <IconUser size={19} className="text-text-secondary shrink-0" />
              Moj profil
            </a>
            <Link
              href="/app/pretplata"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-[13.5px] hover:bg-cream-200 text-text-primary transition-colors"
            >
              <IconCreditCard size={19} className="text-text-secondary shrink-0" />
              Pretplata
            </Link>
            <button
              type="button"
              onClick={() => {
                setTheme(isDark ? "light" : "dark");
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-[13.5px] hover:bg-cream-200 text-text-primary text-left transition-colors"
            >
              {isDark ? (
                <IconSun size={19} className="text-text-secondary shrink-0" />
              ) : (
                <IconMoon size={19} className="text-text-secondary shrink-0" />
              )}
              {isDark ? "Svijetla tema" : "Tamna tema"}
            </button>
          </div>
          <div className="border-t border-cream-300 mt-1.5 pt-1.5">
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-[13.5px] hover:bg-danger-bg text-danger text-left disabled:opacity-50 transition-colors"
            >
              <IconLogout size={19} className="shrink-0" />
              {logoutMutation.isPending ? "Odjavljivanje..." : "Odjavi se"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
