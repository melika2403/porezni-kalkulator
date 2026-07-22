"use client";

// Meta Pixel broji PageView samo na prvom učitavanju; ovo dopunjava
// klijentsku (SPA) navigaciju. Prvi PageView šalje snippet u layout-u,
// pa ovdje preskačemo inicijalni render.
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { fbqPageView } from "src/lib/metaPixel";

export default function MetaPixelPageView() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    fbqPageView();
  }, [pathname]);

  return null;
}
