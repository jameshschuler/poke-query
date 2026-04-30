import type { FastifyTypebox } from "../../types/fastify.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  UpdateTrainerSchema,
  DeactivateTrainerSchema,
  DeleteTrainerSchema,
} from "./users.schema.js";
import { trainers } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export async function userRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get("/me", { preHandler: [fastify.authenticate] }, async (request) => {
    return request.user;
  });

  server.patch(
    "/me",
    { preHandler: [fastify.authenticate], schema: UpdateTrainerSchema },
    async (request, reply) => {
      const userId = request.user.id;
      const { username, level, team, avatarUrl } = request.body;

      const [updated] = await fastify.db
        .update(trainers)
        .set({
          ...(username !== undefined && { username }),
          ...(level !== undefined && { level }),
          ...(team !== undefined && { team }),
          ...(avatarUrl !== undefined && { avatarUrl }),
        })
        .where(eq(trainers.id, userId))
        .returning({ id: trainers.id });

      if (!updated) {
        return reply.code(404).send({ error: "Trainer not found" });
      }

      return reply.code(200).send({ id: updated.id });
    },
  );

  server.post(
    "/me/deactivate",
    { preHandler: [fastify.authenticate], schema: DeactivateTrainerSchema },
    async (request, reply) => {
      const userId = request.user.id;

      const [updated] = await fastify.db
        .update(trainers)
        .set({ deactivatedAt: new Date() })
        .where(eq(trainers.id, userId))
        .returning({ id: trainers.id });

      if (!updated) {
        return reply.code(404).send({ error: "Trainer not found" });
      }

      return reply.code(200).send({ message: "Account deactivated" });
    },
  );

  server.post(
    "/me/reactivate",
    { preHandler: [fastify.authenticate], schema: DeactivateTrainerSchema },
    async (request, reply) => {
      const userId = request.user.id;

      const [updated] = await fastify.db
        .update(trainers)
        .set({ deactivatedAt: null })
        .where(eq(trainers.id, userId))
        .returning({ id: trainers.id });

      if (!updated) {
        return reply.code(404).send({ error: "Trainer not found" });
      }

      return reply.code(200).send({ message: "Account reactivated" });
    },
  );

  server.delete(
    "/me",
    { preHandler: [fastify.authenticate], schema: DeleteTrainerSchema },
    async (request, reply) => {
      const userId = request.user.id;

      // creatorId on search_queries is set null on delete, so queries are preserved
      const [deleted] = await fastify.db
        .delete(trainers)
        .where(eq(trainers.id, userId))
        .returning({ id: trainers.id });

      if (!deleted) {
        return reply.code(404).send({ error: "Trainer not found" });
      }

      reply.clearCookie("sb-access-token", { path: "/" });
      reply.clearCookie("sb-refresh-token", { path: "/" });

      return reply.code(204).send(null);
    },
  );
}
