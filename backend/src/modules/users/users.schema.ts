import { Type } from "@sinclair/typebox";

const cookieAuthSecurity = [{ cookieAuth: [] }];

export const GetTrainerSchema = {
  params: Type.Object({
    id: Type.String({ format: "uuid" }),
  }),
  response: {
    200: Type.Object({
      id: Type.String(),
      username: Type.String(),
      team: Type.Union([
        Type.Literal("mystic"),
        Type.Literal("valor"),
        Type.Literal("instinct"),
        Type.Null(),
      ]),
      level: Type.Union([Type.Integer(), Type.Null()]),
      trainerCode: Type.Union([Type.String(), Type.Null()]),
      avatarUrl: Type.Union([Type.String(), Type.Null()]),
      queryCount: Type.Integer(),
      forkCount: Type.Integer(),
    }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const GetMeSchema = {
  security: cookieAuthSecurity,
  response: {
    200: Type.Object({
      hasTrainer: Type.Boolean(),
      id: Type.String(),
      email: Type.Union([Type.String({ format: "email" }), Type.Null()]),
      username: Type.String(),
      team: Type.Union([
        Type.Literal("mystic"),
        Type.Literal("valor"),
        Type.Literal("instinct"),
        Type.Null(),
      ]),
      level: Type.Union([Type.Integer(), Type.Null()]),
      trainerCode: Type.Union([Type.String(), Type.Null()]),
      isProfilePublic: Type.Boolean(),
      avatarUrl: Type.Union([Type.String(), Type.Null()]),
      queryCount: Type.Integer(),
      favoriteCount: Type.Integer(),
      followerCount: Type.Integer(),
      forkCount: Type.Integer(),
    }),
    404: Type.Object({ error: Type.String() }),
    401: Type.Object({ error: Type.String() }),
  },
};

export const createUserSchema = {
  body: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email" },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        id: { type: "string" },
        email: { type: "string" },
      },
    },
  },
};

export const UpdateTrainerSchema = {
  security: cookieAuthSecurity,
  body: Type.Object(
    {
      username: Type.Optional(
        Type.String({
          minLength: 3,
          maxLength: 20,
          pattern: "^[a-zA-Z0-9_]+$",
        }),
      ),
      level: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
      team: Type.Optional(
        Type.Union([Type.Literal("mystic"), Type.Literal("valor"), Type.Literal("instinct")]),
      ),
      trainerCode: Type.Optional(
        Type.String({
          pattern: "^[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}$",
        }),
      ),
      isProfilePublic: Type.Optional(Type.Boolean()),
      avatarUrl: Type.Optional(Type.String({ format: "uri" })),
    },
    { minProperties: 1 },
  ),
  response: {
    200: Type.Object({ id: Type.String() }),
    400: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
    401: Type.Object({ error: Type.String() }),
    500: Type.Object({ error: Type.String() }),
  },
};

export const DeactivateTrainerSchema = {
  security: cookieAuthSecurity,
  response: {
    200: Type.Object({ message: Type.String() }),
    404: Type.Object({ error: Type.String() }),
    401: Type.Object({ error: Type.String() }),
  },
};

export const DeleteTrainerSchema = {
  security: cookieAuthSecurity,
  response: {
    204: Type.Null(),
    404: Type.Object({ error: Type.String() }),
    401: Type.Object({ error: Type.String() }),
    500: Type.Object({ error: Type.String() }),
  },
};

const followerResponseItem = Type.Object({
  id: Type.String(),
  username: Type.String(),
  team: Type.Union([
    Type.Literal("mystic"),
    Type.Literal("valor"),
    Type.Literal("instinct"),
    Type.Null(),
  ]),
  level: Type.Union([Type.Integer(), Type.Null()]),
  trainerCode: Type.Union([Type.String(), Type.Null()]),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
  followedAt: Type.String(),
});

const followParams = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export const FollowTrainerSchema = {
  security: cookieAuthSecurity,
  params: followParams,
  body: Type.Object({}),
  response: {
    204: Type.Null(),
    400: Type.Object({ error: Type.String() }),
    403: Type.Object({ error: Type.String() }),
    401: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const UnfollowTrainerSchema = {
  security: cookieAuthSecurity,
  params: followParams,
  response: {
    204: Type.Null(),
    401: Type.Object({ error: Type.String() }),
  },
};

export const GetTrainerFollowersSchema = {
  params: followParams,
  response: {
    200: Type.Object({
      total: Type.Integer(),
      followers: Type.Array(followerResponseItem),
    }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const GetMeFollowersSchema = {
  security: cookieAuthSecurity,
  response: {
    200: Type.Object({
      total: Type.Integer(),
      followers: Type.Array(followerResponseItem),
    }),
    401: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};

const publicQueryItem = Type.Object({
  id: Type.String(),
  title: Type.String(),
  query: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  copyCount: Type.Integer(),
  favoriteCount: Type.Integer(),
  forkCount: Type.Integer(),
  autoTags: Type.Array(Type.String()),
  createdAt: Type.String(),
});

const managedQueryItem = Type.Object({
  id: Type.String(),
  title: Type.String(),
  query: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  isPublic: Type.Boolean(),
  copyCount: Type.Integer(),
  favoriteCount: Type.Integer(),
  forkCount: Type.Integer(),
  autoTags: Type.Array(Type.String()),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const GetMeQueriesSchema = {
  security: cookieAuthSecurity,
  response: {
    200: Type.Object({
      queries: Type.Array(managedQueryItem),
    }),
    401: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};

const trainerSummarySchema = Type.Object({
  id: Type.String(),
  username: Type.String(),
  team: Type.Union([
    Type.Literal("mystic"),
    Type.Literal("valor"),
    Type.Literal("instinct"),
    Type.Null(),
  ]),
  level: Type.Union([Type.Integer(), Type.Null()]),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
});

const managedForkSourceItem = Type.Object({
  id: Type.String(),
  title: Type.String(),
  query: Type.String(),
  isPublic: Type.Boolean(),
  updatedAt: Type.String(),
  creator: Type.Union([trainerSummarySchema, Type.Null()]),
});

const managedForkItem = Type.Object({
  id: Type.String(),
  title: Type.String(),
  query: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  isPublic: Type.Boolean(),
  copyCount: Type.Integer(),
  favoriteCount: Type.Integer(),
  forkCount: Type.Integer(),
  autoTags: Type.Array(Type.String()),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  parentQueryId: Type.Union([Type.String(), Type.Null()]),
  originalQuerySnapshot: Type.Union([Type.String(), Type.Null()]),
  syncStatus: Type.Union([
    Type.Literal("up-to-date"),
    Type.Literal("behind"),
    Type.Literal("orphaned"),
  ]),
  sourceQuery: Type.Union([managedForkSourceItem, Type.Null()]),
});

export const GetMeForksSchema = {
  security: cookieAuthSecurity,
  response: {
    200: Type.Object({
      forks: Type.Array(managedForkItem),
    }),
    401: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const GetTrainerByUsernameSchema = {
  params: Type.Object({ username: Type.String() }),
  response: {
    200: Type.Object({
      id: Type.String(),
      username: Type.String(),
      team: Type.Union([
        Type.Literal("mystic"),
        Type.Literal("valor"),
        Type.Literal("instinct"),
        Type.Null(),
      ]),
      level: Type.Union([Type.Integer(), Type.Null()]),
      trainerCode: Type.Union([Type.String(), Type.Null()]),
      avatarUrl: Type.Union([Type.String(), Type.Null()]),
      isProfilePublic: Type.Boolean(),
      deactivatedAt: Type.Union([Type.String(), Type.Null()]),
      createdAt: Type.String(),
      stringCount: Type.Integer(),
      favoriteCount: Type.Integer(),
      forkCount: Type.Integer(),
      followerCount: Type.Integer(),
    }),
    404: Type.Object({ error: Type.String() }),
  },
};

const trainerIdParams = Type.Object({ id: Type.String({ format: "uuid" }) });

export const GetTrainerStringsSchema = {
  params: trainerIdParams,
  response: {
    200: Type.Object({ strings: Type.Array(publicQueryItem) }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const GetTrainerForksSchema = {
  params: trainerIdParams,
  response: {
    200: Type.Object({ forks: Type.Array(publicQueryItem) }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const GetTrainerFavoritesSchema = {
  params: trainerIdParams,
  response: {
    200: Type.Object({ favorites: Type.Array(publicQueryItem) }),
    404: Type.Object({ error: Type.String() }),
  },
};
