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
