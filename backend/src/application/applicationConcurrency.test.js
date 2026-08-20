require('dotenv').config();

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');

const pool = require('../db/pool');
const { create } = require('../promotion/promotionQueries');
const { apply } = require('./applicationQueries');

const TITLE_PREFIX = '[test-be8-concurrency]';
const MANAGER_EMAIL = 'test-be8-concurrency-manager@example.com';
const PARTICIPANT_COUNT = 15;

let managerId;
let participantIds = [];

async function cleanup() {
  await pool.query(
    "DELETE FROM applications WHERE promotion_id IN (SELECT id FROM promotions WHERE title LIKE $1)",
    [`${TITLE_PREFIX}%`]
  );
  await pool.query('DELETE FROM promotions WHERE title LIKE $1', [`${TITLE_PREFIX}%`]);
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be8-concurrency-%'");
}

describe('BE-8 정원 초과 검증: 동시 신청 시나리오', () => {
  before(async () => {
    await cleanup();

    const passwordHash = await bcrypt.hash('password123', 10);

    const managerResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id',
      ['test-be8-concurrency-manager', MANAGER_EMAIL, passwordHash, 'MANAGER']
    );
    managerId = managerResult.rows[0].id;

    for (let i = 0; i < PARTICIPANT_COUNT; i += 1) {
      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id',
        [`test-be8-concurrency-p${i}`, `test-be8-concurrency-p${i}@example.com`, passwordHash, 'PARTICIPANT']
      );
      participantIds.push(result.rows[0].id);
    }
  });

  after(async () => {
    await cleanup();
    await pool.end();
  });

  test('정원 5명인 프로모션에 15명이 동시 신청하면 정확히 5명만 성공한다', async () => {
    const promotion = await create({
      managerId,
      title: `${TITLE_PREFIX} 동시 신청 테스트`,
      description: '정원 초과 동시성 검증용',
      applyStartAt: '2020-01-01',
      applyEndAt: '2099-01-01',
      eventDate: '2099-01-02',
      capacity: 5,
    });

    const results = await Promise.all(
      participantIds.map((userId) => apply({ promotionId: promotion.id, userId }))
    );

    const succeeded = results.filter((r) => r.application).length;
    const full = results.filter((r) => r.full).length;

    assert.strictEqual(succeeded, 5);
    assert.strictEqual(full, 10);

    const { rows: promotionRows } = await pool.query(
      'SELECT applied_count FROM promotions WHERE id = $1',
      [promotion.id]
    );
    assert.strictEqual(promotionRows[0].applied_count, 5);

    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) FROM applications WHERE promotion_id = $1',
      [promotion.id]
    );
    assert.strictEqual(Number(countRows[0].count), 5);
  });
});
