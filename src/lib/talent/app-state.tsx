import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { HERO_EMPLOYEE_ID } from "./queries";

interface AppState {
  employeeId: string;
  setEmployeeId: (id: string) => void;
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
  hydrated: boolean;
}

const AppStateContext = createContext<AppState | null>(null);

const EMPLOYEE_KEY = "synapse.employeeId";
const DEMO_KEY = "synapse.demoMode";

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [employeeId, setEmployeeIdState] = useState(HERO_EMPLOYEE_ID);
  const [demoMode, setDemoModeState] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedEmployee = localStorage.getItem(EMPLOYEE_KEY);
      if (storedEmployee) setEmployeeIdState(storedEmployee);
      const storedDemo = localStorage.getItem(DEMO_KEY);
      if (storedDemo === "false") setDemoModeState(false);
    } catch {
      /* storage unavailable — defaults are fine */
    }
    setHydrated(true);
  }, []);

  const setEmployeeId = useCallback((id: string) => {
    setEmployeeIdState(id);
    try {
      localStorage.setItem(EMPLOYEE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const setDemoMode = useCallback((value: boolean) => {
    setDemoModeState(value);
    try {
      localStorage.setItem(DEMO_KEY, String(value));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ employeeId, setEmployeeId, demoMode, setDemoMode, hydrated }),
    [employeeId, setEmployeeId, demoMode, setDemoMode, hydrated],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside AppStateProvider");
  return context;
}
