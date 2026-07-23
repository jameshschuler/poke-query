import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import {
  discoverEventRollups,
  discoverWeeklyPicks,
  searchQueries,
  trainers,
} from "../../db/schema.js";
import type { FastifyTypebox } from "../../types/fastify.js";
import {
  buildCommunityConditions,
  type CommunityRow,
  qualityScoreExpr,
  selectCommunityFields,
  toCommunityItem,
} from "../community/community.routes.js";
import {
  DeleteWeeklyPickSchema,
  GetWeeklyPicksSchema,
  MetricsSchema,
  MetricsSurfacingSchema,
  TrackMetricsSurfacingEventsSchema,
  UpsertWeeklyPickSchema,
} from "./metrics.schema.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

function toUtcDateOnly(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function toBucketDate(input: Date, minutes: number) {
  const bucketMs = minutes * 60_000;
  return new Date(Math.floor(input.getTime() / bucketMs) * bucketMs);
}

function stableDailyRank(seed: string, id: string) {
  const value = `${seed}:${id}`;
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    out.push(item);
  }

  return out;
}

async function isAdminRequest(fastify: FastifyTypebox, userId: string) {
  const [trainer] = await fastify.db
    .select({ role: trainers.role })
    .from(trainers)
    .where(eq(trainers.userId, userId))
    .limit(1);

  return trainer?.role === "admin";
}

function parseOptionalDate(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function metricsRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/surfacing/weekly-picks",
    { preHandler: [fastify.authenticate], schema: GetWeeklyPicksSchema },
    async (request, reply) => {
      const isAdmin = await isAdminRequest(fastify, request.user.id);
      if (!isAdmin) {
        return reply.code(403).send({ error: "Admin access required" });
      }

      const rows = await fastify.db
        .select({
          queryId: discoverWeeklyPicks.queryId,
          title: searchQueries.title,
          isPublic: searchQueries.isPublic,
          displayOrder: discoverWeeklyPicks.displayOrder,
          isActive: discoverWeeklyPicks.isActive,
          startsAt: discoverWeeklyPicks.startsAt,
          endsAt: discoverWeeklyPicks.endsAt,
          notes: discoverWeeklyPicks.notes,
          createdAt: discoverWeeklyPicks.createdAt,
          updatedAt: discoverWeeklyPicks.updatedAt,
        })
        .from(discoverWeeklyPicks)
        .innerJoin(searchQueries, eq(searchQueries.id, discoverWeeklyPicks.queryId))
        .orderBy(asc(discoverWeeklyPicks.displayOrder), desc(discoverWeeklyPicks.updatedAt));

      return reply.send({
        items: rows.map((row) => ({
          queryId: row.queryId,
          title: row.title,
          isPublic: row.isPublic,
          displayOrder: row.displayOrder,
          isActive: row.isActive,
          startsAt: row.startsAt ? row.startsAt.toISOString() : null,
          endsAt: row.endsAt ? row.endsAt.toISOString() : null,
          notes: row.notes,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
      });
    },
  );

  server.post(
    "/surfacing/weekly-picks",
    { preHandler: [fastify.authenticate], schema: UpsertWeeklyPickSchema },
    async (request, reply) => {
      const isAdmin = await isAdminRequest(fastify, request.user.id);
      if (!isAdmin) {
        return reply.code(403).send({ error: "Admin access required" });
      }

      const { queryId, displayOrder, isActive, startsAt, endsAt, notes } = request.body;

      if (!isUuid(queryId)) {
        return reply.code(400).send({ error: "queryId must be a valid UUID" });
      }

      const startsAtDate = parseOptionalDate(startsAt);
      const endsAtDate = parseOptionalDate(endsAt);

      if (startsAt && startsAtDate === null) {
        return reply.code(400).send({ error: "startsAt must be a valid date-time" });
      }

      if (endsAt && endsAtDate === null) {
        return reply.code(400).send({ error: "endsAt must be a valid date-time" });
      }

      if (startsAtDate && endsAtDate && startsAtDate > endsAtDate) {
        return reply.code(400).send({ error: "startsAt must be before endsAt" });
      }

      const [query] = await fastify.db
        .select({
          id: searchQueries.id,
          title: searchQueries.title,
          isPublic: searchQueries.isPublic,
        })
        .from(searchQueries)
        .where(eq(searchQueries.id, queryId))
        .limit(1);

      if (!query || !query.isPublic) {
        return reply.code(404).send({ error: "Public query not found" });
      }

      const [upserted] = await fastify.db
        .insert(discoverWeeklyPicks)
        .values({
          queryId,
          displayOrder: displayOrder ?? 0,
          isActive: isActive ?? true,
          startsAt: startsAtDate,
          endsAt: endsAtDate,
          notes: notes?.trim() ? notes.trim() : null,
        })
        .onConflictDoUpdate({
          target: discoverWeeklyPicks.queryId,
          set: {
            displayOrder: displayOrder ?? 0,
            isActive: isActive ?? true,
            startsAt: startsAtDate,
            endsAt: endsAtDate,
            notes: notes?.trim() ? notes.trim() : null,
            updatedAt: new Date(),
          },
        })
        .returning({
          queryId: discoverWeeklyPicks.queryId,
          displayOrder: discoverWeeklyPicks.displayOrder,
          isActive: discoverWeeklyPicks.isActive,
          startsAt: discoverWeeklyPicks.startsAt,
          endsAt: discoverWeeklyPicks.endsAt,
          notes: discoverWeeklyPicks.notes,
          createdAt: discoverWeeklyPicks.createdAt,
          updatedAt: discoverWeeklyPicks.updatedAt,
        });

      if (!upserted) {
        return reply.code(400).send({ error: "Could not upsert weekly pick" });
      }

      return reply.send({
        item: {
          queryId: upserted.queryId,
          title: query.title,
          isPublic: query.isPublic,
          displayOrder: upserted.displayOrder,
          isActive: upserted.isActive,
          startsAt: upserted.startsAt ? upserted.startsAt.toISOString() : null,
          endsAt: upserted.endsAt ? upserted.endsAt.toISOString() : null,
          notes: upserted.notes,
          createdAt: upserted.createdAt.toISOString(),
          updatedAt: upserted.updatedAt.toISOString(),
        },
      });
    },
  );

  server.delete(
    "/surfacing/weekly-picks/:queryId",
    { preHandler: [fastify.authenticate], schema: DeleteWeeklyPickSchema },
    async (request, reply) => {
      const isAdmin = await isAdminRequest(fastify, request.user.id);
      if (!isAdmin) {
        return reply.code(403).send({ error: "Admin access required" });
      }

      const { queryId } = request.params;
      if (!isUuid(queryId)) {
        return reply.code(404).send({ error: "Weekly pick not found" });
      }

      const [removed] = await fastify.db
        .delete(discoverWeeklyPicks)
        .where(eq(discoverWeeklyPicks.queryId, queryId))
        .returning({ queryId: discoverWeeklyPicks.queryId });

      if (!removed) {
        return reply.code(404).send({ error: "Weekly pick not found" });
      }

      return reply.send({ removedQueryId: removed.queryId });
    },
  );

  server.get("/surfacing", { schema: MetricsSurfacingSchema }, async (request, reply) => {
    const { filter, tag, search, railLimit } = request.query;
    const limit = railLimit ?? 6;
    const dateKey = new Date().toISOString().slice(0, 10);

    const trustedRows = await fastify.db
      .select(selectCommunityFields)
      .from(searchQueries)
      .leftJoin(trainers, eq(searchQueries.creatorId, trainers.id))
      .where(eq(searchQueries.isPublic, true))
      .orderBy(desc(qualityScoreExpr), desc(searchQueries.updatedAt))
      .limit(120);

    const trustedItems = trustedRows.map((row) => toCommunityItem(row as CommunityRow));

    const trustedHighQualityItems = trustedItems.filter((item) => item.qualityScore >= 1.1);

    const now = new Date();
    const weeklyPickRows = await fastify.db
      .select(selectCommunityFields)
      .from(discoverWeeklyPicks)
      .innerJoin(searchQueries, eq(searchQueries.id, discoverWeeklyPicks.queryId))
      .leftJoin(trainers, eq(searchQueries.creatorId, trainers.id))
      .where(
        and(
          eq(discoverWeeklyPicks.isActive, true),
          eq(searchQueries.isPublic, true),
          or(isNull(discoverWeeklyPicks.startsAt), lte(discoverWeeklyPicks.startsAt, now)),
          or(isNull(discoverWeeklyPicks.endsAt), gte(discoverWeeklyPicks.endsAt, now)),
        ),
      )
      .orderBy(asc(discoverWeeklyPicks.displayOrder), desc(discoverWeeklyPicks.updatedAt))
      .limit(limit);

    const weeklyPicks = uniqueById(
      weeklyPickRows.map((row) => toCommunityItem(row as CommunityRow)),
    );

    const allTimeTrusted = trustedHighQualityItems.slice(0, limit);

    const featuredToday = [...trustedHighQualityItems]
      .sort((a, b) => {
        const hashDiff = stableDailyRank(dateKey, a.id) - stableDailyRank(dateKey, b.id);
        if (hashDiff !== 0) {
          return hashDiff;
        }
        return b.qualityScore - a.qualityScore;
      })
      .slice(0, limit);

    const contextualConditions = buildCommunityConditions({
      filter,
      tag,
      search,
    });

    const contextualOrdering =
      filter === "new"
        ? desc(searchQueries.createdAt)
        : desc(sql<number>`(${qualityScoreExpr} * 0.75) + (
            CASE
              WHEN ${searchQueries.updatedAt} > NOW() - INTERVAL '21 days' THEN 1.2
              WHEN ${searchQueries.updatedAt} > NOW() - INTERVAL '60 days' THEN 0.5
              ELSE 0
            END
          )`);

    const contextualRows = await fastify.db
      .select(selectCommunityFields)
      .from(searchQueries)
      .leftJoin(trainers, eq(searchQueries.creatorId, trainers.id))
      .where(and(...contextualConditions))
      .orderBy(contextualOrdering)
      .limit(limit * 3);

    const contextualPicks = uniqueById(
      contextualRows.map((row) => toCommunityItem(row as CommunityRow)),
    )
      .filter((item) => !allTimeTrusted.some((trusted) => trusted.id === item.id))
      .slice(0, limit);

    return reply.send({
      weeklyPicks,
      featuredToday,
      allTimeTrusted,
      contextualPicks,
      generatedAt: new Date().toISOString(),
      dateKey,
    });
  });

  server.post(
    "/surfacing/events",
    { schema: TrackMetricsSurfacingEventsSchema },
    async (request, reply) => {
      const { sessionKey, events } = request.body;
      const safeEvents = events.filter((event) => isUuid(event.queryId));
      const now = Date.now();
      let accepted = 0;

      for (const event of safeEvents) {
        const occurredAt = event.occurredAt ? new Date(event.occurredAt) : new Date(now);
        const safeOccurredAt = Number.isNaN(occurredAt.getTime()) ? new Date(now) : occurredAt;
        const bucketMinutes = event.eventType === "impression" ? 60 : 30;
        const cap = event.eventType === "impression" ? 4 : 2;

        await fastify.db
          .insert(discoverEventRollups)
          .values({
            eventDate: toUtcDateOnly(safeOccurredAt),
            eventType: event.eventType,
            rail: event.rail,
            queryId: event.queryId,
            sessionKey,
            eventBucket: toBucketDate(safeOccurredAt, bucketMinutes),
            eventCount: 1,
          })
          .onConflictDoUpdate({
            target: [
              discoverEventRollups.eventDate,
              discoverEventRollups.eventType,
              discoverEventRollups.rail,
              discoverEventRollups.queryId,
              discoverEventRollups.sessionKey,
              discoverEventRollups.eventBucket,
            ],
            set: {
              eventCount: sql`LEAST(${discoverEventRollups.eventCount} + 1, ${cap})`,
              updatedAt: new Date(),
            },
          });

        accepted += 1;
      }

      return reply.status(202).send({ accepted });
    },
  );

  server.get(
    "/surfacing/metrics",
    { preHandler: [fastify.authenticate], schema: MetricsSchema },
    async (request, reply) => {
      const isAdmin = await isAdminRequest(fastify, request.user.id);
      if (!isAdmin) {
        return reply.code(403).send({ error: "Admin access required" });
      }

      const days = request.query.days ?? 14;

      const [metrics] = await fastify.db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN event_type = 'impression' THEN event_count ELSE 0 END), 0)::int AS impressions,
          COALESCE(SUM(CASE WHEN event_type = 'detail_click' THEN event_count ELSE 0 END), 0)::int AS detail_clicks,
          COALESCE(SUM(CASE WHEN event_type = 'copy_action' THEN event_count ELSE 0 END), 0)::int AS copy_actions,
          COALESCE(COUNT(DISTINCT CASE WHEN event_type = 'impression' THEN query_id END), 0)::int AS unique_impression_strings
        FROM pokequery.discover_event_rollups
        WHERE event_date >= (CURRENT_DATE - (${days} || ' days')::interval)
      `);

      const metricsRow: Record<string, unknown> = metrics ?? {};
      const impressions = Number(metricsRow.impressions ?? 0);
      const detailClicks = Number(metricsRow.detail_clicks ?? 0);
      const copyActions = Number(metricsRow.copy_actions ?? 0);
      const uniqueImpressionStrings = Number(metricsRow.unique_impression_strings ?? 0);

      const discoverToDetailCtr = impressions > 0 ? detailClicks / impressions : 0;
      const copyConversion = detailClicks > 0 ? copyActions / detailClicks : 0;
      const impressionDistributionUniqueStrings =
        impressions > 0 ? uniqueImpressionStrings / impressions : 0;

      return reply.send({
        windowDays: days,
        discoverToDetailCtr,
        copyConversion,
        impressionDistributionUniqueStrings,
        totals: {
          impressions,
          detailClicks,
          copyActions,
          uniqueImpressionStrings,
        },
      });
    },
  );
}
