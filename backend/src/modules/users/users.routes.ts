import type { FastifyTypebox } from "../../types/fastify.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  UpdateTrainerSchema,
  DeactivateTrainerSchema,
  DeleteTrainerSchema,
  GetMeSchema,
  GetMeQueriesSchema,
  GetTrainerSchema,
  GetTrainerByUsernameSchema,
  GetTrainerStringsSchema,
  GetTrainerForksSchema,
  GetTrainerFavoritesSchema,
  FollowTrainerSchema,
  UnfollowTrainerSchema,
  GetTrainerFollowersSchema,
  GetMeFollowersSchema,
} from "./users.schema.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";
import { trainers, searchQueries, favorites, followers } from "../../db/schema.js";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

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

  const publicQuerySelect = {
    id: searchQueries.id,
    title: searchQueries.title,
    query: searchQueries.query,
    description: searchQueries.description,
    copyCount: searchQueries.copyCount,
    favoriteCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.favorites f WHERE f.query_id = ${searchQueries.id}), 0)`,
    forkCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.search_queries forked WHERE forked.parent_query_id = ${searchQueries.id}), 0)`,
    autoTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'autoTags', '[]'::jsonb)`,
    createdAt: searchQueries.createdAt,
  } as const;

  const serializeQuery = (q: {
    id: string;
    title: string;
    query: string;
    description: string | null;
    copyCount: number;
    favoriteCount: number;
    forkCount: number;
    autoTags: string[];
    createdAt: Date;
  }) => ({ ...q, createdAt: q.createdAt.toISOString() });

  const serializeManagedQuery = (q: {
    id: string;
    title: string;
    query: string;
    description: string | null;
    isPublic: boolean;
    copyCount: number;
    favoriteCount: number;
    forkCount: number;
    autoTags: string[];
    createdAt: Date;
    updatedAt: Date;
  }) => ({
    ...q,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  });

  // ── /me ──────────────────────────────────────────────────────────────────

  server.get(
    "/me",
    { preHandler: [fastify.authenticate], schema: GetMeSchema },
    async (request, reply) => {
      const userId = request.user.id;
      const email = request.user.email ?? null;

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

      if (!row) {
        return reply.code(200).send({
          hasTrainer: false,
          id: userId,
          email,
          username: request.user.email?.split("@")[0] ?? `trainer_${userId.slice(0, 4)}`,
          team: null,
          level: null,
          trainerCode: null,
          isProfilePublic: false,
          avatarUrl: null,
          queryCount: 0,
          favoriteCount: 0,
          followerCount: 0,
          forkCount: 0,
        });
      }

      return {
        hasTrainer: true,
        email,
        ...row,
        team: row.team as "mystic" | "valor" | "instinct" | null,
        trainerCode: row.trainerCode,
        isProfilePublic: row.isProfilePublic,
      };
    },
  );

  server.get(
    "/me/queries",
    { preHandler: [fastify.authenticate], schema: GetMeQueriesSchema },
    async (request, reply) => {
      const userId = request.user.id;

      const [trainer] = await fastify.db
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.userId, userId));

      if (!trainer) {
        return reply.code(404).send({ error: "Trainer not found" });
      }

      const rows = await fastify.db
        .select({
          id: searchQueries.id,
          title: searchQueries.title,
          query: searchQueries.query,
          description: searchQueries.description,
          isPublic: searchQueries.isPublic,
          copyCount: searchQueries.copyCount,
          favoriteCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.favorites f WHERE f.query_id = ${searchQueries.id}), 0)`,
          forkCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.search_queries forked WHERE forked.parent_query_id = ${searchQueries.id}), 0)`,
          autoTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'autoTags', '[]'::jsonb)`,
          createdAt: searchQueries.createdAt,
          updatedAt: searchQueries.updatedAt,
        })
        .from(searchQueries)
        .where(eq(searchQueries.creatorId, trainer.id))
        .orderBy(desc(searchQueries.updatedAt))
        .limit(100);

      return reply.send({ queries: rows.map(serializeManagedQuery) });
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

  // ── /by-username/:username ────────────────────────────────────────────────

  server.get(
    "/by-username/:username",
    { schema: GetTrainerByUsernameSchema },
    async (request, reply) => {
      const { username } = request.params;

      const [trainer] = await fastify.db
        .select({
          id: trainers.id,
          username: trainers.username,
          team: trainers.team,
          level: trainers.level,
          trainerCode: trainers.trainerCode,
          avatarUrl: trainers.avatarUrl,
          isProfilePublic: trainers.isProfilePublic,
          deactivatedAt: trainers.deactivatedAt,
          createdAt: trainers.createdAt,
        })
        .from(trainers)
        .where(eq(trainers.username, username))
        .limit(1);

      if (!trainer) return reply.code(404).send({ error: "Trainer not found" });

      const [[counts], followerRow] = await Promise.all([
        fastify.db
          .select({
            stringCount: sql<number>`(
              SELECT COUNT(*)::int
              FROM pokequery.search_queries sq
              WHERE sq.creator_id = ${trainer.id}
                AND sq.is_public = true
                AND sq.parent_query_id IS NULL
            )`,
            forkCount: sql<number>`(
              SELECT COUNT(*)::int
              FROM pokequery.search_queries sq
              WHERE sq.creator_id = ${trainer.id}
                AND sq.is_public = true
                AND sq.parent_query_id IS NOT NULL
            )`,
            favoriteCount: sql<number>`(
              SELECT COUNT(*)::int
              FROM pokequery.favorites f
              WHERE f.trainer_id = ${trainer.id}
            )`,
          })
          .from(trainers)
          .where(eq(trainers.id, trainer.id))
          .limit(1),
        fastify.db
          .select({ count: sql<number>`count(*)::int` })
          .from(followers)
          .where(eq(followers.followedId, trainer.id)),
      ]);

      return reply.send({
        id: trainer.id,
        username: trainer.username,
        team: trainer.isProfilePublic
          ? (trainer.team as "mystic" | "valor" | "instinct" | null)
          : null,
        level: trainer.isProfilePublic ? trainer.level : null,
        trainerCode: trainer.isProfilePublic ? trainer.trainerCode : null,
        avatarUrl: trainer.avatarUrl,
        isProfilePublic: trainer.isProfilePublic,
        deactivatedAt: trainer.deactivatedAt?.toISOString() ?? null,
        createdAt: trainer.createdAt.toISOString(),
        stringCount: counts?.stringCount ?? 0,
        favoriteCount: counts?.favoriteCount ?? 0,
        forkCount: counts?.forkCount ?? 0,
        followerCount: followerRow[0]?.count ?? 0,
      });
    },
  );

  // ── /:id/strings · /:id/forks · /:id/favorites ───────────────────────────

  server.get("/:id/strings", { schema: GetTrainerStringsSchema }, async (request, reply) => {
    const { id } = request.params;
    const [trainer] = await fastify.db
      .select({ id: trainers.id })
      .from(trainers)
      .where(eq(trainers.id, id))
      .limit(1);
    if (!trainer) return reply.code(404).send({ error: "Trainer not found" });

    const rows = await fastify.db
      .select(publicQuerySelect)
      .from(searchQueries)
      .where(
        and(
          eq(searchQueries.creatorId, id),
          eq(searchQueries.isPublic, true),
          isNull(searchQueries.parentQueryId),
        ),
      )
      .orderBy(desc(searchQueries.createdAt))
      .limit(20);

    return reply.send({ strings: rows.map(serializeQuery) });
  });

  server.get("/:id/forks", { schema: GetTrainerForksSchema }, async (request, reply) => {
    const { id } = request.params;
    const [trainer] = await fastify.db
      .select({ id: trainers.id })
      .from(trainers)
      .where(eq(trainers.id, id))
      .limit(1);
    if (!trainer) return reply.code(404).send({ error: "Trainer not found" });

    const rows = await fastify.db
      .select(publicQuerySelect)
      .from(searchQueries)
      .where(
        and(
          eq(searchQueries.creatorId, id),
          eq(searchQueries.isPublic, true),
          sql`${searchQueries.parentQueryId} IS NOT NULL`,
        ),
      )
      .orderBy(desc(searchQueries.createdAt))
      .limit(20);

    return reply.send({ forks: rows.map(serializeQuery) });
  });

  server.get("/:id/favorites", { schema: GetTrainerFavoritesSchema }, async (request, reply) => {
    const { id } = request.params;
    const [trainer] = await fastify.db
      .select({ id: trainers.id })
      .from(trainers)
      .where(eq(trainers.id, id))
      .limit(1);
    if (!trainer) return reply.code(404).send({ error: "Trainer not found" });

    const rows = await fastify.db
      .select(publicQuerySelect)
      .from(favorites)
      .innerJoin(
        searchQueries,
        and(eq(searchQueries.id, favorites.queryId), eq(searchQueries.isPublic, true)),
      )
      .where(eq(favorites.trainerId, id))
      .orderBy(desc(favorites.createdAt))
      .limit(20);

    return reply.send({ favorites: rows.map(serializeQuery) });
  });

  // ── /:id ─────────────────────────────────────────────────────────────────

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
        .select({ id: trainers.id, isProfilePublic: trainers.isProfilePublic })
        .from(trainers)
        .where(eq(trainers.id, targetTrainerId));

      if (!targetTrainer) {
        return reply.code(404).send({ error: "Trainer not found" });
      }

      if (!targetTrainer.isProfilePublic) {
        return reply.code(403).send({ error: "You cannot follow a private account" });
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

      if (!updated) {
        return reply.code(500).send({ error: "Failed to update trainer" });
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

      const { error: deleteAuthError } = await getSupabaseAdmin().auth.admin.deleteUser(userId);

      if (deleteAuthError) {
        request.log.error(
          { error: deleteAuthError, userId },
          "Failed to delete auth user during account deletion",
        );
        return reply.code(500).send({ error: "Failed to delete auth user" });
      }

      // creatorId on search_queries is set null on delete, so queries are preserved
      const [deleted] = await fastify.db
        .delete(trainers)
        .where(eq(trainers.userId, userId))
        .returning({ id: trainers.id });

      if (!deleted) {
        request.log.warn(
          { userId },
          "Trainer row not found during account deletion; auth user was removed",
        );
      } else {
        request.log.info({ userId, trainerId: deleted.id }, "User account deleted");
      }

      reply.clearCookie("sb-access-token", { path: "/" });
      reply.clearCookie("sb-refresh-token", { path: "/" });

      return reply.code(204).send(null);
    },
  );
}
