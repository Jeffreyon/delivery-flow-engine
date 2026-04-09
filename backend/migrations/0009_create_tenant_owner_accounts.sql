CREATE TABLE IF NOT EXISTS bln_tenant_accounts (
  tenant_id TEXT PRIMARY KEY,
  api_key_encrypted TEXT NOT NULL,
  api_key_last4 TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT bln_tenant_accounts_status_check CHECK (
    status IN ('ACTIVE', 'REVOKED')
  )
);

CREATE TABLE IF NOT EXISTS bln_tenant_memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, tenant_id),
  CONSTRAINT bln_tenant_memberships_status_check CHECK (
    status IN ('ACTIVE', 'REVOKED')
  )
);

CREATE INDEX IF NOT EXISTS bln_tenant_memberships_tenant_id_idx
  ON bln_tenant_memberships (tenant_id);

CREATE TABLE IF NOT EXISTS bln_node_assignments (
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, tenant_id, node_id),
  CONSTRAINT bln_node_assignments_membership_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES bln_tenant_memberships(user_id, tenant_id)
    ON DELETE CASCADE,
  CONSTRAINT bln_node_assignments_status_check CHECK (
    status IN ('ACTIVE', 'REVOKED')
  )
);

CREATE INDEX IF NOT EXISTS bln_node_assignments_user_tenant_idx
  ON bln_node_assignments (user_id, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS bln_node_assignments_default_uniq
  ON bln_node_assignments (user_id, tenant_id)
  WHERE is_default = TRUE AND status = 'ACTIVE';
