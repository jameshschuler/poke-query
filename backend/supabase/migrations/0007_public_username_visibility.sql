ALTER TABLE "pokequery"."trainers"
ADD COLUMN "pogo_username" text;
--> statement-breakpoint
ALTER TABLE "pokequery"."trainers"
ADD COLUMN "visible_username" text DEFAULT 'pokequery' NOT NULL;
--> statement-breakpoint
ALTER TABLE "pokequery"."trainers"
ADD CONSTRAINT "trainers_visible_username_check"
CHECK ("visible_username" IN ('pokequery', 'pogo'));
