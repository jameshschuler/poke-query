ALTER TABLE "pokequery"."trainers"
ADD COLUMN "trainer_code" text;
--> statement-breakpoint
ALTER TABLE "pokequery"."trainers"
ADD COLUMN "is_profile_public" boolean DEFAULT true NOT NULL;
