CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."users" (
	"id" uuid PRIMARY KEY
);
--> statement-breakpoint
ALTER TABLE "pokequery"."trainers"
ADD CONSTRAINT "trainers_user_id_auth_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
ON DELETE cascade
ON UPDATE no action;
