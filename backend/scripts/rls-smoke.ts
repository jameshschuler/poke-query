import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import postgres from "postgres";

import { buildApp } from "../src/app.ts";
import {
  _authUsers,
  favorites,
  followers,
  guestFavorites,
  notificationPreferences,
  notifications,
  searchQueries,
  tags,
  trainers,
} from "../src/db/schema.ts";

async function main() {
  const app = await buildApp();
  const seed = `${Date.now()}`;
  const publicAuthUserId = randomUUID();
  const privateAuthUserId = randomUUID();
  const publicTrainerId = randomUUID();
  const privateTrainerId = randomUUID();
  const publicQueryId = randomUUID();
  const privateQueryId = randomUUID();
  const publicTagId = randomUUID();

  const cleanup = async () => {
    await app.db
      .delete(notificationPreferences)
      .where(eq(notificationPreferences.trainerId, publicTrainerId));
    await app.db
      .delete(notificationPreferences)
      .where(eq(notificationPreferences.trainerId, privateTrainerId));
    await app.db.delete(notifications).where(eq(notifications.recipientTrainerId, publicTrainerId));
    await app.db
      .delete(notifications)
      .where(eq(notifications.recipientTrainerId, privateTrainerId));
    await app.db.delete(guestFavorites).where(eq(guestFavorites.queryId, publicQueryId));
    await app.db.delete(favorites).where(eq(favorites.queryId, publicQueryId));
    await app.db.delete(favorites).where(eq(favorites.queryId, privateQueryId));
    await app.db.delete(followers).where(eq(followers.followedId, publicTrainerId));
    await app.db.delete(followers).where(eq(followers.followedId, privateTrainerId));
    await app.db.delete(searchQueries).where(eq(searchQueries.id, publicQueryId));
    await app.db.delete(searchQueries).where(eq(searchQueries.id, privateQueryId));
    await app.db.delete(tags).where(eq(tags.id, publicTagId));
    await app.db.delete(trainers).where(eq(trainers.id, publicTrainerId));
    await app.db.delete(trainers).where(eq(trainers.id, privateTrainerId));
    await app.db.delete(_authUsers).where(eq(_authUsers.id, publicAuthUserId));
    await app.db.delete(_authUsers).where(eq(_authUsers.id, privateAuthUserId));
  };

  try {
    await cleanup();

    await app.db.insert(_authUsers).values([{ id: publicAuthUserId }, { id: privateAuthUserId }]);

    await app.db.insert(trainers).values([
      {
        id: publicTrainerId,
        userId: publicAuthUserId,
        username: `public_${seed}`,
        isProfilePublic: true,
      },
      {
        id: privateTrainerId,
        userId: privateAuthUserId,
        username: `private_${seed}`,
        isProfilePublic: false,
      },
    ]);

    await app.db.insert(tags).values({ id: publicTagId, name: `rls-${seed}` });

    await app.db.insert(searchQueries).values([
      {
        id: publicQueryId,
        creatorId: publicTrainerId,
        title: `public_${seed}`,
        query: "cp-1500",
        description: "public row",
        isPublic: true,
      },
      {
        id: privateQueryId,
        creatorId: privateTrainerId,
        title: `private_${seed}`,
        query: "cp-2500",
        description: "private row",
        isPublic: false,
      },
    ]);

    await app.db.insert(favorites).values({ trainerId: publicTrainerId, queryId: publicQueryId });
    await app.db
      .insert(followers)
      .values({ followerId: publicTrainerId, followedId: privateTrainerId });
    await app.db
      .insert(guestFavorites)
      .values({ guestId: `guest-${seed}`, queryId: publicQueryId });
    await app.db.insert(notificationPreferences).values({ trainerId: publicTrainerId });
    await app.db.insert(notifications).values({
      recipientTrainerId: publicTrainerId,
      actorTrainerId: privateTrainerId,
      eventType: "new_follower",
      entityType: "trainer",
      entityId: publicTrainerId,
      title: "hello",
      message: "world",
    });

    const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

    const queryRows = await sql.begin(async (tx) => {
      await tx.unsafe("set local role anon");
      await tx.unsafe("set local row_security = on");

      const [
        anonTrainers,
        anonQueries,
        anonTags,
        anonFavorites,
        anonFollowers,
        anonGuestFavorites,
        anonNotifications,
        anonPrefs,
      ] = await Promise.all([
        tx.unsafe(
          "select id, username, is_profile_public from pokequery.trainers order by username",
        ),
        tx.unsafe("select id, title, is_public from pokequery.search_queries order by title"),
        tx.unsafe("select id, name from pokequery.tags order by name"),
        tx.unsafe("select trainer_id, query_id from pokequery.favorites"),
        tx.unsafe("select follower_id, followed_id from pokequery.followers"),
        tx.unsafe("select guest_id, query_id from pokequery.guest_favorites"),
        tx.unsafe("select id, title from pokequery.notifications"),
        tx.unsafe("select trainer_id from pokequery.notification_preferences"),
      ]);

      return {
        anonTrainers,
        anonQueries,
        anonTags,
        anonFavorites,
        anonFollowers,
        anonGuestFavorites,
        anonNotifications,
        anonPrefs,
      };
    });

    let guestInsertDenied = false;
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe("set local role anon");
        await tx.unsafe("set local row_security = on");
        await tx.unsafe(
          "insert into pokequery.guest_favorites (guest_id, query_id) values ($1, $2)",
          [`guest2-${seed}`, publicQueryId],
        );
      });
    } catch {
      guestInsertDenied = true;
    }

    const results = {
      publicTrainerVisible: queryRows.anonTrainers.some(
        (row) => row.id === publicTrainerId && row.is_profile_public === true,
      ),
      privateTrainerHidden: !queryRows.anonTrainers.some((row) => row.id === privateTrainerId),
      publicQueryVisible: queryRows.anonQueries.some(
        (row) => row.id === publicQueryId && row.is_public === true,
      ),
      privateQueryHidden: !queryRows.anonQueries.some((row) => row.id === privateQueryId),
      tagVisible: queryRows.anonTags.some((row) => row.id === publicTagId),
      favoritesHidden: queryRows.anonFavorites.length === 0,
      followersHidden: queryRows.anonFollowers.length === 0,
      guestFavoritesHidden: queryRows.anonGuestFavorites.length === 0,
      notificationsHidden: queryRows.anonNotifications.length === 0,
      prefsHidden: queryRows.anonPrefs.length === 0,
      guestInsertDenied,
      queryErrors: {},
    };

    console.log(JSON.stringify(results, null, 2));

    const booleanChecks = [
      results.publicTrainerVisible,
      results.privateTrainerHidden,
      results.publicQueryVisible,
      results.privateQueryHidden,
      results.tagVisible,
      results.favoritesHidden,
      results.followersHidden,
      results.guestFavoritesHidden,
      results.notificationsHidden,
      results.prefsHidden,
      results.guestInsertDenied,
    ];

    if (!booleanChecks.every(Boolean)) {
      throw new Error("RLS smoke test failed");
    }
  } finally {
    await cleanup();
    await app.close();
  }
}

await main();
