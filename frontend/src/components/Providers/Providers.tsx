"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoticeProvider } from "src/components/Notice/Notice";
import { captureUtm } from "src/utils/utm";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Uhvati UTM izvor na prvom dolasku (čuva se do registracije).
  useEffect(() => {
    captureUtm();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NoticeProvider>{children}</NoticeProvider>
    </QueryClientProvider>
  );
}
