import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { AppError } from "../errors/app-error";

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
        requestId: request.id
      });
    }

    request.log.error({ err: error }, "Unhandled request error");
    return reply.status(500).send({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Erro interno do servidor." },
      requestId: request.id
    });
  });
};

export default fp(errorHandlerPlugin, { name: "error-handler" });
