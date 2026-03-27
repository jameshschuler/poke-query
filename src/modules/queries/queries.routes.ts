import { Type, type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";
import { searchQueries } from "../../db/schema.js";
import { generateMetadata } from "../../utils/pogo-parser.js";
import {
  CopyQuerySchema,
  CreateQuerySchema,
  ForkQuerySchema,
} from "./queries.schemas.js";
import { eq, sql } from "drizzle-orm";

export async function queriesRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

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
      } catch (error) {
        return reply.code(400).send({ error: "Failed to create query" });
      }
    },
  );

  server.post(
    "/:id/fork",
    { preHandler: [fastify.authenticate], schema: ForkQuerySchema },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = request.user.id;

        // 1. Find the original
        const original = await fastify.db.query.searchQueries.findFirst({
          where: eq(searchQueries.id, id),
        });

        if (!original || !original.isPublic) {
          return reply
            .code(404)
            .send({ error: "Original query not found or private" });
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
      } catch (error) {
        return reply.code(400).send({ error: "Failed to fork query" });
      }
    },
  );

  server.patch(
    "/:id/copy",
    { schema: CopyQuerySchema },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        await fastify.db
          .update(searchQueries)
          .set({
            copyCount: sql`${searchQueries.copyCount} + 1`,
          })
          .where(eq(searchQueries.id, id));

        return reply.code(204);
      } catch (error) {
        return reply.code(400).send({ error: "Failed to copy query" });
      }
    },
  );
}
