import { trainers } from "../db/schema.js";
import type { FastifyTypebox } from "../types/fastify.js";

const MAX_USERNAME_ATTEMPTS = 5;
const TRAINER_USERNAME_PREFIX = "trainer_";
const MAX_TRAINER_USERNAME_LENGTH = 20;

function getBootstrapTrainerUsernameForAttempt(userId: string, attempt: number) {
  const compactId = userId.replace(/-/g, "");
  const seed = compactId.length <= 12 ? compactId : compactId.slice(0, 6) + compactId.slice(-6);

  if (attempt === 0) {
    return `${TRAINER_USERNAME_PREFIX}${seed}`;
  }

  const suffix = `_${attempt}`;
  const maxSeedLength =
    MAX_TRAINER_USERNAME_LENGTH - TRAINER_USERNAME_PREFIX.length - suffix.length;
  const truncatedSeed = seed.slice(0, Math.max(1, maxSeedLength));

  return `${TRAINER_USERNAME_PREFIX}${truncatedSeed}${suffix}`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function isNotNullViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23502"
  );
}

export function getBootstrapTrainerUsername(userId: string) {
  return getBootstrapTrainerUsernameForAttempt(userId, 0);
}

export async function ensureTrainerProfileExists(
  fastify: FastifyTypebox,
  user: { id: string },
): Promise<void> {
  for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt += 1) {
    try {
      await fastify.db
        .insert(trainers)
        .values({
          id: user.id,
          userId: user.id,
          username: getBootstrapTrainerUsernameForAttempt(user.id, attempt),
          isProfilePublic: false,
        })
        .onConflictDoNothing({ target: trainers.userId });

      return;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < MAX_USERNAME_ATTEMPTS - 1) {
        continue;
      }

      if (isNotNullViolation(error)) {
        // Another request likely inserted the same user row concurrently.
        return;
      }

      throw error;
    }
  }

  throw new Error("Could not bootstrap trainer profile for authenticated user.");
}
