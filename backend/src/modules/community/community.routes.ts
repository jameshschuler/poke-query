import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";
import { eq, and, sql, desc, asc, type SQL } from "drizzle-orm";
import { searchQueries, trainers } from "../../db/schema.js";
import { CommunitySchema } from "./community.schema.js";

export type CommunityRow = {
  id: string;
  title: string;
  query: string;
  description: string | null;
  copyCount: number;
  viewCount: number;
  favoriteCount: number;
  forkCount: number;
  qualityScore: number;
  source: "official" | "community" | null;
  referenceUrl: string | null;
  userTags: string[];
  autoTags: string[];
  createdAt: Date;
  updatedAt: Date;
  creatorId: string | null;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  creatorAvatarUrl: string | null;
  creatorTeam: string | null;
  creatorLevel: number | null;
  creatorTrainerCode: string | null;
  creatorIsProfilePublic: boolean | null;
};

const displayNameExpr = (trainerTable: typeof trainers) =>
  sql<string>`
    CASE
      WHEN ${trainerTable.visibleUsername} = 'pogo' AND NULLIF(TRIM(${trainerTable.pogoUsername}), '') IS NOT NULL
        THEN TRIM(${trainerTable.pogoUsername})
      ELSE ${trainerTable.username}
    END
  `;

const favoriteCountExpr = sql<number>`COALESCE((
  SELECT COUNT(*)::int
  FROM pokequery.favorites f
  WHERE f.query_id = ${searchQueries.id}
), 0)`;

const forkCountExpr = sql<number>`COALESCE((
  SELECT COUNT(*)::int
  FROM pokequery.search_queries forked
  WHERE forked.parent_query_id = ${searchQueries.id}
), 0)`;

const userTagCountExpr = sql<number>`(
  CASE
    WHEN jsonb_typeof(${searchQueries.metadata}->'userTags') = 'array'
      THEN jsonb_array_length(${searchQueries.metadata}->'userTags')
    ELSE 0
  END
)`;

const autoTagCountExpr = sql<number>`(
  CASE
    WHEN jsonb_typeof(${searchQueries.metadata}->'autoTags') = 'array'
      THEN jsonb_array_length(${searchQueries.metadata}->'autoTags')
    ELSE 0
  END
)`;

const metadataCompletenessExpr = sql<number>`(
  (CASE WHEN NULLIF(TRIM(COALESCE(${searchQueries.description}, '')), '') IS NOT NULL THEN 1 ELSE 0 END) * 0.9
  + (CASE WHEN (${searchQueries.metadata}->>'source') IN ('official', 'community') THEN 1 ELSE 0 END) * 0.4
  + (CASE WHEN NULLIF(${searchQueries.metadata}->>'referenceUrl', '') IS NOT NULL THEN 1 ELSE 0 END) * 0.35
  + LEAST(${userTagCountExpr}, 4) * 0.3
  + LEAST(${autoTagCountExpr}, 4) * 0.2
)`;

export const qualityScoreExpr = sql<number>`ROUND((
  LN(1 + COALESCE(${searchQueries.copyCount}, 0)) * 1.6
  + LN(1 + ${favoriteCountExpr}) * 3.3
  + LN(1 + ${forkCountExpr}) * 3.8
  + LN(1 + GREATEST(LEAST(COALESCE(${searchQueries.copyCount}, 0), (${favoriteCountExpr} + ${forkCountExpr}) * 8), 0)) * 1.2
  + LEAST(${metadataCompletenessExpr}, 3.5) * 1.1
  + LEAST(((${favoriteCountExpr} + ${forkCountExpr})::numeric / GREATEST(${searchQueries.viewCount}, 1)) * 20, 2.5)
  - LEAST(GREATEST(COALESCE(${searchQueries.copyCount}, 0) - ((${favoriteCountExpr} + ${forkCountExpr}) * 10), 0) * 0.12, 3.5)
  - LEAST(GREATEST(${searchQueries.viewCount} - ((COALESCE(${searchQueries.copyCount}, 0) + ${favoriteCountExpr} + ${forkCountExpr}) * 90), 0) * 0.01, 2.0)
)::numeric, 4)`;

export const selectCommunityFields = {
  id: searchQueries.id,
  title: searchQueries.title,
  query: searchQueries.query,
  description: searchQueries.description,
  copyCount: searchQueries.copyCount,
  viewCount: searchQueries.viewCount,
  favoriteCount: favoriteCountExpr,
  forkCount: forkCountExpr,
  qualityScore: qualityScoreExpr,
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
  creatorDisplayName: displayNameExpr(trainers),
  creatorAvatarUrl: trainers.avatarUrl,
  creatorTeam: trainers.team,
  creatorLevel: trainers.level,
  creatorTrainerCode: trainers.trainerCode,
  creatorIsProfilePublic: trainers.isProfilePublic,
};

export function buildCommunityConditions(params: {
  search?: string | undefined;
  tag?: string | undefined;
  filter?: "all" | "new" | "popular" | "official" | undefined;
}) {
  const conditions: SQL[] = [eq(searchQueries.isPublic, true)];
  const mode = params.filter ?? "all";

  if (params.search && params.search.trim().length > 0) {
    const like = `%${params.search.trim().toLowerCase()}%`;
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

  if (params.tag) {
    conditions.push(sql`(
      ${searchQueries.metadata}->'autoTags' ? ${params.tag}
      OR EXISTS (
        SELECT 1 FROM pokequery.queries_to_tags qt
        JOIN pokequery.tags t ON qt.tag_id = t.id
        WHERE qt.query_id = ${searchQueries.id} AND lower(t.name) = lower(${params.tag})
      )
    )`);
  }

  if (mode === "new") {
    conditions.push(sql`${searchQueries.createdAt} > NOW() - INTERVAL '30 days'`);
  }

  if (mode === "official") {
    conditions.push(sql`${searchQueries.metadata}->>'source' = 'official'`);
  }

  return conditions;
}

export function toCommunityItem(row: CommunityRow) {
  return {
    id: row.id,
    title: row.title,
    query: row.query,
    description: row.description,
    copyCount: row.copyCount,
    viewCount: row.viewCount,
    favoriteCount: row.favoriteCount,
    forkCount: row.forkCount,
    qualityScore: row.qualityScore,
    source: row.source,
    referenceUrl: row.referenceUrl,
    userTags: Array.isArray(row.userTags) ? row.userTags : [],
    autoTags: Array.isArray(row.autoTags) ? row.autoTags : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    creator:
      row.creatorId && row.creatorUsername
        ? {
            id: row.creatorId,
            username: row.creatorUsername,
            displayName: row.creatorDisplayName ?? row.creatorUsername,
            avatarUrl: row.creatorAvatarUrl,
            team: row.creatorIsProfilePublic
              ? (row.creatorTeam as "mystic" | "valor" | "instinct" | null)
              : null,
            level: row.creatorIsProfilePublic ? row.creatorLevel : null,
            trainerCode: row.creatorIsProfilePublic ? row.creatorTrainerCode : null,
          }
        : null,
  };
}

export async function communityRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get("/", { schema: CommunitySchema }, async (request, reply) => {
    const { tag, sort, filter, limit, offset, search } = request.query;
    const mode = filter ?? "all";
    const pageLimit = limit ?? 20;
    const pageOffset = offset ?? 0;
    const conditions = buildCommunityConditions({ search, tag, filter: mode });

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
        sortOrder = desc(qualityScoreExpr);
        break;
      case "created_desc":
      default:
        sortOrder = desc(searchQueries.createdAt);
        break;
    }

    // New filter is always newest-first, regardless of stale/explicit sort params.
    const effectiveSort =
      mode === "new"
        ? desc(searchQueries.createdAt)
        : mode === "popular" && !sort
          ? desc(qualityScoreExpr)
          : sortOrder;

    const rows = await fastify.db
      .select(selectCommunityFields)
      .from(searchQueries)
      .leftJoin(trainers, eq(searchQueries.creatorId, trainers.id))
      .where(and(...conditions))
      .orderBy(effectiveSort)
      .limit(pageLimit + 1)
      .offset(pageOffset);

    const hasMore = rows.length > pageLimit;
    const pageRows = hasMore ? rows.slice(0, pageLimit) : rows;
    const nextOffset = hasMore ? pageOffset + pageLimit : null;

    const library = pageRows.map((row) => toCommunityItem(row as CommunityRow));

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
