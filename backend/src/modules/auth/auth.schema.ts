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
  },
  {
    // Logic check: Must have either a token OR a token_hash
    anyOf: [{ required: ["token"] }, { required: ["token_hash"] }],
  },
);

export type VerifyRequest = Static<typeof VerifySchema>;

export const VerifyRouteSchema = {
  body: VerifySchema,
  response: {
    200: Type.Object({
      message: Type.String(),
    }),
    400: Type.Object({
      error: Type.String(),
    }),
    401: Type.Object({
      error: Type.String(),
    }),
  },
};

export const LogoutSchema = {
  security: [{ cookieAuth: [] }],
  response: {
    200: Type.Object({
      message: Type.String(),
    }),
    401: Type.Object({
      error: Type.String(),
    }),
  },
};
