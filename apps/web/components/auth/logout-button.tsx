"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  /** "icon" para o rodapé da sidebar, "item" para dentro de um menu. */
  variant?: "icon" | "item";
  className?: string;
}

export function LogoutButton({ variant = "icon", className }: LogoutButtonProps) {
  const router = useRouter();

  async function logout() {
    await createBrowserSupabaseClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (variant === "item") {
    return (
      <button
        type="button"
        onClick={logout}
        className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted", className)}
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sair
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={logout}
      aria-label="Sair"
      title="Sair"
      className={cn("grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-transparent p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", className)}
    >
      <LogOut className="size-4" aria-hidden="true" />
    </button>
  );
}
