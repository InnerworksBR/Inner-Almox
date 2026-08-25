import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../../errors/app-error";
import { requireTenantContext } from "../../middleware/require-tenant-context";
import type { ContextResolver, QueuePublisher } from "../../types/context";

const bodySchema = z.object({ message: z.string().trim().min(1).max(200) }).strict();

interface QueueRouteOptions {
  contextResolver: ContextResolver;
  queuePublisher: QueuePublisher;
  enabled: boolean;
}

export const queueRoutes: FastifyPluginAsync<QueueRouteOptions> = async (
  app,
  { contextResolver, queuePublisher, enabled }
) => {
  app.post(
    "/v1/foundation/jobs",
    { preHandler: requireTenantContext(contextResolver) },
    async (request, reply) => {
      if (!enabled) throw new AppError("Fila de validação desabilitada.", 404, "QUEUE_DISABLED");
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) throw new AppError("Corpo da requisição inválido.", 400, "VALIDATION_ERROR");
      const context = request.tenantContext;
      if (!context) throw new AppError("Contexto ausente.", 500, "MISSING_CONTEXT");

      const jobId = await queuePublisher.publishValidation({
        tenantId: context.tenantId,
        requestedBy: context.userId,
        message: parsed.data.message
      });
      return reply.status(202).send({ data: { jobId } });
    }
  );
};
