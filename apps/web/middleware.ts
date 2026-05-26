import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import {
  resolveAppInstance,
  resolveAppInstanceFromHost,
  resolveAppInstanceFromPathname,
  type AppInstance,
} from "@/lib/supabase/config";

const PUBLIC_PATHS_BY_SCOPE: Record<AppInstance, string[]> = {
  user: [
    "/",
    "/login",
    "/signup",
    "/products",
    "/product",
    "/category",
    "/search",
    "/about",
    "/terms",
    "/privacy",
    "/guide",
    "/customer-service",
  ],
  admin: ["/admin/login"],
};

const LOGIN_PATH_BY_SCOPE: Record<AppInstance, string> = {
  user: "/login",
  admin: "/admin/login",
};

function isPublicPath(pathname: string, appScope: AppInstance) {
  return PUBLIC_PATHS_BY_SCOPE[appScope].some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}

function resolveScopedPathname(pathname: string, appScope: AppInstance) {
  if (appScope === "user") return pathname;
  if (pathname === "/") return `/${appScope}`;
  if (pathname === "/login") return `/${appScope}/login`;
  if (pathname === `/${appScope}` || pathname.startsWith(`/${appScope}/`)) {
    return pathname;
  }
  return `/${appScope}${pathname}`;
}

function copySessionCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

function getCanonicalRedirect(request: NextRequest) {
  const canonicalHost = process.env.NEXT_PUBLIC_CANONICAL_HOST?.trim().toLowerCase();
  const hostname = request.nextUrl.hostname.toLowerCase();

  if (!canonicalHost || hostname !== `www.${canonicalHost}`) {
    return null;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = "https:";
  redirectUrl.hostname = canonicalHost;
  return NextResponse.redirect(redirectUrl, 308);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const canonicalRedirect = getCanonicalRedirect(request);

  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const hostname = request.headers.get("host") ?? request.nextUrl.hostname;
  const hostScope = resolveAppInstanceFromHost(hostname);
  const appScope = resolveAppInstance({ hostname, pathname });
  const originalPathScope = resolveAppInstanceFromPathname(pathname);
  const shouldUsePathScope = originalPathScope === "admin";

  if (
    hostScope &&
    !shouldUsePathScope &&
    originalPathScope !== "user" &&
    originalPathScope !== appScope
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const scopedPathname = hostScope && !shouldUsePathScope
    ? resolveScopedPathname(pathname, appScope)
    : pathname;
  const pathScope = resolveAppInstanceFromPathname(scopedPathname);
  const needsRewrite = scopedPathname !== pathname;

  if (!hostScope && appScope !== pathScope) {
    return NextResponse.redirect(
      new URL(LOGIN_PATH_BY_SCOPE[appScope], request.url),
    );
  }

  if (isPublicPath(scopedPathname, appScope)) {
    if (needsRewrite) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = scopedPathname;
      return NextResponse.rewrite(rewriteUrl);
    }
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request, appScope);

  if (!user) {
    const loginPath =
      hostScope && !shouldUsePathScope ? "/login" : LOGIN_PATH_BY_SCOPE[appScope];
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const role = user.app_metadata?.role || "customer";
  if (appScope === "admin" && role !== "admin") {
    const loginPath = hostScope && !shouldUsePathScope ? "/login" : "/admin/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (appScope === "user" && role === "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (needsRewrite) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = scopedPathname;
    return copySessionCookies(NextResponse.rewrite(rewriteUrl), response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
