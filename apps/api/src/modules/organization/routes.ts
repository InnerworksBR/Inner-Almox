import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../../errors/app-error";
import { requireTenantContext } from "../../middleware/require-tenant-context";
import { requireTenantRole } from "../../middleware/require-role";
import type { TenantResourceService } from "../../services/tenant-resource-service";
import { opcoesDeConsulta } from "../business/routes";
import type { ContextResolver } from "../../types/context";

interface OrganizationRouteOptions { contextResolver: ContextResolver; resourceService: TenantResourceService }
type OrganizationTable = "branches" | "departments" | "cost_centers" | "locations" | "suppliers";

const identifier = z.uuid();
const status = z.enum(["active", "inactive"]);
const commonFields = {
  code: z.string().trim().min(1).max(30).optional(),
  name: z.string().trim().min(2).max(160),
  status: status.optional()
};
const schemas = {
  branches: z.object({ ...commonFields, legal_name: z.string().trim().max(200).optional(), tax_id: z.string().trim().max(30).optional(), email: z.email().optional(), phone: z.string().trim().max(30).optional(), manager_user_id: identifier.nullable().optional(), address: z.record(z.string(), z.unknown()).optional() }),
  departments: z.object({ ...commonFields, branch_id: identifier.nullable().optional(), parent_id: identifier.nullable().optional(), cost_center_id: identifier.nullable().optional(), manager_user_id: identifier.nullable().optional() }),
  cost_centers: z.object({ ...commonFields, description: z.string().trim().max(1000).optional(), manager_user_id: identifier.nullable().optional() }),
  locations: z.object({ ...commonFields, branch_id: identifier.nullable().optional(), parent_id: identifier.nullable().optional(), type: z.enum(["building", "floor", "room", "warehouse", "garage", "stock", "other"]).optional(), path: z.string().trim().max(500).optional() }),
  suppliers: z.object({ legal_name: z.string().trim().min(2).max(200), trade_name: z.string().trim().max(200).optional(), tax_id: z.string().trim().max(30).optional(), email: z.email().optional(), phone: z.string().trim().max(30).optional(), contact_name: z.string().trim().max(160).optional(), categories: z.array(z.string().trim().min(1).max(80)).max(30).optional(), address: z.record(z.string(), z.unknown()).optional(), notes: z.string().trim().max(3000).optional(), status: status.optional() })
} satisfies Record<OrganizationTable, z.ZodObject>;

const routeConfig: ReadonlyArray<{ path: string; table: OrganizationTable }> = [
  { path: "branches", table: "branches" },
  { path: "departments", table: "departments" },
  { path: "cost-centers", table: "cost_centers" },
  { path: "locations", table: "locations" },
  { path: "suppliers", table: "suppliers" }
];

function parseBody(table: OrganizationTable, body: unknown, partial: boolean): Record<string, unknown> {
  const schema = partial ? schemas[table].partial() : schemas[table];
  const result = schema.safeParse(body);
  if (!result.success) throw new AppError("Dados enviados são inválidos.", 422, "VALIDATION_ERROR", z.flattenError(result.error).fieldErrors);
  if (partial && Object.keys(result.data).length === 0) throw new AppError("Informe ao menos um campo para alteração.", 422, "EMPTY_UPDATE");
  return result.data;
}

function guardInternalCode(payload: Record<string, unknown>): void {
  if (payload.code !== undefined) throw new AppError("O código interno é gerado pelo sistema.", 422, "PROTECTED_FIELD");
}

export const organizationRoutes: FastifyPluginAsync<OrganizationRouteOptions> = async (app, { contextResolver, resourceService }) => {
  const authenticate = requireTenantContext(contextResolver);
  const authorize = requireTenantRole(["tenant_admin"]);
  for (const config of routeConfig) {
    app.get(`/v1/${config.path}`, { preHandler: authenticate }, async (request) => {
      const context = request.tenantContext;
      if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
      const opcoes = opcoesDeConsulta(request.query, config.table);
      const resultado = await resourceService.list(config.table, context.tenantId, opcoes);
      return { data: resultado.linhas, total: resultado.total, pagina: opcoes.pagina ?? 1, tamanho: opcoes.tamanho ?? 25 };
    });
    app.post(`/v1/${config.path}`, { preHandler: [authenticate, authorize] }, async (request, reply) => {
      const context = request.tenantContext;
      if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
      const payload = parseBody(config.table, request.body, false);
      guardInternalCode(payload);
      const data = await resourceService.create(config.table, context.tenantId, context.userId, payload);
      return reply.status(201).send({ data });
    });
    app.patch(`/v1/${config.path}/:id`, { preHandler: [authenticate, authorize] }, async (request) => {
      const context = request.tenantContext;
      if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
      const parsedParams = z.object({ id: z.uuid() }).safeParse(request.params);
      if (!parsedParams.success) throw new AppError("Identificador inválido.", 422, "INVALID_IDENTIFIER");
      const payload = parseBody(config.table, request.body, true);
      guardInternalCode(payload);
      return { data: await resourceService.update(config.table, context.tenantId, context.userId, parsedParams.data.id, payload) };
    });
  }
};
