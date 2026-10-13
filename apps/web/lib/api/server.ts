import { createServerSupabaseClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface ApiCollectionResult {
  data: Array<Record<string, unknown>>;
  total: number;
  available: boolean;
}

async function contexto() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  const apiUrl = (process.env.API_URL ?? "http://localhost:3333").replace(/\/$/, "");
  const hostname = (await headers()).get("host")?.split(":")[0] ?? "localhost";
  return { apiUrl, cabecalhos: { Authorization: `Bearer ${session.access_token}`, "x-tenant-hostname": hostname } };
}

function linhasDe(payload: unknown): Array<Record<string, unknown>> {
  if (typeof payload !== "object" || payload === null || !("data" in payload) || !Array.isArray(payload.data)) return [];
  return payload.data.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item));
}

export async function fetchTenantCollection(
  endpoint: string,
  parametros: Record<string, string | undefined> = {}
): Promise<ApiCollectionResult> {
  const atual = await contexto();
  if (!atual) return { data: [], total: 0, available: false };
  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== "") query.set(chave, valor);
  }
  const sufixo = query.toString();
  try {
    const response = await fetch(`${atual.apiUrl}/v1/${endpoint}${sufixo ? `?${sufixo}` : ""}`, { headers: atual.cabecalhos, cache: "no-store" });
    if (!response.ok) return { data: [], total: 0, available: false };
    const payload: unknown = await response.json();
    const data = linhasDe(payload);
    const total = typeof payload === "object" && payload !== null && "total" in payload && typeof payload.total === "number" ? payload.total : data.length;
    return { data, total, available: true };
  } catch {
    return { data: [], total: 0, available: false };
  }
}

export async function fetchTenantRecord(endpoint: string): Promise<Record<string, unknown> | null> {
  const atual = await contexto();
  if (!atual) return null;
  try {
    const response = await fetch(`${atual.apiUrl}/v1/${endpoint}`, { headers: atual.cabecalhos, cache: "no-store" });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("data" in payload) || typeof payload.data !== "object" || payload.data === null || Array.isArray(payload.data)) return null;
    return payload.data as Record<string, unknown>;
  } catch {
    return null;
  }
}
