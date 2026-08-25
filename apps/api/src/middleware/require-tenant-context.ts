import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error";
import { normalizeHostname } from "../services/hostname";
import type { ContextResolver } from "../types/context";

export function requireTenantContext(contextResolver: ContextResolver) {
  return async function resolveRequestContext(request: FastifyRequest, _reply: FastifyReply) {
    const authorization = request.headers.authorization;
    const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
    if (!match?.[1]) {
      throw new AppError("Autenticação obrigatória.", 401, "AUTHENTICATION_REQUIRED");
    }

    const forwardedHostname=request.headers["x-tenant-hostname"];
    request.tenantContext = await contextResolver.resolve({
      accessToken: match[1],
      hostname: normalizeHostname(typeof forwardedHostname==="string"?forwardedHostname:request.hostname)
    });
  };
}
