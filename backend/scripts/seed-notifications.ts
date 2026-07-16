import { config } from "dotenv";
import { resolve } from "node:path";
import { eq, inArray, like, count } from "drizzle-orm";
import { assertQaLocalOnlySeedScript } from "./lib/seed-environment.js";

config({ path: resolve(process.cwd(), ".env"), quiet: true });
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/postgres";
assertQaLocalOnlySeedScript("db:seed:notifications");

type TrainerRow = {
  id: string;
  username: string;
};

type QueryRow = {
  id: string;
  title: string;
  creatorId: string | null;
};

function pickNextTrainer(trainers: TrainerRow[], currentId: string): TrainerRow | null {
  const eligible = trainers.filter((trainer) => trainer.id !== currentId);
  if (eligible.length === 0) {
    return null;
  }

  return eligible[Math.floor(Math.random() * eligible.length)] ?? null;
}

async function run() {
  const [{ db, queryClient }, { notifications, notificationPreferences, trainers, searchQueries }] =
    await Promise.all([import("../src/db/index.js"), import("../src/db/schema.js")]);

  try {
    const trainerRows = await db
      .select({ id: trainers.id, username: trainers.username })
      .from(trainers)
      .limit(25);

    if (trainerRows.length < 2) {
      console.log("Need at least 2 trainers to seed notifications.");
      return;
    }

    const publicQueries = await db
      .select({
        id: searchQueries.id,
        title: searchQueries.title,
        creatorId: searchQueries.creatorId,
      })
      .from(searchQueries)
      .where(eq(searchQueries.isPublic, true))
      .limit(50);

    await db.delete(notifications).where(like(notifications.title, "[seed] %"));

    const now = Date.now();
    const rows: Array<
      typeof notifications.$inferInsert & {
        seedKey: string;
      }
    > = [];

    for (const [index, recipient] of trainerRows.entries()) {
      const actor = pickNextTrainer(trainerRows, recipient.id);
      if (!actor) {
        continue;
      }

      const baseCreatedAt = new Date(now - index * 60 * 60 * 1000);

      rows.push({
        seedKey: `follow-${recipient.id}`,
        recipientTrainerId: recipient.id,
        actorTrainerId: actor.id,
        eventType: "new_follower",
        entityType: "trainer",
        entityId: actor.id,
        title: "[seed] New follower",
        message: `${actor.username} started following you.`,
        isHighPriority: true,
        isRead: index % 3 === 0,
        readAt: index % 3 === 0 ? baseCreatedAt : null,
        createdAt: baseCreatedAt,
      });
    }

    const availableQueryRows: QueryRow[] = publicQueries.filter(
      (query): query is QueryRow => query.creatorId !== null,
    );

    for (const [index, query] of availableQueryRows.slice(0, 18).entries()) {
      const ownerId = query.creatorId;
      if (!ownerId) {
        continue;
      }

      const actor = pickNextTrainer(trainerRows, ownerId);
      if (!actor) {
        continue;
      }

      const favoriteCreatedAt = new Date(now - (index + 12) * 45 * 60 * 1000);
      const forkCreatedAt = new Date(now - (index + 24) * 30 * 60 * 1000);

      rows.push({
        seedKey: `fav-${query.id}`,
        recipientTrainerId: ownerId,
        actorTrainerId: actor.id,
        eventType: "query_favorited",
        entityType: "query",
        entityId: query.id,
        title: "[seed] Query favorited",
        message: `${actor.username} favorited \"${query.title}\".`,
        isHighPriority: false,
        isRead: index % 2 === 0,
        readAt: index % 2 === 0 ? favoriteCreatedAt : null,
        createdAt: favoriteCreatedAt,
      });

      rows.push({
        seedKey: `fork-${query.id}`,
        recipientTrainerId: ownerId,
        actorTrainerId: actor.id,
        eventType: "query_forked",
        entityType: "query",
        entityId: query.id,
        title: "[seed] Query forked",
        message: `${actor.username} forked \"${query.title}\".`,
        isHighPriority: true,
        isRead: false,
        readAt: null,
        createdAt: forkCreatedAt,
      });
    }

    if (rows.length === 0) {
      console.log("No notification seed rows generated.");
      return;
    }

    const preferenceRows = trainerRows.slice(0, 12).map((trainer, index) => ({
      trainerId: trainer.id,
      notifyNewFollower: true,
      notifyQueryFork: true,
      notifyQueryFavorite: index % 4 !== 0,
      inAppToasts: index % 5 !== 0,
      updatedAt: new Date(now - index * 10 * 60 * 1000),
    }));

    if (preferenceRows.length > 0) {
      await db
        .insert(notificationPreferences)
        .values(preferenceRows)
        .onConflictDoNothing();
    }

    await db.insert(notifications).values(rows.map(({ seedKey: _seedKey, ...row }) => row));

    const recipientIds = Array.from(new Set(rows.map((row) => row.recipientTrainerId)));
    const [summary] = await db
      .select({ count: count() })
      .from(notifications)
      .where(inArray(notifications.recipientTrainerId, recipientIds));

    console.log(`Seeded ${rows.length} notifications across ${recipientIds.length} trainers.`);
    console.log(`Total notifications for seeded trainers: ${summary?.count ?? rows.length}`);
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error("Failed to seed notifications", error);
  process.exitCode = 1;
});
