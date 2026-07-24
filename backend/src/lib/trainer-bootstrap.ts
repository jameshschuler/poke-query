import { trainers } from "../db/schema.js";
import type { FastifyTypebox } from "../types/fastify.js";

export function getBootstrapTrainerUsername(userId: string) {
  const compactId = userId.replace(/-/g, "");
  // Keep bootstrap usernames <= 20 chars to satisfy stricter DB constraints.
  const seed = compactId.length <= 12 ? compactId : compactId.slice(0, 6) + compactId.slice(-6);
  return `trainer_${seed}`;
}

export async function ensureTrainerProfileExists(
  fastify: FastifyTypebox,
  user: { id: string },
): Promise<void> {
  await fastify.db
    .insert(trainers)
    .values({
      id: user.id,
      userId: user.id,
      username: getBootstrapTrainerUsername(user.id),
    })
    .onConflictDoNothing();
}
