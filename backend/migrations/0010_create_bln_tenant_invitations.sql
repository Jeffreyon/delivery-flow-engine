CREATE TABLE IF NOT EXISTS bln_tenant_invitations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES bln_tenant_accounts(tenant_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  node_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_node_id TEXT,
  invited_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  accepted_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  accepted_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS bln_tenant_invitations_tenant_created_at_idx
  ON bln_tenant_invitations (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bln_tenant_invitations_email_status_idx
  ON bln_tenant_invitations (email, status, created_at DESC);
