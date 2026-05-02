import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import authPlugin from "./plugins/auth.js";
import dbPlugin from "./plugins/db.js";
import { userRoutes } from "./modules/users/users.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastifyCookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { queriesRoutes } from "./modules/queries/queries.routes.js";
import { communityRoutes } from "./modules/community/community.routes.js";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === "development";

const loggerConfig = isDev
  ? {
      level: process.env.LOG_LEVEL ?? "info",
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
    }
  : { level: process.env.LOG_LEVEL ?? "info" };

export async function buildApp() {
  const description = await readFile(resolve(__dirname, "openapi-description.md"), "utf-8");

  const fastify = Fastify({
    logger: process.env.NODE_ENV === "test" ? false : loggerConfig,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Poke Query API",
        version: "1.0.0",
        description,
      },
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "sb-access-token",
            description: "Supabase access token cookie",
          },
        },
      },
    },
  });

  await fastify.register(fastifyCookie, { secret: process.env.COOKIE_SECRET! });
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });
  await fastify.register(dbPlugin);
  await fastify.register(authPlugin);

  await fastify.register(swaggerUi, { routePrefix: "/docs" });
  await fastify.register(authRoutes, { prefix: "/auth" });
  await fastify.register(userRoutes, { prefix: "/api/v1/users" });
  await fastify.register(queriesRoutes, { prefix: "/api/v1/queries" });
  await fastify.register(communityRoutes, { prefix: "/api/v1/community" });

  return fastify;
}
