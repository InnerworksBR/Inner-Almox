import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z.url().default("redis://localhost:6379"),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SMTP_HOST: z.preprocess(value=>value===""?undefined:value,z.string().min(1).optional()),
  SMTP_PORT: z.preprocess(value=>value===""?undefined:value,z.coerce.number().int().positive().max(65535).optional()),
  SMTP_USER: z.preprocess(value=>value===""?undefined:value,z.string().min(1).optional()),
  SMTP_PASSWORD: z.preprocess(value=>value===""?undefined:value,z.string().min(1).optional()),
  SMTP_FROM: z.preprocess(value=>value===""?undefined:value,z.string().min(3).optional())
});

export function loadWorkerEnv(source: NodeJS.ProcessEnv = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) throw new Error(`Configuração inválida do worker: ${z.prettifyError(result.error)}`);
  return result.data;
}
