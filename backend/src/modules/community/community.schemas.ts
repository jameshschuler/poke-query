import { Type } from "@fastify/type-provider-typebox";

export const CommunitySchema = {
  querystring: Type.Object({
    tag: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    sort: Type.Optional(Type.Union([Type.Literal("new"), Type.Literal("popular")] as const)),
  }),
  response: {
    200: Type.Array(
      Type.Object({
        id: Type.String(),
      }),
    ),
    400: Type.Object({
      error: Type.String(),
    }),
  },
};
