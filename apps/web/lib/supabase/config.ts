export type AppInstance = "user" | "admin";

export function resolveAppInstance(): AppInstance {
  const raw =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, unknown>).__APP_INSTANCE__ ??
        process.env.NEXT_PUBLIC_APP_INSTANCE
      : process.env.NEXT_PUBLIC_APP_INSTANCE;

  if (raw === "admin") return "admin";
  return "user";
}

const PROJECT_NAME = "ecommerce";

export function getSupabaseAuthCookieName() {
  return `sb-${PROJECT_NAME}-${resolveAppInstance()}-auth-token`;
}

export function getSupabaseAuthStorageKey() {
  return `sb-${PROJECT_NAME}-${resolveAppInstance()}-auth-token`;
}

export function getSupabaseCookieOptions() {
  return {
    name: getSupabaseAuthCookieName(),
  };
}
