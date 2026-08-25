import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/protected";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/protected";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(
    new URL(error ? "/login?error=invalid_callback" : safeNext, request.url)
  );
}
