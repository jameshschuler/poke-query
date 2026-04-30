import type { FastifyTypebox } from "../../types/fastify.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  UpdateTrainerSchema,
  DeactivateTrainerSchema,
  DeleteTrainerSchema,
  GetMeSchema,
  GetTrainerSchema,
} from "./users.schema.js";
import { trainers, searchQueries, favorites } from "../../db/schema.js";
import { count, eq, sql } from "drizzle-orm";

export async function userRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/me",
    { preHandler: [fastify.authenticate], schema: GetMeSchema },
    async (request, reply) => {
      const userId = request.user.id;

      const [row] = await fastify.db
        .select({
          id: trainers.id,
          username: trainers.username,
          team: trainers.team,
          level: trainers.level,
          avatarUrl: trainers.avatarUrl,
          queryCount: count(searchQueries.id).as("queryCount"),
          favoriteCount: count(favorites.queryId).as("favoriteCount"),
          forkCount:
            sql<number>`count(case when ${searchQueries.parentQueryId} is not null then 1 end)`.as(
              "forkCount",
            ),
        })
        .from(trainers)
        .leftJoin(searchQueries, eq(searchQueries.creatorId, trainers.id))
        .leftJoin(favorites, eq(favorites.trainerId, trainers.id))
        .where(eq(trainers.userId, userId))
        .groupBy(trainers.id, trainers.username, trainers.team, trainers.level, trainers.avatarUrl);

      if (!row) return reply.code(404).send({ error: "Trainer not found" });

      return {
        ...row,
        team: row.team as "mystic" | "valor" | "instinct" | null,
      };
    },
  );

  server.get("/:id", { schema: GetTrainerSchema }, async (request, reply) => {
    const { id } = request.params;

    const [row] = await fastify.db
      .select({
        id: trainers.id,
        username: trainers.username,
        team: trainers.team,
        level: trainers.level,
        avatarUrl: trainers.avatarUrl,
        queryCount: sql<number>`count(case when ${searchQueries.isPublic} = true then 1 end)`.as(
          "queryCount",
        ),
        forkCount:
          sql<number>`count(case when ${searchQueries.parentQueryId} is not null then 1 end)`.as(
            "forkCount",
          ),
      })
      .from(trainers)
      .leftJoin(searchQueries, eq(searchQueries.creatorId, trainers.id))
      .where(eq(trainers.id, id))
      .groupBy(trainers.id, trainers.username, trainers.team, trainers.level, trainers.avatarUrl);

    if (!row) return reply.code(404).send({ error: "Trainer not found" });

    return {
      ...row,
      team: row.team as "mystic" | "valor" | "instinct" | null,
    };
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
        .where(eq(trainers.userId, userId))
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
        .where(eq(trainers.userId, userId))
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
        .where(eq(trainers.userId, userId))
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
        .where(eq(trainers.userId, userId))
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
