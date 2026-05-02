import { Type } from "@fastify/type-provider-typebox";

const cookieAuthSecurity = [{ cookieAuth: [] }];

export const CreateQuerySchema = {
  security: cookieAuthSecurity,
  body: Type.Object({
    title: Type.String({ minLength: 3, maxLength: 100 }),
    query: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String({ maxLength: 500 })),
    isPublic: Type.Boolean({ default: false }),
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
