import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { alias } from "drizzle-orm/pg-core";
import { and, count, desc, eq, gte, or, sql } from "drizzle-orm";
import { reportActions, reports, searchQueries, trainers } from "../../db/schema.js";
import type { FastifyTypebox } from "../../types/fastify.js";
import {
  GetModerationAccessSchema,
  GetModerationReportDetailSchema,
  GetModerationReportsSchema,
  SubmitReportSchema,
  UpdateModerationReportStatusSchema,
} from "./moderation.schema.js";

function resolveDisplayName(row: {
  username: string | null;
  pogoUsername: string | null;
  visibleUsername: string | null;
}): string {
  if (row.visibleUsername === "pogo" && row.pogoUsername?.trim()) {
    return row.pogoUsername.trim();
  }

  return row.username ?? "Unknown trainer";
}

function getReviewerUserIds(): Set<string> {
  const configured =
    process.env.MODERATION_REVIEWER_USER_IDS ?? process.env.MODERATOR_USER_IDS ?? "";

  return new Set(
    configured
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function isReviewerUser(userId: string): boolean {
  return getReviewerUserIds().has(userId);
}

function getReportSubmissionCooldownMinutes(): number {
  const parsed = Number(process.env.REPORT_SUBMISSION_COOLDOWN_MINUTES ?? "10");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 10;
  }

  return Math.floor(parsed);
}

export async function moderationRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/access",
    { preHandler: [fastify.authenticate], schema: GetModerationAccessSchema },
    async (request) => {
      return { isReviewer: isReviewerUser(request.user.id) };
    },
  );

  server.post(
    "/reports",
    { preHandler: [fastify.authenticate], schema: SubmitReportSchema },
    async (request, reply) => {
      const reporterTrainerId = request.user.id;
      const { targetType, targetId, reason, details } = request.body;
      const cooldownMinutes = getReportSubmissionCooldownMinutes();
      const cooldownStart = new Date(Date.now() - cooldownMinutes * 60_000);

      const duplicateWhere =
        targetType === "query"
          ? and(
              eq(reports.reporterTrainerId, reporterTrainerId),
              eq(reports.targetType, "query"),
              eq(reports.targetQueryId, targetId),
              or(eq(reports.status, "open"), eq(reports.status, "in_review")),
              gte(reports.createdAt, cooldownStart),
            )
          : and(
              eq(reports.reporterTrainerId, reporterTrainerId),
              eq(reports.targetType, "trainer"),
              eq(reports.targetTrainerId, targetId),
              or(eq(reports.status, "open"), eq(reports.status, "in_review")),
              gte(reports.createdAt, cooldownStart),
            );

      const [duplicate] = await fastify.db
        .select({ id: reports.id })
        .from(reports)
        .where(duplicateWhere)
        .limit(1);

      if (duplicate) {
        return reply.code(409).send({
          error: `A report for this target is already pending review. Try again in ${cooldownMinutes} minutes.`,
        });
      }

      if (targetType === "query") {
        const [queryTarget] = await fastify.db
          .select({
            id: searchQueries.id,
            title: searchQueries.title,
            creatorId: searchQueries.creatorId,
          })
          .from(searchQueries)
          .where(and(eq(searchQueries.id, targetId), eq(searchQueries.isPublic, true)))
          .limit(1);

        if (!queryTarget) {
          return reply.code(404).send({ error: "Query not found or not reportable" });
        }

        if (queryTarget.creatorId === reporterTrainerId) {
          return reply.code(400).send({ error: "You cannot report your own query" });
        }

        const [createdReport] = await fastify.db
          .insert(reports)
          .values({
            reporterTrainerId,
            targetType,
            targetQueryId: targetId,
            reason,
            details: details?.trim() ? details.trim() : null,
            status: "open",
          })
          .returning({ id: reports.id, status: reports.status });

        if (!createdReport) {
          return reply.code(400).send({ error: "Failed to submit report" });
        }

        await fastify.db.insert(reportActions).values({
          reportId: createdReport.id,
          actorTrainerId: reporterTrainerId,
          action: "submitted",
          fromStatus: null,
          toStatus: "open",
          comment: null,
        });

        return reply.code(201).send(createdReport);
      }

      const [trainerTarget] = await fastify.db
        .select({
          id: trainers.id,
          isProfilePublic: trainers.isProfilePublic,
          deactivatedAt: trainers.deactivatedAt,
        })
        .from(trainers)
        .where(eq(trainers.id, targetId))
        .limit(1);

      if (!trainerTarget || !trainerTarget.isProfilePublic || trainerTarget.deactivatedAt) {
        return reply.code(404).send({ error: "Trainer not found or not reportable" });
      }

      if (trainerTarget.id === reporterTrainerId) {
        return reply.code(400).send({ error: "You cannot report your own profile" });
      }

      const [createdReport] = await fastify.db
        .insert(reports)
        .values({
          reporterTrainerId,
          targetType,
          targetTrainerId: targetId,
          reason,
          details: details?.trim() ? details.trim() : null,
          status: "open",
        })
        .returning({ id: reports.id, status: reports.status });

      if (!createdReport) {
        return reply.code(400).send({ error: "Failed to submit report" });
      }

      await fastify.db.insert(reportActions).values({
        reportId: createdReport.id,
        actorTrainerId: reporterTrainerId,
        action: "submitted",
        fromStatus: null,
        toStatus: "open",
        comment: null,
      });

      return reply.code(201).send(createdReport);
    },
  );

  server.get(
    "/reports",
    { preHandler: [fastify.authenticate], schema: GetModerationReportsSchema },
    async (request, reply) => {
      if (!isReviewerUser(request.user.id)) {
        return reply.code(403).send({ error: "Reviewer access required" });
      }

      const limit = Math.min(100, Math.max(1, request.query.limit ?? 20));
      const offset = Math.max(0, request.query.offset ?? 0);

      const whereClauses = [];
      if (request.query.status) {
        whereClauses.push(eq(reports.status, request.query.status));
      }
      if (request.query.targetType) {
        whereClauses.push(eq(reports.targetType, request.query.targetType));
      }

      const reporter = alias(trainers, "reporter");
      const reviewer = alias(trainers, "reviewer");
      const targetTrainer = alias(trainers, "target_trainer");

      const rows = await fastify.db
        .select({
          id: reports.id,
          targetType: reports.targetType,
          targetQueryId: reports.targetQueryId,
          targetTrainerId: reports.targetTrainerId,
          targetQueryTitle: searchQueries.title,
          targetTrainerUsername: targetTrainer.username,
          reason: reports.reason,
          details: reports.details,
          status: reports.status,
          createdAt: reports.createdAt,
          updatedAt: reports.updatedAt,
          reporterId: reporter.id,
          reporterUsername: reporter.username,
          reporterPogoUsername: reporter.pogoUsername,
          reporterVisibleUsername: reporter.visibleUsername,
          reviewedById: reviewer.id,
          reviewedByUsername: reviewer.username,
          reviewedByPogoUsername: reviewer.pogoUsername,
          reviewedByVisibleUsername: reviewer.visibleUsername,
        })
        .from(reports)
        .leftJoin(reporter, eq(reporter.id, reports.reporterTrainerId))
        .leftJoin(reviewer, eq(reviewer.id, reports.reviewedByTrainerId))
        .leftJoin(searchQueries, eq(searchQueries.id, reports.targetQueryId))
        .leftJoin(targetTrainer, eq(targetTrainer.id, reports.targetTrainerId))
        .where(whereClauses.length > 0 ? and(...whereClauses) : sql`true`)
        .orderBy(desc(reports.createdAt))
        .limit(limit)
        .offset(offset);

      const [totals] = await fastify.db
        .select({ total: count() })
        .from(reports)
        .where(whereClauses.length > 0 ? and(...whereClauses) : sql`true`);

      const total = totals?.total ?? 0;
      const nextOffset = offset + rows.length < total ? offset + rows.length : null;

      return {
        reports: rows.map((row) => ({
          id: row.id,
          targetType: row.targetType as "query" | "trainer",
          reason: row.reason,
          details: row.details,
          status: row.status as "open" | "in_review" | "resolved" | "dismissed",
          target: {
            queryId: row.targetQueryId,
            trainerId: row.targetTrainerId,
            label:
              row.targetType === "query"
                ? (row.targetQueryTitle ?? "Unknown query")
                : (row.targetTrainerUsername ?? "Unknown trainer"),
          },
          reporter: row.reporterId
            ? {
                id: row.reporterId,
                username: row.reporterUsername ?? "unknown",
                displayName: resolveDisplayName({
                  username: row.reporterUsername,
                  pogoUsername: row.reporterPogoUsername,
                  visibleUsername: row.reporterVisibleUsername,
                }),
              }
            : null,
          reviewedBy: row.reviewedById
            ? {
                id: row.reviewedById,
                username: row.reviewedByUsername ?? "unknown",
                displayName: resolveDisplayName({
                  username: row.reviewedByUsername,
                  pogoUsername: row.reviewedByPogoUsername,
                  visibleUsername: row.reviewedByVisibleUsername,
                }),
              }
            : null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
        pagination: {
          limit,
          offset,
          nextOffset,
          hasMore: nextOffset !== null,
          total,
        },
      };
    },
  );

  server.get(
    "/reports/:id",
    { preHandler: [fastify.authenticate], schema: GetModerationReportDetailSchema },
    async (request, reply) => {
      if (!isReviewerUser(request.user.id)) {
        return reply.code(403).send({ error: "Reviewer access required" });
      }

      const { id } = request.params;

      const reporter = alias(trainers, "reporter");
      const reviewer = alias(trainers, "reviewer");
      const targetTrainer = alias(trainers, "target_trainer");

      const [reportRow] = await fastify.db
        .select({
          id: reports.id,
          targetType: reports.targetType,
          targetQueryId: reports.targetQueryId,
          targetTrainerId: reports.targetTrainerId,
          targetQueryTitle: searchQueries.title,
          targetTrainerUsername: targetTrainer.username,
          reason: reports.reason,
          details: reports.details,
          status: reports.status,
          createdAt: reports.createdAt,
          updatedAt: reports.updatedAt,
          reporterId: reporter.id,
          reporterUsername: reporter.username,
          reporterPogoUsername: reporter.pogoUsername,
          reporterVisibleUsername: reporter.visibleUsername,
          reviewedById: reviewer.id,
          reviewedByUsername: reviewer.username,
          reviewedByPogoUsername: reviewer.pogoUsername,
          reviewedByVisibleUsername: reviewer.visibleUsername,
        })
        .from(reports)
        .leftJoin(reporter, eq(reporter.id, reports.reporterTrainerId))
        .leftJoin(reviewer, eq(reviewer.id, reports.reviewedByTrainerId))
        .leftJoin(searchQueries, eq(searchQueries.id, reports.targetQueryId))
        .leftJoin(targetTrainer, eq(targetTrainer.id, reports.targetTrainerId))
        .where(eq(reports.id, id))
        .limit(1);

      if (!reportRow) {
        return reply.code(404).send({ error: "Report not found" });
      }

      const actionActor = alias(trainers, "action_actor");
      const actionRows = await fastify.db
        .select({
          id: reportActions.id,
          action: reportActions.action,
          fromStatus: reportActions.fromStatus,
          toStatus: reportActions.toStatus,
          comment: reportActions.comment,
          createdAt: reportActions.createdAt,
          actorId: actionActor.id,
          actorUsername: actionActor.username,
          actorPogoUsername: actionActor.pogoUsername,
          actorVisibleUsername: actionActor.visibleUsername,
        })
        .from(reportActions)
        .leftJoin(actionActor, eq(actionActor.id, reportActions.actorTrainerId))
        .where(eq(reportActions.reportId, id))
        .orderBy(desc(reportActions.createdAt));

      return {
        report: {
          id: reportRow.id,
          targetType: reportRow.targetType as "query" | "trainer",
          reason: reportRow.reason,
          details: reportRow.details,
          status: reportRow.status as "open" | "in_review" | "resolved" | "dismissed",
          target: {
            queryId: reportRow.targetQueryId,
            trainerId: reportRow.targetTrainerId,
            label:
              reportRow.targetType === "query"
                ? (reportRow.targetQueryTitle ?? "Unknown query")
                : (reportRow.targetTrainerUsername ?? "Unknown trainer"),
          },
          reporter: reportRow.reporterId
            ? {
                id: reportRow.reporterId,
                username: reportRow.reporterUsername ?? "unknown",
                displayName: resolveDisplayName({
                  username: reportRow.reporterUsername,
                  pogoUsername: reportRow.reporterPogoUsername,
                  visibleUsername: reportRow.reporterVisibleUsername,
                }),
              }
            : null,
          reviewedBy: reportRow.reviewedById
            ? {
                id: reportRow.reviewedById,
                username: reportRow.reviewedByUsername ?? "unknown",
                displayName: resolveDisplayName({
                  username: reportRow.reviewedByUsername,
                  pogoUsername: reportRow.reviewedByPogoUsername,
                  visibleUsername: reportRow.reviewedByVisibleUsername,
                }),
              }
            : null,
          createdAt: reportRow.createdAt.toISOString(),
          updatedAt: reportRow.updatedAt.toISOString(),
        },
        actions: actionRows.map((action) => ({
          id: action.id,
          action: action.action as "submitted" | "status_changed" | "commented",
          fromStatus: action.fromStatus as "open" | "in_review" | "resolved" | "dismissed" | null,
          toStatus: action.toStatus as "open" | "in_review" | "resolved" | "dismissed" | null,
          comment: action.comment,
          actor: action.actorId
            ? {
                id: action.actorId,
                username: action.actorUsername ?? "unknown",
                displayName: resolveDisplayName({
                  username: action.actorUsername,
                  pogoUsername: action.actorPogoUsername,
                  visibleUsername: action.actorVisibleUsername,
                }),
              }
            : null,
          createdAt: action.createdAt.toISOString(),
        })),
      };
    },
  );

  server.patch(
    "/reports/:id/status",
    {
      preHandler: [fastify.authenticate],
      schema: UpdateModerationReportStatusSchema,
    },
    async (request, reply) => {
      if (!isReviewerUser(request.user.id)) {
        return reply.code(403).send({ error: "Reviewer access required" });
      }

      const { id } = request.params;
      const { status, comment } = request.body;

      const [existingReport] = await fastify.db
        .select({ id: reports.id, status: reports.status })
        .from(reports)
        .where(eq(reports.id, id))
        .limit(1);

      if (!existingReport) {
        return reply.code(404).send({ error: "Report not found" });
      }

      const now = new Date();

      const [updated] = await fastify.db
        .update(reports)
        .set({
          status,
          reviewedByTrainerId: request.user.id,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(reports.id, id))
        .returning({ id: reports.id, status: reports.status, updatedAt: reports.updatedAt });

      if (!updated) {
        return reply.code(404).send({ error: "Report not found" });
      }

      if (existingReport.status !== status) {
        await fastify.db.insert(reportActions).values({
          reportId: id,
          actorTrainerId: request.user.id,
          action: "status_changed",
          fromStatus: existingReport.status,
          toStatus: status,
          comment: comment?.trim() ? comment.trim() : null,
        });
      } else if (comment?.trim()) {
        await fastify.db.insert(reportActions).values({
          reportId: id,
          actorTrainerId: request.user.id,
          action: "commented",
          fromStatus: existingReport.status,
          toStatus: existingReport.status,
          comment: comment.trim(),
        });
      }

      return {
        id: updated.id,
        status: updated.status as "open" | "in_review" | "resolved" | "dismissed",
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
  );
}
