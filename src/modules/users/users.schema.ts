import { Type } from "@sinclair/typebox";

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
      avatarUrl: Type.Optional(Type.String({ format: "uri" })),
    },
    { minProperties: 1 },
  ),
  response: {
    200: Type.Object({ id: Type.String() }),
    400: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const DeactivateTrainerSchema = {
  response: {
    200: Type.Object({ message: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const DeleteTrainerSchema = {
  response: {
    204: Type.Null(),
    404: Type.Object({ error: Type.String() }),
  },
};
