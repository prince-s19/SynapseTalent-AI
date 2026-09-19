import type { ReactNode } from "react";

import { AppShell } from "@/components/talent/app-shell";

/** Wraps every in-app page: shell chrome plus a soft enter transition. */
export function AppPage({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="page-enter">{children}</div>
    </AppShell>
  );
}
