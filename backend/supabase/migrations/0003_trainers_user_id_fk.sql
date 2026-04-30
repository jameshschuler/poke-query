ALTER TABLE "pokequery"."trainers"
ADD CONSTRAINT "trainers_user_id_auth_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
ON DELETE cascade
ON UPDATE no action;
