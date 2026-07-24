import { Type } from "@fastify/type-provider-typebox";

const cookieAuthSecurity = [{ cookieAuth: [] }];

const AssistantModeSchema = Type.Union([
  Type.Literal("raids"),
  Type.Literal("pvp"),
  Type.Literal("events"),
  Type.Literal("cleanup"),
  Type.Literal("auto"),
]);

export const GenerateSearchStringSchema = {
  security: cookieAuthSecurity,
  body: Type.Object({
    prompt: Type.String({ minLength: 3, maxLength: 500 }),
    mode: Type.Optional(AssistantModeSchema),
    context: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    previousResultId: Type.Optional(Type.String({ format: "uuid" })),
  }),
  response: {
    200: Type.Object({
      resultId: Type.String({ format: "uuid" }),
      title: Type.String(),
      query: Type.String(),
      description: Type.Union([Type.String(), Type.Null()]),
      tags: Type.Array(Type.String()),
      explanation: Type.Optional(Type.String()),
      warnings: Type.Optional(Type.Array(Type.String())),
      provider: Type.Union([
        Type.Literal("gemini"),
        Type.Literal("openai"),
        Type.Literal("claude"),
        Type.Literal("hybrid"),
      ]),
      model: Type.String(),
    }),
    400: Type.Object({ error: Type.String() }),
    401: Type.Object({ error: Type.String() }),
    502: Type.Object({ error: Type.String() }),
  },
} as const;

export type AssistantMode = "raids" | "pvp" | "events" | "cleanup" | "auto";
