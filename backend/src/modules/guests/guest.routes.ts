import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyTypebox } from "../../types/fastify.js";
import { guestFavorites, searchQueries } from "../../db/schema.js";
import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  FavoriteGuestQuerySchema,
  GetGuestFavoritesSchema,
  GuestSessionSchema,
  UnfavoriteGuestQuerySchema,
} from "./guest.schemas.js";

const GUEST_FAVORITES_COOKIE = "pq_guest_id";
const MAX_GUEST_FAVORITES = 10;

function ensureGuestId(
  request: { cookies: Record<string, string | undefined> },
  reply: {
    setCookie: (
      name: string,
      value: string,
      options: {
        path: string;
        httpOnly: boolean;
        sameSite: "lax";
        secure: boolean;
        maxAge: number;
      },
    ) => void;
  },
) {
  const existing = request.cookies[GUEST_FAVORITES_COOKIE];
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const guestId = randomUUID();
  reply.setCookie(GUEST_FAVORITES_COOKIE, guestId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  return guestId;
}

export async function guestRoutes(fastify: FastifyTypebox) {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.post("/session", { schema: GuestSessionSchema }, async (request, reply) => {
    const guestId = ensureGuestId(request, reply);

    const [row] = await fastify.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(guestFavorites)
      .where(eq(guestFavorites.guestId, guestId));

    return {
      guestId,
      favoritesCount: row?.count ?? 0,
      maxFavorites: MAX_GUEST_FAVORITES,
    };
  });

  server.get("/favorites", { schema: GetGuestFavoritesSchema }, async (request, reply) => {
    const guestId = ensureGuestId(request, reply);

    const rows = await fastify.db
      .select({ queryId: guestFavorites.queryId })
      .from(guestFavorites)
      .where(eq(guestFavorites.guestId, guestId));

    return {
      favoriteQueryIds: rows.map((row) => row.queryId),
      favoritesCount: rows.length,
      maxFavorites: MAX_GUEST_FAVORITES,
    };
  });

  server.post("/favorites/:id", { schema: FavoriteGuestQuerySchema }, async (request, reply) => {
    const guestId = ensureGuestId(request, reply);
    const { id } = request.params;

    const query = await fastify.db.query.searchQueries.findFirst({
      where: and(eq(searchQueries.id, id), eq(searchQueries.isPublic, true)),
    });

    if (!query) {
      return reply.code(404).send({ error: "Query not found" });
    }

    const existing = await fastify.db.query.guestFavorites.findFirst({
      where: and(eq(guestFavorites.guestId, guestId), eq(guestFavorites.queryId, id)),
    });

    if (existing) {
      return reply.code(204).send(null);
    }

    const [row] = await fastify.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(guestFavorites)
      .where(eq(guestFavorites.guestId, guestId));

    if ((row?.count ?? 0) >= MAX_GUEST_FAVORITES) {
      return reply.code(409).send({
        error: `Guest favorites are limited to ${MAX_GUEST_FAVORITES}`,
        maxFavorites: MAX_GUEST_FAVORITES,
      });
    }

    await fastify.db.insert(guestFavorites).values({ guestId, queryId: id }).onConflictDoNothing();

    return reply.code(204).send(null);
  });

  server.post(
    "/favorites/:id/unfavorite",
    { schema: UnfavoriteGuestQuerySchema },
    async (request, reply) => {
      const guestId = ensureGuestId(request, reply);
      const { id } = request.params;

      await fastify.db
        .delete(guestFavorites)
        .where(and(eq(guestFavorites.guestId, guestId), eq(guestFavorites.queryId, id)));

      return reply.code(204).send(null);
    },
  );
}
