import { LoginSchema, LogoutSchema, VerifyRouteSchema } from "./auth.schema.js";
import { supabase } from "../../lib/supabase.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";

const isProduction = process.env.NODE_ENV === "production";
const accessTokenMaxAgeSeconds = Number(process.env.ACCESS_TOKEN_MAX_AGE_SECONDS ?? 60 * 60);
const refreshTokenMaxAgeSeconds = Number(
  process.env.REFRESH_TOKEN_MAX_AGE_SECONDS ?? 60 * 60 * 24 * 7,
);

export async function authRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.post("/login", { schema: LoginSchema }, async (request, reply) => {
    const { email } = request.body;
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) return reply.code(400).send({ error: error.message });
    return { message: "Check your email for the magic link!" };
  });

  server.post(
    "/verify",
    {
      schema: VerifyRouteSchema,
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
    },
    async (request, reply) => {
      request.log.info({ userId: request.user.id }, "User logged out");

      reply.clearCookie("sb-access-token", { path: "/" });
      reply.clearCookie("sb-refresh-token", { path: "/" });

      return reply.code(200).send({ message: "Logged out successfully" });
    },
  );
}
