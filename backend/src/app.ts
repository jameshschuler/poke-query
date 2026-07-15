import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import cors from "@fastify/cors";
import authPlugin from "./plugins/auth.js";
import dbPlugin from "./plugins/db.js";
import { userRoutes } from "./modules/users/users.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastifyCookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { queriesRoutes } from "./modules/queries/queries.routes.js";
import { guestRoutes } from "./modules/guests/guest.routes.js";
import { communityRoutes } from "./modules/community/community.routes.js";
import { notificationsRoutes } from "./modules/notifications/notifications.routes.js";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import type { FastifyRequest } from "fastify";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === "development";

const loggerConfig = isDev
  ? {
      level: process.env.LOG_LEVEL ?? "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.token",
          "req.body.token_hash",
          "req.body.access_token",
          "req.body.refresh_token",
        ],
        censor: "[Redacted]",
      },
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
    }
  : {
      level: process.env.LOG_LEVEL ?? "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.token",
          "req.body.token_hash",
          "req.body.access_token",
          "req.body.refresh_token",
        ],
        censor: "[Redacted]",
      },
    };

function getRouteCategory(request: FastifyRequest) {
  if (request.url.startsWith("/api/v1/auth")) {
    return "auth";
  }

  if (request.url.startsWith("/api/v1/")) {
    return "api";
  }

  return "other";
}

function getAllowedOrigins() {
  const configured = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  // Default development origins for local frontends
  return ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"];
}

export async function buildApp() {
  const description = await readFile(resolve(__dirname, "openapi-description.md"), "utf-8");
  const allowedOrigins = getAllowedOrigins();

  const fastify = Fastify({
    logger: process.env.NODE_ENV === "test" ? false : loggerConfig,
    genReqId: (request) => request.headers["x-request-id"]?.toString() ?? crypto.randomUUID(),
  }).withTypeProvider<TypeBoxTypeProvider>();

  fastify.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  fastify.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        requestId: request.id,
        routeCategory: getRouteCategory(request),
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: reply.elapsedTime,
        userId: request.user?.id,
      },
      "Request completed",
    );
  });

  fastify.addHook("onError", async (request, reply, error) => {
    request.log.error(
      {
        requestId: request.id,
        routeCategory: getRouteCategory(request),
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        userId: request.user?.id,
        error,
      },
      "Request failed",
    );

    reply.header("x-request-id", request.id);
  });

  await fastify.register(cors, {
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-request-id"],
    origin: (origin, cb) => {
      // Allow non-browser clients (curl, Postman, server-to-server)
      if (!origin) {
        cb(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }

      cb(new Error("Origin not allowed"), false);
    },
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "PokeQuery API",
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
  await fastify.register(authRoutes, { prefix: "/api/v1/auth" });
  await fastify.register(userRoutes, { prefix: "/api/v1/users" });
  await fastify.register(guestRoutes, { prefix: "/api/v1/queries/guest" });
  await fastify.register(queriesRoutes, { prefix: "/api/v1/queries" });
  await fastify.register(communityRoutes, { prefix: "/api/v1/community" });
  await fastify.register(notificationsRoutes, { prefix: "/api/v1/notifications" });

  return fastify;
}
