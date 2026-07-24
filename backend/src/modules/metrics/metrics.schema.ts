import { Type } from "@fastify/type-provider-typebox";

const CommunityQueryItem = Type.Object({
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
  endsAt: Type.Optional(Type.Union([Type.String(), Type.Null()])),
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
});

const CommunityFilter = Type.Union([
  Type.Literal("all"),
  Type.Literal("new"),
  Type.Literal("popular"),
  Type.Literal("official"),
] as const);

const DiscoverRail = Type.Union([
  Type.Literal("weekly_picks"),
  Type.Literal("featured_today"),
  Type.Literal("all_time_trusted"),
  Type.Literal("contextual_picks"),
  Type.Literal("default"),
] as const);

export const MetricsSurfacingSchema = {
  querystring: Type.Object({
    tag: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    filter: Type.Optional(CommunityFilter),
    search: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    railLimit: Type.Optional(Type.Integer({ minimum: 1, maximum: 20 })),
  }),
  response: {
    200: Type.Object({
      weeklyPicks: Type.Array(CommunityQueryItem),
      featuredToday: Type.Array(CommunityQueryItem),
      allTimeTrusted: Type.Array(CommunityQueryItem),
      contextualPicks: Type.Array(CommunityQueryItem),
      generatedAt: Type.String(),
      dateKey: Type.String(),
    }),
  },
};

export const TrackMetricsSurfacingEventsSchema = {
  body: Type.Object({
    sessionKey: Type.String({ minLength: 8, maxLength: 200 }),
    events: Type.Array(
      Type.Object({
        queryId: Type.String({ minLength: 1, maxLength: 100 }),
        rail: DiscoverRail,
        eventType: Type.Union([
          Type.Literal("impression"),
          Type.Literal("detail_click"),
          Type.Literal("copy_action"),
        ] as const),
        occurredAt: Type.Optional(Type.String()),
      }),
      { minItems: 1, maxItems: 50 },
    ),
  }),
  response: {
    202: Type.Object({ accepted: Type.Integer() }),
  },
};

export const MetricsSchema = {
  security: [{ cookieAuth: [] }],
  querystring: Type.Object({
    days: Type.Optional(Type.Integer({ minimum: 1, maximum: 30 })),
  }),
  response: {
    200: Type.Object({
      windowDays: Type.Integer(),
      discoverToDetailCtr: Type.Number(),
      copyConversion: Type.Number(),
      impressionDistributionUniqueStrings: Type.Number(),
      totals: Type.Object({
        impressions: Type.Integer(),
        detailClicks: Type.Integer(),
        copyActions: Type.Integer(),
        uniqueImpressionStrings: Type.Integer(),
      }),
    }),
    401: Type.Object({ error: Type.String() }),
    403: Type.Object({ error: Type.String() }),
  },
};

const WeeklyPickItem = Type.Object({
  queryId: Type.String(),
  title: Type.String(),
  isPublic: Type.Boolean(),
  displayOrder: Type.Integer(),
  isActive: Type.Boolean(),
  startsAt: Type.Union([Type.String(), Type.Null()]),
  endsAt: Type.Union([Type.String(), Type.Null()]),
  notes: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const GetWeeklyPicksSchema = {
  security: [{ cookieAuth: [] }],
  response: {
    200: Type.Object({ items: Type.Array(WeeklyPickItem) }),
    401: Type.Object({ error: Type.String() }),
    403: Type.Object({ error: Type.String() }),
  },
};

export const UpsertWeeklyPickSchema = {
  security: [{ cookieAuth: [] }],
  body: Type.Object({
    queryId: Type.String({ minLength: 1, maxLength: 100 }),
    displayOrder: Type.Optional(Type.Integer({ minimum: 0, maximum: 999 })),
    isActive: Type.Optional(Type.Boolean()),
    startsAt: Type.Optional(Type.Union([Type.String({ format: "date-time" }), Type.Null()])),
    endsAt: Type.Optional(Type.Union([Type.String({ format: "date-time" }), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  }),
  response: {
    200: Type.Object({ item: WeeklyPickItem }),
    400: Type.Object({ error: Type.String() }),
    401: Type.Object({ error: Type.String() }),
    403: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const DeleteWeeklyPickSchema = {
  security: [{ cookieAuth: [] }],
  params: Type.Object({
    queryId: Type.String({ minLength: 1, maxLength: 100 }),
  }),
  response: {
    200: Type.Object({ removedQueryId: Type.String() }),
    401: Type.Object({ error: Type.String() }),
    403: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};
