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
        creator: Type.Union([
          Type.Object({
            id: Type.String(),
            username: Type.String(),
            avatarUrl: Type.Union([Type.String(), Type.Null()]),
            team: Type.Union([
              Type.Literal("mystic"),
              Type.Literal("valor"),
              Type.Literal("instinct"),
              Type.Null(),
            ]),
            level: Type.Union([Type.Integer(), Type.Null()]),
          }),
          Type.Null(),
        ]),
      }),
    ),
    400: Type.Object({
      error: Type.String(),
    }),
  },
};
