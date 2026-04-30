--> statement-breakpoint
ALTER TABLE "pokequery"."search_queries" DROP CONSTRAINT "search_queries_creator_id_trainers_id_fk";
--> statement-breakpoint
ALTER TABLE "pokequery"."search_queries" ALTER COLUMN "creator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pokequery"."trainers" ADD COLUMN "deactivated_at" timestamp;--> statement-breakpoint
ALTER TABLE "pokequery"."search_queries" ADD CONSTRAINT "search_queries_creator_id_trainers_id_fk" FOREIGN KEY ("creator_id") REFERENCES "pokequery"."trainers"("id") ON DELETE set null ON UPDATE no action;