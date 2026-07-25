import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";
import { findBlockedTerm } from "../../lib/content-policy.js";
import { GenerateSearchStringSchema } from "./assistant.schemas.js";
import type { GenerateAssistantSearchStringInput } from "./assistant.service.js";
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
        const input: GenerateAssistantSearchStringInput = {
          prompt,
          ...(request.body.mode !== undefined ? { mode: request.body.mode } : {}),
          ...(request.body.context !== undefined ? { context: request.body.context } : {}),
          ...(request.body.previousResultId !== undefined
            ? { previousResultId: request.body.previousResultId }
            : {}),
        };

        const result = await generateAssistantSearchString(input);

        return reply.send(result);
      } catch (error) {
        request.log.warn({ error }, "Assistant generation failed");
        return reply.code(502).send({ error: "Assistant generation unavailable right now" });
      }
    },
  );
}
