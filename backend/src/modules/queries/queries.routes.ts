import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";
import { searchQueries, trainers } from "../../db/schema.js";
import { generateMetadata } from "../../utils/pogo-parser.js";
import {
  CopyQuerySchema,
  CreateQuerySchema,
  DeleteQuerySchema,
  FavoriteQuerySchema,
  ForkQuerySchema,
  GetQuerySchema,
  UnfavoriteQuerySchema,
  UpdateQuerySchema,
} from "./queries.schemas.js";
import { and, eq, or, sql } from "drizzle-orm";
import { favorites } from "../../db/schema.js";

export async function queriesRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get("/:id", { schema: GetQuerySchema }, async (request, reply) => {
    const { id } = request.params;

    const [row] = await fastify.db
      .select({
        id: searchQueries.id,
        title: searchQueries.title,
        query: searchQueries.query,
        description: searchQueries.description,
        isPublic: searchQueries.isPublic,
        copyCount: searchQueries.copyCount,
        favoriteCount: sql<number>`COALESCE((
            SELECT COUNT(*)::int FROM pokequery.favorites f WHERE f.query_id = ${searchQueries.id}
          ), 0)`,
        forkCount: sql<number>`COALESCE((
            SELECT COUNT(*)::int FROM pokequery.search_queries forked WHERE forked.parent_query_id = ${searchQueries.id}
          ), 0)`,
        autoTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'autoTags', '[]'::jsonb)`,
        createdAt: searchQueries.createdAt,
        updatedAt: searchQueries.updatedAt,
        creatorId: trainers.id,
        creatorUsername: trainers.username,
        creatorAvatarUrl: trainers.avatarUrl,
        creatorTeam: trainers.team,
        creatorLevel: trainers.level,
      })
      .from(searchQueries)
      .leftJoin(trainers, eq(searchQueries.creatorId, trainers.id))
      .where(and(eq(searchQueries.id, id), eq(searchQueries.isPublic, true)))
      .limit(1);

    if (!row) {
      return reply.code(404).send({ error: "Query not found" });
    }

    // Fetch forks of this query (public ones only, most recent first)
    const forkRows = await fastify.db
      .select({
        id: searchQueries.id,
        title: searchQueries.title,
        createdAt: searchQueries.createdAt,
        creatorId: trainers.id,
        creatorUsername: trainers.username,
        creatorAvatarUrl: trainers.avatarUrl,
        creatorTeam: trainers.team,
        creatorLevel: trainers.level,
      })
      .from(searchQueries)
      .leftJoin(trainers, eq(searchQueries.creatorId, trainers.id))
      .where(and(eq(searchQueries.parentQueryId, row.id), eq(searchQueries.isPublic, true)))
      .orderBy(searchQueries.createdAt)
      .limit(20);

    return reply.send({
      id: row.id,
      title: row.title,
      query: row.query,
      description: row.description,
      isPublic: row.isPublic,
      copyCount: row.copyCount,
      favoriteCount: row.favoriteCount,
      forkCount: row.forkCount,
      autoTags: row.autoTags,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      creator: row.creatorId
        ? {
            id: row.creatorId,
            username: row.creatorUsername!,
            avatarUrl: row.creatorAvatarUrl,
            team: row.creatorTeam,
            level: row.creatorLevel,
          }
        : null,
      forks: forkRows.map((fork) => ({
        id: fork.id,
        title: fork.title,
        createdAt: fork.createdAt.toISOString(),
        creator: fork.creatorId
          ? {
              id: fork.creatorId,
              username: fork.creatorUsername!,
              avatarUrl: fork.creatorAvatarUrl,
              team: fork.creatorTeam,
              level: fork.creatorLevel,
            }
          : null,
      })),
    });
  });

  server.post(
    "/",
    { preHandler: [fastify.authenticate], schema: CreateQuerySchema },
    async (request, reply) => {
      try {
        const { title, query, description, isPublic } = request.body;
        const userId = request.user.id;

        // Generate the "Extensible Brain" data
        const metadata = generateMetadata(query);

        const [newQuery] = await fastify.db
          .insert(searchQueries)
          .values({
            creatorId: userId,
            title,
            query,
            description,
            isPublic,
            metadata,
          })
          .returning();

        if (newQuery) {
          return reply.code(201).send({ id: newQuery.id });
        } else {
          return reply.code(400).send({ error: "Failed to create query" });
        }
      } catch (_error) {
        return reply.code(400).send({ error: "Failed to create query" });
      }
    },
  );

  server.post(
    "/:id/fork",
    { preHandler: [fastify.authenticate], schema: ForkQuerySchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user.id;

        // 1. Find the original
        const original = await fastify.db.query.searchQueries.findFirst({
          where: eq(searchQueries.id, id),
        });

        if (!original || !original.isPublic) {
          return reply.code(404).send({ error: "Original query not found or private" });
        }

        // 2. Create the Fork
        const [forked] = await fastify.db
          .insert(searchQueries)
          .values({
            creatorId: userId,
            title: `Fork of ${original.title}`,
            query: original.query,
            description: original.description,
            isPublic: false, // Forks are private by default
            parentQueryId: original.id,
            originalQuerySnapshot: original.query, // Lock in the version at time of fork
            metadata: original.metadata,
          })
          .returning();

        if (forked) {
          return reply.code(201).send({ id: forked.id });
        } else {
          return reply.code(400).send({ error: "Failed to fork query" });
        }
      } catch (_error) {
        return reply.code(400).send({ error: "Failed to fork query" });
      }
    },
  );

  server.patch(
    "/:id",
    { preHandler: [fastify.authenticate], schema: UpdateQuerySchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { title, query, description, isPublic } = request.body;
        const userId = request.user.id;

        const metadata = generateMetadata(query);

        const [updatedQuery] = await fastify.db
          .update(searchQueries)
          .set({
            title,
            query,
            description,
            isPublic,
            metadata,
          })
          .where(and(eq(searchQueries.id, id), eq(searchQueries.creatorId, userId)))
          .returning({ id: searchQueries.id });

        if (!updatedQuery) {
          return reply.code(404).send({ error: "Query not found or not owned by user" });
        }

        return reply.code(200).send({ id: updatedQuery.id });
      } catch (_error) {
        return reply.code(400).send({ error: "Failed to update query" });
      }
    },
  );

  server.patch("/:id/copy", { schema: CopyQuerySchema }, async (request, reply) => {
    try {
      const { id } = request.params;

      await fastify.db
        .update(searchQueries)
        .set({
          copyCount: sql`${searchQueries.copyCount} + 1`,
        })
        .where(eq(searchQueries.id, id));

      return reply.code(204).send(null);
    } catch (_error) {
      return reply.code(400).send({ error: "Failed to copy query" });
    }
  });

  server.post(
    "/:id/favorite",
    { preHandler: [fastify.authenticate], schema: FavoriteQuerySchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user.id;

        const query = await fastify.db.query.searchQueries.findFirst({
          where: and(
            eq(searchQueries.id, id),
            or(eq(searchQueries.isPublic, true), eq(searchQueries.creatorId, userId)),
          ),
        });

        if (!query) {
          return reply.code(404).send({ error: "Query not found" });
        }

        await fastify.db
          .insert(favorites)
          .values({ trainerId: userId, queryId: id })
          .onConflictDoNothing();

        return reply.code(204).send(null);
      } catch (_error) {
        return reply.code(400).send({ error: "Failed to favorite query" });
      }
    },
  );

  server.post(
    "/:id/unfavorite",
    { preHandler: [fastify.authenticate], schema: UnfavoriteQuerySchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user.id;

        await fastify.db
          .delete(favorites)
          .where(and(eq(favorites.queryId, id), eq(favorites.trainerId, userId)));

        return reply.code(204).send(null);
      } catch (_error) {
        return reply.code(400).send({ error: "Failed to unfavorite query" });
      }
    },
  );

  server.delete(
    "/:id",
    { preHandler: [fastify.authenticate], schema: DeleteQuerySchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user.id;

        const [deletedQuery] = await fastify.db
          .delete(searchQueries)
          .where(and(eq(searchQueries.id, id), eq(searchQueries.creatorId, userId)))
          .returning({ id: searchQueries.id });

        if (!deletedQuery) {
          return reply.code(404).send({ error: "Query not found or not owned by user" });
        }

        return reply.code(204).send(null);
      } catch (_error) {
        return reply.code(400).send({ error: "Failed to delete query" });
      }
    },
  );
}
