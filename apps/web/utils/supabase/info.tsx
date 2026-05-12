// Supabase configuration - loaded from environment variables
// Set these in your .env file or deployment platform

const getEnvVar = (key: string, fallback: string = ""): string => {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || fallback;
  }
  return fallback;
};

export const projectId = getEnvVar("VITE_SUPABASE_PROJECT_ID", "");
export const publicAnonKey = getEnvVar("VITE_SUPABASE_ANON_KEY", "");
export const apiEndpoint = getEnvVar("VITE_API_ENDPOINT", "shop-api");
