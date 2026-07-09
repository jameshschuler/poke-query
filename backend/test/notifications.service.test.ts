import { describe, expect, it, vi } from "vitest";
import { emitNotification } from "../src/modules/notifications/notifications.service.js";

function buildPreferencesSelectChain(result: object[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

describe("emitNotification", () => {
  it("does not insert notification when actor and recipient are the same", async () => {
    const insert = vi.fn();
    const fastify = {
      db: {
        select: vi.fn(),
        insert,
      },
    } as any;

    await emitNotification(fastify, {
      recipientTrainerId: "same-id",
      actorTrainerId: "same-id",
      eventType: "new_follower",
      entityType: "trainer",
      entityId: "same-id",
      title: "self",
      message: "self",
    });

    expect(insert).not.toHaveBeenCalled();
  });

  it("does not insert when the event is disabled in preferences", async () => {
    const values = vi.fn();
    const insert = vi.fn(() => ({ values }));
    const select = vi.fn().mockReturnValueOnce(
      buildPreferencesSelectChain([
        {
          notifyNewFollower: true,
          notifyQueryFork: true,
          notifyQueryFavorite: false,
        },
      ]),
    );

    const fastify = {
      db: {
        select,
        insert,
      },
    } as any;

    await emitNotification(fastify, {
      recipientTrainerId: "recipient-id",
      actorTrainerId: "actor-id",
      eventType: "query_favorited",
      entityType: "query",
      entityId: "query-id",
      title: "fav",
      message: "fav",
    });

    expect(values).not.toHaveBeenCalled();
  });

  it("inserts when preferences are missing (defaults enabled)", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values }));
    const select = vi.fn().mockReturnValueOnce(buildPreferencesSelectChain([]));

    const fastify = {
      db: {
        select,
        insert,
      },
    } as any;

    await emitNotification(fastify, {
      recipientTrainerId: "recipient-id",
      actorTrainerId: "actor-id",
      eventType: "query_forked",
      entityType: "query",
      entityId: "query-id",
      title: "fork",
      message: "fork",
      isHighPriority: true,
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientTrainerId: "recipient-id",
        actorTrainerId: "actor-id",
        eventType: "query_forked",
        entityType: "query",
        entityId: "query-id",
        title: "fork",
        message: "fork",
        isHighPriority: true,
      }),
    );
  });
});
