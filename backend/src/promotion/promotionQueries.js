const pool = require('../db/pool');

function toDto(row) {
  return {
    id: row.id,
    managerId: row.manager_id,
    title: row.title,
    description: row.description,
    applyStartAt: row.apply_start_at,
    applyEndAt: row.apply_end_at,
    eventDate: row.event_date,
    capacity: row.capacity,
    appliedCount: row.applied_count,
  };
}

async function create({ managerId, title, description, applyStartAt, applyEndAt, eventDate, capacity }) {
  const { rows } = await pool.query(
    'INSERT INTO promotions (manager_id, title, description, apply_start_at, apply_end_at, event_date, capacity) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [managerId, title, description, applyStartAt, applyEndAt, eventDate, capacity]
  );
  return toDto(rows[0]);
}

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM promotions ORDER BY id DESC');
  return rows.map(toDto);
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM promotions WHERE id = $1', [id]);
  if (!rows[0]) {
    return undefined;
  }
  return toDto(rows[0]);
}

async function update(id, { title, description, applyStartAt, applyEndAt, eventDate, capacity }) {
  const { rows } = await pool.query(
    `UPDATE promotions SET
      title = COALESCE($2, title),
      description = COALESCE($3, description),
      apply_start_at = COALESCE($4, apply_start_at),
      apply_end_at = COALESCE($5, apply_end_at),
      event_date = COALESCE($6, event_date),
      capacity = COALESCE($7, capacity)
    WHERE id = $1
    RETURNING *`,
    [id, title, description, applyStartAt, applyEndAt, eventDate, capacity]
  );
  return toDto(rows[0]);
}

async function remove(id) {
  await pool.query('DELETE FROM promotions WHERE id = $1', [id]);
}

module.exports = { create, findAll, findById, update, remove };
