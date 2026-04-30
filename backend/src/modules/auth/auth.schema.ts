import { Type, type Static } from "@sinclair/typebox";

export const LoginSchema = {
  body: Type.Object({
    email: Type.String({ format: "email" }),
  }),
  response: {
    200: Type.Object({
      message: Type.String(),
    }),
    400: Type.Object({
      error: Type.String(),
    }),
  },
};

export type LoginRequest = Static<typeof LoginSchema.body>;

export const VerifySchema = Type.Object(
  {
    email: Type.String({ format: "email" }),
    token: Type.Optional(
      Type.String({
        minLength: 1,
        description: "The OTP code from the email",
      }),
    ),
    token_hash: Type.Optional(
      Type.String({
        description: "The token_hash from the Magic Link URL",
      }),
    ),

    // Optional username for first-time trainer setup
    username: Type.Optional(
      Type.String({
        minLength: 3,
        maxLength: 20,
        pattern: "^[a-zA-Z0-9_]+$", // Alphanumeric and underscores only
      }),
    ),

    // Optional trainer profile fields
    level: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    team: Type.Optional(
      Type.Union([Type.Literal("mystic"), Type.Literal("valor"), Type.Literal("instinct")]),
    ),
    avatarUrl: Type.Optional(Type.String({ format: "uri" })),
  },
  {
    // Logic check: Must have either a token OR a token_hash
    anyOf: [{ required: ["token"] }, { required: ["token_hash"] }],
  },
);

export type VerifyRequest = Static<typeof VerifySchema>;
