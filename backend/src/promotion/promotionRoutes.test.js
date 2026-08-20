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
let managerId;
let participantToken;

const validBody = {
  applyStartAt: '2026-08-01',
  applyEndAt: '2026-08-10',
  eventDate: '2026-08-15',
  capacity: 10,
};

before(async () => {
  await pool.query("DELETE FROM promotions WHERE title LIKE '[test-be4]%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be4-%'");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  const managerEmail = `test-be4-manager-${crypto.randomUUID()}@example.com`;
  const { json: managerSignup } = await signup({
    name: '매니저',
    email: managerEmail,
    password: 'password123',
    role: 'MANAGER',
  });
  managerId = managerSignup.id;
  const { json: managerLogin } = await login({ email: managerEmail, password: 'password123' });
  managerToken = managerLogin.accessToken;

  const participantEmail = `test-be4-participant-${crypto.randomUUID()}@example.com`;
  await signup({
    name: '참가자',
    email: participantEmail,
    password: 'password123',
    role: 'PARTICIPANT',
  });
  const { json: participantLogin } = await login({ email: participantEmail, password: 'password123' });
  participantToken = participantLogin.accessToken;
});

after(async () => {
  await pool.query("DELETE FROM promotions WHERE title LIKE '[test-be4]%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be4-%'");
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

async function createPromotion(token, body) {
  const res = await fetch(`${baseUrl}/api/promotions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

function uniqueTitle(tag) {
  return `[test-be4] ${tag} ${crypto.randomUUID()}`;
}

describe('POST /api/promotions', () => {
  test('MANAGER 토큰으로 등록하면 201과 생성된 프로모션을 반환한다', async () => {
    const title = uniqueTitle('create-ok');
    const { res, json } = await createPromotion(managerToken, {
      title,
      description: '설명',
      ...validBody,
    });

    assert.strictEqual(res.status, 201);
    assert.ok(json.id);
    assert.strictEqual(json.managerId, managerId);
    assert.strictEqual(json.title, title);
    assert.strictEqual(json.description, '설명');
    assert.strictEqual(json.capacity, 10);
    assert.strictEqual(json.appliedCount, 0);
    assert.ok(String(json.applyStartAt).startsWith(validBody.applyStartAt));
    assert.ok(String(json.applyEndAt).startsWith(validBody.applyEndAt));
    assert.ok(String(json.eventDate).startsWith(validBody.eventDate));
  });

  test('PARTICIPANT 토큰으로 등록 시도하면 403을 반환한다', async () => {
    const { res } = await createPromotion(participantToken, {
      title: uniqueTitle('forbidden'),
      description: '설명',
      ...validBody,
    });

    assert.strictEqual(res.status, 403);
  });

  test('eventDate가 applyEndAt보다 이전이면 400을 반환한다', async () => {
    const { res } = await createPromotion(managerToken, {
      title: uniqueTitle('bad-date'),
      description: '설명',
      applyStartAt: '2026-08-01',
      applyEndAt: '2026-08-10',
      eventDate: '2026-08-05',
      capacity: 10,
    });

    assert.strictEqual(res.status, 400);
  });

  test('필수값(title)이 누락되면 400을 반환한다', async () => {
    const { res } = await createPromotion(managerToken, {
      description: '설명',
      ...validBody,
    });

    assert.strictEqual(res.status, 400);
  });

  test('인증 헤더 없이 등록 시도하면 401을 반환한다', async () => {
    const { res } = await createPromotion(null, {
      title: uniqueTitle('no-auth'),
      description: '설명',
      ...validBody,
    });

    assert.strictEqual(res.status, 401);
  });
});

describe('GET /api/promotions', () => {
  test('목록 조회 시 200과 등록된 프로모션이 capacity/appliedCount와 함께 반환된다', async () => {
    const title = uniqueTitle('list');
    const { json: created } = await createPromotion(managerToken, {
      title,
      description: '설명',
      ...validBody,
    });

    const res = await fetch(`${baseUrl}/api/promotions`, {
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(json));
    const found = json.find((p) => p.id === created.id);
    assert.ok(found, '생성한 프로모션이 목록에 존재해야 한다');
    assert.strictEqual(found.capacity, 10);
    assert.strictEqual(found.appliedCount, 0);
  });
});

describe('GET /api/promotions/:id', () => {
  test('존재하는 id로 조회하면 200과 해당 프로모션을 반환한다', async () => {
    const title = uniqueTitle('detail');
    const { json: created } = await createPromotion(managerToken, {
      title,
      description: '설명',
      ...validBody,
    });

    const res = await fetch(`${baseUrl}/api/promotions/${created.id}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.id, created.id);
    assert.strictEqual(json.title, title);
  });

  test('존재하지 않는 id로 조회하면 404를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/api/promotions/999999999`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.strictEqual(res.status, 404);
  });
});
