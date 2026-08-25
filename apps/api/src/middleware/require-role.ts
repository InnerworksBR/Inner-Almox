import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error";

export function requireTenantRole(allowedRoles: readonly string[]) {
  return async function validateRole(request: FastifyRequest, _reply: FastifyReply) {
    const context = request.tenantContext;
    if (!context) throw new AppError("Contexto do tenant ausente.", 401, "TENANT_CONTEXT_REQUIRED");
    if (!context.roles.some((role) => allowedRoles.includes(role))) {
      throw new AppError("Você não possui permissão para esta operação.", 403, "PERMISSION_DENIED");
    }
  };
}
