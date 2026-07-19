CREATE TABLE "pokequery"."reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reporter_trainer_id" uuid NOT NULL,
  "target_type" text NOT NULL,
  "target_query_id" uuid,
  "target_trainer_id" uuid,
  "reason" text NOT NULL,
  "details" text,
  "status" text DEFAULT 'open' NOT NULL,
  "reviewed_by_trainer_id" uuid,
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "reports_target_type_check" CHECK ("target_type" IN ('query', 'trainer')),
  CONSTRAINT "reports_status_check" CHECK ("status" IN ('open', 'in_review', 'resolved', 'dismissed')),
  CONSTRAINT "reports_target_match_check" CHECK (
    (
      "target_type" = 'query'
      AND "target_query_id" IS NOT NULL
      AND "target_trainer_id" IS NULL
    )
    OR (
      "target_type" = 'trainer'
      AND "target_trainer_id" IS NOT NULL
      AND "target_query_id" IS NULL
    )
  )
);
--> statement-breakpoint
CREATE TABLE "pokequery"."report_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "report_id" uuid NOT NULL,
  "actor_trainer_id" uuid,
  "action" text NOT NULL,
  "from_status" text,
  "to_status" text,
  "comment" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "report_actions_action_check" CHECK ("action" IN ('submitted', 'status_changed', 'commented')),
  CONSTRAINT "report_actions_status_check" CHECK (
    ("from_status" IS NULL OR "from_status" IN ('open', 'in_review', 'resolved', 'dismissed'))
    AND ("to_status" IS NULL OR "to_status" IN ('open', 'in_review', 'resolved', 'dismissed'))
  )
);
--> statement-breakpoint
ALTER TABLE "pokequery"."reports"
ADD CONSTRAINT "reports_reporter_trainer_id_trainers_id_fk"
FOREIGN KEY ("reporter_trainer_id") REFERENCES "pokequery"."trainers"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pokequery"."reports"
ADD CONSTRAINT "reports_target_query_id_search_queries_id_fk"
FOREIGN KEY ("target_query_id") REFERENCES "pokequery"."search_queries"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pokequery"."reports"
ADD CONSTRAINT "reports_target_trainer_id_trainers_id_fk"
FOREIGN KEY ("target_trainer_id") REFERENCES "pokequery"."trainers"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pokequery"."reports"
ADD CONSTRAINT "reports_reviewed_by_trainer_id_trainers_id_fk"
FOREIGN KEY ("reviewed_by_trainer_id") REFERENCES "pokequery"."trainers"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pokequery"."report_actions"
ADD CONSTRAINT "report_actions_report_id_reports_id_fk"
FOREIGN KEY ("report_id") REFERENCES "pokequery"."reports"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pokequery"."report_actions"
ADD CONSTRAINT "report_actions_actor_trainer_id_trainers_id_fk"
FOREIGN KEY ("actor_trainer_id") REFERENCES "pokequery"."trainers"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "reports_status_created_idx"
ON "pokequery"."reports" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "reports_target_query_idx"
ON "pokequery"."reports" ("target_query_id");
--> statement-breakpoint
CREATE INDEX "reports_target_trainer_idx"
ON "pokequery"."reports" ("target_trainer_id");
--> statement-breakpoint
CREATE INDEX "report_actions_report_created_idx"
ON "pokequery"."report_actions" ("report_id", "created_at");
