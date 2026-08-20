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
let participant1Token;
let participant1Id;
let participant1Name;
let participant2Token;
let participant2Id;

before(async () => {
  await pool.query(
    "DELETE FROM applications WHERE promotion_id IN (SELECT id FROM promotions WHERE title LIKE '[test-be7]%')"
  );
  await pool.query("DELETE FROM promotions WHERE title LIKE '[test-be7]%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be7-%'");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  const manager1Email = `test-be7-manager1-${crypto.randomUUID()}@example.com`;
  await signup({ name: '매니저1', email: manager1Email, password: 'password123', role: 'MANAGER' });
  const { json: manager1Login } = await login({ email: manager1Email, password: 'password123' });
  manager1Token = manager1Login.accessToken;

  const manager2Email = `test-be7-manager2-${crypto.randomUUID()}@example.com`;
  await signup({ name: '매니저2', email: manager2Email, password: 'password123', role: 'MANAGER' });
  const { json: manager2Login } = await login({ email: manager2Email, password: 'password123' });
  manager2Token = manager2Login.accessToken;

  participant1Name = '참가자1';
  const participant1Email = `test-be7-participant1-${crypto.randomUUID()}@example.com`;
  const { json: p1Signup } = await signup({
    name: participant1Name,
    email: participant1Email,
    password: 'password123',
    role: 'PARTICIPANT',
  });
  participant1Id = p1Signup.id;
  const { json: p1Login } = await login({ email: participant1Email, password: 'password123' });
  participant1Token = p1Login.accessToken;

  const participant2Email = `test-be7-participant2-${crypto.randomUUID()}@example.com`;
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
    "DELETE FROM applications WHERE promotion_id IN (SELECT id FROM promotions WHERE title LIKE '[test-be7]%')"
  );
  await pool.query("DELETE FROM promotions WHERE title LIKE '[test-be7]%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be7-%'");
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function uniqueTitle(tag) {
  return `[test-be7] ${tag} ${crypto.randomUUID()}`;
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

async function getApplicants(promotionId, token) {
  const res = await fetch(`${baseUrl}/api/promotions/${promotionId}/applications`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

describe('GET /api/promotions/:promotionId/applications', () => {
  test('본인 매니저가 조회하면 200과 신청자 목록을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('with-applicants') });

    const apply1 = await applyToPromotion(promo.id, participant1Token);
    assert.strictEqual(apply1.res.status, 201);
    const apply2 = await applyToPromotion(promo.id, participant2Token);
    assert.strictEqual(apply2.res.status, 201);

    const { res, json } = await getApplicants(promo.id, manager1Token);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.promotionId, promo.id);
    assert.strictEqual(json.appliedCount, 2);
    assert.strictEqual(json.applicants.length, 2);

    for (const applicant of json.applicants) {
      assert.ok(applicant.userId);
      assert.ok(applicant.name);
      assert.ok(applicant.appliedAt);
    }

    const names = json.applicants.map((a) => a.name);
    assert.ok(names.includes(participant1Name));
    const userIds = json.applicants.map((a) => a.userId);
    assert.ok(userIds.includes(participant1Id));
  });

  test('신청자가 없는 프로모션을 조회하면 200과 빈 배열을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('no-applicants') });

    const { res, json } = await getApplicants(promo.id, manager1Token);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.applicants.length, 0);
  });

  test('다른 매니저가 조회하면 403을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('other-manager') });

    const { res } = await getApplicants(promo.id, manager2Token);
    assert.strictEqual(res.status, 403);
  });

  test('PARTICIPANT 토큰으로 조회하면 403을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('participant-forbidden') });

    const { res } = await getApplicants(promo.id, participant1Token);
    assert.strictEqual(res.status, 403);
  });

  test('존재하지 않는 promotionId로 조회하면 404를 반환한다', async () => {
    const { res } = await getApplicants(999999999, manager1Token);
    assert.strictEqual(res.status, 404);
  });

  test('인증 헤더 없이 조회하면 401을 반환한다', async () => {
    const { json: promo } = await createPromotion(manager1Token, { title: uniqueTitle('no-auth') });

    const { res } = await getApplicants(promo.id, null);
    assert.strictEqual(res.status, 401);
  });
});
