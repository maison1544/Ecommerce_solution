export type AppInstance = "user" | "admin";

export function normalizeAppInstance(value: unknown): AppInstance | null {
  if (value === "admin") return "admin";
  if (value === "user" || value === "app" || value === "www") return "user";
  return null;
}

export function resolveAppInstanceFromPathname(pathname = "/"): AppInstance {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return "user";
}

export function resolveAppInstanceFromHost(hostname = ""): AppInstance | null {
  const normalized = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (!normalized || normalized === "localhost" || normalized === "127.0.0.1") {
    return null;
  }

  const firstLabel = normalized.split(".")[0];
  return normalizeAppInstance(firstLabel);
}

export function resolveAppInstance(input?: {
  hostname?: string;
  pathname?: string;
}): AppInstance {
  const fromPath = input?.pathname
    ? resolveAppInstanceFromPathname(input.pathname)
    : null;
  if (fromPath === "admin") return fromPath;

  const fromHost = resolveAppInstanceFromHost(input?.hostname ?? "");
  if (fromHost) return fromHost;

  if (fromPath) return fromPath;

  const raw =
    typeof window !== "undefined"
      ? ((window as unknown as Record<string, unknown>).__APP_INSTANCE__ ??
        process.env.NEXT_PUBLIC_APP_INSTANCE)
      : process.env.NEXT_PUBLIC_APP_INSTANCE;

  return normalizeAppInstance(raw) ?? "user";
}

export function resolveBrowserAppInstance(): AppInstance {
  if (typeof window === "undefined") {
    return resolveAppInstance();
  }

  return resolveAppInstance({
    hostname: window.location.hostname,
    pathname: window.location.pathname,
  });
}

const PROJECT_NAME = "ecommerce";

export function getSupabaseAuthCookieName(
  instance: AppInstance = resolveAppInstance(),
) {
  return `sb-${PROJECT_NAME}-${instance}-auth-token`;
}

export function getSupabaseAuthStorageKey(
  instance: AppInstance = resolveAppInstance(),
) {
  return `sb-${PROJECT_NAME}-${instance}-auth-token`;
}

export function getSupabaseCookieOptions(
  instance: AppInstance = resolveAppInstance(),
) {
  return {
    name: getSupabaseAuthCookieName(instance),
  };
}
