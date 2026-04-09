const { query } = require("../../core/db/postgres");

function mapRow(row) {
  if (!row) return null;

  return {
    userId: row.user_id,
    tenantId: row.tenant_id,
    nodeId: row.node_id,
    isDefault: Boolean(row.is_default),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listByUserIdAndTenantId(client, userId, tenantId) {
  const result = await client.query(
    `SELECT user_id,
            tenant_id,
            node_id,
            is_default,
            status,
            created_at,
            updated_at
     FROM bln_node_assignments
     WHERE user_id = $1 AND tenant_id = $2
     ORDER BY is_default DESC, created_at ASC, node_id ASC`,
    [userId, tenantId]
  );

  return result.rows.map(mapRow).filter(Boolean);
}

async function listByTenantId(client, tenantId) {
  const result = await client.query(
    `SELECT user_id,
            tenant_id,
            node_id,
            is_default,
            status,
            created_at,
            updated_at
     FROM bln_node_assignments
     WHERE tenant_id = $1
     ORDER BY user_id ASC, is_default DESC, created_at ASC, node_id ASC`,
    [tenantId]
  );

  return result.rows.map(mapRow).filter(Boolean);
}

async function upsert(client, assignment) {
  if (assignment.isDefault) {
    await client.query(
      `UPDATE bln_node_assignments
       SET is_default = FALSE,
           updated_at = $3
       WHERE user_id = $1
         AND tenant_id = $2
         AND node_id <> $4`,
      [
        assignment.userId,
        assignment.tenantId,
        assignment.updatedAt,
        assignment.nodeId,
      ]
    );
  }

  const result = await client.query(
    `INSERT INTO bln_node_assignments (
       user_id,
       tenant_id,
       node_id,
       is_default,
       status,
       created_at,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, tenant_id, node_id) DO UPDATE SET
       is_default = EXCLUDED.is_default,
       status = EXCLUDED.status,
       updated_at = EXCLUDED.updated_at
     RETURNING user_id,
               tenant_id,
               node_id,
               is_default,
               status,
               created_at,
               updated_at`,
    [
      assignment.userId,
      assignment.tenantId,
      assignment.nodeId,
      assignment.isDefault,
      assignment.status,
      assignment.createdAt,
      assignment.updatedAt,
    ]
  );

  return mapRow(result.rows[0]);
}

module.exports = {
  listByUserIdAndTenantId(userId, tenantId) {
    return listByUserIdAndTenantId({ query }, userId, tenantId);
  },
  listByTenantId(tenantId) {
    return listByTenantId({ query }, tenantId);
  },
  upsert(assignment) {
    return upsert({ query }, assignment);
  },
  listByUserIdAndTenantIdWithClient: listByUserIdAndTenantId,
  listByTenantIdWithClient: listByTenantId,
  upsertWithClient: upsert,
};
