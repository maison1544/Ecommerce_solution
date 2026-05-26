import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseCookieOptions, type AppInstance } from "./config";

export async function createClient(appScope: AppInstance = "user") {
  const cookieStore = await cookies();
  const cookieOptions = getSupabaseCookieOptions(appScope);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignored in Server Components
          }
        },
      },
      cookieOptions,
    },
  );
}
