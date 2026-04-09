const { query } = require("../../core/db/postgres");

function mapRow(row) {
  if (!row) return null;

  return {
    userId: row.user_id,
    tenantId: row.tenant_id,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listByUserId(client, userId) {
  const result = await client.query(
    `SELECT user_id,
            tenant_id,
            role,
            status,
            created_at,
            updated_at
     FROM bln_tenant_memberships
     WHERE user_id = $1
     ORDER BY created_at ASC, tenant_id ASC`,
    [userId]
  );

  return result.rows.map(mapRow).filter(Boolean);
}

async function getByUserIdAndTenantId(client, userId, tenantId) {
  const result = await client.query(
    `SELECT user_id,
            tenant_id,
            role,
            status,
            created_at,
            updated_at
     FROM bln_tenant_memberships
     WHERE user_id = $1 AND tenant_id = $2`,
    [userId, tenantId]
  );

  return mapRow(result.rows[0]);
}

async function listByTenantId(client, tenantId) {
  const result = await client.query(
    `SELECT user_id,
            tenant_id,
            role,
            status,
            created_at,
            updated_at
     FROM bln_tenant_memberships
     WHERE tenant_id = $1
     ORDER BY created_at ASC, user_id ASC`,
    [tenantId]
  );

  return result.rows.map(mapRow).filter(Boolean);
}

async function upsert(client, membership) {
  const result = await client.query(
    `INSERT INTO bln_tenant_memberships (
       user_id,
       tenant_id,
       role,
       status,
       created_at,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, tenant_id) DO UPDATE SET
       role = EXCLUDED.role,
       status = EXCLUDED.status,
       updated_at = EXCLUDED.updated_at
     RETURNING user_id,
               tenant_id,
               role,
               status,
               created_at,
               updated_at`,
    [
      membership.userId,
      membership.tenantId,
      membership.role,
      membership.status,
      membership.createdAt,
      membership.updatedAt,
    ]
  );

  return mapRow(result.rows[0]);
}

module.exports = {
  listByUserId(userId) {
    return listByUserId({ query }, userId);
  },
  getByUserIdAndTenantId(userId, tenantId) {
    return getByUserIdAndTenantId({ query }, userId, tenantId);
  },
  listByTenantId(tenantId) {
    return listByTenantId({ query }, tenantId);
  },
  upsert(membership) {
    return upsert({ query }, membership);
  },
  listByUserIdWithClient: listByUserId,
  getByUserIdAndTenantIdWithClient: getByUserIdAndTenantId,
  listByTenantIdWithClient: listByTenantId,
  upsertWithClient: upsert,
};
