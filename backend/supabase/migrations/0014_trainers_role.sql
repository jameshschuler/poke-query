ALTER TABLE pokequery.trainers
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trainers_role_check'
      AND conrelid = 'pokequery.trainers'::regclass
  ) THEN
    ALTER TABLE pokequery.trainers
    ADD CONSTRAINT trainers_role_check
    CHECK (role IN ('member', 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS trainers_role_idx
  ON pokequery.trainers (role);
