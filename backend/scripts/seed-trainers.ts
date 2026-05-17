import { config } from "dotenv";
import { resolve } from "node:path";
import { inArray } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env"), quiet: true });
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/postgres";

const teams = ["mystic", "valor", "instinct"] as const;

type Team = (typeof teams)[number];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function formatTrainerCode(index: number): string {
  const base = 10000000 + index * 137;
  const value = String(base).slice(0, 8);
  return `${value.slice(0, 4)} ${value.slice(4)}`;
}

function buildSeedUsername(userId: string, index: number): string {
  const suffix = userId.replace(/-/g, "").slice(0, 8);
  return `seed_${index + 1}_${suffix}`;
}

function getCandidateUserIds(): string[] {
  const fromList = (process.env.SEED_TRAINER_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const fromIntegration = [
    process.env.INTEGRATION_TEST_USER_ID,
    process.env.INTEGRATION_TEST_OTHER_USER_ID,
  ].filter((value): value is string => Boolean(value && value.trim().length > 0));

  return unique([...fromIntegration, ...fromList]);
}

async function run() {
  const [{ db, queryClient }, { _authUsers, trainers }] = await Promise.all([
    import("../src/db/index.js"),
    import("../src/db/schema.js"),
  ]);

  try {
    const candidateUserIds = getCandidateUserIds();

    if (candidateUserIds.length === 0) {
      console.log(
        "No candidate user IDs found. Set SEED_TRAINER_USER_IDS in .env (comma-separated UUIDs) to seed trainers.",
      );
      return;
    }

    const existingAuthUsers = await db
      .select({ id: _authUsers.id })
      .from(_authUsers)
      .where(inArray(_authUsers.id, candidateUserIds));

    if (existingAuthUsers.length === 0) {
      console.log(
        "No matching auth.users rows found for provided IDs. Create users first, then run this script again.",
      );
      return;
    }

    const now = new Date();

    for (const [index, user] of existingAuthUsers.entries()) {
      const team: Team = teams[index % teams.length];
      const username = buildSeedUsername(user.id, index);
      const isProfilePublic = index === 0 ? false : true;

      await db
        .insert(trainers)
        .values({
          id: user.id,
          userId: user.id,
          username,
          team,
          level: 20 + ((index * 7) % 31),
          trainerCode: formatTrainerCode(index + 1),
          avatarUrl: null,
          isProfilePublic,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: trainers.id,
          set: {
            userId: user.id,
            username,
            team,
            level: 20 + ((index * 7) % 31),
            trainerCode: formatTrainerCode(index + 1),
            isProfilePublic,
            updatedAt: now,
          },
        });
    }

    console.log(`Seeded ${existingAuthUsers.length} trainer profiles.`);
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error("Failed to seed trainers", error);
  process.exitCode = 1;
});
