import { AppError } from "../errors/app-error";
import type { ResourcePayload } from "./tenant-resource-service";

export type DashboardModule = "patrimonio" | "almoxarifado" | "frota";

export interface DashboardDistributionItem {
  key: string;
  label: string;
  value: number;
}

export interface DashboardMonthlyPoint {
  month: string;
  label: string;
  values: Record<string, number>;
}

export interface DashboardModuleResult {
  module: DashboardModule;
  metrics: Record<string, number>;
  distribution: DashboardDistributionItem[];
  monthly: DashboardMonthlyPoint[];
}

export interface DashboardService {
  metrics(tenantId: string): Promise<ResourcePayload>;
  moduleMetrics(tenantId: string, module: DashboardModule): Promise<DashboardModuleResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function moduleResultOf(value: unknown, expectedModule: DashboardModule): DashboardModuleResult {
  if (!isRecord(value) || value.module !== expectedModule || !isRecord(value.metrics) || !Array.isArray(value.distribution) || !Array.isArray(value.monthly)) {
    throw new AppError("Resposta inválida dos indicadores do módulo.", 500, "INVALID_MODULE_DASHBOARD_RESPONSE");
  }

  return value as unknown as DashboardModuleResult;
}

export class SupabaseDashboardService implements DashboardService {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(url: string, key: string) {
    this.baseUrl = `${url.replace(/\/$/, "")}/rest/v1/rpc`;
    this.headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  }

  async metrics(tenantId: string): Promise<ResourcePayload> {
    const response = await fetch(`${this.baseUrl}/get_dashboard_metrics`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ target_tenant_id: tenantId })
    });
    if (!response.ok) throw new AppError("Não foi possível carregar os indicadores.", 500, "DASHBOARD_FAILED");
    const data: unknown = await response.json();
    if (!isRecord(data)) throw new AppError("Resposta inválida dos indicadores.", 500, "INVALID_DASHBOARD_RESPONSE");
    return data;
  }

  async moduleMetrics(tenantId: string, module: DashboardModule): Promise<DashboardModuleResult> {
    const response = await fetch(`${this.baseUrl}/get_module_metrics`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ target_tenant_id: tenantId, module })
    });
    if (!response.ok) throw new AppError("Não foi possível carregar os indicadores do módulo.", 500, "DASHBOARD_FAILED");
    return moduleResultOf(await response.json(), module);
  }
}

export class UnconfiguredDashboardService implements DashboardService {
  metrics(): Promise<ResourcePayload> {
    throw new AppError("Dashboard não configurado.", 503, "DASHBOARD_UNCONFIGURED");
  }

  moduleMetrics(): Promise<DashboardModuleResult> {
    throw new AppError("Dashboard não configurado.", 503, "DASHBOARD_UNCONFIGURED");
  }
}
