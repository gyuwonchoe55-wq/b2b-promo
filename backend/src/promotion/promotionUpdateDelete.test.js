require('dotenv').config();

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const crypto = require('node:crypto');

const app = require('../app');
const pool = require('../db/pool');

let server;
let baseUrl;
let manager1Token;
let manager2Token;
let participantToken;

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function uniqueTitle(tag) {
  return `[test-be5] ${tag} ${crypto.randomUUID()}`;
}

before(async () => {
  await pool.query(
    "DELETE FROM applications WHERE promotion_id IN (SELECT id FROM promotions WHERE title LIKE '[test-be5]%')"
  );
  await pool.query("DELETE FROM promotions WHERE title LIKE '[test-be5]%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be5-%'");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  const manager1Email = `test-be5-manager1-${crypto.randomUUID()}@example.com`;
  await signup({ name: '매니저1', email: manager1Email, password: 'password123', role: 'MANAGER' });
  const { json: manager1Login } = await login({ email: manager1Email, password: 'password123' });
  manager1Token = manager1Login.accessToken;

  const manager2Email = `test-be5-manager2-${crypto.randomUUID()}@example.com`;
  await signup({ name: '매니저2', email: manager2Email, password: 'password123', role: 'MANAGER' });
  const { json: manager2Login } = await login({ email: manager2Email, password: 'password123' });
  manager2Token = manager2Login.accessToken;

  const participantEmail = `test-be5-participant-${crypto.randomUUID()}@example.com`;
  await signup({ name: '참가자', email: participantEmail, password: 'password123', role: 'PARTICIPANT' });
  const { json: participantLogin } = await login({ email: participantEmail, password: 'password123' });
  participantToken = participantLogin.accessToken;
});

after(async () => {
  await pool.query(
    "DELETE FROM applications WHERE promotion_id IN (SELECT id FROM promotions WHERE title LIKE '[test-be5]%')"
  );
  await pool.query("DELETE FROM promotions WHERE title LIKE '[test-be5]%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be5-%'");
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function signup(body) {
  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function login(body) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function createPromotion(token, overrides = {}) {
  const body = {
    title: uniqueTitle('promo'),
    description: '설명',
    applyStartAt: dateOffset(-1),
    applyEndAt: dateOffset(5),
    eventDate: dateOffset(6),
    capacity: 10,
    ...overrides,
  };
  const res = await fetch(`${baseUrl}/api/promotions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function applyToPromotion(promotionId, token) {
  const res = await fetch(`${baseUrl}/api/promotions/${promotionId}/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({}),
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function patchPromotion(id, token, body) {
  const res = await fetch(`${baseUrl}/api/promotions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function deletePromotion(id, token) {
  const res = await fetch(`${baseUrl}/api/promotions/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await res.text();
  return { res, text };
}

describe('PATCH /api/promotions/:id', () => {
  test('등록한 매니저 본인이 title을 수정하면 200과 수정된 값을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('patch-ok') });
    const newTitle = uniqueTitle('patch-ok-updated');

    const { res, json } = await patchPromotion(promo.id, manager1Token, { title: newTitle });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.title, newTitle);
  });

  test('다른 매니저가 수정 시도하면 403을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('patch-forbidden') });

    const { res } = await patchPromotion(promo.id, manager2Token, { title: uniqueTitle('hacked') });

    assert.strictEqual(res.status, 403);
  });

  test('capacity를 현재 appliedCount보다 작은 값으로 수정하면 400을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('patch-capacity') });
    const apply = await applyToPromotion(promo.id, participantToken);
    assert.strictEqual(apply.res.status, 201);

    const { res } = await patchPromotion(promo.id, manager1Token, { capacity: 0 });

    assert.strictEqual(res.status, 400);
  });

  test('applyEndAt을 eventDate 이후로 수정하면 400을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('patch-bad-date') });

    const { res } = await patchPromotion(promo.id, manager1Token, { applyEndAt: dateOffset(7) });

    assert.strictEqual(res.status, 400);
  });

  test('존재하지 않는 id로 수정 시도하면 404를 반환한다', async () => {
    const { res } = await patchPromotion(999999999, manager1Token, { title: uniqueTitle('not-found') });

    assert.strictEqual(res.status, 404);
  });

  test('인증 헤더 없이 수정 시도하면 401을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('patch-no-auth') });

    const { res } = await patchPromotion(promo.id, null, { title: uniqueTitle('no-auth') });

    assert.strictEqual(res.status, 401);
  });
});

describe('DELETE /api/promotions/:id', () => {
  test('등록한 매니저 본인이 삭제하면 204를 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('delete-ok') });

    const { res, text } = await deletePromotion(promo.id, manager1Token);

    assert.strictEqual(res.status, 204);
    assert.strictEqual(text, '');
  });

  test('삭제 시 연결된 applications도 함께 삭제된다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('delete-cascade') });
    const apply = await applyToPromotion(promo.id, participantToken);
    assert.strictEqual(apply.res.status, 201);

    const { res } = await deletePromotion(promo.id, manager1Token);
    assert.strictEqual(res.status, 204);

    const { rows } = await pool.query('SELECT * FROM applications WHERE promotion_id = $1', [promo.id]);
    assert.strictEqual(rows.length, 0);
  });

  test('다른 매니저가 삭제 시도하면 403을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('delete-forbidden') });

    const { res } = await deletePromotion(promo.id, manager2Token);

    assert.strictEqual(res.status, 403);
  });

  test('존재하지 않는 id로 삭제 시도하면 404를 반환한다', async () => {
    const { res } = await deletePromotion(999999999, manager1Token);

    assert.strictEqual(res.status, 404);
  });
});
