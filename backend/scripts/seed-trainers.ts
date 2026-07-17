import { config } from "dotenv";
import { resolve } from "node:path";
import { inArray } from "drizzle-orm";
import { assertQaLocalOnlySeedScript } from "./lib/seed-environment.js";

config({ path: resolve(process.cwd(), ".env"), quiet: true });
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/postgres";
assertQaLocalOnlySeedScript("db:seed:trainers");

const teams = ["mystic", "valor", "instinct"] as const;

type Team = (typeof teams)[number];

type SeedAuthUser = {
  id: string;
  email: string;
  username: string;
  isOfficial: boolean;
};

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

function sanitizeUsernamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

function buildDiceBearAvatarUrl(seed: string): string {
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodedSeed}`;
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

function getSeedEmailDomain(): string {
  return process.env.SEED_EMAIL_DOMAIN?.trim() || "seed.pokequery.local";
}

function getCommunitySeedCount(): number {
  const raw = Number.parseInt(process.env.SEED_COMMUNITY_ACCOUNT_COUNT ?? "4", 10);
  if (Number.isNaN(raw) || raw < 0) {
    return 4;
  }

  return Math.min(raw, 25);
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const { getSupabaseAdmin } = await import("../src/lib/supabase.js");
  const admin = getSupabaseAdmin();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const match = users.find((user) => (user.email ?? "").toLowerCase() === email.toLowerCase());
    if (match?.id) {
      return match.id;
    }

    if (users.length < 200) {
      return null;
    }
  }

  return null;
}

async function ensureAuthUser(email: string): Promise<string> {
  const { getSupabaseAdmin } = await import("../src/lib/supabase.js");
  const admin = getSupabaseAdmin();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      seeded: true,
      source: "seed-trainers-script",
    },
  });

  if (data?.user?.id) {
    return data.user.id;
  }

  if (!error) {
    throw new Error(`Supabase createUser returned no user for ${email}`);
  }

  const existingId = await findAuthUserIdByEmail(email);
  if (existingId) {
    return existingId;
  }

  throw new Error(`Unable to ensure seeded auth user for ${email}: ${error.message}`);
}

async function ensureSeedAuthUsers(): Promise<SeedAuthUser[]> {
  const officialEmail =
    process.env.SEED_OFFICIAL_EMAIL?.trim() || `official@${getSeedEmailDomain()}`;
  const communityCount = getCommunitySeedCount();
  const communityEmailPrefix =
    process.env.SEED_COMMUNITY_EMAIL_PREFIX?.trim() || "community";

  const seedTargets: Array<{ email: string; username: string; isOfficial: boolean }> = [
    {
      email: officialEmail,
      username: "PokeQueryOfficial",
      isOfficial: true,
    },
    ...Array.from({ length: communityCount }, (_, index) => ({
      email: `${communityEmailPrefix}.${index + 1}@${getSeedEmailDomain()}`,
      username: `seed_community_${index + 1}`,
      isOfficial: false,
    })),
  ];

  const ensured = await Promise.all(
    seedTargets.map(async (target) => ({
      id: await ensureAuthUser(target.email),
      email: target.email,
      username: sanitizeUsernamePart(target.username),
      isOfficial: target.isOfficial,
    })),
  );

  return ensured;
}

async function run() {
  const [{ db, queryClient }, { _authUsers, trainers }] = await Promise.all([
    import("../src/db/index.js"),
    import("../src/db/schema.js"),
  ]);

  try {
    const candidateUserIds = getCandidateUserIds();
    const seedAuthUsers = await ensureSeedAuthUsers();

    const authUsersById = new Map<string, SeedAuthUser>();
    for (const user of seedAuthUsers) {
      authUsersById.set(user.id, user);
    }

    if (candidateUserIds.length > 0) {
      const existingAuthUsers = await db
        .select({ id: _authUsers.id })
        .from(_authUsers)
        .where(inArray(_authUsers.id, candidateUserIds));

      for (const [index, user] of existingAuthUsers.entries()) {
        if (!authUsersById.has(user.id)) {
          authUsersById.set(user.id, {
            id: user.id,
            email: "",
            username: buildSeedUsername(user.id, index),
            isOfficial: false,
          });
        }
      }
    }

    const authUsersToSeed = Array.from(authUsersById.values());

    if (authUsersToSeed.length === 0) {
      console.log(
        "No auth users available to seed trainers. Configure Supabase env vars and rerun.",
      );
      return;
    }

    const now = new Date();

    for (const [index, user] of authUsersToSeed.entries()) {
      const team: Team = teams[index % teams.length];
      const username = user.username || buildSeedUsername(user.id, index);
      const avatarUrl = buildDiceBearAvatarUrl(username);
      const isProfilePublic = user.isOfficial ? true : index !== 0;
      const seededTeam = user.isOfficial ? null : team;
      const seededLevel = user.isOfficial ? null : 20 + ((index * 7) % 31);
      const seededTrainerCode = user.isOfficial ? null : formatTrainerCode(index + 1);

      await db
        .insert(trainers)
        .values({
          id: user.id,
          userId: user.id,
          username,
          team: seededTeam,
          level: seededLevel,
          trainerCode: seededTrainerCode,
          avatarUrl,
          isProfilePublic,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: trainers.id,
          set: {
            userId: user.id,
            username,
            team: seededTeam,
            level: seededLevel,
            trainerCode: seededTrainerCode,
            avatarUrl,
            isProfilePublic,
            updatedAt: now,
          },
        });
    }

    const officialCount = authUsersToSeed.filter((user) => user.isOfficial).length;
    console.log(
      `Seeded ${authUsersToSeed.length} trainer profiles (${officialCount} official owner account).`,
    );
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error("Failed to seed trainers", error);
  process.exitCode = 1;
});
