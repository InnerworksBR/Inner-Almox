import type { Job, Worker } from "bullmq";
import type { JobRegistry } from "./job-registry";

type WorkerJob = Job<object, unknown, string>;

function tenantIdFromData(data: object): string | null {
  const value = (data as Record<string, unknown>).tenantId;
  return typeof value === "string" ? value : null;
}

async function safeRegistryCall(action: string, callback: () => Promise<void>): Promise<void> {
  try {
    await callback();
  } catch (error) {
    console.error(JSON.stringify({ event: "job_registry_error", action, error: error instanceof Error ? error.message : String(error) }));
  }
}

export function attachJobEvents<T extends object>(worker: Pick<Worker<T, unknown, string>, "on">, queue: string, registry: JobRegistry): void {
  const starts = new Map<string, Promise<void>>();

  worker.on("active", (job) => {
    const start = safeRegistryCall("start", async () => {
      await registry.start({
        queue,
        type: job.name,
        externalJobId: String(job.id),
        tenantId: tenantIdFromData(job.data),
        attempts: job.attemptsMade + 1,
        payload: job.data
      });
    });
    starts.set(String(job.id), start);
  });

  worker.on("completed", async (job, result) => {
    await starts.get(String(job.id));
    await safeRegistryCall("complete", () => registry.complete({
      queue,
      externalJobId: String(job.id),
      result,
      completedAt: new Date().toISOString()
    }));
    starts.delete(String(job.id));
  });

  worker.on("failed", async (job, error) => {
    if (!job) return;
    await starts.get(String(job.id));
    await safeRegistryCall("fail", () => registry.fail({
      queue,
      externalJobId: String(job.id),
      error,
      completedAt: new Date().toISOString()
    }));
    starts.delete(String(job.id));
  });
}

export type { WorkerJob };
