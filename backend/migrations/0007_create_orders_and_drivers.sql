CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  pickup_address TEXT,
  dropoff_address TEXT,
  notes TEXT,
  created_by_uid TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at BIGINT,
  updated_at BIGINT
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx
  ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT false,
  profile JSONB DEFAULT '{}'::jsonb,
  created_at BIGINT,
  updated_at BIGINT
);

CREATE INDEX IF NOT EXISTS drivers_is_available_idx
  ON drivers (is_available);
