export type PlatformCollection =
  | "tenants"
  | "tenant_domains"
  | "platform_plans"
  | "tenant_modules"
  | "background_jobs"
  | "platform_audit_logs";

export interface PlatformQueryDefinition {
  select: string;
  pesquisaveis: readonly string[];
  ordenaveis: readonly string[];
  ordemPadrao: string;
}

export const platformQueryConfig: Record<PlatformCollection, PlatformQueryDefinition> = {
  tenants: { select: "*", pesquisaveis: ["legal_name", "slug"], ordenaveis: ["legal_name", "slug", "status", "created_at"], ordemPadrao: "created_at.desc" },
  tenant_domains: { select: "*", pesquisaveis: ["hostname"], ordenaveis: ["hostname", "created_at"], ordemPadrao: "created_at.desc" },
  platform_plans: { select: "*", pesquisaveis: ["code", "name"], ordenaveis: ["code", "name", "status", "created_at"], ordemPadrao: "created_at.desc" },
  tenant_modules: { select: "*", pesquisaveis: ["module_key"], ordenaveis: ["module_key", "updated_at", "created_at"], ordemPadrao: "created_at.desc" },
  background_jobs: { select: "*", pesquisaveis: ["queue", "type"], ordenaveis: ["created_at", "status", "queue"], ordemPadrao: "created_at.desc" },
  platform_audit_logs: { select: "*", pesquisaveis: ["action", "entity_type"], ordenaveis: ["action", "entity_type", "created_at"], ordemPadrao: "created_at.desc" }
};
