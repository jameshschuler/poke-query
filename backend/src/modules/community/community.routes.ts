import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { searchQueries, trainers } from "../../db/schema.js";
import { CommunitySchema } from "./community.schema.js";

export async function communityRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  const displayNameExpr = (trainerTable: typeof trainers) =>
    sql<string>`
      CASE
        WHEN ${trainerTable.visibleUsername} = 'pogo' AND NULLIF(TRIM(${trainerTable.pogoUsername}), '') IS NOT NULL
          THEN TRIM(${trainerTable.pogoUsername})
        ELSE ${trainerTable.username}
      END
    `;

  server.get("/", { schema: CommunitySchema }, async (request, reply) => {
    const { tag, sort, filter, limit, offset, search } = request.query;
    const mode = filter ?? "all";
    const pageLimit = limit ?? 20;
    const pageOffset = offset ?? 0;

    const popularityScore = sql<number>`(
      COALESCE(${searchQueries.copyCount}, 0)
      + COALESCE(
          (
            SELECT COUNT(*)::int
            FROM pokequery.favorites f
            WHERE f.query_id = ${searchQueries.id}
          ),
          0
        )
      + COALESCE(
          (
            SELECT COUNT(*)::int
            FROM pokequery.search_queries forked
            WHERE forked.parent_query_id = ${searchQueries.id}
          ),
          0
        )
    )`;

    // 1. Base query: Only show public strings
    const conditions = [eq(searchQueries.isPublic, true)];
    // 3. Filter by search term (title, query, description, creator username)
    if (search && search.trim().length > 0) {
      const like = `%${search.trim().toLowerCase()}%`;
      conditions.push(sql`(
        lower(${searchQueries.title}) like ${like} or
        lower(${searchQueries.query}) like ${like} or
        lower(coalesce(${searchQueries.description}, '')) like ${like} or
        exists (
          select 1 from pokequery.trainers t
          where t.id = ${searchQueries.creatorId} and lower(
            CASE
              WHEN t.visible_username = 'pogo' AND NULLIF(TRIM(t.pogo_username), '') IS NOT NULL
                THEN TRIM(t.pogo_username)
              ELSE t.username
            END
          ) like ${like}
        )
      )`);
    }

    // 2. Filter by Metadata Auto-Tag or user-supplied tag (from tags table)
    if (tag) {
      conditions.push(sql`(
        ${searchQueries.metadata}->'autoTags' ? ${tag}
        OR EXISTS (
          SELECT 1 FROM pokequery.queries_to_tags qt
          JOIN pokequery.tags t ON qt.tag_id = t.id
          WHERE qt.query_id = ${searchQueries.id} AND lower(t.name) = lower(${tag})
        )
      )`);
    }

    // 2b. Filter by mode (WHERE conditions only — sort is controlled separately)
    if (mode === "new") {
      conditions.push(sql`${searchQueries.createdAt} > NOW() - INTERVAL '30 days'`);
    }

    let sortOrder;
    switch (sort) {
      case "created_asc":
        sortOrder = asc(searchQueries.createdAt);
        break;
      case "title_asc":
        sortOrder = asc(searchQueries.title);
        break;
      case "title_desc":
        sortOrder = desc(searchQueries.title);
        break;
      case "popular":
        sortOrder = desc(popularityScore);
        break;
      case "created_desc":
      default:
        sortOrder = desc(searchQueries.createdAt);
        break;
    }

    // For the popular filter, default to sorting by popularity score unless an explicit sort is given
    const effectiveSort = mode === "popular" && !sort ? desc(popularityScore) : sortOrder;

    // 3. Execution with Sorting and creator profile join
    const rows = await fastify.db
      .select({
        id: searchQueries.id,
        title: searchQueries.title,
        query: searchQueries.query,
        description: searchQueries.description,
        copyCount: searchQueries.copyCount,
        favoriteCount: sql<number>`COALESCE((
          SELECT COUNT(*)::int
          FROM pokequery.favorites f
          WHERE f.query_id = ${searchQueries.id}
        ), 0)`,
        forkCount: sql<number>`COALESCE((
          SELECT COUNT(*)::int
          FROM pokequery.search_queries forked
          WHERE forked.parent_query_id = ${searchQueries.id}
        ), 0)`,
        autoTags: sql<string[]>`COALESCE(${searchQueries.metadata}->'autoTags', '[]'::jsonb)`,
        createdAt: searchQueries.createdAt,
        updatedAt: searchQueries.updatedAt,
        creatorId: trainers.id,
        creatorUsername: trainers.username,
        creatorDisplayName: displayNameExpr(trainers),
        creatorAvatarUrl: trainers.avatarUrl,
        creatorTeam: trainers.team,
        creatorLevel: trainers.level,
        creatorTrainerCode: trainers.trainerCode,
        creatorIsProfilePublic: trainers.isProfilePublic,
      })
      .from(searchQueries)
      .leftJoin(trainers, eq(searchQueries.creatorId, trainers.id))
      .where(and(...conditions))
      .orderBy(effectiveSort)
      .limit(pageLimit + 1)
      .offset(pageOffset);

    const hasMore = rows.length > pageLimit;
    const pageRows = hasMore ? rows.slice(0, pageLimit) : rows;
    const nextOffset = hasMore ? pageOffset + pageLimit : null;

    const library = pageRows.map((row) => ({
      id: row.id,
      title: row.title,
      query: row.query,
      description: row.description,
      copyCount: row.copyCount,
      favoriteCount: row.favoriteCount,
      forkCount: row.forkCount,
      autoTags: Array.isArray(row.autoTags) ? row.autoTags : [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      creator:
        row.creatorId && row.creatorUsername
          ? {
              id: row.creatorId,
              username: row.creatorUsername,
              displayName: row.creatorDisplayName,
              avatarUrl: row.creatorAvatarUrl,
              team: row.creatorIsProfilePublic
                ? (row.creatorTeam as "mystic" | "valor" | "instinct" | null)
                : null,
              level: row.creatorIsProfilePublic ? row.creatorLevel : null,
              trainerCode: row.creatorIsProfilePublic ? row.creatorTrainerCode : null,
            }
          : null,
    }));

    return reply.status(200).send({
      items: library,
      pagination: {
        limit: pageLimit,
        offset: pageOffset,
        nextOffset,
        hasMore,
      },
    });
  });
}
