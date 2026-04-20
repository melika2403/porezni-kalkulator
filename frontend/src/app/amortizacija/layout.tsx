"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";

export default function AmortizacijaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/prijava");
    }
  }, [user, isLoading, router]);

  if (isLoading) return null;
  if (!user) return null;

  return <>{children}</>;
}
