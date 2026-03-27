import { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { trainers } from "../../db/schema.js";
import type { FastifyTypebox } from "../../types/fastify.js";

export async function userRoutes(fastify: FastifyTypebox) {
  //   fastify.post("/", { schema: createUserSchema }, async (request, reply) => {
  //     const { email } = request.body as { email: string };
  //     const [user] = await fastify.db
  //       .insert(fastify.db.users)
  //       .values({ email })
  //       .returning();
  //     return reply.code(201).send(user);
  //   });

  // GET /pokemon/my-party
  fastify.get(
    "/my-party",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.user.id;

      // Use Drizzle's Relational Query API
      const userWithPokemon = await fastify.db.query.trainers.findFirst({
        where: eq(trainers.id, userId),
        with: {
          collection: {
            with: {
              pokemon: true,
            },
          },
        },
      });

      return userWithPokemon?.collection.map((c) => c.pokemon) || [];
    },
  );

  // Example of a protected route using a preHandler hook
  fastify.get(
    "/me",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      return request.user;
    },
  );
}
