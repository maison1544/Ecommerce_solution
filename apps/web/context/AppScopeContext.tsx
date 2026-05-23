"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  getSupabaseAuthCookieName,
  getSupabaseAuthStorageKey,
  resolveBrowserAppInstance,
  type AppInstance,
} from "@/lib/supabase/config";

interface AppScopeContextValue {
  appScope: AppInstance;
  authScope: AppInstance;
  sessionScope: AppInstance;
  storageKey: string;
  cookieName: string;
}

const AppScopeContext = createContext<AppScopeContextValue | undefined>(
  undefined,
);

export function AppScopeProvider({
  appScope,
  children,
}: {
  appScope?: AppInstance;
  children: ReactNode;
}) {
  const resolvedScope = appScope ?? resolveBrowserAppInstance();
  const value = useMemo(
    () => ({
      appScope: resolvedScope,
      authScope: resolvedScope,
      sessionScope: resolvedScope,
      storageKey: getSupabaseAuthStorageKey(resolvedScope),
      cookieName: getSupabaseAuthCookieName(resolvedScope),
    }),
    [resolvedScope],
  );

  return (
    <AppScopeContext.Provider value={value}>{children}</AppScopeContext.Provider>
  );
}

export function useAppScope() {
  const context = useContext(AppScopeContext);
  if (!context) {
    throw new Error("useAppScope must be used within an AppScopeProvider");
  }
  return context;
}
