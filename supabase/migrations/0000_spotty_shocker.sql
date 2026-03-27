--> statement-breakpoint
CREATE TABLE "pokequery"."collections" (
	"trainer_id" uuid NOT NULL,
	"pokemon_id" integer NOT NULL,
	"captured_at" text DEFAULT 'now()',
	CONSTRAINT "collections_trainer_id_pokemon_id_pk" PRIMARY KEY("trainer_id","pokemon_id")
);
--> statement-breakpoint
CREATE TABLE "pokequery"."pokemon" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "pokequery"."trainers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"created_at" text DEFAULT 'now()',
	CONSTRAINT "trainers_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "pokequery"."collections" ADD CONSTRAINT "collections_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "pokequery"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokequery"."collections" ADD CONSTRAINT "collections_pokemon_id_pokemon_id_fk" FOREIGN KEY ("pokemon_id") REFERENCES "pokequery"."pokemon"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokequery"."trainers" ADD CONSTRAINT "trainers_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;