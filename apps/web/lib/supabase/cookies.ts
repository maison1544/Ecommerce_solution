import {
  getSupabaseAuthCookieName,
  type AppInstance,
} from "./config";

const LEGACY_SUPABASE_COOKIE_NAMES = [
  "sb-qdjycxcnfwtmtsoycipj-auth-token",
  "sb-jvnpxxxmwiuexufljjam-auth-token",
];

function getCookieNames(baseName: string) {
  return [
    baseName,
    ...Array.from({ length: 5 }, (_, index) => `${baseName}.${index}`),
  ];
}

function expireCookie(name: string, domain?: string) {
  const attributes = [
    `${name}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "SameSite=Lax",
  ];

  if (domain) {
    attributes.push(`Domain=${domain}`);
    attributes.push("Secure");
  }

  document.cookie = attributes.join("; ");
}

export function clearStaleSupabaseAuthCookies(appScope: AppInstance) {
  if (typeof document === "undefined") return;

  const configuredDomain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN?.trim();
  const cookieNames = new Set([
    ...getCookieNames(getSupabaseAuthCookieName(appScope)),
    ...LEGACY_SUPABASE_COOKIE_NAMES.flatMap(getCookieNames),
  ]);

  document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter((name) =>
      LEGACY_SUPABASE_COOKIE_NAMES.some(
        (legacyName) => name === legacyName || name.startsWith(`${legacyName}.`),
      ),
    )
    .forEach((name) => cookieNames.add(name));

  cookieNames.forEach((name) => {
    expireCookie(name);
    if (configuredDomain) {
      expireCookie(name, configuredDomain);
    }
  });
}
