import type { Job } from "bullmq";
import { z } from "zod";
import type { ValidationJobInput } from "../queues/foundation";

const payloadSchema = z.object({
  tenantId: z.uuid(),
  requestedBy: z.uuid(),
  message: z.string().trim().min(1).max(200)
}).strict();

export interface ValidationResult {
  processedAt: string;
  tenantId: string;
  accepted: true;
}

export async function processFoundationJob(
  job: Pick<Job<ValidationJobInput>, "data">
): Promise<ValidationResult> {
  const payload = payloadSchema.parse(job.data);
  return {
    processedAt: new Date().toISOString(),
    tenantId: payload.tenantId,
    accepted: true
  };
}
