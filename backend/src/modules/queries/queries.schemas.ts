import { Type } from "@fastify/type-provider-typebox";

const cookieAuthSecurity = [{ cookieAuth: [] }];

const TrainerSchema = Type.Union([
  Type.Object({
    id: Type.String(),
    username: Type.String(),
    avatarUrl: Type.Union([Type.String(), Type.Null()]),
    team: Type.Union([Type.String(), Type.Null()]),
    level: Type.Union([Type.Integer(), Type.Null()]),
  }),
  Type.Null(),
]);

export const GetQuerySchema = {
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    200: Type.Object({
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
      creator: TrainerSchema,
      forks: Type.Array(
        Type.Object({
          id: Type.String(),
          title: Type.String(),
          createdAt: Type.String(),
          creator: TrainerSchema,
        }),
      ),
    }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const CreateQuerySchema = {
  security: cookieAuthSecurity,
  body: Type.Object({
    title: Type.String({ minLength: 3, maxLength: 100 }),
    query: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String({ maxLength: 500 })),
    isPublic: Type.Boolean({ default: false }),
    tags: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 32 }))),
  }),
  response: {
    201: Type.Object({
      id: Type.String(),
    }),
    400: Type.Object({
      error: Type.String(),
    }),
    401: Type.Object({
      error: Type.String(),
    }),
  },
};

export const ForkQuerySchema = {
  security: cookieAuthSecurity,
  params: Type.Object({
    id: Type.String(),
  }),
  body: Type.Object({
    // No additional fields needed for now, but can be extended in the future
  }),
  response: {
    201: Type.Object({
      id: Type.String(),
    }),
    400: Type.Object({
      error: Type.String(),
    }),
    401: Type.Object({
      error: Type.String(),
    }),
    404: Type.Object({
      error: Type.String(),
    }),
  },
};

export const UpdateQuerySchema = {
  security: cookieAuthSecurity,
  params: Type.Object({
    id: Type.String(),
  }),
  body: Type.Object({
    title: Type.String({ minLength: 3, maxLength: 100 }),
    query: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String({ maxLength: 500 })),
    isPublic: Type.Boolean(),
    tags: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 32 }))),
  }),
  response: {
    200: Type.Object({
      id: Type.String(),
    }),
    400: Type.Object({
      error: Type.String(),
    }),
    401: Type.Object({
      error: Type.String(),
    }),
    404: Type.Object({
      error: Type.String(),
    }),
  },
};

export const CopyQuerySchema = {
  params: Type.Object({
    id: Type.String(),
  }),
  body: Type.Object({
    // No additional fields needed for now, but can be extended in the future
  }),
  response: {
    204: Type.Null(),
    400: Type.Object({
      error: Type.String(),
    }),
  },
};

export const DeleteQuerySchema = {
  security: cookieAuthSecurity,
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    204: Type.Null(),
    400: Type.Object({
      error: Type.String(),
    }),
    401: Type.Object({
      error: Type.String(),
    }),
    404: Type.Object({
      error: Type.String(),
    }),
  },
};

export const FavoriteQuerySchema = {
  security: cookieAuthSecurity,
  params: Type.Object({
    id: Type.String(),
  }),
  body: Type.Object({}),
  response: {
    204: Type.Null(),
    400: Type.Object({
      error: Type.String(),
    }),
    401: Type.Object({
      error: Type.String(),
    }),
    404: Type.Object({
      error: Type.String(),
    }),
  },
};

export const UnfavoriteQuerySchema = {
  security: cookieAuthSecurity,
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    204: Type.Null(),
    400: Type.Object({
      error: Type.String(),
    }),
    401: Type.Object({
      error: Type.String(),
    }),
  },
};
