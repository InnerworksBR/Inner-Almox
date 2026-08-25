import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../errors/app-error";
import type { ContextResolver, ResolveContextInput, TenantContext } from "../types/context";
import type { Database } from "../types/database";

export class SupabaseContextResolver implements ContextResolver {
  private readonly publicClient: SupabaseClient<Database>;

  constructor(
    private readonly supabaseUrl: string,
    private readonly anonKey: string
  ) {
    this.publicClient = createClient<Database>(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  async resolve({ accessToken, hostname }: ResolveContextInput): Promise<TenantContext> {
    const { data: authData, error: authError } = await this.publicClient.auth.getUser(accessToken);
    if (authError || !authData.user) {
      throw new AppError("Sessão inválida ou expirada.", 401, "INVALID_SESSION");
    }

    const tenantResult = await this.publicClient.rpc(
      "resolve_tenant_context",
      { requested_hostname: hostname }
    );
    const tenant = tenantResult.data?.[0];
    if (tenantResult.error || !tenant) {
      throw new AppError("Tenant não encontrado para este domínio.", 404, "TENANT_NOT_FOUND");
    }

    const authenticatedClient = createClient<Database>(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const membershipResult = await authenticatedClient
      .from("tenant_memberships")
      .select("id")
      .eq("tenant_id", tenant.tenant_id)
      .eq("user_id", authData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipResult.error || !membershipResult.data) {
      throw new AppError("Usuário não pertence a este tenant.", 403, "TENANT_ACCESS_DENIED");
    }

    const rolesResult = await authenticatedClient
      .from("membership_roles")
      .select("role")
      .eq("membership_id", membershipResult.data.id);
    if (rolesResult.error) {
      throw new AppError("Não foi possível validar as permissões.", 403, "ROLE_LOOKUP_FAILED");
    }

    return {
      tenantId: tenant.tenant_id,
      tenantSlug: tenant.tenant_slug,
      userId: authData.user.id,
      membershipId: membershipResult.data.id,
      roles: rolesResult.data.map(({ role }) => role)
    };
  }
}

export class UnconfiguredContextResolver implements ContextResolver {
  async resolve(): Promise<TenantContext> {
    throw new AppError(
      "Supabase não configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY.",
      503,
      "SUPABASE_NOT_CONFIGURED"
    );
  }
}
