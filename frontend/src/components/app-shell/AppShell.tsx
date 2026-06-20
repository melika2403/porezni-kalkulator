"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-cream-50 text-text-primary">
      <TopBar onMenuClick={() => setDrawerOpen(true)} />
      <div className="flex flex-1 min-h-0 min-[900px]:h-[calc(100vh-54px)]">
        <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
