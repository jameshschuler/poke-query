ALTER TABLE "pokequery"."trainers" ADD COLUMN "user_id" uuid;
--> statement-breakpoint
UPDATE "pokequery"."trainers" SET "user_id" = "id" WHERE "user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "pokequery"."trainers" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "pokequery"."trainers" ADD CONSTRAINT "trainers_user_id_unique" UNIQUE("user_id");
