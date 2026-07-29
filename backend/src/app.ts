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
import { communityRoutes } from "./modules/community/community.routes.js";
import { metricsRoutes } from "./modules/metrics/metrics.routes.js";
import { notificationsRoutes } from "./modules/notifications/notifications.routes.js";
import { moderationRoutes } from "./modules/moderation/moderation.routes.js";
import { assistantRoutes } from "./modules/assistant/assistant.routes.js";
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

function inferErrorCode(statusCode: number): string {
  if (statusCode === 400) {
    return "bad_request";
  }

  if (statusCode === 401) {
    return "unauthorized";
  }

  if (statusCode === 403) {
    return "forbidden";
  }

  if (statusCode === 404) {
    return "not_found";
  }

  if (statusCode === 409) {
    return "conflict";
  }

  if (statusCode === 422) {
    return "validation_error";
  }

  if (statusCode === 429) {
    return "rate_limited";
  }

  if (statusCode >= 500) {
    return "internal_error";
  }

  return "request_failed";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJsonPayload(payload: unknown): Record<string, unknown> | null {
  if (payload === null || payload === undefined) {
    return null;
  }

  if (isPlainObject(payload)) {
    return payload;
  }

  if (typeof payload !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!isPlainObject(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function shouldNormalizeJsonReply(contentType: string | number | string[] | undefined): boolean {
  if (typeof contentType !== "string") {
    return false;
  }

  return contentType.includes("application/json");
}

async function loadOpenApiDescription() {
  const candidatePaths = [
    resolve(__dirname, "openapi-description.md"),
    resolve(__dirname, "../src/openapi-description.md"),
    resolve(process.cwd(), "src/openapi-description.md"),
    resolve(process.cwd(), "openapi-description.md"),
  ];

  for (const filePath of candidatePaths) {
    try {
      return await readFile(filePath, "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  throw new Error(`Unable to locate openapi-description.md. Tried: ${candidatePaths.join(", ")}`);
}

export async function buildApp() {
  const description = await loadOpenApiDescription();
  const allowedOrigins = getAllowedOrigins();
  const startedAt = new Date().toISOString();
  const shouldNormalizeResponses = process.env.NODE_ENV !== "test";

  const fastify = Fastify({
    logger: process.env.NODE_ENV === "test" ? false : loggerConfig,
    genReqId: (request) => request.headers["x-request-id"]?.toString() ?? crypto.randomUUID(),
  }).withTypeProvider<TypeBoxTypeProvider>();

  if (shouldNormalizeResponses) {
    fastify.setErrorHandler(async (error, request, reply) => {
      const statusCode =
        typeof (error as { statusCode?: unknown }).statusCode === "number"
          ? ((error as { statusCode: number }).statusCode ?? 500)
          : 500;

      const errorMessage =
        typeof (error as { message?: unknown }).message === "string"
          ? ((error as { message: string }).message ?? "Request failed")
          : "Request failed";
      const safeMessage = statusCode >= 500 ? "Internal server error" : errorMessage;

      request.log.error(
        {
          requestId: request.id,
          routeCategory: getRouteCategory(request),
          method: request.method,
          url: request.url,
          statusCode,
          userId: request.user?.id,
          error,
        },
        "Unhandled request error",
      );

      reply.code(statusCode).send({
        error: safeMessage,
        errorCode: inferErrorCode(statusCode),
        requestId: request.id,
      });
    });
  }

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

  fastify.addHook("onSend", async (request, reply, payload) => {
    if (!shouldNormalizeResponses) {
      return payload;
    }

    if (!shouldNormalizeJsonReply(reply.getHeader("content-type"))) {
      return payload;
    }

    if (reply.statusCode === 204) {
      return payload;
    }

    const body = parseJsonPayload(payload);
    if (!body) {
      return payload;
    }

    if (reply.statusCode >= 400) {
      const messageCandidate = body.error;

      if (typeof messageCandidate !== "string" || messageCandidate.trim().length === 0) {
        body.error = "Request failed";
      }

      if (typeof body.errorCode !== "string" || body.errorCode.trim().length === 0) {
        body.errorCode = inferErrorCode(reply.statusCode);
      }

      if (typeof body.requestId !== "string" || body.requestId.trim().length === 0) {
        body.requestId = request.id;
      }

      return JSON.stringify(body);
    }

    if (request.method === "GET" || request.method === "HEAD") {
      return payload;
    }

    const existingMeta = body.meta;
    if (isPlainObject(existingMeta) && typeof existingMeta.requestId === "string") {
      return payload;
    }

    body.meta = {
      ...(isPlainObject(existingMeta) ? existingMeta : {}),
      requestId: request.id,
    };

    return JSON.stringify(body);
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
  await fastify.register(queriesRoutes, { prefix: "/api/v1/queries" });
  await fastify.register(communityRoutes, { prefix: "/api/v1/community" });
  await fastify.register(metricsRoutes, { prefix: "/api/v1/metrics" });
  await fastify.register(notificationsRoutes, { prefix: "/api/v1/notifications" });
  await fastify.register(moderationRoutes, { prefix: "/api/v1/moderation" });
  await fastify.register(assistantRoutes, { prefix: "/api/v1/assistant" });

  fastify.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              service: { type: "string" },
              uptimeSeconds: { type: "integer" },
              startedAt: { type: "string", format: "date-time" },
              now: { type: "string", format: "date-time" },
            },
            required: ["status", "service", "uptimeSeconds", "startedAt", "now"],
          },
        },
      },
    },
    async () => {
      return {
        status: "ok",
        service: "poke-query-backend",
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt,
        now: new Date().toISOString(),
      };
    },
  );

  return fastify;
}
