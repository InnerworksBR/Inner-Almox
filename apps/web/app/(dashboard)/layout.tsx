import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

function rowsFromResponse(response: unknown): Row[] {
  if (typeof response !== "object" || response === null || !("data" in response)) return [];
  const data = response.data;
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Row => typeof row === "object" && row !== null && !Array.isArray(row));
}

function rowFromResponse(response: unknown): Row | null {
  if (typeof response !== "object" || response === null || !("data" in response)) return null;
  const data = response.data;
  return typeof data === "object" && data !== null && !Array.isArray(data) ? data as Row : null;
}

function stringValue(row: Row | null, key: string): string | null {
  const value = row?.[key];
  return typeof value === "string" ? value : null;
}

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membershipResponse: unknown = await supabase.from("tenant_memberships").select("id,tenant_id").eq("user_id", user.id).eq("status", "active").limit(1);
  const membership = rowsFromResponse(membershipResponse)[0] ?? null;
  const membershipId = stringValue(membership, "id");
  const tenantId = stringValue(membership, "tenant_id");

  const roleResponse: unknown = membershipId ? await supabase.from("membership_roles").select("role").eq("membership_id", membershipId) : { data: [] };
  const tenantRoles = rowsFromResponse(roleResponse).map((row) => stringValue(row, "role")).filter((role): role is string => role !== null);
  const platformResponse:unknown=await supabase.from("platform_admins").select("user_id").eq("user_id",user.id).eq("status","active").maybeSingle();
  const configuredPlatformAdmins=(process.env.PLATFORM_ADMIN_EMAILS??"").split(",").map(email=>email.trim().toLowerCase());
  const isPlatformAdmin=Boolean(rowFromResponse(platformResponse))||Boolean(user.email&&configuredPlatformAdmins.includes(user.email.toLowerCase()));
  const roles=isPlatformAdmin?[...tenantRoles,"platform_superadmin"]:tenantRoles;
  const tenantResponse: unknown = tenantId ? await supabase.from("tenants").select("legal_name,product_name").eq("id", tenantId).maybeSingle() : { data: null };
  const brandingResponse: unknown = tenantId ? await supabase.from("tenant_branding").select("product_name,logo_path,primary_color,secondary_color").eq("tenant_id", tenantId).maybeSingle() : { data: null };
  const tenant = rowFromResponse(tenantResponse);
  const branding = rowFromResponse(brandingResponse);

  return <AppShell userEmail={user.email ?? "Usuário Inner Almox"} roles={roles} brand={{
    companyName: stringValue(tenant, "legal_name") ?? "InnerWorks",
    productName: stringValue(branding, "product_name") ?? stringValue(tenant, "product_name") ?? stringValue(tenant, "legal_name") ?? "Inner Almox",
    logoPath: stringValue(branding, "logo_path"),
    primaryColor: stringValue(branding, "primary_color"),
    secondaryColor: stringValue(branding, "secondary_color"),
  }}>{children}</AppShell>;
}
