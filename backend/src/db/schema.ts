import {
  uuid,
  text,
  integer,
  primaryKey,
  pgSchema,
  timestamp,
  boolean,
  jsonb,
  foreignKey,
} from "drizzle-orm/pg-core";

const authSchema = pgSchema("auth");
export const _authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const pokeSchema = pgSchema("pokequery");

// --- TRAINERS ---
export const trainers = pokeSchema.table("trainers", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => _authUsers.id, { onDelete: "cascade" }),
  username: text("username").notNull().unique(),
  pogoUsername: text("pogo_username"),
  visibleUsername: text("visible_username").default("pokequery").notNull(),
  team: text("team"),
  level: integer("level").default(1),
  trainerCode: text("trainer_code"),
  isProfilePublic: boolean("is_profile_public").default(true).notNull(),
  avatarUrl: text("avatar_url"),
  profileViewCount: integer("profile_view_count").default(0).notNull(),
  deactivatedAt: timestamp("deactivated_at"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- TAGS ---
export const tags = pokeSchema.table("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- SEARCH QUERIES ---
export const searchQueries = pokeSchema.table(
  "search_queries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id").references(() => trainers.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    query: text("query").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").default(false).notNull(),

    copyCount: integer("copy_count").default(0).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    originalQuerySnapshot: text("original_query_snapshot"),
    parentQueryId: uuid("parent_query_id"),

    metadata: jsonb("metadata")
      .$type<{
        autoTags?: string[];
        source?: "official" | "community";
      }>()
      .default({}),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.parentQueryId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
  ],
);

// --- QUERIES TO TAGS (Junction) ---
export const queriesToTags = pokeSchema.table(
  "queries_to_tags",
  {
    queryId: uuid("query_id")
      .references(() => searchQueries.id, { onDelete: "cascade" })
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
    // Timestamps (Useful to see when a tag was added to a query)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.queryId, t.tagId] }),
  }),
);

// --- FAVORITES (Junction) ---
export const favorites = pokeSchema.table(
  "favorites",
  {
    trainerId: uuid("trainer_id")
      .references(() => trainers.id, { onDelete: "cascade" })
      .notNull(),
    queryId: uuid("query_id")
      .references(() => searchQueries.id, { onDelete: "cascade" })
      .notNull(),
    // Timestamps (Essential for "Recently Favorited" logic)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.trainerId, t.queryId] }),
  }),
);

// --- GUEST FAVORITES (Junction) ---
export const guestFavorites = pokeSchema.table(
  "guest_favorites",
  {
    guestId: text("guest_id").notNull(),
    queryId: uuid("query_id")
      .references(() => searchQueries.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.guestId, t.queryId] }),
  }),
);

// --- FOLLOWERS (Junction) ---
export const followers = pokeSchema.table(
  "followers",
  {
    followerId: uuid("follower_id")
      .references(() => trainers.id, { onDelete: "cascade" })
      .notNull(),
    followedId: uuid("followed_id")
      .references(() => trainers.id, { onDelete: "cascade" })
      .notNull(),
    // Timestamps (Useful for sorting by most recent follows)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.followerId, t.followedId] }),
  }),
);

// --- NOTIFICATIONS ---
export const notifications = pokeSchema.table("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientTrainerId: uuid("recipient_trainer_id")
    .references(() => trainers.id, { onDelete: "cascade" })
    .notNull(),
  actorTrainerId: uuid("actor_trainer_id").references(() => trainers.id, {
    onDelete: "set null",
  }),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isHighPriority: boolean("is_high_priority").default(false).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- MODERATION REPORTS ---
export const reports = pokeSchema.table("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterTrainerId: uuid("reporter_trainer_id")
    .references(() => trainers.id, { onDelete: "cascade" })
    .notNull(),
  targetType: text("target_type").notNull(),
  targetQueryId: uuid("target_query_id").references(() => searchQueries.id, {
    onDelete: "set null",
  }),
  targetTrainerId: uuid("target_trainer_id").references(() => trainers.id, {
    onDelete: "set null",
  }),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").default("open").notNull(),
  reviewedByTrainerId: uuid("reviewed_by_trainer_id").references(() => trainers.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- MODERATION REPORT AUDIT ---
export const reportActions = pokeSchema.table("report_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .references(() => reports.id, { onDelete: "cascade" })
    .notNull(),
  actorTrainerId: uuid("actor_trainer_id").references(() => trainers.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NOTIFICATION PREFERENCES ---
export const notificationPreferences = pokeSchema.table("notification_preferences", {
  trainerId: uuid("trainer_id")
    .references(() => trainers.id, { onDelete: "cascade" })
    .primaryKey(),
  notifyNewFollower: boolean("notify_new_follower").default(true).notNull(),
  notifyQueryFork: boolean("notify_query_fork").default(true).notNull(),
  notifyQueryFavorite: boolean("notify_query_favorite").default(true).notNull(),
  inAppToasts: boolean("in_app_toasts").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
