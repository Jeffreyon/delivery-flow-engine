const { query, withTransaction } = require("../../core/db/postgres");
const { v4: uuidv4 } = require("uuid");

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    payload: row.payload || {},
    createdAt: row.created_at,
  };
}

async function list(limit = 50, type) {
  let sql = `SELECT e.id, e.type, e.payload, e.created_at
             FROM delivery_events de
             INNER JOIN events e ON e.id = de.id
             WHERE 1=1`;
  const params = [];
  if (type) {
    params.push(type);
    sql += ` AND e.type = $${params.length}`;
  }
  params.push(limit);
  sql += ` ORDER BY e.created_at DESC LIMIT $${params.length}`;
  const result = await query(sql, params);
  return result.rows.map(mapRow).filter(Boolean);
}

async function create(event) {
  const id = uuidv4();
  const payload = event.payload || {};
  const createdAt = event.createdAt || Date.now();

  return withTransaction(async (client) => {
    const eventResult = await client.query(
      `INSERT INTO events (id, type, payload, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, type, payload, created_at`,
      [id, event.type, payload, createdAt]
    );

    await client.query(`INSERT INTO delivery_events (id) VALUES ($1)`, [id]);

    return mapRow(eventResult.rows[0]);
  });
}

module.exports = {
  list,
  create,
};
