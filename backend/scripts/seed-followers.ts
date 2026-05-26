import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env"), quiet: true });
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/postgres";

async function run() {
  const [{ db, queryClient }, { trainers, followers }] = await Promise.all([
    import("../src/db/index.js"),
    import("../src/db/schema.js"),
  ]);

  try {
    // Get all trainers
    const allTrainers = await db.select({ id: trainers.id }).from(trainers);
    if (allTrainers.length < 2) {
      console.log("Need at least 2 trainers to seed followers.");
      return;
    }

    // For each trainer, randomly follow 1-2 other trainers
    for (const trainer of allTrainers) {
      // Pick 1-2 random trainers to follow (not self)
      const others = allTrainers.filter((t) => t.id !== trainer.id);
      const numToFollow = Math.floor(Math.random() * 2) + 1; // 1 or 2
      const shuffled = others.sort(() => 0.5 - Math.random());
      const toFollow = shuffled.slice(0, numToFollow);
      for (const target of toFollow) {
        await db
          .insert(followers)
          .values({
            followerId: trainer.id,
            followedId: target.id,
          })
          .onConflictDoNothing();
      }
    }
    console.log("Seeded followers for trainers.");
  } finally {
    await queryClient.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error("Failed to seed followers", error);
  process.exitCode = 1;
});
