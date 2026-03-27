import { LoginSchema, VerifySchema } from "./auth.schema.js";
import { supabase } from "../../lib/supabase.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { trainers } from "../../db/schema.js";
import type { FastifyTypebox } from "../../types/fastify.js";

const isProduction = process.env.NODE_ENV === "production";

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
      schema: { body: VerifySchema },
    },
    async (request, reply) => {
      const { email, token, token_hash, username } = request.body;

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
        return reply
          .code(400)
          .send({ error: "Either token or token_hash is required" });
      }

      const { data, error } = result;

      if (error || !data.session) {
        return reply
          .code(401)
          .send({ error: error?.message || "Verification failed" });
      }

      if (data.user) {
        await fastify.db
          .insert(trainers)
          .values({
            id: data.user.id,
            username: username || `trainer_${data.user.id.slice(0, 4)}`,
          })
          .onConflictDoNothing();
      }

      // Set the JWT in a secure, HttpOnly cookie
      reply.setCookie("sb-access-token", data.session.access_token, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour
      });

      reply.setCookie("sb-refresh-token", data.session.refresh_token, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return { message: "Authenticated successfully" };
    },
  );
}
