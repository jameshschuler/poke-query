import type { FastifyTypebox } from "../../types/fastify.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  UpdateTrainerSchema,
  DeactivateTrainerSchema,
  DeleteTrainerSchema,
  GetMeSchema,
  GetTrainerSchema,
  FollowTrainerSchema,
  UnfollowTrainerSchema,
  GetTrainerFollowersSchema,
  GetMeFollowersSchema,
} from "./users.schema.js";
import { trainers, searchQueries, favorites, followers } from "../../db/schema.js";
import { and, count, desc, eq, sql } from "drizzle-orm";

export async function userRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  const normalizeTrainerCode = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 12) {
      return value;
    }

    return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
  };

  const toPublicTrainerProfile = (row: {
    team: string | null;
    level: number | null;
    trainerCode: string | null;
    isProfilePublic: boolean;
  }) => ({
    team: row.isProfilePublic ? (row.team as "mystic" | "valor" | "instinct" | null) : null,
    level: row.isProfilePublic ? row.level : null,
    trainerCode: row.isProfilePublic ? row.trainerCode : null,
  });

  const selectFollowers = (trainerId: string) =>
    fastify.db
      .select({
        id: trainers.id,
        username: trainers.username,
        team: trainers.team,
        level: trainers.level,
        trainerCode: trainers.trainerCode,
        isProfilePublic: trainers.isProfilePublic,
        avatarUrl: trainers.avatarUrl,
        followedAt: followers.createdAt,
      })
      .from(followers)
      .innerJoin(trainers, eq(trainers.id, followers.followerId))
      .where(eq(followers.followedId, trainerId))
      .orderBy(desc(followers.createdAt));

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
          trainerCode: trainers.trainerCode,
          isProfilePublic: trainers.isProfilePublic,
          avatarUrl: trainers.avatarUrl,
          queryCount: count(searchQueries.id).as("queryCount"),
          favoriteCount: count(favorites.queryId).as("favoriteCount"),
          followerCount: count(followers.followerId).as("followerCount"),
          forkCount:
            sql<number>`count(case when ${searchQueries.parentQueryId} is not null then 1 end)`.as(
              "forkCount",
            ),
        })
        .from(trainers)
        .leftJoin(searchQueries, eq(searchQueries.creatorId, trainers.id))
        .leftJoin(favorites, eq(favorites.trainerId, trainers.id))
        .leftJoin(followers, eq(followers.followedId, trainers.id))
        .where(eq(trainers.userId, userId))
        .groupBy(
          trainers.id,
          trainers.username,
          trainers.team,
          trainers.level,
          trainers.trainerCode,
          trainers.isProfilePublic,
          trainers.avatarUrl,
        );

      if (!row) return reply.code(404).send({ error: "Trainer not found" });

      return {
        ...row,
        team: row.team as "mystic" | "valor" | "instinct" | null,
        trainerCode: row.trainerCode,
        isProfilePublic: row.isProfilePublic,
      };
    },
  );

  server.get(
    "/me/followers",
    { preHandler: [fastify.authenticate], schema: GetMeFollowersSchema },
    async (request, reply) => {
      const userId = request.user.id;

      const [trainer] = await fastify.db
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.userId, userId));

      if (!trainer) {
        return reply.code(404).send({ error: "Trainer not found" });
      }

      const rows = await selectFollowers(trainer.id);

      return {
        total: rows.length,
        followers: rows.map((row) => ({
          ...row,
          ...toPublicTrainerProfile(row),
          followedAt: row.followedAt.toISOString(),
        })),
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
        trainerCode: trainers.trainerCode,
        isProfilePublic: trainers.isProfilePublic,
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
      .groupBy(
        trainers.id,
        trainers.username,
        trainers.team,
        trainers.level,
        trainers.trainerCode,
        trainers.isProfilePublic,
        trainers.avatarUrl,
      );

    if (!row) return reply.code(404).send({ error: "Trainer not found" });

    const publicProfile = toPublicTrainerProfile(row);

    return {
      ...row,
      ...publicProfile,
    };
  });

  server.get("/:id/followers", { schema: GetTrainerFollowersSchema }, async (request, reply) => {
    const { id } = request.params;

    const [trainer] = await fastify.db
      .select({ id: trainers.id })
      .from(trainers)
      .where(eq(trainers.id, id));

    if (!trainer) {
      return reply.code(404).send({ error: "Trainer not found" });
    }

    const rows = await selectFollowers(id);

    return {
      total: rows.length,
      followers: rows.map((row) => ({
        ...row,
        ...toPublicTrainerProfile(row),
        followedAt: row.followedAt.toISOString(),
      })),
    };
  });

  server.post(
    "/:id/follow",
    { preHandler: [fastify.authenticate], schema: FollowTrainerSchema },
    async (request, reply) => {
      const targetTrainerId = request.params.id;
      const currentTrainerId = request.user.id;

      if (targetTrainerId === currentTrainerId) {
        return reply.code(400).send({ error: "You cannot follow yourself" });
      }

      const [targetTrainer] = await fastify.db
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.id, targetTrainerId));

      if (!targetTrainer) {
        return reply.code(404).send({ error: "Trainer not found" });
      }

      await fastify.db
        .insert(followers)
        .values({
          followerId: currentTrainerId,
          followedId: targetTrainerId,
        })
        .onConflictDoNothing();

      return reply.code(204).send(null);
    },
  );

  server.post(
    "/:id/unfollow",
    { preHandler: [fastify.authenticate], schema: UnfollowTrainerSchema },
    async (request, reply) => {
      const targetTrainerId = request.params.id;
      const currentTrainerId = request.user.id;

      await fastify.db
        .delete(followers)
        .where(
          and(
            eq(followers.followerId, currentTrainerId),
            eq(followers.followedId, targetTrainerId),
          ),
        );

      return reply.code(204).send(null);
    },
  );

  server.patch(
    "/me",
    { preHandler: [fastify.authenticate], schema: UpdateTrainerSchema },
    async (request, reply) => {
      const userId = request.user.id;
      const { username, level, team, trainerCode, isProfilePublic, avatarUrl } = request.body;

      const [updated] = await fastify.db
        .insert(trainers)
        .values({
          id: userId,
          userId,
          username: username || `trainer_${userId.slice(0, 4)}`,
          ...(level !== undefined && { level }),
          ...(team !== undefined && { team }),
          ...(trainerCode !== undefined && { trainerCode: normalizeTrainerCode(trainerCode) }),
          ...(isProfilePublic !== undefined && { isProfilePublic }),
          ...(avatarUrl !== undefined && { avatarUrl }),
        })
        .onConflictDoUpdate({
          target: trainers.userId,
          set: {
            ...(username !== undefined && { username }),
            ...(level !== undefined && { level }),
            ...(team !== undefined && { team }),
            ...(trainerCode !== undefined && { trainerCode: normalizeTrainerCode(trainerCode) }),
            ...(isProfilePublic !== undefined && { isProfilePublic }),
            ...(avatarUrl !== undefined && { avatarUrl }),
          },
        })
        .returning({ id: trainers.id });

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
