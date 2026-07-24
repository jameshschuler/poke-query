import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";
import { findBlockedTerm } from "../../lib/content-policy.js";
import { GenerateSearchStringSchema } from "./assistant.schemas.js";
import { generateAssistantSearchString } from "./assistant.service.js";

const assistantRateLimit = {
  config: {
    rateLimit: {
      max: 20,
      timeWindow: "1 minute",
    },
  },
} as const;

export async function assistantRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.post(
    "/search-string/generate",
    {
      preHandler: [fastify.authenticate],
      schema: GenerateSearchStringSchema,
      ...assistantRateLimit,
    },
    async (request, reply) => {
      const prompt = request.body.prompt.trim();

      if (findBlockedTerm(prompt)) {
        return reply.code(400).send({ error: "Prompt contains blocked language" });
      }

      try {
        const result = await generateAssistantSearchString({
          prompt,
          mode: request.body.mode,
          context: request.body.context,
          previousResultId: request.body.previousResultId,
        });

        return reply.send(result);
      } catch (error) {
        request.log.warn({ error }, "Assistant generation failed");
        return reply.code(502).send({ error: "Assistant generation unavailable right now" });
      }
    },
  );
}
