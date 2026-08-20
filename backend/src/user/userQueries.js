const pool = require('../db/pool');

async function findByEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
    [email]
  );

  if (!rows[0]) {
    return undefined;
  }

  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
  };
}

async function create({ name, email, passwordHash, role }) {
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role',
    [name, email, passwordHash, role]
  );

  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

module.exports = { findByEmail, create };
