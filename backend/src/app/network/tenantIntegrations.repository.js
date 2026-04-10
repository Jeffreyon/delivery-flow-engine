const { query } = require("../../core/db/postgres");

function mapRow(row) {
  if (!row) return null;

  return {
    tenantId: row.tenant_id,
    apiKeyEncrypted: row.api_key_encrypted,
    apiKeyLast4: row.api_key_last4 || null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getByTenantId(client, tenantId) {
  const result = await client.query(
    `SELECT tenant_id,
            api_key_encrypted,
            api_key_last4,
            status,
            created_at,
            updated_at
     FROM bln_tenant_accounts
     WHERE tenant_id = $1`,
    [tenantId]
  );

  return mapRow(result.rows[0]);
}

async function listAll(client) {
  const result = await client.query(
    `SELECT tenant_id,
            api_key_encrypted,
            api_key_last4,
            status,
            created_at,
            updated_at
     FROM bln_tenant_accounts
     ORDER BY created_at ASC, tenant_id ASC`
  );

  return result.rows.map(mapRow).filter(Boolean);
}

async function upsert(client, tenantAccount) {
  const result = await client.query(
    `INSERT INTO bln_tenant_accounts (
       tenant_id,
       api_key_encrypted,
       api_key_last4,
       status,
       created_at,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id) DO UPDATE SET
       api_key_encrypted = EXCLUDED.api_key_encrypted,
       api_key_last4 = EXCLUDED.api_key_last4,
       status = EXCLUDED.status,
       updated_at = EXCLUDED.updated_at
     RETURNING tenant_id,
               api_key_encrypted,
               api_key_last4,
               status,
               created_at,
               updated_at`,
    [
      tenantAccount.tenantId,
      tenantAccount.apiKeyEncrypted,
      tenantAccount.apiKeyLast4,
      tenantAccount.status,
      tenantAccount.createdAt,
      tenantAccount.updatedAt,
    ]
  );

  return mapRow(result.rows[0]);
}

module.exports = {
  getByTenantId(tenantId) {
    return getByTenantId({ query }, tenantId);
  },
  listAll() {
    return listAll({ query });
  },
  upsert(tenantAccount) {
    return upsert({ query }, tenantAccount);
  },
  getByTenantIdWithClient: getByTenantId,
  listAllWithClient: listAll,
  upsertWithClient: upsert,
};
