import { AppError } from "../errors/app-error";

export interface TenantConfigurationInput {
  legal_name?: string;
  product_name?: string;
  logo_path?: string | null;
  favicon_path?: string | null;
  login_image_path?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
}

export interface TenantConfigurationService {
  get(tenantId: string): Promise<Record<string, unknown>>;
  update(tenantId: string, userId: string, input: TenantConfigurationInput): Promise<Record<string, unknown>>;
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
    throw new AppError("Resposta inválida do banco.", 500, "INVALID_DATABASE_RESPONSE");
  }
  return value as Array<Record<string, unknown>>;
}

export class SupabaseTenantConfigurationService implements TenantConfigurationService {
  private readonly restUrl: string;
  private readonly headers: Record<string, string>;

  constructor(url: string, serviceRoleKey: string) {
    this.restUrl = `${url.replace(/\/$/, "")}/rest/v1`;
    this.headers = { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" };
  }

  async get(tenantId: string) {
    const [tenant, branding, modules] = await Promise.all([
      this.fetchRows(`tenants?id=eq.${tenantId}&select=id,slug,legal_name,product_name,status,plan,user_limit,asset_limit,vehicle_limit,storage_limit_bytes`),
      this.fetchRows(`tenant_branding?tenant_id=eq.${tenantId}&select=*`),
      this.fetchRows(`tenant_modules?tenant_id=eq.${tenantId}&select=module_key,enabled&order=module_key`),
    ]);
    if (!tenant[0]) throw new AppError("Tenant não encontrado.", 404, "TENANT_NOT_FOUND");
    return { ...tenant[0], branding: branding[0] ?? null, modules };
  }

  async update(tenantId: string, userId: string, input: TenantConfigurationInput) {
    const tenantInput: Record<string, unknown> = {};
    if (input.legal_name !== undefined) tenantInput.legal_name = input.legal_name;
    if (input.product_name !== undefined) tenantInput.product_name = input.product_name;
    const brandingInput = { ...input } as Record<string, unknown>;
    delete brandingInput.legal_name;
    delete brandingInput.product_name;

    if (Object.keys(tenantInput).length > 0) {
      await this.mutate(`tenants?id=eq.${tenantId}`, "PATCH", tenantInput);
    }
    if (Object.keys(brandingInput).length > 0) {
      await this.mutate("tenant_branding?on_conflict=tenant_id", "POST", { tenant_id: tenantId, ...brandingInput }, "resolution=merge-duplicates,return=minimal");
    }
    await this.mutate("audit_logs", "POST", { tenant_id: tenantId, user_id: userId, action: "update.tenant_configuration", entity_type: "tenant", entity_id: tenantId, new_values: input });
    return this.get(tenantId);
  }

  private async fetchRows(path: string) {
    const response = await fetch(`${this.restUrl}/${path}`, { headers: this.headers });
    if (!response.ok) throw new AppError("Não foi possível consultar as configurações.", 500, "CONFIGURATION_READ_FAILED");
    return asRows(await response.json());
  }

  private async mutate(path: string, method: "POST" | "PATCH", body: Record<string, unknown>, prefer?: string) {
    const response = await fetch(`${this.restUrl}/${path}`, { method, headers: { ...this.headers, ...(prefer ? { prefer } : {}) }, body: JSON.stringify(body) });
    if (!response.ok) throw new AppError("Não foi possível salvar as configurações.", 500, "CONFIGURATION_WRITE_FAILED");
  }
}

export class UnconfiguredTenantConfigurationService implements TenantConfigurationService {
  get(): Promise<Record<string, unknown>> { throw new AppError("Configurações não disponíveis.", 503, "CONFIGURATION_UNCONFIGURED"); }
  update(): Promise<Record<string, unknown>> { throw new AppError("Configurações não disponíveis.", 503, "CONFIGURATION_UNCONFIGURED"); }
}
