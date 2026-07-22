CREATE TABLE IF NOT EXISTS pokequery.discover_event_rollups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('impression', 'detail_click', 'copy_action')),
  rail text NOT NULL CHECK (rail IN ('featured_today', 'all_time_trusted', 'contextual_picks', 'default')),
  query_id uuid NOT NULL REFERENCES pokequery.search_queries(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  event_bucket timestamp NOT NULL,
  event_count integer NOT NULL DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT discover_event_rollups_dedupe_unique
    UNIQUE (event_date, event_type, rail, query_id, session_key, event_bucket)
);

CREATE INDEX IF NOT EXISTS discover_event_rollups_event_date_idx
  ON pokequery.discover_event_rollups (event_date DESC);

CREATE INDEX IF NOT EXISTS discover_event_rollups_rail_event_type_idx
  ON pokequery.discover_event_rollups (rail, event_type);

CREATE INDEX IF NOT EXISTS discover_event_rollups_query_id_idx
  ON pokequery.discover_event_rollups (query_id);
