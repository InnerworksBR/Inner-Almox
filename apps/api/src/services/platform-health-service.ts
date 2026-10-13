import type { QueuePublisher } from "../types/context";

export type HealthState = "healthy" | "degraded" | "failed";
export type HealthServiceName = "Banco" | "Redis" | "Storage" | "Worker";
export type HealthProbe = () => Promise<HealthState | void>;

export interface HealthLine {
  servico: HealthServiceName;
  estado: HealthState;
  latencia_ms: number;
  verificado_em: string;
  detalhe?: string;
}

export interface PlatformHealthServiceOptions {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  queuePublisher?: Pick<QueuePublisher, "ping">;
  probes?: Partial<Record<HealthServiceName, HealthProbe>>;
}

type Row = Record<string, unknown>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rowsOf(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new Error("Resposta inválida do Supabase.");
  return value.filter((row): row is Row => typeof row === "object" && row !== null && !Array.isArray(row));
}

export class PlatformHealthService {
  private readonly probes: Record<HealthServiceName, HealthProbe>;

  public constructor(options: PlatformHealthServiceOptions) {
    const database = options.probes?.Banco ?? this.supabaseProbe(options, async (base, headers) => {
      await this.getJson(`${base}/rest/v1/tenants?select=id&limit=1`, headers);
    });
    const queuePing = options.queuePublisher?.ping;
    const redis = options.probes?.Redis ?? (queuePing
      ? () => queuePing()
      : async () => { throw new Error("Redis não configurado."); });
    const storage = options.probes?.Storage ?? this.supabaseProbe(options, async (base, headers) => {
      await this.getJson(`${base}/storage/v1/bucket/tenant-documents`, headers);
    });
    const worker = options.probes?.Worker ?? this.supabaseProbe(options, async (base, headers) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const rows = rowsOf(await this.getJson(
        `${base}/rest/v1/background_jobs?select=completed_at&status=eq.completed&completed_at=gte.${encodeURIComponent(oneHourAgo)}&order=completed_at.desc&limit=1`,
        headers
      ));
      if (rows.length === 0) return "degraded";
      return "healthy";
    });

    this.probes = { Banco: database, Redis: redis, Storage: storage, Worker: worker };
  }

  public async check(): Promise<HealthLine[]> {
    const services: HealthServiceName[] = ["Banco", "Redis", "Storage", "Worker"];
    return Promise.all(services.map((service) => this.runProbe(service, this.probes[service])));
  }

  private async runProbe(servico: HealthServiceName, probe: HealthProbe): Promise<HealthLine> {
    const startedAt = performance.now();
    const checkedAt = new Date().toISOString();
    try {
      const state = await probe();
      return { servico, estado: state === "degraded" ? "degraded" : "healthy", latencia_ms: Math.max(0, Math.round(performance.now() - startedAt)), verificado_em: checkedAt };
    } catch (error) {
      return { servico, estado: "failed", latencia_ms: Math.max(0, Math.round(performance.now() - startedAt)), verificado_em: checkedAt, detalhe: errorMessage(error) };
    }
  }

  private supabaseProbe(options: PlatformHealthServiceOptions, probe: (base: string, headers: Record<string, string>) => Promise<HealthState | void>): HealthProbe {
    return async () => {
      if (!options.supabaseUrl || !options.serviceRoleKey) throw new Error("Supabase não configurado.");
      const base = options.supabaseUrl.replace(/\/+$/, "");
      const headers = { apikey: options.serviceRoleKey, Authorization: `Bearer ${options.serviceRoleKey}` };
      return probe(base, headers);
    };
  }

  private async getJson(url: string, headers: Record<string, string>): Promise<unknown> {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Probe HTTP ${response.status}`);
    return response.json();
  }
}
