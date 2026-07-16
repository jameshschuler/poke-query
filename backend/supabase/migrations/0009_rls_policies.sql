CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "auth"."uid"()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "pokequery"."current_trainer_id"()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pokequery
AS $$
  SELECT t.id
  FROM pokequery.trainers t
  WHERE t.user_id = auth.uid()
  LIMIT 1
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "pokequery"."current_trainer_id"() TO anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "pokequery"."current_trainer_id"() TO authenticated;
--> statement-breakpoint
ALTER TABLE "pokequery"."trainers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pokequery"."search_queries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pokequery"."queries_to_tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pokequery"."tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pokequery"."favorites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pokequery"."followers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pokequery"."guest_favorites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pokequery"."notifications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pokequery"."notification_preferences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "trainers_select_public_or_self" ON "pokequery"."trainers";
--> statement-breakpoint
CREATE POLICY "trainers_select_public_or_self"
ON "pokequery"."trainers"
FOR SELECT
TO anon, authenticated
USING ("is_profile_public" = true OR "user_id" = auth.uid());
--> statement-breakpoint
DROP POLICY IF EXISTS "trainers_insert_self" ON "pokequery"."trainers";
--> statement-breakpoint
CREATE POLICY "trainers_insert_self"
ON "pokequery"."trainers"
FOR INSERT
TO authenticated
WITH CHECK ("user_id" = auth.uid());
--> statement-breakpoint
DROP POLICY IF EXISTS "trainers_update_self" ON "pokequery"."trainers";
--> statement-breakpoint
CREATE POLICY "trainers_update_self"
ON "pokequery"."trainers"
FOR UPDATE
TO authenticated
USING ("user_id" = auth.uid())
WITH CHECK ("user_id" = auth.uid());
--> statement-breakpoint
DROP POLICY IF EXISTS "trainers_delete_self" ON "pokequery"."trainers";
--> statement-breakpoint
CREATE POLICY "trainers_delete_self"
ON "pokequery"."trainers"
FOR DELETE
TO authenticated
USING ("user_id" = auth.uid());
--> statement-breakpoint
DROP POLICY IF EXISTS "search_queries_select_public_or_owner" ON "pokequery"."search_queries";
--> statement-breakpoint
CREATE POLICY "search_queries_select_public_or_owner"
ON "pokequery"."search_queries"
FOR SELECT
TO anon, authenticated
USING (
  "is_public" = true
  OR "creator_id" = "pokequery"."current_trainer_id"()
);
--> statement-breakpoint
DROP POLICY IF EXISTS "search_queries_insert_owner" ON "pokequery"."search_queries";
--> statement-breakpoint
CREATE POLICY "search_queries_insert_owner"
ON "pokequery"."search_queries"
FOR INSERT
TO authenticated
WITH CHECK ("creator_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "search_queries_update_owner" ON "pokequery"."search_queries";
--> statement-breakpoint
CREATE POLICY "search_queries_update_owner"
ON "pokequery"."search_queries"
FOR UPDATE
TO authenticated
USING ("creator_id" = "pokequery"."current_trainer_id"())
WITH CHECK ("creator_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "search_queries_delete_owner" ON "pokequery"."search_queries";
--> statement-breakpoint
CREATE POLICY "search_queries_delete_owner"
ON "pokequery"."search_queries"
FOR DELETE
TO authenticated
USING ("creator_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "queries_to_tags_select_visible_queries" ON "pokequery"."queries_to_tags";
--> statement-breakpoint
CREATE POLICY "queries_to_tags_select_visible_queries"
ON "pokequery"."queries_to_tags"
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "pokequery"."search_queries" sq
    WHERE sq."id" = "query_id"
      AND (sq."is_public" = true OR sq."creator_id" = "pokequery"."current_trainer_id"())
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS "queries_to_tags_insert_owner" ON "pokequery"."queries_to_tags";
--> statement-breakpoint
CREATE POLICY "queries_to_tags_insert_owner"
ON "pokequery"."queries_to_tags"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "pokequery"."search_queries" sq
    WHERE sq."id" = "query_id"
      AND sq."creator_id" = "pokequery"."current_trainer_id"()
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS "queries_to_tags_delete_owner" ON "pokequery"."queries_to_tags";
--> statement-breakpoint
CREATE POLICY "queries_to_tags_delete_owner"
ON "pokequery"."queries_to_tags"
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "pokequery"."search_queries" sq
    WHERE sq."id" = "query_id"
      AND sq."creator_id" = "pokequery"."current_trainer_id"()
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS "tags_select_all" ON "pokequery"."tags";
--> statement-breakpoint
CREATE POLICY "tags_select_all"
ON "pokequery"."tags"
FOR SELECT
TO anon, authenticated
USING (true);
--> statement-breakpoint
DROP POLICY IF EXISTS "favorites_select_self" ON "pokequery"."favorites";
--> statement-breakpoint
CREATE POLICY "favorites_select_self"
ON "pokequery"."favorites"
FOR SELECT
TO authenticated
USING ("trainer_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "favorites_insert_self" ON "pokequery"."favorites";
--> statement-breakpoint
CREATE POLICY "favorites_insert_self"
ON "pokequery"."favorites"
FOR INSERT
TO authenticated
WITH CHECK (
  "trainer_id" = "pokequery"."current_trainer_id"()
  AND EXISTS (
    SELECT 1
    FROM "pokequery"."search_queries" sq
    WHERE sq."id" = "query_id"
      AND (sq."is_public" = true OR sq."creator_id" = "pokequery"."current_trainer_id"())
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS "favorites_delete_self" ON "pokequery"."favorites";
--> statement-breakpoint
CREATE POLICY "favorites_delete_self"
ON "pokequery"."favorites"
FOR DELETE
TO authenticated
USING ("trainer_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "followers_select_self" ON "pokequery"."followers";
--> statement-breakpoint
CREATE POLICY "followers_select_self"
ON "pokequery"."followers"
FOR SELECT
TO authenticated
USING (
  "follower_id" = "pokequery"."current_trainer_id"()
  OR "followed_id" = "pokequery"."current_trainer_id"()
);
--> statement-breakpoint
DROP POLICY IF EXISTS "followers_insert_self" ON "pokequery"."followers";
--> statement-breakpoint
CREATE POLICY "followers_insert_self"
ON "pokequery"."followers"
FOR INSERT
TO authenticated
WITH CHECK (
  "follower_id" = "pokequery"."current_trainer_id"()
  AND "followed_id" <> "pokequery"."current_trainer_id"()
  AND EXISTS (
    SELECT 1
    FROM "pokequery"."trainers" t
    WHERE t."id" = "followed_id"
      AND t."is_profile_public" = true
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS "followers_delete_self" ON "pokequery"."followers";
--> statement-breakpoint
CREATE POLICY "followers_delete_self"
ON "pokequery"."followers"
FOR DELETE
TO authenticated
USING ("follower_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "guest_favorites_no_client_access" ON "pokequery"."guest_favorites";
--> statement-breakpoint
CREATE POLICY "guest_favorites_no_client_access"
ON "pokequery"."guest_favorites"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
--> statement-breakpoint
DROP POLICY IF EXISTS "notifications_select_recipient" ON "pokequery"."notifications";
--> statement-breakpoint
CREATE POLICY "notifications_select_recipient"
ON "pokequery"."notifications"
FOR SELECT
TO authenticated
USING ("recipient_trainer_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "notifications_update_recipient" ON "pokequery"."notifications";
--> statement-breakpoint
CREATE POLICY "notifications_update_recipient"
ON "pokequery"."notifications"
FOR UPDATE
TO authenticated
USING ("recipient_trainer_id" = "pokequery"."current_trainer_id"())
WITH CHECK ("recipient_trainer_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "notification_preferences_select_self" ON "pokequery"."notification_preferences";
--> statement-breakpoint
CREATE POLICY "notification_preferences_select_self"
ON "pokequery"."notification_preferences"
FOR SELECT
TO authenticated
USING ("trainer_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "notification_preferences_insert_self" ON "pokequery"."notification_preferences";
--> statement-breakpoint
CREATE POLICY "notification_preferences_insert_self"
ON "pokequery"."notification_preferences"
FOR INSERT
TO authenticated
WITH CHECK ("trainer_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "notification_preferences_update_self" ON "pokequery"."notification_preferences";
--> statement-breakpoint
CREATE POLICY "notification_preferences_update_self"
ON "pokequery"."notification_preferences"
FOR UPDATE
TO authenticated
USING ("trainer_id" = "pokequery"."current_trainer_id"())
WITH CHECK ("trainer_id" = "pokequery"."current_trainer_id"());
--> statement-breakpoint
DROP POLICY IF EXISTS "notification_preferences_delete_self" ON "pokequery"."notification_preferences";
--> statement-breakpoint
CREATE POLICY "notification_preferences_delete_self"
ON "pokequery"."notification_preferences"
FOR DELETE
TO authenticated
USING ("trainer_id" = "pokequery"."current_trainer_id"());