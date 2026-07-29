import { desc, eq, sql } from "drizzle-orm";
import type { FastifyTypebox } from "../../types/fastify.js";
import { followers, trainers } from "../../db/schema.js";
import { isProfileCompleted, resolveDisplayName, toPublicTrainerProfile } from "./users-helpers.js";
import {
  ensureTrainerProfileExists,
  getBootstrapTrainerUsername,
} from "../../lib/trainer-bootstrap.js";

export type VisibleUsername = "pokequery" | "pogo";

export async function getTrainerIdByUserId(fastify: FastifyTypebox, userId: string) {
  const [trainer] = await fastify.db
    .select({ id: trainers.id })
    .from(trainers)
    .where(eq(trainers.userId, userId));

  return trainer?.id ?? null;
}

export async function loadMeProfile(fastify: FastifyTypebox, userId: string, email: string | null) {
  const [row] = await fastify.db
    .select({
      id: trainers.id,
      username: trainers.username,
      role: trainers.role,
      pogoUsername: trainers.pogoUsername,
      visibleUsername: trainers.visibleUsername,
      team: trainers.team,
      level: trainers.level,
      trainerCode: trainers.trainerCode,
      isProfilePublic: trainers.isProfilePublic,
      deactivatedAt: trainers.deactivatedAt,
      avatarUrl: trainers.avatarUrl,
      queryCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM pokequery.search_queries sq
        WHERE sq.creator_id = ${trainers.id}
      )`.as("queryCount"),
      favoriteCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM pokequery.favorites f
        WHERE f.trainer_id = ${trainers.id}
      )`.as("favoriteCount"),
      followerCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM pokequery.followers fr
        WHERE fr.followed_id = ${trainers.id}
      )`.as("followerCount"),
      forkCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM pokequery.search_queries sq
        WHERE sq.creator_id = ${trainers.id}
          AND sq.parent_query_id IS NOT NULL
      )`.as("forkCount"),
    })
    .from(trainers)
    .where(eq(trainers.userId, userId));

  if (!row) {
    await ensureTrainerProfileExists(fastify, { id: userId });

    const bootstrapUsername = getBootstrapTrainerUsername(userId);

    return {
      hasTrainer: true,
      profileCompleted: false,
      id: userId,
      email,
      username: bootstrapUsername,
      displayName: bootstrapUsername,
      role: "member" as const,
      pogoUsername: null,
      visibleUsername: "pokequery" as const,
      team: null,
      level: null,
      trainerCode: null,
      isProfilePublic: false,
      deactivatedAt: null,
      avatarUrl: null,
      queryCount: 0,
      favoriteCount: 0,
      followerCount: 0,
      forkCount: 0,
    };
  }

  const profileCompleted = isProfileCompleted({
    hasTrainer: true,
    username: row.username,
    team: row.team,
    level: row.level,
    trainerCode: row.trainerCode,
  });

  return {
    hasTrainer: true,
    profileCompleted,
    email,
    ...row,
    displayName: resolveDisplayName(row),
    role: row.role === "admin" ? ("admin" as const) : ("member" as const),
    team: row.team as "mystic" | "valor" | "instinct" | null,
    trainerCode: row.trainerCode,
    visibleUsername: row.visibleUsername as VisibleUsername,
    isProfilePublic: row.isProfilePublic,
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
  };
}

export async function getFollowersForTrainer(fastify: FastifyTypebox, trainerId: string) {
  const rows = await fastify.db
    .select({
      id: trainers.id,
      username: trainers.username,
      pogoUsername: trainers.pogoUsername,
      visibleUsername: trainers.visibleUsername,
      team: trainers.team,
      level: trainers.level,
      trainerCode: trainers.trainerCode,
      isProfilePublic: trainers.isProfilePublic,
      avatarUrl: trainers.avatarUrl,
      followedAt: followers.createdAt,
    })
    .from(followers)
    .innerJoin(trainers, eq(trainers.id, followers.followerId))
    .where(eq(followers.followedId, trainerId))
    .orderBy(desc(followers.createdAt));

  return rows.map((row) => {
    const publicProfile = toPublicTrainerProfile(row);

    return {
      id: row.id,
      username: row.username,
      displayName: resolveDisplayName(row),
      team: publicProfile.team,
      level: publicProfile.level,
      trainerCode: publicProfile.trainerCode,
      avatarUrl: row.avatarUrl,
      followedAt: row.followedAt.toISOString(),
    };
  });
}

export async function getFollowingForTrainer(fastify: FastifyTypebox, trainerId: string) {
  const rows = await fastify.db
    .select({
      id: trainers.id,
      username: trainers.username,
      pogoUsername: trainers.pogoUsername,
      visibleUsername: trainers.visibleUsername,
      team: trainers.team,
      level: trainers.level,
      trainerCode: trainers.trainerCode,
      isProfilePublic: trainers.isProfilePublic,
      avatarUrl: trainers.avatarUrl,
      followedAt: followers.createdAt,
    })
    .from(followers)
    .innerJoin(trainers, eq(trainers.id, followers.followedId))
    .where(eq(followers.followerId, trainerId))
    .orderBy(desc(followers.createdAt));

  return rows.map((row) => {
    const publicProfile = toPublicTrainerProfile(row);

    return {
      id: row.id,
      username: row.username,
      displayName: resolveDisplayName(row),
      team: publicProfile.team,
      level: publicProfile.level,
      trainerCode: publicProfile.trainerCode,
      avatarUrl: row.avatarUrl,
      followedAt: row.followedAt.toISOString(),
    };
  });
}
