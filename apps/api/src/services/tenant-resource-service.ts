import { AppError } from "../errors/app-error";

export type TenantResourceTable =
  | "branches" | "departments" | "cost_centers" | "locations" | "suppliers"
  | "asset_categories" | "assets" | "asset_custom_fields" | "asset_custom_values" | "asset_files" | "asset_movements" | "asset_terms"
  | "warranties" | "maintenance_plans" | "maintenance_orders" | "maintenance_costs"
  | "stock_categories" | "stock_locations" | "stock_products" | "stock_batches" | "stock_movements" | "stock_requisitions" | "stock_requisition_items"
  | "vehicles" | "vehicle_drivers" | "vehicle_authorizations" | "vehicle_reservations" | "vehicle_usages" | "vehicle_checklists"
  | "vehicle_fuelings" | "vehicle_expenses" | "vehicle_fines" | "vehicle_incidents" | "vehicle_documents"
  | "inventory_campaigns" | "inventory_items" | "notifications" | "notification_templates" | "audit_logs";
export type ResourcePayload = Record<string, unknown>;

export interface TenantResourceService {
  list(table: TenantResourceTable, tenantId: string, filters?:Record<string,string>): Promise<ResourcePayload[]>;
  create(table: TenantResourceTable, tenantId: string, userId: string, payload: ResourcePayload): Promise<ResourcePayload>;
  update(table: TenantResourceTable, tenantId: string, userId: string, id: string, payload: ResourcePayload): Promise<ResourcePayload>;
}

export class SupabaseTenantResourceService implements TenantResourceService {
  private readonly restUrl: string;
  private readonly headers: Record<string, string>;

  constructor(url: string, serviceRoleKey: string) {
    this.restUrl = `${url.replace(/\/$/, "")}/rest/v1`;
    this.headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" };
  }

  async list(table: TenantResourceTable, tenantId: string, filters:Record<string,string>={}): Promise<ResourcePayload[]> {
    const params = new URLSearchParams({ select: "*", tenant_id: `eq.${tenantId}`, order: "created_at.desc", limit: "100" });
    for(const [field,value] of Object.entries(filters))params.set(field,/^(?:eq|is|in|gte|lte)\./.test(value)?value:`eq.${value}`);
    const response = await fetch(`${this.restUrl}/${table}?${params.toString()}`, { headers: this.headers });
    if (!response.ok) throw new AppError("Não foi possível listar os registros.", 500, "RESOURCE_LIST_FAILED");
    return this.asArray(await response.json());
  }

  async create(table: TenantResourceTable, tenantId: string, userId: string, payload: ResourcePayload): Promise<ResourcePayload> {
    const safePayload = this.withTenant(payload, tenantId);
    const response = await fetch(`${this.restUrl}/${table}`, { method: "POST", headers: { ...this.headers, Prefer: "return=representation" }, body: JSON.stringify(safePayload) });
    if (!response.ok) this.throwMutationError(response.status);
    const data = this.first(await response.json());
    await this.audit(tenantId, userId, `create.${table}`, table, String(data.id), null, data);
    return data;
  }

  async update(table: TenantResourceTable, tenantId: string, userId: string, id: string, payload: ResourcePayload): Promise<ResourcePayload> {
    const filters = new URLSearchParams({ select: "*", tenant_id: `eq.${tenantId}`, id: `eq.${id}`, limit: "1" });
    const lookupResponse = await fetch(`${this.restUrl}/${table}?${filters.toString()}`, { headers: this.headers });
    if (!lookupResponse.ok) throw new AppError("Não foi possível consultar o registro.", 500, "RESOURCE_LOOKUP_FAILED");
    const previousRows = this.asArray(await lookupResponse.json());
    const previous = previousRows[0];
    if (!previous) throw new AppError("Registro não encontrado.", 404, "RESOURCE_NOT_FOUND");
    const safePayload = this.withoutProtectedFields(payload);
    const updateResponse = await fetch(`${this.restUrl}/${table}?${filters.toString()}`, { method: "PATCH", headers: { ...this.headers, Prefer: "return=representation" }, body: JSON.stringify(safePayload) });
    if (!updateResponse.ok) this.throwMutationError(updateResponse.status);
    const data = this.first(await updateResponse.json());
    await this.audit(tenantId, userId, `update.${table}`, table, id, previous, data);
    return data;
  }

  private withTenant(payload: ResourcePayload, tenantId: string): ResourcePayload {
    return { ...this.withoutProtectedFields(payload), tenant_id: tenantId };
  }

  private withoutProtectedFields(payload: ResourcePayload): ResourcePayload {
    const safePayload = { ...payload };
    delete safePayload.tenant_id;
    delete safePayload.id;
    delete safePayload.created_at;
    delete safePayload.updated_at;
    return safePayload;
  }

  private throwMutationError(status: number): never {
    if (status === 409) throw new AppError("Já existe um registro com esses dados.", 409, "RESOURCE_CONFLICT");
    if (status === 400 || status === 422) throw new AppError("Os dados ou vínculos informados são inválidos.", 422, "INVALID_RELATIONSHIP");
    throw new AppError("Não foi possível salvar o registro.", 500, "RESOURCE_MUTATION_FAILED");
  }

  private async audit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, previousValues: ResourcePayload | null, newValues: ResourcePayload): Promise<void> {
    const response = await fetch(`${this.restUrl}/audit_logs`, { method: "POST", headers: this.headers, body: JSON.stringify({ tenant_id: tenantId, user_id: userId, action, entity_type: entityType, entity_id: entityId, previous_values: previousValues, new_values: newValues }) });
    if (!response.ok) throw new AppError("O registro foi salvo, mas a auditoria falhou.", 500, "AUDIT_WRITE_FAILED");
  }

  private asArray(value: unknown): ResourcePayload[] {
    if (!Array.isArray(value) || !value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
      throw new AppError("Resposta inválida do banco de dados.", 500, "INVALID_DATABASE_RESPONSE");
    }
    return value as ResourcePayload[];
  }

  private first(value: unknown): ResourcePayload {
    const first = this.asArray(value)[0];
    if (!first) throw new AppError("O banco não retornou o registro salvo.", 500, "EMPTY_DATABASE_RESPONSE");
    return first;
  }
}

export class UnconfiguredTenantResourceService implements TenantResourceService {
  private unavailable(): never { throw new AppError("API administrativa não configurada.", 503, "ADMIN_API_UNCONFIGURED"); }
  list(): Promise<ResourcePayload[]> { return this.unavailable(); }
  create(): Promise<ResourcePayload> { return this.unavailable(); }
  update(): Promise<ResourcePayload> { return this.unavailable(); }
}
