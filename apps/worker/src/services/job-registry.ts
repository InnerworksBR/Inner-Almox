export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export interface JobLifecycleInput {
  queue: string;
  type: string;
  externalJobId: string;
  tenantId: string | null;
  attempts: number;
  payload?: unknown;
}

export interface JobCompletionInput {
  queue: string;
  externalJobId: string;
  result?: unknown;
  completedAt?: string;
}

export interface JobFailureInput {
  queue: string;
  externalJobId: string;
  error: Error;
  completedAt?: string;
}

export interface JobTenantScanInput extends JobLifecycleInput {
  status: Extract<JobStatus, "completed" | "failed">;
  result?: unknown;
  errorMessage?: string;
}

export interface JobRegistry {
  start(input: JobLifecycleInput): Promise<string | undefined>;
  complete(input: JobCompletionInput): Promise<void>;
  fail(input: JobFailureInput): Promise<void>;
  recordTenantScan(input: JobTenantScanInput): Promise<void>;
}

interface BackgroundJobRow {
  id?: unknown;
}

const MAX_ERROR_LENGTH = 2000;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function toJsonValue(value: unknown, seen = new WeakSet<object>()): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return value.message;
  if (typeof value === "function" || typeof value === "symbol") return String(value);
  if (typeof value !== "object") return "[Unsupported]";
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => toJsonValue(entry, seen));

  const record: { [key: string]: JsonValue } = {};
  for (const [key, entry] of Object.entries(value)) record[key] = toJsonValue(entry, seen);
  return record;
}

function errorMessage(error: Error): string {
  return error.message.slice(0, MAX_ERROR_LENGTH);
}

export class SupabaseJobRegistry implements JobRegistry {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly recordIds = new Map<string, string>();

  public constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.baseUrl = normalizeBaseUrl(supabaseUrl);
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    };
  }

  public async start(input: JobLifecycleInput): Promise<string> {
    const response = await fetch(`${this.baseUrl}/rest/v1/background_jobs`, {
      method: "POST",
      headers: { ...this.headers, Prefer: "return=representation" },
      body: JSON.stringify({
        tenant_id: input.tenantId,
        queue: input.queue,
        external_job_id: input.externalJobId,
        type: input.type,
        payload: toJsonValue(input.payload ?? {}),
        status: "processing",
        attempts: input.attempts,
        started_at: new Date().toISOString()
      })
    });
    const rows = await this.readRows(response, "início do job");
    const id = typeof rows[0]?.id === "string" ? rows[0].id : undefined;
    if (!id) throw new Error("Supabase não retornou o ID do job registrado");
    this.recordIds.set(this.key(input.queue, input.externalJobId), id);
    return id;
  }

  public async complete(input: JobCompletionInput): Promise<void> {
    await this.patch(input.queue, input.externalJobId, {
      status: "completed",
      result: toJsonValue(input.result ?? {}),
      completed_at: input.completedAt ?? new Date().toISOString()
    });
  }

  public async fail(input: JobFailureInput): Promise<void> {
    await this.patch(input.queue, input.externalJobId, {
      status: "failed",
      error_message: errorMessage(input.error),
      completed_at: input.completedAt ?? new Date().toISOString()
    });
  }

  public async recordTenantScan(input: JobTenantScanInput): Promise<void> {
    const completedAt = new Date().toISOString();
    const body = {
      tenant_id: input.tenantId,
      queue: input.queue,
      external_job_id: input.externalJobId,
      type: input.type,
      payload: toJsonValue(input.payload ?? {}),
      status: input.status,
      attempts: input.attempts,
      result: input.status === "completed" ? toJsonValue(input.result ?? {}) : null,
      error_message: input.errorMessage ? input.errorMessage.slice(0, MAX_ERROR_LENGTH) : null,
      started_at: completedAt,
      completed_at: completedAt
    };
    const response = await fetch(`${this.baseUrl}/rest/v1/background_jobs`, {
      method: "POST",
      headers: { ...this.headers, Prefer: "return=minimal" },
      body: JSON.stringify(body)
    });
    await this.ensureOk(response, "registro da varredura do tenant");
  }

  private key(queue: string, externalJobId: string): string {
    return `${queue}:${externalJobId}`;
  }

  private async patch(queue: string, externalJobId: string, body: Record<string, unknown>): Promise<void> {
    const id = await this.resolveRecordId(queue, externalJobId);
    const response = await fetch(`${this.baseUrl}/rest/v1/background_jobs?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...this.headers, Prefer: "return=minimal" },
      body: JSON.stringify(body)
    });
    await this.ensureOk(response, "atualização do job");
  }

  private async resolveRecordId(queue: string, externalJobId: string): Promise<string> {
    const mapKey = this.key(queue, externalJobId);
    const knownId = this.recordIds.get(mapKey);
    if (knownId) return knownId;

    const url = `${this.baseUrl}/rest/v1/background_jobs?queue=eq.${encodeURIComponent(queue)}&external_job_id=eq.${encodeURIComponent(externalJobId)}&order=created_at.desc&limit=1`;
    const response = await fetch(url, { headers: this.headers });
    const rows = await this.readRows(response, "localização do job");
    const id = typeof rows[0]?.id === "string" ? rows[0].id : undefined;
    if (!id) throw new Error("Não foi possível localizar o job para atualizar");
    this.recordIds.set(mapKey, id);
    return id;
  }

  private async readRows(response: Response, action: string): Promise<BackgroundJobRow[]> {
    await this.ensureOk(response, action);
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error(`Resposta inválida do Supabase durante ${action}`);
    return body.filter((row): row is BackgroundJobRow => typeof row === "object" && row !== null);
  }

  private async ensureOk(response: Response, action: string): Promise<void> {
    if (response.ok) return;
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Falha no Supabase durante ${action}: ${response.status} ${detail}`);
  }
}

export class NoopJobRegistry implements JobRegistry {
  public async start(_input: JobLifecycleInput): Promise<undefined> { return undefined; }
  public async complete(_input: JobCompletionInput): Promise<void> { return undefined; }
  public async fail(_input: JobFailureInput): Promise<void> { return undefined; }
  public async recordTenantScan(_input: JobTenantScanInput): Promise<void> { return undefined; }
}
