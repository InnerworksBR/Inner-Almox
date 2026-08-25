import { buildApp } from "./app";
import { loadEnv } from "./config/env";

const env = loadEnv();
const app = await buildApp({ env });

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.fatal(error);
  process.exitCode = 1;
}
