import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/products", "/category", "/search", "/about", "/terms", "/privacy", "/guide", "/customer-service"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (!user) {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/login?redirect=/admin", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
