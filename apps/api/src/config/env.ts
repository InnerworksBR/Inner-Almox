import { z } from "zod";

// Empty optional values from .env are normalized instead of failing startup.

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");
const optionalUrl = z.preprocess((value) => value === "" ? undefined : value, z.url().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().max(65535).default(3333),
  TRUST_PROXY: booleanString.default(false),
  WEB_ORIGINS: z.string().default("http://localhost:3000"),
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  REDIS_URL: z.url().default("redis://localhost:6379"),
  QUEUE_VALIDATION_ENABLED: booleanString.default(true),
  QR_CODE_BASE_URL: optionalUrl,
  PLATFORM_ADMIN_EMAILS: z.string().default(""),
  DOCUMENT_PUBLIC_URL: optionalUrl,
});

export type ApiEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Configuração inválida da API: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
