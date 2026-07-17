import { config } from "dotenv";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";

import { productionSeedQueries } from "./data/production-search-queries.js";
import { generateMetadata } from "../src/utils/pogo-parser.js";
import { getSupabaseAdmin } from "../src/lib/supabase.js";

config({ path: resolve(process.cwd(), ".env"), quiet: true });
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/postgres";

function getOfficialSeedEmail(): string {
  return process.env.PROD_SEED_OFFICIAL_EMAIL?.trim() || "official@seed.pokequery.local";
}

function buildDiceBearAvatarUrl(seed: string): string {
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodedSeed}`;
}

async function ensureOfficialAuthUserId(email: string): Promise<string> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      seeded: true,
      source: "production-search-seed",
      role: "official",
    },
  });

  if (data?.user?.id) {
    return data.user.id;
  }

  if (error) {
    for (let page = 1; page <= 20; page += 1) {
      const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listed.error) {
        throw listed.error;
      }

      const users = listed.data?.users ?? [];
      const existing = users.find((user) => (user.email ?? "").toLowerCase() === email.toLowerCase());
      if (existing?.id) {
        return existing.id;
      }

      if (users.length < 200) {
        break;
      }
    }

    throw new Error(`Unable to ensure official auth user ${email}: ${error.message}`);
  }

  throw new Error(`Unable to ensure official auth user ${email}`);
}

async function run() {
  const [{ db, queryClient }, { trainers, searchQueries, tags, queriesToTags }] = await Promise.all([
    import("../src/db/index.js"),
    import("../src/db/schema.js"),
  ]);

  try {
    const officialEmail = getOfficialSeedEmail();
    const officialAuthId = await ensureOfficialAuthUserId(officialEmail);
    const now = new Date();

    await db
      .insert(trainers)
      .values({
        id: officialAuthId,
        userId: officialAuthId,
        username: "PokeQueryOfficial",
        visibleUsername: "pokequery",
        team: null,
        level: null,
        trainerCode: null,
        avatarUrl: buildDiceBearAvatarUrl("PokeQueryOfficial"),
        isProfilePublic: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: trainers.id,
        set: {
          userId: officialAuthId,
          username: "PokeQueryOfficial",
          visibleUsername: "pokequery",
          team: null,
          level: null,
          trainerCode: null,
          avatarUrl: buildDiceBearAvatarUrl("PokeQueryOfficial"),
          isProfilePublic: true,
          updatedAt: now,
        },
      });

    let insertedCount = 0;
    let updatedCount = 0;

    for (const entry of productionSeedQueries) {
      const source = entry.source ?? "official";
      const metadata = {
        ...generateMetadata(entry.query),
        source,
        seedKey: entry.key,
      };

      const tagNames = Array.from(
        new Set([
          ...(entry.tags ?? []),
          source === "official" ? "official" : "community-curated",
          "production-seeded",
        ]),
      );

      const [existing] = await db
        .select({ id: searchQueries.id })
        .from(searchQueries)
        .where(
          and(
            eq(searchQueries.creatorId, officialAuthId),
            sql`${searchQueries.metadata}->>'seedKey' = ${entry.key}`,
          ),
        )
        .limit(1);

      let queryId: string;

      if (existing?.id) {
        queryId = existing.id;
        updatedCount += 1;

        await db
          .update(searchQueries)
          .set({
            title: entry.title,
            query: entry.query,
            description: `[seed:prod:${source}] ${entry.description}`,
            creatorId: officialAuthId,
            isPublic: entry.isPublic ?? true,
            metadata,
            updatedAt: now,
          })
          .where(eq(searchQueries.id, existing.id));
      } else {
        const [created] = await db
          .insert(searchQueries)
          .values({
            title: entry.title,
            query: entry.query,
            description: `[seed:prod:${source}] ${entry.description}`,
            creatorId: officialAuthId,
            isPublic: entry.isPublic ?? true,
            copyCount: entry.copyCount ?? 0,
            metadata,
          })
          .returning({ id: searchQueries.id });

        if (!created?.id) {
          continue;
        }

        queryId = created.id;
        insertedCount += 1;
      }

      await db.delete(queriesToTags).where(eq(queriesToTags.queryId, queryId));

      if (!queryId || tagNames.length === 0) {
        continue;
      }

      for (const tagNameRaw of tagNames) {
        const tagName = tagNameRaw.toLowerCase();
        const [insertedTag] = await db
          .insert(tags)
          .values({ name: tagName })
          .onConflictDoNothing()
          .returning({ id: tags.id });

        let tagId = insertedTag?.id;
        if (!tagId) {
          const [existingTag] = await db
            .select({ id: tags.id })
            .from(tags)
            .where(eq(tags.name, tagName));
          tagId = existingTag?.id;
        }

        if (tagId) {
          await db.insert(queriesToTags).values({ queryId, tagId }).onConflictDoNothing();
        }
      }
    }

    console.log(
      `Production seed complete: ${insertedCount} inserted, ${updatedCount} updated. Existing copy/favorite history preserved.`,
    );
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error("Failed to seed production search queries", error);
  process.exitCode = 1;
});
