CREATE TABLE "pokequery"."followers" (
  "follower_id" uuid NOT NULL,
  "followed_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "followers_follower_id_followed_id_pk" PRIMARY KEY("follower_id", "followed_id")
);
--> statement-breakpoint
ALTER TABLE "pokequery"."followers"
ADD CONSTRAINT "followers_follower_id_trainers_id_fk"
FOREIGN KEY ("follower_id") REFERENCES "pokequery"."trainers"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pokequery"."followers"
ADD CONSTRAINT "followers_followed_id_trainers_id_fk"
FOREIGN KEY ("followed_id") REFERENCES "pokequery"."trainers"("id")
ON DELETE cascade
ON UPDATE no action;
