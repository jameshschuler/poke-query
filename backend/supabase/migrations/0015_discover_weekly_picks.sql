CREATE TABLE IF NOT EXISTS pokequery.discover_weekly_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL UNIQUE REFERENCES pokequery.search_queries(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamp,
  ends_at timestamp,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discover_weekly_picks_active_order_idx
  ON pokequery.discover_weekly_picks (is_active, display_order);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discover_event_rollups_rail_check'
      AND conrelid = 'pokequery.discover_event_rollups'::regclass
  ) THEN
    ALTER TABLE pokequery.discover_event_rollups
      DROP CONSTRAINT discover_event_rollups_rail_check;
  END IF;

  ALTER TABLE pokequery.discover_event_rollups
    ADD CONSTRAINT discover_event_rollups_rail_check
    CHECK (rail IN ('weekly_picks', 'featured_today', 'all_time_trusted', 'contextual_picks', 'default'));
END $$;
