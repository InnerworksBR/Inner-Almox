import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type { ApiEnv } from "../config/env";

interface SecurityOptions { env: ApiEnv }

const securityPlugin: FastifyPluginAsync<SecurityOptions> = async (app, { env }) => {
  const allowedOrigins = new Set(env.WEB_ORIGINS.split(",").map((origin) => origin.trim()));
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origem não permitida."), false);
    }
  });
};

export default fp(securityPlugin, { name: "security" });
