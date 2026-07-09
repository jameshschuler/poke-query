import type { FastifyTypebox } from "../../types/fastify.js";
import { notificationPreferences, notifications, trainers } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export type NotificationEventType = "new_follower" | "query_forked" | "query_favorited";

type PreferenceColumn = "notifyNewFollower" | "notifyQueryFork" | "notifyQueryFavorite";

const eventPreferenceMap: Record<NotificationEventType, PreferenceColumn> = {
  new_follower: "notifyNewFollower",
  query_forked: "notifyQueryFork",
  query_favorited: "notifyQueryFavorite",
};

export const defaultNotificationPreferences = {
  notifyNewFollower: true,
  notifyQueryFork: true,
  notifyQueryFavorite: true,
  inAppToasts: true,
};

export async function emitNotification(
  fastify: FastifyTypebox,
  payload: {
    recipientTrainerId: string;
    actorTrainerId?: string | null;
    eventType: NotificationEventType;
    entityType?: "trainer" | "query" | null;
    entityId?: string | null;
    title: string;
    message: string;
    isHighPriority?: boolean;
  },
) {
  if (payload.actorTrainerId && payload.recipientTrainerId === payload.actorTrainerId) {
    return;
  }

  const [preferences] = await fastify.db
    .select({
      notifyNewFollower: notificationPreferences.notifyNewFollower,
      notifyQueryFork: notificationPreferences.notifyQueryFork,
      notifyQueryFavorite: notificationPreferences.notifyQueryFavorite,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.trainerId, payload.recipientTrainerId))
    .limit(1);

  const preferenceKey = eventPreferenceMap[payload.eventType];
  if (preferences && preferences[preferenceKey] === false) {
    return;
  }

  await fastify.db.insert(notifications).values({
    recipientTrainerId: payload.recipientTrainerId,
    actorTrainerId: payload.actorTrainerId ?? null,
    eventType: payload.eventType,
    entityType: payload.entityType ?? null,
    entityId: payload.entityId ?? null,
    title: payload.title,
    message: payload.message,
    isHighPriority: payload.isHighPriority ?? false,
  });
}

export async function resolveDisplayNameForTrainer(
  fastify: FastifyTypebox,
  trainerId: string,
): Promise<string | null> {
  const [row] = await fastify.db
    .select({
      username: trainers.username,
      pogoUsername: trainers.pogoUsername,
      visibleUsername: trainers.visibleUsername,
    })
    .from(trainers)
    .where(eq(trainers.id, trainerId))
    .limit(1);

  if (!row) {
    return null;
  }

  if (row.visibleUsername === "pogo" && row.pogoUsername?.trim()) {
    return row.pogoUsername.trim();
  }

  return row.username;
}
