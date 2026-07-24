import type { FastifyTypebox } from "../../types/fastify.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  UpdateTrainerSchema,
  DeactivateTrainerSchema,
  DeleteTrainerSchema,
  GetMeSchema,
  GetMeQueriesSchema,
  GetMeFavoritesSchema,
  GetMeFavoriteIdsSchema,
  GetMeForksSchema,
  GetTrainerSchema,
  GetTrainerByUsernameSchema,
  TrackTrainerViewSchema,
  GetTrainerStringsSchema,
  GetTrainerForksSchema,
  GetTrainerFavoritesSchema,
  FollowTrainerSchema,
  UnfollowTrainerSchema,
  GetTrainerFollowersSchema,
  GetMeFollowersSchema,
  GetMeFollowingSchema,
} from "./users.schema.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";
import { trainers, searchQueries, favorites, followers } from "../../db/schema.js";
import { alias } from "drizzle-orm/pg-core";
import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { emitNotification } from "../notifications/notifications.service.js";
import { findBlockedTerm } from "../../lib/content-policy.js";
import {
  ensureTrainerProfileExists,
  getBootstrapTrainerUsername,
} from "../../lib/trainer-bootstrap.js";

const socialMutationRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "1 minute",
    },
  },
} as const;

export async function userRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();
  const parentQueries = alias(searchQueries, "parent_queries");
  const sourceCreators = alias(trainers, "source_creators");

  type VisibleUsername = "pokequery" | "pogo";

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

  const resolveDisplayName = (row: {
    username: string;
    pogoUsername: string | null;
    visibleUsername: string | null;
  }) => {
    if (row.visibleUsername === "pogo" && row.pogoUsername?.trim()) {
      return row.pogoUsername.trim();
    }

    return row.username;
  };

  const normalizeAuthEmail = (value: string | null | undefined) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
  };

  async function loadMeProfile(userId: string, email: string | null) {
    const [row] = await fastify.db
      .select({
        id: trainers.id,
        username: trainers.username,
        role: trainers.role,
        pogoUsername: trainers.pogoUsername,
        visibleUsername: trainers.visibleUsername,
        team: trainers.team,
        level: trainers.level,
        trainerCode: trainers.trainerCode,
        isProfilePublic: trainers.isProfilePublic,
        deactivatedAt: trainers.deactivatedAt,
        avatarUrl: trainers.avatarUrl,
        queryCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM pokequery.search_queries sq
          WHERE sq.creator_id = ${trainers.id}
        )`.as("queryCount"),
        favoriteCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM pokequery.favorites f
          WHERE f.trainer_id = ${trainers.id}
        )`.as("favoriteCount"),
        followerCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM pokequery.followers fr
          WHERE fr.followed_id = ${trainers.id}
        )`.as("followerCount"),
        forkCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM pokequery.search_queries sq
          WHERE sq.creator_id = ${trainers.id}
            AND sq.parent_query_id IS NOT NULL
        )`.as("forkCount"),
      })
      .from(trainers)
      .where(eq(trainers.userId, userId));

    if (!row) {
      await ensureTrainerProfileExists(fastify, { id: userId });

      const bootstrapUsername = getBootstrapTrainerUsername(userId);

      return {
        hasTrainer: true,
        profileCompleted: false,
        id: userId,
        email,
        username: bootstrapUsername,
        displayName: bootstrapUsername,
        role: "member" as const,
        pogoUsername: null,
        visibleUsername: "pokequery" as const,
        team: null,
        level: null,
        trainerCode: null,
        isProfilePublic: false,
        deactivatedAt: null,
        avatarUrl: null,
        queryCount: 0,
        favoriteCount: 0,
        followerCount: 0,
        forkCount: 0,
      };
    }

    const profileCompleted = isProfileCompleted({
      hasTrainer: true,
      username: row.username,
      team: row.team,
      level: row.level,
      trainerCode: row.trainerCode,
    });

    return {
      hasTrainer: true,
      profileCompleted,
      email,
      ...row,
      displayName: resolveDisplayName(row),
      role: row.role === "admin" ? ("admin" as const) : ("member" as const),
      team: row.team as "mystic" | "valor" | "instinct" | null,
      trainerCode: row.trainerCode,
      visibleUsername: row.visibleUsername as VisibleUsername,
      isProfilePublic: row.isProfilePublic,
      deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
    };
  }

  const isProfileCompleted = (profile: {
    hasTrainer: boolean;
    username: string;
    team: string | null;
    level: number | null;
    trainerCode: string | null;
  }) => {
    return (
      profile.hasTrainer &&
      profile.username.trim().length >= 3 &&
      profile.team !== null &&
      profile.level !== null &&
      profile.trainerCode !== null
    );
  };

  const selectFollowers = (trainerId: string) =>
    fastify.db
      .select({
        id: trainers.id,
        username: trainers.username,
        pogoUsername: trainers.pogoUsername,
        visibleUsername: trainers.visibleUsername,
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

  const selectFollowing = (trainerId: string) =>
    fastify.db
      .select({
        id: trainers.id,
        username: trainers.username,
        pogoUsername: trainers.pogoUsername,
        visibleUsername: trainers.visibleUsername,
        team: trainers.team,
        level: trainers.level,
        trainerCode: trainers.trainerCode,
        isProfilePublic: trainers.isProfilePublic,
        avatarUrl: trainers.avatarUrl,
        followedAt: followers.createdAt,
      })
      .from(followers)
      .innerJoin(trainers, eq(trainers.id, followers.followedId))
      .where(eq(followers.followerId, trainerId))
      .orderBy(desc(followers.createdAt));

  const publicQuerySelect = {
    id: searchQueries.id,
    title: searchQueries.title,
    query: searchQueries.query,
    description: searchQueries.description,
    copyCount: searchQueries.copyCount,
    favoriteCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.favorites f WHERE f.query_id = ${searchQueries.id}), 0)`,
    forkCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.search_queries forked WHERE forked.parent_query_id = ${searchQueries.id}), 0)`,
    referenceUrl: sql<string | null>`NULLIF(${searchQueries.metadata}->>'referenceUrl', '')`,
    userTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'userTags', '[]'::jsonb)`,
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
    referenceUrl: string | null;
    userTags: string[];
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
    viewCount: number;
    favoriteCount: number;
    forkCount: number;
    referenceUrl: string | null;
    userTags: string[];
    autoTags: string[];
    createdAt: Date;
    updatedAt: Date;
  }) => ({
    ...q,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  });

  const serializeMeFavoriteQuery = (q: {
    id: string;
    title: string;
    query: string;
    description: string | null;
    isPublic: boolean;
    copyCount: number;
    viewCount: number;
    favoriteCount: number;
    forkCount: number;
    referenceUrl: string | null;
    userTags: string[];
    autoTags: string[];
    createdAt: Date;
    updatedAt: Date;
    favoritedAt: Date;
    creatorId: string | null;
    creatorUsername: string | null;
    creatorPogoUsername: string | null;
    creatorVisibleUsername: string | null;
    creatorAvatarUrl: string | null;
  }) => ({
    id: q.id,
    title: q.title,
    query: q.query,
    description: q.description,
    isPublic: q.isPublic,
    copyCount: q.copyCount,
    viewCount: q.viewCount,
    favoriteCount: q.favoriteCount,
    forkCount: q.forkCount,
    referenceUrl: q.referenceUrl,
    userTags: q.userTags,
    autoTags: q.autoTags,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    favoritedAt: q.favoritedAt.toISOString(),
    creator:
      q.creatorId && q.creatorUsername
        ? {
            id: q.creatorId,
            username: q.creatorUsername,
            displayName: resolveDisplayName({
              username: q.creatorUsername,
              pogoUsername: q.creatorPogoUsername,
              visibleUsername: q.creatorVisibleUsername,
            }),
            avatarUrl: q.creatorAvatarUrl,
          }
        : null,
  });

  const serializeManagedForkQuery = (q: {
    id: string;
    title: string;
    query: string;
    description: string | null;
    isPublic: boolean;
    copyCount: number;
    viewCount: number;
    favoriteCount: number;
    forkCount: number;
    referenceUrl: string | null;
    userTags: string[];
    autoTags: string[];
    createdAt: Date;
    updatedAt: Date;
    parentQueryId: string | null;
    originalQuerySnapshot: string | null;
    syncStatus: "up-to-date" | "behind" | "orphaned";
    sourceId: string | null;
    sourceTitle: string | null;
    sourceQuery: string | null;
    sourceIsPublic: boolean | null;
    sourceUpdatedAt: Date | null;
    sourceCreatorId: string | null;
    sourceCreatorUsername: string | null;
    sourceCreatorPogoUsername: string | null;
    sourceCreatorVisibleUsername: string | null;
    sourceCreatorAvatarUrl: string | null;
    sourceCreatorTeam: string | null;
    sourceCreatorLevel: number | null;
  }) => ({
    id: q.id,
    title: q.title,
    query: q.query,
    description: q.description,
    isPublic: q.isPublic,
    copyCount: q.copyCount,
    viewCount: q.viewCount,
    favoriteCount: q.favoriteCount,
    forkCount: q.forkCount,
    referenceUrl: q.referenceUrl,
    userTags: q.userTags,
    autoTags: q.autoTags,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    parentQueryId: q.parentQueryId,
    originalQuerySnapshot: q.originalQuerySnapshot,
    syncStatus: q.syncStatus,
    sourceQuery:
      q.sourceId && q.sourceTitle && q.sourceQuery && q.sourceUpdatedAt
        ? {
            id: q.sourceId,
            title: q.sourceTitle,
            query: q.sourceQuery,
            isPublic: Boolean(q.sourceIsPublic),
            updatedAt: q.sourceUpdatedAt.toISOString(),
            creator:
              q.sourceCreatorId && q.sourceCreatorUsername
                ? {
                    id: q.sourceCreatorId,
                    username: q.sourceCreatorUsername,
                    displayName: resolveDisplayName({
                      username: q.sourceCreatorUsername,
                      pogoUsername: q.sourceCreatorPogoUsername,
                      visibleUsername: q.sourceCreatorVisibleUsername,
                    }),
                    avatarUrl: q.sourceCreatorAvatarUrl,
                    team: q.sourceCreatorTeam as "mystic" | "valor" | "instinct" | null,
                    level: q.sourceCreatorLevel,
                  }
                : null,
          }
        : null,
  });

  // ── /me ──────────────────────────────────────────────────────────────────

  server.get(
    "/me",
    { preHandler: [fastify.authenticate], schema: GetMeSchema },
    async (request, reply) => {
      const userId = request.user.id;
      const email = normalizeAuthEmail(request.user.email);

      return reply.code(200).send(await loadMeProfile(userId, email));
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
        // First-login users can be authenticated before they complete trainer profile setup.
        return reply.send({ queries: [] });
      }

      const rows = await fastify.db
        .select({
          id: searchQueries.id,
          title: searchQueries.title,
          query: searchQueries.query,
          description: searchQueries.description,
          isPublic: searchQueries.isPublic,
          copyCount: searchQueries.copyCount,
          viewCount: searchQueries.viewCount,
          favoriteCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.favorites f WHERE f.query_id = ${searchQueries.id}), 0)`,
          forkCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.search_queries forked WHERE forked.parent_query_id = ${searchQueries.id}), 0)`,
          referenceUrl: sql<string | null>`NULLIF(${searchQueries.metadata}->>'referenceUrl', '')`,
          userTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'userTags', '[]'::jsonb)`,
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
    "/me/favorites",
    { preHandler: [fastify.authenticate], schema: GetMeFavoritesSchema },
    async (request, reply) => {
      const userId = request.user.id;
      const limit = Math.min(50, Math.max(1, request.query.limit ?? 20));
      const offset = Math.max(0, request.query.offset ?? 0);

      const [trainer] = await fastify.db
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.userId, userId));

      if (!trainer) {
        return reply.send({
          favorites: [],
          pagination: {
            limit,
            offset,
            nextOffset: null,
            hasMore: false,
            total: 0,
          },
        });
      }

      const visibilityWhere = and(
        eq(favorites.trainerId, trainer.id),
        or(eq(searchQueries.isPublic, true), eq(searchQueries.creatorId, trainer.id)),
      );

      const rows = await fastify.db
        .select({
          id: searchQueries.id,
          title: searchQueries.title,
          query: searchQueries.query,
          description: searchQueries.description,
          isPublic: searchQueries.isPublic,
          copyCount: searchQueries.copyCount,
          viewCount: searchQueries.viewCount,
          favoriteCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.favorites f WHERE f.query_id = ${searchQueries.id}), 0)`,
          forkCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.search_queries forked WHERE forked.parent_query_id = ${searchQueries.id}), 0)`,
          referenceUrl: sql<string | null>`NULLIF(${searchQueries.metadata}->>'referenceUrl', '')`,
          userTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'userTags', '[]'::jsonb)`,
          autoTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'autoTags', '[]'::jsonb)`,
          createdAt: searchQueries.createdAt,
          updatedAt: searchQueries.updatedAt,
          favoritedAt: favorites.createdAt,
          creatorId: trainers.id,
          creatorUsername: trainers.username,
          creatorPogoUsername: trainers.pogoUsername,
          creatorVisibleUsername: trainers.visibleUsername,
          creatorAvatarUrl: trainers.avatarUrl,
        })
        .from(favorites)
        .innerJoin(searchQueries, eq(searchQueries.id, favorites.queryId))
        .leftJoin(trainers, eq(searchQueries.creatorId, trainers.id))
        .where(visibilityWhere)
        .orderBy(desc(favorites.createdAt))
        .limit(limit)
        .offset(offset);

      const [totals] = await fastify.db
        .select({ total: count() })
        .from(favorites)
        .innerJoin(searchQueries, eq(searchQueries.id, favorites.queryId))
        .where(visibilityWhere);

      const total = totals?.total ?? 0;
      const nextOffset = offset + rows.length < total ? offset + rows.length : null;

      return reply.send({
        favorites: rows.map(serializeMeFavoriteQuery),
        pagination: {
          limit,
          offset,
          nextOffset,
          hasMore: nextOffset !== null,
          total,
        },
      });
    },
  );

  server.get(
    "/me/favorites/ids",
    { preHandler: [fastify.authenticate], schema: GetMeFavoriteIdsSchema },
    async (request, reply) => {
      const userId = request.user.id;

      const [trainer] = await fastify.db
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.userId, userId));

      if (!trainer) {
        return reply.send({
          favoriteQueryIds: [],
          favoritesCount: 0,
        });
      }

      const rows = await fastify.db
        .select({ queryId: favorites.queryId })
        .from(favorites)
        .innerJoin(searchQueries, eq(searchQueries.id, favorites.queryId))
        .where(
          and(
            eq(favorites.trainerId, trainer.id),
            or(eq(searchQueries.isPublic, true), eq(searchQueries.creatorId, trainer.id)),
          ),
        );

      return reply.send({
        favoriteQueryIds: rows.map((row) => row.queryId),
        favoritesCount: rows.length,
      });
    },
  );

  server.get(
    "/me/forks",
    { preHandler: [fastify.authenticate], schema: GetMeForksSchema },
    async (request, reply) => {
      const userId = request.user.id;

      const [trainer] = await fastify.db
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.userId, userId));

      if (!trainer) {
        return reply.send({ forks: [] });
      }

      const rows = await fastify.db
        .select({
          id: searchQueries.id,
          title: searchQueries.title,
          query: searchQueries.query,
          description: searchQueries.description,
          isPublic: searchQueries.isPublic,
          copyCount: searchQueries.copyCount,
          viewCount: searchQueries.viewCount,
          favoriteCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.favorites f WHERE f.query_id = ${searchQueries.id}), 0)`,
          forkCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM pokequery.search_queries forked WHERE forked.parent_query_id = ${searchQueries.id}), 0)`,
          referenceUrl: sql<string | null>`NULLIF(${searchQueries.metadata}->>'referenceUrl', '')`,
          userTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'userTags', '[]'::jsonb)`,
          autoTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'autoTags', '[]'::jsonb)`,
          createdAt: searchQueries.createdAt,
          updatedAt: searchQueries.updatedAt,
          parentQueryId: searchQueries.parentQueryId,
          originalQuerySnapshot: searchQueries.originalQuerySnapshot,
          syncStatus: sql<"up-to-date" | "behind" | "orphaned">`
            CASE
              WHEN ${searchQueries.parentQueryId} IS NULL THEN 'orphaned'
              WHEN ${parentQueries.id} IS NULL THEN 'orphaned'
              WHEN COALESCE(${parentQueries.query}, '') IS DISTINCT FROM COALESCE(${searchQueries.originalQuerySnapshot}, '') THEN 'behind'
              ELSE 'up-to-date'
            END
          `,
          sourceId: parentQueries.id,
          sourceTitle: parentQueries.title,
          sourceQuery: parentQueries.query,
          sourceIsPublic: parentQueries.isPublic,
          sourceUpdatedAt: parentQueries.updatedAt,
          sourceCreatorId: sourceCreators.id,
          sourceCreatorUsername: sourceCreators.username,
          sourceCreatorPogoUsername: sourceCreators.pogoUsername,
          sourceCreatorVisibleUsername: sourceCreators.visibleUsername,
          sourceCreatorAvatarUrl: sourceCreators.avatarUrl,
          sourceCreatorTeam: sourceCreators.team,
          sourceCreatorLevel: sourceCreators.level,
        })
        .from(searchQueries)
        .leftJoin(parentQueries, eq(parentQueries.id, searchQueries.parentQueryId))
        .leftJoin(sourceCreators, eq(sourceCreators.id, parentQueries.creatorId))
        .where(
          and(
            eq(searchQueries.creatorId, trainer.id),
            sql`${searchQueries.parentQueryId} IS NOT NULL`,
          ),
        )
        .orderBy(desc(searchQueries.updatedAt))
        .limit(100);

      return reply.send({ forks: rows.map(serializeManagedForkQuery) });
    },
  );

  server.get(
    "/me/followers",
    { preHandler: [fastify.authenticate], schema: GetMeFollowersSchema },
    async (request) => {
      const userId = request.user.id;

      const [trainer] = await fastify.db
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.userId, userId));

      if (!trainer) {
        return {
          total: 0,
          followers: [],
        };
      }

      const rows = await selectFollowers(trainer.id);

      return {
        total: rows.length,
        followers: rows.map((row) => {
          const publicProfile = toPublicTrainerProfile(row);

          return {
            id: row.id,
            username: row.username,
            displayName: resolveDisplayName(row),
            team: publicProfile.team,
            level: publicProfile.level,
            trainerCode: publicProfile.trainerCode,
            avatarUrl: row.avatarUrl,
            followedAt: row.followedAt.toISOString(),
          };
        }),
      };
    },
  );

  server.get(
    "/me/following",
    { preHandler: [fastify.authenticate], schema: GetMeFollowingSchema },
    async (request) => {
      const userId = request.user.id;

      const [trainer] = await fastify.db
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.userId, userId));

      if (!trainer) {
        return {
          total: 0,
          following: [],
        };
      }

      const rows = await selectFollowing(trainer.id);

      return {
        total: rows.length,
        following: rows.map((row) => {
          const publicProfile = toPublicTrainerProfile(row);

          return {
            id: row.id,
            username: row.username,
            displayName: resolveDisplayName(row),
            team: publicProfile.team,
            level: publicProfile.level,
            trainerCode: publicProfile.trainerCode,
            avatarUrl: row.avatarUrl,
            followedAt: row.followedAt.toISOString(),
          };
        }),
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
          pogoUsername: trainers.pogoUsername,
          visibleUsername: trainers.visibleUsername,
          team: trainers.team,
          level: trainers.level,
          trainerCode: trainers.trainerCode,
          avatarUrl: trainers.avatarUrl,
          profileViewCount: trainers.profileViewCount,
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
        displayName: resolveDisplayName(trainer),
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
        profileViewCount: trainer.profileViewCount,
        favoriteCount: counts?.favoriteCount ?? 0,
        forkCount: counts?.forkCount ?? 0,
        followerCount: followerRow[0]?.count ?? 0,
      });
    },
  );

  server.post("/:id/views", { schema: TrackTrainerViewSchema }, async (request, reply) => {
    const { id } = request.params;

    const [updated] = await fastify.db
      .update(trainers)
      .set({
        profileViewCount: sql`${trainers.profileViewCount} + 1`,
      })
      .where(
        and(
          eq(trainers.id, id),
          eq(trainers.isProfilePublic, true),
          isNull(trainers.deactivatedAt),
        ),
      )
      .returning({ viewCount: trainers.profileViewCount });

    if (!updated) {
      return reply.code(404).send({ error: "Trainer not found" });
    }

    return reply.send({ viewCount: updated.viewCount });
  });

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
        pogoUsername: trainers.pogoUsername,
        visibleUsername: trainers.visibleUsername,
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
        trainers.pogoUsername,
        trainers.visibleUsername,
        trainers.team,
        trainers.level,
        trainers.trainerCode,
        trainers.isProfilePublic,
        trainers.avatarUrl,
      );

    if (!row) return reply.code(404).send({ error: "Trainer not found" });

    const publicProfile = toPublicTrainerProfile(row);

    return {
      id: row.id,
      username: row.username,
      displayName: resolveDisplayName(row),
      avatarUrl: row.avatarUrl,
      queryCount: row.queryCount,
      forkCount: row.forkCount,
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
      followers: rows.map((row) => {
        const publicProfile = toPublicTrainerProfile(row);

        return {
          id: row.id,
          username: row.username,
          displayName: resolveDisplayName(row),
          team: publicProfile.team,
          level: publicProfile.level,
          trainerCode: publicProfile.trainerCode,
          avatarUrl: row.avatarUrl,
          followedAt: row.followedAt.toISOString(),
        };
      }),
    };
  });

  server.post(
    "/:id/follow",
    { preHandler: [fastify.authenticate], schema: FollowTrainerSchema, ...socialMutationRateLimit },
    async (request, reply) => {
      const targetTrainerId = request.params.id;
      const currentTrainerId = request.user.id;

      await ensureTrainerProfileExists(fastify, request.user);

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

      const [existingFollow] = await fastify.db
        .select({ followedId: followers.followedId })
        .from(followers)
        .where(
          and(
            eq(followers.followerId, currentTrainerId),
            eq(followers.followedId, targetTrainerId),
          ),
        )
        .limit(1);

      if (existingFollow) {
        return reply.code(204).send(null);
      }

      await fastify.db
        .insert(followers)
        .values({
          followerId: currentTrainerId,
          followedId: targetTrainerId,
        })
        .onConflictDoNothing();

      try {
        const [actor] = await fastify.db
          .select({
            username: trainers.username,
            pogoUsername: trainers.pogoUsername,
            visibleUsername: trainers.visibleUsername,
          })
          .from(trainers)
          .where(eq(trainers.id, currentTrainerId))
          .limit(1);

        await emitNotification(fastify, {
          recipientTrainerId: targetTrainerId,
          actorTrainerId: currentTrainerId,
          eventType: "new_follower",
          entityType: "trainer",
          entityId: currentTrainerId,
          title: "You have a new follower",
          message: `${
            actor
              ? resolveDisplayName({
                  username: actor.username,
                  pogoUsername: actor.pogoUsername,
                  visibleUsername: actor.visibleUsername,
                })
              : "A trainer"
          } started following you.`,
          isHighPriority: true,
        });
      } catch {
        // Best effort: failure to emit a notification should not fail the follow action.
      }

      return reply.code(204).send(null);
    },
  );

  server.post(
    "/:id/unfollow",
    {
      preHandler: [fastify.authenticate],
      schema: UnfollowTrainerSchema,
      ...socialMutationRateLimit,
    },
    async (request, reply) => {
      const targetTrainerId = request.params.id;
      const currentTrainerId = request.user.id;

      await ensureTrainerProfileExists(fastify, request.user);

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
      const {
        username,
        pogoUsername,
        visibleUsername,
        level,
        team,
        trainerCode,
        isProfilePublic,
        avatarUrl,
      } = request.body;

      const normalizedPogoUsername = pogoUsername !== undefined ? pogoUsername.trim() : undefined;

      if (username !== undefined && findBlockedTerm(username.trim())) {
        return reply.code(400).send({ error: "Username contains blocked language" });
      }

      if (normalizedPogoUsername && findBlockedTerm(normalizedPogoUsername)) {
        return reply.code(400).send({ error: "Pokemon GO username contains blocked language" });
      }

      const [existingTrainer] = await fastify.db
        .select({
          pogoUsername: trainers.pogoUsername,
          visibleUsername: trainers.visibleUsername,
        })
        .from(trainers)
        .where(eq(trainers.userId, userId))
        .limit(1);

      const effectiveVisibleUsername =
        visibleUsername ??
        (existingTrainer?.visibleUsername as VisibleUsername | undefined) ??
        "pokequery";
      const effectivePogoUsername = normalizedPogoUsername ?? existingTrainer?.pogoUsername ?? null;

      if (
        effectiveVisibleUsername === "pogo" &&
        (!effectivePogoUsername || effectivePogoUsername.trim().length === 0)
      ) {
        return reply.code(400).send({ error: "Add a Pokemon GO username before making it public" });
      }

      let updated;

      try {
        [updated] = await fastify.db
          .insert(trainers)
          .values({
            id: userId,
            userId,
            username: username || `trainer_${userId.slice(0, 4)}`,
            ...(normalizedPogoUsername !== undefined && {
              pogoUsername: normalizedPogoUsername,
            }),
            ...(visibleUsername !== undefined && { visibleUsername }),
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
              ...(normalizedPogoUsername !== undefined && {
                pogoUsername: normalizedPogoUsername,
              }),
              ...(visibleUsername !== undefined && { visibleUsername }),
              ...(level !== undefined && { level }),
              ...(team !== undefined && { team }),
              ...(trainerCode !== undefined && { trainerCode: normalizeTrainerCode(trainerCode) }),
              ...(isProfilePublic !== undefined && { isProfilePublic }),
              ...(avatarUrl !== undefined && { avatarUrl }),
            },
          })
          .returning({ id: trainers.id });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "23505"
        ) {
          return reply.code(409).send({ error: "Username is already taken" });
        }

        request.log.error({ error, userId }, "Failed to update trainer profile");
        return reply.code(500).send({ error: "Failed to update trainer" });
      }

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

      // Preserve public strings after deletion, but remove non-public content.
      await fastify.db
        .delete(searchQueries)
        .where(and(eq(searchQueries.creatorId, userId), eq(searchQueries.isPublic, false)));

      const { error: deleteAuthError } = await getSupabaseAdmin().auth.admin.deleteUser(userId);

      if (deleteAuthError) {
        request.log.error(
          { error: deleteAuthError, userId },
          "Failed to delete auth user during account deletion",
        );
        return reply.code(500).send({ error: "Failed to delete auth user" });
      }

      // creatorId on search_queries is set null on trainer delete, preserving public queries.
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
