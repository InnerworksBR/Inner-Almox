import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env/public";

export function createBrowserSupabaseClient() {
  const env = getPublicEnv();
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
