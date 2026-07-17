import { config } from "dotenv";
import { resolve } from "node:path";
import { sql, eq, like, ne, and } from "drizzle-orm";
import { assertQaLocalOnlySeedScript } from "./lib/seed-environment.js";

import { generateMetadata } from "../src/utils/pogo-parser.js";

config({ path: resolve(process.cwd(), ".env"), quiet: true });
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/postgres";
assertQaLocalOnlySeedScript("db:seed:search");

type SeedInput = {
  title: string;
  query: string;
  category: string;
  copyCount: number;
  source?: "official" | "community";
  isPublic?: boolean;
  tags?: string[];
};

const seedInputs: SeedInput[] = [
  // --- Filter coverage seeds ---
  {
    title: "Master League Meta",
    query: "cp-4000+&legendary&!mythical",
    category: "PvP",
    copyCount: 15,
    source: "official",
    tags: ["master-league", "pvp", "meta"],
  },
  {
    title: "Ultra League Staples",
    query: "cp-2500&!legendary&!mythical",
    category: "PvP",
    copyCount: 13,
    source: "official",
    tags: ["ultra-league", "pvp", "staples"],
  },
  {
    title: "Great League Favorites",
    query: "cp-1500&!legendary&!mythical",
    category: "PvP",
    copyCount: 18,
    source: "official",
    tags: ["great-league", "pvp", "favorites"],
  },
  {
    title: "Raid Boss Counters",
    query: "@move&type:dragon&4*",
    category: "Raid",
    copyCount: 20,
    source: "official",
    tags: ["raid", "boss", "dragon"],
  },
  {
    title: "Community Day All-Stars",
    query: "age0-2&@special&!shadow",
    category: "Community Day",
    copyCount: 17,
    source: "official",
    tags: ["community day", "daily-catch", "all-stars"],
  },
  {
    title: "Great League Core",
    query: "cp-1500&3*,4*&!shadow",
    category: "PvP",
    copyCount: 28,
    source: "official",
    tags: ["great league", "core", "pvp"],
  },
  {
    title: "Ultra League Starters",
    query: "cp-2500&3*,4*&!mythical",
    category: "PvP",
    copyCount: 22,
    source: "official",
    tags: ["ultra league", "starters", "pvp"],
  },
  {
    title: "Master League Projects",
    query: "cp2500-&4*&!traded",
    category: "PvP",
    copyCount: 19,
    source: "official",
    tags: ["master league", "projects", "pvp"],
  },
  {
    title: "Nundo Hunt - Recent",
    query: "0*&age0-14",
    category: "IV Hunt",
    copyCount: 17,
    tags: ["nundo", "hunt", "iv"],
  },
  {
    title: "High IV Shadows",
    query: "shadow&3*,4*&cp1000+",
    category: "IV Hunt",
    copyCount: 1500,
    tags: ["high iv", "shadow", "hunt"],
  },
  {
    title: "Raid Fire Counters",
    query: "@special&type:fire&3*,4*",
    category: "Raid",
    copyCount: 25,
    tags: ["raid", "fire", "counters"],
  },
  {
    title: "Raid Water Counters",
    query: "@move&type:water&3*,4*",
    category: "Raid",
    copyCount: 20,
    tags: ["raid", "water", "counters"],
  },
  {
    title: "Daily Catch Cleanup",
    query: "age0&!favorite&!shiny",
    category: "Utility",
    copyCount: 14,
  },
  {
    title: "Mass Evolve Tonight",
    query: "evolve&!favorite&cp-1000",
    category: "Utility",
    copyCount: 12,
  },
  {
    title: "Distance Trade Candidates",
    query: "distance1000-&!lucky&!traded",
    category: "Utility",
    copyCount: 10,
  },
  {
    title: "Community Day Keepers",
    query: "age0-2&3*,4*&!transfer",
    category: "Community Day",
    copyCount: 26,
  },
  {
    title: "Shiny Collection Lockbox",
    query: "shiny&favorite",
    category: "Collection",
    copyCount: 18,
  },
  { title: "Tiny Cup Candidates", query: "cp-500&3*,4*&!shadow", category: "PvP", copyCount: 11 },
  { title: "GL Safe Swaps", query: "cp-1500&@special&!legendary", category: "PvP", copyCount: 13 },
  {
    title: "XL Candy Targets",
    query: "distance10-&cp2000+&!mythical",
    category: "Utility",
    copyCount: 9,
  },
  { title: "Rocket Cleanup", query: "shadow&!purified&cp500+", category: "Utility", copyCount: 16 },
  {
    title: "Legacy Move Keepers",
    query: "@special&3*,4*&!trade",
    category: "Collection",
    copyCount: 15,
  },
  {
    title: "Lucky Trade Prep",
    query: "lucky&!favorite&cp-2000",
    category: "Utility",
    copyCount: 8,
  },
  {
    title: "Weather Boost Tracker",
    query: "age0-3&cp1000+&!traded",
    category: "Utility",
    copyCount: 7,
  },
  { title: "Raid Dragon Squad", query: "type:dragon&3*,4*&@move", category: "Raid", copyCount: 21 },
  { title: "Great League Budget", query: "cp-1500&2*,3*&!xl", category: "PvP", copyCount: 6 },
  {
    title: "Ultra League XL Goals",
    query: "cp-2500&3*,4*&distance50-",
    category: "PvP",
    copyCount: 5,
  },
  { title: "Transfer Queue", query: "0*,1*&!shiny&!favorite", category: "Utility", copyCount: 4 },
  {
    title: "Private Draft Team",
    query: "cp-1500&@special&shadow",
    category: "PvP",
    copyCount: 3,
    isPublic: false,
  },
];

async function run() {
  const [{ db, queryClient }, { searchQueries, trainers, favorites }] = await Promise.all([
    import("../src/db/index.js"),
    import("../src/db/schema.js"),
  ]);

  const now = Date.now();
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

  /** Random ms offset in [0, maxMs) */
  function randMs(maxMs: number) {
    return Math.floor(Math.random() * maxMs);
  }

  /** Random createdAt in the past 90 days, updatedAt between createdAt and now */
  function randomDates() {
    const createdAt = new Date(now - randMs(NINETY_DAYS_MS));
    const updatedAt = new Date(createdAt.getTime() + randMs(now - createdAt.getTime()));
    return { createdAt, updatedAt };
  }

  try {
    await db.delete(searchQueries).where(sql`${searchQueries.description} like '[seed] %'`);
    await db.delete(searchQueries).where(sql`${searchQueries.description} like '[seed:%'`);

    const [officialCreatorRow] = await db
      .select({ id: trainers.id })
      .from(trainers)
      .where(eq(trainers.username, "PokeQueryOfficial"))
      .limit(1);

    const seededCreatorRows = await db
      .select({ id: trainers.id })
      .from(trainers)
      .where(and(like(trainers.username, "seed_%"), ne(trainers.username, "PokeQueryOfficial")))
      .orderBy(trainers.createdAt);

    const additionalCreatorRows = await db
      .select({ id: trainers.id })
      .from(trainers)
      .orderBy(trainers.createdAt)
      .limit(50);

    const officialCreatorId = officialCreatorRow?.id;

    const creatorIds = Array.from(
      new Set(
        [...seededCreatorRows, ...additionalCreatorRows]
          .map((row) => row.id)
          .filter((id) => id !== officialCreatorId),
      ),
    );

    const communityCreatorIds =
      creatorIds.length > 0
        ? creatorIds
        : officialCreatorRow
          ? [officialCreatorRow.id]
          : [];

    const baseRows = seedInputs.map((seed, index) => ({
      title: seed.title,
      query: seed.query,
      description: `[seed:${seed.source ?? "community"}] ${seed.category} example`,
      creatorId:
        (seed.source ?? "community") === "official"
          ? (officialCreatorRow?.id ?? communityCreatorIds[0] ?? null)
          : (communityCreatorIds[index % communityCreatorIds.length] ?? null),
      isPublic: seed.isPublic ?? true,
      copyCount: seed.copyCount,
      metadata: {
        ...generateMetadata(seed.query),
        source: seed.source ?? "community",
      },
      tags: Array.from(
        new Set([...(seed.tags ?? []), (seed.source ?? "community") === "official" ? "official" : "community-curated"]),
      ),
      ...randomDates(),
    }));

    // Insert queries and collect their ids
    const inserted = await db
      .insert(searchQueries)
      .values(baseRows.map(({ tags, ...row }) => row))
      .returning({ id: searchQueries.id, title: searchQueries.title, query: searchQueries.query });

    // Insert tags and link to queries
    const { tags, queriesToTags } = await import("../src/db/schema.js");
    for (let i = 0; i < inserted.length; i++) {
      const row = inserted[i];
      const tagsArr = seedInputs[i].tags;
      if (tagsArr && tagsArr.length > 0) {
        for (const tag of tagsArr) {
          // Insert tag if not exists
          const [tagRow] = await db
            .insert(tags)
            .values({ name: tag.toLowerCase() })
            .onConflictDoNothing()
            .returning({ id: tags.id });
          // Get tag id (if not returned, select it)
          let tagId = tagRow?.id;
          if (!tagId) {
            const [existing] = await db
              .select({ id: tags.id })
              .from(tags)
              .where(eq(tags.name, tag.toLowerCase()));
            tagId = existing?.id;
          }
          if (tagId) {
            await db.insert(queriesToTags).values({ queryId: row.id, tagId }).onConflictDoNothing();
          }
        }
      }
    }

    const byTitle = new Map(inserted.map((row) => [row.title, row]));

    const forkSeeds = [
      { parentTitle: "Great League Core", title: "Forked GL Core - Shadow Variant", copyCount: 9 },
      { parentTitle: "Raid Fire Counters", title: "Forked Fire Counters - Budget", copyCount: 5 },
      {
        parentTitle: "Community Day Keepers",
        title: "Forked CD Keepers - Strict IV",
        copyCount: 7,
      },
      {
        parentTitle: "Shiny Collection Lockbox",
        title: "Forked Shiny Lockbox - Trade Safe",
        copyCount: 4,
      },
      { parentTitle: "High IV Shadows", title: "Forked Shadows - PvE Focus", copyCount: 6 },
      {
        parentTitle: "Raid Dragon Squad",
        title: "Forked Dragon Squad - Mixed Types",
        copyCount: 3,
      },
    ];

    const forkRows = forkSeeds
      .map((fork, index) => {
        const parent = byTitle.get(fork.parentTitle);
        if (!parent) {
          return null;
        }

        return {
          title: fork.title,
          query: parent.query,
          description: `[seed] Fork example from ${fork.parentTitle}`,
          creatorId:
            creatorIds.length > 0
              ? creatorIds[(seedInputs.length + index) % creatorIds.length]
              : null,
          isPublic: true,
          copyCount: fork.copyCount,
          parentQueryId: parent.id,
          originalQuerySnapshot: parent.query,
          metadata: generateMetadata(parent.query),
          ...randomDates(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const forkedInserted =
      forkRows.length > 0
        ? await db
            .insert(searchQueries)
            .values(forkRows)
            .returning({ id: searchQueries.id, title: searchQueries.title })
        : [];

    const seededQueries = [...inserted, ...forkedInserted];
    const favoriteTargets = seededQueries.filter(
      (_, index) => seedInputs[index]?.isPublic !== false || index >= inserted.length,
    );

    const seededFavoriteRows = favoriteTargets.flatMap((row, index) => {
      if (creatorIds.length === 0) {
        return [];
      }

      const favoriteTotal = 1 + (index % Math.min(5, creatorIds.length));
      return Array.from({ length: favoriteTotal }, (_, favoriteIndex) => ({
        trainerId: creatorIds[(index + favoriteIndex) % creatorIds.length],
        queryId: row.id,
        createdAt: new Date(now - (index * 5 + favoriteIndex) * 60 * 60 * 1000),
      }));
    });

    if (seededFavoriteRows.length > 0) {
      await db.insert(favorites).values(seededFavoriteRows);
    }

    const publicCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(searchQueries)
      .where(sql`${searchQueries.description} like '[seed%' and ${searchQueries.isPublic} = true`);

    const privateCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(searchQueries)
      .where(sql`${searchQueries.description} like '[seed%' and ${searchQueries.isPublic} = false`);

    const totalSeeded = (publicCountResult[0]?.count ?? 0) + (privateCountResult[0]?.count ?? 0);
    const favoriteSeedCount = seededFavoriteRows.length;

    console.log(
      `Seed complete: ${totalSeeded} search queries (${publicCountResult[0]?.count ?? 0} public, ${privateCountResult[0]?.count ?? 0} private) and ${favoriteSeedCount} favorites. Official strings are owned by PokeQueryOfficial.`,
    );
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error("Failed to seed search queries", error);
  process.exitCode = 1;
});
