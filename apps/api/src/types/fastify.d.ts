import "fastify";
import type { TenantContext } from "./context";

declare module "fastify" {
  interface FastifyRequest {
    tenantContext: TenantContext | null;
  }
}
