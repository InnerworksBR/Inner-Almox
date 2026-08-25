import { createServerSupabaseClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface ApiCollectionResult {
  data: Array<Record<string, unknown>>;
  available: boolean;
}

export async function fetchTenantCollection(endpoint: string): Promise<ApiCollectionResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { data: [], available: false };
  const apiUrl = process.env.API_URL ?? "http://localhost:3333";
  const hostname=(await headers()).get("host")?.split(":")[0]??"localhost";
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/v1/${endpoint}`, { headers: { Authorization: `Bearer ${session.access_token}`, "x-tenant-hostname":hostname }, cache: "no-store" });
    if (!response.ok) return { data: [], available: false };
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("data" in payload) || !Array.isArray(payload.data)) return { data: [], available: false };
    const rows = payload.data.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item));
    return { data: rows, available: true };
  } catch {
    return { data: [], available: false };
  }
}

export async function fetchTenantRecord(endpoint:string):Promise<Record<string,unknown>|null>{
  const supabase=await createServerSupabaseClient();const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return null;const apiUrl=process.env.API_URL??"http://localhost:3333";const hostname=(await headers()).get("host")?.split(":")[0]??"localhost";try{const response=await fetch(`${apiUrl.replace(/\/$/,"")}/v1/${endpoint}`,{headers:{Authorization:`Bearer ${session.access_token}`,"x-tenant-hostname":hostname},cache:"no-store"});if(!response.ok)return null;const payload:unknown=await response.json();if(typeof payload!=="object"||payload===null||!("data" in payload)||typeof payload.data!=="object"||payload.data===null||Array.isArray(payload.data))return null;return payload.data as Record<string,unknown>;}catch{return null;}}
