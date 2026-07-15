import { LoginSchema, LogoutSchema, VerifyRouteSchema } from "./auth.schema.js";
import type { VerifyRequest } from "./auth.schema.js";
import { supabase } from "../../lib/supabase.js";
import { trainers } from "../../db/schema.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";

const authRateLimit = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: "1 minute",
    },
  },
} as const;

const isProduction = process.env.NODE_ENV === "production";
const accessTokenMaxAgeSeconds = Number(process.env.ACCESS_TOKEN_MAX_AGE_SECONDS ?? 60 * 60);
const refreshTokenMaxAgeSeconds = Number(
  process.env.REFRESH_TOKEN_MAX_AGE_SECONDS ?? 60 * 60 * 24 * 7,
);

export async function authRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.post("/login", { schema: LoginSchema, ...authRateLimit }, async (request, reply) => {
    const { email } = request.body;
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) return reply.code(400).send({ error: error.message });
    return { message: "Check your email for the magic link!" };
  });

  server.post<{
    Body: VerifyRequest;
    Reply: {
      200: { message: string };
      400: { error: string };
      401: { error: string };
      500: { error: string };
    };
  }>(
    "/verify",
    {
      schema: VerifyRouteSchema,
      ...authRateLimit,
    },
    async (request, reply) => {
      const { email, token, token_hash } = request.body;

      let result;

      if (token_hash) {
        result = await supabase.auth.verifyOtp({
          token_hash,
          type: "email",
        });
      } else if (token) {
        result = await supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        });
      } else {
        return reply.code(400).send({ error: "Either token or token_hash is required" });
      }

      const { data, error } = result;

      if (error || !data.session) {
        return reply.code(401).send({ error: error?.message || "Verification failed" });
      }

      const authUser = data.user;
      const authUserId = authUser?.id;

      if (!authUserId) {
        return reply.code(500).send({ error: "Authenticated user is missing an ID" });
      }

      try {
        await fastify.db
          .insert(trainers)
          .values({
            id: authUserId,
            userId: authUserId,
            username: `trainer_${authUserId.replace(/-/g, "")}`,
          })
          .onConflictDoNothing({ target: trainers.userId });
      } catch (trainerError) {
        request.log.error({ trainerError, authUserId }, "Failed to initialize trainer profile");
        return reply.code(500).send({ error: "Failed to initialize trainer profile" });
      }

      // Set the JWT in a secure, HttpOnly cookie
      reply.setCookie("sb-access-token", data.session.access_token, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: accessTokenMaxAgeSeconds,
      });

      reply.setCookie("sb-refresh-token", data.session.refresh_token, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: refreshTokenMaxAgeSeconds,
      });

      return { message: "Authenticated successfully" };
    },
  );

  server.post(
    "/logout",
    {
      preHandler: [fastify.authenticate],
      schema: LogoutSchema,
      ...authRateLimit,
    },
    async (request, reply) => {
      request.log.info({ userId: request.user.id }, "User logged out");

      reply.clearCookie("sb-access-token", { path: "/" });
      reply.clearCookie("sb-refresh-token", { path: "/" });

      return reply.code(200).send({ message: "Logged out successfully" });
    },
  );
}
