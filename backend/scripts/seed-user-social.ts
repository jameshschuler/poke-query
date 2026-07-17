import { config } from "dotenv";
import { resolve } from "node:path";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { assertQaLocalOnlySeedScript } from "./lib/seed-environment.js";

import { generateMetadata } from "../src/utils/pogo-parser.js";

config({ path: resolve(process.cwd(), ".env"), quiet: true });
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/postgres";
assertQaLocalOnlySeedScript("seed-user-social");

const targetUsername = process.argv[2] ?? process.env.SEED_USERNAME ?? "seed_3_5670f08f";
const followersToAdd = Number.parseInt(process.env.SEED_FOLLOWERS_TO_ADD ?? "4", 10);
const forksToAdd = Number.parseInt(process.env.SEED_FORKS_TO_ADD ?? "6", 10);

async function run() {
  const [{ db, queryClient }, { trainers, followers, searchQueries }] = await Promise.all([
    import("../src/db/index.js"),
    import("../src/db/schema.js"),
  ]);

  try {
    const [target] = await db
      .select({ id: trainers.id, username: trainers.username })
      .from(trainers)
      .where(eq(trainers.username, targetUsername))
      .limit(1);

    if (!target) {
      console.log(`Trainer not found for username: ${targetUsername}`);
      return;
    }

    const [followersBeforeRow] = await db
      .select({ total: count() })
      .from(followers)
      .where(eq(followers.followedId, target.id));

    const [forksBeforeRow] = await db
      .select({ total: count() })
      .from(searchQueries)
      .where(
        and(
          eq(searchQueries.creatorId, target.id),
          sql`${searchQueries.parentQueryId} IS NOT NULL`,
        ),
      );

    const followerCandidates = await db
      .select({ id: trainers.id })
      .from(trainers)
      .where(ne(trainers.id, target.id))
      .orderBy(sql`random()`)
      .limit(Math.max(1, followersToAdd));

    let insertedFollowers = 0;
    for (const candidate of followerCandidates) {
      const inserted = await db
        .insert(followers)
        .values({
          followerId: candidate.id,
          followedId: target.id,
        })
        .onConflictDoNothing()
        .returning({ followerId: followers.followerId });

      if (inserted.length > 0) {
        insertedFollowers += 1;
      }
    }

    const sourceQueries = await db
      .select({
        id: searchQueries.id,
        title: searchQueries.title,
        query: searchQueries.query,
      })
      .from(searchQueries)
      .where(and(ne(searchQueries.creatorId, target.id), eq(searchQueries.isPublic, true)))
      .orderBy(sql`random()`)
      .limit(Math.max(1, forksToAdd));

    if (sourceQueries.length === 0) {
      console.log("No public source queries from other trainers available to fork.");
      return;
    }

    const now = Date.now();
    const forkRows = Array.from({ length: Math.max(1, forksToAdd) }, (_, index) => {
      const source = sourceQueries[index % sourceQueries.length];
      const uniqueSuffix = `${now}-${index + 1}`;

      return {
        creatorId: target.id,
        title: `${source.title} [fork ${uniqueSuffix}]`,
        query: source.query,
        description: `[seed] Forked for ${target.username}`,
        isPublic: true,
        copyCount: 0,
        parentQueryId: source.id,
        originalQuerySnapshot: source.query,
        metadata: generateMetadata(source.query),
      };
    });

    const insertedForks = await db
      .insert(searchQueries)
      .values(forkRows)
      .returning({ id: searchQueries.id });

    const [followersAfterRow] = await db
      .select({ total: count() })
      .from(followers)
      .where(eq(followers.followedId, target.id));

    const [forksAfterRow] = await db
      .select({ total: count() })
      .from(searchQueries)
      .where(
        and(
          eq(searchQueries.creatorId, target.id),
          sql`${searchQueries.parentQueryId} IS NOT NULL`,
        ),
      );

    console.log(
      JSON.stringify(
        {
          username: target.username,
          followers: {
            before: followersBeforeRow?.total ?? 0,
            added: insertedFollowers,
            after: followersAfterRow?.total ?? 0,
          },
          forks: {
            before: forksBeforeRow?.total ?? 0,
            added: insertedForks.length,
            after: forksAfterRow?.total ?? 0,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    const { queryClient } = await import("../src/db/index.js");
    await queryClient.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error("Failed to seed user social data", error);
  process.exitCode = 1;
});
