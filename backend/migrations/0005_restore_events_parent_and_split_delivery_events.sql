CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at BIGINT
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'delivery_events'
      AND column_name = 'type'
  ) THEN
    INSERT INTO events (id, type, payload, created_at)
    SELECT id, type, COALESCE(payload, '{}'::jsonb), created_at
    FROM delivery_events
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

ALTER TABLE delivery_events DROP COLUMN IF EXISTS type;
ALTER TABLE delivery_events DROP COLUMN IF EXISTS payload;
ALTER TABLE delivery_events DROP COLUMN IF EXISTS created_at;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'delivery_events'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'delivery_events_id_fkey'
      AND conrelid = 'delivery_events'::regclass
  ) THEN
    ALTER TABLE delivery_events
      ADD CONSTRAINT delivery_events_id_fkey
      FOREIGN KEY (id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;
END $$;
