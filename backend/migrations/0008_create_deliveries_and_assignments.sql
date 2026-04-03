CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at BIGINT,
  updated_at BIGINT,
  CONSTRAINT deliveries_status_check CHECK (
    status IN (
      'PENDING',
      'ASSIGNED',
      'ACCEPTED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
      'FAILED',
      'RETURNED',
      'CANCELLED'
    )
  )
);

CREATE INDEX IF NOT EXISTS deliveries_order_id_idx
  ON deliveries (order_id);

CREATE INDEX IF NOT EXISTS deliveries_status_created_at_idx
  ON deliveries (status, created_at DESC);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  assigned_by_uid TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  assigned_at BIGINT,
  unassigned_at BIGINT
);

CREATE INDEX IF NOT EXISTS assignments_delivery_id_assigned_at_idx
  ON assignments (delivery_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS assignments_driver_id_assigned_at_idx
  ON assignments (driver_id, assigned_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS assignments_one_open_assignment_per_delivery_idx
  ON assignments (delivery_id)
  WHERE unassigned_at IS NULL;
