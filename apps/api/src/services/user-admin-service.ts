import { AppError } from "../errors/app-error";
import type { ResourcePayload } from "./tenant-resource-service";

export interface InviteUserInput {
  email: string;
  fullName: string;
  roles: string[];
  employee: ResourcePayload;
}

export interface DirectUserInput {
  email: string;
  fullName: string;
  password: string;
  roles: string[];
  employee: ResourcePayload;
}

export interface UserListOptions {
  busca?: string;
  pagina?: number;
  tamanho?: number;
}

export interface UserListResult {
  linhas: ResourcePayload[];
  total: number;
}

export interface UserAdminService {
  list(tenantId: string, options?: UserListOptions): Promise<UserListResult>;
  invite(tenantId: string, requestedBy: string, input: InviteUserInput): Promise<ResourcePayload>;
  create(tenantId: string, requestedBy: string, input: DirectUserInput): Promise<ResourcePayload>;
  changeStatus(tenantId: string, requestedBy: string, membershipId: string, status: "active" | "suspended" | "inactive"): Promise<ResourcePayload>;
}

export class SupabaseUserAdminService implements UserAdminService {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(url: string, serviceRoleKey: string, private readonly callbackUrl: string) {
    this.baseUrl = url.replace(/\/$/, "");
    this.headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" };
  }

  async list(tenantId: string, options: UserListOptions = {}): Promise<UserListResult> {
    const tamanho = Math.min(Math.max(Math.trunc(options.tamanho ?? 25), 1), 100);
    const pagina = Math.max(Math.trunc(options.pagina ?? 1), 1);
    const params = new URLSearchParams({ limit: String(tamanho), offset: String((pagina - 1) * tamanho) });
    const response = await fetch(`${this.baseUrl}/rest/v1/rpc/list_tenant_users?${params.toString()}`, {
      method: "POST",
      headers: { ...this.headers, prefer: "count=exact" },
      body: JSON.stringify({ target_tenant_id: tenantId, search: options.busca?.trim() || null })
    });
    if (!response.ok) throw new AppError("Não foi possível listar os usuários.", 500, "USER_LIST_FAILED");
    const linhas = this.asArray(await response.json());
    const contentRange = response.headers.get("content-range");
    const totalMatch = contentRange?.match(/\/(\d+)$/);
    const total = totalMatch ? Number(totalMatch[1]) : linhas.length;
    return { linhas, total: Number.isFinite(total) ? total : linhas.length };
  }

  async invite(tenantId: string, requestedBy: string, input: InviteUserInput): Promise<ResourcePayload> {
    const authResponse = await fetch(`${this.baseUrl}/auth/v1/invite`, { method: "POST", headers: this.headers, body: JSON.stringify({ email: input.email, data: { full_name: input.fullName }, redirect_to: this.callbackUrl }) });
    if (!authResponse.ok) {
      if (authResponse.status === 422) throw new AppError("Este e-mail já está cadastrado ou é inválido.", 409, "USER_ALREADY_EXISTS");
      throw new AppError("Não foi possível enviar o convite.", 502, "USER_INVITE_FAILED");
    }
    const authUser = this.asObject(await authResponse.json());
    const userId = typeof authUser.id === "string" ? authUser.id : null;
    if (!userId) throw new AppError("O provedor de autenticação retornou um usuário inválido.", 502, "INVALID_AUTH_USER");
    const membershipResponse = await fetch(`${this.baseUrl}/rest/v1/rpc/provision_tenant_membership`, { method: "POST", headers: this.headers, body: JSON.stringify({ target_tenant_id: tenantId, target_user_id: userId, target_roles: input.roles, employee_data: input.employee }) });
    if (!membershipResponse.ok) throw new AppError("O convite foi criado, mas o vínculo com o tenant falhou.", 500, "MEMBERSHIP_PROVISION_FAILED");
    const membershipId: unknown = await membershipResponse.json();
    await this.audit(tenantId, requestedBy, "invite.user", "tenant_membership", typeof membershipId === "string" ? membershipId : userId, { email: input.email, roles: input.roles });
    return { id: userId, email: input.email, full_name: input.fullName, roles: input.roles, status: "invited" };
  }

  async create(tenantId: string, requestedBy: string, input: DirectUserInput): Promise<ResourcePayload> {
    const authResponse = await fetch(`${this.baseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ email: input.email, password: input.password, email_confirm: true, user_metadata: { full_name: input.fullName } })
    });
    if (!authResponse.ok) {
      if (authResponse.status === 422) throw new AppError("Este e-mail já está cadastrado ou é inválido.", 409, "USER_ALREADY_EXISTS");
      throw new AppError("Não foi possível cadastrar o usuário.", 502, "USER_CREATE_FAILED");
    }
    const authUser = this.asObject(await authResponse.json());
    const userId = typeof authUser.id === "string" ? authUser.id : null;
    if (!userId) throw new AppError("O provedor de autenticação retornou um usuário inválido.", 502, "INVALID_AUTH_USER");

    const membershipResponse = await fetch(`${this.baseUrl}/rest/v1/rpc/provision_tenant_membership`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ target_tenant_id: tenantId, target_user_id: userId, target_roles: input.roles, employee_data: input.employee })
    });
    if (!membershipResponse.ok) {
      try {
        await fetch(`${this.baseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE", headers: this.headers });
      } catch {
        // Preserve the membership error; the cleanup is best-effort and never exposes credentials.
      }
      throw new AppError("O usuário foi criado, mas o vínculo com o tenant falhou.", 500, "MEMBERSHIP_PROVISION_FAILED");
    }

    const membershipId: unknown = await membershipResponse.json();
    await this.audit(tenantId, requestedBy, "create.user", "tenant_membership", typeof membershipId === "string" ? membershipId : userId, { email: input.email, roles: input.roles });
    return { id: userId, email: input.email, full_name: input.fullName, roles: input.roles, status: "active" };
  }

  async changeStatus(tenantId: string, requestedBy: string, membershipId: string, status: "active" | "suspended" | "inactive"): Promise<ResourcePayload> {
    const params = new URLSearchParams({ tenant_id: `eq.${tenantId}`, id: `eq.${membershipId}` });
    const response = await fetch(`${this.baseUrl}/rest/v1/tenant_memberships?${params.toString()}`, { method: "PATCH", headers: { ...this.headers, Prefer: "return=representation" }, body: JSON.stringify({ status }) });
    if (!response.ok) throw new AppError("Não foi possível alterar o acesso do usuário.", 500, "USER_STATUS_FAILED");
    const updated = this.asArray(await response.json())[0];
    if (!updated) throw new AppError("Vínculo do usuário não encontrado.", 404, "MEMBERSHIP_NOT_FOUND");
    await this.audit(tenantId, requestedBy, "update.user_status", "tenant_membership", membershipId, { status });
    return updated;
  }

  private async audit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, newValues: ResourcePayload): Promise<void> {
    const response = await fetch(`${this.baseUrl}/rest/v1/audit_logs`, { method: "POST", headers: this.headers, body: JSON.stringify({ tenant_id: tenantId, user_id: userId, action, entity_type: entityType, entity_id: entityId, new_values: newValues }) });
    if (!response.ok) throw new AppError("A operação não pôde ser auditada.", 500, "AUDIT_WRITE_FAILED");
  }

  private asObject(value: unknown): ResourcePayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new AppError("Resposta inválida do serviço de autenticação.", 502, "INVALID_AUTH_RESPONSE");
    return value as ResourcePayload;
  }

  private asArray(value: unknown): ResourcePayload[] {
    if (!Array.isArray(value) || !value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) throw new AppError("Resposta inválida do banco de dados.", 500, "INVALID_DATABASE_RESPONSE");
    return value as ResourcePayload[];
  }
}

export class UnconfiguredUserAdminService implements UserAdminService {
  private unavailable(): never { throw new AppError("Administração de usuários não configurada.", 503, "USER_ADMIN_UNCONFIGURED"); }
  list(): Promise<UserListResult> { return this.unavailable(); }
  invite(): Promise<ResourcePayload> { return this.unavailable(); }
  create(): Promise<ResourcePayload> { return this.unavailable(); }
  changeStatus(): Promise<ResourcePayload> { return this.unavailable(); }
}
