import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";
import { eq, and, sql, desc } from "drizzle-orm";
import { searchQueries, trainers } from "../../db/schema.js";
import { CommunitySchema } from "./community.schemas.js";

export async function communityRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get("/community", { schema: CommunitySchema }, async (request, reply) => {
    const { tag, sort } = request.query;

    // 1. Base query: Only show public strings
    const conditions = [eq(searchQueries.isPublic, true)];

    // 2. Filter by Metadata Auto-Tag
    // Using the @> operator is the most efficient way to search JSONB arrays in Postgres
    if (tag) {
      conditions.push(sql`${searchQueries.metadata}->'autoTags' ? ${tag}`);
    }

    // 3. Execution with Sorting and creator profile join
    const rows = await fastify.db
      .select({
        id: searchQueries.id,
        creatorId: trainers.id,
        creatorUsername: trainers.username,
        creatorAvatarUrl: trainers.avatarUrl,
        creatorTeam: trainers.team,
        creatorLevel: trainers.level,
      })
      .from(searchQueries)
      .leftJoin(trainers, eq(searchQueries.creatorId, trainers.id))
      .where(and(...conditions))
      .orderBy(sort === "popular" ? desc(searchQueries.copyCount) : desc(searchQueries.createdAt))
      .limit(50);

    const library = rows.map((row) => ({
      id: row.id,
      creator:
        row.creatorId && row.creatorUsername
          ? {
              id: row.creatorId,
              username: row.creatorUsername,
              avatarUrl: row.creatorAvatarUrl,
              team: row.creatorTeam as "mystic" | "valor" | "instinct" | null,
              level: row.creatorLevel,
            }
          : null,
    }));

    return reply.status(200).send(library);
  });
}
