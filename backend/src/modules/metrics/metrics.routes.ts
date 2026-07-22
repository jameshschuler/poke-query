import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { and, desc, eq, sql } from "drizzle-orm";

import { discoverEventRollups, searchQueries, trainers } from "../../db/schema.js";
import type { FastifyTypebox } from "../../types/fastify.js";
import {
  buildCommunityConditions,
  type CommunityRow,
  qualityScoreExpr,
  selectCommunityFields,
  toCommunityItem,
} from "../community/community.routes.js";
import {
  MetricsSchema,
  MetricsSurfacingSchema,
  TrackMetricsSurfacingEventsSchema,
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

export async function metricsRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

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

    const trustedItems = trustedRows
      .map((row) => toCommunityItem(row as CommunityRow))
      .filter((item) => item.qualityScore >= 1.1);

    const allTimeTrusted = trustedItems.slice(0, limit);

    const featuredToday = [...trustedItems]
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
      const [trainer] = await fastify.db
        .select({ role: trainers.role })
        .from(trainers)
        .where(eq(trainers.userId, request.user.id))
        .limit(1);

      if (!trainer || trainer.role !== "admin") {
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
