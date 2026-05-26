import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseCookieOptions, type AppInstance } from "./config";

export async function updateSession(
  request: NextRequest,
  appScope: AppInstance = "user",
) {
  let supabaseResponse = NextResponse.next({ request });
  const cookieOptions = getSupabaseCookieOptions(appScope);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response: supabaseResponse, user: null };
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
      cookieOptions,
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (
    error &&
    (process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_AUTH_DEBUG === "true")
  ) {
    console.warn("Supabase auth getUser failed", {
      hostname: request.nextUrl.hostname,
      pathname: request.nextUrl.pathname,
      appScope,
      cookieName: cookieOptions.name,
      requestCookieNames: request.cookies.getAll().map(({ name }) => name),
      errorMessage: error.message,
      errorCode: (error as { code?: string }).code,
    });
  }

  return { response: supabaseResponse, user };
}
