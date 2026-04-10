const { query } = require("../../core/db/postgres");

function mapRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    role: row.role,
    status: row.status,
    nodeIds: Array.isArray(row.node_ids) ? row.node_ids : [],
    defaultNodeId: row.default_node_id || null,
    invitedByUserId: row.invited_by_user_id || null,
    acceptedByUserId: row.accepted_by_user_id || null,
    acceptedAt: row.accepted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getById(client, id) {
  const result = await client.query(
    `SELECT id,
            tenant_id,
            email,
            role,
            status,
            node_ids,
            default_node_id,
            invited_by_user_id,
            accepted_by_user_id,
            accepted_at,
            created_at,
            updated_at
     FROM bln_tenant_invitations
     WHERE id = $1`,
    [id]
  );

  return mapRow(result.rows[0]);
}

async function getPendingByTenantIdAndEmail(client, tenantId, email) {
  const result = await client.query(
    `SELECT id,
            tenant_id,
            email,
            role,
            status,
            node_ids,
            default_node_id,
            invited_by_user_id,
            accepted_by_user_id,
            accepted_at,
            created_at,
            updated_at
     FROM bln_tenant_invitations
     WHERE tenant_id = $1
       AND email = $2
       AND status = 'PENDING'
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId, email]
  );

  return mapRow(result.rows[0]);
}

async function listByEmail(client, email) {
  const result = await client.query(
    `SELECT id,
            tenant_id,
            email,
            role,
            status,
            node_ids,
            default_node_id,
            invited_by_user_id,
            accepted_by_user_id,
            accepted_at,
            created_at,
            updated_at
     FROM bln_tenant_invitations
     WHERE email = $1
     ORDER BY created_at DESC, id DESC`,
    [email]
  );

  return result.rows.map(mapRow).filter(Boolean);
}

async function listByTenantId(client, tenantId) {
  const result = await client.query(
    `SELECT id,
            tenant_id,
            email,
            role,
            status,
            node_ids,
            default_node_id,
            invited_by_user_id,
            accepted_by_user_id,
            accepted_at,
            created_at,
            updated_at
     FROM bln_tenant_invitations
     WHERE tenant_id = $1
     ORDER BY created_at DESC, id DESC`,
    [tenantId]
  );

  return result.rows.map(mapRow).filter(Boolean);
}

async function create(client, invitation) {
  const result = await client.query(
    `INSERT INTO bln_tenant_invitations (
       id,
       tenant_id,
       email,
       role,
       status,
       node_ids,
       default_node_id,
       invited_by_user_id,
       accepted_by_user_id,
       accepted_at,
       created_at,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)
     RETURNING id,
               tenant_id,
               email,
               role,
               status,
               node_ids,
               default_node_id,
               invited_by_user_id,
               accepted_by_user_id,
               accepted_at,
               created_at,
               updated_at`,
    [
      invitation.id,
      invitation.tenantId,
      invitation.email,
      invitation.role,
      invitation.status,
      JSON.stringify(Array.isArray(invitation.nodeIds) ? invitation.nodeIds : []),
      invitation.defaultNodeId || null,
      invitation.invitedByUserId || null,
      invitation.acceptedByUserId || null,
      invitation.acceptedAt ?? null,
      invitation.createdAt,
      invitation.updatedAt,
    ]
  );

  return mapRow(result.rows[0]);
}

async function updateStatus(client, payload) {
  const result = await client.query(
    `UPDATE bln_tenant_invitations
     SET status = $2,
         accepted_by_user_id = $3,
         accepted_at = $4,
         updated_at = $5
     WHERE id = $1
     RETURNING id,
               tenant_id,
               email,
               role,
               status,
               node_ids,
               default_node_id,
               invited_by_user_id,
               accepted_by_user_id,
               accepted_at,
               created_at,
               updated_at`,
    [
      payload.id,
      payload.status,
      payload.acceptedByUserId || null,
      payload.acceptedAt ?? null,
      payload.updatedAt,
    ]
  );

  return mapRow(result.rows[0]);
}

module.exports = {
  getById(id) {
    return getById({ query }, id);
  },
  getPendingByTenantIdAndEmail(tenantId, email) {
    return getPendingByTenantIdAndEmail({ query }, tenantId, email);
  },
  listByEmail(email) {
    return listByEmail({ query }, email);
  },
  listByTenantId(tenantId) {
    return listByTenantId({ query }, tenantId);
  },
  create(invitation) {
    return create({ query }, invitation);
  },
  updateStatus(payload) {
    return updateStatus({ query }, payload);
  },
  getByIdWithClient: getById,
  getPendingByTenantIdAndEmailWithClient: getPendingByTenantIdAndEmail,
  listByEmailWithClient: listByEmail,
  listByTenantIdWithClient: listByTenantId,
  createWithClient: create,
  updateStatusWithClient: updateStatus,
};
