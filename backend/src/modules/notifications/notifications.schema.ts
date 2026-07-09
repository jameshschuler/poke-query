import { Type } from "@sinclair/typebox";

const cookieAuthSecurity = [{ cookieAuth: [] }];

export const NotificationEventTypeSchema = Type.Union([
  Type.Literal("new_follower"),
  Type.Literal("query_forked"),
  Type.Literal("query_favorited"),
]);

const actorSchema = Type.Union([
  Type.Object({
    id: Type.String(),
    username: Type.String(),
    displayName: Type.String(),
    avatarUrl: Type.Union([Type.String(), Type.Null()]),
  }),
  Type.Null(),
]);

const notificationItemSchema = Type.Object({
  id: Type.String(),
  eventType: NotificationEventTypeSchema,
  entityType: Type.Union([Type.Literal("trainer"), Type.Literal("query"), Type.Null()]),
  entityId: Type.Union([Type.String(), Type.Null()]),
  title: Type.String(),
  message: Type.String(),
  isHighPriority: Type.Boolean(),
  isRead: Type.Boolean(),
  readAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  actor: actorSchema,
});

export const GetNotificationsSchema = {
  security: cookieAuthSecurity,
  querystring: Type.Object({
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    offset: Type.Optional(Type.Integer({ minimum: 0 })),
    unreadOnly: Type.Optional(Type.Boolean()),
    highPriorityOnly: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: Type.Object({
      notifications: Type.Array(notificationItemSchema),
      pagination: Type.Object({
        limit: Type.Integer(),
        offset: Type.Integer(),
        nextOffset: Type.Union([Type.Integer(), Type.Null()]),
        hasMore: Type.Boolean(),
        total: Type.Integer(),
      }),
    }),
    401: Type.Object({ error: Type.String() }),
  },
};

export const GetUnreadCountSchema = {
  security: cookieAuthSecurity,
  response: {
    200: Type.Object({ unreadCount: Type.Integer() }),
    401: Type.Object({ error: Type.String() }),
  },
};

export const MarkNotificationReadSchema = {
  security: cookieAuthSecurity,
  params: Type.Object({
    id: Type.String({ format: "uuid" }),
  }),
  response: {
    204: Type.Null(),
    401: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};

export const MarkAllNotificationsReadSchema = {
  security: cookieAuthSecurity,
  response: {
    204: Type.Null(),
    401: Type.Object({ error: Type.String() }),
  },
};

const notificationPreferencesSchema = Type.Object({
  notifyNewFollower: Type.Boolean(),
  notifyQueryFork: Type.Boolean(),
  notifyQueryFavorite: Type.Boolean(),
  inAppToasts: Type.Boolean(),
});

export const GetNotificationPreferencesSchema = {
  security: cookieAuthSecurity,
  response: {
    200: notificationPreferencesSchema,
    401: Type.Object({ error: Type.String() }),
  },
};

export const UpdateNotificationPreferencesSchema = {
  security: cookieAuthSecurity,
  body: Type.Object(
    {
      notifyNewFollower: Type.Optional(Type.Boolean()),
      notifyQueryFork: Type.Optional(Type.Boolean()),
      notifyQueryFavorite: Type.Optional(Type.Boolean()),
      inAppToasts: Type.Optional(Type.Boolean()),
    },
    { minProperties: 1 },
  ),
  response: {
    200: notificationPreferencesSchema,
    401: Type.Object({ error: Type.String() }),
  },
};
