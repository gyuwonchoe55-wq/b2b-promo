require('dotenv').config();

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const app = require('../app');
const pool = require('../db/pool');

let server;
let baseUrl;

before(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be3-%'");
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE 'test-be3-%'");
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

function uniqueEmail(tag) {
  return `test-be3-${tag}-${crypto.randomUUID()}@example.com`;
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

async function refresh(body) {
  const res = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

describe('POST /api/auth/signup', () => {
  test('회원가입 성공 시 201과 안전한 유저 정보를 반환한다', async () => {
    const email = uniqueEmail('signup');
    const { res, json } = await signup({
      name: '홍길동',
      email,
      password: 'password123',
      role: 'MANAGER',
    });

    assert.strictEqual(res.status, 201);
    assert.ok(json.id);
    assert.strictEqual(json.name, '홍길동');
    assert.strictEqual(json.email, email);
    assert.strictEqual(json.role, 'MANAGER');
    assert.strictEqual(json.password, undefined);
    assert.strictEqual(json.passwordHash, undefined);
  });

  test('role이 유효하지 않으면 400을 반환한다', async () => {
    const email = uniqueEmail('badrole');
    const { res } = await signup({
      name: '홍길동',
      email,
      password: 'password123',
      role: 'ADMIN',
    });

    assert.strictEqual(res.status, 400);
  });

  test('필수값(name)이 누락되면 400을 반환한다', async () => {
    const email = uniqueEmail('noname');
    const { res } = await signup({
      email,
      password: 'password123',
      role: 'PARTICIPANT',
    });

    assert.strictEqual(res.status, 400);
  });

  test('이미 가입된 이메일로 재가입 시도하면 409를 반환한다', async () => {
    const email = uniqueEmail('dup');
    const first = await signup({
      name: '홍길동',
      email,
      password: 'password123',
      role: 'MANAGER',
    });
    assert.strictEqual(first.res.status, 201);

    const second = await signup({
      name: '홍길동2',
      email,
      password: 'password456',
      role: 'PARTICIPANT',
    });
    assert.strictEqual(second.res.status, 409);
  });
});

describe('POST /api/auth/login', () => {
  test('올바른 자격증명이면 200과 토큰을 반환하고 accessToken payload가 가입 정보와 일치한다', async () => {
    const email = uniqueEmail('login-ok');
    const password = 'password123';
    const { json: signupJson } = await signup({
      name: '김철수',
      email,
      password,
      role: 'PARTICIPANT',
    });

    const { res, json } = await login({ email, password });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof json.accessToken, 'string');
    assert.strictEqual(typeof json.refreshToken, 'string');

    const decoded = jwt.decode(json.accessToken);
    assert.strictEqual(decoded.id, signupJson.id);
    assert.strictEqual(decoded.role, signupJson.role);
  });

  test('잘못된 비밀번호면 401을 반환한다', async () => {
    const email = uniqueEmail('login-wrongpw');
    await signup({
      name: '김철수',
      email,
      password: 'password123',
      role: 'PARTICIPANT',
    });

    const { res } = await login({ email, password: 'wrong-password' });
    assert.strictEqual(res.status, 401);
  });

  test('존재하지 않는 이메일이면 401을 반환한다', async () => {
    const { res } = await login({
      email: uniqueEmail('login-notfound'),
      password: 'password123',
    });
    assert.strictEqual(res.status, 401);
  });
});

describe('POST /api/auth/refresh', () => {
  test('유효한 refreshToken이면 200과 새 accessToken을 반환한다', async () => {
    const email = uniqueEmail('refresh-ok');
    const password = 'password123';
    await signup({ name: '이영희', email, password, role: 'MANAGER' });
    const { json: loginJson } = await login({ email, password });

    const { res, json } = await refresh({ refreshToken: loginJson.refreshToken });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof json.accessToken, 'string');
  });

  test('위조된 refreshToken이면 401을 반환한다', async () => {
    const { res } = await refresh({ refreshToken: 'this-is-not-a-valid-token' });
    assert.strictEqual(res.status, 401);
  });
});
