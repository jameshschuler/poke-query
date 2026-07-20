import { Type } from "@fastify/type-provider-typebox";

export const CommunitySchema = {
  querystring: Type.Object({
    tag: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    filter: Type.Optional(
      Type.Union([
        Type.Literal("all"),
        Type.Literal("new"),
        Type.Literal("popular"),
        Type.Literal("official"),
      ] as const),
    ),
    sort: Type.Optional(
      Type.Union([
        Type.Literal("created_asc"),
        Type.Literal("created_desc"),
        Type.Literal("title_asc"),
        Type.Literal("title_desc"),
        Type.Literal("popular"),
      ] as const),
    ),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    offset: Type.Optional(Type.Integer({ minimum: 0 })),
    search: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  }),
  response: {
    200: Type.Object({
      items: Type.Array(
        Type.Object({
          id: Type.String(),
          title: Type.String(),
          query: Type.String(),
          description: Type.Union([Type.String(), Type.Null()]),
          copyCount: Type.Integer(),
          viewCount: Type.Integer(),
          favoriteCount: Type.Integer(),
          forkCount: Type.Integer(),
          source: Type.Union([Type.Literal("official"), Type.Literal("community"), Type.Null()]),
          autoTags: Type.Array(Type.String()),
          createdAt: Type.String(),
          updatedAt: Type.String(),
          creator: Type.Union([
            Type.Object({
              id: Type.String(),
              username: Type.String(),
              displayName: Type.String(),
              avatarUrl: Type.Union([Type.String(), Type.Null()]),
              team: Type.Union([
                Type.Literal("mystic"),
                Type.Literal("valor"),
                Type.Literal("instinct"),
                Type.Null(),
              ]),
              level: Type.Union([Type.Integer(), Type.Null()]),
              trainerCode: Type.Union([Type.String(), Type.Null()]),
            }),
            Type.Null(),
          ]),
        }),
      ),
      pagination: Type.Object({
        limit: Type.Integer(),
        offset: Type.Integer(),
        nextOffset: Type.Union([Type.Integer(), Type.Null()]),
        hasMore: Type.Boolean(),
      }),
    }),
    400: Type.Object({
      error: Type.String(),
    }),
  },
};
