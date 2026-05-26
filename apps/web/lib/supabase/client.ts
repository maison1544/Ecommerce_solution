import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabaseCookieOptions,
  resolveBrowserAppInstance,
  type AppInstance,
} from "./config";

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;

const browserClients = new Map<AppInstance, SupabaseBrowserClient>();

function getRequiredSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required to use Supabase.",
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function createScopedClient(instance: AppInstance) {
  const { supabaseUrl, supabaseAnonKey } = getRequiredSupabaseEnv();

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      isSingleton: false,
      cookieOptions: getSupabaseCookieOptions(instance),
    },
  );
}

export function createClient(instance: AppInstance = resolveBrowserAppInstance()) {
  const existing = browserClients.get(instance);
  if (existing) {
    return existing;
  }
  const client = createScopedClient(instance);
  browserClients.set(instance, client);
  return client;
}

export function getSupabaseBrowserClient(
  instance: AppInstance = resolveBrowserAppInstance(),
) {
  return createClient(instance);
}

export function resetClient(instance?: AppInstance) {
  if (instance) {
    browserClients.delete(instance);
    return;
  }
  browserClients.clear();
}

function createLazyClient(instance?: AppInstance): SupabaseBrowserClient {
  return new Proxy({} as SupabaseBrowserClient, {
    get(_target, prop) {
      const client = getSupabaseBrowserClient(instance);
      const value = client[prop as keyof SupabaseBrowserClient];
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

export const supabase = createLazyClient();
