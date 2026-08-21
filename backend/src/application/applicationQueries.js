const pool = require('../db/pool');

function toDto(row) {
  return {
    id: row.id,
    promotionId: row.promotion_id,
    userId: row.user_id,
    appliedAt: row.applied_at,
  };
}

async function apply({ promotionId, userId }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updateResult = await client.query(
      'UPDATE promotions SET applied_count = applied_count + 1 WHERE id = $1 AND applied_count < capacity',
      [promotionId]
    );

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return { full: true };
    }

    let insertResult;
    try {
      insertResult = await client.query(
        'INSERT INTO applications (promotion_id, user_id) VALUES ($1,$2) RETURNING *',
        [promotionId, userId]
      );
    } catch (err) {
      if (err.code === '23505') {
        await client.query('ROLLBACK');
        return { duplicate: true };
      }
      throw err;
    }

    await client.query('COMMIT');
    return { application: toDto(insertResult.rows[0]) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function cancel({ promotionId, userId }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const deleteResult = await client.query(
      'DELETE FROM applications WHERE promotion_id = $1 AND user_id = $2 RETURNING id',
      [promotionId, userId]
    );

    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return { notFound: true };
    }

    await client.query('UPDATE promotions SET applied_count = applied_count - 1 WHERE id = $1', [promotionId]);
    await client.query('COMMIT');
    return { cancelled: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function findByPromotionAndUser({ promotionId, userId }) {
  const { rows } = await pool.query(
    'SELECT * FROM applications WHERE promotion_id = $1 AND user_id = $2',
    [promotionId, userId]
  );
  return rows[0] ? toDto(rows[0]) : null;
}

async function findApplicantsByPromotionId(promotionId) {
  const { rows } = await pool.query(
    `SELECT a.user_id, u.name, a.applied_at
     FROM applications a JOIN users u ON u.id = a.user_id
     WHERE a.promotion_id = $1
     ORDER BY a.applied_at ASC`,
    [promotionId]
  );
  return rows.map((row) => ({ userId: row.user_id, name: row.name, appliedAt: row.applied_at }));
}

module.exports = { apply, cancel, findByPromotionAndUser, findApplicantsByPromotionId };
