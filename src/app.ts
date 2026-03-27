import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import authPlugin from "./plugins/auth.js";
import dbPlugin from "./plugins/db.js";
import { userRoutes } from "./modules/users/users.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastifyCookie from "@fastify/cookie";
import { queriesRoutes } from "./modules/queries/queries.routes.js";

export async function buildApp() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV === "test" ? false : true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await fastify.register(swagger, {
    openapi: {
      info: { title: "Fastify API", version: "1.0.0" },
    },
  });

  await fastify.register(fastifyCookie, { secret: process.env.COOKIE_SECRET! });
  await fastify.register(dbPlugin);
  await fastify.register(authPlugin);

  await fastify.register(swaggerUi, { routePrefix: "/docs" });
  await fastify.register(authRoutes, { prefix: "/auth" });
  await fastify.register(userRoutes, { prefix: "/api/v1/users" });
  await fastify.register(queriesRoutes, { prefix: "/api/v1/queries" });

  return fastify;
}
