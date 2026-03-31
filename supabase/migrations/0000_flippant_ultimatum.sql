--CREATE SCHEMA "pokequery";
--> statement-breakpoint
CREATE TABLE "pokequery"."favorites" (
	"trainer_id" uuid NOT NULL,
	"query_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_trainer_id_query_id_pk" PRIMARY KEY("trainer_id","query_id")
);
--> statement-breakpoint
CREATE TABLE "pokequery"."queries_to_tags" (
	"query_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "queries_to_tags_query_id_tag_id_pk" PRIMARY KEY("query_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "pokequery"."search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"query" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"copy_count" integer DEFAULT 0 NOT NULL,
	"original_query_snapshot" text,
	"parent_query_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pokequery"."tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pokequery"."trainers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"team" text,
	"level" integer DEFAULT 1,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trainers_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "pokequery"."favorites" ADD CONSTRAINT "favorites_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "pokequery"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokequery"."favorites" ADD CONSTRAINT "favorites_query_id_search_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "pokequery"."search_queries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokequery"."queries_to_tags" ADD CONSTRAINT "queries_to_tags_query_id_search_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "pokequery"."search_queries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokequery"."queries_to_tags" ADD CONSTRAINT "queries_to_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "pokequery"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokequery"."search_queries" ADD CONSTRAINT "search_queries_creator_id_trainers_id_fk" FOREIGN KEY ("creator_id") REFERENCES "pokequery"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokequery"."search_queries" ADD CONSTRAINT "search_queries_parent_query_id_search_queries_id_fk" FOREIGN KEY ("parent_query_id") REFERENCES "pokequery"."search_queries"("id") ON DELETE set null ON UPDATE no action;