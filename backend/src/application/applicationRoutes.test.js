require('dotenv').config();

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const crypto = require('node:crypto');

const app = require('../app');
const pool = require('../db/pool');

let server;
let baseUrl;
let managerToken;
let participant1Token;
let participant1Id;
let participant2Token;
let participant2Id;

before(async () => {
  await pool.query(
    "DELETE FROM applications WHERE promotion_id IN (SELECT id FROM promotions WHERE title LIKE '[test-be6]%')"
  );
  await pool.query("DELETE FROM promotions WHERE title LIKE '[test-be6]%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be6-%'");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  const managerEmail = `test-be6-manager-${crypto.randomUUID()}@example.com`;
  await signup({ name: '매니저', email: managerEmail, password: 'password123', role: 'MANAGER' });
  const { json: managerLogin } = await login({ email: managerEmail, password: 'password123' });
  managerToken = managerLogin.accessToken;

  const participant1Email = `test-be6-participant-${crypto.randomUUID()}@example.com`;
  const { json: p1Signup } = await signup({
    name: '참가자1',
    email: participant1Email,
    password: 'password123',
    role: 'PARTICIPANT',
  });
  participant1Id = p1Signup.id;
  const { json: p1Login } = await login({ email: participant1Email, password: 'password123' });
  participant1Token = p1Login.accessToken;

  const participant2Email = `test-be6-participant2-${crypto.randomUUID()}@example.com`;
  const { json: p2Signup } = await signup({
    name: '참가자2',
    email: participant2Email,
    password: 'password123',
    role: 'PARTICIPANT',
  });
  participant2Id = p2Signup.id;
  const { json: p2Login } = await login({ email: participant2Email, password: 'password123' });
  participant2Token = p2Login.accessToken;
});

after(async () => {
  await pool.query(
    "DELETE FROM applications WHERE promotion_id IN (SELECT id FROM promotions WHERE title LIKE '[test-be6]%')"
  );
  await pool.query("DELETE FROM promotions WHERE title LIKE '[test-be6]%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be6-%'");
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function uniqueTitle(tag) {
  return `[test-be6] ${tag} ${crypto.randomUUID()}`;
}

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
    applyEndAt: dateOffset(1),
    eventDate: dateOffset(2),
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

async function getPromotion(id, token) {
  const res = await fetch(`${baseUrl}/api/promotions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function applyToPromotion(promotionId, token, body) {
  const res = await fetch(`${baseUrl}/api/promotions/${promotionId}/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function cancelApplication(promotionId, token) {
  const res = await fetch(`${baseUrl}/api/promotions/${promotionId}/applications/me`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await res.text();
  return { res, text };
}

describe('POST /api/promotions/:promotionId/applications', () => {
  test('PARTICIPANT가 기간 내 프로모션에 신청하면 201과 신청 정보를 반환하고 appliedCount가 증가한다', async () => {
    const { json: promo } = await createPromotion(managerToken);

    const { res, json } = await applyToPromotion(promo.id, participant1Token);

    assert.strictEqual(res.status, 201);
    assert.ok(json.id);
    assert.strictEqual(json.promotionId, promo.id);
    assert.strictEqual(json.userId, participant1Id);
    assert.ok(json.appliedAt);

    const { json: updated } = await getPromotion(promo.id, managerToken);
    assert.strictEqual(updated.appliedCount, promo.appliedCount + 1);
  });

  test('같은 유저가 같은 프로모션에 재신청하면 409를 반환한다', async () => {
    const { json: promo } = await createPromotion(managerToken);
    const first = await applyToPromotion(promo.id, participant1Token);
    assert.strictEqual(first.res.status, 201);

    const { res } = await applyToPromotion(promo.id, participant1Token);
    assert.strictEqual(res.status, 409);
  });

  test('MANAGER 토큰으로 신청 시도하면 403을 반환한다', async () => {
    const { json: promo } = await createPromotion(managerToken);

    const { res } = await applyToPromotion(promo.id, managerToken);
    assert.strictEqual(res.status, 403);
  });

  test('존재하지 않는 promotionId로 신청하면 404를 반환한다', async () => {
    const { res } = await applyToPromotion(999999999, participant1Token);
    assert.strictEqual(res.status, 404);
  });

  test('신청 기간이 아닌 프로모션에 신청하면 400을 반환한다', async () => {
    const { json: promo } = await createPromotion(managerToken, {
      title: uniqueTitle('not-open-yet'),
      applyStartAt: dateOffset(5),
      applyEndAt: dateOffset(10),
      eventDate: dateOffset(11),
    });

    const { res } = await applyToPromotion(promo.id, participant1Token);
    assert.strictEqual(res.status, 400);
  });

  test('정원이 다 찬 프로모션에 신청하면 400을 반환한다', async () => {
    const { json: promo } = await createPromotion(managerToken, {
      title: uniqueTitle('full'),
      capacity: 1,
    });

    const filling = await applyToPromotion(promo.id, participant1Token);
    assert.strictEqual(filling.res.status, 201);

    const { res } = await applyToPromotion(promo.id, participant2Token);
    assert.strictEqual(res.status, 400);
  });

  test('인증 헤더 없이 신청하면 401을 반환한다', async () => {
    const { json: promo } = await createPromotion(managerToken);

    const { res } = await applyToPromotion(promo.id, null);
    assert.strictEqual(res.status, 401);
  });

  test('요청 body에 위조된 userId를 넣어도 응답의 userId는 로그인한 유저 id와 같다', async () => {
    const { json: promo } = await createPromotion(managerToken, { title: uniqueTitle('forged-userid') });

    const { res, json } = await applyToPromotion(promo.id, participant1Token, { userId: 999999 });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.userId, participant1Id);
  });
});

describe('DELETE /api/promotions/:promotionId/applications/me', () => {
  test('본인이 신청한 프로모션이면 204를 반환하고 appliedCount가 다시 감소한다', async () => {
    const { json: promo } = await createPromotion(managerToken, { title: uniqueTitle('cancel-ok') });
    const apply = await applyToPromotion(promo.id, participant1Token);
    assert.strictEqual(apply.res.status, 201);

    const { json: afterApply } = await getPromotion(promo.id, managerToken);
    assert.strictEqual(afterApply.appliedCount, promo.appliedCount + 1);

    const { res, text } = await cancelApplication(promo.id, participant1Token);
    assert.strictEqual(res.status, 204);
    assert.strictEqual(text, '');

    const { json: afterCancel } = await getPromotion(promo.id, managerToken);
    assert.strictEqual(afterCancel.appliedCount, promo.appliedCount);
  });

  test('신청한 적 없는 프로모션에 대해 취소 요청하면 403을 반환한다', async () => {
    const { json: promo } = await createPromotion(managerToken, { title: uniqueTitle('cancel-forbidden') });

    const { res } = await cancelApplication(promo.id, participant2Token);
    assert.strictEqual(res.status, 403);
  });

  test('존재하지 않는 promotionId로 취소 요청하면 404를 반환한다', async () => {
    const { res } = await cancelApplication(999999999, participant1Token);
    assert.strictEqual(res.status, 404);
  });
});
