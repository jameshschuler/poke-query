CREATE TABLE "pokequery"."notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_trainer_id" uuid NOT NULL,
  "actor_trainer_id" uuid,
  "event_type" text NOT NULL,
  "entity_type" text,
  "entity_id" uuid,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "is_high_priority" boolean DEFAULT false NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pokequery"."notifications"
ADD CONSTRAINT "notifications_recipient_trainer_id_trainers_id_fk"
FOREIGN KEY ("recipient_trainer_id") REFERENCES "pokequery"."trainers"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pokequery"."notifications"
ADD CONSTRAINT "notifications_actor_trainer_id_trainers_id_fk"
FOREIGN KEY ("actor_trainer_id") REFERENCES "pokequery"."trainers"("id")
ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pokequery"."notifications"
ADD CONSTRAINT "notifications_event_type_check"
CHECK ("event_type" IN ('new_follower', 'query_forked', 'query_favorited'));
--> statement-breakpoint
ALTER TABLE "pokequery"."notifications"
ADD CONSTRAINT "notifications_entity_type_check"
CHECK ("entity_type" IN ('trainer', 'query') OR "entity_type" IS NULL);
--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx"
ON "pokequery"."notifications" ("recipient_trainer_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx"
ON "pokequery"."notifications" ("recipient_trainer_id", "is_read");
--> statement-breakpoint
CREATE TABLE "pokequery"."notification_preferences" (
  "trainer_id" uuid PRIMARY KEY NOT NULL,
  "notify_new_follower" boolean DEFAULT true NOT NULL,
  "notify_query_fork" boolean DEFAULT true NOT NULL,
  "notify_query_favorite" boolean DEFAULT true NOT NULL,
  "in_app_toasts" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pokequery"."notification_preferences"
ADD CONSTRAINT "notification_preferences_trainer_id_trainers_id_fk"
FOREIGN KEY ("trainer_id") REFERENCES "pokequery"."trainers"("id")
ON DELETE cascade ON UPDATE no action;