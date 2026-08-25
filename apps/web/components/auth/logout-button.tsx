"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function logout() {
    await createBrowserSupabaseClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      className={compact ? "logout-button logout-button--compact" : "logout-button"}
      type="button"
      onClick={logout}
      aria-label={compact ? "Sair" : undefined}
    >
      {compact ? "↪" : "Sair"}
    </button>
  );
}
