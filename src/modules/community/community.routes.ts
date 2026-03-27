import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";
import { eq, and, sql, desc } from "drizzle-orm";
import { searchQueries } from "../../db/schema.js";
import { CommunitySchema } from "./community.schemas.js";

export async function communityRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/community",
    { schema: CommunitySchema },
    async (request, reply) => {
      const { tag, sort } = request.query;

      // 1. Base query: Only show public strings
      let conditions = [eq(searchQueries.isPublic, true)];

      // 2. Filter by Metadata Auto-Tag
      // Using the @> operator is the most efficient way to search JSONB arrays in Postgres
      if (tag) {
        conditions.push(sql`${searchQueries.metadata}->'autoTags' ? ${tag}`);
      }

      // 3. Execution with Sorting
      const library = await fastify.db.query.searchQueries.findMany({
        where: and(...conditions),
        // TODO:
        columns: {
          id: true,
        },
        with: {
          creator: {
            columns: { username: true, avatarUrl: true, team: true },
          },
        },
        orderBy:
          sort === "popular"
            ? [desc(searchQueries.copyCount)]
            : [desc(searchQueries.createdAt)],
        limit: 50,
      });

      return reply.status(200).send(library);
    },
  );
}
