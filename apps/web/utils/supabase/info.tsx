// Supabase configuration - loaded from environment variables
// Set these in your .env file or deployment platform

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export const projectId =
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID ||
  supabaseUrl.replace(/^https:\/\//, "").replace(/\.supabase\.co\/?$/, "");
export const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const apiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || "shop-api";
