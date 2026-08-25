import type { FastifyPluginAsync } from "fastify";
import type { ContextResolver } from "../../types/context";
import { requireTenantContext } from "../../middleware/require-tenant-context";

interface ContextRouteOptions { contextResolver: ContextResolver }

export const contextRoutes: FastifyPluginAsync<ContextRouteOptions> = async (
  app,
  { contextResolver }
) => {
  app.get(
    "/v1/context",
    { preHandler: requireTenantContext(contextResolver) },
    async (request) => ({ data: request.tenantContext })
  );
};
