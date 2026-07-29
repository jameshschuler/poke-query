import { resolveDisplayName } from "./users-helpers.js";

export function serializeQuery(q: {
  id: string;
  title: string;
  query: string;
  description: string | null;
  copyCount: number;
  favoriteCount: number;
  forkCount: number;
  referenceUrl: string | null;
  userTags: string[];
  autoTags: string[];
  createdAt: Date;
}) {
  return { ...q, createdAt: q.createdAt.toISOString() };
}

export function serializeManagedQuery(q: {
  id: string;
  title: string;
  query: string;
  description: string | null;
  isPublic: boolean;
  copyCount: number;
  viewCount: number;
  favoriteCount: number;
  forkCount: number;
  referenceUrl: string | null;
  userTags: string[];
  autoTags: string[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...q,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

export function serializeMeFavoriteQuery(q: {
  id: string;
  title: string;
  query: string;
  description: string | null;
  isPublic: boolean;
  copyCount: number;
  viewCount: number;
  favoriteCount: number;
  forkCount: number;
  referenceUrl: string | null;
  userTags: string[];
  autoTags: string[];
  createdAt: Date;
  updatedAt: Date;
  favoritedAt: Date;
  creatorId: string | null;
  creatorUsername: string | null;
  creatorPogoUsername: string | null;
  creatorVisibleUsername: string | null;
  creatorAvatarUrl: string | null;
}) {
  return {
    id: q.id,
    title: q.title,
    query: q.query,
    description: q.description,
    isPublic: q.isPublic,
    copyCount: q.copyCount,
    viewCount: q.viewCount,
    favoriteCount: q.favoriteCount,
    forkCount: q.forkCount,
    referenceUrl: q.referenceUrl,
    userTags: q.userTags,
    autoTags: q.autoTags,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    favoritedAt: q.favoritedAt.toISOString(),
    creator:
      q.creatorId && q.creatorUsername
        ? {
            id: q.creatorId,
            username: q.creatorUsername,
            displayName: resolveDisplayName({
              username: q.creatorUsername,
              pogoUsername: q.creatorPogoUsername,
              visibleUsername: q.creatorVisibleUsername,
            }),
            avatarUrl: q.creatorAvatarUrl,
          }
        : null,
  };
}

export function serializeManagedForkQuery(q: {
  id: string;
  title: string;
  query: string;
  description: string | null;
  isPublic: boolean;
  copyCount: number;
  viewCount: number;
  favoriteCount: number;
  forkCount: number;
  referenceUrl: string | null;
  userTags: string[];
  autoTags: string[];
  createdAt: Date;
  updatedAt: Date;
  parentQueryId: string | null;
  originalQuerySnapshot: string | null;
  syncStatus: "up-to-date" | "behind" | "orphaned";
  sourceId: string | null;
  sourceTitle: string | null;
  sourceQuery: string | null;
  sourceIsPublic: boolean | null;
  sourceUpdatedAt: Date | null;
  sourceCreatorId: string | null;
  sourceCreatorUsername: string | null;
  sourceCreatorPogoUsername: string | null;
  sourceCreatorVisibleUsername: string | null;
  sourceCreatorAvatarUrl: string | null;
  sourceCreatorTeam: string | null;
  sourceCreatorLevel: number | null;
}) {
  return {
    id: q.id,
    title: q.title,
    query: q.query,
    description: q.description,
    isPublic: q.isPublic,
    copyCount: q.copyCount,
    viewCount: q.viewCount,
    favoriteCount: q.favoriteCount,
    forkCount: q.forkCount,
    referenceUrl: q.referenceUrl,
    userTags: q.userTags,
    autoTags: q.autoTags,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    parentQueryId: q.parentQueryId,
    originalQuerySnapshot: q.originalQuerySnapshot,
    syncStatus: q.syncStatus,
    sourceQuery:
      q.sourceId && q.sourceTitle && q.sourceQuery && q.sourceUpdatedAt
        ? {
            id: q.sourceId,
            title: q.sourceTitle,
            query: q.sourceQuery,
            isPublic: Boolean(q.sourceIsPublic),
            updatedAt: q.sourceUpdatedAt.toISOString(),
            creator:
              q.sourceCreatorId && q.sourceCreatorUsername
                ? {
                    id: q.sourceCreatorId,
                    username: q.sourceCreatorUsername,
                    displayName: resolveDisplayName({
                      username: q.sourceCreatorUsername,
                      pogoUsername: q.sourceCreatorPogoUsername,
                      visibleUsername: q.sourceCreatorVisibleUsername,
                    }),
                    avatarUrl: q.sourceCreatorAvatarUrl,
                    team: q.sourceCreatorTeam as "mystic" | "valor" | "instinct" | null,
                    level: q.sourceCreatorLevel,
                  }
                : null,
          }
        : null,
  };
}
