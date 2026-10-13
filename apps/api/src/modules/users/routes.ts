import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../../errors/app-error";
import { requireTenantContext } from "../../middleware/require-tenant-context";
import { requireTenantRole } from "../../middleware/require-role";
import type { UserAdminService } from "../../services/user-admin-service";
import type { ContextResolver } from "../../types/context";

interface UserRouteOptions { contextResolver: ContextResolver; userAdminService: UserAdminService }
const role = z.enum(["tenant_admin","asset_manager","warehouse_manager","fleet_manager","maintenance_manager","department_manager","employee","auditor"]);
const inviteSchema = z.object({
  email: z.email(), full_name: z.string().trim().min(2).max(160), roles: z.array(role).min(1),
  employee_number: z.string().trim().max(50).optional(), position: z.string().trim().max(120).optional(),
  branch_id: z.uuid().optional(), department_id: z.uuid().optional(), cost_center_id: z.uuid().optional(), admission_date: z.iso.date().optional()
});
const directUserSchema = inviteSchema.extend({ password: z.string().min(8).max(72) });
const userListQuery = z.object({
  busca: z.string().trim().max(120).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  tamanho: z.coerce.number().int().positive().max(100).default(25)
});

export const userRoutes: FastifyPluginAsync<UserRouteOptions> = async (app, { contextResolver, userAdminService }) => {
  const authenticate = requireTenantContext(contextResolver);
  const authorize = requireTenantRole(["tenant_admin"]);
  app.get("/v1/users", { preHandler: [authenticate, authorize] }, async (request) => {
    const context = request.tenantContext;
    if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
    const parsed = userListQuery.safeParse(request.query);
    if (!parsed.success) throw new AppError("Parâmetros de usuários inválidos.", 422, "VALIDATION_ERROR");
    const result = await userAdminService.list(context.tenantId, parsed.data);
    return { data: result.linhas, total: result.total, pagina: parsed.data.pagina, tamanho: parsed.data.tamanho };
  });
  app.post("/v1/users", { preHandler: [authenticate, authorize] }, async (request, reply) => {
    const context = request.tenantContext;
    if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
    const parsed = directUserSchema.safeParse(request.body);
    if (!parsed.success) throw new AppError("Dados do cadastro são inválidos.", 422, "VALIDATION_ERROR");
    const { email, full_name: fullName, password, roles, ...employee } = parsed.data;
    const data = await userAdminService.create(context.tenantId, context.userId, { email, fullName, password, roles, employee });
    return reply.status(201).send({ data });
  });
  app.post("/v1/users/invitations", { preHandler: [authenticate, authorize] }, async (request, reply) => {
    const context = request.tenantContext;
    if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
    const parsed = inviteSchema.safeParse(request.body);
    if (!parsed.success) throw new AppError("Dados do convite são inválidos.", 422, "VALIDATION_ERROR");
    const { email, full_name: fullName, roles, ...employee } = parsed.data;
    const data = await userAdminService.invite(context.tenantId, context.userId, { email, fullName, roles, employee });
    return reply.status(201).send({ data });
  });
  app.patch("/v1/users/:membershipId/status", { preHandler: [authenticate, authorize] }, async (request) => {
    const context = request.tenantContext;
    if (!context) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
    const params = z.object({ membershipId: z.uuid() }).safeParse(request.params);
    const body = z.object({ status: z.enum(["active","suspended","inactive"]) }).safeParse(request.body);
    if (!params.success || !body.success) throw new AppError("Dados da alteração são inválidos.", 422, "VALIDATION_ERROR");
    return { data: await userAdminService.changeStatus(context.tenantId, context.userId, params.data.membershipId, body.data.status) };
  });
};
