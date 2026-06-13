CREATE TABLE "pokequery"."guest_favorites" (
	"guest_id" text NOT NULL,
	"query_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guest_favorites_guest_id_query_id_pk" PRIMARY KEY("guest_id","query_id")
);
--> statement-breakpoint
ALTER TABLE "pokequery"."guest_favorites"
ADD CONSTRAINT "guest_favorites_query_id_search_queries_id_fk"
FOREIGN KEY ("query_id") REFERENCES "pokequery"."search_queries"("id") ON DELETE cascade ON UPDATE no action;