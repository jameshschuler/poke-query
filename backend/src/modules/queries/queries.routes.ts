import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";
import { searchQueries, trainers, tags, queriesToTags } from "../../db/schema.js";
import { generateMetadata } from "../../utils/pogo-parser.js";
import {
  CopyQuerySchema,
  CreateQuerySchema,
  DeleteQuerySchema,
  FavoriteQuerySchema,
  ForkQuerySchema,
  GetQuerySchema,
  SyncForkQuerySchema,
  GetTagsSchema,
  TrackQueryViewSchema,
  UnfavoriteQuerySchema,
  SyncOfficialQueriesSchema,
  UpdateQuerySchema,
} from "./queries.schemas.js";
import { and, eq, or, sql } from "drizzle-orm";
import { favorites } from "../../db/schema.js";
import {
  emitNotification,
  resolveDisplayNameForTrainer,
} from "../notifications/notifications.service.js";
import { findBlockedTerm } from "../../lib/content-policy.js";

const queryMutationRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "1 minute",
    },
  },
} as const;

const copyMutationRateLimit = {
  config: {
    rateLimit: {
      max: 30,
      timeWindow: "1 minute",
    },
  },
} as const;

function hasRowsArray(value: unknown): value is { rows: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "rows" in value &&
    Array.isArray((value as { rows?: unknown }).rows)
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeReferenceUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  return hasScheme ? trimmed : `https://${trimmed}`;
}

function isValidReferenceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveDisplayName(row: {
  username: string;
  pogoUsername: string | null;
  visibleUsername: string | null;
}): string {
  if (row.visibleUsername === "pogo" && row.pogoUsername?.trim()) {
    return row.pogoUsername.trim();
  }

  return row.username;
}

function resolveMetadataSource(value: unknown): "official" | "community" {
  return value === "official" ? "official" : "community";
}

function getOfficialQueryEditorUserIds(): Set<string> {
  const configured =
    process.env.OFFICIAL_QUERY_EDITOR_USER_IDS ??
    process.env.MODERATION_REVIEWER_USER_IDS ??
    process.env.MODERATOR_USER_IDS ??
    "";

  return new Set(
    configured
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function isOfficialQueryEditorUser(userId: string): boolean {
  return getOfficialQueryEditorUserIds().has(userId);
}

async function ensureTrainerProfileExists(
  fastify: FastifyTypebox,
  user: { id: string },
): Promise<void> {
  await fastify.db
    .insert(trainers)
    .values({
      id: user.id,
      userId: user.id,
      username: `trainer_${user.id.replace(/-/g, "")}`,
    })
    .onConflictDoNothing({ target: trainers.userId });
}

export async function queriesRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get("/tags", { schema: GetTagsSchema }, async () => {
    const result: unknown = await fastify.db.execute(sql`
      WITH tag_sources AS (
        SELECT
          qt.query_id::text AS query_id,
          lower(t.name) AS tag_name,
          t.id::text AS tag_id
        FROM pokequery.queries_to_tags qt
        JOIN pokequery.tags t ON t.id = qt.tag_id
        JOIN pokequery.search_queries sq ON sq.id = qt.query_id
        WHERE sq.is_public = true

        UNION

        SELECT
          sq.id::text AS query_id,
          lower(auto_tag.value) AS tag_name,
          NULL::text AS tag_id
        FROM pokequery.search_queries sq
        CROSS JOIN LATERAL jsonb_array_elements_text(
          COALESCE(sq.metadata->'autoTags', '[]'::jsonb)
        ) AS auto_tag(value)
        WHERE sq.is_public = true
      )
      SELECT
        COALESCE(MIN(tag_id), 'auto:' || tag_name) AS id,
        tag_name AS name,
        COUNT(DISTINCT query_id)::int AS "queryCount"
      FROM tag_sources
      GROUP BY tag_name
      ORDER BY tag_name
    `);

    const rawRows = Array.isArray(result) ? result : hasRowsArray(result) ? result.rows : [];

    const tagsRows: Array<{ id: string; name: string; queryCount: number }> = [];

    for (const row of rawRows as Array<Record<string, unknown>>) {
      const id = row.id;
      const name = row.name;
      const queryCount = row.queryCount;

      if (typeof id === "string" && typeof name === "string" && typeof queryCount === "number") {
        tagsRows.push({ id, name, queryCount });
      }
    }

    return { tags: tagsRows };
  });

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
        viewCount: searchQueries.viewCount,
        favoriteCount: sql<number>`COALESCE((
            SELECT COUNT(*)::int FROM pokequery.favorites f WHERE f.query_id = ${searchQueries.id}
          ), 0)`,
        forkCount: sql<number>`COALESCE((
            SELECT COUNT(*)::int FROM pokequery.search_queries forked WHERE forked.parent_query_id = ${searchQueries.id}
          ), 0)`,
        source: sql<"official" | "community" | null>`
          CASE
            WHEN ${searchQueries.metadata}->>'source' IN ('official', 'community')
              THEN (${searchQueries.metadata}->>'source')::text
            ELSE NULL
          END
        `,
        referenceUrl: sql<string | null>`NULLIF(${searchQueries.metadata}->>'referenceUrl', '')`,
        userTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'userTags', '[]'::jsonb)`,
        autoTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'autoTags', '[]'::jsonb)`,
        createdAt: searchQueries.createdAt,
        updatedAt: searchQueries.updatedAt,
        creatorId: trainers.id,
        creatorUsername: trainers.username,
        creatorPogoUsername: trainers.pogoUsername,
        creatorVisibleUsername: trainers.visibleUsername,
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
        creatorPogoUsername: trainers.pogoUsername,
        creatorVisibleUsername: trainers.visibleUsername,
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
      viewCount: row.viewCount,
      favoriteCount: row.favoriteCount,
      forkCount: row.forkCount,
      source: row.source,
      referenceUrl: row.referenceUrl,
      userTags: row.userTags,
      autoTags: row.autoTags,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      creator: row.creatorId
        ? {
            id: row.creatorId,
            username: row.creatorUsername!,
            displayName: resolveDisplayName({
              username: row.creatorUsername!,
              pogoUsername: row.creatorPogoUsername,
              visibleUsername: row.creatorVisibleUsername,
            }),
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
              displayName: resolveDisplayName({
                username: fork.creatorUsername!,
                pogoUsername: fork.creatorPogoUsername,
                visibleUsername: fork.creatorVisibleUsername,
              }),
              avatarUrl: fork.creatorAvatarUrl,
              team: fork.creatorTeam,
              level: fork.creatorLevel,
            }
          : null,
      })),
    });
  });

  server.post("/:id/views", { schema: TrackQueryViewSchema }, async (request, reply) => {
    const { id } = request.params;

    const result = await fastify.db.execute(sql`
      UPDATE pokequery.search_queries
      SET view_count = view_count + 1
      WHERE id = ${id} AND is_public = true
      RETURNING view_count
    `);

    let rows: unknown[] = [];

    if (Array.isArray(result)) {
      rows = result;
    } else if (hasRowsArray(result)) {
      rows = (result as { rows: unknown[] }).rows;
    }

    const [row] = rows as Array<Record<string, unknown>>;
    const viewCount = row?.view_count;

    if (typeof viewCount !== "number") {
      return reply.code(404).send({ error: "Query not found" });
    }

    return reply.send({ viewCount });
  });

  server.post(
    "/",
    { preHandler: [fastify.authenticate], schema: CreateQuerySchema, ...queryMutationRateLimit },
    async (request, reply) => {
      try {
        const {
          title,
          query,
          description,
          referenceUrl,
          isPublic,
          tags: userTags = [],
        } = request.body;
        const userId = request.user.id;

        await ensureTrainerProfileExists(fastify, request.user);

        if (findBlockedTerm(title.trim())) {
          return reply.code(400).send({ error: "Title contains blocked language" });
        }

        if (description?.trim() && findBlockedTerm(description.trim())) {
          return reply.code(400).send({ error: "Description contains blocked language" });
        }

        const normalizedReferenceUrl = normalizeReferenceUrl(referenceUrl);
        if (normalizedReferenceUrl && !isValidReferenceUrl(normalizedReferenceUrl)) {
          return reply.code(400).send({ error: "Reference URL must be a valid http(s) URL" });
        }

        // Generate the "Extensible Brain" data and mark user-created strings as community
        const normalizedUserTags = Array.from(
          new Set(userTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
        );
        const metadata = {
          ...generateMetadata(query),
          source: "community" as const,
          userTags: normalizedUserTags,
          ...(normalizedReferenceUrl ? { referenceUrl: normalizedReferenceUrl } : {}),
        };

        // Deduplicate and normalize tags (case-insensitive), including autoTags
        const autoTags = Array.isArray(metadata.autoTags) ? metadata.autoTags : [];
        const allTags = [...normalizedUserTags, ...autoTags];
        const uniqueTags = Array.from(new Set(allTags.map((t) => t.trim().toLowerCase())));

        // Insert the query first
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

        // Handle tags if any
        if (newQuery && uniqueTags.length > 0) {
          // Insert tags if they don't exist
          const tagRows = await Promise.all(
            uniqueTags.map(async (tag) => {
              const [existing] = await fastify.db
                .select()
                .from(tags)
                .where(eq(tags.name, tag))
                .limit(1);
              if (existing) return existing;
              const [created] = await fastify.db
                .insert(tags)
                .values({ name: tag })
                .onConflictDoNothing()
                .returning({ id: tags.id, name: tags.name });
              return created || { name: tag };
            }),
          );
          // Link tags to query
          for (const tagRow of tagRows) {
            if (
              tagRow &&
              typeof tagRow === "object" &&
              "id" in tagRow &&
              typeof tagRow.id === "string"
            ) {
              await fastify.db
                .insert(queriesToTags)
                .values({ queryId: newQuery.id, tagId: tagRow.id })
                .onConflictDoNothing();
            }
          }
        }

        if (newQuery) {
          return reply.code(201).send({ id: newQuery.id });
        } else {
          return reply.code(400).send({ error: "Failed to create query" });
        }
      } catch (error) {
        request.log.error({ error }, "Failed to create query");
        return reply.code(400).send({ error: "Failed to create query" });
      }
    },
  );

  server.post(
    "/official/sync",
    { preHandler: [fastify.authenticate], schema: SyncOfficialQueriesSchema },
    async (request, reply) => {
      if (!isOfficialQueryEditorUser(request.user.id)) {
        return reply.code(403).send({ error: "Official query editor access required" });
      }

      const creatorId = request.body.creatorId ?? request.user.id;
      const now = new Date();

      const [creator] = await fastify.db
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.id, creatorId))
        .limit(1);

      if (!creator) {
        return reply.code(400).send({ error: "Creator profile not found" });
      }

      let insertedCount = 0;
      let updatedCount = 0;

      for (const entry of request.body.entries) {
        if (findBlockedTerm(entry.title.trim())) {
          return reply
            .code(400)
            .send({ error: `Title contains blocked language for key ${entry.key}` });
        }

        if (entry.description?.trim() && findBlockedTerm(entry.description.trim())) {
          return reply.code(400).send({
            error: `Description contains blocked language for key ${entry.key}`,
          });
        }

        const source = entry.source ?? "official";
        const normalizedUserTags = Array.from(
          new Set((entry.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
        );
        const metadata = {
          ...generateMetadata(entry.query),
          source,
          seedKey: entry.key,
          userTags: normalizedUserTags,
        };

        const normalizedTags = Array.from(
          new Set(
            [
              ...normalizedUserTags,
              source === "official" ? "official" : "community-curated",
              "production-seeded",
            ]
              .map((tag) => tag.trim().toLowerCase())
              .filter(Boolean),
          ),
        );

        const [existing] = await fastify.db
          .select({ id: searchQueries.id })
          .from(searchQueries)
          .where(
            and(
              eq(searchQueries.creatorId, creatorId),
              sql`${searchQueries.metadata}->>'seedKey' = ${entry.key}`,
            ),
          )
          .limit(1);

        let queryId: string;

        if (existing?.id) {
          queryId = existing.id;
          updatedCount += 1;

          await fastify.db
            .update(searchQueries)
            .set({
              title: entry.title,
              query: entry.query,
              description: entry.description,
              creatorId,
              isPublic: entry.isPublic ?? true,
              metadata,
              updatedAt: now,
            })
            .where(eq(searchQueries.id, existing.id));
        } else {
          const [created] = await fastify.db
            .insert(searchQueries)
            .values({
              title: entry.title,
              query: entry.query,
              description: entry.description,
              creatorId,
              isPublic: entry.isPublic ?? true,
              copyCount: entry.copyCount ?? 0,
              metadata,
            })
            .returning({ id: searchQueries.id });

          if (!created?.id) {
            continue;
          }

          queryId = created.id;
          insertedCount += 1;
        }

        await fastify.db.delete(queriesToTags).where(eq(queriesToTags.queryId, queryId));

        for (const tagName of normalizedTags) {
          const [insertedTag] = await fastify.db
            .insert(tags)
            .values({ name: tagName })
            .onConflictDoNothing()
            .returning({ id: tags.id });

          let tagId = insertedTag?.id;
          if (!tagId) {
            const [existingTag] = await fastify.db
              .select({ id: tags.id })
              .from(tags)
              .where(eq(tags.name, tagName));
            tagId = existingTag?.id;
          }

          if (tagId) {
            await fastify.db.insert(queriesToTags).values({ queryId, tagId }).onConflictDoNothing();
          }
        }
      }

      return reply.code(200).send({
        creatorId,
        insertedCount,
        updatedCount,
      });
    },
  );

  server.post(
    "/:id/fork",
    { preHandler: [fastify.authenticate], schema: ForkQuerySchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user.id;

        await ensureTrainerProfileExists(fastify, request.user);

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
            metadata: {
              ...original.metadata,
              source: "community",
            },
          })
          .returning();

        if (forked) {
          if (original.creatorId && original.creatorId !== userId) {
            try {
              const actorDisplayName = await resolveDisplayNameForTrainer(fastify, userId);

              await emitNotification(fastify, {
                recipientTrainerId: original.creatorId,
                actorTrainerId: userId,
                eventType: "query_forked",
                entityType: "query",
                entityId: original.id,
                title: "Your query was forked",
                message: `${actorDisplayName ?? "A trainer"} forked "${original.title}".`,
                isHighPriority: true,
              });
            } catch {
              // Best effort: failure to emit a notification should not fail the fork action.
            }
          }

          return reply.code(201).send({ id: forked.id });
        } else {
          return reply.code(400).send({ error: "Failed to fork query" });
        }
      } catch (error) {
        request.log.error({ error }, "Failed to fork query");
        return reply.code(400).send({ error: "Failed to fork query" });
      }
    },
  );

  server.post(
    "/:id/sync",
    { preHandler: [fastify.authenticate], schema: SyncForkQuerySchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user.id;

        const fork = await fastify.db.query.searchQueries.findFirst({
          where: and(eq(searchQueries.id, id), eq(searchQueries.creatorId, userId)),
        });

        if (!fork || !fork.parentQueryId) {
          return reply.code(404).send({ error: "Fork not found" });
        }

        const source = await fastify.db.query.searchQueries.findFirst({
          where: eq(searchQueries.id, fork.parentQueryId),
        });

        if (!source) {
          return reply.code(409).send({
            error: "Original search string is no longer available",
          });
        }

        if (!source.isPublic) {
          return reply.code(409).send({
            error: "Original search string is no longer public",
          });
        }

        const [updatedFork] = await fastify.db
          .update(searchQueries)
          .set({
            query: source.query,
            originalQuerySnapshot: source.query,
            metadata: {
              ...generateMetadata(source.query),
              source: "community",
            },
          })
          .where(and(eq(searchQueries.id, id), eq(searchQueries.creatorId, userId)))
          .returning({ id: searchQueries.id });

        if (!updatedFork) {
          return reply.code(404).send({ error: "Fork not found" });
        }

        return reply.code(200).send({ id: updatedFork.id });
      } catch (_error) {
        return reply.code(400).send({ error: "Failed to sync fork" });
      }
    },
  );

  server.patch(
    "/:id",
    { preHandler: [fastify.authenticate], schema: UpdateQuerySchema, ...queryMutationRateLimit },
    async (request, reply) => {
      try {
        const { id } = request.params;
        if (!isUuid(id)) {
          return reply.code(404).send({ error: "Query not found or not owned by user" });
        }
        // Only pick allowed fields
        const {
          title,
          query,
          description,
          referenceUrl,
          isPublic,
          tags: userTags = [],
        } = request.body;
        const userId = request.user.id;

        if (findBlockedTerm(title.trim())) {
          return reply.code(400).send({ error: "Title contains blocked language" });
        }

        if (description?.trim() && findBlockedTerm(description.trim())) {
          return reply.code(400).send({ error: "Description contains blocked language" });
        }

        const hasReferenceUrlInput = Object.prototype.hasOwnProperty.call(
          request.body,
          "referenceUrl",
        );
        const hasTagsInput = Object.prototype.hasOwnProperty.call(request.body, "tags");
        const normalizedReferenceUrlInput = normalizeReferenceUrl(referenceUrl);
        if (normalizedReferenceUrlInput && !isValidReferenceUrl(normalizedReferenceUrlInput)) {
          return reply.code(400).send({ error: "Reference URL must be a valid http(s) URL" });
        }

        const [existingQuery] = await fastify.db
          .select({ metadata: searchQueries.metadata })
          .from(searchQueries)
          .where(and(eq(searchQueries.id, id), eq(searchQueries.creatorId, userId)))
          .limit(1);

        if (!existingQuery) {
          return reply.code(404).send({ error: "Query not found or not owned by user" });
        }

        const existingMetadata = existingQuery.metadata as {
          source?: unknown;
          userTags?: unknown;
          referenceUrl?: unknown;
        } | null;

        const existingUserTags = Array.isArray(existingMetadata?.userTags)
          ? existingMetadata.userTags.filter((tag): tag is string => typeof tag === "string")
          : [];

        const normalizedUserTags = Array.from(
          new Set(
            (hasTagsInput ? (userTags ?? []) : existingUserTags)
              .map((tag) => tag.trim().toLowerCase())
              .filter(Boolean),
          ),
        );

        const existingReferenceUrl =
          typeof existingMetadata?.referenceUrl === "string"
            ? normalizeReferenceUrl(existingMetadata.referenceUrl)
            : undefined;
        const nextReferenceUrl = hasReferenceUrlInput
          ? normalizedReferenceUrlInput
          : existingReferenceUrl;

        const metadata = {
          ...generateMetadata(query),
          source: resolveMetadataSource(existingMetadata?.source),
          userTags: normalizedUserTags,
          ...(nextReferenceUrl ? { referenceUrl: nextReferenceUrl } : {}),
        };

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

        // Deduplicate and normalize tags (case-insensitive), including autoTags
        const autoTags = Array.isArray(metadata.autoTags) ? metadata.autoTags : [];
        const allTags = [...normalizedUserTags, ...autoTags];
        const uniqueTags = Array.from(new Set(allTags.map((t) => t.trim().toLowerCase())));

        // Remove all existing tags for this query
        await fastify.db.delete(queriesToTags).where(eq(queriesToTags.queryId, id));

        // Handle tags if any
        if (uniqueTags.length > 0) {
          // Insert tags if they don't exist
          const tagRows = await Promise.all(
            uniqueTags.map(async (tag) => {
              const [existing] = await fastify.db
                .select()
                .from(tags)
                .where(eq(tags.name, tag))
                .limit(1);
              if (existing) return existing;
              const [created] = await fastify.db
                .insert(tags)
                .values({ name: tag })
                .onConflictDoNothing()
                .returning({ id: tags.id, name: tags.name });
              return created || { name: tag };
            }),
          );
          // Link tags to query
          for (const tagRow of tagRows) {
            if (
              tagRow &&
              typeof tagRow === "object" &&
              "id" in tagRow &&
              typeof tagRow.id === "string"
            ) {
              await fastify.db
                .insert(queriesToTags)
                .values({ queryId: id, tagId: tagRow.id })
                .onConflictDoNothing();
            }
          }
        }

        return reply.code(200).send({ id: updatedQuery.id });
      } catch (_error) {
        return reply.code(400).send({ error: "Failed to update query" });
      }
    },
  );

  server.patch(
    "/:id/copy",
    { schema: CopyQuerySchema, ...copyMutationRateLimit },
    async (request, reply) => {
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
    },
  );

  server.post(
    "/:id/favorite",
    { preHandler: [fastify.authenticate], schema: FavoriteQuerySchema, ...queryMutationRateLimit },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user.id;

        await ensureTrainerProfileExists(fastify, request.user);

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

        if (query.creatorId && query.creatorId !== userId) {
          try {
            const actorDisplayName = await resolveDisplayNameForTrainer(fastify, userId);

            await emitNotification(fastify, {
              recipientTrainerId: query.creatorId,
              actorTrainerId: userId,
              eventType: "query_favorited",
              entityType: "query",
              entityId: query.id,
              title: "Your query was favorited",
              message: `${actorDisplayName ?? "A trainer"} favorited "${query.title}".`,
              isHighPriority: false,
            });
          } catch {
            // Best effort: failure to emit a notification should not fail the favorite action.
          }
        }

        return reply.code(204).send(null);
      } catch (error) {
        request.log.error({ error }, "Failed to favorite query");
        return reply.code(400).send({ error: "Failed to favorite query" });
      }
    },
  );

  server.post(
    "/:id/unfavorite",
    {
      preHandler: [fastify.authenticate],
      schema: UnfavoriteQuerySchema,
      ...queryMutationRateLimit,
    },
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
