DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_catalog.pg_namespace n
		JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid
		WHERE n.nspname = 'auth'
			AND c.relname = 'users'
			AND c.relkind IN ('r', 'p')
	) AND NOT EXISTS (
		SELECT 1
		FROM pg_catalog.pg_constraint
		WHERE conname = 'trainers_user_id_auth_users_id_fk'
	) THEN
		ALTER TABLE "pokequery"."trainers"
			ADD CONSTRAINT "trainers_user_id_auth_users_id_fk"
			FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
			ON DELETE cascade
			ON UPDATE no action;
	END IF;
END
$$;
