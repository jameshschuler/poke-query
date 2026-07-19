import { Type } from "@sinclair/typebox";

const cookieAuthSecurity = [{ cookieAuth: [] }];

export const ReportTargetTypeSchema = Type.Union([Type.Literal("query"), Type.Literal("trainer")]);

export const ReportStatusSchema = Type.Union([
  Type.Literal("open"),
  Type.Literal("in_review"),
  Type.Literal("resolved"),
  Type.Literal("dismissed"),
]);

const moderatorActorSchema = Type.Union([
  Type.Object({
    id: Type.String(),
    username: Type.String(),
    displayName: Type.String(),
  }),
  Type.Null(),
]);

const moderationTargetSchema = Type.Object({
  queryId: Type.Union([Type.String(), Type.Null()]),
  trainerId: Type.Union([Type.String(), Type.Null()]),
  label: Type.String(),
});

const moderationReportItemSchema = Type.Object({
  id: Type.String(),
  targetType: ReportTargetTypeSchema,
  reason: Type.String(),
  details: Type.Union([Type.String(), Type.Null()]),
  status: ReportStatusSchema,
  target: moderationTargetSchema,
  reporter: moderatorActorSchema,
  reviewedBy: moderatorActorSchema,
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

const moderationReportActionSchema = Type.Object({
  id: Type.String(),
  action: Type.Union([
    Type.Literal("submitted"),
    Type.Literal("status_changed"),
    Type.Literal("commented"),
  ]),
  fromStatus: Type.Union([ReportStatusSchema, Type.Null()]),
  toStatus: Type.Union([ReportStatusSchema, Type.Null()]),
  comment: Type.Union([Type.String(), Type.Null()]),
  actor: moderatorActorSchema,
  createdAt: Type.String(),
});

export const SubmitReportSchema = {
  security: cookieAuthSecurity,
  body: Type.Object({
    targetType: ReportTargetTypeSchema,
    targetId: Type.String({ format: "uuid" }),
    reason: Type.String({ minLength: 3, maxLength: 120 }),
    details: Type.Optional(Type.String({ minLength: 3, maxLength: 1000 })),
  }),
  response: {
    201: Type.Object({
      id: Type.String(),
      status: ReportStatusSchema,
    }),
    400: Type.Object({ error: Type.String() }),
    401: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
    409: Type.Object({ error: Type.String() }),
  },
};

export const GetModerationAccessSchema = {
  security: cookieAuthSecurity,
  response: {
    200: Type.Object({ isReviewer: Type.Boolean() }),
    401: Type.Object({ error: Type.String() }),
  },
};

export const GetModerationReportsSchema = {
  security: cookieAuthSecurity,
  querystring: Type.Object({
    status: Type.Optional(ReportStatusSchema),
    targetType: Type.Optional(ReportTargetTypeSchema),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    offset: Type.Optional(Type.Integer({ minimum: 0 })),
  }),
  response: {
    200: Type.Object({
      reports: Type.Array(moderationReportItemSchema),
      pagination: Type.Object({
        limit: Type.Integer(),
        offset: Type.Integer(),
        nextOffset: Type.Union([Type.Integer(), Type.Null()]),
        hasMore: Type.Boolean(),
        total: Type.Integer(),
      }),
    }),
    401: Type.Object({ error: Type.String() }),
    403: Type.Object({ error: Type.String() }),
  },
};

export const GetModerationReportDetailSchema = {
  security: cookieAuthSecurity,
  params: Type.Object({
    id: Type.String({ format: "uuid" }),
  }),
  response: {
    200: Type.Object({
      report: moderationReportItemSchema,
      actions: Type.Array(moderationReportActionSchema),
    }),
    401: Type.Object({ error: Type.String() }),
    403: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const UpdateModerationReportStatusSchema = {
  security: cookieAuthSecurity,
  params: Type.Object({
    id: Type.String({ format: "uuid" }),
  }),
  body: Type.Object({
    status: ReportStatusSchema,
    comment: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
  }),
  response: {
    200: Type.Object({
      id: Type.String(),
      status: ReportStatusSchema,
      updatedAt: Type.String(),
    }),
    401: Type.Object({ error: Type.String() }),
    403: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};
