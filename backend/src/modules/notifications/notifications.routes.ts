import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { and, count, desc, eq } from "drizzle-orm";
import { notificationPreferences, notifications, trainers } from "../../db/schema.js";
import type { FastifyTypebox } from "../../types/fastify.js";
import {
  GetNotificationPreferencesSchema,
  GetNotificationsSchema,
  GetUnreadCountSchema,
  MarkAllNotificationsReadSchema,
  MarkNotificationReadSchema,
  UpdateNotificationPreferencesSchema,
} from "./notifications.schema.js";
import { defaultNotificationPreferences } from "./notifications.service.js";

function resolveDisplayName(row: {
  username: string | null;
  pogoUsername: string | null;
  visibleUsername: string | null;
}) {
  if (row.visibleUsername === "pogo" && row.pogoUsername?.trim()) {
    return row.pogoUsername.trim();
  }

  return row.username ?? "Unknown trainer";
}

export async function notificationsRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/",
    { preHandler: [fastify.authenticate], schema: GetNotificationsSchema },
    async (request) => {
      const trainerId = request.user.id;
      const limit = Math.min(100, Math.max(1, request.query.limit ?? 20));
      const offset = Math.max(0, request.query.offset ?? 0);
      const unreadOnly = request.query.unreadOnly ?? false;
      const highPriorityOnly = request.query.highPriorityOnly ?? false;

      const whereClauses = [eq(notifications.recipientTrainerId, trainerId)];
      if (unreadOnly) {
        whereClauses.push(eq(notifications.isRead, false));
      }
      if (highPriorityOnly) {
        whereClauses.push(eq(notifications.isHighPriority, true));
      }

      const rows = await fastify.db
        .select({
          id: notifications.id,
          eventType: notifications.eventType,
          entityType: notifications.entityType,
          entityId: notifications.entityId,
          title: notifications.title,
          message: notifications.message,
          isHighPriority: notifications.isHighPriority,
          isRead: notifications.isRead,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
          actorId: trainers.id,
          actorUsername: trainers.username,
          actorPogoUsername: trainers.pogoUsername,
          actorVisibleUsername: trainers.visibleUsername,
          actorAvatarUrl: trainers.avatarUrl,
        })
        .from(notifications)
        .leftJoin(trainers, eq(trainers.id, notifications.actorTrainerId))
        .where(and(...whereClauses))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      const [totals] = await fastify.db
        .select({ total: count() })
        .from(notifications)
        .where(and(...whereClauses));

      const total = totals?.total ?? 0;
      const nextOffset = offset + rows.length < total ? offset + rows.length : null;

      return {
        notifications: rows.map((row) => ({
          id: row.id,
          eventType: row.eventType as "new_follower" | "query_forked" | "query_favorited",
          entityType: row.entityType as "trainer" | "query" | null,
          entityId: row.entityId,
          title: row.title,
          message: row.message,
          isHighPriority: row.isHighPriority,
          isRead: row.isRead,
          readAt: row.readAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          actor: row.actorId
            ? {
                id: row.actorId,
                username: row.actorUsername ?? "unknown",
                displayName: resolveDisplayName({
                  username: row.actorUsername,
                  pogoUsername: row.actorPogoUsername,
                  visibleUsername: row.actorVisibleUsername,
                }),
                avatarUrl: row.actorAvatarUrl,
              }
            : null,
        })),
        pagination: {
          limit,
          offset,
          nextOffset,
          hasMore: nextOffset !== null,
          total,
        },
      };
    },
  );

  server.get(
    "/unread-count",
    { preHandler: [fastify.authenticate], schema: GetUnreadCountSchema },
    async (request) => {
      const trainerId = request.user.id;

      const [totals] = await fastify.db
        .select({ total: count() })
        .from(notifications)
        .where(
          and(eq(notifications.recipientTrainerId, trainerId), eq(notifications.isRead, false)),
        );

      return { unreadCount: totals?.total ?? 0 };
    },
  );

  server.patch(
    "/:id/read",
    { preHandler: [fastify.authenticate], schema: MarkNotificationReadSchema },
    async (request, reply) => {
      const trainerId = request.user.id;
      const { id } = request.params;

      const [updated] = await fastify.db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(eq(notifications.id, id), eq(notifications.recipientTrainerId, trainerId)))
        .returning({ id: notifications.id });

      if (!updated) {
        return reply.code(404).send({ error: "Notification not found" });
      }

      return reply.code(204).send(null);
    },
  );

  server.patch(
    "/read-all",
    { preHandler: [fastify.authenticate], schema: MarkAllNotificationsReadSchema },
    async (request, reply) => {
      const trainerId = request.user.id;

      await fastify.db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(eq(notifications.recipientTrainerId, trainerId), eq(notifications.isRead, false)),
        );

      return reply.code(204).send(null);
    },
  );

  server.get(
    "/preferences",
    { preHandler: [fastify.authenticate], schema: GetNotificationPreferencesSchema },
    async (request) => {
      const trainerId = request.user.id;

      const [row] = await fastify.db
        .select({
          notifyNewFollower: notificationPreferences.notifyNewFollower,
          notifyQueryFork: notificationPreferences.notifyQueryFork,
          notifyQueryFavorite: notificationPreferences.notifyQueryFavorite,
          inAppToasts: notificationPreferences.inAppToasts,
        })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.trainerId, trainerId))
        .limit(1);

      if (!row) {
        return defaultNotificationPreferences;
      }

      return row;
    },
  );

  server.patch(
    "/preferences",
    { preHandler: [fastify.authenticate], schema: UpdateNotificationPreferencesSchema },
    async (request) => {
      const trainerId = request.user.id;

      const [updated] = await fastify.db
        .insert(notificationPreferences)
        .values({
          trainerId,
          notifyNewFollower:
            request.body.notifyNewFollower ?? defaultNotificationPreferences.notifyNewFollower,
          notifyQueryFork:
            request.body.notifyQueryFork ?? defaultNotificationPreferences.notifyQueryFork,
          notifyQueryFavorite:
            request.body.notifyQueryFavorite ?? defaultNotificationPreferences.notifyQueryFavorite,
          inAppToasts: request.body.inAppToasts ?? defaultNotificationPreferences.inAppToasts,
        })
        .onConflictDoUpdate({
          target: notificationPreferences.trainerId,
          set: {
            notifyNewFollower:
              request.body.notifyNewFollower ?? notificationPreferences.notifyNewFollower,
            notifyQueryFork:
              request.body.notifyQueryFork ?? notificationPreferences.notifyQueryFork,
            notifyQueryFavorite:
              request.body.notifyQueryFavorite ?? notificationPreferences.notifyQueryFavorite,
            inAppToasts: request.body.inAppToasts ?? notificationPreferences.inAppToasts,
            updatedAt: new Date(),
          },
        })
        .returning({
          notifyNewFollower: notificationPreferences.notifyNewFollower,
          notifyQueryFork: notificationPreferences.notifyQueryFork,
          notifyQueryFavorite: notificationPreferences.notifyQueryFavorite,
          inAppToasts: notificationPreferences.inAppToasts,
        });

      return updated;
    },
  );
}
