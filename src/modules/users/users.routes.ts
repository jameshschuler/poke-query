import type { FastifyTypebox } from "../../types/fastify.js";

export async function userRoutes(fastify: FastifyTypebox) {
  fastify.get(
    "/me",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      return request.user;
    },
  );
}
