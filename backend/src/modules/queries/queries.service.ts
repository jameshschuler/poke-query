import { and, eq, sql } from "drizzle-orm";
import type { FastifyTypebox } from "../../types/fastify.js";
import { searchQueries, tags, queriesToTags, favorites } from "../../db/schema.js";
import { generateMetadata } from "../../utils/pogo-parser.js";
import { findBlockedTerm } from "../../lib/content-policy.js";
import {
  getReferenceDomainTag,
  isValidReferenceUrl,
  normalizeReferenceUrl,
} from "./queries-helpers.js";
import {
  emitNotification,
  resolveDisplayNameForTrainer,
} from "../notifications/notifications.service.js";

export async function createNewQuery(
  fastify: FastifyTypebox,
  userId: string,
  input: {
    title: string;
    query: string;
    description?: string | null;
    referenceUrl?: string | null;
    isPublic: boolean;
    tags?: string[];
  },
) {
  // Validate blocked terms
  if (findBlockedTerm(input.title.trim())) {
    throw new Error("Title contains blocked language");
  }

  if (input.description?.trim() && findBlockedTerm(input.description.trim())) {
    throw new Error("Description contains blocked language");
  }

  // Normalize reference URL
  const normalizedReferenceUrl = normalizeReferenceUrl(input.referenceUrl ?? undefined);
  if (normalizedReferenceUrl && !isValidReferenceUrl(normalizedReferenceUrl)) {
    throw new Error("Reference URL must be a valid http(s) URL");
  }

  const referenceDomainTag = getReferenceDomainTag(normalizedReferenceUrl);

  // Generate metadata and tags
  const normalizedUserTags = Array.from(
    new Set((input.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  );
  const generatedMetadata = generateMetadata(input.query);
  const generatedAutoTags = Array.isArray(generatedMetadata.autoTags)
    ? generatedMetadata.autoTags
    : [];
  const autoTags = Array.from(
    new Set(
      [...generatedAutoTags, ...(referenceDomainTag ? [referenceDomainTag] : [])]
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const metadata = {
    ...generatedMetadata,
    source: "community" as const,
    userTags: normalizedUserTags,
    autoTags,
    ...(normalizedReferenceUrl ? { referenceUrl: normalizedReferenceUrl } : {}),
  };

  const allTags = [...normalizedUserTags, ...autoTags];
  const uniqueTags = Array.from(new Set(allTags.map((t) => t.trim().toLowerCase())));

  // Insert the query
  const [newQuery] = await fastify.db
    .insert(searchQueries)
    .values({
      creatorId: userId,
      title: input.title,
      query: input.query,
      description: input.description ?? null,
      isPublic: input.isPublic,
      metadata,
    })
    .returning();

  if (!newQuery) {
    throw new Error("Failed to create query");
  }

  // Handle tags if any
  if (uniqueTags.length > 0) {
    const tagRows = await Promise.all(
      uniqueTags.map(async (tag) => {
        const [existing] = await fastify.db.select().from(tags).where(eq(tags.name, tag)).limit(1);
        if (existing) return existing;
        const [created] = await fastify.db
          .insert(tags)
          .values({ name: tag })
          .onConflictDoNothing()
          .returning({ id: tags.id, name: tags.name });
        return created || { name: tag };
      }),
    );

    for (const tagRow of tagRows) {
      if (tagRow && typeof tagRow === "object" && "id" in tagRow && typeof tagRow.id === "string") {
        await fastify.db
          .insert(queriesToTags)
          .values({ queryId: newQuery.id, tagId: tagRow.id })
          .onConflictDoNothing();
      }
    }
  }

  return newQuery;
}

export async function forkQuery(fastify: FastifyTypebox, userId: string, queryId: string) {
  // Find the original
  const original = await fastify.db.query.searchQueries.findFirst({
    where: eq(searchQueries.id, queryId),
  });

  if (!original || !original.isPublic) {
    throw new Error("Original query not found or private");
  }

  // Create the fork
  const [forked] = await fastify.db
    .insert(searchQueries)
    .values({
      creatorId: userId,
      title: `Fork of ${original.title}`,
      query: original.query,
      description: original.description,
      isPublic: false,
      parentQueryId: original.id,
      originalQuerySnapshot: original.query,
      metadata: {
        ...original.metadata,
        source: "community",
      },
    })
    .returning();

  if (!forked) {
    throw new Error("Failed to fork query");
  }

  // Emit notification if forking someone else's query
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
      // Best effort: failure to emit notification should not fail fork
    }
  }

  return forked;
}

export async function syncForkQuery(fastify: FastifyTypebox, userId: string, forkId: string) {
  // Find the fork
  const fork = await fastify.db.query.searchQueries.findFirst({
    where: and(eq(searchQueries.id, forkId), eq(searchQueries.creatorId, userId)),
  });

  if (!fork || !fork.parentQueryId) {
    throw new Error("Fork not found");
  }

  // Find the source
  const source = await fastify.db.query.searchQueries.findFirst({
    where: eq(searchQueries.id, fork.parentQueryId),
  });

  if (!source) {
    throw new Error("Original search string is no longer available");
  }

  if (!source.isPublic) {
    throw new Error("Original search string is no longer public");
  }

  // Update the fork
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
    .where(and(eq(searchQueries.id, forkId), eq(searchQueries.creatorId, userId)))
    .returning({ id: searchQueries.id });

  if (!updatedFork) {
    throw new Error("Fork not found");
  }

  return updatedFork;
}

export async function favoriteQuery(fastify: FastifyTypebox, trainerId: string, queryId: string) {
  // Check if query exists and is public
  const [query] = await fastify.db
    .select({ id: searchQueries.id })
    .from(searchQueries)
    .where(and(eq(searchQueries.id, queryId), eq(searchQueries.isPublic, true)))
    .limit(1);

  if (!query) {
    throw new Error("Query not found or is private");
  }

  // Add to favorites
  const result = await fastify.db
    .insert(favorites)
    .values({
      trainerId,
      queryId,
    })
    .onConflictDoNothing()
    .returning();

  return result.length > 0;
}

export async function unfavoriteQuery(fastify: FastifyTypebox, trainerId: string, queryId: string) {
  const result = await fastify.db
    .delete(favorites)
    .where(and(eq(favorites.trainerId, trainerId), eq(favorites.queryId, queryId)))
    .returning();

  return result.length > 0;
}

export async function copyQuery(fastify: FastifyTypebox, queryId: string) {
  // Increment copy count
  await fastify.db.execute(
    sql`UPDATE ${searchQueries} SET copy_count = copy_count + 1 WHERE id = ${queryId}`,
  );
}
