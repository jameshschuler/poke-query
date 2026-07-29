import { Type } from "@fastify/type-provider-typebox";

export const CommunityQueryItemSchema = Type.Object({
  id: Type.String(),
  title: Type.String(),
  query: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  copyCount: Type.Integer(),
  viewCount: Type.Integer(),
  favoriteCount: Type.Integer(),
  forkCount: Type.Integer(),
  qualityScore: Type.Number(),
  source: Type.Union([Type.Literal("official"), Type.Literal("community"), Type.Null()]),
  referenceUrl: Type.Union([Type.String(), Type.Null()]),
  userTags: Type.Array(Type.String()),
  autoTags: Type.Array(Type.String()),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
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
});

export const CommunityFilterSchema = Type.Union([
  Type.Literal("all"),
  Type.Literal("new"),
  Type.Literal("popular"),
  Type.Literal("official"),
] as const);

export const CommunitySortSchema = Type.Union([
  Type.Literal("created_asc"),
  Type.Literal("created_desc"),
  Type.Literal("title_asc"),
  Type.Literal("title_desc"),
  Type.Literal("popular"),
] as const);

export const CommunitySchema = {
  querystring: Type.Object({
    tag: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    filter: Type.Optional(CommunityFilterSchema),
    sort: Type.Optional(CommunitySortSchema),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    offset: Type.Optional(Type.Integer({ minimum: 0 })),
    search: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  }),
  response: {
    200: Type.Object({
      items: Type.Array(CommunityQueryItemSchema),
      pagination: Type.Object({
        limit: Type.Integer(),
        offset: Type.Integer(),
        nextOffset: Type.Union([Type.Integer(), Type.Null()]),
        hasMore: Type.Boolean(),
        total: Type.Integer(),
      }),
    }),
    400: Type.Object({
      error: Type.String(),
      errorCode: Type.Optional(Type.String()),
      requestId: Type.Optional(Type.String()),
    }),
  },
};
