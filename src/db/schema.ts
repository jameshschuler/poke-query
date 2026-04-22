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
  username: text("username").notNull().unique(),
  team: text("team"),
  level: integer("level").default(1),
  avatarUrl: text("avatar_url"),
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
    creatorId: uuid("creator_id")
      .references(() => trainers.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    query: text("query").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").default(false).notNull(),

    copyCount: integer("copy_count").default(0).notNull(),
    originalQuerySnapshot: text("original_query_snapshot"),
    parentQueryId: uuid("parent_query_id"),

    metadata: jsonb("metadata").$type<{ autoTags?: string[] }>().default({}),

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
