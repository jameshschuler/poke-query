import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

const UUID = "11111111-1111-4111-8111-111111111111";

const protectedEndpoints = [
  { method: "POST", url: "/api/v1/auth/logout" },
  { method: "GET", url: "/api/v1/users/me" },
  { method: "GET", url: "/api/v1/users/me/queries" },
  { method: "GET", url: "/api/v1/users/me/favorites" },
  { method: "GET", url: "/api/v1/users/me/favorites/ids" },
  { method: "GET", url: "/api/v1/users/me/forks" },
  { method: "GET", url: "/api/v1/users/me/followers" },
  { method: "GET", url: "/api/v1/users/me/following" },
  { method: "POST", url: `/api/v1/users/${UUID}/follow`, payload: {} },
  { method: "POST", url: `/api/v1/users/${UUID}/unfollow` },
  {
    method: "PATCH",
    url: "/api/v1/users/me",
    payload: { username: "Ash_123" },
  },
  { method: "POST", url: "/api/v1/users/me/deactivate" },
  { method: "POST", url: "/api/v1/users/me/reactivate" },
  { method: "DELETE", url: "/api/v1/users/me" },
  {
    method: "POST",
    url: "/api/v1/queries",
    payload: { title: "PvP Hundo", query: "4*&cp-1500", isPublic: false },
  },
  {
    method: "POST",
    url: "/api/v1/queries/official/sync",
    payload: {
      creatorId: UUID,
      entries: [{ key: "seed-1", title: "Official", query: "4*" }],
    },
  },
  { method: "POST", url: `/api/v1/queries/${UUID}/fork`, payload: {} },
  { method: "POST", url: `/api/v1/queries/${UUID}/sync`, payload: {} },
  {
    method: "PATCH",
    url: `/api/v1/queries/${UUID}`,
    payload: { title: "Updated", query: "3*&cp-2500", isPublic: true },
  },
  { method: "POST", url: `/api/v1/queries/${UUID}/favorite`, payload: {} },
  { method: "POST", url: `/api/v1/queries/${UUID}/unfavorite` },
  { method: "DELETE", url: `/api/v1/queries/${UUID}` },
  { method: "GET", url: "/api/v1/notifications" },
  { method: "GET", url: "/api/v1/notifications/unread-count" },
  { method: "PATCH", url: `/api/v1/notifications/${UUID}/read` },
  { method: "PATCH", url: "/api/v1/notifications/read-all" },
  { method: "GET", url: "/api/v1/notifications/preferences" },
  {
    method: "PATCH",
    url: "/api/v1/notifications/preferences",
    payload: { inAppToasts: true },
  },
  { method: "GET", url: "/api/v1/moderation/access" },
  {
    method: "POST",
    url: "/api/v1/moderation/reports",
    payload: {
      targetType: "query",
      targetId: UUID,
      reason: "Spam string",
    },
  },
  { method: "GET", url: "/api/v1/moderation/reports" },
  { method: "GET", url: `/api/v1/moderation/reports/${UUID}` },
  {
    method: "PATCH",
    url: `/api/v1/moderation/reports/${UUID}/status`,
    payload: { status: "open" },
  },
  { method: "GET", url: "/api/v1/metrics/surfacing/weekly-picks" },
  {
    method: "POST",
    url: "/api/v1/metrics/surfacing/weekly-picks",
    payload: { queryId: UUID },
  },
  {
    method: "DELETE",
    url: `/api/v1/metrics/surfacing/weekly-picks/${UUID}`,
  },
  { method: "GET", url: "/api/v1/metrics/surfacing/metrics" },
] as const;

describe("Authenticated endpoint protection", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(protectedEndpoints)("$method $url returns 401 without auth", async (endpoint) => {
    const { method, url } = endpoint;
    const payload = "payload" in endpoint ? endpoint.payload : undefined;

    const response = await app.inject({
      method,
      url,
      ...(payload !== undefined ? { payload } : {}),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Invalid Session" });
  });
});
