import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { AppError } from "../../errors/app-error";
import { requireTenantContext } from "../../middleware/require-tenant-context";
import { requireTenantRole } from "../../middleware/require-role";
import type { TenantConfigurationService } from "../../services/tenant-configuration-service";
import type { ContextResolver } from "../../types/context";

interface Options { contextResolver: ContextResolver; configurationService: TenantConfigurationService }

const configuration = z.object({
  legal_name: z.string().trim().min(2).max(200).optional(),
  product_name: z.string().trim().min(2).max(120).optional(),
  logo_path: z.string().trim().max(1000).nullable().optional(),
  favicon_path: z.string().trim().max(1000).nullable().optional(),
  login_image_path: z.string().trim().max(1000).nullable().optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0);

export const tenantRoutes: FastifyPluginAsync<Options> = async (app, { contextResolver, configurationService }) => {
  const auth = requireTenantContext(contextResolver);
  app.get("/v1/tenant/configuration", { preHandler: auth }, async (request) => {
    if (!request.tenantContext) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
    return { data: await configurationService.get(request.tenantContext.tenantId) };
  });
  app.patch("/v1/tenant/configuration", { preHandler: [auth, requireTenantRole(["tenant_admin"])] }, async (request) => {
    const context = request.tenantContext;
    const payload = configuration.safeParse(request.body);
    if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
    if (!payload.success) throw new AppError("Configuração inválida.", 422, "VALIDATION_ERROR");
    return { data: await configurationService.update(context.tenantId, context.userId, payload.data) };
  });
};
