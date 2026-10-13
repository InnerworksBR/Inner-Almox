import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { AppError } from "../../errors/app-error";
import { requireTenantContext } from "../../middleware/require-tenant-context";
import type { DashboardService } from "../../services/dashboard-service";
import type { ContextResolver } from "../../types/context";

interface Options {
  contextResolver: ContextResolver;
  dashboardService: DashboardService;
}

const dashboardModule = z.enum(["patrimonio", "almoxarifado", "frota"]);

export const dashboardRoutes: FastifyPluginAsync<Options> = async (app, { contextResolver, dashboardService }) => {
  app.get("/v1/dashboard", { preHandler: requireTenantContext(contextResolver) }, async (request) => {
    const context = request.tenantContext;
    if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
    return { data: await dashboardService.metrics(context.tenantId) };
  });

  app.get("/v1/dashboard/:module", { preHandler: requireTenantContext(contextResolver) }, async (request) => {
    const context = request.tenantContext;
    if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");

    const parsed = dashboardModule.safeParse((request.params as { module?: string }).module);
    if (!parsed.success) throw new AppError("Módulo de dashboard inválido.", 422, "INVALID_DASHBOARD_MODULE");

    return { data: await dashboardService.moduleMetrics(context.tenantId, parsed.data) };
  });
};
